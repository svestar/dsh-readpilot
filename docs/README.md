# 文档维护规则

## 职责划分

- `docs/features/index.md` 是功能清单，6 列：ID、名称、文档路径、代码路径、测试路径、状态。新增、重命名或删除 FTR 时同步更新对应行，索引负责覆盖率。`docs/features/navigation.md` 是按能力域浏览的入口，只做导航，不替代这张表；新增 FTR 时同步加入相应分组。
- `docs/features/FTR-NNN.md` 只描述一个可独立验收的功能：行为、接口与代码映射、约束与失败行为、验收与测试。映射中的 `路径:符号` 必须在代码里真实存在，每条验收条目都必须在末尾括号内锚定测试文件中真实存在的符号。符号可以是导出函数、对象属性、组件或局部入口；跨模块入口优先写导出符号。符号校验是文本级的：只保证标识在文件中出现，不区分声明、注释或字符串，也不强制导出。
- `docs/decisions/` 存放跨功能、影响长期维护的 ADR；被取代时保留旧记录、标记 `superseded` 并链接取代者。
- `docs/roadmap.md` 记录尚未实现的候选与排期，不描述现有行为；落地后转为 FTR 并从该页删除。
- `docs/templates/` 提供新建文档的骨架，模板中的占位符必须全部替换。

## 测试组织

- FTR 的「测试」字段同时表示验收锚点和集成覆盖：锚点必须能在声明的测试文件中找到；`tests/api-*.test.ts` 作为 API 集成覆盖可以没有锚点。
- 测试文件名用 kebab-case（`sidebar-reader.test.ts`），测试名用 snake_case（`sidebar_pending_block_jumps_with_rendered_text_fraction`），一个测试聚焦一个行为；跨功能冒烟除外。
- 多处使用的夹具放 `tests/support/`，不在测试文件里复制 `makePdf`、`buildBlankPdf` 这类构造代码。
- `tests/smoke.test.ts` 是跨功能冒烟，不属于单一 FTR；它覆盖书库、阅读、检索、批注、进度、扫描 PDF 与 Markdown 图片。
- 新增测试文件必须二选一：列入相关 FTR 的「测试」字段和索引，或在下面登记为基础设施/服务层测试。

基础设施与服务层测试：

- `tests/contract.test.ts`、`tests/client-rpc.test.ts`、`tests/router.test.ts`、`tests/rpc-route.test.ts`：接口契约、客户端 RPC 信封与路由分发（见 ADR-014）。
- `tests/config.test.ts`、`tests/entry.test.ts`、`tests/manifest.test.ts`：插件配置、根入口与清单装配。
- `tests/lib.test.ts`：通用库（截断、JSON 写入、写队列、插件错误）。
- `tests/library-service.test.ts`：书库服务层的配置与重复副本删除。

## 新增或修改功能

1. 分配或复用 `FTR-NNN`，避免 ID 重复。
2. 按 `docs/templates/feature.md` 创建或更新功能文档，写入真实代码、测试路径与关键符号。
3. 同步更新 `docs/features/index.md` 的 6 列表格。
4. 修改代码和测试后运行 `python scripts/check_docs.py`；CI 的 docs-check 还会运行门禁自测。

## 维护路线图

1. 新想法先写 `docs/roadmap.md`，补齐要解决的问题、验收线索、优先级与排期。
2. 落地时按功能流程新建 FTR，并在同一变更中删除路线图对应行。

## 门禁

- `pnpm run verify`：typecheck、boundaries、build、test、sizes、docs、paths、package。
- 文档门禁：`python scripts/check_docs.py`；门禁自测：`python scripts/test_check_docs.py`（两者都在 docs-check workflow 中）。门禁会校验 `navigation.md`：每个 FTR 必须恰好出现一次。
- 路径门禁：`python scripts/check_code_paths.py --strict`；校验 FTR 代码字段、索引路径，以及索引重复的符号注解。自测：`python scripts/test_check_code_paths.py`。
- 合并前按 `docs/quality-gates.md` 逐项核对。

## 拆分与删除

- 文档触及长度上限时拆分真正独立的功能，不要单纯删掉关键约束。
- 移除功能时，同一变更中删除或归档文档并更新索引，确认调用方、数据迁移与兼容性影响。
- 跨功能取舍记录为 ADR，使用 `docs/templates/adr.md`。

## 原则

索引负责覆盖率，功能文档负责可理解性，测试负责行为验证，代码是运行行为的最终事实来源。四者不一致时必须在合并前修复。门禁只验证结构与引用，语义是否与实际行为一致仍由 review 与交付说明承担。
