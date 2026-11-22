# 阅读页框与滚轮

- **ID：** FTR-054
- **名称：** 阅读页框与滚轮
- **状态：** active
- **代码：** `src/client/modules/reader/use-page-width.ts`（`usePageWidth`）；`src/client/modules/reader/paging.ts`（`pageWidthForHeight`、`alignedPageWidth`、`pageSpanWidth`）；`src/client/modules/reader/use-text-pager.ts`（`useTextPager`）；`src/client/styles/panel.ts`（`PANEL_STYLES`）；`src/client/styles/reader.ts`（`READER_STYLES`）
- **测试：** `tests/paging.test.ts`；`tests/client-assembly.test.ts`

## 行为

页宽按 A4 比例（210/297）从可用高度计算，再夹到可用宽度，取整后居中。主阅读文本左右 56px（窄屏 22），滚动列内 28px（窄屏 16）；侧栏页框按可用高度反推 A4 最大宽度，窄侧栏由可用宽度限制。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `usePageWidth` | `src/client/modules/reader/use-page-width.ts:usePageWidth` | 按容器尺寸计算 A4 页宽 |
| `pageWidthForHeight` / `alignedPageWidth` | `src/client/modules/reader/paging.ts:pageWidthForHeight`；`alignedPageWidth` | A4 宽高比与整像素宽度 |
| `pageSpanWidth` | `src/client/modules/reader/paging.ts:pageSpanWidth` | 单/双页页框宽度 |
| `useTextPager` | `src/client/modules/reader/use-text-pager.ts:useTextPager` | 页框滚轮与布局重测 |

## 约束与失败行为

可用宽高为 0 时页宽为 0，退回 CSS 宽度。高度不足时夹到可用宽度，不产生横向溢出；双页页框宽度为两页加栏间距。

页框内滚轮只在分页模式翻页，累计超过阈值才翻，忽略 Ctrl/Meta/Alt；修饰键滚轮不拦截，非分页模式不绑定；页框卸载重挂后重新绑定滚轮并重测布局，页框替换或侧栏切模式时清理旧监听。滚轮阈值、修饰键与重挂监听属于实现约束，依赖真实 DOM，暂无自动化测试锚点，需要客户端验收。

## 验收与测试

- 正常：页宽按 A4 比例与可用高度计算，超出可用宽度时夹取（`page_width_from_height`、`page_width_clamps_to_available_width`）。
- 正常：页宽取整到整像素（`page_width_aligns_to_whole_pixels`）。
- 正常：双页页框宽度包含栏间距（`page_span_double`）。
