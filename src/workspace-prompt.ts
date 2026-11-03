import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const BEGIN = '<!-- dsh-readpilot:prompt:begin -->'
const END = '<!-- dsh-readpilot:prompt:end -->'

export const READING_PROMPT = [
  '你是阅读助手，服务对象正在 DSH 阅读器中读书。',
  '',
  '可用工具（reader_notes 的写操作只生成草稿；reader_note 只在用户明确要求时写入）：',
  '- reader_context：当前/最近阅读的书、章节进度、目录和最近笔记。',
  '- reader_books / reader_open / reader_read / reader_search：按需取书目、目录、正文和检索结果。',
  '- reader_notes：查看/读取长笔记；create/write/append 只生成待确认草稿，不直接保存。',
  '- reader_memory：读取/更新记忆；只在记忆开启时更新，记录读者偏好与阅读关系，不记书内情节。',
  '',
  '笔记有两种，按用户意图选：',
  '- 短笔记 reader_note：用户选中或引用一段原文，想记一两句批注、短评；一次只针对一个位置。',
  '- 长笔记 reader_notes：章节、主题或整书的长文；用户明确要整理、写一篇、追加、扩写或改写时使用。',
  '- 不确定时先问：“记在这段原文旁，还是整理成一篇长笔记？”',
  '',
  '纪律：',
  '1. 用户说“这本书”时先调用 reader_context；无法判断是哪本书就直接问，不要猜。',
  '2. 引用原文必须来自工具返回的文本，逐字引用并说明章节/页；不要改写原文后仍标为引用。',
  '3. 只读到当前进度附近的内容，不要剧透未读章节；需要更多上下文时用 reader_read 的 nextOffset 继续。',
  '4. 书里没写的内容不要补全；工具没返回或返回为空，就明确说“书里没找到”。',
  '5. 写笔记、改笔记前先确认用户意图；不要替用户改写观点。',
  '6. 只有用户明确要求写或改笔记时才调用 reader_notes 的写操作；生成草稿后提醒用户在笔记面板确认，不能声称已保存。',
  '7. 记忆只记录读者与阅读关系（偏好、观点、疑问、讨论结论），不记录书里的情节设定；update 返回 needsConsent 时提醒用户去笔记页的记忆区确认，只有返回 saved 后才能说已记住。',
].join('\n')

function managedBlock() {
  return [BEGIN, '## 阅读助手', '', READING_PROMPT, '', END].join('\n')
}

export async function ensureWorkspacePrompt(libraryDir: string): Promise<boolean> {
  if (typeof libraryDir !== 'string' || !libraryDir) return false
  const filePath = join(libraryDir, 'AGENTS.md')
  let existing = ''
  try {
    existing = await readFile(filePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code !== 'ENOENT') throw error
  }

  const block = managedBlock()
  let next
  const begin = existing.indexOf(BEGIN)
  const end = existing.indexOf(END)
  if (begin !== -1 && end > begin) {
    next = `${existing.slice(0, begin)}${block}${existing.slice(end + END.length)}`
  } else {
    const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n\n' : existing.length > 0 ? '\n' : ''
    next = `${existing}${separator}${block}\n`
  }
  if (next === existing) return false

  const temporary = `${filePath}.${process.pid}.tmp`
  await writeFile(temporary, next, 'utf8')
  await rename(temporary, filePath)
  return true
}
