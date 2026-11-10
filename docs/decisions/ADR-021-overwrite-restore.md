# ADR-021：跨 PC 使用覆盖式备份恢复

- **状态：** accepted
- **日期：** 2026-11-10
- **范围：** FTR-046

## 背景

用户的批注、长笔记、预设、记忆和进度保存在 `$DSH_HOME/dsh-readpilot/` 与书库 `notes/` 中。换 PC 后，书库绝对路径、路径生成的 `bookId`、workspaceId 和伴读会话都会变化，直接复制数据目录会留下无法关联的记录。

合并恢复需要逐本解决批注、进度、标签和长笔记冲突，UI 与数据模型都复杂；用户更希望一键迁移到新机器。

## 决策

1. 备份只包含 ReadPilot 用户数据与 manifest，不包含原书、settings、workspace、会话、缓存或动作回执。
2. manifest 为每本书记录 `bookId`、`contentKey`、书名和格式；恢复用 `contentKey` 匹配目标书库。
3. 目标书库的 `bookId` 是权威 ID；备份数据按旧→新 ID 重映射后覆盖匹配书籍。
4. 不做合并或逐本冲突选择。匹配书籍整体覆盖；未匹配备份书籍跳过；目标中不在备份里的书保持现状。
5. 长笔记目录整体替换并改写 `.book.json` 与 frontmatter 的 bookId/sourcePath；短笔记、进度、元数据、记忆和伴读设置按书覆盖。
6. 不恢复 `settings.json`、workspaceId 与会话。恢复结束后用目标书库调用 `configureLibrary` 创建/绑定新工作区；目标当前已绑定的伴读会话保留，不导入或覆盖旧机器的会话。
7. 恢复前自动导出目标书库快照；应用失败时尽力回滚，错误中返回快照路径。备份文件保留在 `$DSH_HOME/dsh-readpilot/backups/`。

## 备选方案

- 合并恢复：可保留目标修改，但需要逐本选择、冲突规则和更复杂的结果报告，用户明确认为过重。
- 整体复制数据目录：实现最简单，但路径、bookId、workspaceId 都会失配。
- 恢复旧会话：sessionId 属于 DSH Conversation Factory，跨 Host 无效，且对话正文不在插件数据中。
- 在备份中包含原书：迁移更完整，但体积大、涉及版权与重复文件，当前不做。

## 后果

收益：跨 PC 只需书库目录 + 备份 zip；目标 bookId 自动重映射；操作只有一次确认；失败有快照兜底。

代价：匹配书籍的目标侧数据会被覆盖；未匹配数据不会自动导入；会话不迁移但目标当前绑定保留、工作区和缓存不迁移；备份 zip 与恢复快照占用磁盘；快照不自动清理；采样内容指纹与 manifest 版本成为恢复兼容边界。

验证：跨路径恢复（`backup_restore_overwrites_matched_book_on_another_path`）、未匹配跳过（`backup_restore_skips_books_missing_from_target_library`）、目标覆盖与快照回滚（`backup_restore_overwrites_target_data_and_snapshot_can_roll_back`）、预设/记忆/伴读设置迁移（`backup_restore_migrates_presets_memory_and_companion`）；真实 PC 间迁移仍需手动回归。
