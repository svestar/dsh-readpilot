window.__ModuleLoader__.load({
  id: 'dsh-reader',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const NS = 'dshReader'

    const zh = {
      panel: '阅读',
      library: '书库',
      rescan: '重新扫描',
      settings: '设置',
      cancel: '取消',
      setupTitle: '设置书库',
      setupHint: '选择一个存放电子书的目录。创建后它会在左侧成为一个独立工作区，每本书的伴读会话也保存在那里。',
      chooseDir: '选择目录',
      create: '创建书库',
      pathPlaceholder: '例如 E:\\Books',
      empty: '这个目录里还没有可阅读的电子书。',
      emptyHint: '支持 .txt 与 .md，当前版本会列出 .epub 与 .pdf 但暂不能打开。',
      back: '返回书库',
      toc: '目录',
      reading: '阅读',
      unsupported: '暂不支持',
      unsupportedHint: '当前版本只实现 TXT 与 Markdown 的文本阅读；EPUB 与 PDF 的解析会在后续版本加入。',
      unread: '未读',
      explain: '解释',
      summarize: '总结',
      translate: '翻译',
      loadFailed: '加载失败',
      configureFailed: '创建书库失败',
      retry: '重试',
      loading: '加载中…',
      noToc: '没有目录',
      fontSize: '字号',
      companion: '伴读',
      chatEmpty: '针对这本书提问，或在正文中选中文字后使用“解释 / 总结 / 翻译”。',
      chatPlaceholder: '针对这本书提问…',
      send: '发送',
      sending: '发送中…',
      thinking: '思考中…',
      loadEarlier: '加载更早',
      you: '你',
      assistant: '伴读',
      closeChat: '收起伴读',
      chatDisabled: '先在设置中创建书库工作区。',
      sendFailed: '发送失败',
      explainPrompt: '请解释这段文字。',
      summarizePrompt: '请总结这段文字。',
      translatePrompt: '请把这段文字翻译成中文。',
    }

    const en = {
      panel: 'Reader',
      library: 'Library',
      rescan: 'Rescan',
      settings: 'Settings',
      cancel: 'Cancel',
      setupTitle: 'Set up your library',
      setupHint: 'Choose a folder that holds your ebooks. It becomes a dedicated workspace, and every book keeps its companion session there.',
      chooseDir: 'Choose folder',
      create: 'Create library',
      pathPlaceholder: 'e.g. E:\\Books',
      empty: 'No readable ebooks in this folder yet.',
      emptyHint: 'TXT and Markdown are supported now; EPUB and PDF are listed but not yet readable.',
      back: 'Back to library',
      toc: 'Contents',
      reading: 'Reading',
      unsupported: 'Not supported',
      unsupportedHint: 'This version reads TXT and Markdown only. EPUB and PDF parsing arrives in a later version.',
      unread: 'Unread',
      explain: 'Explain',
      summarize: 'Summarize',
      translate: 'Translate',
      loadFailed: 'Could not load',
      configureFailed: 'Could not create the library',
      retry: 'Retry',
      loading: 'Loading…',
      noToc: 'No contents',
      fontSize: 'Font size',
      companion: 'Companion',
      chatEmpty: 'Ask about this book, or select text and use Explain / Summarize / Translate.',
      chatPlaceholder: 'Ask about this book…',
      send: 'Send',
      sending: 'Sending…',
      thinking: 'Thinking…',
      loadEarlier: 'Load earlier',
      you: 'You',
      assistant: 'Companion',
      closeChat: 'Hide companion',
      chatDisabled: 'Create a library workspace in Settings first.',
      sendFailed: 'Could not send',
      explainPrompt: 'Please explain this passage.',
      summarizePrompt: 'Please summarize this passage.',
      translatePrompt: 'Please translate this passage into Chinese.',
    }

    const CSS = `
.dsh-reader-panel{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:14px}
.dsh-reader-header{flex:none;display:flex;align-items:center;gap:12px;padding:10px 18px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dsh-reader-header-main{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
.dsh-reader-header-actions{display:flex;align-items:center;gap:6px;flex:none}
.dsh-reader-icon-btn{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 6px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer}
.dsh-reader-icon-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-reader-icon-btn:disabled{opacity:.45;cursor:default}
.dsh-reader-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;color:var(--dsw-alias-label-primary)}
.dsh-reader-subtitle{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:12px;margin-top:1px}
.dsh-reader-body{flex:1;min-height:0;overflow:auto;padding:20px 24px 40px}
.dsh-reader-library-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}
.dsh-reader-library-head h2{margin:0;font-size:15px;font-weight:600}
.dsh-reader-primary{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 14px;border:1px solid transparent;border-radius:8px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font:inherit;font-weight:600;cursor:pointer}
.dsh-reader-primary:disabled{opacity:.45;cursor:default}
.dsh-reader-setup-actions{display:flex;gap:8px}
.dsh-reader-secondary{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer}
.dsh-reader-secondary:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-reader-secondary:disabled{opacity:.45;cursor:default}
.dsh-reader-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
.dsh-reader-card{display:flex;flex-direction:column;align-items:stretch;gap:8px;padding:14px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);color:inherit;text-align:left;font:inherit;cursor:pointer}
.dsh-reader-card:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.dsh-reader-cover{height:64px;border-radius:8px;background:linear-gradient(135deg,var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-2));display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary);font-size:12px;letter-spacing:.08em}
.dsh-reader-card-title{font-weight:600;line-height:1.35;word-break:break-word}
.dsh-reader-card-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--dsw-alias-label-secondary);font-size:12px}
.dsh-reader-progress{height:3px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.dsh-reader-progress span{display:block;height:100%;background:var(--dsw-alias-brand-primary)}
.dsh-reader-badge{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-warn-primary);font-size:11px}
.dsh-reader-empty{max-width:460px;margin:60px auto;text-align:center;color:var(--dsw-alias-label-secondary);line-height:1.7}
.dsh-reader-empty h2{margin:0 0 8px;font-size:16px;color:var(--dsw-alias-label-primary)}
.dsh-reader-setup{flex:1;display:flex;align-items:center;justify-content:center;padding:24px}
.dsh-reader-setup-card{width:min(520px,100%);padding:26px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 12px 40px rgba(0,0,0,.10)}
.dsh-reader-setup-card h2{margin:0 0 8px;font-size:18px}
.dsh-reader-setup-card p{margin:0 0 18px;color:var(--dsw-alias-label-secondary);line-height:1.65}
.dsh-reader-path-row{display:flex;gap:8px;margin-bottom:14px}
.dsh-reader-path-row input{flex:1;min-width:0;height:34px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit}
.dsh-reader-path-row input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-reader-book{flex:1;min-height:0;display:grid;position:relative;grid-template-columns:230px minmax(0,1fr) 340px}
.dsh-reader-book[data-toc="false"]{grid-template-columns:minmax(0,1fr) 340px}
.dsh-reader-book[data-chat="false"]{grid-template-columns:230px minmax(0,1fr)}
.dsh-reader-book[data-toc="false"][data-chat="false"]{grid-template-columns:minmax(0,1fr)}
.dsh-reader-toc{min-height:0;overflow:auto;padding:12px 10px 40px;border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dsh-reader-toc-title{padding:4px 8px 8px;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600;letter-spacing:.04em}
.dsh-reader-toc-list{display:flex;flex-direction:column;gap:2px}
.dsh-reader-toc-item{display:block;width:100%;padding:7px 8px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);text-align:left;font:inherit;line-height:1.45;cursor:pointer}
.dsh-reader-toc-item:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-reader-toc-item[data-active="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
.dsh-reader-chat{min-height:0;display:flex;flex-direction:column;border-left:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dsh-reader-chat-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-reader-chat-title{font-weight:600;font-size:13px}
.dsh-reader-chat-close{height:24px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.dsh-reader-chat-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-reader-chat-body{flex:1;min-height:0;overflow:auto;padding:12px 12px 4px}
.dsh-reader-chat-empty{padding:18px 6px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.7}
.dsh-reader-chat-more{display:block;width:100%;margin-bottom:10px;padding:5px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.dsh-reader-chat-more:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-reader-msg{display:flex;flex-direction:column;gap:3px;margin-bottom:10px}
.dsh-reader-msg-role{color:var(--dsw-alias-label-secondary);font-size:11px}
.dsh-reader-msg-text{white-space:pre-wrap;word-break:break-word;line-height:1.65;font-size:13px}
.dsh-reader-msg[data-role="user"] .dsh-reader-msg-text{padding:7px 9px;border-radius:8px;background:var(--dsw-alias-bg-layer-2)}
.dsh-reader-chat-thinking{color:var(--dsw-alias-label-secondary);font-size:12px;padding:2px 0 10px}
.dsh-reader-chat-error{margin:0 12px 8px;padding:7px 9px;border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.55}
.dsh-reader-chat-compose{flex:none;padding:10px 12px 12px;border-top:1px solid var(--dsw-alias-border-l2)}
.dsh-reader-chat-compose textarea{display:block;width:100%;box-sizing:border-box;min-height:58px;max-height:140px;padding:8px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.55;resize:vertical}
.dsh-reader-chat-compose textarea:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-reader-chat-compose-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px}
.dsh-reader-chat-hint{color:var(--dsw-alias-label-secondary);font-size:11px}
.dsh-reader-chat-send{height:28px;padding:0 12px;border:0;border-radius:7px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.dsh-reader-chat-send:disabled{opacity:.45;cursor:default}
.dsh-reader-chat-backdrop{display:none}
.dsh-reader-reader{min-height:0;overflow:auto;padding:28px 40px 90px}
.dsh-reader-reader-inner{max-width:760px;margin:0 auto;line-height:1.9;color:var(--dsw-alias-label-primary)}
.dsh-reader-chapter-title{margin:0 0 22px;font-size:22px;line-height:1.35;font-weight:650}
.dsh-reader-reader p{margin:0 0 1.1em;white-space:pre-wrap;word-break:break-word}
.dsh-reader-reader h3{margin:1.6em 0 .6em;font-size:1.08em;line-height:1.4}
.dsh-reader-reader blockquote{margin:1em 0;padding:2px 0 2px 14px;border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.dsh-reader-reader pre{margin:1em 0;padding:12px 14px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);overflow:auto;font-size:12.5px;line-height:1.6}
.dsh-reader-reader code{padding:1px 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);font-size:.92em}
.dsh-reader-reader pre code{padding:0;background:transparent}
.dsh-reader-reader a{color:var(--dsw-alias-brand-primary);text-decoration:underline;text-underline-offset:2px}
.dsh-reader-li{display:flex;gap:8px;margin:0 0 .5em;white-space:pre-wrap}
.dsh-reader-li::before{content:"•";color:var(--dsw-alias-label-secondary);flex:none}
.dsh-reader-selection{position:fixed;z-index:50;transform:translateX(-50%);display:flex;gap:4px;padding:5px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-overlay);box-shadow:0 10px 34px rgba(0,0,0,.24)}
.dsh-reader-selection button{height:26px;padding:0 9px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.dsh-reader-selection button:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-reader-banner{flex:none;padding:8px 18px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-warn-primary);font-size:12.5px;line-height:1.5}
.dsh-reader-error{flex:none;padding:8px 18px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary);font-size:12.5px;line-height:1.5}
.dsh-reader-muted{padding:40px 20px;text-align:center;color:var(--dsw-alias-label-secondary)}
.dsh-reader-spacer{flex:1}
@media (max-width:1100px){.dsh-reader-book{grid-template-columns:230px minmax(0,1fr)!important}.dsh-reader-book[data-toc="false"]{grid-template-columns:minmax(0,1fr)!important}.dsh-reader-chat{position:absolute;top:0;right:0;bottom:0;width:min(360px,92%);z-index:20;box-shadow:-8px 0 30px rgba(0,0,0,.24)}.dsh-reader-chat-backdrop{display:block;position:absolute;inset:0;z-index:19;border:0;padding:0;background:rgba(0,0,0,.18)}}
@media (max-width:760px){.dsh-reader-book{grid-template-columns:1fr!important}.dsh-reader-toc{display:none}.dsh-reader-reader{padding:20px 18px 80px}}
`

    const style = document.createElement('style')
    style.dataset.plugin = 'dsh-reader'
    style.dataset.pluginCss = 'dsh-reader/reader.css'
    style.textContent = CSS
    document.head.appendChild(style)

    let runtime
    let boundText = key => key

    async function call(endpoint, payload) {
      if (!runtime || !runtime.connection) throw new Error('连接服务不可用')
      let response
      try {
        response = await fetch('/api/dsh-reader', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint, payload: payload ?? null }),
        })
      } catch (error) {
        throw new Error(`无法连接阅读器服务：${messageOf(error)}`)
      }
      let result
      try {
        result = await response.json()
      } catch {
        throw new Error(`阅读器服务返回了无效响应（HTTP ${response.status}）`)
      }
      if (!result || result.ok !== true) {
        throw new Error(result?.error?.message ?? `请求失败（HTTP ${response.status}）`)
      }
      return result.value
    }

    function messageOf(error) {
      return error instanceof Error ? error.message : String(error)
    }

    function formatSize(bytes) {
      if (!Number.isFinite(bytes)) return ''
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    }

    function textOfContent(content) {
      if (typeof content === 'string') return content.trim()
      if (!Array.isArray(content)) return ''
      return content
        .filter(block => block && block.type === 'text' && typeof block.text === 'string')
        .map(block => block.text)
        .join('\n')
        .trim()
    }

    function foldTranscript(entries) {
      const messages = []
      for (const entry of entries ?? []) {
        if (!entry || entry.type !== 'event' || !entry.event) continue
        const event = entry.event
        if (event.type !== 'user/message' && event.type !== 'assistant/message') continue
        const data = event.data ?? {}
        const message = data.message ?? data
        const text = textOfContent(message.content ?? data.content)
        if (!text) continue
        messages.push({
          key: `${event.type}-${event.seq ?? messages.length}`,
          role: event.type === 'user/message' ? 'user' : 'assistant',
          text,
        })
      }
      return messages
    }

    function inline(text, prefix) {
      const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g
      const nodes = []
      let last = 0
      let index = 0
      let match
      while ((match = pattern.exec(text)) !== null) {
        if (match.index > last) nodes.push(text.slice(last, match.index))
        const token = match[0]
        const key = `${prefix}-${index}`
        index += 1
        if (token.startsWith('**')) {
          nodes.push(h('strong', { key }, token.slice(2, -2)))
        } else if (token.startsWith('`')) {
          nodes.push(h('code', { key }, token.slice(1, -1)))
        } else if (token.startsWith('*')) {
          nodes.push(h('em', { key }, token.slice(1, -1)))
        } else {
          const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
          if (link && /^(https?:|mailto:|#)/i.test(link[2])) {
            nodes.push(h('a', { key, href: link[2], target: '_blank', rel: 'noreferrer' }, link[1]))
          } else {
            nodes.push(link ? link[1] : token)
          }
        }
        last = match.index + token.length
      }
      if (last < text.length) nodes.push(text.slice(last))
      return nodes
    }

    function renderBlocks(blocks, prefix) {
      return blocks.map((block, index) => {
        const key = `${prefix}-${index}`
        if (block.type === 'h') return h('h3', { key }, inline(block.text, key))
        if (block.type === 'code') return h('pre', { key }, h('code', null, block.text))
        if (block.type === 'quote') return h('blockquote', { key }, inline(block.text, key))
        if (block.type === 'li') return h('div', { key, className: 'dsh-reader-li' }, h('span', null, inline(block.text, key)))
        return h('p', { key }, inline(block.text, key))
      })
    }

    function PanelIcon({ size = 20, active }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        'aria-hidden': true,
        style: { display: 'block' },
      },
      h('path', {
        d: 'M4 6.5A2.5 2.5 0 0 1 6.5 4H11v15H6.5A2.5 2.5 0 0 0 4 21.5z',
        fill: active ? 'currentColor' : 'none',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinejoin: 'round',
        opacity: active ? 0.9 : 1,
      }),
      h('path', {
        d: 'M20 6.5A2.5 2.5 0 0 0 17.5 4H13v15h4.5A2.5 2.5 0 0 1 20 21.5z',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.6,
        strokeLinejoin: 'round',
      }),
      h('path', { d: 'M12 4v15.5', stroke: 'currentColor', strokeWidth: 1.2, opacity: 0.55 }))
    }

    function Setup({ t, initialPath, busy, onConfigure, onPick, onCancel }) {
      const [path, setPath] = React.useState(initialPath ?? '')
      const row = h('div', { className: 'dsh-reader-path-row' },
        h('input', {
          value: path,
          placeholder: t('pathPlaceholder'),
          spellCheck: false,
          onChange: event => setPath(event.target.value),
        }),
        h('button', {
          type: 'button',
          className: 'dsh-reader-secondary',
          onClick: () => onPick(setPath),
        }, t('chooseDir')))
      const actions = h('div', { className: 'dsh-reader-setup-actions' },
        h('button', {
          type: 'button',
          className: 'dsh-reader-primary',
          disabled: busy || !path.trim(),
          onClick: () => onConfigure(path.trim()),
        }, busy ? t('loading') : t('create')),
        onCancel
          ? h('button', {
            type: 'button',
            className: 'dsh-reader-secondary',
            onClick: onCancel,
          }, t('cancel'))
          : null)
      return h('div', { className: 'dsh-reader-setup' },
        h('div', { className: 'dsh-reader-setup-card' },
          h('h2', null, t('setupTitle')),
          h('p', null, t('setupHint')),
          row,
          actions))
    }

    function Library({ t, snapshot, busy, onOpen, onRefresh, onSettings }) {
      const books = snapshot.books
      return h('div', { className: 'dsh-reader-body' },
        h('div', { className: 'dsh-reader-library-head' },
          h('h2', null, `${t('library')} · ${books.length}`),
          h('div', { className: 'dsh-reader-header-actions' },
            h('button', {
              type: 'button',
              className: 'dsh-reader-secondary',
              onClick: onSettings,
            }, t('settings')),
            h('button', {
              type: 'button',
              className: 'dsh-reader-secondary',
              disabled: busy,
              onClick: onRefresh,
            }, t('rescan')))),
        books.length === 0
          ? h('div', { className: 'dsh-reader-empty' },
            h('h2', null, t('empty')),
            h('p', null, t('emptyHint')))
          : h('div', { className: 'dsh-reader-grid' },
            books.map(book => h('button', {
              key: book.id,
              type: 'button',
              className: 'dsh-reader-card',
              onClick: () => onOpen(book),
            },
            h('div', { className: 'dsh-reader-cover' }, book.format.toUpperCase()),
            h('div', { className: 'dsh-reader-card-title' }, book.title),
            h('div', { className: 'dsh-reader-card-meta' },
              h('span', null, `${formatSize(book.size)}`),
              book.supported
                ? null
                : h('span', { className: 'dsh-reader-badge' }, t('unsupported'))),
            book.progress
              ? h('div', { className: 'dsh-reader-card-meta' },
                h('span', null, book.progress.chapterTitle ?? t('reading')))
              : h('div', { className: 'dsh-reader-card-meta' }, h('span', null, t('unread')))))))
    }

    function Toc({ t, detail, activeChapter, onSelect }) {
      return h('aside', { className: 'dsh-reader-toc' },
        h('div', { className: 'dsh-reader-toc-title' }, t('toc')),
        detail.toc.length === 0
          ? h('div', { className: 'dsh-reader-muted' }, t('noToc'))
          : h('div', { className: 'dsh-reader-toc-list' },
            detail.toc.map(item => h('button', {
              key: item.id,
              type: 'button',
              className: 'dsh-reader-toc-item',
              'data-active': item.id === activeChapter ? 'true' : 'false',
              onClick: () => onSelect(item.id),
            }, item.title))))
    }

    function ReaderPanel(props) {
      const t = props.t ?? boundText
      const [snapshot, setSnapshot] = React.useState(null)
      const [screen, setScreen] = React.useState({ kind: 'library' })
      const [error, setError] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [tocOpen, setTocOpen] = React.useState(true)
      const [fontSize, setFontSize] = React.useState(17)
      const [selection, setSelection] = React.useState(null)
      const [chatOpen, setChatOpen] = React.useState(() => (typeof window !== 'undefined' ? window.innerWidth > 1100 : true))
      const [draft, setDraft] = React.useState('')
      const [sending, setSending] = React.useState(false)
      const [chatError, setChatError] = React.useState('')
      const [entries, setEntries] = React.useState([])
      const [hasMore, setHasMore] = React.useState(false)
      const [loadingEarlier, setLoadingEarlier] = React.useState(false)
      const [chatBinding, setChatBinding] = React.useState(null)
      const chatRef = React.useRef(null)
      const chatBodyRef = React.useRef(null)
      const chatInputRef = React.useRef(null)
      const contentRef = React.useRef(null)

      const refresh = React.useCallback(async () => {
        setBusy(true)
        setError('')
        try {
          const value = await call('state')
          setSnapshot(value)
        } catch (cause) {
          setError(`${t('loadFailed')}：${messageOf(cause)}`)
        } finally {
          setBusy(false)
        }
      }, [t])

      React.useEffect(() => {
        void refresh()
      }, [refresh])

      const rememberSession = React.useCallback((bookId, sessionId) => {
        setSnapshot(previous => previous
          ? {
            ...previous,
            sessions: {
              ...previous.sessions,
              [bookId]: { sessionId, updatedAt: Date.now() },
            },
          }
          : previous)
      }, [])

      const activeBookId = screen.kind === 'book' ? screen.detail.book.id : null
      const activeSessionId = activeBookId && snapshot
        ? snapshot.sessions?.[activeBookId]?.sessionId ?? null
        : null
      const workspaceId = snapshot?.settings?.workspaceId ?? null

      const openBook = React.useCallback(async book => {
        setBusy(true)
        setError('')
        try {
          const detail = await call('open', { bookId: book.id })
          if (!detail.supported) {
            setScreen({ kind: 'unsupported', book: detail.book })
            return
          }
          const target = detail.toc.find(item => item.id === detail.progress?.chapterId) ?? detail.toc[0]
          if (!target) {
            setScreen({ kind: 'unsupported', book: detail.book })
            return
          }
          const content = await call('chapter', { bookId: book.id, chapterId: target.id })
          setScreen({ kind: 'book', detail, content })
        } catch (cause) {
          setError(`${t('loadFailed')}：${messageOf(cause)}`)
        } finally {
          setBusy(false)
        }
      }, [t])

      const selectChapter = React.useCallback(async (bookId, chapterId) => {
        setSelection(null)
        setBusy(true)
        try {
          const content = await call('chapter', { bookId, chapterId })
          setScreen(previous => previous.kind === 'book'
            ? { ...previous, detail: { ...previous.detail, progress: { chapterId, chapterTitle: content.title } }, content }
            : previous)
          void call('progress', { bookId, chapterId, chapterTitle: content.title }).catch(() => {})
        } catch (cause) {
          setError(`${t('loadFailed')}：${messageOf(cause)}`)
        } finally {
          setBusy(false)
        }
      }, [t])

      const backToLibrary = React.useCallback(() => {
        setScreen({ kind: 'library' })
        setSelection(null)
        void refresh()
      }, [refresh])

      const configure = React.useCallback(async path => {
        setBusy(true)
        setError('')
        try {
          const value = await call('configure', { path })
          setSnapshot(value)
          setScreen({ kind: 'library' })
        } catch (cause) {
          setError(`${t('configureFailed')}：${messageOf(cause)}`)
        } finally {
          setBusy(false)
        }
      }, [t])

      const pickDirectory = React.useCallback(async setPath => {
        try {
          const directory = await runtime.uiWorkspace.pickDirectory()
          if (directory) setPath(directory)
        } catch (cause) {
          setError(messageOf(cause))
        }
      }, [])

      const prefill = React.useCallback(kind => {
        if (!selection || screen.kind !== 'book') return
        const question = {
          explain: t('explainPrompt'),
          summarize: t('summarizePrompt'),
          translate: t('translatePrompt'),
        }[kind]
        const quote = selection.text.split('\n').map(line => `> ${line}`).join('\n')
        setDraft(`我在读《${screen.detail.book.title}》的《${screen.content.title}》。\n\n${quote}\n\n${question}`)
        setSelection(null)
        setChatOpen(true)
        setChatError('')
        requestAnimationFrame(() => chatInputRef.current?.focus())
      }, [selection, screen, t])

      const onContentMouseUp = React.useCallback(() => {
        const active = window.getSelection()
        const container = contentRef.current
        if (!active || active.isCollapsed || active.rangeCount === 0 || !container) {
          setSelection(null)
          return
        }
        const range = active.getRangeAt(0)
        if (!container.contains(range.commonAncestorContainer)) {
          setSelection(null)
          return
        }
        const text = active.toString().trim()
        if (!text) {
          setSelection(null)
          return
        }
        const rect = range.getBoundingClientRect()
        setSelection({
          text: text.slice(0, 2000),
          x: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
          y: rect.top,
        })
      }, [])

      const openSetup = React.useCallback(() => setScreen({ kind: 'setup' }), [])

      const disposeChat = React.useCallback(() => {
        const current = chatRef.current
        chatRef.current = null
        if (!current) return
        try {
          current.unsubscribe()
        } catch {
          // The event source may already be disposed with its session.
        }
        try {
          current.reference.release()
        } catch {
          // The session may already be gone.
        }
      }, [])

      const releaseChat = React.useCallback(() => {
        disposeChat()
        setChatBinding(null)
        setEntries([])
        setHasMore(false)
      }, [disposeChat])

      const bindSession = React.useCallback(sessionId => {
        if (!sessionId) {
          releaseChat()
          return null
        }
        if (chatRef.current?.sessionId === sessionId) return chatRef.current.reference
        releaseChat()
        setChatError('')
        let reference
        try {
          reference = runtime.sessions.retain(sessionId, { source: 'controllerOperation' })
        } catch (error) {
          setChatError(`${t('loadFailed')}：${messageOf(error)}`)
          return null
        }
        const source = reference.binding.eventSource
        const update = () => {
          const value = source.getSnapshot()
          setEntries(value.entries)
          setHasMore(value.hasMore)
        }
        update()
        const unsubscribe = source.subscribe(update)
        const record = { sessionId, reference, unsubscribe }
        chatRef.current = record
        setChatBinding(record)
        reference.ready.catch(error => {
          if (chatRef.current === record) {
            setChatError(`${t('loadFailed')}：${messageOf(error)}`)
          }
        })
        return reference
      }, [releaseChat, t])

      React.useEffect(() => {
        if (!activeSessionId) {
          releaseChat()
          return
        }
        bindSession(activeSessionId)
      }, [activeSessionId, bindSession, releaseChat])

      React.useEffect(() => () => disposeChat(), [disposeChat])

      const lastEntrySeq = entries.length > 0 ? entries[entries.length - 1]?.event?.seq ?? null : null

      React.useEffect(() => {
        const element = chatBodyRef.current
        if (element) element.scrollTop = element.scrollHeight
      }, [lastEntrySeq, sending, chatBinding, chatOpen])

      const sessionSnapshot = React.useSyncExternalStore(
        React.useCallback(callback => {
          const reference = chatBinding?.reference
          return reference ? reference.binding.session.subscribe(callback) : () => {}
        }, [chatBinding]),
        React.useCallback(() => chatBinding?.reference?.binding.session.getSnapshot() ?? null, [chatBinding]),
      )
      const running = Boolean(sessionSnapshot?.running)
      const messages = React.useMemo(() => foldTranscript(entries).slice(-50), [entries])

      const send = React.useCallback(async () => {
        const text = draft.trim()
        if (!text || sending || screen.kind !== 'book') return
        if (!workspaceId) {
          setChatError(t('chatDisabled'))
          return
        }
        const book = screen.detail.book
        setChatError('')
        setSending(true)

        const createSession = async () => {
          let sessionId
          if (typeof runtime.sessions.create === 'function') {
            try {
              sessionId = await runtime.sessions.create({ workspaceId })
            } catch {
              sessionId = undefined
            }
          }
          if (!sessionId) {
            sessionId = await runtime.uiWorkspace.connectWorkspace(workspaceId)
            runtime.layout.selectPanel('dsh-reader')
          }
          await call('session', { bookId: book.id, sessionId })
          rememberSession(book.id, sessionId)
          const reference = bindSession(sessionId)
          if (!reference) throw new Error(t('loadFailed'))
          return reference
        }

        try {
          let reference = chatRef.current?.reference
          if (!reference) reference = await createSession()
          try {
            await reference.ready
          } catch {
            await call('session', { bookId: book.id, sessionId: null }).catch(() => {})
            releaseChat()
            reference = await createSession()
            await reference.ready
          }
          const result = await reference.binding.session.prompt([{ type: 'text', text }], 'queue')
          if (result && result.ok === false) {
            throw new Error(result.error?.message ?? t('sendFailed'))
          }
          setDraft('')
        } catch (error) {
          setChatError(`${t('sendFailed')}：${messageOf(error)}`)
        } finally {
          setSending(false)
        }
      }, [draft, sending, screen, workspaceId, rememberSession, bindSession, releaseChat, t])

      const loadEarlier = React.useCallback(async () => {
        const reference = chatRef.current?.reference
        if (!reference || loadingEarlier) return
        setLoadingEarlier(true)
        setChatError('')
        try {
          await reference.binding.session.loadOlder()
        } catch (error) {
          setChatError(`${t('loadFailed')}：${messageOf(error)}`)
        } finally {
          setLoadingEarlier(false)
        }
      }, [loadingEarlier, t])

      const headerTitle = screen.kind === 'book'
        ? screen.detail.book.title
        : screen.kind === 'unsupported'
          ? screen.book.title
          : screen.kind === 'setup'
            ? t('setupTitle')
            : snapshot?.settings.libraryDir ? t('library') : t('setupTitle')
      const headerSubtitle = screen.kind === 'book'
        ? screen.content.title
        : snapshot?.settings.libraryDir ?? ''

      const chatBody = h('div', { className: 'dsh-reader-chat-body', ref: chatBodyRef },
        hasMore
          ? h('button', {
            type: 'button',
            className: 'dsh-reader-chat-more',
            disabled: loadingEarlier,
            onClick: () => void loadEarlier(),
          }, loadingEarlier ? t('loading') : t('loadEarlier'))
          : null,
        messages.length === 0
          ? h('div', { className: 'dsh-reader-chat-empty' },
            workspaceId ? t('chatEmpty') : t('chatDisabled'))
          : messages.map(message => h('div', {
            key: message.key,
            className: 'dsh-reader-msg',
            'data-role': message.role,
          },
          h('div', { className: 'dsh-reader-msg-role' },
            message.role === 'user' ? t('you') : t('assistant')),
          h('div', { className: 'dsh-reader-msg-text' }, message.text))),
        sending || running
          ? h('div', { className: 'dsh-reader-chat-thinking' },
            sending ? t('sending') : t('thinking'))
          : null)

      const chatCompose = h('div', { className: 'dsh-reader-chat-compose' },
        h('textarea', {
          ref: chatInputRef,
          value: draft,
          rows: 3,
          placeholder: workspaceId ? t('chatPlaceholder') : t('chatDisabled'),
          disabled: !workspaceId,
          onChange: event => setDraft(event.target.value),
          onKeyDown: event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              void send()
            }
          },
        }),
        h('div', { className: 'dsh-reader-chat-compose-row' },
          h('span', { className: 'dsh-reader-chat-hint' }, workspaceId ? 'Enter / Shift+Enter' : ''),
          h('button', {
            type: 'button',
            className: 'dsh-reader-chat-send',
            disabled: !draft.trim() || sending || !workspaceId,
            onClick: () => void send(),
          }, sending ? t('sending') : t('send'))))

      const chatPanel = chatOpen
        ? h('aside', { className: 'dsh-reader-chat' },
          h('div', { className: 'dsh-reader-chat-head' },
            h('span', { className: 'dsh-reader-chat-title' }, t('companion')),
            h('button', {
              type: 'button',
              className: 'dsh-reader-chat-close',
              onClick: () => setChatOpen(false),
            }, t('closeChat'))),
          chatBody,
          chatError ? h('div', { className: 'dsh-reader-chat-error' }, chatError) : null,
          chatCompose)
        : null

      const bookView = screen.kind === 'book'
        ? h('div', {
          className: 'dsh-reader-book',
          'data-toc': tocOpen ? 'true' : 'false',
          'data-chat': chatOpen ? 'true' : 'false',
        },
        tocOpen ? h(Toc, {
          t,
          detail: screen.detail,
          activeChapter: screen.content.chapterId,
          onSelect: chapterId => void selectChapter(screen.detail.book.id, chapterId),
        }) : null,
        h('div', {
          className: 'dsh-reader-reader',
          ref: contentRef,
          style: { fontSize },
          onMouseUp: onContentMouseUp,
        },
        h('div', { className: 'dsh-reader-reader-inner' },
          h('h1', { className: 'dsh-reader-chapter-title' }, screen.content.title),
          renderBlocks(screen.content.blocks, screen.content.chapterId))),
        chatOpen
          ? h('button', {
            type: 'button',
            className: 'dsh-reader-chat-backdrop',
            'aria-label': t('closeChat'),
            onClick: () => setChatOpen(false),
          })
          : null,
        chatPanel)
        : null

      return h('div', { className: 'dsh-reader-panel' },
        h('div', { className: 'dsh-reader-header' },
          h('div', { className: 'dsh-reader-header-main' },
            screen.kind !== 'library'
              ? h('button', {
                type: 'button',
                className: 'dsh-reader-icon-btn',
                title: t('back'),
                onClick: backToLibrary,
              }, '←')
              : null,
            h('div', { style: { minWidth: 0 } },
              h('div', { className: 'dsh-reader-title' }, headerTitle),
              headerSubtitle ? h('div', { className: 'dsh-reader-subtitle' }, headerSubtitle) : null)),
          h('div', { className: 'dsh-reader-header-actions' },
            screen.kind === 'book'
              ? h('button', {
                type: 'button',
                className: 'dsh-reader-icon-btn',
                title: t('companion'),
                onClick: () => setChatOpen(previous => !previous),
              }, t('companion'))
              : null,
            screen.kind === 'book'
              ? h('button', {
                type: 'button',
                className: 'dsh-reader-icon-btn',
                title: t('toc'),
                onClick: () => setTocOpen(previous => !previous),
              }, '☰')
              : null,
            screen.kind === 'book'
              ? h('button', {
                type: 'button',
                className: 'dsh-reader-icon-btn',
                title: t('fontSize'),
                onClick: () => setFontSize(previous => Math.max(14, previous - 1)),
              }, 'A-')
              : null,
            screen.kind === 'book'
              ? h('button', {
                type: 'button',
                className: 'dsh-reader-icon-btn',
                title: t('fontSize'),
                onClick: () => setFontSize(previous => Math.min(24, previous + 1)),
              }, 'A+')
              : null)),
        error ? h('div', { className: 'dsh-reader-error' }, error) : null,
        !snapshot
          ? h('div', { className: 'dsh-reader-muted' }, busy ? t('loading') : t('loadFailed'))
          : screen.kind === 'setup' || !snapshot.settings.libraryDir
            ? h(Setup, {
              t,
              initialPath: snapshot.settings.libraryDir ?? '',
              busy,
              onConfigure: configure,
              onPick: pickDirectory,
              onCancel: snapshot.settings.libraryDir
                ? () => setScreen({ kind: 'library' })
                : null,
            })
            : screen.kind === 'library'
              ? h(Library, {
                t,
                snapshot,
                busy,
                onOpen: openBook,
                onRefresh: refresh,
                onSettings: openSetup,
              })
              : screen.kind === 'unsupported'
                ? h('div', { className: 'dsh-reader-empty' },
                  h('h2', null, screen.book.title),
                  h('p', null, t('unsupportedHint')),
                  h('button', {
                    type: 'button',
                    className: 'dsh-reader-secondary',
                    onClick: backToLibrary,
                  }, t('back')))
                : bookView,
        selection
          ? h('div', {
            className: 'dsh-reader-selection',
            style: { left: selection.x, top: Math.max(8, selection.y - 48) },
            onMouseDown: event => event.preventDefault(),
          },
          h('button', { type: 'button', onClick: () => prefill('explain') }, t('explain')),
          h('button', { type: 'button', onClick: () => prefill('summarize') }, t('summarize')),
          h('button', { type: 'button', onClick: () => prefill('translate') }, t('translate')))
          : null)
    }

    return {
      name: 'dsh-reader-client',
      inject: ['slots', 'layout', 'locale', 'connection', 'sessions', 'uiWorkspace'],
      foldTranscript,
      apply(ctx) {
        runtime = ctx
        boundText = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-reader: dictionaries')
        ctx.effect(
          () => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
            name: 'sidebar.panellist',
            id: 'dsh-reader',
            order: 20,
            label: () => boundText('panel'),
            locale: NS,
          }, PanelIcon)),
          'dsh-reader: sidebar entry',
        )
        ctx.effect(
          () => ctx.slots.inject('main', () => ctx.slots.register({
            name: 'main',
            key: 'dsh-reader',
            locale: NS,
          }, ReaderPanel)),
          'dsh-reader: main panel',
        )
      },
    }
  },
})
