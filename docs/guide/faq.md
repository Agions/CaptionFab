# 常见问题

本文档收集了 CaptionFab 使用中的常见问题和解决方案。

---

## 安装问题

### Q: 下载的安装包无法运行

**A:** 请尝试以下步骤：
1. 确认操作系统版本符合要求（Windows 10+ / macOS 11+ / Ubuntu 20.04+）
2. Windows 用户：右键安装包 → 「以管理员身份运行」
3. macOS 用户：系统偏好设置 → 安全性与隐私 → 仍要打开
4. Linux 用户：确保已安装 `libwebkit2gtk-4.1`

### Q: 开发环境启动失败

**A:** 检查依赖：
```bash
node --version    # >= 18
pnpm --version    # >= 9
rustc --version   # >= 1.82
ffmpeg -version   # >= 6
```

### Q: pnpm install 很慢

**A:** 配置镜像源：
```bash
pnpm config set registry https://registry.npmmirror.com
```

---

## 使用问题

### Q: 视频导入失败

**A:** 可能原因：
1. 视频格式不支持 — 请使用 MP4/MKV/AVI/MOV/WebM/M4V/WMV/FLV/3GP
2. 视频文件损坏 — 尝试用 FFmpeg 转码：
   ```bash
   ffmpeg -i input.mkv -c copy output.mp4
   ```
3. 文件路径包含特殊字符 — 移动到简单路径如 `/tmp/test.mp4`

### Q: OCR 识别准确率低

**A:** 优化建议：
1. **精确调整 ROI**：只包含字幕区域，排除干扰
2. **选择合适引擎**：中文用 PaddleOCR，英文可尝试 EasyOCR
3. **调整处理模式**：使用标准模式或精准模式
4. **启用后处理**：开启 Pipeline 去噪和合并
5. **提高置信度阈值**：过滤低质量结果

### Q: 导出字幕时间轴不对

**A:** 检查：
1. 视频帧率是否准确（查看视频属性）
2. 导出时是否正确指定帧率
3. 视频是否有可变帧率（VFR）— 转换为 CFR 后重试

### Q: 批量处理卡住

**A:** 可能原因：
1. 并发数过高 — 降低并发槽位（默认 2）
2. 内存不足 — 关闭其他应用释放内存
3. OCR 引擎初始化失败 — 查看日志排查

---

## 性能问题

### Q: 提取速度慢

**A:** 优化方案：
1. **启用场景检测**：自动跳过无字幕帧，减少 60% 无效 OCR
2. **使用快速模式**：跳帧处理，牺牲少量准确率换取速度
3. **缩小 ROI**：减少处理像素数量
4. **关闭多通道 OCR**：单次识别代替多次合并
5. **启用 GPU 加速**：PaddleOCR + CUDA / Metal

### Q: 内存占用高

**A:** 优化方案：
1. 降低并发数
2. 关闭其他应用
3. 分批处理大视频（分段提取）

---

## 技术问题

### Q: Rust 编译报错

**A:** 常见解决方案：
```bash
# 清理并重新编译
cd src-tauri
cargo clean
cd ..
pnpm tauri dev
```

### Q: Tauri 应用闪退

**A:** 查看日志：
- Windows: `%APPDATA%\CaptionFab\logs`
- macOS: `~/Library/Logs/CaptionFab`
- Linux: `~/.local/share/CaptionFab/logs`

### Q: 如何查看调试日志

**A:** 开发模式下，前端日志输出到终端控制台。Rust 日志可通过 `RUST_LOG=debug` 环境变量启用：
```bash
RUST_LOG=debug pnpm tauri dev
```

---

## 其他问题

### Q: 如何导出双语字幕？

**A:** 目前不支持自动翻译。建议：
1. 先导出原文字幕
2. 使用翻译工具（如 DeepL）翻译
3. 手动合并为双语格式

### Q: 支持哪些字幕样式？

**A:** CaptionFab 导出纯文本字幕。如需样式字幕（ASS/SSA），可在导出后使用 Aegisub 等工具添加样式。

### Q: 如何贡献代码？

**A:** 阅读 [开发者指南](/developer-guide)，提交 Pull Request。

---

## 获取帮助

- [GitHub Issues](https://github.com/Agions/CaptionFab/issues)
- [GitHub Discussions](https://github.com/Agions/CaptionFab/discussions)
