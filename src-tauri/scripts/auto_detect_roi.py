#!/usr/bin/env python3
"""
Auto-detect subtitle region in a video frame.

Usage:
    python3 auto_detect_roi.py <image_path> <width> <height>

Output:
    JSON with {x, y, width, height, confidence} in percent.
    Fallback to bottom 15% if OpenCV is not available.

Algorithm:
    1. Load image with OpenCV
    2. Convert to grayscale + Canny edge detection
    3. Compute horizontal projection profile of edge density
    4. Find text-dense rows in the bottom third of the frame
    5. Return bounding box of detected subtitle region
"""

import sys
import json
import os


def detect_roi_opencv(image_path: str, width: int, height: int) -> dict:
    """Use OpenCV edge detection + horizontal projection to find subtitle region."""
    try:
        import cv2
        import numpy as np
    except ImportError:
        return detect_roi_fallback(width, height)

    img = cv2.imread(image_path)
    if img is None:
        return detect_roi_fallback(width, height)

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Canny edge detection
    edges = cv2.Canny(gray, 50, 150)

    # We focus on the bottom third of the frame (subtitles are typically there)
    bottom_third_start = height // 3
    bottom_region = edges[bottom_third_start:, :]

    if bottom_region.size == 0:
        return detect_roi_fallback(width, height)

    # Horizontal projection profile: sum edges along each row
    h_projection = np.sum(bottom_region, axis=1).astype(np.float64)

    # Normalize
    max_val = h_projection.max()
    if max_val > 0:
        h_projection /= max_val

    # Find text-dense rows: threshold to identify rows with significant edge content
    threshold = 0.05
    text_rows = np.where(h_projection > threshold)[0]

    if len(text_rows) == 0:
        return detect_roi_fallback(width, height)

    # Find the bounding box of the text region
    # Group consecutive rows into text lines
    row_gaps = np.diff(text_rows)
    gap_threshold = 5  # max gap between rows in same text block

    # Find the largest contiguous block of text rows
    blocks = []
    block_start = text_rows[0]
    prev_row = text_rows[0]

    for i in range(1, len(text_rows)):
        if text_rows[i] - prev_row > gap_threshold:
            blocks.append((block_start, prev_row))
            block_start = text_rows[i]
        prev_row = text_rows[i]
    blocks.append((block_start, prev_row))

    if not blocks:
        return detect_roi_fallback(width, height)

    # Pick the block with the most rows (most likely subtitle text)
    best_block = max(blocks, key=lambda b: b[1] - b[0])

    # Add some padding
    padding_rows = 3
    region_top = max(0, best_block[0] - padding_rows) + bottom_third_start
    region_bottom = min(height - 1, best_block[1] + padding_rows) + bottom_third_start

    # Calculate x bounds: find columns with edges in the text rows
    text_region = edges[region_top:region_bottom + 1, :]
    v_projection = np.sum(text_region, axis=0)
    text_cols = np.where(v_projection > 0)[0]

    if len(text_cols) == 0:
        region_x = 0
        region_w = width
    else:
        col_padding = 5
        region_x = max(0, int(text_cols[0]) - col_padding)
        region_w = min(width, int(text_cols[-1]) + col_padding) - region_x

    # Convert to percent
    x_pct = round((region_x / width) * 100, 1)
    y_pct = round((region_top / height) * 100, 1)
    w_pct = round((region_w / width) * 100, 1)
    h_pct = round(((region_bottom - region_top) / height) * 100, 1)

    # Calculate confidence based on edge density
    # More edges in the region = higher confidence
    edge_density = float(np.sum(edges[region_top:region_bottom + 1, region_x:region_x + region_w]))
    total_pixels = (region_bottom - region_top + 1) * (region_w + 1)
    if total_pixels > 0:
        normalized_density = edge_density / total_pixels
        # Scale to 0-1 range (typical subtitle frames have ~0.02-0.1 density)
        confidence = min(1.0, normalized_density / 0.15)
    else:
        confidence = 0.3

    return {
        "x": max(0, min(100, x_pct)),
        "y": max(0, min(100, y_pct)),
        "width": max(5, min(100, w_pct)),
        "height": max(3, min(100, h_pct)),
        "confidence": round(max(0.1, min(1.0, confidence)), 2),
    }


def detect_roi_fallback(width: int, height: int) -> dict:
    """Fallback: assume bottom 15% of the frame (common subtitle position)."""
    return {
        "x": 0.0,
        "y": 85.0,
        "width": 100.0,
        "height": 15.0,
        "confidence": 0.2,
    }


def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: auto_detect_roi.py <image_path> <width> <height>"}))
        sys.exit(1)

    image_path = sys.argv[1]
    try:
        width = int(sys.argv[2])
        height = int(sys.argv[3])
    except ValueError:
        print(json.dumps({"error": "width and height must be integers"}))
        sys.exit(1)

    if not os.path.exists(image_path):
        print(json.dumps({"error": f"File not found: {image_path}"}))
        sys.exit(1)

    result = detect_roi_opencv(image_path, width, height)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
