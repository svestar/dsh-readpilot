# 书库配置

- **ID：** FTR-001
- **名称：** 书库配置
- **状态：** active
- **代码：** `src/api.ts`（`configureLibrary`、`state`）；`src/library.ts`（`scanLibrary`、`bookIdFor`）
- **测试：** `tests/api.test.ts`；`tests/library.test.ts`

## 行为

用户可在阅读面板输入一个绝对目录，或通过目录选择器选择目录，然后点击“创建书库”。`configureLibrary` 校验路径、按需创建目录、把该目录注册为 DSH 工作区（已注册则复用），并将 `libraryDir` 与 `workspaceId` 写入 `$DSH_HOME/dsh-readpilot/settings.json`。书库列表在 Host 内缓存 30 秒，短时间内重复请求不再扫描目录；`rescan` 与重新配置书库会强制刷新。Host 提供 `fs` 服务时监听书库根目录的直接子项变化，变更事件立即失效扫描缓存；监听不可用或初始化失败时回退到 30 秒 TTL。配置完成后 `state` 递归扫描该目录（深度 3，最多 2000 个文件，文件元数据并发读取），返回书籍列表与阅读进度。识别 `.txt`、`.md`、`.markdown`、`.epub`、`.pdf`，四种格式均可读；EPUB/PDF 的解析分别由 FTR-006 与 FTR-007 负责。书籍 id 由绝对路径的 sha1 生成，文件修改不会改变 id，只让解析缓存失效。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `configureLibrary` | `src/api.ts:configureLibrary` | 校验路径、创建工作区、保存设置 |
| `state` | `src/api.ts:state` | 汇总设置、书籍、进度与会话映射 |
| `scanLibrary` | `src/library.ts:scanLibrary` | 递归扫描目录并过滤电子书 |
| `refreshLibraryWatch` | `src/api.ts:refreshLibraryWatch` | 监听书库根目录并在变更时失效扫描缓存 |
| `bookIdFor` | `src/library.ts:bookIdFor` | 由路径生成稳定书籍 id |

## 约束与失败行为

路径必须是绝对路径且为目录，否则返回 `invalid-path`。当前环境缺少 `workspaceRegistry` 时返回 `workspace-unavailable`，设置不会写入。扫描跳过隐藏目录、`node_modules`、`AGENTS.md`、空文件与无法读取的目录；同一路径重复配置复用已有工作区，不重复创建。书籍原地读取，不复制原文件。

## 验收与测试

- 正常路径：配置目录后返回非空 `workspaceId`，重复配置不再创建工作区（`configure_creates_workspace`）。
- 正常路径：书库根目录变更事件使缓存失效，下一次 `state` 扫描到新文件（`library_scan_watch_invalidates_cache`）。
