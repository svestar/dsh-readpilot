# 工作区技能

- **ID：** FTR-060
- **名称：** 工作区技能
- **状态：** active
- **代码：** `src/host/modules/prompt/skills.ts`（`WORKSPACE_SKILLS`、`workspaceSkillBody`）；`src/host/modules/library/workspace-skills.ts`（`ensureWorkspaceSkills`）；`src/host/modules/library/state.ts`（`createWorkspaceSync`）；`src/host/modules/prompt/catalog.ts`（`PROMPT_RULES`）
- **测试：** `tests/workspace-skills.test.ts`；`tests/prompt.test.ts`

## 行为

书库状态同步时，在 `<library>/.dsh/skills/` 下维护 `dsh-readpilot-notes` 与 `dsh-readpilot-memory` 两个插件技能。DSH 从项目 `.dsh/skills` 发现 `SKILL.md`，把名称与描述放入 skill catalog，按需加载正文；插件不依赖宿主注册 skill 的私有接口。

技能文件包含稳定的 `name` / `description` frontmatter 和由 `dsh-readpilot:skill` 标记包裹的正文。文件缺失时创建；已有标记时按当前 `settings.workspaceLanguage` 替换正文，并在 frontmatter 缺失或损坏时补回 `name` / `description`；没有标记的同名文件视为用户所有，不覆盖。语言切换只改正文，frontmatter 内容保持一致。

`AGENTS.md` 不再包含笔记与记忆细则：短批注/长笔记选择、草稿应用、状态回报、记忆开关与压缩写回全部由对应技能承载。技能是工作区级、按需加载，不替代每轮常驻的引用和写入边界；默认不剧透属于 FTR-059 的默认角色卡风格。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `WORKSPACE_SKILLS` | `src/host/modules/prompt/skills.ts:WORKSPACE_SKILLS` | 技能名称、描述与中英文正文 |
| `workspaceSkillBody` | `src/host/modules/prompt/skills.ts:workspaceSkillBody` | 按工作区语言选择正文 |
| `ensureWorkspaceSkills` | `src/host/modules/library/workspace-skills.ts:ensureWorkspaceSkills` | 创建、替换或保留 `.dsh/skills` 下的 SKILL.md |
| `createWorkspaceSync` | `src/host/modules/library/state.ts:createWorkspaceSync` | 状态加载时同步 AGENTS 与技能 |

## 约束与失败行为

没有绑定书本的会话仍能看到工作区技能目录，但技能正文要求先确定书籍；没有当前书时先让用户打开或指定书。书库目录不可写时同步失败，`ReaderState.promptSync` 返回错误，书库页面仍可用。已打开的会话不保证立即重载 catalog，新建会话可见。技能不写书籍数据，不改变 RPC、工具 schema 或权限。

## 验收与测试

- 正常路径：首次同步生成两个技能，带 frontmatter、管理标记和对应流程（`workspace_skills_created_with_frontmatter`）。
- 正常路径：删除技能后下一次状态加载会重建（`workspace_skills_repair_deleted_on_state`）。
- 边界：frontmatter 被删但标记仍在时补回 name/description（`workspace_skills_repair_missing_frontmatter`）。
- 正常路径：切换书库语言后正文切换，frontmatter 不变（`workspace_skills_follow_language`）。
- 边界：用户所有或无标记的同名技能不被覆盖（`workspace_skills_preserve_user_owned_file`）。
- 正常路径：AGENTS 不再包含笔记/记忆细则，也不引用技能名（`reading_prompt_defers_notes_and_memory_to_skills`）。
