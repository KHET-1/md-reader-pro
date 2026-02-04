//! Authentication Guard Module
//!
//! CRITICAL SECURITY: This module enforces authentication in production.
//! If DISABLE_AUTH=true in production, the application PANICS immediately.

use std::env;
use thiserror::Error;
use tracing::{warn, error, info};

/// Auth-related errors
#[derive(Error, Debug)]
pub enum AuthError {
    #[error("SECURITY VIOLATION: Auth disabled in production environment")]
    AuthDisabledInProduction,

    #[error("Invalid authentication token")]
    InvalidToken,

    #[error("Authentication required")]
    AuthRequired,

    #[error("Token expired")]
    TokenExpired,
}

/// Environment detection
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Environment {
    Development,
    Staging,
    Production,
}

impl Environment {
    /// Detect current environment from env vars
    pub fn detect() -> Self {
        // Check multiple env vars for robustness
        let env_indicators = [
            env::var("ENVIRONMENT"),
            env::var("ENV"),
            env::var("RUST_ENV"),
            env::var("APP_ENV"),
        ];

        for indicator in env_indicators.iter() {
            if let Ok(val) = indicator {
                match val.to_lowercase().as_str() {
                    "production" | "prod" => return Self::Production,
                    "staging" | "stage" => return Self::Staging,
                    "development" | "dev" | "local" => return Self::Development,
                    _ => continue,
                }
            }
        }

        // Check for production indicators
        if env::var("KUBERNETES_SERVICE_HOST").is_ok()
            || env::var("AWS_EXECUTION_ENV").is_ok()
            || env::var("GOOGLE_CLOUD_PROJECT").is_ok()
            || env::var("AZURE_FUNCTIONS_ENVIRONMENT").is_ok()
        {
            return Self::Production;
        }

        // Default to development for safety during local work
        // But this means auth CAN be disabled locally
        Self::Development
    }

    pub fn is_production(&self) -> bool {
        matches!(self, Self::Production | Self::Staging)
    }
}

/// Authentication guard that panics if auth is disabled in production
///
/// # Panics
///
/// This will PANIC if:
/// - Environment is Production or Staging
/// - AND DISABLE_AUTH is set to "true", "1", or "yes"
///
/// This is intentional - we want hard failures, not silent security holes.
pub struct AuthGuard {
    environment: Environment,
    auth_enabled: bool,
}

impl AuthGuard {
    /// Initialize the auth guard. MUST be called at application start.
    ///
    /// # Panics
    ///
    /// Panics if auth is disabled in production. This is a security feature.
    pub fn init() -> Result<Self, AuthError> {
        let environment = Environment::detect();
        let disable_auth = Self::is_auth_disabled();

        info!("🔐 Auth Guard initializing...");
        info!("   Environment: {:?}", environment);
        info!("   Auth disabled flag: {}", disable_auth);

        // THE CRITICAL CHECK - PRODUCTION FAIL-SAFE
        if environment.is_production() && disable_auth {
            error!("╔══════════════════════════════════════════════════════════╗");
            error!("║  🚨 SECURITY VIOLATION: AUTH DISABLED IN PRODUCTION 🚨   ║");
            error!("║                                                          ║");
            error!("║  DISABLE_AUTH=true is set in a production environment.   ║");
            error!("║  This is a critical security violation.                  ║");
            error!("║                                                          ║");
            error!("║  The application will now terminate to prevent           ║");
            error!("║  unauthorized access.                                    ║");
            error!("║                                                          ║");
            error!("║  To fix: Remove DISABLE_AUTH or set to 'false'           ║");
            error!("╚══════════════════════════════════════════════════════════╝");

            // HARD PANIC - No graceful degradation for security violations
            panic!(
                "SECURITY VIOLATION: DISABLE_AUTH=true in {:?} environment. \
                 This is not allowed. Remove the DISABLE_AUTH environment variable.",
                environment
            );
        }

        if disable_auth {
            warn!("⚠️  Auth is DISABLED - this is only safe in development!");
        } else {
            info!("✅ Auth guard active");
        }

        Ok(Self {
            environment,
            auth_enabled: !disable_auth,
        })
    }

    /// Check if auth is disabled via environment variable
    fn is_auth_disabled() -> bool {
        env::var("DISABLE_AUTH")
            .map(|v| matches!(v.to_lowercase().as_str(), "true" | "1" | "yes"))
            .unwrap_or(false)
    }

    /// Check if authentication is required for an operation
    pub fn require_auth(&self) -> Result<(), AuthError> {
        if self.auth_enabled {
            // In a real app, validate token here
            self.validate_token()
        } else {
            Ok(())
        }
    }

    /// Validate the current auth token
    fn validate_token(&self) -> Result<(), AuthError> {
        // Check for token in env or file
        let token = env::var("DIAMOND_AUTH_TOKEN")
            .or_else(|_| Self::read_token_file())
            .map_err(|_| AuthError::AuthRequired)?;

        if token.is_empty() {
            return Err(AuthError::AuthRequired);
        }

        // Basic token validation (in production, verify signature)
        if token.len() < 32 {
            return Err(AuthError::InvalidToken);
        }

        Ok(())
    }

    /// Read token from file
    fn read_token_file() -> Result<String, std::io::Error> {
        let home = env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
        let token_path = format!("{}/.diamond/token", home);
        std::fs::read_to_string(token_path)
    }

    /// Get current environment
    pub fn environment(&self) -> Environment {
        self.environment
    }

    /// Check if auth is enabled
    pub fn is_auth_enabled(&self) -> bool {
        self.auth_enabled
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn with_env<F, R>(key: &str, value: &str, f: F) -> R
    where
        F: FnOnce() -> R,
    {
        let original = env::var(key).ok();
        env::set_var(key, value);
        let result = f();
        match original {
            Some(v) => env::set_var(key, v),
            None => env::remove_var(key),
        }
        result
    }

    fn clear_env_vars() {
        for var in ["ENVIRONMENT", "ENV", "RUST_ENV", "APP_ENV", "DISABLE_AUTH"] {
            env::remove_var(var);
        }
    }

    #[test]
    fn test_environment_detection_development() {
        clear_env_vars();
        with_env("ENVIRONMENT", "development", || {
            assert_eq!(Environment::detect(), Environment::Development);
        });
    }

    #[test]
    fn test_environment_detection_production() {
        clear_env_vars();
        with_env("ENVIRONMENT", "production", || {
            assert_eq!(Environment::detect(), Environment::Production);
        });
    }

    #[test]
    fn test_environment_detection_prod_short() {
        clear_env_vars();
        with_env("ENV", "prod", || {
            assert_eq!(Environment::detect(), Environment::Production);
        });
    }

    #[test]
    fn test_auth_guard_dev_disabled_ok() {
        clear_env_vars();
        with_env("ENVIRONMENT", "development", || {
            with_env("DISABLE_AUTH", "true", || {
                // Should NOT panic in development
                let guard = AuthGuard::init().unwrap();
                assert!(!guard.is_auth_enabled());
            });
        });
    }

    #[test]
    #[should_panic(expected = "SECURITY VIOLATION")]
    fn test_auth_guard_prod_disabled_panics() {
        clear_env_vars();
        with_env("ENVIRONMENT", "production", || {
            with_env("DISABLE_AUTH", "true", || {
                // MUST panic in production
                let _ = AuthGuard::init();
            });
        });
    }

    #[test]
    fn test_auth_guard_prod_enabled_ok() {
        clear_env_vars();
        with_env("ENVIRONMENT", "production", || {
            // No DISABLE_AUTH set - should work
            let guard = AuthGuard::init().unwrap();
            assert!(guard.is_auth_enabled());
        });
    }

    #[test]
    fn test_is_production() {
        assert!(Environment::Production.is_production());
        assert!(Environment::Staging.is_production());
        assert!(!Environment::Development.is_production());
    }
}
