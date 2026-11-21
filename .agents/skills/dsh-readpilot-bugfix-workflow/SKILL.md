---
name: dsh-readpilot-bugfix-workflow
description: Diagnose and fix dsh-readpilot reader/companion bugs with async page state, stale responses, panel lifecycles, and regression verification. Use for jumps, stale translations, cross-chapter navigation, persistence, and similar timing bugs.
---

# dsh-readpilot Bug 修复流程

## 1. 固定复现条件

先问清或确认：

- 格式与模式：文本 / Markdown / EPUB / PDF 重排 / PDF 原版；滚动还是分页。
- 触发动作：首次开启、快速连续翻页、跨章向前、跨章向后、切走再回来、重新打开书。
- 可观察结果：停在哪一页、是否跳到章节首页/末页、译文是否显示、是否只发生在开启翻译后。
- 是否刚重启/刷新，Host 是否加载了最新 RPC。

不要用“应该修好了”替代复现。没有真实 GUI 条件时，明确说明只做了哪些自动验证。

## 2. 区分状态来源

阅读位置至少有四套状态，不能混用：

1. 分页器 `page` / `pageCount` / `stride`；
2. 分页测量是否落定（章节切换、末页 pending、字号/布局变化）；
3. 用户导航 token 与程序化恢复；
4. DOM 块坐标和可见块集合。

排查顺序：先看页码状态，再看测量/滚动是否应用，最后才看 DOM 几何。**不要用第一个可见块反推业务页码**。

## 3. 异步批次的硬规则

- 每个请求带上下文键：书、章节、用户翻页 token（滚动模式可用滚动代次）。
- 响应返回时上下文不匹配：不写译文、不恢复位置、不增加 revision；清掉本批 loading，避免永久 pending。
- 请求开始时保存锚点还不够，恢复必须等**同批次完成**；用 revision 或等价完成信号，不能在请求开始就滚动。
- 跨章向前翻页：先让分页器落到上一章末页（pending last），翻译等分页测量完成后再开始。
- 程序化恢复不要增加用户导航 token，否则会把恢复误判成用户翻页。

## 4. 生命周期语义

- “打开书籍默认关闭”与“切到别的界面再回来保持”是两件事：用模块级按书会话状态，不用 localStorage，也不要每次挂载都置 false。
- 真正打开书籍（书库 `openBook`）时清除该书条目；面板卸载/重挂载保留。
- 关闭面板、切聊天、切书、返回旧书分别验证，不要用一个大 effect 全部重置。

## 5. 修复步骤

1. 写最小失败测试或明确无法自动化的时序点。
2. 先改状态不变量，再做 UI 清理；不要用延时、强制 `scrollIntoView` 或重试掩盖竞态。
3. 同时检查主阅读区和侧边栏，它们可能共用 hook 但不同挂载生命周期。
4. 跑 `pnpm run verify`；检查 sizes/docs/package 和 CI。
5. 让用户验证原始复现路径。用户确认前**不提交推送**；一次只推一个可解释的修复。

## 6. 翻译功能案例

- 症状：开始翻译跳章节首页；跨章回翻落到上一章首页。
- 根因：请求开始就执行 DOM 锚点恢复；用块坐标反推页码；旧页响应晚到仍插入；分页末页尚未应用。
- 修复不变量：页码用分页器状态恢复，翻页 token 丢弃过期批次，分页落定后再翻译，跨章末页 pending 期间暂停翻译。
