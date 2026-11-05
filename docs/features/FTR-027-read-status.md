# 阅读状态与评分

- **ID：** FTR-027
- **名称：** 阅读状态与评分
- **状态：** active
- **代码：** `src/library-meta.ts`（`createLibraryMetaStore`、`normalizeReadStatus`、`normalizeRating`）；`src/api.ts`（`state`、`setBookStatus`、`setBookRating`）；`src/client/library-utils.ts`（`bookStatus`、`bookRating`、`categoryCounts`）；`src/client/views/library-view.ts`（`Library`、`BookCard`、`TagDialog`）
- **测试：** `tests/library-organization.test.ts`

## 行为

书卡与“书籍信息”弹窗维护每本书的阅读状态（想读 / 在读 / 已读完 / 未标记）与评分（1–5 星，可清除）。状态与评分按 `bookId` 存在 `library-meta.json`，与标签同一文件；书卡显示状态徽标和已选星级，弹窗点击状态按钮或星星即时切换，保存时写回。分类栏新增“已读完”，按状态筛选；未标记的书不计入。状态与进度相互独立：进度仍决定最近阅读、在读与未读分类，状态不会因为翻到最后一页自动改变。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createLibraryMetaStore` | `src/library-meta.ts:createLibraryMetaStore` | 读写 `library-meta.json` 的标签、状态与评分 |
| `normalizeReadStatus` | `src/library-meta.ts:normalizeReadStatus` | 校验状态取值，空值表示清除 |
| `normalizeRating` | `src/library-meta.ts:normalizeRating` | 校验 1–5 整数评分，空值表示清除 |
| `setBookStatus` | `src/api.ts:setBookStatus` | 校验书籍并写入状态，返回规整结果 |
| `setBookRating` | `src/api.ts:setBookRating` | 校验书籍并写入评分，返回规整结果 |
| `bookStatus` / `bookRating` | `src/client/library-utils.ts:bookStatus` | 从映射中取出合法状态与评分 |
| `Library` | `src/client/views/library-view.ts:Library` | 已读完分类、书卡徽标与信息弹窗 |

## 约束与失败行为

状态只能是 `want`、`reading`、`done` 或 `null`；评分只能是 1–5 的整数或 `null`；其它值由 API 以 `invalid-status` / `invalid-rating` 拒绝，不落盘。清除必须显式传 `null`，评分 `0` 视为非法而不是清除。状态文件与标签共用：文件损坏或条目非法时对应映射回退为空，不影响标签、书库与其它书。书库路径变化、文件改名或移动会改变 `bookId`，旧状态与评分不会自动跟随。状态不参与排序，也不影响最近阅读时间。

## 验收与测试

- 正常路径：状态与评分写入、读取与清空后文件同步更新（`library_meta_status_and_rating`）。
- 边界/失败：非法状态与非法评分被拒绝，空值表示清除（`status_and_rating_validation`）。
- 正常路径：已读完分类筛选与计数，未标记的书不计入（`library_status_filter_and_counts`）。
