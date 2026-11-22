# 合并前检查

- [ ] 改动只解决当前问题，没有无关重构。
- [ ] Host 注册、RPC、工具和 slot 都有清理函数。
- [ ] 公开接口、数据格式和错误行为已说明。
- [ ] 可独立验收的行为有 FTR，验收锚定真实测试符号。
- [ ] 新增或移动测试文件已列入 FTR 测试路径，或登记在 `docs/README.md` 的测试组织中。
- [ ] 没有重复测试名；共享夹具放在 `tests/support/`。
- [ ] 新功能/ADR 不保留 RDM 占位 ID。
- [ ] `pnpm run verify` 通过（typecheck、boundaries、build、test、sizes、docs、paths、打包检查）。
- [ ] 改到安装或打包时，`pnpm run smoke` 通过（一次性 `DSH_HOME`，不碰日常 home）。
- [ ] 没有临时文件、凭据、profile 改动或未说明的行为变化。
