---
name: dsh-plugin-quality
description: Quality gates and documentation rules for DSH plugins in dsh-plugin-kit. Use when writing FTR or ADR docs, splitting oversized files, fixing verify, sizes, docs, boundaries, or package checks, or deciding where a fact belongs.
---

# DSH 插件质量门禁

## 事实归属

| 内容 | 唯一位置 |
|---|---|
| 工作原则、完成条件 | 模板 `AGENTS.md` |
| 合并前检查 | 模板 `docs/quality-gates.md` |
| 功能清单与路径 | 模板 `docs/features/index.md` |
| 单个功能行为与边界 | 模板 `docs/features/FTR-NNN-*.md` |
| 未实现候选 | 模板 `docs/roadmap.md` |
| 跨功能取舍 | 模板 `docs/decisions/ADR-NNN-*.md` |
| 宿主/客户端 API 事实 | [generated facts](../dsh-plugin-host-apis/references/facts.md) |
| 可执行规则 | 模板 `scripts/check_sizes.py`、`check_docs.py`、`check-boundaries.mjs`、`check-package.mjs` |

规则要写在能被 CI 执行的地方；本 skill 只解释怎么判断、先修哪一项。

## 硬规则

- 体量按职责分档，**不按行切**：
  - `src/host/**`、`src/shared/**`、组件以外客户端文件：300 行；
  - `src/client/modules/**/use-*.ts`：400 行；
  - `*Screen.ts`、`*View.ts`、`*Section.ts`、`*Overlay.ts`：350 行；
  - 测试：400 行；脚本与 examples：300 行。
- 文件长期停在 296–300 行是拆分方式错误的信号：拆出独立职责（store、解析、渲染、DOM 适配），不要把函数对半剪开。
- `client` 只能 import `src/client/**` 与 `src/shared/**`；`host` 不能 import `client`；`shared` 不能 import 两者。由 `check-boundaries.mjs` 拦截。
- 不留死代码、占位实现、吞异常或无解释的魔法值。
- 不提高 `scripts/check_sizes.py`、`check_docs.py` 的上限来通过检查。

## FTR

可独立验收的行为建 FTR；纯修复和重构不新建。共享库或线形契约可以建 internal FTR，但不要按文件逐个建。

```markdown
# 功能名称

- **ID：** FTR-NNN
- **名称：** 功能名称
- **状态：** active
- **代码：** `src/path.ts`（入口符号）
- **测试：** `tests/path.test.ts`

## 行为

触发条件、输入输出、可观察结果、边界；不写实现流水账。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `symbol` | `src/path.ts:symbol` | 职责 |

## 约束与失败行为

权限、上限、错误码、并发、兼容性。

## 验收与测试

- 正常路径：可观察结果（`test_symbol`）。
- 边界：失败行为（`test_symbol`）。
```

规则：

- 「测试」字段必须声明测试文件；验收锚点必须是该文件里**真实定义的** `test('anchor'` 或 `function anchor`，借用别的功能的锚点不算数。
- 锚点写成 `` （`test_symbol`） ``，与真实测试函数名一致。
- 新增 FTR 必须登记到 `docs/features/index.md`，6 列表格：ID、名称、文档路径、代码路径、测试路径、状态。
- 单个 FTR 不超过 3000 字符；不要把多个模块塞进一篇。
- 粒度按“可独立验收的用户可见行为”切；跨多个模块仍算一篇。

## ADR

跨功能取舍才写。模板是 `docs/templates/adr.md`：标题、状态/日期/范围、`## 背景`、`## 决策`、`## 备选方案`、`## 后果`，不超过 3000 字符。FTR 和 ADR 都不保留路线图 ID，只互相引用。

## 路线图

只记未实现候选。落地后新建 FTR、更新索引，并从路线图删除；表头保持 7 列。

## 文档卫生

- UTF-8，LF 换行，恰好一个结尾换行。
- 长度上限是字符数：README 5000、AGENTS 2000、单个 FTR/ADR 3000。
- FTR 的「代码」「测试」字段、索引三列里的反引号仓库相对路径必须真实存在；`check_docs.py` 会失败。
- 锚点按真实测试名匹配，不再用子串匹配。

## 验证

`pnpm run verify` 依次执行：typecheck、boundaries、build、test、sizes、docs、check:package。逐项修复，不要跳过。

- 体量失败：拆职责，不删测试、不合并文件逃避。
- 边界失败：把共享代码移到 `src/shared/`，不要在 client 里 import host。
- 文档失败：先修路径和锚点，再补索引登记。
- 打包失败：检查 `files`、`exports`、`main`、`client.js` 是否由 `build:client` 重新生成；`check-package` 还会 import `dist/index.js`。
- 改到安装或打包时再跑 `pnpm run smoke`。

## 提交

一个可验收变更一次提交，不把多个任务混在一起。提交前确认工作区没有临时文件、凭据或 profile 改动。
