# 阅读设置

- **ID：** FTR-032
- **名称：** 阅读设置
- **状态：** active
- **代码：** `src/client/reader-settings.ts`（`ReaderSettings`）；`src/client/paging.ts`（`readerCapabilities`）；`src/client/views/header.ts`（`Header`）；`src/client/views/reader-bar.ts`（`ReaderBar`）；`src/client/plugin.ts`（`ReaderPanel`）；`src/client/settings/reader-preferences.ts`（`readReflowBooks`、`readFontSize`）
- **测试：** `tests/paging.test.ts`

## 行为

阅读界面顶栏只保留“Aa 阅读设置”、搜索、伴读、书签和目录；原版/重排、滚动/分页、单页/双页、字号、主题与毛玻璃全部收进“Aa”面板。面板按格式与当前内容模式显示可用项，不可用项禁用并在下方说明原因，例如“PDF 重排暂只支持单页”。

内容模式只对 EPUB/PDF 显示，按书记忆：EPUB/PDF 默认原版，TXT/MD 固定重排。滚动/分页、单页/双页、字号与主题是全局偏好；字号保存在 `dsh-readpilot.font-size`，内容模式保存在 `dsh-readpilot.reflow-books`。阅读栏只显示翻页、标题、位置；PDF 原版额外显示页码输入与缩放。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `ReaderSettings` | `src/client/reader-settings.ts:ReaderSettings` | 渲染阅读设置面板与关闭交互 |
| `readerCapabilities` | `src/client/paging.ts:readerCapabilities` | 按格式与内容模式给出可用项 |
| `Header` | `src/client/views/header.ts:Header` | 只保留导航动作与“Aa”入口 |
| `ReaderBar` | `src/client/views/reader-bar.ts:ReaderBar` | 翻页、位置与 PDF 页码/缩放 |
| `readReflowBooks` / `saveReflowBooks` | `src/client/settings/reader-preferences.ts:readReflowBooks` | 按书读写原版/重排偏好 |
| `readFontSize` / `saveFontSize` | `src/client/settings/reader-preferences.ts:readFontSize` | 全局字号偏好与夹取 |

## 约束与失败行为

只考虑桌面端，不做移动端抽屉。内容模式只对 EPUB/PDF 生效；TXT/MD 始终重排。PDF 重排固定单页，双页按钮禁用；PDF 原版不提供字号，缩放只在 PDF 原版显示；EPUB 原版不提供字号。面板固定在视口右上，背景点击或 Esc 关闭；无效存储值回退默认（字号 17、内容模式未记录时按格式默认）。切换内容模式、阅读方式、版式或字号时，先按当前位置生成锚点，重建后恢复；具体锚点规则见 FTR-033。

## 验收与测试

- 正常路径：格式与内容模式的能力矩阵正确，PDF 重排禁用双页与缩放、隐藏字号（`reader_capabilities_matrix`）。
- 正常路径：字号夹取到 14–24，按书记忆的原版/重排可读写并过滤非法 bookId（`font_size_and_reflow_books_persist`）。
