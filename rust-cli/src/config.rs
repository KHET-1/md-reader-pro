//! Configuration Module

use std::path::Path;
use serde::{Deserialize, Serialize};
use anyhow::Result;
use tracing::debug;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub analysis: AnalysisConfig,

    #[serde(default)]
    pub export: ExportConfig,

    #[serde(default)]
    pub security: SecurityConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisConfig {
    #[serde(default = "default_max_file_size")]
    pub max_file_size: usize,

    #[serde(default = "default_include_patterns")]
    pub include_patterns: Vec<String>,

    #[serde(default)]
    pub exclude_patterns: Vec<String>,

    #[serde(default = "default_true")]
    pub follow_symlinks: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportConfig {
    #[serde(default = "default_format")]
    pub format: String,

    #[serde(default = "default_true")]
    pub include_metadata: bool,

    #[serde(default = "default_true")]
    pub pretty_print: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityConfig {
    #[serde(default = "default_true")]
    pub enforce_ro_lock: bool,

    #[serde(default = "default_true")]
    pub require_auth: bool,

    #[serde(default)]
    pub allowed_paths: Vec<String>,
}

fn default_max_file_size() -> usize { 100 * 1024 * 1024 } // 100MB
fn default_include_patterns() -> Vec<String> { vec!["*".to_string()] }
fn default_format() -> String { "json".to_string() }
fn default_true() -> bool { true }

impl Default for AnalysisConfig {
    fn default() -> Self {
        Self {
            max_file_size: default_max_file_size(),
            include_patterns: default_include_patterns(),
            exclude_patterns: vec![],
            follow_symlinks: true,
        }
    }
}

impl Default for ExportConfig {
    fn default() -> Self {
        Self {
            format: default_format(),
            include_metadata: true,
            pretty_print: true,
        }
    }
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            enforce_ro_lock: true,
            require_auth: true,
            allowed_paths: vec![],
        }
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            analysis: AnalysisConfig::default(),
            export: ExportConfig::default(),
            security: SecurityConfig::default(),
        }
    }
}

impl Config {
    pub async fn load(path: &str) -> Result<Self> {
        let path = Path::new(path);

        if path.exists() {
            debug!("Loading config from: {}", path.display());
            let content = tokio::fs::read_to_string(path).await?;
            let config: Config = toml::from_str(&content)?;
            Ok(config)
        } else {
            debug!("Config file not found, using defaults");
            Ok(Config::default())
        }
    }

    pub fn save(&self, path: &str) -> Result<()> {
        let content = toml::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;
    use std::io::Write;

    #[tokio::test]
    async fn test_load_default() {
        let config = Config::load("nonexistent.toml").await.unwrap();
        assert_eq!(config.export.format, "json");
    }

    #[tokio::test]
    async fn test_load_custom() {
        let mut temp = NamedTempFile::new().unwrap();
        writeln!(temp, r#"
[export]
format = "yaml"
pretty_print = false
"#).unwrap();

        let config = Config::load(temp.path().to_str().unwrap()).await.unwrap();
        assert_eq!(config.export.format, "yaml");
        assert!(!config.export.pretty_print);
    }
}
