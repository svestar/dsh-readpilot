# ADR-016：重排模式

- **状态：** accepted
- **日期：** 2026-11-06

## 背景

EPUB 的 iframe 与 PDF 的页面位图保真，但不能跨格式统一字号、行宽、分页与主题。新增可选的“重排模式”，与“原版模式”并存；原版渲染不改。

## 决策

1. 重排是**第二种渲染器**，不替换原版。用户按书切换，选择持久化。
2. 重排统一为**章节块 + 原生分页渲染器**，EPUB、PDF、TXT、MD 共用同一套外观、字号、行宽、目录与笔记入口。原版 EPUB 仍用 sandbox iframe，原版 PDF 仍用页面位图；重排不使用 iframe。
3. 重排位置以 `chapter + block + offset` 为锚点；原版 EPUB 的 CFI 与 PDF 的 `page + rect` 暂不与重排互映，切换模式回到章节首屏。
4. PDF 重排是**结构推断**，不保证版面：先做单栏正文，表格/图片按置信度决定是否保留；低置信度提示切回原版。
5. 重排只用浏览器能力，不自研排版引擎。

## 管线

- **EPUB**：`parseEpub` 抽出标题/段落/列表/引用/代码块（图片与出版社样式暂不进入重排）
- **PDF**：pdf.js 文本层 → 行聚类 → 页码/页眉页脚过滤 → 双栏重排 → 段落合并 → 标题与代码识别 → 块模型（图片与表格暂不保留）
- **TXT/MD**：现有块模型直接生成 XHTML

## 接口草案

```ts
type ReflowAnchor =
  | { kind: 'cfi'; cfi: string }
  | { kind: 'pdf'; page: number; rect: [number, number, number, number] }
  | { kind: 'text'; chapterId: string; block: number; offset: number }

interface ReflowChapter {
  id: string
  title: string
  html: string
  text: string
  anchor: ReflowAnchor
  confidence?: number
}

interface ReflowDocument {
  bookId: string
  format: 'epub' | 'pdf' | 'md' | 'txt'
  title: string
  chapters: ReflowChapter[]
  assetsBase: string | null
}

// Host RPC
reflowDoc({ bookId }) => ReflowDocument
reflowChapter({ bookId, id }) => ReflowChapter
reflowAsset({ bookId, path }) => binary
reflowLocate({ bookId, anchor }) => { chapterId, block, offset }
```

客户端由 `toggleReflow` 切换：重排时视觉状态为 `null`，交给文本渲染器；`readingMode` 与书 id 一起保存。

## 验证

用现有解析器生成 XHTML，Chromium headless 渲染，页面 648×648、18px/1.8：

- EPUB《Alice》（Gutenberg，189 KB）：14 章、144,274 字 → 144 页；跳到第 300 个块落在第 66 页。
- PDF《TLCL》（1.6 MB 中文）：505 个页章节、392,527 字 → 657 页；跳到第 2,000 个块落在第 305 页。

发现的问题：EPUB 解析丢失行内空格（`Alice’ s`）；PDF 的目录点线、页眉页脚、代码与表格都会退化成普通段落，页数也被页标题撑大。PDF 必须先做结构识别，否则只能算“可读”，不算“好读”。

## 后果

- 收益：一套排版、一套主题、一套分页；原版随时可切回。
- 代价：PDF 质量依赖结构推断，需要置信度与回退；EPUB 重排会丢图片与复杂出版社版式；尚未实现原版与重排的字符级互跳。

## 备选

- 全部拆成 DOM 块：出版社 CSS 会污染布局，分页不稳。
- 整本单流一次排版：实现简单，但长书打开慢、内存高。
- 只做 PDF 重排：无法达成跨格式一致。
