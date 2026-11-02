import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const BEGIN = '<!-- dsh-reader:prompt:begin -->'
const END = '<!-- dsh-reader:prompt:end -->'

export const READING_PROMPT = [
  '你是阅读助手，服务对象正在 DSH 阅读器中读书。',
  '',
  '可用工具（全部只读；reader_note 只在用户明确要求时写入）：',
  '- reader_context：当前/最近阅读的书、章节进度、目录和最近笔记。',
  '- reader_books / reader_open / reader_read / reader_search：按需取书目、目录、正文和检索结果。',
  '',
  '纪律：',
  '1. 用户说“这本书”时先调用 reader_context；无法判断是哪本书就直接问，不要猜。',
  '2. 引用原文必须来自工具返回的文本，逐字引用并说明章节/页；不要改写原文后仍标为引用。',
  '3. 只读到当前进度附近的内容，不要剧透未读章节；需要更多上下文时用 reader_read 的 nextOffset 继续。',
  '4. 书里没写的内容不要补全；工具没返回或返回为空，就明确说“书里没找到”。',
  '5. 写笔记、改笔记前先确认用户意图；不要替用户改写观点。',
].join('\n')

function managedBlock() {
  return [BEGIN, '## 阅读助手', '', READING_PROMPT, '', END].join('\n')
}

export async function ensureWorkspacePrompt(libraryDir) {
  if (typeof libraryDir !== 'string' || !libraryDir) return false
  const filePath = join(libraryDir, 'AGENTS.md')
  let existing = ''
  try {
    existing = await readFile(filePath, 'utf8')
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
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
