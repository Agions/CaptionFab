# Exporter

字幕导出引擎，支持 9 种格式的输出。

---

## 概述

```typescript
import { Exporter } from '@/core'

const exporter = new Exporter()
await exporter.export('srt', subtitles, '/path/to/output.srt')
```

---

## 支持格式

| 格式 | 扩展名 | 说明 |
|:-----|:-------|:-----|
| SubRip | `.srt` | 最通用，YouTube、Premiere 支持 |
| WebVTT | `.vtt` | HTML5 视频标准 |
| ASS | `.ass` | 高级字幕，支持样式和特效 |
| SSA | `.ssa` | 传统高级字幕 |
| JSON | `.json` | 结构化数据，二次开发友好 |
| CSV | `.csv` | 表格数据，Excel 打开 |
| TXT | `.txt` | 纯文本，仅对白 |
| LRC | `.lrc` | 音乐歌词格式 |
| SBV | `.sbv` | YouTube 批量上传格式 |

---

## API

### `export(format, subtitles, outputPath)`

导出字幕到文件。

**参数：**
- `format`: 导出格式（`srt` / `vtt` / `ass` / `ssa` / `json` / `csv` / `txt` / `lrc` / `sbv`）
- `subtitles`: 字幕数组
- `outputPath`: 输出文件路径

**返回值：** `Promise<void>`

---

## 格式详情

### SubRip (SRT)

```srt
1
00:00:01,000 --> 00:00:04,000
这是第一条字幕

2
00:00:05,500 --> 00:00:09,000
这是第二条字幕
```

**时间码格式：** `HH:MM:SS,mmm`

---

### WebVTT (VTT)

```vtt
WEBVTT

1
00:00:01.000 --> 00:00:04.000
这是第一条字幕
```

**时间码格式：** `HH:MM:SS.mmm`

---

### ASS

```ass
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,这是第一条字幕
```

**特点：** 支持自定义样式、特效、位置。

---

### JSON

```json
{
  "subtitles": [
    {
      "id": "sub-1",
      "startTime": 1.0,
      "endTime": 4.0,
      "text": "这是第一条字幕",
      "confidence": 0.95
    }
  ]
}
```

---

### CSV

```csv
id,startTime,endTime,text,confidence
sub-1,1.0,4.0,这是第一条字幕,0.95
sub-2,5.5,9.0,这是第二条字幕,0.92
```

---

## 示例

```typescript
const exporter = new Exporter()

// 导出 SRT
await exporter.export('srt', subtitles, './output.srt')

// 导出 JSON
await exporter.export('json', subtitles, './output.json')

// 批量导出
for (const format of ['srt', 'vtt', 'json']) {
  await exporter.export(format, subtitles, `./output.${format}`)
}
```

---

## 错误处理

导出失败时抛出 `ExportError`：

```typescript
try {
  await exporter.export('srt', subtitles, path)
} catch (e) {
  if (e instanceof ExportError) {
    console.error('Export failed:', e.message)
  }
}
```
