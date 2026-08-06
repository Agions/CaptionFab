import { describe, it, expect } from 'vitest';
import { TimecodeConverter } from './TimecodeConverter';

describe('TimecodeConverter Unit Tests', () => {
  it('should format milliseconds into SRT timecode', () => {
    const srt = TimecodeConverter.msToSRT(83456);
    expect(srt).toBe('00:01:23,456');
  });

  it('should format milliseconds into VTT timecode', () => {
    const vtt = TimecodeConverter.msToVTT(83456);
    expect(vtt).toBe('00:01:23.456');
  });

  it('should parse timecode string back into milliseconds', () => {
    const ms = TimecodeConverter.parseToMs('00:01:23,456');
    expect(ms).toBe(83456);
  });
});
