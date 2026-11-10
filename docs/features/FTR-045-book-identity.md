# 书籍身份与迁移

- **ID：** FTR-045
- **名称：** 书籍身份与迁移
- **状态：** active
- **代码：** `src/library.ts`（`contentKeyFor`、`scanLibrary`、`Book`）；`src/library-index.ts`（`reconcileBooks`、`deleteLibraryRecord`）；`src/api.ts`（`libraryBooks`、`deleteDuplicate`）；`src/client/views/library-view.ts`（`DuplicateDialog`、`Library`）；`src/client/plugin.ts`（`deleteDuplicate`）
- **测试：** `tests/library-index.test.ts`；`tests/api.test.ts`

## 行为

书库扫描为每本书计算 `contentKey`：文件大小 + 首尾各 64 KiB 的 SHA-256；小文件读取全文。`bookId` 仍由文件路径生成，已有 0.3 数据的批注、进度、会话无须迁移。

`$DSH_HOME/dsh-readpilot/library-index.json` 保存 `bookId`、`contentKey`、路径、标题、格式、大小与修改时间。扫描时优先按路径复用记录；路径不存在但 `contentKey` 命中旧记录时，视为改名或移动，复用旧 `bookId` 并更新路径，因此批注、进度、长笔记和记忆继续关联同一本书。同一路径内容变化时保留 `bookId`，只更新 `contentKey`。

同内容出现在多个路径时不自动合并：先扫描到的记录作为主记录，其余标记 `duplicateOf`；有副本时书库头部“处理副本”按钮出现，处理弹窗列出该组全部文件。用户选择其中一个文件删除：

- 删除副本：从磁盘删除该副本文件并移除其索引记录，主记录保留；
- 删除主记录：若剩余副本没有用户数据，把它提升为主记录并沿用原 `bookId`，保留原批注/进度；剩余副本已有数据时拒绝；
- 任何删除都需在弹窗中二次确认；文件永久删除，不进入回收站；
- 被删除记录已有批注、进度、会话、标签、评分或长笔记时拒绝删除，避免静默丢失数据。

索引缺失或损坏时从空索引重建，首次扫描为每本书使用路径 `bookId`；读取内容失败的书跳过，不阻塞其余扫描。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `contentKeyFor` | `src/library.ts:contentKeyFor` | 采样首尾块并计算内容指纹 |
| `scanLibrary` | `src/library.ts:scanLibrary` | 扫描文件、生成内容指纹与路径 ID |
| `reconcileBooks` | `src/library-index.ts:reconcileBooks` | 复用/分配 bookId，标记重复副本 |
| `deleteDuplicate` | `src/api.ts:deleteDuplicate` | 删除所选文件；主记录删除时提升剩余副本 |
| `deleteLibraryRecord` | `src/library-index.ts:deleteLibraryRecord` | 删除索引中的书籍记录 |
| `DuplicateDialog` | `src/client/views/library-view.ts:DuplicateDialog` | 展示同组文件、二次确认与删除动作 |
| `Library` | `src/client/views/library-view.ts:Library` | 副本提示、徽标与弹窗入口 |

## 约束与失败行为

内容指纹只用于识别同一文件内容，不读取书籍元数据、ISBN 或作者；首尾采样存在理论碰撞，但不会用于安全校验。删除只允许书库目录内的真实文件，路径越界返回 `invalid-path`；被删除书有批注、进度、会话、标签、评分或长笔记时返回 `duplicate-has-data`；非副本返回 `not-duplicate`。主记录删除后由剩余副本继承原 `bookId` 和原批注/进度，不迁移剩余副本自身的数据（有数据时已拒绝）。索引记录不随文件删除而立即清理，文件重新出现且内容相同时可复用原 `bookId`。

## 验收与测试

- 正常路径：首尾采样只依赖内容、不依赖路径，内容变化后指纹变化（`content_key_ignores_path_and_changes_with_content`）。
- 正常路径：文件改名后复用同一 bookId，批注仍可读取（`rename_reuses_book_id`、`rename_preserves_book_id_and_notes`）。
- 正常路径：同内容副本被标记（`duplicate_content_is_marked`）。
- 正常路径：删除副本后主记录保留，文件从磁盘移除（`duplicate_copy_can_be_deleted`）。
- 正常路径：删除主记录时剩余副本继承原 bookId，原批注仍可读取（`delete_primary_promotes_copy_and_keeps_notes`）。
- 边界：副本已有用户数据时拒绝删除（`duplicate_with_user_data_cannot_delete`）。
- 边界：索引 JSON 损坏时从空索引重建（`corrupt_index_rebuilds_empty`）。
