//! System dependencies check module.
//!
//! Verifies the presence and versions of required system dependencies:
//!
//! | Dependency | Required | Purpose |
//! |------------|----------|---------|
//! | ffmpeg | Yes | Video processing, frame extraction |
//! | ffprobe | Yes | Video metadata, FPS detection |
//! | tesseract | Yes | OCR text recognition |
//! | ImageMagick | No | Image format conversion (optional) |
//!
//! ## Version Detection
//!
//! Uses `--version` flags to detect installed versions.
//! Falls back to default values if version cannot be parsed.

use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemDependency {
    pub name: String,
    pub command: String,
    pub required: bool,
    pub version_args: Vec<String>,
    pub version_pattern: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencyCheckResult {
    pub name: String,
    pub installed: bool,
    pub version: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemCheckResult {
    pub all_satisfied: bool,
    pub dependencies: Vec<DependencyCheckResult>,
    pub recommendations: Vec<String>,
}

fn system_dependencies() -> &'static [SystemDependency] {
    static DEPS: OnceLock<[SystemDependency; 4]> = OnceLock::new();
    DEPS.get_or_init(|| {
        [
            SystemDependency {
                name: "ffmpeg".to_string(),
                command: "ffmpeg".to_string(),
                required: true,
                version_args: vec!["-version".to_string()],
                version_pattern: "ffmpeg version".to_string(),
            },
            SystemDependency {
                name: "ffprobe".to_string(),
                command: "ffprobe".to_string(),
                required: true,
                version_args: vec!["-version".to_string()],
                version_pattern: "ffprobe version".to_string(),
            },
            SystemDependency {
                name: "tesseract".to_string(),
                command: "tesseract".to_string(),
                required: true,
                version_args: vec!["--version".to_string()],
                version_pattern: "tesseract".to_string(),
            },
            SystemDependency {
                name: "ImageMagick".to_string(),
                command: "convert".to_string(),
                required: false,
                version_args: vec!["--version".to_string()],
                version_pattern: "ImageMagick".to_string(),
            },
        ]
    })
}

#[tauri::command]
pub async fn check_system_dependencies() -> SystemCheckResult {
    let mut results = Vec::new();
    let mut all_satisfied = true;
    let mut recommendations = Vec::new();

    for dep in system_dependencies() {
        let result = check_single_dependency(dep).await;

        if !result.installed && dep.required {
            all_satisfied = false;
            recommendations.push(format!(
                "{} is required but not found. Please install {} to enable full functionality.",
                dep.name, dep.name
            ));
        } else if !result.installed && !dep.required {
            recommendations.push(format!(
                "{} is optional. Install ImageMagick for better image format support.",
                dep.name
            ));
        }

        results.push(result);
    }

    SystemCheckResult {
        all_satisfied,
        dependencies: results,
        recommendations,
    }
}

async fn check_single_dependency(dep: &SystemDependency) -> DependencyCheckResult {
    let output = tokio::process::Command::new(&dep.command)
        .args(&dep.version_args)
        .output()
        .await;

    match output {
        Ok(out) => {
            if out.status.success() {
                let stdout = String::from_utf8_lossy(&out.stdout);
                let stderr = String::from_utf8_lossy(&out.stderr);
                let output_str = if stdout.contains(&dep.version_pattern) {
                    stdout.to_string()
                } else {
                    stderr.to_string()
                };

                let version = extract_version(&output_str);

                DependencyCheckResult {
                    name: dep.name.clone(),
                    installed: true,
                    version,
                    error: None,
                }
            } else {
                DependencyCheckResult {
                    name: dep.name.clone(),
                    installed: false,
                    version: None,
                    error: Some("Command exited with error".to_string()),
                }
            }
        }
        Err(e) => DependencyCheckResult {
            name: dep.name.clone(),
            installed: false,
            version: None,
            error: Some(format!("Command not found: {}", e)),
        },
    }
}

fn extract_version(output: &str) -> Option<String> {
    // 优化：配置驱动，消除重复的 if-chain 模式
    // 每个入口：(匹配前缀, 取第 n 个 token)
    let patterns: &[(&str, usize)] = &[
        ("ffmpeg version", 2),
        ("ffprobe version", 2),
        ("tesseract", 1),
        ("paddleocr", 1),
    ];
    for line in output.lines() {
        let trimmed = line.trim();
        for &(prefix, token_idx) in patterns {
            if trimmed.starts_with(prefix) {
                return trimmed
                    .split_whitespace()
                    .nth(token_idx)
                    .map(|v| v.to_string());
            }
        }
        // ImageMagick: 行内匹配 "ImageMagick ... version x.y.z"
        if trimmed.contains("ImageMagick") && trimmed.contains("version") {
            let parts: Vec<&str> = trimmed.split_whitespace().collect();
            if let Some(pos) = parts.iter().position(|&p| p == "version") {
                return parts.get(pos + 1).map(|&s| s.to_string());
            }
        }
    }
    // 最后兜底：第一行包含 version 关键词
    let first_line = output.lines().next()?.trim();
    if first_line.contains("version") || first_line.contains("Version") {
        Some(first_line.to_string())
    } else {
        None
    }
}

#[tauri::command]
pub async fn get_tesseract_languages() -> Vec<String> {
    let output = tokio::process::Command::new("tesseract")
        .args(["--list-langs"])
        .output()
        .await;

    match output {
        Ok(out) if out.status.success() => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            stdout
                .lines()
                .skip(1)
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        }
        _ => {
            vec!["eng".to_string(), "chi_sim".to_string()]
        }
    }
}
