# 侧栏批注定位

- **ID：** FTR-055
- **名称：** 侧栏批注定位
- **状态：** active
- **代码：** `src/client/modules/sidebar/navigation.ts`（`consumePendingBlock`）；`src/client/modules/sidebar/use-sidebar-reader.ts`（`useSidebarReader`）；`src/client/modules/sidebar/use-sidebar-resource.ts`（`useSidebarResource`）；`src/client/modules/reader/use-text-pager.ts`（`useTextPager`）
- **测试：** `tests/sidebar-reader.test.ts`

## 行为

侧栏文字模式从批注或资源打开时，如果带 `blockIndex`/`blockOffset`，先按章节比例建立临时锚点；目标块渲染后读取该块渲染文本长度，把块内偏移换算成块内比例并调用 `goToBlock`。

目标块尚未出现时保留待跳转状态，下次渲染重试；切换章节、切到原版或加载失败时清除。目标块存在但偏移越界时回到块首；块索引无效（目标块不存在）时不强制跳转，保留待跳转状态。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `consumePendingBlock` | `src/client/modules/sidebar/navigation.ts:consumePendingBlock` | 渲染后查询目标块并按渲染文本比例跳转 |
| `useSidebarReader` | `src/client/modules/sidebar/use-sidebar-reader.ts:useSidebarReader` | 渲染后消费待跳转块 |
| `useSidebarResource` | `src/client/modules/sidebar/use-sidebar-resource.ts:useSidebarResource` | 记录待跳转块与临时锚点 |
| `useTextPager` | `src/client/modules/reader/use-text-pager.ts:useTextPager` | 按块与块内比例定位 |

## 约束与失败行为

目标块不存在时不跳转，也不清除待跳转状态；待跳转只对写入时的章节 id 生效。切到原版立即清除。块文本长度为 0 时比例为 0。跳转失败不阻断阅读器。

## 验收与测试

- 正常：待跳转块渲染后按块文本比例定位（`sidebar_pending_block_jumps_with_rendered_text_fraction`）。
- 边界：块未出现时等待，不调用 `goToBlock`（`sidebar_pending_block_waits_until_the_block_exists`）。
