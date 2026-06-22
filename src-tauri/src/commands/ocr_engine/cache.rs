//! LRU cache for OCR results.

use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::LazyLock;

use crate::commands::types::OCRResult;

/// Simple LRU cache for OCR results keyed by frame content hash.
pub struct OcrCache {
    pub cap: usize,
    pub map: HashMap<u64, Vec<OCRResult>>,
    pub order: Vec<u64>,
}

impl OcrCache {
    pub fn new(cap: usize) -> Self {
        Self {
            cap,
            map: HashMap::with_capacity(cap),
            order: Vec::with_capacity(cap),
        }
    }

    pub fn get(&mut self, key: &u64) -> Option<&Vec<OCRResult>> {
        if self.map.contains_key(key) {
            if let Some(pos) = self.order.iter().position(|k| k == key) {
                self.order.remove(pos);
                self.order.push(*key);
            }
            self.map.get(key)
        } else {
            None
        }
    }

    pub fn insert(&mut self, key: u64, value: Vec<OCRResult>) {
        if self.map.len() >= self.cap {
            if let Some(old) = self.order.first().copied() {
                self.order.remove(0);
                self.map.remove(&old);
            }
        }
        self.map.insert(key, value);
        self.order.push(key);
    }
}

pub static OCR_CACHE: LazyLock<Mutex<OcrCache>> =
    LazyLock::new(|| Mutex::new(OcrCache::new(256)));
