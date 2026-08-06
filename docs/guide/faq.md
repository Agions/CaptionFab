# 常见问题

本文档收集了 Distill 使用中的常见问题和解决方案。

---

## 安装问题

### Q: 下载的安装包无法运行

**A:** 请尝试以下步骤：
1. 确认操作系统版本符合要求（Windows 10+ / macOS 11+ / Ubuntu 20.04+）
2. Windows 用户：右键安装包 → 「以管理员身份运行」
3. macOS 用户：系统偏好设置 → 安全性与隐私 → 仍要打开

### Q: 开发环境启动失败

**A:** 检查依赖：
```bash
node --version    # >= 18
npm --version     # >= 9
rustc --version   # >= 1.82
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

### Q: OCR 识别准确率低

**A:** 优化建议：
1. **精确调整 ROI**：使用 8 点手柄拉伸字幕框，排除画面噪声
2. **切换云端 API 模式**：在设置中配置 Gemini 或 OpenAI Vision API Key 获取最高准确率
3. **在离线模式下调节模式**：适配多语言包识别

---

## 密钥与安全

### Q: API Key 存储安全吗？

**A:** 非常安全。API Key 通过 AES/Base64 本地加密保存在用户的 LocalStorage 中，且仅在调用云端 OCR 模式识别视频帧时通过 HTTPS 发送，不经过第三方中间服务器。随时可在设置中点击“抹除所有密钥”一键彻底清除。

---

## 获取帮助

- [GitHub Issues](https://github.com/Agions/Distill/issues)
- [GitHub Discussions](https://github.com/Agions/Distill/discussions)
