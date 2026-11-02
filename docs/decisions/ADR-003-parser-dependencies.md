# ADR-003：引入 EPUB/PDF 解析依赖

- **状态：** accepted
- **日期：** 2026-11-02
- **范围：** FTR-006、FTR-007、FTR-008

## 背景

阅读器目前只支持 txt/md，解析在 Host 端同步完成、零运行时依赖。EPUB 需要解压 ZIP、解析 OPF/NCX/XHTML；PDF 需要解析交叉引用、内容流与字体映射，再由文本项重建行。两者都不适合在无构建的 Client 端完成，也不适合手写最小实现。

## 决策

- Host 端新增运行时依赖：`jszip`（EPUB 解压）、`linkedom`（XHTML/OPF/NCX DOM）、`pdfjs-dist` legacy build（PDF 文本层）。`htmlparser2` 作为 linkedom 解析链的显式依赖一并声明。
- 新增 `parseBookAsync(buffer, format, filePath)` 作为统一入口：txt/md 继续走同步 `parseBook`，EPUB/PDF 通过动态 `import()` 加载对应解析器，避免影响未使用格式的启动。
- 解析仍只在 Host 端进行，结果写入现有书籍缓存；`PARSER_VERSION` 升到 2，旧缓存自动失效。
- EPUB 只提取文本块，不渲染原书 CSS/图片/字体；PDF 只提取文本层与页锚点，不做像素渲染与 OCR。
- 解析器共享现有 chapter/block 数据形状，Client 不需要感知格式差异。

## 备选方案

- 手写 ZIP/PDF 解析：ZIP 尚可，PDF 的 xref、FlateDecode、字体 CMap 与文本定位成本过高，放弃。
- 在浏览器用 pdf.js 渲染并抽取：会把大依赖放进 Client，且离线书籍仍要从 Host 读字节，边界更复杂，放弃。
- 使用 `unpdf` 等封装：仍以 pdfjs 为底层，额外抽象层没有收益，放弃。
- 调用外部 Python/CLI 解析：增加进程与部署依赖，且与插件生命周期不一致，放弃。

## 后果

收益：EPUB/PDF 与 txt/md 共用同一套章节、定位符、检索、笔记与伴读逻辑；解析失败可在 Host 侧给出明确错误。

代价：插件安装体积明显增加，PDF.js 首次加载有启动成本；PDF 文本顺序受双栏、连字、页眉页脚影响；升级依赖时需要复核解析结果与缓存版本。扫描版 PDF 明确不支持，需用户提供带文本层的文件。

验证：EPUB/PDF 的解析器单测、`parseBookAsync` 的格式分派、缓存版本升级，以及安装后实际打开两类书籍。
