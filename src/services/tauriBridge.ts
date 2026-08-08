/**
 * @file tauriBridge.ts
 * @description Tauri 2.x Rust 后端 IPC 桥接层。
 * 负责检测是否运行在 Tauri 环境，并桥接 Rust 后端的高性能命令（场景检测、ONNX Native OCR、原生文件对话框、视频帧抽帧、智能 ROI 识别）。
 */

import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

export class TauriBridge {
  /** 检测当前应用是否运行在 Tauri 客户端容器中 */
  public static isTauriEnv(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  /** 将原生系统路径转换为可在 Web 视图渲染的 asset URI (Tauri 2.x convertFileSrc) */
  public static convertPathToAssetUrl(filePath: string): string {
    try {
      return convertFileSrc(filePath);
    } catch {
      return `https://asset.localhost/${encodeURIComponent(filePath)}`;
    }
  }

  /** 调用 Tauri 原生文件选择对话框选择视频文件 */
  public static async openVideoFileDialog(): Promise<string | null> {
    if (!this.isTauriEnv()) return null;
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Video Files',
            extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv', 'm4v', 'wmv', '3gp'],
          },
        ],
      });
      if (Array.isArray(selected)) {
        return selected[0] || null;
      }
      return typeof selected === 'string' ? selected : null;
    } catch (e) {
      console.warn('Tauri 打开文件对话框失败/取消:', e);
      return null;
    }
  }

  /** 调用 Rust 后端获取视频元数据 (Duration, Resolution, FPS, Codec) */
  public static async getVideoMetadata(filePath: string): Promise<any> {
    if (!this.isTauriEnv()) return null;
    return await invoke('get_video_metadata', { path: filePath });
  }

  /** 调用 Rust 后端高性能场景切换检测 (Scene Detection) */
  public static async detectScenes(filePath: string, threshold = 0.3): Promise<number[]> {
    if (!this.isTauriEnv()) return [];
    return await invoke('detect_scenes', { path: filePath, threshold });
  }

  /** 调用 Rust 原生智能硬字幕 ROI 选区检测 */
  public static async autoDetectROI(filePath: string): Promise<{ x: number; y: number; width: number; height: number } | null> {
    if (!this.isTauriEnv()) return null;
    try {
      return await invoke('auto_detect_roi', { videoPath: filePath });
    } catch (e) {
      console.warn('Tauri 自动识别 ROI 选区异常:', e);
      return null;
    }
  }

  /** 调用 Rust Native ONNX OCR 引擎提取硬字幕 */
  public static async ocrRecognizeNative(
    imagePath: string,
    lang = 'ch',
    roi?: { x: number; y: number; width: number; height: number }
  ): Promise<any> {
    if (!this.isTauriEnv()) return null;
    return await invoke('ocr_recognize', {
      imagePath,
      lang,
      roi,
    });
  }

  /** 调用 Rust 原生保存文件对话框 */
  public static async saveSubtitlesDialog(content: string, defaultName: string): Promise<boolean> {
    if (!this.isTauriEnv()) return false;
    try {
      const path = await save({
        defaultPath: defaultName,
        filters: [
          { name: 'SRT Subtitle', extensions: ['srt'] },
          { name: 'VTT Subtitle', extensions: ['vtt'] },
          { name: 'Text File', extensions: ['txt'] },
        ],
      });
      if (path) {
        await invoke('write_text_file', { path, content });
        return true;
      }
    } catch (e) {
      console.error('Tauri 保存字幕文件失败:', e);
    }
    return false;
  }
}
