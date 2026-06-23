# Commands

Tauri 后端命令列表，前端通过 `invoke()` 调用。

---

## 视频处理

### `get_video_metadata`

获取视频元数据。

**参数：**
```typescript
{
  path: string  // 视频文件路径
}
```

**返回值：**
```typescript
{
  path: string
  width: number
  height: number
  duration: number
  fps: number
  total_frames: number
  codec: string
}
```

**示例：**
```typescript
const meta = await invoke<VideoMeta>('get_video_metadata', {
  path: '/path/to/video.mp4'
})
```

---

### `detect_scenes`

场景检测，返回场景变化帧号列表。

**参数：**
```typescript
{
  videoPath: string
  config: {
    threshold: number      // 检测阈值 (0-1)
    min_scene_length: number  // 最小场景长度（帧）
    frame_interval: number    // 帧间隔
    multi_pass: boolean       // 是否多通道
  }
}
```

**返回值：** `number[]` — 场景变化帧号数组

---

### `extract_frame_at_time`

提取指定时间的帧。

**参数：**
```typescript
{
  path: string        // 视频路径
  timestampSecs: number  // 时间戳（秒）
}
```

**返回值：** `string` — 临时 PNG 文件路径

---

## 文件操作

### `open_file_dialog`

打开文件选择对话框。

**参数：**
```typescript
{
  filters?: Array<{
    name: string
    extensions: string[]
  }>
  multiple?: boolean
}
```

**返回值：** `string | string[] | null`

---

### `save_file_dialog`

打开保存文件对话框。

**参数：**
```typescript
{
  defaultPath?: string
  filters?: Array<{
    name: string
    extensions: string[]
  }>
}
```

**返回值：** `string | null`

---

### `read_text_file`

读取文本文件。

**参数：**
```typescript
{
  path: string
}
```

**返回值：** `string`

---

### `write_text_file`

写入文本文件。

**参数：**
```typescript
{
  path: string
  content: string
}
```

**返回值：** `void`

---

### `get_file_info`

获取文件信息。

**参数：**
```typescript
{
  path: string
}
```

**返回值：**
```typescript
{
  path: string
  size: number
  isFile: boolean
  isDirectory: boolean
}
```

---

## 系统检测

### `check_dependencies`

检查系统依赖（FFmpeg、Node.js、Python 等）。

**参数：** 无

**返回值：**
```typescript
{
  ffmpeg: boolean
  node: boolean
  python: boolean
  paddleocr: boolean
}
```

---

### `get_tesseract_languages`

获取 Tesseract 已安装的语言包。

**参数：** 无

**返回值：** `string[]` — 语言代码数组

---

## 字幕导出

### `export_subtitles`

导出字幕到文件。

**参数：**
```typescript
{
  subtitles: Subtitle[]
  format: 'srt' | 'vtt' | 'ass' | 'ssa' | 'json' | 'csv' | 'txt' | 'lrc' | 'sbv'
  outputPath: string
}
```

**返回值：** `void`

---

## 调用示例

```typescript
import { invoke } from '@tauri-apps/api/core'

// 获取视频元数据
const meta = await invoke<VideoMeta>('get_video_metadata', {
  path: videoPath
})

// 场景检测
const scenes = await invoke<number[]>('detect_scenes', {
  videoPath,
  config: { threshold: 0.3, min_scene_length: 30, frame_interval: 2, multi_pass: false }
})

// 导出字幕
await invoke('export_subtitles', {
  subtitles,
  format: 'srt',
  outputPath: './output.srt'
})
```
