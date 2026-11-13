# ADR-014：单一客户端合同表

- **状态：** accepted
- **日期：** 2026-11-06

## 背景

客户端到 Host 的调用原先在三处手工维护：`CallRpc` 重载、`ReaderApi` 接口、`handleRpc` 的字符串分发表。新增或更名接口时，只要漏改一处，TypeScript 未必报错（分发表是 `Record<string, ...>`），错误会推迟到运行期。

## 决策

`src/api/endpoint.ts` 定义唯一的 `Operations` 表：每个操作声明 `payload` 与 `result`。由此派生：

- `Operation`：全部操作名；
- `OperationPayload` / `OperationResult`：按操作取类型；
- `CallRpc`：泛型签名，客户端调用由操作名推导参数与返回值；
- `BaseEndpoint`：把 `notes.list` 这类操作名还原为 HTTP 端点 `notes`。

带动作的操作使用 `端点.动作` 命名（`notes.add`、`memory.setMode`）；客户端 `call` 自动把后缀作为 `action` 注入 payload，Host 仍按端点分发。`api.ts` 的分发表类型为 `Record<BaseEndpoint, Handler>`，漏实现端点会直接编译失败。

`src/api/rpc.ts` 只做 `export * from './contract.ts'`，已有导入路径不变。

## 后果

好处：新增端点只改 `contract.ts` 与分发表，客户端调用立即获得类型检查；漏实现端点无法通过编译。坏处：操作名与 HTTP 端点名分离，读代码时需要记住 `notes.list → notes` 的映射；带动作的调用点必须使用点号形式。

## 备选方案

- 继续维护重载：改动点仍是三处，问题未解决。
- 改为每个动作独立端点（`/notes/list`）：服务端路由变多，现有单入口审计优势丢失。
- 代码生成：从表生成客户端方法，但对 40 个操作而言收益低于维护成本。
