import { describe, it, expect } from 'vitest';
import { SubtitleExporter } from './SubtitleExporter';
import type { OCRItem } from '../services/ocr/IOCREngine';

describe('SubtitleExporter Unit Tests', () => {
  const sampleItems: OCRItem[] = [
    {
      id: '1',
      startTime: 1000,
      endTime: 3000,
      text: 'Hello Distill',
      confidence: 98,
    },
    {
      id: '2',
      startTime: 4000,
      endTime: 6500,
      text: 'Video Subtitle Extraction',
      confidence: 95,
    },
  ];

  it('should export items as valid SRT format', () => {
    const srt = SubtitleExporter.exportToString(sampleItems, 'srt');
    expect(srt).toContain('1\n00:00:01,000 --> 00:00:03,000\nHello Distill');
    expect(srt).toContain('2\n00:00:04,000 --> 00:00:06,500\nVideo Subtitle Extraction');
  });

  it('should export items as valid VTT format', () => {
    const vtt = SubtitleExporter.exportToString(sampleItems, 'vtt');
    expect(vtt).toContain('WEBVTT');
    expect(vtt).toContain('00:00:01.000 --> 00:00:03.000');
  });

  it('should export items as TXT plain text', () => {
    const txt = SubtitleExporter.exportToString(sampleItems, 'txt');
    expect(txt).toBe('Hello Distill\nVideo Subtitle Extraction');
  });
});
