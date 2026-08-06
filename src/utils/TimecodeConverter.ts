/**
 * @file TimecodeConverter.ts
 * @description 视频时间码转换工具函数，支持毫秒至 SRT/VTT 时间戳格式 (`HH:MM:SS,mmm` / `HH:MM:SS.mmm`) 的相互转化。
 */

export class TimecodeConverter {
  /**
   * 将毫秒转为 SRT 格式时间戳 (00:01:23,456)
   */
  public static msToSRT(ms: number): string {
    if (isNaN(ms) || ms < 0) ms = 0;

    const totalSeconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor(ms % 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    const padMs = (n: number) => String(n).padStart(3, '0');

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${padMs(milliseconds)}`;
  }

  /**
   * 将毫秒转为 WebVTT 格式时间戳 (00:01:23.456)
   */
  public static msToVTT(ms: number): string {
    return this.msToSRT(ms).replace(',', '.');
  }

  /**
   * 解析时间戳字符串为毫秒
   */
  public static parseToMs(timeStr: string): number {
    if (!timeStr) return 0;
    const normalized = timeStr.replace('.', ',');
    const parts = normalized.split(':');
    if (parts.length !== 3) return 0;

    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    const [secStr, msStr] = parts[2].split(',');
    const seconds = parseInt(secStr, 10) || 0;
    const ms = parseInt(msStr, 10) || 0;

    return (hours * 3600 + minutes * 60 + seconds) * 1000 + ms;
  }
}
