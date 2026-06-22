//! Auto-detect subtitle region — Rust native (replaces Python + OpenCV).
//!
//! Given a video frame image, finds the subtitle region using edge detection
//! and horizontal projection analysis — all in pure Rust via the `image` crate.
//!
//! ## Algorithm
//!
//! 1. Load image with `image::open()` → grayscale
//! 2. Apply Canny edge detection (simplified Sobel-based implementation)
//! 3. Compute horizontal projection profile of edge density
//! 4. Find text-dense rows in the bottom third of the frame
//! 5. Return bounding box of detected subtitle region

use serde::{Deserialize, Serialize};
use super::utils::{uuid_v4, TempFileGuard};

use image::{DynamicImage, GenericImageView, GrayImage};
use std::path::Path;

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

/// Default fallback ROI (bottom 15% of frame).
fn fallback_roi(_width: u32, _height: u32) -> DetectedROI {
    DetectedROI {
        x: 0.0,
        y: 85.0,
        width: 100.0,
        height: 15.0,
        confidence: 0.2,
    }
}

/// Convert coordinates to percent of image dimensions.
#[allow(dead_code)]
fn to_percent(x: u32, y: u32, w: u32, h: u32, img_w: u32, img_h: u32) -> DetectedROI {
    DetectedROI {
        x: ((x as f64 / img_w as f64) * 100.0).clamp(0.0, 100.0).round() as f64,
        y: ((y as f64 / img_h as f64) * 100.0).clamp(0.0, 100.0).round() as f64,
        width: ((w as f64 / img_w as f64) * 100.0).clamp(5.0, 100.0).round() as f64,
        height: ((h as f64 / img_h as f64) * 100.0).clamp(3.0, 100.0).round() as f64,
        confidence: 0.5, // Will be refined below
    }
}

/// Simple Sobel-based edge detection.
///
/// Computes gradient magnitude using Sobel operators on a grayscale image.
/// Returns a binary edge map (edge pixels are non-zero).
fn sobel_edges(gray: &GrayImage) -> Vec<Vec<u8>> {
    let (w, h) = gray.dimensions();
    let mut edges = vec![vec![0u8; w as usize]; h as usize];

    // Sobel kernels
    let sobel_x: [[i32; 3]; 3] = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    let sobel_y: [[i32; 3]; 3] = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    let threshold: u32 = 80; // Edge strength threshold

    for y in 1..(h as usize - 1) {
        for x in 1..(w as usize - 1) {
            let mut gx = 0i32;
            let mut gy = 0i32;

            for ky in 0..3 {
                for kx in 0..3 {
                    let px = gray.get_pixel((x + kx - 1) as u32, (y + ky - 1) as u32).0[0] as i32;
                    gx += px * sobel_x[ky][kx];
                    gy += px * sobel_y[ky][kx];
                }
            }

            let magnitude = ((gx * gx + gy * gy) as f64).sqrt() as u32;
            if magnitude > threshold {
                edges[y][x] = 255;
            }
        }
    }

    edges
}

/// Compute horizontal projection profile from edge map.
/// Returns sum of edge pixels per row (normalized 0.0-1.0).
fn horizontal_projection(edges: &[Vec<u8>]) -> Vec<f64> {
    if edges.is_empty() {
        return Vec::new();
    }
    let width = edges[0].len() as f64;
    if width == 0.0 {
        return vec![0.0; edges.len()];
    }

    edges
        .iter()
        .map(|row| {
            let sum: u32 = row.iter().map(|&p| p as u32).sum();
            sum as f64 / width / 255.0 // Normalize to [0, 1]
        })
        .collect()
}

/// Detect subtitle region from a loaded image.
fn detect_roi_from_image(img: &DynamicImage) -> DetectedROI {
    let (width, height) = img.dimensions();

    if width == 0 || height == 0 {
        return fallback_roi(width, height);
    }

    // Convert to grayscale
    let gray = img.to_luma8();

    // Apply Sobel edge detection
    let edges = sobel_edges(&gray);

    // Focus on the bottom third of the frame (subtitles are typically there)
    let bottom_third_start = (height / 3).max(1) as usize;
    if bottom_third_start >= edges.len() {
        return fallback_roi(width, height);
    }

    let bottom_region = &edges[bottom_third_start..];

    // Compute horizontal projection of bottom region
    let h_proj = horizontal_projection(bottom_region);

    // Find rows with significant edge content
    let edge_threshold = 0.05;
    let text_rows: Vec<usize> = h_proj
        .iter()
        .enumerate()
        .filter(|(_, &v)| v > edge_threshold)
        .map(|(idx, _)| idx)
        .collect();

    if text_rows.is_empty() {
        return fallback_roi(width, height);
    }

    // Group consecutive rows into text blocks
    let gap_threshold = 5;
    let mut blocks: Vec<(usize, usize)> = Vec::new();
    let mut block_start = text_rows[0];
    let mut prev_row = text_rows[0];

    for i in 1..text_rows.len() {
        if text_rows[i] - prev_row > gap_threshold {
            blocks.push((block_start, prev_row));
            block_start = text_rows[i];
        }
        prev_row = text_rows[i];
    }
    blocks.push((block_start, prev_row));

    // Pick the largest block (most likely subtitle text)
    let best_block = blocks.iter().max_by_key(|(start, end)| end - start);
    let (block_top, block_bottom) = match best_block {
        Some(&(t, b)) => (t, b),
        None => return fallback_roi(width, height),
    };

    // Add padding
    let padding_rows = 3;
    let region_top = (bottom_third_start + block_top).saturating_sub(padding_rows);
    let region_bottom = (bottom_third_start + block_bottom + padding_rows).min(height as usize - 1);

    // Vertical projection: find left/right bounds of text within the text rows
    let mut left_col = 0usize;
    let mut right_col = width as usize;

    for y in region_top..=region_bottom {
        for x in 0..width as usize {
            if edges[y][x] > 0 {
                left_col = left_col.min(x);
                right_col = right_col.max(x);
            }
        }
    }

    let col_padding = 5;
    let region_x = left_col.saturating_sub(col_padding);
    let region_w = (right_col + col_padding).saturating_sub(region_x).max(1);

    let region_h = (region_bottom - region_top + 1).max(1);

    // Calculate confidence based on edge density
    let mut edge_pixels = 0u32;
    for y in region_top..=region_bottom {
        if y < edges.len() {
            for x in region_x..(region_x + region_w).min(width as usize) {
                if x < edges[y].len() && edges[y][x] > 0 {
                    edge_pixels += 1;
                }
            }
        }
    }

    let total_pixels = region_h * region_w;
    let normalized_density = if total_pixels > 0 {
        edge_pixels as f64 / total_pixels as f64
    } else {
        0.0
    };

    // Scale to 0-1 range (typical subtitle frames have ~0.02-0.1 density)
    let confidence = (normalized_density / 0.15).clamp(0.1, 1.0);

    // Convert to percent
    let x_pct = ((region_x as f64 / width as f64) * 100.0).clamp(0.0, 100.0);
    let y_pct = ((region_top as f64 / height as f64) * 100.0).clamp(0.0, 100.0);
    let w_pct = ((region_w as f64 / width as f64) * 100.0).clamp(5.0, 100.0);
    let h_pct = ((region_h as f64 / height as f64) * 100.0).clamp(3.0, 100.0);

    DetectedROI {
        x: (x_pct * 10.0).round() / 10.0,
        y: (y_pct * 10.0).round() / 10.0,
        width: (w_pct * 10.0).round() / 10.0,
        height: (h_pct * 10.0).round() / 10.0,
        confidence: (confidence * 100.0).round() / 100.0,
    }
}

/// Extract a single frame from a video file at the given timestamp.
pub(crate) async fn extract_frame_for_detection(
    video_path: &str,
    timestamp: f64,
) -> Result<(std::path::PathBuf, TempFileGuard), String> {
    let canonical = std::path::Path::new(video_path)
        .canonicalize()
        .map_err(|e| format!("Invalid video path '{}': {}", video_path, e))?;

    if !canonical.is_file() {
        return Err(format!("Video path '{}' is not a valid file", video_path));
    }

    // Use a UUID-based temp file to avoid race conditions
    let uuid = uuid_v4();
    let output_path = std::env::temp_dir().join(format!(
        "captionfab_roi_frame_{}.png",
        uuid
    ));
    let guard = TempFileGuard::new(output_path.clone());

    let ts_str = format!("{}", timestamp);
    let output_path_str = output_path.to_string_lossy();

    let args: Vec<&str> = vec![
        "-y", "-nostdin",
        "-ss", &ts_str,
        "-i", video_path,
        "-vframes", "1",
        "-q:v", "2",
        output_path_str.as_ref(),
    ];

    let output = super::utils::run_command_with_timeout(
        "ffmpeg",
        &args,
        std::time::Duration::from_secs(30),
    )
    .await
    .map_err(|e| format!("{}: {e}", crate::commands::errors::FFMPEG_FAILED))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffmpeg failed: {}", stderr));
    }

    Ok((output_path, guard))
}

/// Auto-detect subtitle region in a video frame.
///
/// Extracts a frame from the video at the given timestamp and analyzes it
/// using Rust-native edge detection to find the most likely subtitle region.
#[tauri::command]
pub async fn auto_detect_roi(
    video_path: String,
    timestamp: f64,
    video_width: u32,
    video_height: u32,
) -> Result<DetectedROI, String> {
    tracing::info!(
        "Auto-detecting ROI for: {} at {}s ({}x{})",
        video_path,
        timestamp,
        video_width,
        video_height
    );

    let path = Path::new(&video_path);
    if !path.exists() {
        return Err(format!("{}: {}", crate::commands::errors::FILE_NOT_FOUND, video_path));
    }

    // Extract a frame at the given timestamp
    let (_frame_path, _guard) = extract_frame_for_detection(&video_path, timestamp).await?;

    // Load the image
    let img = image::open(&_frame_path)
        .map_err(|e| format!("Failed to load extracted frame: {}", e))?;

    // Detect ROI
    let roi = detect_roi_from_image(&img);

    tracing::info!(
        "Auto-detected ROI: ({:.1}%, {:.1}%) → {:.1}% x {:.1}%  (confidence: {:.2})",
        roi.x, roi.y, roi.width, roi.height, roi.confidence
    );

    Ok(roi)
}