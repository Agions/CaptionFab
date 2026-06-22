//! Image preprocessing for OCR inference.

use image::imageops::FilterType;
use image::DynamicImage;
use image::GenericImageView;
use ndarray::{Array, IxDyn};

// Detection model input size (PP-OCRv4/v6 default).
pub const DET_INPUT_SIZE: u32 = 960;
// Recognition model fixed height (PP-OCRv4/v6 default).
pub const REC_HEIGHT: u32 = 48;
// Maximum recognition width (longest allowed text line).
pub const REC_MAX_WIDTH: u32 = 3200;

// ImageNet normalisation constants (used by PP-OCR).
pub const MEAN: [f32; 3] = [0.485, 0.456, 0.406];
pub const STD: [f32; 3] = [0.229, 0.224, 0.225];

/// Resize image to detection input size (960×960) with letterbox padding.
pub fn preprocess_detection(img: &DynamicImage) -> (Array<f32, IxDyn>, f32, f32) {
    let (w, h) = img.dimensions();
    let scale = DET_INPUT_SIZE as f64 / w.max(h) as f64;
    let new_w = (w as f64 * scale).round() as u32;
    let new_h = (h as f64 * scale).round() as u32;

    let resized = img.resize_exact(new_w, new_h, FilterType::CatmullRom);
    let (rw, rh) = resized.dimensions();

    let mut tensor = Array::zeros((1, 3, DET_INPUT_SIZE as usize, DET_INPUT_SIZE as usize));

    for y in 0..rh {
        for x in 0..rw {
            let pixel = resized.get_pixel(x, y);
            let r = pixel[0] as f32 / 255.0;
            let g = pixel[1] as f32 / 255.0;
            let b = pixel[2] as f32 / 255.0;

            tensor[[0, 0, y as usize, x as usize]] = (r - MEAN[0]) / STD[0];
            tensor[[0, 1, y as usize, x as usize]] = (g - MEAN[1]) / STD[1];
            tensor[[0, 2, y as usize, x as usize]] = (b - MEAN[2]) / STD[2];
        }
    }

    (tensor.into_dyn(), new_w as f32, new_h as f32)
}

/// Pre-process a cropped text region for the recognition model.
pub fn preprocess_recognition(crop: &DynamicImage) -> Array<f32, IxDyn> {
    let (w, h) = crop.dimensions();
    let scale = REC_HEIGHT as f64 / h as f64;
    let new_w = (w as f64 * scale).round() as u32;
    let new_w = new_w.min(REC_MAX_WIDTH);

    let resized = crop.resize_exact(new_w.max(1), REC_HEIGHT, FilterType::CatmullRom);
    let (rw, rh) = resized.dimensions();

    let mut tensor = Array::zeros((1, 3, REC_HEIGHT as usize, rw as usize));

    for y in 0..rh {
        for x in 0..rw {
            let pixel = resized.get_pixel(x, y);
            let r = pixel[0] as f32 / 255.0;
            let g = pixel[1] as f32 / 255.0;
            let b = pixel[2] as f32 / 255.0;

            tensor[[0, 0, y as usize, x as usize]] = (r - MEAN[0]) / STD[0];
            tensor[[0, 1, y as usize, x as usize]] = (g - MEAN[1]) / STD[1];
            tensor[[0, 2, y as usize, x as usize]] = (b - MEAN[2]) / STD[2];
        }
    }

    tensor.into_dyn()
}
