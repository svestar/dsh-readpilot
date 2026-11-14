# 备份与覆盖恢复

- **ID：** FTR-046
- **名称：** 备份与覆盖恢复
- **状态：** active
- **代码：** `src/host/modules/backup/index.ts`（`exportBackup`、`restoreBackup`）；`src/host/api.ts`（`backupExport`、`backupRestore`）；`src/client/modules/library/panels.ts`（`BackupPanel`、`Setup`）；`src/client/modules/library/use-library-actions.ts`（`backupExport`、`backupRestore`）
- **测试：** `tests/backup.test.ts`

## 行为

“导出备份”生成一个 zip，写入 `$DSH_HOME/dsh-readpilot/backups/`。备份 manifest 记录版本、创建时间与每本书的 `bookId`、`contentKey`、书名和格式；数据包含短批注、长笔记、提示词预设、记忆、阅读进度、标签/状态/评分与伴读设置。原书文件、`settings.json`、workspaceId、会话、缓存与动作回执不进入备份。

“覆盖恢复”选择备份 zip 和目标书库目录。恢复时扫描目标书库，用 `contentKey` 匹配备份书籍；目标书库的 `bookId` 作为权威 ID，把备份数据重映射过去。匹配到的书整体覆盖：

- 短批注 JSON 替换；
- 长笔记目录替换，frontmatter 与 `.book.json` 的 bookId/sourcePath 改写；
- 阅读进度、标签、状态、评分替换；
- 记忆卡与历史替换；
- 伴读设置中的笔记上下文、记忆开关与自动应用替换；
- 目标书库当前已绑定的伴读会话保留，不导入或覆盖旧机器的会话。

备份中有、目标书库中找不到的书籍跳过；目标书库中不在备份里的书保持现状。全局提示词、记忆 reader 卡和伴读全局开关按备份覆盖；备份没有 `presets.json` 时保留目标预设。

恢复前自动导出目标书库数据快照（`pre-restore-*.zip`）；应用失败时尝试用快照回滚，并在错误中返回快照路径。成功后调用现有 `configureLibrary` 把目标书库绑定到新工作区，不恢复旧 workspaceId。

设置页的“备份与恢复”提供导出、zip 路径、目标书库路径和两步确认；不提供逐本合并或冲突选择。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `exportBackup` | `src/host/modules/backup/index.ts:exportBackup` | 生成 manifest 与 zip，收集短笔记、长笔记、记忆和全局数据 |
| `restoreBackup` | `src/host/modules/backup/index.ts:restoreBackup` | 生成快照、匹配 contentKey、覆盖并尝试回滚 |
| `backupExport` | `src/host/api.ts:backupExport` | 读取当前书库并导出 |
| `backupRestore` | `src/host/api.ts:backupRestore` | 校验路径、扫描目标、恢复并重绑工作区 |
| `BackupPanel` | `src/client/modules/library/panels.ts:BackupPanel` | 导出/恢复入口和两步确认 |
| `backupExport` / `backupRestore` | `src/client/modules/library/use-library-actions.ts:backupExport` | 调用 RPC 并刷新快照 |

## 约束与失败行为

备份只接受绝对路径，恢复只写目标书库目录；zip 条目数、非法路径与 manifest 版本会被校验。恢复不会复制原书；未匹配的备份书籍数据跳过且备份原文件保留。目标书库匹配书籍的旧数据会被覆盖，未匹配书籍保持不变。恢复前快照不自动清理；失败回滚是尽力而为，回滚也失败时错误中保留快照路径。会话不进入备份；目标当前已绑定的伴读会话保留，未绑定时需要新建。

## 验收与测试

- 正常路径：跨路径恢复按 contentKey 匹配，目标 bookId 数据被正确改写（`backup_restore_overwrites_matched_book_on_another_path`）。
- 边界：目标书库缺少书籍时跳过并保留目标数据（`backup_restore_skips_books_missing_from_target_library`）。
- 正常路径：目标旧数据被覆盖，使用恢复前快照可以回滚批注、长笔记与进度（`backup_restore_overwrites_target_data_and_snapshot_can_roll_back`）。
- 正常路径：预设、记忆卡与伴读设置按目标 bookId 迁移（`backup_restore_migrates_presets_memory_and_companion`）。
