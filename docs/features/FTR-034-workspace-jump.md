# 工作区跳转

- **ID：** FTR-034
- **名称：** 工作区跳转
- **状态：** active
- **代码：** `src/client/views/header.ts`（`Header`）；`src/client/plugin.ts`（`openWorkspace`、`ReaderPanel`）；`src/client/hooks/use-companion.ts`（`ensureSession`）；`src/api.ts`（`sessionBook`）
- **测试：** `tests/api.test.ts`

## 行为

阅读页顶栏提供“工作区”按钮。点击时优先打开当前书已记录的伴读会话；没有会话时用当前工作区创建一个会话、写入书籍与会话映射，再打开该会话。创建或打开期间按钮禁用；失败时在阅读页显示错误，不跳转。已有会话被归档时按无会话处理。

打开使用 `runtime.uiWorkspace.openSession(sessionId)`，主区域切换到对应 Conversation，并退出全局面板。创建会话不会自动发送消息，也不要求伴读面板已打开。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `Header` | `src/client/views/header.ts:Header` | 渲染“工作区”按钮与忙碌状态 |
| `openWorkspace` | `src/client/plugin.ts:openWorkspace` | 确保会话存在并切换到工作区 |
| `ensureSession` | `src/client/hooks/use-companion.ts:ensureSession` | 复用或创建伴读会话并绑定 |
| `sessionBook` | `src/api.ts:sessionBook` | 由会话反查书籍，供侧边栏和跳转校验 |

## 约束与失败行为

自动创建要求工作区 id 已配置；没有工作区、创建失败或会话不可用时显示错误，不切换到空白会话。已有会话只复用，不重复创建。按钮只在书籍阅读页显示；书库与其他页面不显示。打开对话不会自动打开右侧栏阅读页，也不会自动发送提示词。

## 验收与测试

- 正常路径：会话到书籍的反向映射返回同一本书，未知会话返回空（`session_book_reverses_companion_mapping`）。
