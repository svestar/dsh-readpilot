# 真实封面

- **ID：** FTR-028
- **名称：** 真实封面
- **状态：** active
- **代码：** `src/visual/epub.ts`（`findCoverPath`、`cover`）；`src/api.ts`（`cover`）；`src/limit.ts`（`createLimiter`）；`index.ts`；`src/client/library/library-view.ts`（`BookCard`）
- **测试：** `tests/cover.test.ts`

## 行为

书库卡片按需加载真实封面。EPUB 在解压后的 OPF 中依次识别封面：`metadata` 中的 `<meta name="cover">` 指向的图片项、manifest 中 `properties` 含 `cover-image` 的图片项、`guide` 中 `type="cover"` 的图片项；命中后读取已解压资源字节。PDF 渲染第 1 页作为封面，缩放 0.5，复用 `cache/pages` 的页面缓存。封面在固定高度的封面框内按原始比例完整显示（`object-fit: contain`），不裁剪、不叠加书名与格式文字；只有取不到封面时才显示格式与书名的渐变块。TXT、Markdown 或识别不到封面时返回 404。客户端用 `loading="lazy"` 的图片元素发起请求，加载完成前在封面框内显示转圈提示，完成后淡入；加载失败后本次会话不再重试该卡。Host 用 `createLimiter` 把封面生成限制在最多 4 个并发，多本书首次加载时排队，避免同时渲染拖慢界面。书库工具栏提供“显示封面 / 隐藏封面”开关：关闭后卡片不再请求封面，直接显示渐变块；选择存浏览器本地（键 `dsh-readpilot.covers`），默认开启。封面只影响书库展示，不改变书籍文件。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `findCoverPath` | `src/visual/epub.ts:findCoverPath` | 按 meta、manifest、guide 顺序识别 EPUB 封面路径 |
| `cover` | `src/visual/epub.ts:cover` | 读取封面字节并推断 content type，无封面返回 null |
| `cover` | `src/api.ts:cover` | 按书籍格式分派到 EPUB 资源或 PDF 首页渲染 |
| `BookCard` | `src/client/library/library-view.ts:BookCard` | 渲染封面图、加载提示与失败回退 |
| `createLimiter` | `src/limit.ts:createLimiter` | 限制封面并发生成数量 |

## 约束与失败行为

封面请求是只读的：只读已解压资源或页面缓存，不写书籍文件。EPUB 侧只接受 manifest 中声明为 `image/*` 的条目；缓存 `meta.json` 缺少 `coverPath` 字段时视为过期并重新解压。PDF 首页超过页数上限、渲染失败或缺文件时接口返回 404，不返回半张图。TXT/Markdown 没有封面，客户端不发第二次请求。关闭封面开关后不再发起任何封面请求，重新开启时按需加载；开关状态只影响本机界面，不写入书库数据。封面按 `bookId` 取，书库路径或文件名变化后按新书重新生成。封面不随阅读配色变化。

## 验收与测试

- 正常路径：EPUB 封面字节与 content type 正确，PDF 首页渲染为 PNG，TXT 返回无封面错误（`cover_reads_epub_and_pdf`）。
- 边界：封面生成并发不超过上限，失败后释放名额（`limiter_caps_concurrency`、`limiter_releases_slot_after_failure`）。
