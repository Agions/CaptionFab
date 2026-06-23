# 导出格式

CaptionFab 支持 9 种字幕导出格式，覆盖视频编辑、网页播放、批量上传等场景。

---

## 格式概览

| 格式 | 扩展名 | 适用场景 | 编码 |
|:-----|:-------|:---------|:-----|
| SubRip | `.srt` | YouTube、Premiere、Final Cut | UTF-8 |
| WebVTT | `.vtt` | HTML5 视频、Web 播放器 | UTF-8 |
| ASS | `.ass` | 高级字幕、特效字幕 | UTF-8 |
| SSA | `.ssa` | 传统高级字幕 | UTF-8 |
| JSON | `.json` | 二次开发、结构化数据 | UTF-8 |
| CSV | `.csv` | Excel、数据分析 | UTF-8 / GBK |
| TXT | `.txt` | 纯文本、对白提取 | UTF-8 |
| LRC | `.lrc` | 音乐歌词、音频同步 | UTF-8 |
| SBV | `.sbv` | YouTube 批量上传 | UTF-8 |

---

## 详细说明

### SubRip (SRT)

最通用的字幕格式，广泛支持于视频编辑软件和播放器。

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

HTML5 视频标准字幕格式，支持样式和定位。

```vtt
WEBVTT

1
00:00:01.000 --> 00:00:04.000
这是第一条字幕

2
00:00:05.500 --> 00:00:09.000
这是第二条字幕
```

**时间码格式：** `HH:MM:SS.mmm`

---

### ASS / SSA

高级字幕格式，支持字体、颜色、位置、动画等特效。

```ass
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,这是第一条字幕
```

**特点：**
- 支持自定义样式（字体、大小、颜色、 Outline）
- 支持移动、淡入淡出等特效
- 适用于动画、MV、复杂排版

---

### JSON

结构化数据格式，适合二次开发和程序处理。

```json
{
  "subtitles": [
    {
      "id": "sub-1",
      "startTime": 1.0,
      "endTime": 4.0,
      "startFrame": 30,
      "endFrame": 120,
      "text": "这是第一条字幕",
      "confidence": 0.95,
      "language": "zh"
    }
  ]
}
```

---

### CSV

表格格式，可用 Excel 打开，适合数据分析。

```csv
id,startTime,endTime,startFrame,endFrame,text,confidence,language
sub-1,1.0,4.0,30,120,"这是第一条字幕",0.95,zh
sub-2,5.5,9.0,165,270,"这是第二条字幕",0.92,zh
```

---

### TXT

纯文本格式，仅保留字幕文本，每行一条。

```
这是第一条字幕
这是第二条字幕
这是第三条字幕
```

---

### LRC

音乐歌词格式，支持时间标签。

```lrc
[00:01.00]这是第一条字幕
[00:05.50]这是第二条字幕
[00:10.00]这是第三条字幕
```

**时间码格式：** `[MM:SS.xx]`

---

### SBV

YouTube 批量上传格式，简洁的时间码格式。

```sbv
0:00:01.000,0:00:04.000
这是第一条字幕

0:00:05.500,0:00:09.000
这是第二条字幕
```

---

## 导出选项

### 编码选择

- **UTF-8**：默认，跨平台兼容
- **GBK**：Windows 记事本兼容，仅中文场景

### 帧率指定

- **自动检测**：从视频元数据读取
- **手动指定**：适用于特殊编码的视频

### 双语导出

- **对照模式**：原文 + 翻译并排显示
- **交替模式**：原文和翻译交替显示

---

## 导入到其他软件

| 软件 | 支持格式 | 导入方式 |
|:-----|:---------|:---------|
| Premiere Pro | SRT、VTT | 文件 → 导入 → 字幕 |
| Final Cut Pro | SRT、VTT | 文件 → 导入 → XML |
| DaVinci Resolve | SRT、VTT、ASS | 媒体池 → 右键导入 |
| Aegisub | ASS、SSA | 直接打开 |
| YouTube | SRT、VTT、SBV | 上传 → 字幕 → 添加 |
| Bilibili | SRT、VTT、ASS | 上传 → 编辑字幕 |
