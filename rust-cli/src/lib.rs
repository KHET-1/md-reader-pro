//! Diamond Drill Library
//!
//! WASM-compatible file analysis library for browser integration.
//! Build with: `wasm-pack build --target web --features wasm`

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// File analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "wasm", wasm_bindgen(getter_with_clone))]
pub struct WasmFileAnalysis {
    pub path: String,
    pub size: u64,
    pub file_type: String,
    pub line_count: Option<u64>,
    pub word_count: Option<u64>,
    pub char_count: Option<u64>,
    pub is_binary: bool,
}

/// Analysis report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WasmReport {
    pub files_analyzed: usize,
    pub total_size: u64,
    pub file_types: HashMap<String, usize>,
    pub timestamp: u64,
}

/// Analyze text content (WASM-compatible)
#[cfg_attr(feature = "wasm", wasm_bindgen)]
pub fn analyze_text(content: &str, filename: &str) -> String {
    let lines = content.lines().count() as u64;
    let words = content.split_whitespace().count() as u64;
    let chars = content.chars().count() as u64;

    let ext = filename
        .rsplit('.')
        .next()
        .map(|s| s.to_lowercase())
        .unwrap_or_else(|| "txt".to_string());

    let analysis = WasmFileAnalysis {
        path: filename.to_string(),
        size: content.len() as u64,
        file_type: ext,
        line_count: Some(lines),
        word_count: Some(words),
        char_count: Some(chars),
        is_binary: false,
    };

    serde_json::to_string(&analysis).unwrap_or_else(|_| "{}".to_string())
}

/// Analyze binary content (WASM-compatible)
#[cfg_attr(feature = "wasm", wasm_bindgen)]
pub fn analyze_binary(data: &[u8], filename: &str) -> String {
    let is_binary = data.iter().take(8192).any(|&b| b == 0);

    let ext = filename
        .rsplit('.')
        .next()
        .map(|s| s.to_lowercase())
        .unwrap_or_else(|| "bin".to_string());

    let (line_count, word_count, char_count) = if !is_binary {
        let text = String::from_utf8_lossy(data);
        (
            Some(text.lines().count() as u64),
            Some(text.split_whitespace().count() as u64),
            Some(text.chars().count() as u64),
        )
    } else {
        (None, None, None)
    };

    let analysis = WasmFileAnalysis {
        path: filename.to_string(),
        size: data.len() as u64,
        file_type: ext,
        line_count,
        word_count,
        char_count,
        is_binary,
    };

    serde_json::to_string(&analysis).unwrap_or_else(|_| "{}".to_string())
}

/// Get version info (WASM-compatible)
#[cfg_attr(feature = "wasm", wasm_bindgen)]
pub fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Initialize WASM panic hook for better error messages
#[cfg(feature = "wasm")]
#[wasm_bindgen(start)]
pub fn wasm_init() {
    console_error_panic_hook::set_once();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_analyze_text() {
        let content = "Hello World\nLine two\nLine three";
        let result = analyze_text(content, "test.txt");

        let analysis: WasmFileAnalysis = serde_json::from_str(&result).unwrap();
        assert_eq!(analysis.line_count, Some(3));
        assert_eq!(analysis.word_count, Some(6)); // Hello, World, Line, two, Line, three
        assert!(!analysis.is_binary);
    }

    #[test]
    fn test_analyze_binary() {
        let data = b"Hello World";
        let result = analyze_binary(data, "test.txt");

        let analysis: WasmFileAnalysis = serde_json::from_str(&result).unwrap();
        assert!(!analysis.is_binary);
        assert_eq!(analysis.word_count, Some(2));
    }

    #[test]
    fn test_get_version() {
        let version = get_version();
        assert!(!version.is_empty());
    }
}
