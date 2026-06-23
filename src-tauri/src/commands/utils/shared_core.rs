// Pure-stdlib utility helpers shared with `tests/standalone_tests.rs`.
//
// Keeping these in a separate file avoids pulling `ndarray` / `image`
// into the standalone test binary, which is compiled with plain `rustc`
// and no external crates.

/// Compute horizontal projection profile from a binary edge map.
///
/// Returns the sum of edge pixels per row, normalised to `[0.0, 1.0]`.
pub fn horizontal_projection(edges: &[Vec<u8>]) -> Vec<f64> {
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
            sum as f64 / width / 255.0
        })
        .collect()
}

/// Raw Sobel edge detection on a pixel buffer.
///
/// This is the shared implementation used by both the production code
/// (`auto_roi.rs` via `GrayImage`) and the standalone tests.
pub fn sobel_edges_raw(pixels: &[u8], width: usize, height: usize) -> Vec<Vec<u8>> {
    let mut edges = vec![vec![0u8; width]; height];

    let sobel_x: [[i32; 3]; 3] = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    let sobel_y: [[i32; 3]; 3] = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    let threshold: u32 = 80;

    for y in 1..(height - 1) {
        for x in 1..(width - 1) {
            let mut gx = 0i32;
            let mut gy = 0i32;

            for ky in 0..3 {
                for kx in 0..3 {
                    let px = pixels[(y + ky - 1) * width + (x + kx - 1)] as i32;
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

/// Parse `pts_time:` values from ffprobe showinfo output.
///
/// Returns timestamps in seconds, filtering out zero/negative values.
pub fn parse_pts_times(output: &str) -> Vec<f64> {
    let mut timestamps: Vec<f64> = Vec::new();
    for line in output.lines() {
        if line.contains("pts_time:") {
            if let Some(ts_str) = line.split("pts_time:").nth(1) {
                let ts_str = ts_str.split_whitespace().next().unwrap_or("");
                if let Ok(ts) = ts_str.parse::<f64>() {
                    if ts > 0.0 {
                        timestamps.push(ts);
                    }
                }
            }
        }
    }
    timestamps
}
