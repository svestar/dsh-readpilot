# ADR-023：Markdown 使用共享扁平块解析器

- **状态：** accepted
- **日期：** 2026-11-13
- **范围：** FTR-050

## 背景

ReadPilot 的阅读正文以 `TextBlock[]` 和 `data-block-index` 做分页、搜索和批注锚点。原 Markdown 解析在 Host 与客户端各有一份，语法不全且容易漂移。DSH 自带的 `MarkdownText` 能渲染完整 Markdown，但它面向整段文本，不暴露块级 AST 或源码偏移，直接替换会破坏批注锚点和分页。

## 决策

1. 新增 `src/markdown/blocks.ts`，Host 与客户端共用同一顶层块解析器。
2. 保留扁平 `TextBlock[]` 和 `data-block-index`；表格、列表、脚注各占一个块，嵌套列表用缩进展示，不引入嵌套 AST。
3. 支持表格、任务列表、有序/无序列表、setext/ATX 标题、多行引用、代码语言、脚注、删除线、自动链接和图片。
4. 相对行内图片在 Host 章节接口中重写为 `book-asset` URL；链接只允许安全协议，原始 HTML 按文本显示。
5. 不引入 DSH `MarkdownText` 作为阅读正文渲染器；聊天/长笔记也复用本地解析器，避免两套行为。
6. 表格/列表会改变块边界；旧批注优先按引文回退定位。

## 备选方案

- 直接使用 DSH `MarkdownText`：视觉最接近 DSH，但无法保留块索引、分页和批注锚点，暂不采用。
- 引入 markdown-it 与完整 AST：语法更完整，但需要额外的依赖、块映射和批注迁移，超出当前阶段。
- 保留两份解析器：改动少，但语法会继续漂移，维护成本高。

## 后果

收益：Host/客户端语法一致，阅读器仍能分页与定位；本地图片和链接有明确安全边界。

代价：嵌套列表不是嵌套 DOM；脚注是基础实现；原始 HTML 不执行；完整 CommonMark 边界、数学公式和 Mermaid 不在范围内。后续若需要完整 AST，需新增源码偏移映射并迁移旧批注。

验证：`tests/markdown.test.ts` 覆盖块解析与渲染；`tests/smoke.test.ts` 覆盖章节行内图片重写；全量测试与文档门禁通过。
