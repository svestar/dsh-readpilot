# 路线图

本页只记录尚未实现的功能与排期，不描述现有行为，也不构成交付承诺。落地时按 `docs/templates/feature.md` 新建 FTR，并从本页删除对应行。

优先级用 `P0`/`P1`/`P2`；排期写阶段或里程碑（`now`/`next`/`later` 或版本号），不写具体日期；状态用 `candidate`/`planned`/`in-progress`。

新增条目时复制下面这行并替换内容：

`| RDM-001 | 功能名 | 要解决的问题 | 可观察的验收结果 | P1 | next | candidate |`

## 工程优化排期

以下条目是工程优化与宿主 API 迁移，不是独立功能，不生成新 FTR；若改变可观察行为，落地时补对应 FTR。落地后从本表删除。

| 批次 | 内容 | 排期 | 状态 |
|---|---|---|---|
| OPT-E | 笔记/书库 `ctx.resources`（库侧 `fs.watch` 与 `content-visibility` 已完成）；真实窗口化列表 | later | planned |
| OPT-F | `dsh-home-paths`、`defineTool` 与结构化工具错误；资产版本；宿主组件收尾 | later | planned |

| ID | 功能 | 要解决的问题 | 验收线索 | 优先级 | 排期 | 状态 |
|---|---|---|---|---|---|---|
| RDM-001 | 提示词预设 | 解释、术语、翻译、追问、总结等需求用提示词即可覆盖，缺的是把选段、书名、章节、笔记自动装配进模板 | 选中文字可直接套用预设并填入 `{{selection}}`、`{{book}}`、`{{chapter}}`、`{{notes}}`；模板可增删改 | P1 | next | candidate |
| RDM-003 | Agent 动作 | 现有工具几乎只读，写操作不驱动界面 | `reader_goto`、`reader_mark`、`reader_open_panel`、`reader_tag`、`reader_status` 可改变阅读器状态并返回回执 | P1 | next | candidate |
| RDM-004 | 动作撤销 | Agent 执行的动作没有统一撤销入口 | 每个动作有回执与界面留痕，可一键撤销；不可撤销的动作不开放 | P2 | later | candidate |
| RDM-005 | 深链动作验证 | 完整动作队列与反向通道成本高，先用零架构改动验证需求 | Agent 输出可点击的深链动作，用户点击后复用现有跳转拦截执行 | P2 | later | candidate |
| RDM-007 | PDF 相邻页合并 | PDF 重排一章等于一个 PDF 页，双页布局无法并排显示两页 | 相邻 2–8 个 PDF 页合并为一个重排章节，双页可显示两页且目录跳转仍准确 | P2 | later | candidate |
| RDM-008 | 冻结排版页号 | 重排页数随字号与窗口变化，全书页号不稳定 | 可按当前排版冻结全书页号并明确标注，字号变化后提示重新计算 | P2 | later | candidate |
| RDM-011 | PDF 划线跨模式映射 | PDF 原版与重排的文本项没有持久字符映射，跨页或被过滤内容只能靠引文匹配 | 每页 textItems 与规范章节偏移可持久映射；同一划线在两种模式定位一致，映射不到时明确标记 | P2 | later | candidate |
