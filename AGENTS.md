# 插件工程规则

## 事实归属

| 内容 | 唯一位置 |
|---|---|
| 工作原则、完成条件 | 本文件 |
| 功能清单与路径 | `docs/features/index.md` |
| 单个功能行为与边界 | `docs/features/FTR-NNN.md` |
| 未实现候选 | `docs/roadmap.md` |
| 跨功能取舍 | `docs/decisions/ADR-NNN-*.md` |
| 宿主/客户端 API 契约与易错点 | `dsh-plugin-host-apis` skill |
| 合并前检查 | `docs/quality-gates.md` |

## 工作原则

- 先读相关代码、宿主 API 和现有测试，再修改。
- 只做完成任务所需的最小改动；不加无需求的抽象、依赖或配置。
- 不静默改变 RPC、数据格式、工具 schema 或权限；先说明兼容性。
- 不留死代码、占位实现、吞异常或无解释的魔法值。
- 新功能按 `src/host/modules/<feature>` 与 `src/client/modules/<feature>` 落地；不继续向根 `index.ts`、`plugin.ts` 堆逻辑。
- 源码 300 行、测试 400 行是硬上限；超出时拆 feature，不提高 `scripts/check_sizes.py` 的上限。

## 文档义务

- 可独立验收的行为登记 FTR，并写清代码路径、入口符号、测试路径、输入输出和失败场景。
- 验收条目必须锚定真实测试符号；未实现候选只写 roadmap。
- 代码、测试、文档和索引同一变更更新；细则见 `dsh-plugin-quality` skill。

## 实施流程

1. 确认目标、边界和宿主版本。
2. 先写失败测试或最小复现，再改实现。
3. 注册资源必须放在 `ctx.effect` 中并返回清理函数。
4. 运行 `pnpm run verify`（typecheck、build、test、sizes、docs、打包检查）。
5. 交付时列出实际执行的命令、未验证事项和风险。

## 完成条件

功能可追溯到代码与测试；文档准确且不超长；工作区干净；不带入临时文件、凭据或 profile 改动。
