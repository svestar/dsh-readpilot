# ADR-016：重排模式

- **状态：** accepted
- **日期：** 2026-11-06

## 背景

EPUB 的 iframe 与 PDF 的页面位图保真，但不能跨格式统一字号、行宽、分页与主题。新增可选的“重排模式”，与“原版模式”并存；原版渲染不改。

## 决策

1. 重排是**第二种渲染器**，不替换原版。用户按书切换，选择持久化。
2. 内容统一为**章节级 XHTML**，放进 sandbox iframe，用 CSS 多列排版；分页、字号、行宽由阅读器控制，不采用出版社 CSS。
3. **源锚点**是唯一位置真相：EPUB 用 CFI；PDF 用 `page + rect`；TXT/MD 用 `chapter + block + offset`。重排块带源锚点属性，原版与重排按锚点互跳。
4. PDF 重排是**结构推断**，不保证版面：先做单栏正文，表格/图片按置信度决定是否保留；低置信度提示切回原版。
5. 重排只用浏览器能力，不自研排版引擎。

## 管线

- **EPUB**：spine → 清洗 XHTML → 重写图片/字体到资产端点 → 保留 CFI
- **PDF**：pdf.js 文本层 → 行聚类 → 分栏切分（XY-cut）→ 段落合并 → 标题识别 → 可选图片裁剪 → 每页/每组页一节 XHTML
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

客户端由 `useReflow` 管理 iframe、分页与锚点换算；`readingMode` 与书 id 一起保存。

## 验证

用现有解析器生成 XHTML，Chromium headless 渲染，页面 648×648、18px/1.8：

- EPUB《Alice》（Gutenberg，189 KB）：14 章、144,274 字 → 144 页；跳到第 300 个块落在第 66 页。
- PDF《TLCL》（1.6 MB 中文）：505 个页章节、392,527 字 → 657 页；跳到第 2,000 个块落在第 305 页。

发现的问题：EPUB 解析丢失行内空格（`Alice’ s`）；PDF 的目录点线、页眉页脚、代码与表格都会退化成普通段落，页数也被页标题撑大。PDF 必须先做结构识别，否则只能算“可读”，不算“好读”。

## 后果

- 收益：一套排版、一套主题、一套分页；原版随时可切回。
- 代价：PDF 质量依赖结构推断，需要置信度与回退；iframe 内的选区、高亮、链接要父页面代理；清洗会丢复杂出版社样式。

## 备选

- 全部拆成 DOM 块：出版社 CSS 会污染布局，分页不稳。
- 整本单流一次排版：实现简单，但长书打开慢、内存高。
- 只做 PDF 重排：无法达成跨格式一致。
