//! Auto-detect subtitle region command.
//!
//! Extracts a frame from a video at a given timestamp and runs
//! `auto_detect_roi.py` to find the subtitle region using edge detection.

use serde::{Deserialize, Serialize};

use super::utils::{find_python_binary, find_script, uuid_v4, TempFileGuard};

/// Result of automatic subtitle region detection.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedROI {
    /// Left edge X coordinate (percent, 0-100).
    pub x: f64,
    /// Top edge Y coordinate (percent, 0-100).
    pub y: f64,
    /// Width of region (percent, 0-100).
    pub width: f64,
    /// Height of region (percent, 0-100).
    pub height: f64,
    /// Detection confidence (0-1).
    pub confidence: f64,
}

/// Extract a single frame from a video file at the given timestamp.
async fn extract_frame_for_detection(
    video_path: &str,
    timestamp: f64,
) -> Result<(std::path::PathBuf, TempFileGuard), String> {
    let canonical = std::path::Path::new(video_path)
        .canonicalize()
        .map_err(|e| format!("Invalid video path '{}': {}", video_path, e))?;

    if !canonical.is_file() {
        return Err(format!("Video path '{}' is not a valid file", video_path));
    }

    let uuid = uuid_v4();
    let timestamp_ms = (timestamp * 1000.0) as u64;
    let output_path = std::env::temp_dir().join(format!(
        "captionfab_roi_detect_{}_{}.png",
        timestamp_ms, uuid
    ));

    let ts_str = format!("{}", timestamp);
    let output_path_str = output_path.to_string_lossy();

    let output = tokio::process::Command::new("ffmpeg")
        .args([
            "-y", "-nostdin",
            "-ss", ts_str.as_str(),
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",
            output_path_str.as_ref(),
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run ffmpeg: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffmpeg frame extraction failed: {}", stderr));
    }

    let guard = TempFileGuard::new(output_path.clone());
    Ok((output_path, guard))
}

/// Get video dimensions using ffprobe.
async fn get_video_dimensions(
    video_path: &str,
) -> Result<(u32, u32), String> {
    let output = tokio::process::Command::new("ffprobe")
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            video_path,
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

    if !output.status.success() {
        return Err("ffprobe exited with error".to_string());
    }

    let json_str = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;

    let video_stream = json["streams"]
        .as_array()
        .and_then(|streams| {
            streams.iter().find(|s| s["codec_type"] == "video")
        })
        .ok_or("No video stream found")?;

    let width = video_stream["width"].as_u64().unwrap_or(1920) as u32;
    let height = video_stream["height"].as_u64().unwrap_or(1080) as u32;

    Ok((width, height))
}

/// Auto-detect subtitle region in a video frame.
///
/// This command:
/// 1. Extracts a single frame at the given timestamp using ffmpeg
/// 2. Gets video dimensions via ffprobe
/// 3. Runs the auto_detect_roi.py Python script on the frame
/// 4. Returns the detected region as a `DetectedROI` struct
#[tauri::command]
pub async fn auto_detect_roi(
    video_path: String,
    timestamp: f64,
) -> Result<DetectedROI, String> {
    tracing::info!(
        "Auto-detecting ROI for '{}' at timestamp {:.2}s",
        video_path,
        timestamp
    );

    // 1. Get video dimensions
    let (width, height) = get_video_dimensions(&video_path).await?;
    tracing::info!("Video dimensions: {}x{}", width, height);

    // 2. Extract frame at timestamp
    let (frame_path, _guard) =
        extract_frame_for_detection(&video_path, timestamp).await?;
    tracing::info!("Extracted frame to: {}", frame_path.display());

    // 3. Find Python and script
    let python = find_python_binary().await?;
    let script = find_script("auto_detect_roi.py")?;

    let script_path = script.to_str().ok_or_else(|| {
        format!(
            "auto_detect_roi.py path is not valid UTF-8: {:?}",
            script
        )
    })?;
    let frame_path_str = frame_path.to_str().ok_or_else(|| {
        format!("Frame path is not valid UTF-8: {:?}", frame_path)
    })?;

    // 4. Run the Python script
    let output = tokio::process::Command::new(&python)
        .args([
            script_path,
            frame_path_str,
            &width.to_string(),
            &height.to_string(),
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run auto_detect_roi.py: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!(
            "auto_detect_roi.py failed (exit {}):\nstderr: {}\nstdout: {}",
            output.status, stderr, stdout
        ));
    }

    // 5. Parse JSON result
    let stdout = String::from_utf8_lossy(&output.stdout);
    let result: DetectedROI = serde_json::from_str(&stdout).map_err(|e| {
        format!(
            "Failed to parse auto_detect_roi.py output: {}\nOutput: {}",
            e, stdout
        )
    })?;

    tracing::info!(
        "Detected ROI: x={:.1}%, y={:.1}%, w={:.1}%, h={:.1}%, confidence={:.2}",
        result.x,
        result.y,
        result.width,
        result.height,
        result.confidence
    );

    Ok(result)
}
