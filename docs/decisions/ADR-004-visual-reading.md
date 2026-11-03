# ADR-004：页面视觉阅读采用 Host 光栅与 EPUB iframe

- **状态：** accepted
- **日期：** 2026-11-02
- **范围：** FTR-009、FTR-010

## 背景

现有阅读器只显示 Host 抽取的文本块。用户要求 PDF/EPUB 具备页面视觉阅读，并且视觉模式下仍能直接选择文字，不再区分“视觉/文本”模式。SumatraPDF 是原生 C++ + MuPDF 应用，无法直接嵌入 DSH Web GUI；当前插件又保持单文件 Client、无前端构建，因此需要选择一条能在现有架构内落地的渲染路径。

## 决策

1. **PDF 采用 Host 端 PDF.js 光栅化 + Client 透明文本层**。Host 用 `pdfjs-dist` 和 `@napi-rs/canvas` 把页面渲染为 PNG，同时从 `getTextContent()` 返回文本项坐标；Client 在图片上绝对定位透明 `<span>`，实现原生选择、搜索高亮与笔记高亮。页面 PNG 与文本项按 `bookId/page/scale` 缓存。
2. **EPUB 采用 Host 资源服务 + Client iframe**。Host 解压 EPUB 资源、清洗 XHTML（去脚本/事件属性）、把 CSS/图片/字体 URL 改写为 `/api/dsh-readpilot/epub-asset`，Client 用 `sandbox="allow-same-origin"` 的 iframe 渲染原书样式；父页面读取 iframe selection，搜索/笔记用章节 + quote 高亮。
3. **不设用户可见的“视觉/文本”切换**。PDF/EPUB 直接进入视觉阅读；txt/md 继续文本块渲染。Host 抽取文本仍供 `reader_*` 工具、检索索引与笔记定位使用。
4. **不引入 MuPDF WASM 或原生 SumatraPDF 调用**。只有后续确认必须达到 MuPDF 像素级/复杂 EPUB 重排时，再单独评估 AGPL 与包体成本。

## 备选方案

- Client 端 PDF.js 查看器：选择/缩放更原生，但需要新增前端构建、PDF.js worker 与约数 MB 包体；当前单文件 Client 架构不适合，暂缓。
- MuPDF WASM：最接近 SumatraPDF，但 AGPL、包体与集成成本高，且当前 PDF.js 已能满足普通文档。
- Host 调用 `SumatraPDF.exe`/`mutool`：无文本层、Windows 依赖、部署与许可风险，放弃。
- EPUB 转纯文本：无法保留原书 CSS/图片，违背用户要求。

## 后果

收益：PDF/EPUB 页面视觉与选段、搜索、笔记、伴读共用一套交互；无前端构建；文本抽取继续服务 AI。

代价：PDF 文本层与页面图像可能有 1–2px 偏差，CJK 字体度量需校准；EPUB iframe 需要资源鉴权、路径安全与 XHTML 清洗；页面 PNG 缓存增加磁盘占用；PDF 跨页选择、EPUB 分页和精确字符定位留待后续。

验证：PDF 页面 PNG/文本层单测，EPUB 资源与清洗单测，Client 手工验证翻页、缩放、选段、搜索/笔记高亮与 iframe 原书样式。
