/**
 * @file SubtitleExporter.ts
 * @description 格式化与导出字幕工具类，支持导出为 .srt, .vtt, .txt, .ass 等格式。
 */

import type { OCRItem } from '../services/ocr/IOCREngine';
import { TimecodeConverter } from './TimecodeConverter';

export type ExportFormat = 'srt' | 'vtt' | 'txt' | 'json';

export class SubtitleExporter {
  /**
   * 将字幕列表转化为目标格式文本
   */
  public static exportToString(items: OCRItem[], format: ExportFormat): string {
    switch (format) {
      case 'srt':
        return this.toSRT(items);
      case 'vtt':
        return this.toVTT(items);
      case 'txt':
        return this.toTXT(items);
      case 'json':
        return JSON.stringify(items, null, 2);
      default:
        return this.toSRT(items);
    }
  }

  private static toSRT(items: OCRItem[]): string {
    return items
      .map((item, index) => {
        const start = TimecodeConverter.msToSRT(item.startTime);
        const end = TimecodeConverter.msToSRT(item.endTime || item.startTime + 2500);
        return `${index + 1}\n${start} --> ${end}\n${item.text}\n`;
      })
      .join('\n');
  }

  private static toVTT(items: OCRItem[]): string {
    const header = 'WEBVTT - Exported by Distill\n\n';
    const body = items
      .map((item, index) => {
        const start = TimecodeConverter.msToVTT(item.startTime);
        const end = TimecodeConverter.msToVTT(item.endTime || item.startTime + 2500);
        return `${index + 1}\n${start} --> ${end}\n${item.text}\n`;
      })
      .join('\n');
    return header + body;
  }

  private static toTXT(items: OCRItem[]): string {
    return items.map((item) => item.text).join('\n');
  }

  /**
   * 触发浏览器 / 桌面环境文件下载保存
   */
  public static downloadFile(content: string, filename: string, mimeType: string = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
