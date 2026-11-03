# 书库整理

- **ID：** FTR-013
- **名称：** 书库整理
- **状态：** active
- **代码：** `src/library-meta.ts`（`createLibraryMetaStore`、`normalizeTags`）；`src/api.ts`（`state`、`libraryMeta`、`setBookTags`）；`src/client/library-utils.ts`（`filterBooks`、`recentBooks`、`tagCatalogue`）；`src/client/views/library-view.ts`（`Library`）；`src/client/plugin.ts`（`ReaderPanel`）
- **测试：** `tests/library-organization.test.ts`

## 行为

书库页面左侧显示分类栏：全部、最近阅读、在读、未读、TXT/MD/EPUB/PDF 与自定义标签；主区域显示全部书籍网格，最近阅读作为分类筛选，按 `progress.updatedAt` 倒序。分类内的卡片点击直接打开该书并回到进度章节。自定义标签按书保存，一本书可有多个标签；卡片显示前三个标签并提供“标签”按钮，弹窗可添加、移除标签或从已有标签中选择。顶部支持书名/标签搜索与按最近阅读、书名、文件大小、文件时间排序；分类栏、搜索和排序组合生效。

## 接口与代码映射

| 入口/符号 | 位置 | 职责 |
|---|---|---|
| `createLibraryMetaStore` | `src/library-meta.ts:createLibraryMetaStore` | 读写 `$DSH_HOME/dsh-reader/library-meta.json`，按书保存标签 |
| `normalizeTags` | `src/library-meta.ts:normalizeTags` | 去重、去空白、校验 1–24 字与最多 20 个 |
| `state` / `libraryMeta` | `src/api.ts:state` | 返回书籍、进度、会话与标签快照 |
| `setBookTags` | `src/api.ts:setBookTags` | 校验书籍与标签并持久化 |
| `filterBooks` / `recentBooks` / `tagCatalogue` | `src/client/library-utils.ts:filterBooks` | 分类、搜索、排序、最近阅读与标签计数 |
| `Library` | `src/client/views/library-view.ts:Library` | 分类栏、最近阅读、网格、搜索排序与标签弹窗 |
| `ReaderPanel` | `src/client/plugin.ts:ReaderPanel` | 保存标签后刷新书库快照 |

## 约束与失败行为

标签只存 `$DSH_HOME/dsh-reader/library-meta.json`，不改书籍文件；标签文件损坏或条目非法时回退空标签，不影响书库和其它书。每本书最多 20 个标签，每个 1–24 字，重复标签去重；空列表删除该书标签。书库路径或文件移动、改名会改变 `bookId`，旧标签不会自动跟随。最近阅读只依据已有阅读进度；没有“已读”标记，也不提供清除进度入口。搜索为书名、格式和标签的字面量包含匹配；标签筛选与格式筛选是互斥分类。没有匹配书籍时显示空状态。

## 验收与测试

- 正常路径/边界：标签去重、空白裁剪、24 字与 20 个上限（`normalize_tags_deduplicates_and_trims`）。
- 正常路径：标签写入、读取、清空与损坏文件回退（`library_meta_set_list_remove`、`library_meta_corrupt_file_falls_back`）。
- 正常路径：最近阅读排序、标签/格式/未读筛选与搜索（`library_recent_and_tag_filters`）。
- 正常路径：书名/大小排序、标签计数与分类数量（`library_sort_and_counts`）。
