# SceneDetect

场景检测模块，通过直方图差异和卡方检验识别场景变化，自动跳过无字幕帧。

---

## 概述

```typescript
import { SceneDetect } from '@/core'

const detector = new SceneDetect({
  threshold: 0.3,
})

const isSceneChange = detector.detect(prevFrame, currFrame)
```

---

## 原理

### 直方图差异

1. 将当前帧和上一帧分别转换为 HSV 色彩空间
2. 计算每个颜色通道的直方图（256 bins）
3. 比较直方图差异

### 卡方检验

使用卡方统计量衡量两个直方图的相似度：

```
χ² = Σ((A[i] - B[i])² / (A[i] + B[i] + ε))
```

其中 `ε` 是平滑项，避免除零。

### 阈值判断

- `χ² > triggerThreshold`：进入新场景
- `χ² < leaveThreshold`：离开当前场景
- 冷却期内不检测

---

## API

### 构造函数

```typescript
constructor(opts?: SceneDetectOptions)
```

### 方法

#### `detect(prev: ImageData, curr: ImageData): boolean`

检测两帧之间是否有场景变化。

**参数：**
- `prev`: 上一帧图像数据
- `curr`: 当前帧图像数据

**返回值：** `true` 表示有场景变化

#### `setThreshold(threshold: number): void`

设置场景检测阈值。

**参数：**
- `threshold`: 阈值（0-1），越大越不敏感

#### `reset(): void`

重置内部状态（冷却计数器、场景标志）。

---

## 配置项

| 参数 | 类型 | 默认值 | 说明 |
|:-----|:-----|:-------|:-----|
| `threshold` | `number` | `0.3` | 场景检测阈值（0-1） |

---

## 示例

```typescript
const detector = new SceneDetect({ threshold: 0.3 })

for (let i = 1; i < frames.length; i++) {
  if (detector.detect(frames[i - 1], frames[i])) {
    console.log(`Scene change at frame ${i}`)
  }
}
```

---

## 性能

- **时间复杂度**：O(w × h)，每帧像素遍历
- **优化**：步进采样（每 4 像素采一次），性能提升 16 倍
