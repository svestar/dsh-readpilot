# 阅读技能

- **ID：** FTR-060
- **名称：** 阅读技能
- **状态：** active
- **代码：** `src/host/modules/prompt/skills.ts`（`WORKSPACE_SKILLS`、`workspaceSkillBody`）；`src/host/modules/library/user-skills.ts`（`ensureUserSkills`、`removeLegacyWorkspaceSkills`）；`src/host/modules/library/state.ts`（`createWorkspaceSync`）；`src/host/app.ts`（`CreateAppOptions`）；`index.ts`（`apply`）；`src/host/modules/prompt/catalog.ts`（`PROMPT_RULES`）
- **测试：** `tests/user-skills.test.ts`；`tests/prompt.test.ts`

## 行为

插件启动和状态同步时，在 `$DSH_HOME/skills/` 下维护 `dsh-readpilot-notes` 与 `dsh-readpilot-memory`。DSH 从用户级 `skills` 目录发现 `SKILL.md`，把名称与描述放入 skill catalog，按需加载正文；普通工作区与书库工作区都能看到，不再只写书库 `.dsh/skills`。没有配置书库时启动同步也会写入技能。

技能文件包含稳定的 `name` / `description` frontmatter 和由 `dsh-readpilot:skill` 标记包裹的正文。文件缺失时创建；已有标记时按当前语言替换正文，并在 frontmatter 缺失或损坏时补回 `name` / `description`；没有标记的同名文件视为用户所有，不覆盖。语言切换只改正文，frontmatter 内容保持一致。书库工作区里旧版本留下的管理技能会在状态同步时删除，但保留无标记的用户文件。

`AGENTS.md` 不再包含笔记与记忆细则：短批注/长笔记选择、草稿应用、状态回报、记忆开关与压缩写回全部由对应技能承载。技能是用户级、按需加载，不替代每轮常驻的引用和写入边界；默认不剧透属于 FTR-059 的默认角色卡风格。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `WORKSPACE_SKILLS` | `src/host/modules/prompt/skills.ts:WORKSPACE_SKILLS` | 技能名称、描述与中英文正文 |
| `workspaceSkillBody` | `src/host/modules/prompt/skills.ts:workspaceSkillBody` | 按工作区语言选择正文 |
| `ensureUserSkills` | `src/host/modules/library/user-skills.ts:ensureUserSkills` | 创建、替换、补全或保留 `$DSH_HOME/skills` 下的 SKILL.md |
| `removeLegacyWorkspaceSkills` | `src/host/modules/library/user-skills.ts:removeLegacyWorkspaceSkills` | 删除书库工作区旧版本留下的管理技能 |
| `createWorkspaceSync` | `src/host/modules/library/state.ts:createWorkspaceSync` | 状态加载时同步 AGENTS 与用户级技能 |
| `CreateAppOptions` | `src/host/app.ts:CreateAppOptions` | 接收 `userSkillsDir` 并传给书库模块 |

## 约束与失败行为

技能在用户级目录，对所有工作区可见；正文仍要求先确定书籍，没有当前书时先让用户打开或指定书。目录不可写时同步失败，`ReaderState.promptSync` 返回错误，书库页面仍可用。已打开的会话不保证立即重载 catalog，新建会话可见。插件只写 `dsh-readpilot-` 前缀目录，不删除同名用户文件，也不在停用时清理技能。技能不写书籍数据，不改变 RPC、工具 schema 或权限。

## 验收与测试

- 正常路径：首次同步生成两个技能，带 frontmatter、管理标记和对应流程（`user_skills_created_with_frontmatter`）。
- 正常路径：删除技能后下一次状态加载会重建（`user_skills_repair_deleted_on_state`）。
- 边界：frontmatter 被删但标记仍在时补回 name/description（`user_skills_repair_missing_frontmatter`）。
- 正常路径：切换语言后正文切换，frontmatter 不变（`user_skills_follow_language`）。
- 边界：用户所有或无标记的同名技能不被覆盖（`user_skills_preserve_user_owned_file`）。
- 正常路径：旧版本书库工作区的管理技能被删除，无标记文件保留（`legacy_workspace_skills_removed`、`legacy_workspace_user_file_preserved`）。
- 正常路径：没有书库时启动同步仍写入用户级技能（`user_skills_sync_without_library`）。
- 正常路径：AGENTS 不再包含笔记/记忆细则，也不引用技能名（`reading_prompt_defers_notes_and_memory_to_skills`）。
