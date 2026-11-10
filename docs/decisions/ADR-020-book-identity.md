# ADR-020：书籍身份使用内容指纹与持久索引

- **状态：** accepted
- **日期：** 2026-11-10
- **范围：** FTR-045

## 背景

`bookId` 由文件路径的 SHA-1 生成，路径一变，批注、进度、会话、长笔记和记忆就和新书记录对不上。直接改用内容哈希作为主 ID 会要求迁移 0.3 已有数据，风险高；不做迁移又会在用户移动书库时丢关联。

## 决策

1. 保留现有路径生成的 `bookId`，新增内容指纹 `contentKey`：文件大小 + 首尾 64 KiB 的 SHA-256，小文件读取全文。
2. 在 `$DSH_HOME/dsh-readpilot/library-index.json` 持久化 `bookId`、`contentKey`、路径与文件元数据。
3. 扫描时优先按路径匹配；旧路径不存在但 `contentKey` 命中时复用旧 `bookId`，把路径更新为新位置。
4. 同一路径内容变化保留 `bookId`，只更新 `contentKey`；内容相同、路径不同的文件标记 `duplicateOf`，不自动合并。
5. 副本由用户选择要删除的文件，删除前必须二次确认；删除副本会移除文件与索引，删除主记录时若剩余副本没有批注、进度、会话、标签、评分或长笔记，则把剩余副本提升为主记录并沿用原 `bookId`；有数据时拒绝删除。
6. 索引缺失或损坏时从空索引重建；读取内容失败的文件跳过，不阻塞其余书库。

## 备选方案

- 用内容哈希直接作为 `bookId`：改名后可复用，但需要迁移所有既有数据，并与 0.3 数据不兼容。
- 用书名/作者作为身份：无需读取文件，但同名书、合集和多版本会产生歧义。
- 自动合并同内容副本：实现简单，但会把用户明确保留的两份书悄悄合成一份，且副本数据归属不明确。
- 不做索引、每次扫描重建：无法在移动后复用旧 ID，批注仍会丢。

## 后果

收益：改名、移动目录后保留批注/进度/长笔记关联；同内容副本可见且不丢文件；0.3 已有 `bookId` 不变。

代价：每次扫描需读取每个文件首尾块；首尾采样存在理论碰撞；索引需要持久化和清理策略；删除是不可恢复的磁盘操作；删除主记录时只提升无数据的副本，副本自身数据不迁移；同路径被替换为新内容时仍沿用旧 `bookId`，可能被误认为同一本书。

验证：内容指纹、改名复用、副本删除、主记录删除后的 ID 提升、副本有数据拒绝删除（`content_key_ignores_path_and_changes_with_content`、`rename_reuses_book_id`、`duplicate_content_is_marked`、`rename_preserves_book_id_and_notes`、`duplicate_copy_can_be_deleted`、`delete_primary_promotes_copy_and_keeps_notes`、`duplicate_with_user_data_cannot_delete`）；真实文件移动与 UI 弹窗仍需手动回归。
