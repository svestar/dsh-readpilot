# ADR-015：Host API 按域拆分

- **状态：** accepted
- **日期：** 2026-11-06

## 背景

`src/api.ts` 同时承担扫描、解析、缓存、笔记、长笔记、草稿、记忆、会话、工具与视觉渲染的编排，接近 1500 行。任何改动都在同一文件上叠加，review 与单测的影响面难以判断。

## 决策

把成块的域处理逻辑移到独立模块，模块通过显式依赖对象接收能力，不持有全局状态：

- `src/api-notes.ts`：短笔记 RPC（`createNotesHandlers`）；
- `src/api-drafts.ts`：长笔记草稿的 UI RPC 与工具创建（`createDraftHandlers`）；
- `src/api-memory.ts`：记忆的读取、写入、注入缓存与三处入口（`createMemoryHandlers`）；
- `src/reader-error.ts`：`ReaderError` 独立，避免模块与 `api.ts` 循环依赖。

`api.ts` 保留装配职责：创建 store、组合依赖、注册分发表，并继续对外暴露同一组方法。模块不直接读全局 `dataDir` 或可变的 `companionSettings`，而是通过 `getSettings` / `setSettings` / `loadSettings` / `saveSettings` 访问。

## 后果

`api.ts` 从约 1500 行降到约 1200 行，三块域可以独立阅读与测试；依赖关系显式化，新增域按同一模式接入。

代价：装配代码集中在一处，模块签名较长；记忆模块需要四个设置访问器才能保持原有热加载语义。长笔记文件存储仍留在 `api.ts`，下一轮可以按同样方式拆出。

## 备选方案

- 一次性拆成 services 层并引入容器：改动面过大，当前单进程插件收益不足。
- 只按行数拆文件、共享闭包变量：会形成隐性全局状态，比不拆更难维护。
