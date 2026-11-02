var __dshReaderBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/client/index.js
  var index_exports = {};
  __export(index_exports, {
    create: () => create
  });

  // src/client/helpers.js
  function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
  }
  function formatSize(bytes) {
    if (!Number.isFinite(bytes)) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  function textOfContent(content) {
    if (typeof content === "string") return content.trim();
    if (!Array.isArray(content)) return "";
    return content.filter((block) => block && block.type === "text" && typeof block.text === "string").map((block) => block.text).join("\n").trim();
  }
  function foldTranscript(entries) {
    const messages = [];
    for (const entry of entries ?? []) {
      if (!entry || entry.type !== "event" || !entry.event) continue;
      const event = entry.event;
      if (event.type !== "user/message" && event.type !== "assistant/message") continue;
      const data = event.data ?? {};
      const message = data.message ?? data;
      const source = message.source ?? data.source;
      if (event.type === "user/message" && source && source.kind !== "user") continue;
      const text = textOfContent(message.content ?? data.content);
      if (!text) continue;
      messages.push({
        key: `${event.type}-${event.seq ?? messages.length}`,
        role: event.type === "user/message" ? "user" : "assistant",
        text
      });
    }
    return messages;
  }
  var CHAT_WIDTH_KEY = "dsh-reader.chat-width";
  var READER_PALETTE_KEY = "dsh-reader.palette";
  var READER_PALETTE_IDS = ["auto", "light", "dark", "sepia", "green", "night"];
  var READER_PALETTES = {
    auto: {
      id: "auto",
      bg: "var(--dsw-alias-bg-base)",
      fg: "var(--dsw-alias-label-primary)",
      muted: "var(--dsw-alias-label-secondary)",
      border: "var(--dsw-alias-border-l2)",
      selection: "rgba(64,128,255,.30)",
      highlight: "rgba(245,197,66,.35)"
    },
    light: {
      id: "light",
      bg: "#ffffff",
      fg: "#1f2328",
      muted: "#5b6573",
      border: "#d8dee6",
      selection: "rgba(64,128,255,.22)",
      highlight: "rgba(245,197,66,.45)"
    },
    dark: {
      id: "dark",
      bg: "#1b1b22",
      fg: "#e6e6ea",
      muted: "#a0a0aa",
      border: "#33333d",
      selection: "rgba(96,160,255,.35)",
      highlight: "rgba(245,197,66,.35)"
    },
    sepia: {
      id: "sepia",
      bg: "#f4ecd8",
      fg: "#4b3a2a",
      muted: "#7a6652",
      border: "#d8c9ad",
      selection: "rgba(180,120,40,.25)",
      highlight: "rgba(220,170,70,.45)"
    },
    green: {
      id: "green",
      bg: "#dbe9d5",
      fg: "#1f3a2a",
      muted: "#4f6b58",
      border: "#b9cfae",
      selection: "rgba(40,120,70,.22)",
      highlight: "rgba(220,180,60,.45)"
    },
    night: {
      id: "night",
      bg: "#0b0b0d",
      fg: "#c9c9cf",
      muted: "#7d7d87",
      border: "#24242b",
      selection: "rgba(90,140,220,.35)",
      highlight: "rgba(200,160,60,.35)"
    }
  };
  function resolveReaderPalette(id) {
    return READER_PALETTES[id] ?? READER_PALETTES.auto;
  }
  function readPaletteId() {
    try {
      const value = window.localStorage.getItem(READER_PALETTE_KEY);
      return READER_PALETTES[value] ? value : "auto";
    } catch {
      return "auto";
    }
  }
  function savePaletteId(id) {
    try {
      window.localStorage.setItem(READER_PALETTE_KEY, id);
    } catch {
    }
  }
  function paletteCssColors(palette) {
    if (palette.id !== "auto") {
      return { bg: palette.bg, fg: palette.fg, selection: palette.selection, highlight: palette.highlight };
    }
    let css = null;
    try {
      css = getComputedStyle(document.documentElement);
    } catch {
      css = null;
    }
    const bg = css?.getPropertyValue("--dsw-alias-bg-base").trim() ?? "";
    const fg = css?.getPropertyValue("--dsw-alias-label-primary").trim() ?? "";
    const dark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? true;
    return {
      bg: bg || (dark ? "#1b1b22" : "#ffffff"),
      fg: fg || (dark ? "#e6e6ea" : "#1f2328"),
      selection: palette.selection,
      highlight: palette.highlight
    };
  }
  function applyPaletteToFrame(frame, palette) {
    const doc = frame?.contentDocument;
    if (!doc) return;
    const colors = paletteCssColors(palette);
    let style = doc.querySelector("style[data-dsh-palette]");
    if (!style) {
      style = doc.createElement("style");
      style.setAttribute("data-dsh-palette", "");
      (doc.head ?? doc.documentElement)?.appendChild(style);
    }
    style.textContent = [
      `html,body{background:${colors.bg}!important;color:${colors.fg}!important}`,
      `body :is(p,div,span,li,blockquote,td,th,h1,h2,h3,h4,h5,h6){color:inherit!important}`,
      `::selection{background:${colors.selection}}`
    ].join("");
  }
  function findNoteOccurrence(text, quote, preferredOffset = 0) {
    if (typeof text !== "string" || typeof quote !== "string" || !quote) return null;
    const preferred = Number.isFinite(Number(preferredOffset)) ? Number(preferredOffset) : 0;
    let best = null;
    let index = text.indexOf(quote);
    while (index !== -1) {
      const distance = Math.abs(index - preferred);
      if (!best || distance < best.distance) {
        best = { start: index, end: index + quote.length, distance };
      }
      index = text.indexOf(quote, index + 1);
    }
    return best ? { start: best.start, end: best.end } : null;
  }
  function collectTextNodes2(root) {
    if (!root) return { nodes: [], text: "" };
    const doc = root.ownerDocument ?? document;
    const view = doc.defaultView ?? window;
    const walker = doc.createTreeWalker(root, view.NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (!parent?.closest(".dsh-reader-note-layer")) nodes.push(node);
      node = walker.nextNode();
    }
    return { nodes, text: nodes.map((entry) => entry.nodeValue ?? "").join("") };
  }
  function rangeForNote2(root, start, end) {
    const { nodes } = collectTextNodes2(root);
    const doc = root.ownerDocument ?? document;
    const range = doc.createRange();
    let cursor = 0;
    let started = false;
    for (const node of nodes) {
      const length = node.nodeValue?.length ?? 0;
      const nodeStart = cursor;
      const nodeEnd = cursor + length;
      if (!started && start >= nodeStart && start <= nodeEnd) {
        range.setStart(node, Math.max(0, Math.min(length, start - nodeStart)));
        started = true;
      }
      if (started && end >= nodeStart && end <= nodeEnd) {
        range.setEnd(node, Math.max(0, Math.min(length, end - nodeStart)));
        return range;
      }
      cursor = nodeEnd;
    }
    return null;
  }
  function applyEpubNoteMarks(frame, notes, chapterId, palette, onOpen, jumpNoteId) {
    const doc = frame?.contentDocument;
    if (!doc?.body) return { cleanup: () => {
    }, jumped: false };
    for (const mark of [...doc.querySelectorAll("mark[data-note-id]")]) {
      const parent = mark.parentNode;
      if (!parent) continue;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize?.();
    }
    const relevant = notes.filter((note) => note.chapterId === chapterId && note.quote);
    let style = doc.querySelector("style[data-dsh-note]");
    if (!style) {
      style = doc.createElement("style");
      style.setAttribute("data-dsh-note", "");
      (doc.head ?? doc.documentElement)?.appendChild(style);
    }
    style.textContent = `mark.dsh-reader-note-mark{background:${paletteCssColors(palette).highlight}!important;color:inherit!important;cursor:pointer;border-radius:2px}mark.dsh-reader-note-mark.dsh-reader-note-flash{box-shadow:0 0 0 2px ${paletteCssColors(palette).selection}}`;
    const onClick = (event) => {
      const mark = event.target.closest?.("mark[data-note-id]");
      if (!mark) return;
      const note = notes.find((entry) => entry.id === mark.dataset.noteId);
      if (note) onOpen(note);
    };
    doc.addEventListener("click", onClick);
    const text = doc.body.textContent ?? "";
    for (const note of relevant) {
      const match = findNoteOccurrence(text, note.quote, note.offset);
      if (!match) continue;
      const range = rangeForNote2(doc.body, match.start, match.end);
      if (!range) continue;
      const mark = doc.createElement("mark");
      mark.className = "dsh-reader-note-mark";
      mark.dataset.noteId = note.id;
      mark.appendChild(range.extractContents());
      range.insertNode(mark);
    }
    let jumped = false;
    if (jumpNoteId) {
      const target = doc.querySelector(`mark[data-note-id="${jumpNoteId}"]`);
      if (target) {
        target.scrollIntoView({ block: "center", behavior: "auto" });
        target.classList.add("dsh-reader-note-flash");
        setTimeout(() => target.classList.remove("dsh-reader-note-flash"), 1600);
        jumped = true;
      }
    }
    return {
      cleanup: () => doc.removeEventListener("click", onClick),
      jumped
    };
  }
  var CHAT_WIDTH_DEFAULT = 340;
  var CHAT_WIDTH_MIN = 280;
  var CHAT_WIDTH_MAX = 560;
  function clampChatWidth(value, viewportWidth) {
    const numeric = Number.isFinite(value) ? value : CHAT_WIDTH_DEFAULT;
    const available = Number.isFinite(viewportWidth) ? viewportWidth - 230 - 360 : CHAT_WIDTH_MAX;
    const upper = Math.min(CHAT_WIDTH_MAX, Math.max(CHAT_WIDTH_MIN, available));
    return Math.round(Math.min(Math.max(numeric, CHAT_WIDTH_MIN), upper));
  }
  function readChatWidth() {
    let stored = CHAT_WIDTH_DEFAULT;
    try {
      const raw = window.localStorage.getItem(CHAT_WIDTH_KEY);
      if (raw !== null && Number.isFinite(Number(raw))) stored = Number(raw);
    } catch {
    }
    return clampChatWidth(stored, window.innerWidth > 1100 ? window.innerWidth : 1440);
  }
  function saveChatWidth(width) {
    try {
      window.localStorage.setItem(CHAT_WIDTH_KEY, String(width));
    } catch {
    }
  }
  function parseMarkdownBlocks(text) {
    const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
    const blocks = [];
    let paragraph = [];
    let inFence = false;
    let fenceLang = "";
    let fenceLines = [];
    const flushParagraph = () => {
      const value = paragraph.join("\n").trim();
      if (value) blocks.push({ type: "p", text: value });
      paragraph = [];
    };
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (inFence) {
        if (/^\s*(```|~~~)\s*$/.test(line)) {
          blocks.push({ type: "code", text: fenceLines.join("\n"), lang: fenceLang });
          inFence = false;
          fenceLang = "";
          fenceLines = [];
        } else {
          fenceLines.push(line);
        }
        continue;
      }
      const fence = /^\s*(```|~~~)([A-Za-z0-9_+-]*)\s*$/.exec(line);
      if (fence) {
        flushParagraph();
        inFence = true;
        fenceLang = fence[2] || "";
        continue;
      }
      if (!line.trim()) {
        flushParagraph();
        continue;
      }
      const heading = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
      if (heading) {
        flushParagraph();
        blocks.push({ type: "h", level: heading[1].length, text: heading[2] });
        continue;
      }
      if (/^\s*(?:---|\*\*\*|___)\s*$/.test(line)) {
        flushParagraph();
        blocks.push({ type: "hr" });
        continue;
      }
      if (/^>\s?/.test(line)) {
        flushParagraph();
        const quoteLines = [];
        while (index < lines.length && /^>\s?/.test(lines[index])) {
          quoteLines.push(lines[index].replace(/^>\s?/, ""));
          index += 1;
        }
        index -= 1;
        blocks.push({ type: "quote", text: quoteLines.join("\n") });
        continue;
      }
      const ordered = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
      if (ordered) {
        flushParagraph();
        blocks.push({ type: "li", ordered: true, index: Number(ordered[1]), text: ordered[2] });
        continue;
      }
      const bullet = /^\s*[-*+]\s+(.*)$/.exec(line);
      if (bullet) {
        flushParagraph();
        blocks.push({ type: "li", text: bullet[1] });
        continue;
      }
      paragraph.push(line);
    }
    if (inFence) {
      blocks.push({ type: "code", text: fenceLines.join("\n"), lang: fenceLang });
    }
    flushParagraph();
    return blocks;
  }
  function blockIndexAtOffset(blocks, offset) {
    if (!Array.isArray(blocks) || blocks.length === 0) return 0;
    const wanted = Number.isFinite(offset) ? offset : 0;
    let start = 0;
    let fallback = 0;
    for (let index = 0; index < blocks.length; index += 1) {
      const text = typeof blocks[index]?.text === "string" ? blocks[index].text : "";
      if (wanted < start) break;
      fallback = index;
      if (wanted <= start + text.length) return index;
      start += text.length + 2;
    }
    return fallback;
  }

  // src/client/locale.js
  var zh = {
    panel: "阅读",
    library: "书库",
    rescan: "重新扫描",
    settings: "设置",
    cancel: "取消",
    setupTitle: "设置书库",
    setupHint: "选择一个存放电子书的目录。创建后它会在左侧成为一个独立工作区，每本书的伴读会话也保存在那里。",
    chooseDir: "选择目录",
    create: "创建书库",
    pathPlaceholder: "例如 E:\\Books",
    empty: "这个目录里还没有可阅读的电子书。",
    emptyHint: "支持 .txt、.md、.epub 与 .pdf；PDF 仅抽取文本层，扫描版需要 OCR。",
    back: "返回书库",
    toc: "目录",
    reading: "阅读",
    unsupported: "暂不支持",
    unsupportedHint: "这本书暂时无法打开；请检查文件是否损坏，或 PDF 是否缺少可提取的文本层。",
    unread: "未读",
    explain: "解释",
    summarize: "总结",
    translate: "翻译",
    loadFailed: "加载失败",
    configureFailed: "创建书库失败",
    retry: "重试",
    loading: "加载中…",
    noToc: "没有目录",
    fontSize: "字号",
    palette: "配色",
    paletteAuto: "跟随 DSH",
    paletteLight: "浅色",
    paletteDark: "深色",
    paletteSepia: "羊皮纸",
    paletteGreen: "护眼绿",
    paletteNight: "夜间",
    companion: "伴读",
    chatEmpty: "针对这本书提问，或在正文中选中文字后使用“解释 / 总结 / 翻译”。",
    chatPlaceholder: "针对这本书提问…",
    send: "发送",
    sending: "发送中…",
    thinking: "思考中…",
    loadEarlier: "加载更早",
    you: "你",
    assistant: "伴读",
    closeChat: "收起伴读",
    resizeChat: "调整伴读栏宽度",
    chatDisabled: "先在设置中创建书库工作区。",
    sendFailed: "发送失败",
    explainPrompt: "请解释这段文字。",
    summarizePrompt: "请总结这段文字。",
    translatePrompt: "请把这段文字翻译成中文。",
    search: "搜索",
    searchPlaceholder: "搜索本书…",
    searching: "搜索中…",
    searchEmpty: "没有找到匹配的内容。",
    searchFailed: "搜索失败",
    searchTruncated: "结果过多，仅显示前 30 条。",
    closeSearch: "关闭搜索",
    notes: "笔记",
    noteAction: "笔记",
    noteDialogTitle: "添加笔记",
    noteEditTitle: "编辑笔记",
    notePlaceholder: "写下你的想法…",
    save: "保存",
    noteSaving: "保存中…",
    noteEmpty: "这本书还没有笔记。",
    notesFailed: "笔记加载失败",
    noteSaveFailed: "笔记保存失败",
    noteDeleteFailed: "笔记删除失败",
    delete: "删除",
    jump: "跳转"
  };
  var en = {
    panel: "Reader",
    library: "Library",
    rescan: "Rescan",
    settings: "Settings",
    cancel: "Cancel",
    setupTitle: "Set up your library",
    setupHint: "Choose a folder that holds your ebooks. It becomes a dedicated workspace, and every book keeps its companion session there.",
    chooseDir: "Choose folder",
    create: "Create library",
    pathPlaceholder: "e.g. E:\\Books",
    empty: "No readable ebooks in this folder yet.",
    emptyHint: "TXT, Markdown, EPUB and PDF are supported; PDF reads only its text layer, so scanned files need OCR.",
    back: "Back to library",
    toc: "Contents",
    reading: "Reading",
    unsupported: "Not supported",
    unsupportedHint: "This book cannot be opened yet; check whether the file is damaged or the PDF has no extractable text layer.",
    unread: "Unread",
    explain: "Explain",
    summarize: "Summarize",
    translate: "Translate",
    loadFailed: "Could not load",
    configureFailed: "Could not create the library",
    retry: "Retry",
    loading: "Loading…",
    noToc: "No contents",
    fontSize: "Font size",
    palette: "Palette",
    paletteAuto: "Follow DSH",
    paletteLight: "Light",
    paletteDark: "Dark",
    paletteSepia: "Sepia",
    paletteGreen: "Green",
    paletteNight: "Night",
    companion: "Companion",
    chatEmpty: "Ask about this book, or select text and use Explain / Summarize / Translate.",
    chatPlaceholder: "Ask about this book…",
    send: "Send",
    sending: "Sending…",
    thinking: "Thinking…",
    loadEarlier: "Load earlier",
    you: "You",
    assistant: "Companion",
    closeChat: "Hide companion",
    resizeChat: "Resize companion panel",
    chatDisabled: "Create a library workspace in Settings first.",
    sendFailed: "Could not send",
    explainPrompt: "Please explain this passage.",
    summarizePrompt: "Please summarize this passage.",
    translatePrompt: "Please translate this passage into Chinese.",
    search: "Search",
    searchPlaceholder: "Search this book…",
    searching: "Searching…",
    searchEmpty: "No matches found.",
    searchFailed: "Search failed",
    searchTruncated: "Too many matches; showing the first 30.",
    closeSearch: "Close search",
    notes: "Notes",
    noteAction: "Note",
    noteDialogTitle: "Add note",
    noteEditTitle: "Edit note",
    notePlaceholder: "Write your note…",
    save: "Save",
    noteSaving: "Saving…",
    noteEmpty: "No notes for this book yet.",
    notesFailed: "Could not load notes",
    noteSaveFailed: "Could not save the note",
    noteDeleteFailed: "Could not delete the note",
    delete: "Delete",
    jump: "Jump"
  };

  // src/client/styles.js
  var CSS = `
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
.dsh-reader-book{flex:1;min-height:0;display:grid;position:relative;grid-template-columns:230px minmax(0,1fr) var(--dsh-reader-chat-width,340px)}
.dsh-reader-book[data-toc="false"]{grid-template-columns:minmax(0,1fr) var(--dsh-reader-chat-width,340px)}
.dsh-reader-book[data-chat="false"]{grid-template-columns:230px minmax(0,1fr)}
.dsh-reader-book[data-toc="false"][data-chat="false"]{grid-template-columns:minmax(0,1fr)}
.dsh-reader-toc{min-height:0;overflow:auto;padding:12px 10px 40px;border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dsh-reader-toc-title{padding:4px 8px 8px;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600;letter-spacing:.04em}
.dsh-reader-toc-list{display:flex;flex-direction:column;gap:2px}
.dsh-reader-toc-item{display:block;width:100%;padding:7px 8px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);text-align:left;font:inherit;line-height:1.45;cursor:pointer}
.dsh-reader-toc-item:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-reader-toc-item[data-active="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
.dsh-reader-toc-item:disabled{opacity:.45;cursor:default}
.dsh-reader-chat{position:relative;min-height:0;display:flex;flex-direction:column;border-left:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dsh-reader-chat-resizer{position:absolute;left:-3px;top:0;bottom:0;width:6px;z-index:3;cursor:col-resize;background:transparent;border:0;padding:0}
.dsh-reader-chat-resizer:hover,.dsh-reader-chat-resizer:focus-visible{background:var(--dsw-alias-brand-primary);outline:none}
.dsh-reader-chat-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-reader-chat-tabs{display:flex;align-items:center;gap:2px;padding:2px;border-radius:8px;background:var(--dsw-alias-bg-layer-2)}
.dsh-reader-chat-tab{height:24px;padding:0 9px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.dsh-reader-chat-tab:hover{color:var(--dsw-alias-label-primary)}
.dsh-reader-chat-tab[data-active="true"]{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-weight:600}
.dsh-reader-chat-close{height:24px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.dsh-reader-chat-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-reader-chat-body{flex:1;min-height:0;overflow:auto;padding:12px 12px 4px}
.dsh-reader-chat-empty{padding:18px 6px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.7}
.dsh-reader-chat-more{display:block;width:100%;margin-bottom:10px;padding:5px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.dsh-reader-chat-more:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-reader-msg{display:flex;flex-direction:column;gap:5px;margin-bottom:14px;max-width:100%}
.dsh-reader-msg[data-role="user"]{align-items:flex-end;margin-left:28px}
.dsh-reader-msg[data-role="assistant"]{align-items:flex-start;margin-right:28px}
.dsh-reader-msg-role{display:inline-flex;align-items:center;gap:5px;padding:1px 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10.5px;line-height:1.6}
.dsh-reader-msg[data-role="user"] .dsh-reader-msg-role{color:var(--dsw-alias-brand-primary)}
.dsh-reader-msg[data-role="assistant"] .dsh-reader-msg-role::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-brand-primary)}
.dsh-reader-msg-text{max-width:92%;white-space:pre-wrap;word-break:break-word;line-height:1.7;font-size:13px}
.dsh-reader-msg[data-role="user"] .dsh-reader-msg-text{padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;border-top-right-radius:3px;background:var(--dsw-alias-bg-layer-2)}
.dsh-reader-msg[data-role="assistant"] .dsh-reader-md{max-width:92%;padding:2px 0 2px 10px;border-left:2px solid var(--dsw-alias-brand-primary)}
.dsh-reader-md{max-width:92%;min-width:0;font-size:13px;line-height:1.7;word-break:break-word;color:var(--dsw-alias-label-primary)}
.dsh-reader-md p{margin:0 0 .7em;white-space:pre-wrap}
.dsh-reader-md p:last-child{margin-bottom:0}
.dsh-reader-md h3,.dsh-reader-md h4,.dsh-reader-md h5,.dsh-reader-md h6{margin:.9em 0 .35em;line-height:1.4;font-weight:650}
.dsh-reader-md h3:first-child,.dsh-reader-md h4:first-child,.dsh-reader-md h5:first-child,.dsh-reader-md h6:first-child{margin-top:0}
.dsh-reader-md h3{font-size:1.2em}
.dsh-reader-md h4{font-size:1.1em}
.dsh-reader-md h5,.dsh-reader-md h6{font-size:1em}
.dsh-reader-md pre{margin:.6em 0;padding:10px 12px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);overflow:auto;font-size:12px;line-height:1.6}
.dsh-reader-md code{padding:1px 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);font-size:.92em}
.dsh-reader-md pre code{padding:0;background:transparent}
.dsh-reader-md blockquote{margin:.6em 0;padding:2px 0 2px 10px;border-left:2px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:pre-wrap}
.dsh-reader-md a{color:var(--dsw-alias-brand-primary);text-decoration:underline;text-underline-offset:2px}
.dsh-reader-md hr.dsh-reader-md-hr{border:0;border-top:1px solid var(--dsw-alias-border-l2);margin:12px 0}
.dsh-reader-md .dsh-reader-li{margin:0 0 .45em}
.dsh-reader-chat-thinking{color:var(--dsw-alias-label-secondary);font-size:12px;padding:2px 0 10px}
.dsh-reader-chat-error{margin:0 12px 8px;padding:7px 9px;border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.55}
.dsh-reader-notes{flex:1;min-height:0;overflow:auto;padding:10px 12px 16px}
.dsh-reader-note{display:flex;align-items:flex-start;gap:8px;padding:10px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-reader-note:last-child{border-bottom:0}
.dsh-reader-note-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding:0;border:0;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer}
.dsh-reader-note-main:hover .dsh-reader-note-body{color:var(--dsw-alias-brand-primary)}
.dsh-reader-note-chapter{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.5}
.dsh-reader-note-quote{padding-left:8px;border-left:2px solid var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
.dsh-reader-note-body{color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.65;white-space:pre-wrap;word-break:break-word}
.dsh-reader-note-delete{flex:none;height:24px;padding:0 7px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}
.dsh-reader-note-jump{flex:none;height:24px;padding:0 7px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-brand-primary);font:inherit;font-size:11px;cursor:pointer}
.dsh-reader-note-jump:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-reader-note-delete:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary)}
.dsh-reader-note-delete:disabled{opacity:.45;cursor:default}
.dsh-reader-chat-compose{flex:none;padding:10px 12px 12px;border-top:1px solid var(--dsw-alias-border-l2)}
.dsh-reader-chat-compose textarea{display:block;width:100%;box-sizing:border-box;min-height:58px;max-height:140px;padding:8px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.55;resize:vertical}
.dsh-reader-chat-compose textarea:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-reader-chat-compose-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px}
.dsh-reader-chat-hint{color:var(--dsw-alias-label-secondary);font-size:11px}
.dsh-reader-chat-send{height:28px;padding:0 12px;border:0;border-radius:7px;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.dsh-reader-chat-send:disabled{opacity:.45;cursor:default}
.dsh-reader-chat-backdrop{display:none}
.dsh-reader-search{flex:none;max-height:46vh;overflow:auto;padding:10px 18px 12px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dsh-reader-search-bar{display:flex;align-items:center;gap:8px}
.dsh-reader-search-bar input{flex:1;min-width:0;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.dsh-reader-search-bar input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-reader-search-list{display:flex;flex-direction:column;gap:2px;margin-top:8px}
.dsh-reader-search-result{display:flex;flex-direction:column;gap:3px;width:100%;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer}
.dsh-reader-search-result:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-reader-search-chapter{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:600}
.dsh-reader-search-snippet{color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.dsh-reader-search-hint{padding:10px 2px 2px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.6}
.dsh-reader-search-hint[data-error="true"]{color:var(--dsw-alias-state-error-primary)}
.dsh-reader-reader{min-height:0;overflow:auto;padding:28px 40px 90px;background:var(--reader-bg,var(--dsw-alias-bg-base));color:var(--reader-fg,var(--dsw-alias-label-primary))}
.dsh-reader-visual{flex:1;min-height:0;display:flex;flex-direction:column;gap:8px;overflow:auto;padding:12px 20px 50px;background:var(--reader-bg,var(--dsw-alias-bg-base))}
.dsh-reader-visual-bar{flex:none;display:flex;align-items:center;gap:8px;justify-content:center;flex-wrap:wrap;padding:2px 0}
.dsh-reader-page-input{width:56px;height:28px;padding:0 6px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:center}
.dsh-reader-page-total{color:var(--dsw-alias-label-secondary);font-size:12px}
.dsh-reader-palette-select{height:28px;max-width:112px;padding:0 6px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.dsh-reader-pdf-page{position:relative;margin:0 auto;flex:none;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.22)}
.dsh-reader-pdf-page img{position:absolute;inset:0;width:100%;height:100%;display:block;user-select:none;-webkit-user-drag:none}
.dsh-reader-pdf-text{position:absolute;inset:0;overflow:hidden;line-height:1;z-index:1}
.dsh-reader-pdf-text-item{position:absolute;color:transparent;white-space:pre;transform-origin:0 0;user-select:text;cursor:text}
.dsh-reader-pdf-text-item::selection{background:var(--reader-selection,rgba(64,128,255,.35));color:transparent}
.dsh-reader-reader ::selection{background:var(--reader-selection,rgba(64,128,255,.30))}
.dsh-reader-epub-frame{flex:1;min-height:70vh;width:100%;border:0;background:#fff;border-radius:6px}
.dsh-reader-visual-error{display:flex;flex-direction:column;gap:16px;padding:20px;color:var(--dsw-alias-state-error-primary);font-size:13px}
.dsh-reader-visual-error .dsh-reader-reader-inner{color:var(--dsw-alias-label-primary);max-width:760px;margin:0 auto}
.dsh-reader-reader-inner{position:relative;max-width:760px;margin:0 auto;line-height:1.9;color:var(--reader-fg,var(--dsw-alias-label-primary))}
.dsh-reader-note-layer{position:absolute;inset:0;pointer-events:none;z-index:2}
.dsh-reader-note-hit{position:absolute;background:var(--reader-highlight,rgba(245,197,66,.45));border-radius:2px;pointer-events:auto;cursor:pointer;opacity:.8}
.dsh-reader-note-hit:hover{opacity:1}
.dsh-reader-chapter-title{margin:0 0 22px;font-size:22px;line-height:1.35;font-weight:650}
.dsh-reader-reader p{margin:0 0 1.1em;white-space:pre-wrap;word-break:break-word}
.dsh-reader-reader h3{margin:1.6em 0 .6em;font-size:1.08em;line-height:1.4}
.dsh-reader-reader blockquote{margin:1em 0;padding:2px 0 2px 14px;border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.dsh-reader-reader pre{margin:1em 0;padding:12px 14px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);overflow:auto;font-size:12.5px;line-height:1.6}
.dsh-reader-reader code{padding:1px 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);font-size:.92em}
.dsh-reader-reader pre code{padding:0;background:transparent}
.dsh-reader-reader a{color:var(--dsw-alias-brand-primary);text-decoration:underline;text-underline-offset:2px}
.dsh-reader-li{display:flex;gap:8px;margin:0 0 .5em;white-space:pre-wrap}
.dsh-reader-li-marker{color:var(--dsw-alias-label-secondary);flex:none;min-width:1.1em}
.dsh-reader-flash{background:var(--dsw-alias-bg-layer-2);border-radius:4px;transition:background .2s ease}
.dsh-reader-selection{position:fixed;z-index:50;transform:translateX(-50%);display:flex;gap:4px;padding:5px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-overlay);box-shadow:0 10px 34px rgba(0,0,0,.24)}
.dsh-reader-selection button{height:26px;padding:0 9px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.dsh-reader-selection button:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-reader-note-overlay{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.24)}
.dsh-reader-note-dialog{width:min(520px,100%);max-height:min(82vh,620px);display:flex;flex-direction:column;padding:18px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-overlay);box-shadow:0 18px 50px rgba(0,0,0,.28)}
.dsh-reader-note-dialog h3{margin:0 0 10px;font-size:14px;font-weight:650}
.dsh-reader-note-dialog-quote{flex:none;max-height:140px;overflow:auto;margin-bottom:10px;padding:8px 10px;border-left:3px solid var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.dsh-reader-note-dialog textarea{display:block;width:100%;box-sizing:border-box;min-height:88px;max-height:220px;padding:8px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.6;resize:vertical}
.dsh-reader-note-dialog textarea:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-reader-note-dialog-error{margin-top:8px;padding:7px 9px;border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.55}
.dsh-reader-note-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
.dsh-reader-banner{flex:none;padding:8px 18px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-warn-primary);font-size:12.5px;line-height:1.5}
.dsh-reader-error{flex:none;padding:8px 18px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary);font-size:12.5px;line-height:1.5}
.dsh-reader-muted{padding:40px 20px;text-align:center;color:var(--dsw-alias-label-secondary)}
.dsh-reader-spacer{flex:1}
@media (max-width:1100px){.dsh-reader-book{grid-template-columns:230px minmax(0,1fr)!important}.dsh-reader-book[data-toc="false"]{grid-template-columns:minmax(0,1fr)!important}.dsh-reader-chat{position:absolute;top:0;right:0;bottom:0;width:min(360px,92%);z-index:20;box-shadow:-8px 0 30px rgba(0,0,0,.24)}.dsh-reader-chat-resizer{display:none}.dsh-reader-chat-backdrop{display:block;position:absolute;inset:0;z-index:19;border:0;padding:0;background:rgba(0,0,0,.18)}}
@media (max-width:760px){.dsh-reader-book{grid-template-columns:1fr!important}.dsh-reader-toc{display:none}.dsh-reader-reader{padding:20px 18px 80px}}
`;

  // src/client/runtime.js
  var React;
  var h;
  function bindRuntime(require2) {
    React = require2("react");
    h = React.createElement;
  }

  // src/client/views/toc.js
  function Toc({ t, detail, activeChapter, onSelect }) {
    const outline = detail.book.format === "pdf" && Array.isArray(detail.outline) && detail.outline.length > 0 ? detail.outline : null;
    const items = outline ?? detail.toc;
    const activePage = detail.toc.find((item) => item.id === activeChapter)?.page;
    return h(
      "aside",
      { className: "dsh-reader-toc" },
      h("div", { className: "dsh-reader-toc-title" }, t("toc")),
      items.length === 0 ? h("div", { className: "dsh-reader-muted" }, t("noToc")) : h(
        "div",
        { className: "dsh-reader-toc-list" },
        items.map((item) => {
          const chapterId = outline ? item.chapterId ?? detail.toc.find((entry) => entry.page === item.page)?.id : item.id;
          const active = outline ? item.chapterId === activeChapter || item.page === activePage : item.id === activeChapter;
          return h("button", {
            key: item.id,
            type: "button",
            className: "dsh-reader-toc-item",
            "data-active": active ? "true" : "false",
            "data-level": item.level ?? 0,
            disabled: !chapterId,
            style: outline ? { paddingLeft: `${10 + (item.level ?? 0) * 14}px` } : void 0,
            onClick: () => chapterId && onSelect(chapterId)
          }, item.title);
        })
      )
    );
  }

  // src/client/views/markdown.js
  function inline(text, prefix) {
    const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
    const nodes = [];
    let last = 0;
    let index = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > last) nodes.push(text.slice(last, match.index));
      const token = match[0];
      const key = `${prefix}-${index}`;
      index += 1;
      if (token.startsWith("**")) {
        nodes.push(h("strong", { key }, token.slice(2, -2)));
      } else if (token.startsWith("`")) {
        nodes.push(h("code", { key }, token.slice(1, -1)));
      } else if (token.startsWith("*")) {
        nodes.push(h("em", { key }, token.slice(1, -1)));
      } else {
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
        if (link && /^(https?:|mailto:|#)/i.test(link[2])) {
          nodes.push(h("a", { key, href: link[2], target: "_blank", rel: "noreferrer" }, link[1]));
        } else {
          nodes.push(link ? link[1] : token);
        }
      }
      last = match.index + token.length;
    }
    if (last < text.length) nodes.push(text.slice(last));
    return nodes;
  }
  function selectionAnchor(range, container) {
    const startNode = range.startContainer;
    const element = startNode.nodeType === 1 ? startNode : startNode.parentElement;
    const block = element && typeof element.closest === "function" ? element.closest("[data-block-index]") : null;
    if (!block || !container.contains(block)) return null;
    const blockIndex = Number(block.getAttribute("data-block-index"));
    if (!Number.isInteger(blockIndex) || blockIndex < 0) return null;
    const before = range.cloneRange();
    before.selectNodeContents(block);
    before.setEnd(range.startContainer, range.startOffset);
    return { blockIndex, offset: before.toString().length };
  }
  function renderBlocks(blocks, prefix) {
    return blocks.map((block, index) => {
      const key = `${prefix}-${index}`;
      if (block.type === "h") {
        const level = Math.min(6, Math.max(3, block.level ?? 3));
        return h(`h${level}`, { key, "data-block-index": index }, inline(block.text, key));
      }
      if (block.type === "code") {
        return h("pre", { key, "data-block-index": index }, h("code", null, block.text));
      }
      if (block.type === "quote") {
        return h("blockquote", { key, "data-block-index": index }, inline(block.text, key));
      }
      if (block.type === "hr") {
        return h("hr", { key, "data-block-index": index, className: "dsh-reader-md-hr" });
      }
      if (block.type === "li") {
        return h(
          "div",
          { key, "data-block-index": index, className: "dsh-reader-li" },
          h("span", { className: "dsh-reader-li-marker" }, block.ordered ? `${block.index}.` : "•"),
          h("span", null, inline(block.text, key))
        );
      }
      return h("p", { key, "data-block-index": index }, inline(block.text, key));
    });
  }
  function MarkdownMessage({ text, prefix }) {
    return h("div", { className: "dsh-reader-md" }, renderBlocks(parseMarkdownBlocks(text), prefix));
  }

  // src/client/views/panels.js
  function PanelIcon({ size = 20, active }) {
    return h(
      "svg",
      {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        "aria-hidden": true,
        style: { display: "block" }
      },
      h("path", {
        d: "M4 6.5A2.5 2.5 0 0 1 6.5 4H11v15H6.5A2.5 2.5 0 0 0 4 21.5z",
        fill: active ? "currentColor" : "none",
        stroke: "currentColor",
        strokeWidth: 1.6,
        strokeLinejoin: "round",
        opacity: active ? 0.9 : 1
      }),
      h("path", {
        d: "M20 6.5A2.5 2.5 0 0 0 17.5 4H13v15h4.5A2.5 2.5 0 0 1 20 21.5z",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.6,
        strokeLinejoin: "round"
      }),
      h("path", { d: "M12 4v15.5", stroke: "currentColor", strokeWidth: 1.2, opacity: 0.55 })
    );
  }
  function Setup({ t, initialPath, busy, onConfigure, onPick, onCancel }) {
    const [path, setPath] = React.useState(initialPath ?? "");
    const row = h(
      "div",
      { className: "dsh-reader-path-row" },
      h("input", {
        value: path,
        placeholder: t("pathPlaceholder"),
        spellCheck: false,
        onChange: (event) => setPath(event.target.value)
      }),
      h("button", {
        type: "button",
        className: "dsh-reader-secondary",
        onClick: () => onPick(setPath)
      }, t("chooseDir"))
    );
    const actions = h(
      "div",
      { className: "dsh-reader-setup-actions" },
      h("button", {
        type: "button",
        className: "dsh-reader-primary",
        disabled: busy || !path.trim(),
        onClick: () => onConfigure(path.trim())
      }, busy ? t("loading") : t("create")),
      onCancel ? h("button", {
        type: "button",
        className: "dsh-reader-secondary",
        onClick: onCancel
      }, t("cancel")) : null
    );
    return h(
      "div",
      { className: "dsh-reader-setup" },
      h(
        "div",
        { className: "dsh-reader-setup-card" },
        h("h2", null, t("setupTitle")),
        h("p", null, t("setupHint")),
        row,
        actions
      )
    );
  }
  function Library({ t, snapshot, busy, onOpen, onRefresh, onSettings }) {
    const books = snapshot.books;
    return h(
      "div",
      { className: "dsh-reader-body" },
      h(
        "div",
        { className: "dsh-reader-library-head" },
        h("h2", null, `${t("library")} · ${books.length}`),
        h(
          "div",
          { className: "dsh-reader-header-actions" },
          h("button", {
            type: "button",
            className: "dsh-reader-secondary",
            onClick: onSettings
          }, t("settings")),
          h("button", {
            type: "button",
            className: "dsh-reader-secondary",
            disabled: busy,
            onClick: onRefresh
          }, t("rescan"))
        )
      ),
      books.length === 0 ? h(
        "div",
        { className: "dsh-reader-empty" },
        h("h2", null, t("empty")),
        h("p", null, t("emptyHint"))
      ) : h(
        "div",
        { className: "dsh-reader-grid" },
        books.map((book) => h(
          "button",
          {
            key: book.id,
            type: "button",
            className: "dsh-reader-card",
            onClick: () => onOpen(book)
          },
          h("div", { className: "dsh-reader-cover" }, book.format.toUpperCase()),
          h("div", { className: "dsh-reader-card-title" }, book.title),
          h(
            "div",
            { className: "dsh-reader-card-meta" },
            h("span", null, `${formatSize(book.size)}`),
            book.supported ? null : h("span", { className: "dsh-reader-badge" }, t("unsupported"))
          ),
          book.progress ? h(
            "div",
            { className: "dsh-reader-card-meta" },
            h("span", null, book.progress.chapterTitle ?? t("reading"))
          ) : h("div", { className: "dsh-reader-card-meta" }, h("span", null, t("unread")))
        ))
      )
    );
  }

  // src/client/views/notes-search.js
  function NotesBody({ t, notesError, notesLoading, notes, screen, openNote, noteDeletingId, deleteNote }) {
    return h(
      "div",
      { className: "dsh-reader-notes" },
      notesError ? h("div", { className: "dsh-reader-chat-error" }, notesError) : null,
      notesLoading && notes.length === 0 ? h("div", { className: "dsh-reader-chat-empty" }, t("loading")) : notes.length === 0 ? notesError ? null : h("div", { className: "dsh-reader-chat-empty" }, t("noteEmpty")) : notes.map((note) => {
        const chapterTitle = screen.kind === "book" ? screen.detail.toc.find((item) => item.id === note.chapterId)?.title : "";
        return h(
          "div",
          { key: note.id, className: "dsh-reader-note" },
          h(
            "button",
            {
              type: "button",
              className: "dsh-reader-note-main",
              onClick: () => openNote(note)
            },
            h("div", { className: "dsh-reader-note-chapter" }, chapterTitle || t("reading")),
            note.quote ? h("div", { className: "dsh-reader-note-quote" }, note.quote) : null,
            h("div", { className: "dsh-reader-note-body" }, note.note)
          ),
          h("button", {
            type: "button",
            className: "dsh-reader-note-jump",
            title: t("jump"),
            onClick: () => openNote(note)
          }, t("jump")),
          h("button", {
            type: "button",
            className: "dsh-reader-note-delete",
            disabled: noteDeletingId === note.id,
            onClick: () => void deleteNote(note)
          }, noteDeletingId === note.id ? t("loading") : t("delete"))
        );
      })
    );
  }
  function SearchPanel({
    t,
    open,
    screen,
    searchInputRef,
    searchQuery,
    setSearchQuery,
    runSearch,
    searchBusy,
    setSearchOpen,
    searchError,
    searchResults,
    openSearchMatch
  }) {
    if (!open || screen.kind !== "book") return null;
    return h(
      "div",
      { className: "dsh-reader-search" },
      h(
        "div",
        { className: "dsh-reader-search-bar" },
        h("input", {
          ref: searchInputRef,
          value: searchQuery,
          placeholder: t("searchPlaceholder"),
          spellCheck: false,
          onChange: (event) => setSearchQuery(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void runSearch();
            }
          }
        }),
        h("button", {
          type: "button",
          className: "dsh-reader-primary",
          disabled: searchBusy || !searchQuery.trim(),
          onClick: () => void runSearch()
        }, searchBusy ? t("searching") : t("search")),
        h("button", {
          type: "button",
          className: "dsh-reader-icon-btn",
          title: t("closeSearch"),
          "aria-label": t("closeSearch"),
          onClick: () => setSearchOpen(false)
        }, "×")
      ),
      searchError ? h("div", { className: "dsh-reader-search-hint", "data-error": "true" }, searchError) : searchBusy ? h("div", { className: "dsh-reader-search-hint" }, t("searching")) : searchResults === null ? null : searchResults.matches.length === 0 ? h("div", { className: "dsh-reader-search-hint" }, t("searchEmpty")) : h(
        "div",
        { className: "dsh-reader-search-list" },
        searchResults.matches.map((match, index) => h(
          "button",
          {
            key: `${match.chapterId}:${match.offset}:${index}`,
            type: "button",
            className: "dsh-reader-search-result",
            onClick: () => openSearchMatch(match)
          },
          h("div", { className: "dsh-reader-search-chapter" }, match.chapterTitle),
          h("div", { className: "dsh-reader-search-snippet" }, match.snippet)
        )),
        searchResults.truncated ? h("div", { className: "dsh-reader-search-hint" }, t("searchTruncated")) : null
      )
    );
  }

  // src/client/views/visual-reader.js
  function VisualReader({
    t,
    visual,
    screen,
    pageView,
    pageInput,
    setPageInput,
    goPdfPage,
    zoomPdf,
    visualLoading,
    visualError,
    onPdfMouseUp,
    noteLayerRef,
    goEpubChapter,
    onEpubLoad,
    epubFrameRef
  }) {
    if (!visual) return null;
    const pdfPageUrl = visual.kind === "pdf" && screen.kind === "book" ? `/api/dsh-reader/pdf-page?bookId=${encodeURIComponent(screen.detail.book.id)}&page=${visual.page}&scale=${visual.scale}` : "";
    const epubIndex = screen.kind === "book" ? screen.detail.toc.findIndex((item) => item.id === screen.content.chapterId) : -1;
    return visual?.kind === "pdf" ? h(
      "div",
      { className: "dsh-reader-visual" },
      h(
        "div",
        { className: "dsh-reader-visual-bar" },
        h("button", {
          type: "button",
          className: "dsh-reader-secondary",
          disabled: visual.page <= 1,
          onClick: () => goPdfPage(visual.page - 1)
        }, "‹"),
        h("input", {
          className: "dsh-reader-page-input",
          type: "number",
          min: 1,
          max: pageView?.pageCount ?? 1,
          value: pageInput,
          onChange: (event) => setPageInput(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter") goPdfPage(Number(pageInput));
          }
        }),
        h("span", { className: "dsh-reader-page-total" }, `/ ${pageView?.pageCount ?? "?"}`),
        h("button", {
          type: "button",
          className: "dsh-reader-secondary",
          disabled: Boolean(pageView && visual.page >= pageView.pageCount),
          onClick: () => goPdfPage(visual.page + 1)
        }, "›"),
        h("button", { type: "button", className: "dsh-reader-secondary", onClick: () => zoomPdf(-0.25) }, "−"),
        h("span", { className: "dsh-reader-page-total" }, `${Math.round(visual.scale * 100)}%`),
        h("button", { type: "button", className: "dsh-reader-secondary", onClick: () => zoomPdf(0.25) }, "+")
      ),
      visualLoading ? h("div", { className: "dsh-reader-muted" }, t("loading")) : visualError ? h(
        "div",
        { className: "dsh-reader-visual-error" },
        h("div", null, visualError),
        h(
          "div",
          { className: "dsh-reader-reader-inner" },
          renderBlocks(screen.content.blocks, screen.content.chapterId)
        )
      ) : pageView ? h(
        "div",
        {
          className: "dsh-reader-pdf-page",
          style: { width: pageView.width, height: pageView.height }
        },
        h("img", { src: pdfPageUrl, alt: screen.content.title, draggable: false }),
        h(
          "div",
          { className: "dsh-reader-pdf-text", onMouseUp: onPdfMouseUp },
          (pageView.textItems ?? []).map((item, index) => {
            const offset = (pageView.textItems ?? []).slice(0, index).reduce((sum, entry) => sum + entry.text.length, 0);
            return h("span", {
              key: `pdf-text-${index}`,
              className: "dsh-reader-pdf-text-item",
              "data-offset": offset,
              style: {
                left: item.left,
                top: item.top,
                width: item.width,
                height: item.height,
                fontSize: item.fontSize
              }
            }, item.text);
          })
        ),
        h("div", { className: "dsh-reader-note-layer", ref: noteLayerRef })
      ) : null
    ) : visual?.kind === "epub" ? h(
      "div",
      { className: "dsh-reader-visual" },
      h(
        "div",
        { className: "dsh-reader-visual-bar" },
        h("button", {
          type: "button",
          className: "dsh-reader-secondary",
          disabled: epubIndex <= 0,
          onClick: () => goEpubChapter(-1)
        }, "‹"),
        h("span", { className: "dsh-reader-page-total" }, screen.content.title),
        h("button", {
          type: "button",
          className: "dsh-reader-secondary",
          disabled: epubIndex < 0 || epubIndex >= screen.detail.toc.length - 1,
          onClick: () => goEpubChapter(1)
        }, "›")
      ),
      h("iframe", {
        ref: epubFrameRef,
        className: "dsh-reader-epub-frame",
        sandbox: "allow-same-origin",
        title: screen.content.title,
        src: `/api/dsh-reader/epub-doc?bookId=${encodeURIComponent(screen.detail.book.id)}&href=${encodeURIComponent(visual.href)}`,
        onLoad: onEpubLoad
      })
    ) : null;
  }

  // src/client/views/chat-panel.js
  function ChatPanel({
    t,
    chatOpen,
    chatTab,
    setChatTab,
    setChatOpen,
    notesBody,
    chatBody,
    chatError,
    chatCompose,
    chatWidth,
    minWidth,
    maxWidth,
    startResize,
    moveResize,
    endResize,
    resetResize,
    resizeKeyDown
  }) {
    if (!chatOpen) return null;
    return h(
      "aside",
      { className: "dsh-reader-chat" },
      h("div", {
        key: "resizer",
        className: "dsh-reader-chat-resizer",
        role: "separator",
        "aria-orientation": "vertical",
        "aria-label": t("resizeChat"),
        "aria-valuemin": minWidth,
        "aria-valuemax": maxWidth,
        "aria-valuenow": chatWidth,
        tabIndex: 0,
        onPointerDown: startResize,
        onPointerMove: moveResize,
        onPointerUp: endResize,
        onPointerCancel: endResize,
        onDoubleClick: resetResize,
        onKeyDown: resizeKeyDown
      }),
      h(
        "div",
        { className: "dsh-reader-chat-head" },
        h(
          "div",
          { className: "dsh-reader-chat-tabs", role: "tablist" },
          h("button", {
            type: "button",
            role: "tab",
            className: "dsh-reader-chat-tab",
            "data-active": chatTab === "chat" ? "true" : "false",
            "aria-selected": chatTab === "chat",
            onClick: () => setChatTab("chat")
          }, t("companion")),
          h("button", {
            type: "button",
            role: "tab",
            className: "dsh-reader-chat-tab",
            "data-active": chatTab === "notes" ? "true" : "false",
            "aria-selected": chatTab === "notes",
            onClick: () => setChatTab("notes")
          }, t("notes"))
        ),
        h("button", {
          type: "button",
          className: "dsh-reader-chat-close",
          onClick: () => setChatOpen(false)
        }, t("closeChat"))
      ),
      chatTab === "notes" ? notesBody : chatBody,
      chatTab === "chat" && chatError ? h("div", { className: "dsh-reader-chat-error" }, chatError) : null,
      chatTab === "chat" ? chatCompose : null
    );
  }

  // src/client/plugin.js
  function createPlugin(require2) {
    bindRuntime(require2);
    const NS = "dshReader";
    const style = document.createElement("style");
    style.dataset.plugin = "dsh-reader";
    style.dataset.pluginCss = "dsh-reader/reader.css";
    style.textContent = CSS;
    document.head.appendChild(style);
    let runtime;
    let boundText = (key) => key;
    async function call(endpoint, payload) {
      if (!runtime || !runtime.connection) throw new Error("连接服务不可用");
      let response;
      try {
        response = await fetch("/api/dsh-reader", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint, payload: payload ?? null })
        });
      } catch (error) {
        throw new Error(`无法连接阅读器服务：${messageOf(error)}`);
      }
      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error(`阅读器服务返回了无效响应（HTTP ${response.status}）`);
      }
      if (!result || result.ok !== true) {
        throw new Error(result?.error?.message ?? `请求失败（HTTP ${response.status}）`);
      }
      return result.value;
    }
    function ReaderPanel(props) {
      const t = props.t ?? boundText;
      const [snapshot, setSnapshot] = React.useState(null);
      const [screen, setScreen] = React.useState({ kind: "library" });
      const [error, setError] = React.useState("");
      const [busy, setBusy] = React.useState(false);
      const [tocOpen, setTocOpen] = React.useState(true);
      const [fontSize, setFontSize] = React.useState(17);
      const [selection, setSelection] = React.useState(null);
      const [chatOpen, setChatOpen] = React.useState(() => typeof window !== "undefined" ? window.innerWidth > 1100 : true);
      const [chatWidth, setChatWidth] = React.useState(readChatWidth);
      const [draft, setDraft] = React.useState("");
      const [sending, setSending] = React.useState(false);
      const [chatError, setChatError] = React.useState("");
      const [entries, setEntries] = React.useState([]);
      const [hasMore, setHasMore] = React.useState(false);
      const [loadingEarlier, setLoadingEarlier] = React.useState(false);
      const [chatBinding, setChatBinding] = React.useState(null);
      const [chatTab, setChatTab] = React.useState("chat");
      const [notes, setNotes] = React.useState([]);
      const [notesLoading, setNotesLoading] = React.useState(false);
      const [notesError, setNotesError] = React.useState("");
      const [noteDeletingId, setNoteDeletingId] = React.useState(null);
      const [noteEditor, setNoteEditor] = React.useState(null);
      const [noteDraft, setNoteDraft] = React.useState("");
      const [noteSaving, setNoteSaving] = React.useState(false);
      const [noteError, setNoteError] = React.useState("");
      const [searchOpen, setSearchOpen] = React.useState(false);
      const [searchQuery, setSearchQuery] = React.useState("");
      const [searchBusy, setSearchBusy] = React.useState(false);
      const [searchResults, setSearchResults] = React.useState(null);
      const [searchError, setSearchError] = React.useState("");
      const [visual, setVisual] = React.useState(null);
      const [pageView, setPageView] = React.useState(null);
      const [pageInput, setPageInput] = React.useState("1");
      const [visualLoading, setVisualLoading] = React.useState(false);
      const [visualError, setVisualError] = React.useState("");
      const [epubReady, setEpubReady] = React.useState(0);
      const [epubJumpToken, setEpubJumpToken] = React.useState(0);
      const [paletteId, setPaletteId] = React.useState(readPaletteId);
      const palette = resolveReaderPalette(paletteId);
      const chatRef = React.useRef(null);
      const chatBodyRef = React.useRef(null);
      const chatInputRef = React.useRef(null);
      const noteInputRef = React.useRef(null);
      const searchInputRef = React.useRef(null);
      const dragRef = React.useRef(null);
      const chatWidthRef = React.useRef(chatWidth);
      chatWidthRef.current = chatWidth;
      const contentRef = React.useRef(null);
      const noteLayerRef = React.useRef(null);
      const epubNoteCleanupRef = React.useRef(null);
      const pendingEpubNoteRef = React.useRef(null);
      const epubFrameRef = React.useRef(null);
      const epubCleanupRef = React.useRef(null);
      const pendingScrollRef = React.useRef(null);
      const notesRequestRef = React.useRef(0);
      const refresh = React.useCallback(async () => {
        setBusy(true);
        setError("");
        try {
          const value = await call("state");
          setSnapshot(value);
        } catch (cause) {
          setError(`${t("loadFailed")}：${messageOf(cause)}`);
        } finally {
          setBusy(false);
        }
      }, [t]);
      const changePalette = React.useCallback((id) => {
        if (!READER_PALETTES[id]) return;
        setPaletteId(id);
        savePaletteId(id);
      }, []);
      React.useEffect(() => {
        void refresh();
      }, [refresh]);
      const rememberSession = React.useCallback((bookId, sessionId) => {
        setSnapshot((previous) => previous ? {
          ...previous,
          sessions: {
            ...previous.sessions,
            [bookId]: { sessionId, updatedAt: Date.now() }
          }
        } : previous);
      }, []);
      const activeBookId = screen.kind === "book" ? screen.detail.book.id : null;
      const activeChapterId = screen.kind === "book" ? visual?.kind === "pdf" ? screen.detail.toc.find((item) => item.page === visual.page)?.id ?? screen.content.chapterId : screen.content.chapterId : "";
      const activeSessionId = activeBookId && snapshot ? snapshot.sessions?.[activeBookId]?.sessionId ?? null : null;
      const workspaceId = snapshot?.settings?.workspaceId ?? null;
      const visualFor = React.useCallback((detail, item) => {
        if (!detail || !item) return null;
        if (detail.book.format === "pdf") {
          return { kind: "pdf", page: Number.isInteger(item.page) ? item.page : 1, scale: 1.5 };
        }
        if (detail.book.format === "epub" && typeof item.href === "string" && item.href) {
          return { kind: "epub", href: item.href };
        }
        return null;
      }, []);
      const loadNotes = React.useCallback(async () => {
        const bookId = activeBookId;
        if (!bookId) {
          setNotes([]);
          return;
        }
        const request = notesRequestRef.current + 1;
        notesRequestRef.current = request;
        setNotesLoading(true);
        setNotesError("");
        try {
          const value = await call("notes", { action: "list", bookId });
          if (notesRequestRef.current !== request) return;
          const list = Array.isArray(value?.notes) ? value.notes.slice() : [];
          list.sort((left, right) => timestampOf(right.createdAt) - timestampOf(left.createdAt));
          setNotes(list);
        } catch (cause) {
          if (notesRequestRef.current === request) {
            setNotesError(`${t("notesFailed")}：${messageOf(cause)}`);
          }
        } finally {
          if (notesRequestRef.current === request) setNotesLoading(false);
        }
      }, [activeBookId, t]);
      React.useEffect(() => {
        notesRequestRef.current += 1;
        setNotes([]);
        setNotesLoading(false);
        setNotesError("");
        setNoteDeletingId(null);
        setNoteEditor(null);
        setNoteDraft("");
        setNoteError("");
        setSearchOpen(false);
        setSearchQuery("");
        setSearchBusy(false);
        setSearchResults(null);
        setSearchError("");
      }, [activeBookId]);
      React.useEffect(() => {
        if (screen.kind !== "book") return;
        void loadNotes();
      }, [screen.kind, activeBookId, loadNotes]);
      const openBook = React.useCallback(async (book) => {
        setBusy(true);
        setError("");
        pendingScrollRef.current = null;
        try {
          const detail = await call("open", { bookId: book.id });
          if (!detail.supported) {
            setScreen({ kind: "unsupported", book: detail.book });
            return;
          }
          const target = detail.toc.find((item) => item.id === detail.progress?.chapterId) ?? detail.toc[0];
          if (!target) {
            setScreen({ kind: "unsupported", book: detail.book });
            return;
          }
          const content = await call("chapter", { bookId: book.id, chapterId: target.id });
          setVisual(visualFor(detail, target));
          setScreen({ kind: "book", detail, content });
        } catch (cause) {
          setError(`${t("loadFailed")}：${messageOf(cause)}`);
        } finally {
          setBusy(false);
        }
      }, [t, visualFor]);
      const selectChapter = React.useCallback(async (bookId, chapterId, target) => {
        setSelection(null);
        setBusy(true);
        pendingScrollRef.current = null;
        try {
          const content = await call("chapter", { bookId, chapterId });
          pendingScrollRef.current = target ? {
            chapterId: content.chapterId,
            blockIndex: Number.isInteger(target.blockIndex) ? target.blockIndex : blockIndexAtOffset(content.blocks, target.offset),
            flash: Boolean(target.flash)
          } : null;
          setScreen((previous) => previous.kind === "book" ? { ...previous, detail: { ...previous.detail, progress: { chapterId, chapterTitle: content.title } }, content } : previous);
          if (screen.kind === "book") {
            const item = screen.detail.toc.find((entry) => entry.id === chapterId);
            setVisual(visualFor(screen.detail, item));
          }
          void call("progress", { bookId, chapterId, chapterTitle: content.title }).catch(() => {
          });
        } catch (cause) {
          setError(`${t("loadFailed")}：${messageOf(cause)}`);
        } finally {
          setBusy(false);
        }
      }, [screen, t, visualFor]);
      const scrollToBlock = React.useCallback((pending) => {
        const container = contentRef.current;
        if (!container || !Number.isInteger(pending.blockIndex)) return;
        const target = container.querySelector(`[data-block-index="${pending.blockIndex}"]`);
        if (!target) return;
        target.scrollIntoView({ block: "center", behavior: "smooth" });
        if (pending.flash) {
          target.classList.add("dsh-reader-flash");
          window.setTimeout(() => target.classList.remove("dsh-reader-flash"), 1500);
        }
      }, []);
      React.useEffect(() => {
        const pending = pendingScrollRef.current;
        if (!pending || screen.kind !== "book") return;
        if (screen.content.chapterId !== pending.chapterId) return;
        pendingScrollRef.current = null;
        const frame = requestAnimationFrame(() => scrollToBlock(pending));
        return () => cancelAnimationFrame(frame);
      }, [screen, scrollToBlock]);
      React.useEffect(() => {
        if (!visual || visual.kind !== "pdf" || screen.kind !== "book") {
          setPageView(null);
          return;
        }
        let cancelled = false;
        setVisualLoading(true);
        setVisualError("");
        call("pageView", {
          bookId: screen.detail.book.id,
          page: visual.page,
          scale: visual.scale
        }).then((value) => {
          if (cancelled) return;
          setPageView(value);
          setPageInput(String(visual.page));
        }).catch((cause) => {
          if (cancelled) return;
          setPageView(null);
          setVisualError(`${t("loadFailed")}：${messageOf(cause)}`);
        }).finally(() => {
          if (!cancelled) setVisualLoading(false);
        });
        return () => {
          cancelled = true;
        };
      }, [visual, screen, t]);
      React.useEffect(() => {
        if (screen.kind !== "book" || visual?.kind !== "pdf" || !pageView) return;
        if (!activeChapterId || activeChapterId === screen.content.chapterId) return;
        void selectChapter(screen.detail.book.id, activeChapterId);
      }, [activeChapterId, pageView, screen, selectChapter]);
      React.useEffect(() => () => {
        epubCleanupRef.current?.();
        epubCleanupRef.current = null;
      }, [visual?.href]);
      const goPdfPage = React.useCallback((next) => {
        const pageCount = pageView?.pageCount ?? 1;
        const page = Math.min(Math.max(1, next), pageCount);
        setVisual((previous) => previous?.kind === "pdf" ? { ...previous, page } : previous);
      }, [pageView]);
      const zoomPdf = React.useCallback((delta) => {
        setVisual((previous) => previous?.kind === "pdf" ? { ...previous, scale: Math.min(3, Math.max(1, previous.scale + delta)) } : previous);
      }, []);
      const onPdfMouseUp = React.useCallback(() => {
        const active = window.getSelection();
        if (!active || active.isCollapsed || active.rangeCount === 0) return;
        const range = active.getRangeAt(0);
        const node = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
        const span = node?.closest?.("[data-offset]");
        if (!span) return;
        const text = active.toString().trim();
        if (!text) return;
        const base = Number(span.getAttribute("data-offset")) || 0;
        const before = range.cloneRange();
        before.selectNodeContents(span);
        before.setEnd(range.startContainer, range.startOffset);
        const rect = range.getBoundingClientRect();
        setSelection({
          text: text.slice(0, 2e3),
          blockIndex: 0,
          offset: base + before.toString().length,
          x: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
          y: rect.top
        });
      }, []);
      const onEpubLoad = React.useCallback((event) => {
        const frame = event.currentTarget;
        const doc = frame.contentDocument;
        epubCleanupRef.current?.();
        epubCleanupRef.current = null;
        if (!doc) return;
        applyPaletteToFrame(frame, palette);
        setEpubReady((previous) => previous + 1);
        const handler = () => {
          const selected = doc.getSelection();
          const text = selected?.toString().trim();
          if (!text || !selected.rangeCount) return;
          const range = selected.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const frameRect = frame.getBoundingClientRect();
          setSelection({
            text: text.slice(0, 2e3),
            blockIndex: 0,
            offset: 0,
            x: Math.min(Math.max(frameRect.left + rect.left + rect.width / 2, 120), window.innerWidth - 120),
            y: frameRect.top + rect.top
          });
        };
        doc.addEventListener("mouseup", handler);
        epubCleanupRef.current = () => doc.removeEventListener("mouseup", handler);
      }, [palette]);
      React.useEffect(() => {
        if (visual?.kind === "epub" && epubFrameRef.current) {
          applyPaletteToFrame(epubFrameRef.current, palette);
        }
      }, [palette, visual?.href]);
      const goEpubChapter = React.useCallback((delta) => {
        if (screen.kind !== "book") return;
        const index = screen.detail.toc.findIndex((item) => item.id === screen.content.chapterId);
        const next = screen.detail.toc[index + delta];
        if (next) void selectChapter(screen.detail.book.id, next.id);
      }, [screen, selectChapter]);
      const openSearchMatch = React.useCallback((match) => {
        if (!match || screen.kind !== "book") return;
        setSearchOpen(false);
        void selectChapter(screen.detail.book.id, match.chapterId, { offset: match.offset });
      }, [screen, selectChapter]);
      const runSearch = React.useCallback(async () => {
        if (screen.kind !== "book" || searchBusy) return;
        const query = searchQuery.trim();
        if (!query) return;
        setSearchBusy(true);
        setSearchError("");
        setSearchResults(null);
        try {
          const value = await call("search", {
            bookId: screen.detail.book.id,
            query,
            limit: 30
          });
          setSearchResults({
            matches: Array.isArray(value?.matches) ? value.matches : [],
            truncated: Boolean(value?.truncated)
          });
        } catch (cause) {
          setSearchResults({ matches: [], truncated: false });
          setSearchError(`${t("searchFailed")}：${messageOf(cause)}`);
        } finally {
          setSearchBusy(false);
        }
      }, [screen, searchBusy, searchQuery, t]);
      const toggleSearch = React.useCallback(() => {
        setSearchOpen((previous) => !previous);
        setSearchError("");
      }, []);
      React.useEffect(() => {
        if (!searchOpen) return;
        const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
        return () => cancelAnimationFrame(frame);
      }, [searchOpen]);
      const openNote = React.useCallback((note) => {
        if (!note || screen.kind !== "book") return;
        setNoteEditor(null);
        if (screen.detail.book.format === "epub") {
          pendingEpubNoteRef.current = note.id;
          setEpubJumpToken((previous) => previous + 1);
          if (screen.content.chapterId === note.chapterId) return;
        }
        void selectChapter(screen.detail.book.id, note.chapterId, {
          blockIndex: note.blockIndex,
          flash: true
        });
      }, [screen, selectChapter]);
      const deleteNote = React.useCallback(async (note) => {
        if (!note?.id || noteDeletingId) return;
        setNoteDeletingId(note.id);
        setNotesError("");
        try {
          await call("notes", {
            action: "delete",
            bookId: note.bookId ?? activeBookId,
            noteId: note.id
          });
        } catch (cause) {
          setNotesError(`${t("noteDeleteFailed")}：${messageOf(cause)}`);
          setNoteDeletingId(null);
          return;
        }
        setNoteDeletingId(null);
        await loadNotes();
      }, [activeBookId, loadNotes, noteDeletingId, t]);
      const closeNoteEditor = React.useCallback(() => {
        setNoteEditor(null);
        setNoteDraft("");
        setNoteError("");
      }, []);
      const openNoteEditor = React.useCallback((note) => {
        if (note) {
          setNoteEditor({
            noteId: note.id,
            chapterId: note.chapterId,
            blockIndex: note.blockIndex,
            offset: note.offset,
            quote: note.quote
          });
          setNoteDraft(note.note ?? "");
          setNoteError("");
          setSelection(null);
          requestAnimationFrame(() => noteInputRef.current?.focus());
          return;
        }
        if (!selection || selection.blockIndex == null || screen.kind !== "book") return;
        setNoteEditor({
          chapterId: activeChapterId,
          blockIndex: selection.blockIndex,
          offset: selection.offset,
          quote: selection.text
        });
        setNoteDraft("");
        setNoteError("");
        setSelection(null);
        requestAnimationFrame(() => noteInputRef.current?.focus());
      }, [activeChapterId, selection, screen]);
      const saveNote = React.useCallback(async () => {
        const editor = noteEditor;
        const text = noteDraft.trim();
        if (!editor || !text || noteSaving || screen.kind !== "book") return;
        setNoteSaving(true);
        setNoteError("");
        try {
          if (editor.noteId) {
            await call("notes", {
              action: "update",
              bookId: screen.detail.book.id,
              noteId: editor.noteId,
              note: text
            });
          } else {
            await call("notes", {
              action: "add",
              bookId: screen.detail.book.id,
              chapterId: editor.chapterId,
              blockIndex: editor.blockIndex,
              offset: editor.offset,
              quote: editor.quote,
              note: text
            });
          }
        } catch (cause) {
          setNoteError(`${t("noteSaveFailed")}：${messageOf(cause)}`);
          setNoteSaving(false);
          return;
        }
        setNoteSaving(false);
        setNoteEditor(null);
        setNoteDraft("");
        void loadNotes();
      }, [noteEditor, noteDraft, noteSaving, screen, loadNotes, t]);
      React.useEffect(() => {
        const layer = noteLayerRef.current;
        if (!layer) return;
        const root = visual?.kind === "pdf" ? layer.parentElement : contentRef.current?.querySelector(".dsh-reader-reader-inner");
        const currentChapter = activeChapterId;
        const relevant = screen.kind === "book" ? notes.filter((note) => note.chapterId === currentChapter && typeof note.quote === "string" && note.quote) : [];
        layer.textContent = "";
        if (!root || relevant.length === 0) return;
        let frame = 0;
        const paint = () => {
          frame = 0;
          layer.textContent = "";
          if (!root.isConnected) return;
          const { text } = collectTextNodes(root);
          const rootRect = root.getBoundingClientRect();
          for (const note of relevant) {
            const match = findNoteOccurrence(text, note.quote, note.offset);
            if (!match) continue;
            const range = rangeForNote(root, match.start, match.end);
            if (!range) continue;
            for (const rect of range.getClientRects()) {
              if (!rect.width || !rect.height) continue;
              const hit = document.createElement("div");
              hit.className = "dsh-reader-note-hit";
              hit.dataset.noteId = note.id;
              hit.style.left = `${rect.left - rootRect.left}px`;
              hit.style.top = `${rect.top - rootRect.top}px`;
              hit.style.width = `${rect.width}px`;
              hit.style.height = `${rect.height}px`;
              layer.appendChild(hit);
            }
          }
        };
        const schedule = () => {
          if (!frame) frame = requestAnimationFrame(paint);
        };
        const onClick = (event) => {
          const hit = event.target.closest?.(".dsh-reader-note-hit");
          if (!hit) return;
          const note = notes.find((entry) => entry.id === hit.dataset.noteId);
          if (note) openNoteEditor(note);
        };
        layer.addEventListener("click", onClick);
        window.addEventListener("resize", schedule);
        paint();
        return () => {
          if (frame) cancelAnimationFrame(frame);
          layer.removeEventListener("click", onClick);
          window.removeEventListener("resize", schedule);
          layer.textContent = "";
        };
      }, [activeChapterId, screen, notes, visual?.kind, visual?.page, pageView, fontSize, palette, openNoteEditor]);
      React.useEffect(() => {
        if (visual?.kind !== "epub" || screen.kind !== "book" || !epubFrameRef.current) return;
        const result = applyEpubNoteMarks(
          epubFrameRef.current,
          notes,
          screen.content.chapterId,
          palette,
          openNoteEditor,
          pendingEpubNoteRef.current
        );
        if (result.jumped) pendingEpubNoteRef.current = null;
        return result.cleanup;
      }, [visual?.kind, visual?.href, notes, palette, epubReady, epubJumpToken, openNoteEditor, screen]);
      const backToLibrary = React.useCallback(() => {
        setScreen({ kind: "library" });
        setSelection(null);
        setVisual(null);
        setPageView(null);
        setVisualError("");
        pendingScrollRef.current = null;
        void refresh();
      }, [refresh]);
      const configure = React.useCallback(async (path) => {
        setBusy(true);
        setError("");
        try {
          const value = await call("configure", { path });
          setSnapshot(value);
          setScreen({ kind: "library" });
        } catch (cause) {
          setError(`${t("configureFailed")}：${messageOf(cause)}`);
        } finally {
          setBusy(false);
        }
      }, [t]);
      const pickDirectory = React.useCallback(async (setPath) => {
        try {
          const directory = await runtime.uiWorkspace.pickDirectory();
          if (directory) setPath(directory);
        } catch (cause) {
          setError(messageOf(cause));
        }
      }, []);
      const prefill = React.useCallback((kind) => {
        if (!selection || screen.kind !== "book") return;
        const question = {
          explain: t("explainPrompt"),
          summarize: t("summarizePrompt"),
          translate: t("translatePrompt")
        }[kind];
        const quote = selection.text.split("\n").map((line) => `> ${line}`).join("\n");
        setDraft(`我在读《${screen.detail.book.title}》的《${screen.content.title}》。

${quote}

${question}`);
        setSelection(null);
        setChatOpen(true);
        setChatTab("chat");
        setChatError("");
        requestAnimationFrame(() => chatInputRef.current?.focus());
      }, [selection, screen, t]);
      const onContentMouseUp = React.useCallback(() => {
        const active = window.getSelection();
        const container = contentRef.current;
        if (!active || active.isCollapsed || active.rangeCount === 0 || !container) {
          setSelection(null);
          return;
        }
        const range = active.getRangeAt(0);
        if (!container.contains(range.commonAncestorContainer)) {
          setSelection(null);
          return;
        }
        const text = active.toString().trim();
        if (!text) {
          setSelection(null);
          return;
        }
        const rect = range.getBoundingClientRect();
        const anchor = selectionAnchor(range, container);
        setSelection({
          text: text.slice(0, 2e3),
          x: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
          y: rect.top,
          blockIndex: anchor ? anchor.blockIndex : null,
          offset: anchor ? anchor.offset : 0
        });
      }, []);
      const openSetup = React.useCallback(() => setScreen({ kind: "setup" }), []);
      const disposeChat = React.useCallback(() => {
        const current = chatRef.current;
        chatRef.current = null;
        if (!current) return;
        try {
          current.unsubscribe();
        } catch {
        }
        try {
          current.reference.release();
        } catch {
        }
      }, []);
      const releaseChat = React.useCallback(() => {
        disposeChat();
        setChatBinding(null);
        setEntries([]);
        setHasMore(false);
      }, [disposeChat]);
      const bindSession = React.useCallback((sessionId) => {
        if (!sessionId) {
          releaseChat();
          return null;
        }
        if (chatRef.current?.sessionId === sessionId) return chatRef.current.reference;
        releaseChat();
        setChatError("");
        let reference;
        try {
          reference = runtime.sessions.retain(sessionId, { source: "controllerOperation" });
        } catch (error2) {
          setChatError(`${t("loadFailed")}：${messageOf(error2)}`);
          return null;
        }
        const source = reference.binding.eventSource;
        const update = () => {
          const value = source.getSnapshot();
          setEntries(value.entries);
          setHasMore(value.hasMore);
        };
        update();
        const unsubscribe = source.subscribe(update);
        const record = { sessionId, reference, unsubscribe };
        chatRef.current = record;
        setChatBinding(record);
        reference.ready.catch((error2) => {
          if (chatRef.current === record) {
            setChatError(`${t("loadFailed")}：${messageOf(error2)}`);
          }
        });
        return reference;
      }, [releaseChat, t]);
      React.useEffect(() => {
        if (!activeSessionId) {
          releaseChat();
          return;
        }
        bindSession(activeSessionId);
      }, [activeSessionId, bindSession, releaseChat]);
      React.useEffect(() => () => disposeChat(), [disposeChat]);
      const lastEntrySeq = entries.length > 0 ? entries[entries.length - 1]?.event?.seq ?? null : null;
      React.useEffect(() => {
        const element = chatBodyRef.current;
        if (element) element.scrollTop = element.scrollHeight;
      }, [lastEntrySeq, sending, chatBinding, chatOpen, chatTab]);
      const sessionSnapshot = React.useSyncExternalStore(
        React.useCallback((callback) => {
          const reference = chatBinding?.reference;
          return reference ? reference.binding.session.subscribe(callback) : () => {
          };
        }, [chatBinding]),
        React.useCallback(() => chatBinding?.reference?.binding.session.getSnapshot() ?? null, [chatBinding])
      );
      const running = Boolean(sessionSnapshot?.running);
      const messages = React.useMemo(() => foldTranscript(entries).slice(-50), [entries]);
      const send = React.useCallback(async () => {
        const text = draft.trim();
        if (!text || sending || screen.kind !== "book") return;
        if (!workspaceId) {
          setChatError(t("chatDisabled"));
          return;
        }
        const book = screen.detail.book;
        setChatError("");
        setSending(true);
        const createSession = async () => {
          let sessionId;
          if (typeof runtime.sessions.create === "function") {
            try {
              sessionId = await runtime.sessions.create({ workspaceId });
            } catch {
              sessionId = void 0;
            }
          }
          if (!sessionId) {
            sessionId = await runtime.uiWorkspace.connectWorkspace(workspaceId);
            runtime.layout.selectPanel("dsh-reader");
          }
          await call("session", { bookId: book.id, sessionId });
          rememberSession(book.id, sessionId);
          const reference = bindSession(sessionId);
          if (!reference) throw new Error(t("loadFailed"));
          return reference;
        };
        try {
          let reference = chatRef.current?.reference;
          if (!reference) reference = await createSession();
          try {
            await reference.ready;
          } catch {
            await call("session", { bookId: book.id, sessionId: null }).catch(() => {
            });
            releaseChat();
            reference = await createSession();
            await reference.ready;
          }
          const result = await reference.binding.session.prompt([{ type: "text", text }], "queue");
          if (result && result.ok === false) {
            throw new Error(result.error?.message ?? t("sendFailed"));
          }
          setDraft("");
        } catch (error2) {
          setChatError(`${t("sendFailed")}：${messageOf(error2)}`);
        } finally {
          setSending(false);
        }
      }, [draft, sending, screen, workspaceId, rememberSession, bindSession, releaseChat, t]);
      const loadEarlier = React.useCallback(async () => {
        const reference = chatRef.current?.reference;
        if (!reference || loadingEarlier) return;
        setLoadingEarlier(true);
        setChatError("");
        try {
          await reference.binding.session.loadOlder();
        } catch (error2) {
          setChatError(`${t("loadFailed")}：${messageOf(error2)}`);
        } finally {
          setLoadingEarlier(false);
        }
      }, [loadingEarlier, t]);
      React.useEffect(() => {
        const onResize = () => {
          if (window.innerWidth > 1100) {
            setChatWidth((current) => clampChatWidth(current, window.innerWidth));
          }
        };
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
      }, []);
      const startResize = React.useCallback((event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
        }
        dragRef.current = { startX: event.clientX, startWidth: chatWidth };
      }, [chatWidth]);
      const moveResize = React.useCallback((event) => {
        const drag = dragRef.current;
        if (!drag) return;
        const next = clampChatWidth(drag.startWidth - (event.clientX - drag.startX), window.innerWidth);
        setChatWidth(next);
      }, []);
      const endResize = React.useCallback((event) => {
        if (!dragRef.current) return;
        dragRef.current = null;
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
        }
        saveChatWidth(chatWidthRef.current);
      }, []);
      const resetResize = React.useCallback(() => {
        setChatWidth(CHAT_WIDTH_DEFAULT);
        saveChatWidth(CHAT_WIDTH_DEFAULT);
      }, []);
      const resizeKeyDown = React.useCallback((event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const delta = event.key === "ArrowLeft" ? 24 : -24;
        const next = clampChatWidth(chatWidthRef.current + delta, window.innerWidth);
        setChatWidth(next);
        saveChatWidth(next);
      }, []);
      const headerTitle = screen.kind === "book" ? screen.detail.book.title : screen.kind === "unsupported" ? screen.book.title : screen.kind === "setup" ? t("setupTitle") : snapshot?.settings.libraryDir ? t("library") : t("setupTitle");
      const headerSubtitle = screen.kind === "book" ? screen.content.title : snapshot?.settings.libraryDir ?? "";
      const chatBody = h(
        "div",
        { className: "dsh-reader-chat-body", ref: chatBodyRef },
        hasMore ? h("button", {
          type: "button",
          className: "dsh-reader-chat-more",
          disabled: loadingEarlier,
          onClick: () => void loadEarlier()
        }, loadingEarlier ? t("loading") : t("loadEarlier")) : null,
        messages.length === 0 ? h(
          "div",
          { className: "dsh-reader-chat-empty" },
          workspaceId ? t("chatEmpty") : t("chatDisabled")
        ) : messages.map((message) => h(
          "div",
          {
            key: message.key,
            className: "dsh-reader-msg",
            "data-role": message.role
          },
          h(
            "div",
            { className: "dsh-reader-msg-role" },
            message.role === "user" ? t("you") : t("assistant")
          ),
          message.role === "assistant" ? h(MarkdownMessage, { text: message.text, prefix: message.key }) : h("div", { className: "dsh-reader-msg-text" }, message.text)
        )),
        sending || running ? h(
          "div",
          { className: "dsh-reader-chat-thinking" },
          sending ? t("sending") : t("thinking")
        ) : null
      );
      const chatCompose = h(
        "div",
        { className: "dsh-reader-chat-compose" },
        h("textarea", {
          ref: chatInputRef,
          value: draft,
          rows: 3,
          placeholder: workspaceId ? t("chatPlaceholder") : t("chatDisabled"),
          disabled: !workspaceId,
          onChange: (event) => setDraft(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void send();
            }
          }
        }),
        h(
          "div",
          { className: "dsh-reader-chat-compose-row" },
          h("span", { className: "dsh-reader-chat-hint" }, workspaceId ? "Enter / Shift+Enter" : ""),
          h("button", {
            type: "button",
            className: "dsh-reader-chat-send",
            disabled: !draft.trim() || sending || !workspaceId,
            onClick: () => void send()
          }, sending ? t("sending") : t("send"))
        )
      );
      const notesBody = h(NotesBody, {
        t,
        notesError,
        notesLoading,
        notes,
        screen,
        openNote,
        noteDeletingId,
        deleteNote
      });
      const searchPanel = h(SearchPanel, {
        t,
        open: searchOpen,
        screen,
        searchInputRef,
        searchQuery,
        setSearchQuery,
        runSearch,
        searchBusy,
        setSearchOpen,
        searchError,
        searchResults,
        openSearchMatch
      });
      const chatPanel = h(ChatPanel, {
        t,
        chatOpen,
        chatTab,
        setChatTab,
        setChatOpen,
        notesBody,
        chatBody,
        chatError,
        chatCompose,
        chatWidth,
        minWidth: CHAT_WIDTH_MIN,
        maxWidth: CHAT_WIDTH_MAX,
        startResize,
        moveResize,
        endResize,
        resetResize,
        resizeKeyDown
      });
      const visualReader = h(VisualReader, {
        t,
        visual,
        screen,
        pageView,
        pageInput,
        setPageInput,
        goPdfPage,
        zoomPdf,
        visualLoading,
        visualError,
        onPdfMouseUp,
        noteLayerRef,
        goEpubChapter,
        onEpubLoad,
        epubFrameRef
      });
      const bookView = screen.kind === "book" ? h(
        "div",
        {
          className: "dsh-reader-book",
          "data-toc": tocOpen ? "true" : "false",
          "data-chat": chatOpen ? "true" : "false",
          style: { "--dsh-reader-chat-width": `${chatWidth}px` }
        },
        tocOpen ? h(Toc, {
          t,
          detail: screen.detail,
          activeChapter: screen.content.chapterId,
          onSelect: (chapterId) => void selectChapter(screen.detail.book.id, chapterId)
        }) : null,
        visualReader ?? h(
          "div",
          {
            className: "dsh-reader-reader",
            ref: contentRef,
            style: { fontSize },
            onMouseUp: onContentMouseUp
          },
          h(
            "div",
            { className: "dsh-reader-reader-inner" },
            h("h1", { className: "dsh-reader-chapter-title" }, screen.content.title),
            renderBlocks(screen.content.blocks, screen.content.chapterId),
            h("div", { className: "dsh-reader-note-layer", ref: noteLayerRef })
          )
        ),
        chatOpen ? h("button", {
          type: "button",
          className: "dsh-reader-chat-backdrop",
          "aria-label": t("closeChat"),
          onClick: () => setChatOpen(false)
        }) : null,
        chatPanel
      ) : null;
      return h(
        "div",
        {
          className: "dsh-reader-panel",
          style: {
            "--reader-bg": palette.bg,
            "--reader-fg": palette.fg,
            "--reader-muted": palette.muted,
            "--reader-border": palette.border,
            "--reader-selection": palette.selection,
            "--reader-highlight": palette.highlight
          }
        },
        h(
          "div",
          { className: "dsh-reader-header" },
          h(
            "div",
            { className: "dsh-reader-header-main" },
            screen.kind !== "library" ? h("button", {
              type: "button",
              className: "dsh-reader-icon-btn",
              title: t("back"),
              onClick: backToLibrary
            }, "←") : null,
            h(
              "div",
              { style: { minWidth: 0 } },
              h("div", { className: "dsh-reader-title" }, headerTitle),
              headerSubtitle ? h("div", { className: "dsh-reader-subtitle" }, headerSubtitle) : null
            )
          ),
          h(
            "div",
            { className: "dsh-reader-header-actions" },
            screen.kind === "book" ? h("select", {
              className: "dsh-reader-palette-select",
              value: paletteId,
              title: t("palette"),
              "aria-label": t("palette"),
              onChange: (event) => changePalette(event.target.value)
            }, READER_PALETTE_IDS.map((id) => h(
              "option",
              { key: id, value: id },
              t(`palette${id[0].toUpperCase()}${id.slice(1)}`)
            ))) : null,
            screen.kind === "book" ? h("button", {
              type: "button",
              className: "dsh-reader-icon-btn",
              title: t("search"),
              "aria-expanded": searchOpen ? "true" : "false",
              onClick: toggleSearch
            }, t("search")) : null,
            screen.kind === "book" ? h("button", {
              type: "button",
              className: "dsh-reader-icon-btn",
              title: t("companion"),
              onClick: () => setChatOpen((previous) => !previous)
            }, t("companion")) : null,
            screen.kind === "book" ? h("button", {
              type: "button",
              className: "dsh-reader-icon-btn",
              title: t("toc"),
              onClick: () => setTocOpen((previous) => !previous)
            }, "☰") : null,
            screen.kind === "book" ? h("button", {
              type: "button",
              className: "dsh-reader-icon-btn",
              title: t("fontSize"),
              onClick: () => setFontSize((previous) => Math.max(14, previous - 1))
            }, "A-") : null,
            screen.kind === "book" ? h("button", {
              type: "button",
              className: "dsh-reader-icon-btn",
              title: t("fontSize"),
              onClick: () => setFontSize((previous) => Math.min(24, previous + 1))
            }, "A+") : null
          )
        ),
        error ? h("div", { className: "dsh-reader-error" }, error) : null,
        searchPanel,
        !snapshot ? h("div", { className: "dsh-reader-muted" }, busy ? t("loading") : t("loadFailed")) : screen.kind === "setup" || !snapshot.settings.libraryDir ? h(Setup, {
          t,
          initialPath: snapshot.settings.libraryDir ?? "",
          busy,
          onConfigure: configure,
          onPick: pickDirectory,
          onCancel: snapshot.settings.libraryDir ? () => setScreen({ kind: "library" }) : null
        }) : screen.kind === "library" ? h(Library, {
          t,
          snapshot,
          busy,
          onOpen: openBook,
          onRefresh: refresh,
          onSettings: openSetup
        }) : screen.kind === "unsupported" ? h(
          "div",
          { className: "dsh-reader-empty" },
          h("h2", null, screen.book.title),
          h("p", null, t("unsupportedHint")),
          h("button", {
            type: "button",
            className: "dsh-reader-secondary",
            onClick: backToLibrary
          }, t("back"))
        ) : bookView,
        selection ? h(
          "div",
          {
            className: "dsh-reader-selection",
            style: { left: selection.x, top: Math.max(8, selection.y - 48) },
            onMouseDown: (event) => event.preventDefault()
          },
          h("button", { type: "button", onClick: () => prefill("explain") }, t("explain")),
          h("button", { type: "button", onClick: () => prefill("summarize") }, t("summarize")),
          h("button", { type: "button", onClick: () => prefill("translate") }, t("translate")),
          selection.blockIndex == null ? null : h("button", { type: "button", onClick: () => openNoteEditor() }, t("noteAction"))
        ) : null,
        noteEditor ? h(
          "div",
          {
            className: "dsh-reader-note-overlay",
            onMouseDown: (event) => {
              if (event.target === event.currentTarget) closeNoteEditor();
            }
          },
          h(
            "div",
            {
              className: "dsh-reader-note-dialog",
              role: "dialog",
              "aria-modal": "true",
              "aria-label": noteEditor.noteId ? t("noteEditTitle") : t("noteDialogTitle")
            },
            h("h3", null, noteEditor.noteId ? t("noteEditTitle") : t("noteDialogTitle")),
            h("div", { className: "dsh-reader-note-dialog-quote" }, noteEditor.quote),
            h("textarea", {
              ref: noteInputRef,
              value: noteDraft,
              rows: 4,
              placeholder: t("notePlaceholder"),
              disabled: noteSaving,
              onChange: (event) => setNoteDraft(event.target.value)
            }),
            noteError ? h("div", { className: "dsh-reader-note-dialog-error" }, noteError) : null,
            h(
              "div",
              { className: "dsh-reader-note-dialog-actions" },
              noteEditor.noteId ? h("button", {
                type: "button",
                className: "dsh-reader-secondary",
                disabled: noteSaving,
                onClick: async () => {
                  await deleteNote({ id: noteEditor.noteId, bookId: activeBookId });
                  closeNoteEditor();
                }
              }, t("delete")) : null,
              h("button", {
                type: "button",
                className: "dsh-reader-secondary",
                disabled: noteSaving,
                onClick: closeNoteEditor
              }, t("cancel")),
              h("button", {
                type: "button",
                className: "dsh-reader-primary",
                disabled: noteSaving || !noteDraft.trim(),
                onClick: () => void saveNote()
              }, noteSaving ? t("noteSaving") : t("save"))
            )
          )
        ) : null
      );
    }
    return {
      name: "dsh-reader-client",
      inject: ["slots", "layout", "locale", "connection", "sessions", "uiWorkspace"],
      foldTranscript,
      clampChatWidth,
      parseMarkdownBlocks,
      READER_PALETTE_IDS,
      READER_PALETTES,
      resolveReaderPalette,
      findNoteOccurrence,
      apply(ctx) {
        runtime = ctx;
        boundText = ctx.locale.bind(NS);
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-reader: dictionaries");
        ctx.effect(
          () => ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
            name: "sidebar.panellist",
            id: "dsh-reader",
            order: 20,
            label: () => boundText("panel"),
            locale: NS
          }, PanelIcon)),
          "dsh-reader: sidebar entry"
        );
        ctx.effect(
          () => ctx.slots.inject("main", () => ctx.slots.register({
            name: "main",
            key: "dsh-reader",
            locale: NS
          }, ReaderPanel)),
          "dsh-reader: main panel"
        );
      }
    };
  }

  // src/client/index.js
  function create(require2) {
    return createPlugin(require2);
  }
  return __toCommonJS(index_exports);
})();
/* Generated by scripts/build-client.mjs; source in src/client/. */
window.__ModuleLoader__.load({ id: 'dsh-reader', factory(require) { return __dshReaderBundle.create(require) } })

