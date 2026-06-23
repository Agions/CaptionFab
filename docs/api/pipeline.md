# Pipeline

五阶段后处理管道，对 OCR 原始结果进行清洗和优化。

---

## 概述

```typescript
const pipeline = new Pipeline({
  jitterMinDuration: 0.3,
  jitterMaxConfidence: 0.5,
  splitMaxGap: 1.5,
  splitSimilarityThreshold: 0.8,
  similarMaxGap: 0.5,
  similarSimilarityThreshold: 0.8,
})

const cleaned = pipeline.process(rawSubs)
```

---

## 处理阶段

```
rawSubs → [标准化] → [去噪] → [合并分裂] → [相似度融合] → [时间校准] → cleaned
```

### 1. 标准化

统一字幕格式，规范化文本和时间戳。

- 去除首尾空白
- 统一全角/半角标点
- 修复常见 OCR 错误（`0` → `O`，`1` → `l`）

### 2. 去噪

过滤低质量和异常字幕。

- 持续时间 < `jitterMinDuration` 的字幕
- 置信度 < `jitterMaxConfidence` 的字幕
- 空文本或仅包含空格的字幕

### 3. 合并分裂

合并被错误分割的字幕。

- 检测时间间隙 < `splitMaxGap` 的相邻字幕
- 文本相似度 > `splitSimilarityThreshold` 则合并
- 合并后时间戳自动衔接

### 4. 相似度融合

合并语义相似的字幕。

- 检测时间重叠的字幕
- 文本相似度 > `similarSimilarityThreshold` 则融合
- 保留置信度最高的版本

### 5. 时间校准

校准字幕时间戳，确保与视频帧对齐。

- 对齐到视频帧率
- 最小持续时间约束（默认 0.1s）
- 最大持续时间约束（默认 10s）

---

## API

### 构造函数

```typescript
constructor(opts?: PipelineOptions)
```

### 方法

#### `process(subtitles: SubtitleLite[]): SubtitleLite[]`

执行完整后处理管道。

**参数：**
- `subtitles`: OCR 原始结果数组

**返回值：** 清洗后的字幕数组

#### `clearCache(): void`

清空内部 LRU 缓存。

---

## 配置项

| 参数 | 类型 | 默认值 | 说明 |
|:-----|:-----|:-------|:-----|
| `jitterMinDuration` | `number` | `0.3` | 抖动字幕最小持续时间（秒） |
| `jitterMaxConfidence` | `number` | `0.5` | 抖动字幕最大置信度 |
| `splitMaxGap` | `number` | `1.5` | 合并分裂的最大时间间隙（秒） |
| `splitSimilarityThreshold` | `number` | `0.8` | 合并分裂的相似度阈值 |
| `similarMaxGap` | `number` | `0.5` | 相似度融合的最大时间间隙（秒） |
| `similarSimilarityThreshold` | `number` | `0.8` | 相似度融合的相似度阈值 |

---

## 示例

```typescript
import { Pipeline } from '@/core'

const pipeline = new Pipeline({
  jitterMinDuration: 0.3,
  jitterMaxConfidence: 0.5,
  splitMaxGap: 1.5,
  splitSimilarityThreshold: 0.8,
  similarMaxGap: 0.5,
  similarSimilarityThreshold: 0.8,
})

const rawSubs = [
  { startTime: 1.0, endTime: 1.2, text: 'Hello', confidence: 0.3 },
  { startTime: 1.2, endTime: 3.0, text: 'World', confidence: 0.9 },
]

const cleaned = pipeline.process(rawSubs)
// [
//   { startTime: 1.0, endTime: 3.0, text: 'Hello World', confidence: 0.9 }
// ]
```

---

## 性能

- **时间复杂度**：O(n log n)，n 为字幕数量
- **空间复杂度**：O(n)
- **LRU 缓存**：相似度计算复用，减少重复运算
