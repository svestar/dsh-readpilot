"use strict";
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

  // src/client/index.ts
  var index_exports = {};
  __export(index_exports, {
    create: () => create
  });

  // src/client/helpers.ts
  function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
  }
  function downloadText(fileName, text) {
    if (typeof document === "undefined" || typeof URL === "undefined" || !document.body) return;
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  function formatSize(bytes) {
    if (!Number.isFinite(bytes)) return "";
    const value = bytes;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1024 / 1024).toFixed(1)} MB`;
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
  var CHAT_WIDTH_KEY = "dsh-readpilot.chat-width";
  var READER_PALETTE_KEY = "dsh-readpilot.palette";
  var READING_MODE_KEY = "dsh-readpilot.reading-mode";
  var PAGE_LAYOUT_KEY = "dsh-readpilot.page-layout";
  var COVERS_ENABLED_KEY = "dsh-readpilot.covers";
  var DEFAULT_READING_MODE = "paged";
  var DEFAULT_PAGE_LAYOUT = "single";
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
      return typeof value === "string" && READER_PALETTES[value] ? value : "auto";
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
  function readReadingMode() {
    try {
      const value = window.localStorage.getItem(READING_MODE_KEY);
      return value === "scroll" || value === "paged" ? value : DEFAULT_READING_MODE;
    } catch {
      return DEFAULT_READING_MODE;
    }
  }
  function saveReadingMode(mode) {
    try {
      window.localStorage.setItem(READING_MODE_KEY, mode);
    } catch {
    }
  }
  function readCoversEnabled() {
    try {
      return window.localStorage.getItem(COVERS_ENABLED_KEY) !== "off";
    } catch {
      return true;
    }
  }
  function saveCoversEnabled(enabled) {
    try {
      window.localStorage.setItem(COVERS_ENABLED_KEY, enabled ? "on" : "off");
    } catch {
    }
  }
  function readPageLayout() {
    try {
      const value = window.localStorage.getItem(PAGE_LAYOUT_KEY);
      return value === "single" || value === "double" ? value : DEFAULT_PAGE_LAYOUT;
    } catch {
      return DEFAULT_PAGE_LAYOUT;
    }
  }
  function savePageLayout(layout) {
    try {
      window.localStorage.setItem(PAGE_LAYOUT_KEY, layout);
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
  function findNoteOccurrence(text, quote, preferredOffset = 0, prefix = "", suffix = "") {
    if (typeof text !== "string" || typeof quote !== "string" || !quote) return null;
    const preferred = Number.isFinite(Number(preferredOffset)) ? Number(preferredOffset) : 0;
    const wantedPrefix = typeof prefix === "string" ? prefix : "";
    const wantedSuffix = typeof suffix === "string" ? suffix : "";
    let best = null;
    let index = text.indexOf(quote);
    while (index !== -1) {
      const before = wantedPrefix ? text.slice(Math.max(0, index - wantedPrefix.length), index) : "";
      const after = wantedSuffix ? text.slice(index + quote.length, index + quote.length + wantedSuffix.length) : "";
      const mismatch = (wantedPrefix && before !== wantedPrefix ? 1e5 : 0) + (wantedSuffix && after !== wantedSuffix ? 1e5 : 0);
      const score = Math.abs(index - preferred) + mismatch;
      if (!best || score < best.score) {
        best = { start: index, end: index + quote.length, score };
      }
      index = text.indexOf(quote, index + 1);
    }
    return best ? { start: best.start, end: best.end } : null;
  }
  function collectTextNodes(root) {
    if (!root) return { nodes: [], text: "" };
    const doc = root.ownerDocument ?? document;
    const view = doc.defaultView ?? window;
    const walker = doc.createTreeWalker(root, view.NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (!parent?.closest(".dsh-readpilot-note-layer")) nodes.push(node);
      node = walker.nextNode();
    }
    return { nodes, text: nodes.map((entry) => entry.nodeValue ?? "").join("") };
  }
  function rangeForNote(root, start, end) {
    const { nodes } = collectTextNodes(root);
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
  function pdfNoteRects(pageView, match) {
    const items = Array.isArray(pageView?.textItems) ? pageView.textItems : [];
    if (!match || !Number.isFinite(match.start) || !Number.isFinite(match.end)) return [];
    const rects = [];
    let cursor = 0;
    for (const item of items) {
      const text = typeof item?.text === "string" ? item.text : "";
      const length = text.length;
      const start = cursor;
      const end = cursor + length;
      cursor = end;
      if (length === 0 || end <= match.start || start >= match.end) continue;
      const from = Math.max(match.start, start);
      const to = Math.min(match.end, end);
      if (to <= from) continue;
      const left = Number(item.left) || 0;
      const top = Number(item.top) || 0;
      const width = Math.max(1, Number(item.width) || 0);
      const height = Math.max(1, Number(item.height) || 0);
      rects.push({
        left: left + width * (from - start) / length,
        top,
        width: Math.max(1, width * (to - from) / length),
        height,
        fontSize: Math.max(1, Number(item.fontSize) || height)
      });
    }
    rects.sort((first, second) => first.top - second.top || first.left - second.left);
    const merged = [];
    for (const rect of rects) {
      const previous = merged.at(-1);
      const tolerance = Math.max(2, (previous?.fontSize ?? rect.fontSize) * 0.5);
      const sameLine = previous && Math.abs(previous.top - rect.top) <= Math.max(2, rect.fontSize * 0.35);
      const gap = previous ? rect.left - (previous.left + previous.width) : Number.POSITIVE_INFINITY;
      if (previous && sameLine && gap <= tolerance) {
        const right = Math.max(previous.left + previous.width, rect.left + rect.width);
        const bottom = Math.max(previous.top + previous.height, rect.top + rect.height);
        previous.top = Math.min(previous.top, rect.top);
        previous.height = bottom - previous.top;
        previous.width = right - previous.left;
      } else {
        merged.push({ ...rect });
      }
    }
    return merged.map(({ fontSize, ...rect }) => rect);
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
    const highlightColors = {
      yellow: "rgba(250,204,21,.38)",
      green: "rgba(74,222,128,.32)",
      blue: "rgba(96,165,250,.32)",
      pink: "rgba(244,114,182,.30)",
      purple: "rgba(192,132,252,.30)"
    };
    style.textContent = `mark.dsh-readpilot-note-mark{background:${paletteCssColors(palette).highlight}!important;color:inherit!important;cursor:pointer;border-radius:2px}mark.dsh-readpilot-highlight-yellow{background:${highlightColors.yellow}!important}mark.dsh-readpilot-highlight-green{background:${highlightColors.green}!important}mark.dsh-readpilot-highlight-blue{background:${highlightColors.blue}!important}mark.dsh-readpilot-highlight-pink{background:${highlightColors.pink}!important}mark.dsh-readpilot-highlight-purple{background:${highlightColors.purple}!important}mark.dsh-readpilot-note-mark.dsh-readpilot-note-flash{box-shadow:0 0 0 2px ${paletteCssColors(palette).selection}}`;
    const onClick = (event) => {
      const target = event.target;
      const mark = target?.closest?.("mark[data-note-id]");
      if (!mark) return;
      const note = notes.find((entry) => entry.id === mark.dataset.noteId);
      if (note) onOpen(note);
    };
    doc.addEventListener("click", onClick);
    const text = doc.body.textContent ?? "";
    for (const note of relevant) {
      const match = findNoteOccurrence(text, note.quote, note.offset, note.quotePrefix, note.quoteSuffix);
      if (!match) continue;
      const range = rangeForNote(doc.body, match.start, match.end);
      if (!range) continue;
      const mark = doc.createElement("mark");
      mark.className = note.kind === "highlight" ? `dsh-readpilot-note-mark dsh-readpilot-highlight-${note.color ?? "yellow"}` : "dsh-readpilot-note-mark";
      mark.dataset.noteId = note.id;
      mark.appendChild(range.extractContents());
      range.insertNode(mark);
    }
    let jumped = false;
    if (jumpNoteId) {
      const target = doc.querySelector(`mark[data-note-id="${jumpNoteId}"]`);
      if (target) {
        target.scrollIntoView({ block: "center", behavior: "auto" });
        target.classList.add("dsh-readpilot-note-flash");
        setTimeout(() => target.classList.remove("dsh-readpilot-note-flash"), 1600);
        jumped = true;
      }
    }
    return {
      cleanup: () => doc.removeEventListener("click", onClick),
      jumped
    };
  }
  var CHAT_WIDTH_DEFAULT = 420;
  var CHAT_WIDTH_MIN = 360;
  var CHAT_WIDTH_MAX = 640;
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
  function timestampOf(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
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
  function diffLines(base, next) {
    const before = String(base ?? "").replace(/\r\n?/g, "\n").split("\n");
    const after = String(next ?? "").replace(/\r\n?/g, "\n").split("\n");
    let prefix = 0;
    while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1;
    let suffix = 0;
    while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix += 1;
    const lines = [];
    for (let index = 0; index < prefix; index += 1) lines.push({ type: "same", text: before[index] });
    for (let index = prefix; index < before.length - suffix; index += 1) lines.push({ type: "del", text: before[index] });
    for (let index = prefix; index < after.length - suffix; index += 1) lines.push({ type: "add", text: after[index] });
    for (let index = before.length - suffix; index < before.length; index += 1) lines.push({ type: "same", text: before[index] });
    return lines;
  }

  // src/client/locale.ts
  var zh = {
    panel: "智读",
    library: "书库",
    librarySubtitle: "整理、分类并继续阅读",
    categories: "分类",
    allBooks: "全部书籍",
    recentReading: "最近阅读",
    formats: "格式",
    tags: "标签",
    editTags: "编辑分类",
    tagPlaceholder: "输入标签，回车添加",
    addTag: "添加",
    removeTag: "移除",
    noTags: "还没有标签",
    tagTooLong: "标签不能超过 24 个字符",
    searchLibrary: "搜索书名或标签…",
    showCovers: "显示封面",
    hideCovers: "隐藏封面",
    sortBy: "排序",
    sortRecent: "最近阅读",
    sortTitle: "书名",
    sortSize: "文件大小",
    sortAdded: "文件时间",
    noMatches: "当前分类下没有书籍。",
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
    inProgress: "在读",
    unsupported: "暂不支持",
    unsupportedHint: "这本书暂时无法打开；请检查文件是否损坏，或 PDF 是否缺少可提取的文本层。",
    unread: "未读",
    readStatus: "阅读状态",
    statusNone: "未标记",
    statusWant: "想读",
    statusReading: "在读",
    statusDone: "已读完",
    rating: "评分",
    editBook: "书籍信息",
    askCompanion: "问伴读",
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
    chatEmpty: "针对这本书提问，或在正文中选中文字后点“问伴读”。",
    chatSessionLost: "伴读会话已归档或不存在；发送消息会自动新建会话。",
    chatJumpNotFound: "没有在书中找到这段文字。",
    chatJumpFailed: "跳转原文失败",
    chatJumpOtherBook: "请先回到这本书再跳转。",
    chatPlaceholder: "针对这本书提问…",
    send: "发送",
    sending: "发送中…",
    thinking: "思考中…",
    loadEarlier: "加载更早",
    you: "你",
    assistant: "伴读",
    closeChat: "收起伴读",
    close: "关闭",
    resizeChat: "调整伴读栏宽度",
    chatDisabled: "先在设置中创建书库工作区。",
    sendFailed: "发送失败",
    search: "搜索",
    searchPlaceholder: "搜索本书…",
    searching: "搜索中…",
    searchEmpty: "没有找到匹配的内容。",
    searchFailed: "搜索失败",
    searchTruncated: "结果过多，仅显示前 30 条。",
    closeSearch: "关闭搜索",
    notes: "笔记",
    shortNotes: "短笔记",
    noteAction: "笔记",
    marks: "标记",
    highlights: "划线",
    filterChapter: "按章节筛选",
    allChapters: "全部章节",
    highlight: "划线",
    highlightYellow: "黄色",
    highlightGreen: "绿色",
    highlightBlue: "蓝色",
    highlightPink: "粉色",
    highlightPurple: "紫色",
    annotationTitle: "批注",
    annotationPlaceholder: "写批注（可选）",
    bookmark: "书签",
    bookmarks: "书签",
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
    jump: "跳转",
    longNotes: "长笔记",
    notesPageHint: "划线、批注与书签",
    notesEmptyHint: "在正文中选中一段文字，就可以添加划线或笔记。",
    longNotesPageHint: "整书与主题的 markdown 笔记",
    createNote: "创建并打开",
    backToNotes: "返回列表",
    allNotes: "全部笔记",
    memoryPageHint: "伴读记住的偏好与阅读关系",
    memorySettings: "记忆设置",
    bookNote: "整书笔记",
    newTopicNote: "新建主题笔记",
    noteKindTopic: "主题",
    longNoteTitle: "标题",
    longNotePreview: "预览",
    longNoteEmpty: "还没有长笔记。",
    longNotesHint: "长笔记保存在书库的 notes/ 目录。",
    longNoteConflict: "笔记已被修改，请重新加载。",
    longNoteTitleRequired: "请填写标题。",
    reload: "重新加载",
    deleteLongNoteConfirm: "确定删除这篇长笔记？",
    noteContext: "让伴读知道本书笔记",
    noteContextOn: "已开启",
    noteContextOff: "未开启",
    noteContextHint: "开启后，本书的长笔记与有批注的划线会进入伴读上下文。",
    noteContextFailed: "笔记上下文切换失败",
    noteContextChars: "字",
    autoApplyNotes: "自动应用伴读笔记",
    autoApplyNotesOn: "已开启",
    autoApplyNotesOff: "未开启",
    autoApplyNotesHint: "全局开关：开启后伴读写笔记会直接保存，不再弹窗确认；每次修改仍会写入历史。",
    autoApplyNotesFailed: "自动应用开关切换失败",
    noteDrafts: "待确认的笔记草稿",
    draftCreate: "新建",
    draftAppend: "追加",
    draftEdit: "修改",
    applyDraft: "应用",
    rejectDraft: "拒绝",
    draftActionFailed: "草稿操作失败",
    draftDiffTruncated: "差异过长，仅显示前 80 行",
    history: "历史",
    historyEmpty: "还没有历史版本。",
    historyRestore: "恢复",
    historyDelete: "删除",
    historyClear: "清空历史",
    historyDeleteConfirm: "删除这条历史记录？",
    historyClearConfirm: "清空这篇笔记的全部历史记录？",
    historyRestoreConfirm: "恢复到这个版本？当前内容会先存入历史。",
    historyFailed: "历史操作失败",
    historyClose: "收起",
    exportNotes: "导出",
    exportSave: "保存到书库",
    exportFailed: "导出失败",
    openExternal: "外部编辑器",
    openExternalFailed: "打开外部编辑器失败",
    openExternalHint: "用系统默认应用打开当前笔记文件；保存后回到预览会自动刷新。",
    exportSaved: "已保存",
    memory: "记忆",
    memoryLoad: "加载记忆",
    memoryDefaultMode: "默认",
    memoryThisBook: "本书",
    memoryEffective: "当前生效",
    memoryModeOff: "关闭",
    memoryModeAsk: "询问",
    memoryModeOn: "全部开启",
    memoryBookInherit: "跟随",
    memoryBookOn: "始终开启",
    memoryBookOff: "始终关闭",
    memoryEffectiveOff: "关闭",
    memoryEffectiveAsk: "待询问",
    memoryEffectiveOn: "开启",
    memoryBookCard: "本书记忆",
    memoryReaderCard: "读者卡",
    memoryBookPlaceholder: "这本书的阅读关系、读者观点与未解决问题。",
    memoryReaderPlaceholder: "跨书的读者偏好，例如语言、深度、回答风格。",
    memoryUndo: "撤销最近一次",
    memoryHistoryCount: "历史",
    memoryProposals: "待确认的记忆",
    memoryApprove: "同意并保存",
    memoryReject: "不用",
    memoryAppend: "追加",
    memoryReplace: "替换",
    memoryHint: "记忆只保存读者与阅读关系，不保存书里的情节设定；开启后伴读可自动更新，每次更新可撤销。",
    memoryFailed: "记忆操作失败",
    clear: "清空",
    refresh: "刷新",
    pagePrev: "上一页",
    pageNext: "下一页",
    chapterPrev: "上一章",
    chapterNext: "下一章",
    pagedMode: "分页模式",
    scrollMode: "滚动模式",
    singlePage: "单页",
    doublePage: "双页",
    page: "页码",
    chapter: "章节",
    zoomOut: "缩小",
    zoomIn: "放大"
  };
  var en = {
    panel: "ReadPilot",
    library: "Library",
    librarySubtitle: "Organize, tag and continue reading",
    categories: "Categories",
    allBooks: "All books",
    recentReading: "Recently read",
    formats: "Formats",
    tags: "Tags",
    editTags: "Edit tags",
    tagPlaceholder: "Type a tag and press Enter",
    addTag: "Add",
    removeTag: "Remove",
    noTags: "No tags yet",
    tagTooLong: "Tags cannot exceed 24 characters",
    searchLibrary: "Search title or tag…",
    showCovers: "Show covers",
    hideCovers: "Hide covers",
    sortBy: "Sort",
    sortRecent: "Recently read",
    sortTitle: "Title",
    sortSize: "File size",
    sortAdded: "File time",
    noMatches: "No books in this category.",
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
    inProgress: "In progress",
    unsupported: "Not supported",
    unsupportedHint: "This book cannot be opened yet; check whether the file is damaged or the PDF has no extractable text layer.",
    unread: "Unread",
    readStatus: "Status",
    statusNone: "Unmarked",
    statusWant: "Want to read",
    statusReading: "Reading",
    statusDone: "Finished",
    rating: "Rating",
    editBook: "Book details",
    askCompanion: "Ask companion",
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
    chatEmpty: "Ask about this book, or select text and choose Ask companion.",
    chatSessionLost: "The companion session was archived or no longer exists; sending a message will create a new one.",
    chatJumpNotFound: "No matching passage found in this book.",
    chatJumpFailed: "Could not jump to the source text",
    chatJumpOtherBook: "Open this book in the reader before jumping.",
    chatPlaceholder: "Ask about this book…",
    send: "Send",
    sending: "Sending…",
    thinking: "Thinking…",
    loadEarlier: "Load earlier",
    you: "You",
    assistant: "Companion",
    closeChat: "Hide companion",
    close: "Close",
    resizeChat: "Resize companion panel",
    chatDisabled: "Create a library workspace in Settings first.",
    sendFailed: "Could not send",
    search: "Search",
    searchPlaceholder: "Search this book…",
    searching: "Searching…",
    searchEmpty: "No matches found.",
    searchFailed: "Search failed",
    searchTruncated: "Too many matches; showing the first 30.",
    closeSearch: "Close search",
    notes: "Notes",
    shortNotes: "Short notes",
    noteAction: "Note",
    marks: "Marks",
    highlights: "Highlights",
    filterChapter: "Filter by chapter",
    allChapters: "All chapters",
    highlight: "Highlight",
    highlightYellow: "Yellow",
    highlightGreen: "Green",
    highlightBlue: "Blue",
    highlightPink: "Pink",
    highlightPurple: "Purple",
    annotationTitle: "Annotation",
    annotationPlaceholder: "Write an annotation (optional)",
    bookmark: "Bookmark",
    bookmarks: "Bookmarks",
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
    jump: "Jump",
    longNotes: "Long notes",
    notesPageHint: "Highlights, annotations and bookmarks",
    notesEmptyHint: "Select text in the book to add a highlight or note.",
    longNotesPageHint: "Markdown notes for the book and topics",
    createNote: "Create and open",
    backToNotes: "Back to list",
    allNotes: "All notes",
    memoryPageHint: "Preferences and reading relationship the companion remembers",
    memorySettings: "Memory settings",
    bookNote: "Book note",
    newTopicNote: "New topic note",
    noteKindTopic: "Topic",
    longNoteTitle: "Title",
    longNotePreview: "Preview",
    longNoteEmpty: "No long notes yet.",
    longNotesHint: "Long notes live in the library notes/ directory.",
    longNoteConflict: "This note changed. Reload it.",
    longNoteTitleRequired: "Enter a title.",
    reload: "Reload",
    deleteLongNoteConfirm: "Delete this long note?",
    noteContext: "Let the companion read this book's notes",
    noteContextOn: "On",
    noteContextOff: "Off",
    noteContextHint: "When on, this book's long notes and annotated highlights enter the companion context.",
    noteContextFailed: "Could not change the notes context",
    noteContextChars: "chars",
    autoApplyNotes: "Auto-apply companion notes",
    autoApplyNotesOn: "On",
    autoApplyNotesOff: "Off",
    autoApplyNotesHint: "Global switch: when on, the companion saves note edits directly without a confirmation dialog; every change still writes history.",
    autoApplyNotesFailed: "Could not change the auto-apply switch",
    noteDrafts: "Pending drafts",
    draftCreate: "Create",
    draftAppend: "Append",
    draftEdit: "Edit",
    applyDraft: "Apply",
    rejectDraft: "Reject",
    draftActionFailed: "Draft action failed",
    draftDiffTruncated: "Diff is long; showing the first 80 lines",
    history: "History",
    historyEmpty: "No history yet.",
    historyRestore: "Restore",
    historyDelete: "Delete",
    historyClear: "Clear history",
    historyDeleteConfirm: "Delete this history entry?",
    historyClearConfirm: "Clear all history for this note?",
    historyRestoreConfirm: "Restore this version? The current content is saved to history first.",
    historyFailed: "History action failed",
    historyClose: "Close",
    exportNotes: "Export",
    exportSave: "Save to library",
    exportFailed: "Export failed",
    openExternal: "External editor",
    openExternalFailed: "Could not open the external editor",
    openExternalHint: "Open the current note file in the system default app; the preview refreshes when you return.",
    exportSaved: "Saved",
    memory: "Memory",
    memoryLoad: "Load memory",
    memoryDefaultMode: "Default",
    memoryThisBook: "This book",
    memoryEffective: "Effective",
    memoryModeOff: "Off",
    memoryModeAsk: "Ask",
    memoryModeOn: "All on",
    memoryBookInherit: "Inherit",
    memoryBookOn: "Always on",
    memoryBookOff: "Always off",
    memoryEffectiveOff: "Off",
    memoryEffectiveAsk: "Needs consent",
    memoryEffectiveOn: "On",
    memoryBookCard: "Book memory",
    memoryReaderCard: "Reader card",
    memoryBookPlaceholder: "Reading relationship, the reader’s views and open questions for this book.",
    memoryReaderPlaceholder: "Cross-book preferences such as language, depth and answer style.",
    memoryUndo: "Undo last",
    memoryHistoryCount: "history",
    memoryProposals: "Pending memory",
    memoryApprove: "Approve and save",
    memoryReject: "Not now",
    memoryAppend: "Append",
    memoryReplace: "Replace",
    memoryHint: "Memory keeps the reader and reading relationship, not book plot facts. When on, the companion can update it automatically and every update can be undone.",
    memoryFailed: "Memory action failed",
    clear: "Clear",
    refresh: "Refresh",
    pagePrev: "Previous page",
    pageNext: "Next page",
    chapterPrev: "Previous chapter",
    chapterNext: "Next chapter",
    pagedMode: "Paged mode",
    scrollMode: "Scroll mode",
    singlePage: "Single page",
    doublePage: "Double page",
    page: "Page",
    chapter: "Chapter",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in"
  };

  // src/client/styles.ts
  var CSS = `
.dsh-readpilot-panel{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:14px}
.dsh-readpilot-header{flex:none;display:flex;align-items:center;gap:12px;padding:10px 18px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dsh-readpilot-header-main{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
.dsh-readpilot-header-actions{display:flex;align-items:center;gap:6px;flex:none}
.dsh-readpilot-icon-btn{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 6px;border:1px solid transparent;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer}
.dsh-readpilot-icon-btn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-readpilot-icon-btn:disabled{opacity:.45;cursor:default}
.dsh-readpilot-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600;color:var(--dsw-alias-label-primary)}
.dsh-readpilot-subtitle{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:12px;margin-top:1px}
.dsh-readpilot-body{flex:1;min-height:0;overflow:auto;padding:20px 24px 40px}
.dsh-readpilot-library-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px}
.dsh-readpilot-library-head h2{margin:0;font-size:15px;font-weight:600}
.dsh-readpilot-primary{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 14px;border:1px solid transparent;border-radius:8px;background:var(--reader-fg,var(--dsw-alias-label-primary));color:var(--reader-bg,var(--dsw-alias-bg-base));font:inherit;font-weight:600;cursor:pointer}
.dsh-readpilot-primary:disabled{opacity:.5;cursor:default}
.dsh-readpilot-setup-actions{display:flex;gap:8px}
.dsh-readpilot-secondary{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer}
.dsh-readpilot-secondary:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-readpilot-secondary:disabled{opacity:.45;cursor:default}
.dsh-readpilot-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px}
.dsh-readpilot-card{display:flex;flex-direction:column;align-items:stretch;gap:8px;padding:14px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);color:inherit;text-align:left;font:inherit;cursor:pointer}
.dsh-readpilot-card:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}
.dsh-readpilot-cover{height:64px;border-radius:8px;background:linear-gradient(135deg,var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-2));display:flex;align-items:center;justify-content:center;color:var(--dsw-alias-label-secondary);font-size:12px;letter-spacing:.08em}
.dsh-readpilot-card-title{font-weight:600;line-height:1.35;word-break:break-word}
.dsh-readpilot-card-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--dsw-alias-label-secondary);font-size:12px}
.dsh-readpilot-progress{height:3px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.dsh-readpilot-progress span{display:block;height:100%;background:var(--dsw-alias-brand-primary)}
.dsh-readpilot-badge{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-warn-primary);font-size:11px}
.dsh-readpilot-empty{max-width:460px;margin:60px auto;text-align:center;color:var(--dsw-alias-label-secondary);line-height:1.7}
.dsh-readpilot-empty h2{margin:0 0 8px;font-size:16px;color:var(--dsw-alias-label-primary)}
.dsh-readpilot-library{position:relative;flex:1;min-height:0;display:grid;grid-template-columns:190px minmax(0,1fr);overflow:hidden}
.dsh-readpilot-library-side{min-height:0;overflow:auto;padding:16px 10px 28px;border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dsh-readpilot-library-side-title{padding:10px 8px 5px;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;letter-spacing:.04em}
.dsh-readpilot-library-category{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:7px 9px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.dsh-readpilot-library-category:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-readpilot-library-category[data-active="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
.dsh-readpilot-library-count{color:var(--dsw-alias-label-secondary);font-size:10px;font-weight:400}
.dsh-readpilot-library-main{min-height:0;display:flex;flex-direction:column;padding:16px 22px 30px;overflow:hidden}
.dsh-readpilot-library-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px}
.dsh-readpilot-library-head h2{margin:0;font-size:16px;font-weight:650}
.dsh-readpilot-library-subtitle{margin-top:3px;color:var(--dsw-alias-label-secondary);font-size:11px}
.dsh-readpilot-library-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.dsh-readpilot-library-search{flex:1;min-width:120px;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
.dsh-readpilot-library-search:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-readpilot-cover-toggle{height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.dsh-readpilot-cover-toggle:hover{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-brand-primary)}
.dsh-readpilot-cover-toggle[data-active="false"]{opacity:.7}
.dsh-readpilot-library-scroll{flex:1;min-height:0;overflow:auto;padding-right:4px}
.dsh-readpilot-section-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:4px 0 10px}
.dsh-readpilot-section-head h3{margin:0;font-size:13px;font-weight:650}
.dsh-readpilot-section-head span{color:var(--dsw-alias-label-secondary);font-size:11px}
.dsh-readpilot-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:12px}
.dsh-readpilot-book-card{position:relative;min-width:0;height:100%;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease}
.dsh-readpilot-book-card:hover{transform:translateY(-2px);border-color:var(--dsw-alias-brand-primary);box-shadow:0 8px 22px rgba(0,0,0,.16)}
.dsh-readpilot-book-open{display:flex;flex-direction:column;flex:1;width:100%;padding:0;border:0;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer}
.dsh-readpilot-book-cover{position:relative;flex:none;display:flex;align-items:center;justify-content:center;height:150px;padding:8px;background:linear-gradient(135deg,#6b7280,#374151);color:#fff;overflow:hidden}
.dsh-readpilot-book-card[data-format="md"] .dsh-readpilot-book-cover{background:linear-gradient(135deg,#5b7a73,#344d47)}
.dsh-readpilot-book-card[data-format="epub"] .dsh-readpilot-book-cover{background:linear-gradient(135deg,#6b6a86,#42415a)}
.dsh-readpilot-book-card[data-format="pdf"] .dsh-readpilot-book-cover{background:linear-gradient(135deg,#8a735c,#4d3f33)}
.dsh-readpilot-book-format{align-self:flex-start;padding:2px 6px;border-radius:5px;background:rgba(255,255,255,.18);font-size:9px;font-weight:700;letter-spacing:.08em}
.dsh-readpilot-book-cover-title{display:-webkit-box;overflow:hidden;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:13px;font-weight:650;line-height:1.35;text-shadow:0 1px 3px rgba(0,0,0,.25)}
.dsh-readpilot-book-cover-img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:6px;box-sizing:border-box}
.dsh-readpilot-book-cover-spinner{position:absolute;width:18px;height:18px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:dsh-readpilot-cover-spin .8s linear infinite}
.dsh-readpilot-book-cover[data-cover="ready"] .dsh-readpilot-book-cover-img{animation:dsh-readpilot-cover-fade .2s ease}
@keyframes dsh-readpilot-cover-spin{to{transform:rotate(360deg)}}
@keyframes dsh-readpilot-cover-fade{from{opacity:0}to{opacity:1}}
.dsh-readpilot-book-cover-fallback{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;width:100%;height:100%}
.dsh-readpilot-book-info{flex:1;padding:8px 10px 2px}
.dsh-readpilot-book-title{display:-webkit-box;overflow:hidden;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:12px;font-weight:600;line-height:1.4;word-break:break-word}
.dsh-readpilot-book-meta{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:5px;color:var(--dsw-alias-label-secondary);font-size:10px;min-width:0}
.dsh-readpilot-book-meta span{white-space:nowrap}
.dsh-readpilot-book-format-chip{padding:0 4px;border-radius:3px;background:var(--dsw-alias-bg-layer-2);font-size:9px;font-weight:700;letter-spacing:.06em}
.dsh-readpilot-book-progress{overflow:hidden;text-overflow:ellipsis;min-width:0;max-width:100%}
.dsh-readpilot-book-badges{display:flex;align-items:center;gap:6px;margin-top:5px}
.dsh-readpilot-book-reading{margin-top:6px;color:var(--dsw-alias-brand-primary);font-size:10px;font-weight:600}
.dsh-readpilot-book-tags{display:flex;gap:4px;margin-top:6px;overflow:hidden}
.dsh-readpilot-book-tag{max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:1px 5px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:9px}
.dsh-readpilot-book-actions{display:flex;justify-content:flex-end;padding:0 8px 8px}
.dsh-readpilot-book-tag-edit{padding:2px 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10px;cursor:pointer}
.dsh-readpilot-book-tag-edit:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-readpilot-library-empty{padding:36px 12px;color:var(--dsw-alias-label-secondary);font-size:12px;text-align:center}
.dsh-readpilot-book-overlay{position:absolute;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.28)}
.dsh-readpilot-book-dialog{width:min(460px,94vw);max-height:100%;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-overlay);box-shadow:0 24px 60px rgba(0,0,0,.3);overflow:hidden}
.dsh-readpilot-book-dialog-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:16px 18px 12px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-book-dialog-heading{min-width:0}
.dsh-readpilot-book-dialog-heading h3{margin:0;font-size:15px;font-weight:650}
.dsh-readpilot-book-dialog-title{margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:12px}
.dsh-readpilot-book-dialog-close{flex:none;width:26px;height:26px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:18px;line-height:1;cursor:pointer}
.dsh-readpilot-book-dialog-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-readpilot-book-dialog-body{display:flex;flex-direction:column;gap:16px;padding:16px 18px;overflow:auto}
.dsh-readpilot-book-field{display:flex;flex-direction:column;gap:7px}
.dsh-readpilot-book-field-label{color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;letter-spacing:.04em}
.dsh-readpilot-book-dialog-actions{display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dsh-readpilot-tag-list{display:flex;flex-wrap:wrap;gap:6px;min-height:24px}
.dsh-readpilot-tag-list .dsh-readpilot-muted{padding:2px 0;font-size:11px}
.dsh-readpilot-tag-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 4px 3px 8px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:11px}
.dsh-readpilot-tag-remove{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer}
.dsh-readpilot-meta-options{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.dsh-readpilot-status-option{padding:4px 10px;border:1px solid transparent;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}
.dsh-readpilot-status-option:hover{color:var(--dsw-alias-label-primary)}
.dsh-readpilot-status-option[data-active="true"]{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);color:var(--dsw-alias-brand-primary);font-weight:600}
.dsh-readpilot-rating-star{padding:0 3px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font-size:22px;line-height:1;cursor:pointer;opacity:.35;transition:opacity .12s ease,transform .12s ease}
.dsh-readpilot-rating-star:hover{opacity:.7;transform:scale(1.08)}
.dsh-readpilot-rating-star[data-active="true"]{color:#e0a53a;opacity:1}
.dsh-readpilot-rating-clear{margin-left:6px;padding:3px 9px;font-size:11px}
.dsh-readpilot-book-status{padding:0 5px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);font-size:9px;white-space:nowrap}
.dsh-readpilot-book-status[data-status="done"]{color:var(--dsw-alias-brand-primary)}
.dsh-readpilot-book-rating{color:#e0a53a;font-size:10px;letter-spacing:.5px;white-space:nowrap}
.dsh-readpilot-tag-remove:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-state-error-primary)}
.dsh-readpilot-tag-input-row{display:flex;gap:8px}
.dsh-readpilot-tag-input-row input{flex:1;min-width:0;height:32px;padding:0 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
.dsh-readpilot-tag-suggestions{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px;max-height:92px;overflow:auto}
.dsh-readpilot-tag-suggestion{padding:3px 7px;border:1px dashed var(--dsw-alias-border-l2);border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10px;cursor:pointer}
.dsh-readpilot-tag-suggestion:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}
@media (max-width:760px){.dsh-readpilot-library{grid-template-columns:1fr;overflow:auto}.dsh-readpilot-library-side{display:flex;gap:4px;overflow-x:auto;padding:8px 10px;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l2)}.dsh-readpilot-library-side-title{display:none}.dsh-readpilot-library-category{width:auto;flex:none;white-space:nowrap}.dsh-readpilot-library-main{overflow:visible;padding:14px 14px 30px}.dsh-readpilot-library-scroll{overflow:visible}.dsh-readpilot-book-tag-edit{opacity:1}}
.dsh-readpilot-setup{flex:1;display:flex;align-items:center;justify-content:center;padding:24px}
.dsh-readpilot-setup-card{width:min(520px,100%);padding:26px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 12px 40px rgba(0,0,0,.10)}
.dsh-readpilot-setup-card h2{margin:0 0 8px;font-size:18px}
.dsh-readpilot-setup-card p{margin:0 0 18px;color:var(--dsw-alias-label-secondary);line-height:1.65}
.dsh-readpilot-path-row{display:flex;gap:8px;margin-bottom:14px}
.dsh-readpilot-path-row input{flex:1;min-width:0;height:34px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit}
.dsh-readpilot-path-row input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-readpilot-book{flex:1;min-height:0;display:grid;position:relative;grid-template-columns:230px minmax(0,1fr) var(--dsh-readpilot-chat-width,420px)}
.dsh-readpilot-book[data-toc="false"]{grid-template-columns:minmax(0,1fr) var(--dsh-readpilot-chat-width,420px)}
.dsh-readpilot-book[data-chat="false"]{grid-template-columns:230px minmax(0,1fr)}
.dsh-readpilot-book[data-toc="false"][data-chat="false"]{grid-template-columns:minmax(0,1fr)}
.dsh-readpilot-toc{min-height:0;overflow:auto;padding:12px 10px 40px;border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dsh-readpilot-toc-title{padding:4px 8px 8px;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600;letter-spacing:.04em}
.dsh-readpilot-toc-list{display:flex;flex-direction:column;gap:2px}
.dsh-readpilot-toc-item{display:block;width:100%;padding:7px 8px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);text-align:left;font:inherit;line-height:1.45;cursor:pointer}
.dsh-readpilot-toc-item:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-readpilot-toc-item[data-active="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
.dsh-readpilot-toc-item:disabled{opacity:.45;cursor:default}
.dsh-readpilot-chat{position:relative;min-height:0;display:flex;flex-direction:column;border-left:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dsh-readpilot-chat-resizer{position:absolute;left:-3px;top:0;bottom:0;width:6px;z-index:3;cursor:col-resize;background:transparent;border:0;padding:0}
.dsh-readpilot-chat-resizer:hover,.dsh-readpilot-chat-resizer:focus-visible{background:var(--dsw-alias-brand-primary);outline:none}
.dsh-readpilot-chat-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-chat-tabs{display:flex;align-items:center;gap:2px;min-width:0;padding:2px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);overflow-x:auto;scrollbar-width:none}
.dsh-readpilot-chat-tab{flex:none;height:24px;padding:0 8px;white-space:nowrap;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.dsh-readpilot-chat-tab:hover{color:var(--dsw-alias-label-primary)}
.dsh-readpilot-chat-tab[data-active="true"]{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-weight:600}
.dsh-readpilot-chat-close{height:24px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.dsh-readpilot-chat-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-readpilot-chat-body{flex:1;min-height:0;overflow:auto;padding:12px 12px 4px}
.dsh-readpilot-page-jump{display:inline;margin:0;padding:0;border:0;background:none;color:var(--dsw-alias-brand-primary);font:inherit;line-height:inherit;cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px}
.dsh-readpilot-page-jump:hover{text-decoration-style:solid}
.dsh-readpilot-native-chat{flex:1;min-height:0;min-width:0;display:flex;flex-direction:column;overflow:hidden}
.dsh-readpilot-native-chat>[data-conversation-content]{flex:1;min-height:0;min-width:0}
.dsh-readpilot-chat-fallback{flex:1;min-height:0;display:flex;flex-direction:column}
.dsh-readpilot-chat-empty{padding:18px 6px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.7}
.dsh-readpilot-chat-more{display:block;width:100%;margin-bottom:10px;padding:5px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
.dsh-readpilot-chat-more:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-readpilot-msg{display:flex;flex-direction:column;gap:5px;margin-bottom:14px;max-width:100%}
.dsh-readpilot-msg[data-role="user"]{align-items:flex-end;margin-left:28px}
.dsh-readpilot-msg[data-role="assistant"]{align-items:flex-start;margin-right:28px}
.dsh-readpilot-msg-role{display:inline-flex;align-items:center;gap:5px;padding:1px 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10.5px;line-height:1.6}
.dsh-readpilot-msg[data-role="user"] .dsh-readpilot-msg-role{color:var(--dsw-alias-brand-primary)}
.dsh-readpilot-msg[data-role="assistant"] .dsh-readpilot-msg-role::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-brand-primary)}
.dsh-readpilot-msg-text{max-width:92%;white-space:pre-wrap;word-break:break-word;line-height:1.7;font-size:13px}
.dsh-readpilot-msg[data-role="user"] .dsh-readpilot-msg-text{padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;border-top-right-radius:3px;background:var(--dsw-alias-bg-layer-2)}
.dsh-readpilot-msg[data-role="assistant"] .dsh-readpilot-md{max-width:92%;padding:2px 0 2px 10px;border-left:2px solid var(--dsw-alias-brand-primary)}
.dsh-readpilot-md{max-width:92%;min-width:0;font-size:13px;line-height:1.7;word-break:break-word;color:var(--dsw-alias-label-primary)}
.dsh-readpilot-md p{margin:0 0 .7em;white-space:pre-wrap}
.dsh-readpilot-md p:last-child{margin-bottom:0}
.dsh-readpilot-md h3,.dsh-readpilot-md h4,.dsh-readpilot-md h5,.dsh-readpilot-md h6{margin:.9em 0 .35em;line-height:1.4;font-weight:650}
.dsh-readpilot-md h3:first-child,.dsh-readpilot-md h4:first-child,.dsh-readpilot-md h5:first-child,.dsh-readpilot-md h6:first-child{margin-top:0}
.dsh-readpilot-md h3{font-size:1.2em}
.dsh-readpilot-md h4{font-size:1.1em}
.dsh-readpilot-md h5,.dsh-readpilot-md h6{font-size:1em}
.dsh-readpilot-md pre{margin:.6em 0;padding:10px 12px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);overflow:auto;font-size:12px;line-height:1.6}
.dsh-readpilot-md code{padding:1px 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);font-size:.92em}
.dsh-readpilot-md pre code{padding:0;background:transparent}
.dsh-readpilot-md blockquote{margin:.6em 0;padding:2px 0 2px 10px;border-left:2px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:pre-wrap}
.dsh-readpilot-md a{color:var(--dsw-alias-brand-primary);text-decoration:underline;text-underline-offset:2px}
.dsh-readpilot-md hr.dsh-readpilot-md-hr{border:0;border-top:1px solid var(--dsw-alias-border-l2);margin:12px 0}
.dsh-readpilot-md .dsh-readpilot-li{margin:0 0 .45em}
.dsh-readpilot-chat-thinking{color:var(--dsw-alias-label-secondary);font-size:12px;padding:2px 0 10px}
.dsh-readpilot-chat-error{margin:0 12px 8px;padding:7px 9px;border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.55}
.dsh-readpilot-notes{flex:1;min-height:0;overflow:auto;padding:10px 12px 16px}
.dsh-readpilot-long-notes{display:flex;flex-direction:column;gap:8px;padding:2px 0 12px;margin-bottom:10px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-long-notes-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dsh-readpilot-long-notes-head h4{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600;letter-spacing:.03em}
.dsh-readpilot-long-notes-actions{display:flex;gap:4px}
.dsh-readpilot-note-context{display:flex;align-items:center;gap:7px;width:100%;padding:6px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.dsh-readpilot-note-context[data-on="true"]{border-color:var(--dsw-alias-brand-primary)}
.dsh-readpilot-note-context:disabled{opacity:.6;cursor:default}
.dsh-readpilot-note-context-switch{position:relative;flex:none;width:26px;height:15px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);transition:background .15s}
.dsh-readpilot-note-context-switch::after{content:"";position:absolute;top:2px;left:2px;width:11px;height:11px;border-radius:50%;background:var(--dsw-alias-label-secondary);transition:transform .15s}
.dsh-readpilot-note-context-switch[data-on="true"]{background:var(--dsw-alias-brand-primary)}
.dsh-readpilot-note-context-switch[data-on="true"]::after{transform:translateX(11px);background:#fff}
.dsh-readpilot-note-context-label{flex:1;min-width:0}
.dsh-readpilot-note-context-state{color:var(--dsw-alias-label-secondary);font-size:11px}
.dsh-readpilot-note-context-chars{color:var(--dsw-alias-label-secondary);font-size:10.5px}
.dsh-readpilot-drafts{display:flex;flex-direction:column;gap:7px;padding:2px 0 10px;margin-bottom:8px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-drafts-head{color:var(--dsw-alias-label-secondary);font-size:11.5px;font-weight:600}
.dsh-readpilot-draft{display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base)}
.dsh-readpilot-draft-head{display:flex;align-items:center;gap:6px;min-width:0}
.dsh-readpilot-diff{max-height:220px;overflow:auto;margin:0;padding:6px 8px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
.dsh-readpilot-diff-line{padding:0 3px;border-radius:3px}
.dsh-readpilot-diff-add{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.dsh-readpilot-diff-del{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.dsh-readpilot-diff-same{color:var(--dsw-alias-label-secondary)}
.dsh-readpilot-memory{display:flex;flex-direction:column;gap:8px;padding:2px 0 12px;margin-bottom:10px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-memory-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.dsh-readpilot-memory-head h4{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600;letter-spacing:.03em}
.dsh-readpilot-memory-modes{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.dsh-readpilot-memory-card{display:flex;flex-direction:column;gap:6px}
.dsh-readpilot-memory-card-head{display:flex;align-items:center;justify-content:space-between;gap:6px}
.dsh-readpilot-memory-card textarea{display:block;width:100%;box-sizing:border-box;min-height:88px;max-height:220px;padding:8px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:1.6;resize:vertical}
.dsh-readpilot-memory-card textarea:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-readpilot-memory-history{font-size:11px}
.dsh-readpilot-memory-history summary{cursor:pointer;color:var(--dsw-alias-label-secondary)}
.dsh-readpilot-memory-proposals{display:flex;flex-direction:column;gap:7px}
.dsh-readpilot-history{display:flex;flex-direction:column;gap:5px;max-height:240px;overflow:auto;padding:7px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}
.dsh-readpilot-history-row{display:flex;align-items:center;gap:7px;padding:2px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-history-row:last-child{border-bottom:0}
.dsh-readpilot-long-list{display:flex;flex-direction:column;gap:4px}
.dsh-readpilot-long-note{display:flex;align-items:center;gap:7px;width:100%;padding:7px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer}
.dsh-readpilot-long-note:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-readpilot-long-kind{flex:none;padding:1px 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10.5px;line-height:1.6}
.dsh-readpilot-long-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
.dsh-readpilot-long-meta{flex:none;color:var(--dsw-alias-label-secondary);font-size:10.5px}
.dsh-readpilot-long-hint{padding-top:4px;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:1.6}
.dsh-readpilot-long-editor{display:flex;flex-direction:column;gap:7px}
.dsh-readpilot-long-editor-head{display:flex;align-items:center;gap:6px}
.dsh-readpilot-long-editor-head input{flex:1;min-width:0;height:30px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.dsh-readpilot-long-editor textarea{display:block;width:100%;box-sizing:border-box;min-height:180px;max-height:46vh;padding:8px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.6;resize:vertical}
.dsh-readpilot-long-editor-head input:focus,.dsh-readpilot-long-editor textarea:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-readpilot-long-editor-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dsh-readpilot-long-conflict{display:flex;align-items:center;gap:6px;padding:6px 8px;border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.5}
.dsh-readpilot-long-preview summary{cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:1.8}
.dsh-readpilot-long-preview .dsh-readpilot-md{max-width:none;margin-top:6px;padding-left:0;border-left:0}
.dsh-readpilot-note{display:flex;align-items:flex-start;gap:8px;padding:10px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-note:last-child{border-bottom:0}
.dsh-readpilot-note-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;padding:0;border:0;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer}
.dsh-readpilot-note-main:hover .dsh-readpilot-note-body{color:var(--dsw-alias-brand-primary)}
.dsh-readpilot-note-chapter{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.5}
.dsh-readpilot-note-quote{padding-left:8px;border-left:2px solid var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word}
.dsh-readpilot-note-body{color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.65;white-space:pre-wrap;word-break:break-word}
.dsh-readpilot-note-delete{flex:none;height:24px;padding:0 7px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}
.dsh-readpilot-note-jump{flex:none;height:24px;padding:0 7px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-brand-primary);font:inherit;font-size:11px;cursor:pointer}
.dsh-readpilot-note-jump:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-readpilot-note-delete:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary)}
.dsh-readpilot-note-delete:disabled{opacity:.45;cursor:default}
.dsh-readpilot-chat-compose{flex:none;padding:10px 12px 12px;border-top:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-chat-compose textarea{display:block;width:100%;box-sizing:border-box;min-height:58px;max-height:140px;padding:8px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.55;resize:vertical}
.dsh-readpilot-chat-compose textarea:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-readpilot-chat-compose-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px}
.dsh-readpilot-chat-hint{color:var(--dsw-alias-label-secondary);font-size:11px}
.dsh-readpilot-chat-send{height:28px;padding:0 12px;border:0;border-radius:7px;background:var(--reader-fg,var(--dsw-alias-label-primary));color:var(--reader-bg,var(--dsw-alias-bg-base));font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.dsh-readpilot-chat-send:disabled{opacity:.5;cursor:default}
.dsh-readpilot-chat-backdrop{display:none}
.dsh-readpilot-search{flex:none;max-height:46vh;overflow:auto;padding:10px 18px 12px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dsh-readpilot-search-bar{display:flex;align-items:center;gap:8px}
.dsh-readpilot-search-bar input{flex:1;min-width:0;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.dsh-readpilot-search-bar input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-readpilot-search-list{display:flex;flex-direction:column;gap:2px;margin-top:8px}
.dsh-readpilot-search-result{display:flex;flex-direction:column;gap:3px;width:100%;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer}
.dsh-readpilot-search-result:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-readpilot-search-chapter{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:600}
.dsh-readpilot-search-snippet{color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.dsh-readpilot-search-hint{padding:10px 2px 2px;color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.6}
.dsh-readpilot-search-hint[data-error="true"]{color:var(--dsw-alias-state-error-primary)}
.dsh-readpilot-reader{min-height:0;overflow:auto;padding:28px 40px 90px;background:var(--reader-bg,var(--dsw-alias-bg-base));color:var(--reader-fg,var(--dsw-alias-label-primary))}
.dsh-readpilot-visual{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;gap:8px;overflow:auto;padding:12px 20px 50px;background:var(--reader-bg,var(--dsw-alias-bg-base))}
.dsh-readpilot-visual-bar{flex:none;display:flex;align-items:center;gap:8px;justify-content:center;flex-wrap:wrap;padding:2px 0}
.dsh-readpilot-page-input{width:56px;height:28px;padding:0 6px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:center}
.dsh-readpilot-page-total{color:var(--dsw-alias-label-secondary);font-size:12px}
.dsh-readpilot-epub-bar{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px}
.dsh-readpilot-epub-title{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}
.dsh-readpilot-palette-select{height:28px;max-width:112px;padding:0 6px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.dsh-readpilot-pdf-page{position:relative;margin:0 auto;flex:none;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.22)}
.dsh-readpilot-pdf-page img{position:absolute;inset:0;width:100%;height:100%;display:block;user-select:none;-webkit-user-drag:none}
.dsh-readpilot-pdf-text{position:absolute;inset:0;overflow:hidden;line-height:1;z-index:1}
.dsh-readpilot-pdf-text-item{position:absolute;color:transparent;white-space:pre;transform-origin:0 0;user-select:text;cursor:text}
.dsh-readpilot-pdf-text-item::selection{background:var(--reader-selection,rgba(64,128,255,.35));color:transparent}
.dsh-readpilot-reader ::selection{background:var(--reader-selection,rgba(64,128,255,.30))}
.dsh-readpilot-epub-frame{flex:1;min-height:70vh;width:100%;border:0;background:#fff;border-radius:6px}
.dsh-readpilot-visual-loading{position:absolute;top:10px;right:16px;z-index:4;padding:2px 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11px;pointer-events:none}
.dsh-readpilot-visual-error{display:flex;flex-direction:column;gap:16px;padding:20px;color:var(--dsw-alias-state-error-primary);font-size:13px}
.dsh-readpilot-visual-error .dsh-readpilot-reader-inner{color:var(--dsw-alias-label-primary);max-width:760px;margin:0 auto}
.dsh-readpilot-reader-inner{position:relative;box-sizing:border-box;max-width:760px;margin:0 auto;line-height:1.9;color:var(--reader-fg,var(--dsw-alias-label-primary))}
.dsh-readpilot-main{display:flex;flex-direction:column;min-width:0;min-height:0}
.dsh-readpilot-main>.dsh-readpilot-reader{flex:1;min-height:0}
.dsh-readpilot-bar{flex:none;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 14px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.dsh-readpilot-bar-group{display:flex;align-items:center;gap:4px;min-width:0;flex-wrap:wrap}
.dsh-readpilot-bar-title{flex:1 1 120px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}
.dsh-readpilot-bar-position{flex:none;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:12px;font-variant-numeric:tabular-nums}
.dsh-readpilot-bar .dsh-readpilot-secondary{height:28px;padding:0 9px;border-radius:7px;font-size:12px}
.dsh-readpilot-bar .dsh-readpilot-bar-btn{min-width:28px;padding:0 7px}
.dsh-readpilot-bar .dsh-readpilot-page-input{width:52px}
.dsh-readpilot-bar-toggle[data-active="true"],.dsh-readpilot-bar-toggle[aria-pressed="true"]{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
.dsh-readpilot-reader[data-paged="true"]{flex:1;min-height:0;display:flex;flex-direction:column;padding:0;overflow:hidden}
.dsh-readpilot-page-frame{flex:1;min-height:0;box-sizing:border-box;width:100%;max-width:100%;margin:0 auto;padding:28px 40px;overflow:hidden}
.dsh-readpilot-paged-inner{height:100%;width:100%;max-width:none;margin:0;column-fill:auto;overflow:hidden}
.dsh-readpilot-pdf-spread{display:flex;flex-direction:row;align-items:center;justify-content:center;gap:16px;max-width:100%;margin-block:auto}
.dsh-readpilot-pdf-spread .dsh-readpilot-pdf-page{margin:0}
.dsh-readpilot-visual[data-paged="true"]{overflow:auto}
/* keep the 62px total block padding but split it evenly so paged PDF pages sit at the visual center */
.dsh-readpilot-visual[data-paged="true"]:has(>.dsh-readpilot-pdf-spread){padding-block:31px}
.dsh-readpilot-epub-frame[data-paged="true"]{height:100%;min-height:0}
.dsh-readpilot-note-layer{position:absolute;inset:0;pointer-events:none;z-index:2}
.dsh-readpilot-note-hit{position:absolute;background:var(--reader-highlight,rgba(245,197,66,.45));border-radius:2px;pointer-events:auto;cursor:pointer;opacity:.8}
.dsh-readpilot-note-hit:hover{opacity:1}
.dsh-readpilot-highlight-yellow{background:rgba(250,204,21,.38)!important}
.dsh-readpilot-highlight-green{background:rgba(74,222,128,.32)!important}
.dsh-readpilot-highlight-blue{background:rgba(96,165,250,.32)!important}
.dsh-readpilot-highlight-pink{background:rgba(244,114,182,.30)!important}
.dsh-readpilot-highlight-purple{background:rgba(192,132,252,.30)!important}
.dsh-readpilot-selection-colors{display:flex;align-items:center;gap:4px;padding-right:5px;margin-right:1px;border-right:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-color-btn{width:18px;height:18px;padding:0;border:1px solid rgba(0,0,0,.14);border-radius:50%;cursor:pointer;box-sizing:border-box}
.dsh-readpilot-color-btn[data-color="yellow"],.dsh-readpilot-color-dot.dsh-readpilot-color-yellow{background:#facc15}
.dsh-readpilot-color-btn[data-color="green"],.dsh-readpilot-color-dot.dsh-readpilot-color-green{background:#4ade80}
.dsh-readpilot-color-btn[data-color="blue"],.dsh-readpilot-color-dot.dsh-readpilot-color-blue{background:#60a5fa}
.dsh-readpilot-color-btn[data-color="pink"],.dsh-readpilot-color-dot.dsh-readpilot-color-pink{background:#f472b6}
.dsh-readpilot-color-btn[data-color="purple"],.dsh-readpilot-color-dot.dsh-readpilot-color-purple{background:#c084fc}
.dsh-readpilot-color-btn[data-active="true"]{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-readpilot-color-dot{display:inline-block;width:8px;height:8px;margin-right:5px;border-radius:50%;vertical-align:middle}
.dsh-readpilot-note-colors{display:flex;gap:8px;margin:0 0 10px}
.dsh-readpilot-mark-section{margin-bottom:14px}
.dsh-readpilot-mark-filters{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 12px}
.dsh-readpilot-color-filters{display:flex;align-items:center;gap:6px}
.dsh-readpilot-color-filter{width:18px;height:18px;padding:0;border:2px solid transparent;border-radius:50%;cursor:pointer;opacity:.55;transition:opacity .12s ease}
.dsh-readpilot-color-filter[data-active="true"]{opacity:1;border-color:var(--dsw-alias-label-primary)}
.dsh-readpilot-color-filter.dsh-readpilot-color-yellow{background:#facc15}
.dsh-readpilot-color-filter.dsh-readpilot-color-green{background:#4ade80}
.dsh-readpilot-color-filter.dsh-readpilot-color-blue{background:#60a5fa}
.dsh-readpilot-color-filter.dsh-readpilot-color-pink{background:#f472b6}
.dsh-readpilot-color-filter.dsh-readpilot-color-purple{background:#c084fc}
.dsh-readpilot-mark-section h4{margin:0 0 6px;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.dsh-readpilot-mark-bookmark .dsh-readpilot-note-body{font-size:11px;color:var(--dsw-alias-label-secondary)}
.dsh-readpilot-chapter-title{margin:0 0 22px;font-size:22px;line-height:1.35;font-weight:650}
.dsh-readpilot-reader p{margin:0 0 1.1em;white-space:pre-wrap;word-break:break-word}
.dsh-readpilot-reader h3{margin:1.6em 0 .6em;font-size:1.08em;line-height:1.4}
.dsh-readpilot-reader blockquote{margin:1em 0;padding:2px 0 2px 14px;border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.dsh-readpilot-reader pre{margin:1em 0;padding:12px 14px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);overflow:auto;font-size:12.5px;line-height:1.6}
.dsh-readpilot-reader code{padding:1px 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);font-size:.92em}
.dsh-readpilot-reader pre code{padding:0;background:transparent}
.dsh-readpilot-reader a{color:var(--dsw-alias-brand-primary);text-decoration:underline;text-underline-offset:2px}
.dsh-readpilot-li{display:flex;gap:8px;margin:0 0 .5em;white-space:pre-wrap}
.dsh-readpilot-li-marker{color:var(--dsw-alias-label-secondary);flex:none;min-width:1.1em}
.dsh-readpilot-flash{background:var(--dsw-alias-bg-layer-2);border-radius:4px;transition:background .2s ease}
.dsh-readpilot-selection{position:fixed;z-index:50;transform:translateX(-50%);display:flex;gap:4px;padding:5px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-overlay);box-shadow:0 10px 34px rgba(0,0,0,.24)}
.dsh-readpilot-selection button{height:26px;padding:0 9px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.dsh-readpilot-selection button:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-readpilot-selection .dsh-readpilot-color-btn{width:18px;height:18px;padding:0;border-radius:50%}
.dsh-readpilot-note-overlay{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.24)}
.dsh-readpilot-note-dialog{width:min(520px,100%);max-height:min(82vh,620px);display:flex;flex-direction:column;padding:18px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-overlay);box-shadow:0 18px 50px rgba(0,0,0,.28)}
.dsh-readpilot-note-dialog h3{margin:0 0 10px;font-size:14px;font-weight:650}
.dsh-readpilot-note-dialog-quote{flex:none;max-height:140px;overflow:auto;margin-bottom:10px;padding:8px 10px;border-left:3px solid var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.dsh-readpilot-note-dialog textarea{display:block;width:100%;box-sizing:border-box;min-height:88px;max-height:220px;padding:8px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.6;resize:vertical}
.dsh-readpilot-note-dialog textarea:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-readpilot-note-dialog-error{margin-top:8px;padding:7px 9px;border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.55}
.dsh-readpilot-note-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
.dsh-readpilot-banner{flex:none;padding:8px 18px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-warn-primary);font-size:12.5px;line-height:1.5}
.dsh-readpilot-error{flex:none;padding:8px 18px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary);font-size:12.5px;line-height:1.5}
.dsh-readpilot-muted{padding:40px 20px;text-align:center;color:var(--dsw-alias-label-secondary)}
.dsh-readpilot-spacer{flex:1}
.dsh-readpilot-page{flex:1;min-height:0;overflow:auto;padding:0 14px 24px;scroll-behavior:smooth}
.dsh-readpilot-notes,.dsh-readpilot-long-notes,.dsh-readpilot-memory{padding:0 14px 24px;margin:0;border-bottom:0}
.dsh-readpilot-page-content{display:flex;flex-direction:column;gap:10px}
.dsh-readpilot-page-head{position:sticky;top:0;z-index:5;display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 -14px 12px;padding:14px 14px 11px;border-bottom:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb,var(--dsw-alias-bg-base) 92%,transparent);backdrop-filter:blur(10px)}
.dsh-readpilot-page-heading{min-width:0;display:flex;flex-direction:column;gap:3px}
.dsh-readpilot-page-title-row{display:flex;align-items:center;gap:7px;min-width:0}
.dsh-readpilot-page-title-row h3{margin:0;font-size:15px;line-height:1.3;font-weight:650;letter-spacing:.01em}
.dsh-readpilot-page-count{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10.5px;font-weight:600}
.dsh-readpilot-page-subtitle{margin:0;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:1.45}
.dsh-readpilot-page-actions{display:flex;gap:5px;flex:none;flex-wrap:wrap;justify-content:flex-end;margin-left:auto}
.dsh-readpilot-page-toolbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 10px}
.dsh-readpilot-pill,.dsh-readpilot-tool-btn{height:26px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;cursor:pointer;transition:background .15s,border-color .15s,color .15s}
.dsh-readpilot-pill:hover,.dsh-readpilot-tool-btn:hover{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}
.dsh-readpilot-pill:disabled,.dsh-readpilot-tool-btn:disabled{opacity:.45;cursor:default}
.dsh-readpilot-card{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:11px}
.dsh-readpilot-section-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}
.dsh-readpilot-section-head h4{margin:0;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:650;letter-spacing:.05em;text-transform:uppercase}
.dsh-readpilot-section-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10px}
.dsh-readpilot-empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:220px;padding:30px 20px;text-align:center}
.dsh-readpilot-empty-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-brand-primary);font-size:20px;line-height:1}
.dsh-readpilot-empty-title{font-size:13.5px;font-weight:600;line-height:1.4}
.dsh-readpilot-empty-hint{max-width:250px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}
.dsh-readpilot-mark-section{margin-bottom:10px;padding:10px 11px}
.dsh-readpilot-mark-section .dsh-readpilot-note{padding:10px 0}
.dsh-readpilot-mark-section .dsh-readpilot-note:last-child{border-bottom:0}
.dsh-readpilot-list-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 2px;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:650;letter-spacing:.05em;text-transform:uppercase}
.dsh-readpilot-long-notes{gap:10px}
.dsh-readpilot-long-notes .dsh-readpilot-note-context{background:var(--dsw-alias-bg-layer-1)}
.dsh-readpilot-drafts{padding:10px 11px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 5%,var(--dsw-alias-bg-layer-1));border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 30%,var(--dsw-alias-border-l2))}
.dsh-readpilot-draft{border-left:3px solid var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-base)}
.dsh-readpilot-long-list{display:flex;flex-direction:column;gap:7px}
.dsh-readpilot-long-note{padding:11px 12px;border-radius:10px;transition:border-color .15s,background .15s,transform .15s}
.dsh-readpilot-long-note:hover{transform:translateY(-1px);border-color:var(--dsw-alias-brand-primary)}
.dsh-readpilot-long-note[data-kind="book"]{background:linear-gradient(135deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,var(--dsw-alias-bg-base)),var(--dsw-alias-bg-base));border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 28%,var(--dsw-alias-border-l2))}
.dsh-readpilot-editor-card{padding:12px;background:var(--dsw-alias-bg-layer-1)}
.dsh-readpilot-editor-card .dsh-readpilot-long-editor-head input{height:32px}
.dsh-readpilot-memory{gap:10px}
.dsh-readpilot-memory-controls{display:flex;flex-direction:column;gap:10px;padding:11px}
.dsh-readpilot-control-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:26px}
.dsh-readpilot-control-label{flex:0 0 62px;color:var(--dsw-alias-label-secondary);font-size:11.5px}
.dsh-readpilot-segmented{display:inline-flex;gap:2px;padding:2px;border-radius:8px;background:var(--dsw-alias-bg-layer-2)}
.dsh-readpilot-segment{height:24px;padding:0 9px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;cursor:pointer;transition:background .15s,color .15s}
.dsh-readpilot-segment:hover{color:var(--dsw-alias-label-primary)}
.dsh-readpilot-segment[data-active="true"]{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.dsh-readpilot-segment:disabled{opacity:.5;cursor:default}
.dsh-readpilot-status-pill{display:inline-flex;align-items:center;height:20px;padding:0 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10.5px;font-weight:600;white-space:nowrap}
.dsh-readpilot-status-pill[data-state="on"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 14%,transparent);color:var(--dsw-alias-state-success-primary)}
.dsh-readpilot-status-pill[data-state="ask"]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}
.dsh-readpilot-status-pill[data-state="off"]{opacity:.8}
.dsh-readpilot-icon-action{display:grid;place-items:center;width:26px;height:26px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font:inherit;font-size:14px;cursor:pointer}
.dsh-readpilot-icon-action:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-readpilot-icon-action:disabled{opacity:.45;cursor:default}
.dsh-readpilot-memory-card{padding:11px;gap:8px}
.dsh-readpilot-memory-card-title{font-size:12.5px;font-weight:600}
.dsh-readpilot-memory-proposals{padding:11px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 5%,var(--dsw-alias-bg-layer-1));border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 28%,var(--dsw-alias-border-l2))}
.dsh-readpilot-memory-hint{padding:0 2px;font-size:11.5px;line-height:1.6}
.dsh-readpilot-chat-tabs{border:1px solid var(--dsw-alias-border-l2);padding:3px}
.dsh-readpilot-chat-tab{transition:background .15s,color .15s;border-radius:6px}
.dsh-readpilot-chat-tab:hover{background:color-mix(in srgb,var(--dsw-alias-bg-base) 70%,transparent)}
.dsh-readpilot-chat-tab[data-active="true"]{background:var(--dsw-alias-bg-base);box-shadow:0 1px 3px rgba(0,0,0,.08)}
.dsh-readpilot-chat-tab:focus-visible,.dsh-readpilot-pill:focus-visible,.dsh-readpilot-tool-btn:focus-visible,.dsh-readpilot-segment:focus-visible,.dsh-readpilot-icon-action:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-readpilot-create-card{display:flex;flex-direction:column;gap:8px}
.dsh-readpilot-create-card input{width:100%;box-sizing:border-box;height:32px;padding:0 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.dsh-readpilot-create-card input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-readpilot-preview-card{display:flex;flex-direction:column;gap:10px}
.dsh-readpilot-preview-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsh-readpilot-preview-head h4{flex:1;min-width:0;margin:0;font-size:15px;line-height:1.45;font-weight:650;word-break:break-word}
.dsh-readpilot-preview-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding-bottom:9px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-preview-body{max-height:58vh;overflow:auto;padding:2px 1px 4px;font-size:13px;line-height:1.7}
.dsh-readpilot-preview-body .dsh-readpilot-md{max-width:none;padding-left:0;border-left:0}
.dsh-readpilot-preview-card .dsh-readpilot-history{margin-top:2px}
.dsh-readpilot-preview-card .dsh-readpilot-long-hint{padding-top:0}
.dsh-readpilot-modal-overlay{position:fixed;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.38);backdrop-filter:blur(5px);animation:dsh-readpilot-fade-in .14s ease-out}
.dsh-readpilot-modal{position:relative;width:min(820px,100%);min-height:min(520px,80vh);max-height:min(86vh,860px);display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l2);border-radius:18px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 28px 80px rgba(0,0,0,.34);overflow:hidden;animation:dsh-readpilot-pop-in .16s ease-out}
.dsh-readpilot-modal::before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,var(--dsw-alias-brand-primary),transparent 72%);opacity:.85;pointer-events:none}
.dsh-readpilot-modal-head{flex:none;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 20px 14px;border-bottom:1px solid var(--dsw-alias-border-l2);background:linear-gradient(180deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 7%,transparent),transparent)}
.dsh-readpilot-modal-title{min-width:0;display:flex;flex-direction:column;gap:6px}
.dsh-readpilot-modal-title h3{margin:0;font-size:17px;line-height:1.4;font-weight:650;letter-spacing:.01em;word-break:break-word}
.dsh-readpilot-modal-meta{display:inline-flex;align-items:center;gap:6px;width:fit-content;padding:2px 7px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:1.5}
.dsh-readpilot-modal-actions{flex:none;display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:10px 20px;border-bottom:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 3%,var(--dsw-alias-bg-layer-1))}
.dsh-readpilot-modal-body{flex:1;min-height:0;overflow:auto;padding:18px 20px 24px;font-size:13.5px;line-height:1.78;overscroll-behavior:contain;scrollbar-gutter:stable}
.dsh-readpilot-modal-body .dsh-readpilot-md{max-width:none;padding-left:0;border-left:0}
.dsh-readpilot-modal-body .dsh-readpilot-md p:first-child,.dsh-readpilot-modal-body .dsh-readpilot-md h1:first-child,.dsh-readpilot-modal-body .dsh-readpilot-md h2:first-child,.dsh-readpilot-modal-body .dsh-readpilot-md h3:first-child{margin-top:0}
.dsh-readpilot-modal-body .dsh-readpilot-md h1,.dsh-readpilot-modal-body .dsh-readpilot-md h2,.dsh-readpilot-modal-body .dsh-readpilot-md h3{margin:1.25em 0 .55em;line-height:1.45}
.dsh-readpilot-modal-body .dsh-readpilot-md blockquote{margin:1em 0;padding:2px 0 2px 12px;border-left:3px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,var(--dsw-alias-border-l2));color:var(--dsw-alias-label-secondary)}
.dsh-readpilot-modal-body .dsh-readpilot-md code{padding:1px 5px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);font-size:.92em}
.dsh-readpilot-modal-body .dsh-readpilot-md pre{margin:1em 0;padding:12px 14px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);overflow:auto}
.dsh-readpilot-modal-diff{max-height:none;margin:0;padding:12px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);font-size:12px;line-height:1.65}
.dsh-readpilot-modal .dsh-readpilot-long-hint{padding:10px 20px 14px;border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:11.5px}
.dsh-readpilot-modal .dsh-readpilot-chat-error{margin:12px 20px 0}
.dsh-readpilot-modal .dsh-readpilot-history{margin-top:16px}
.dsh-readpilot-modal-body .dsh-readpilot-history{max-height:none;overflow:visible;padding:0;border:0;background:transparent}
.dsh-readpilot-history-summary{display:flex;align-items:center;gap:8px}
.dsh-readpilot-history .dsh-readpilot-section-head{margin-bottom:10px}
.dsh-readpilot-modal-body .dsh-readpilot-history{margin-top:16px;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l2)}
@keyframes dsh-readpilot-fade-in{from{opacity:0}to{opacity:1}}
@keyframes dsh-readpilot-pop-in{from{opacity:0;transform:translateY(6px) scale(.985)}to{opacity:1;transform:none}}
@media (max-width:760px){.dsh-readpilot-modal-overlay{padding:10px}.dsh-readpilot-modal{min-height:min(500px,88vh);max-height:92vh;border-radius:14px}.dsh-readpilot-modal-head{padding:15px 16px 12px}.dsh-readpilot-modal-actions{padding:10px 16px}.dsh-readpilot-modal-body{padding:15px 16px 18px}.dsh-readpilot-modal .dsh-readpilot-long-hint{padding:10px 16px 12px}}
@media (prefers-reduced-motion:reduce){.dsh-readpilot-modal-overlay,.dsh-readpilot-modal{animation:none}}
@media (prefers-reduced-motion:reduce){.dsh-readpilot-long-note,.dsh-readpilot-pill,.dsh-readpilot-tool-btn,.dsh-readpilot-segment{transition:none}.dsh-readpilot-long-note:hover{transform:none}}
@media (max-width:1100px){.dsh-readpilot-book{grid-template-columns:230px minmax(0,1fr)!important}.dsh-readpilot-book[data-toc="false"]{grid-template-columns:minmax(0,1fr)!important}.dsh-readpilot-chat{position:absolute;top:0;right:0;bottom:0;width:min(420px,92%);z-index:20;box-shadow:-8px 0 30px rgba(0,0,0,.24)}.dsh-readpilot-chat-resizer{display:none}.dsh-readpilot-chat-backdrop{display:block;position:absolute;inset:0;z-index:19;border:0;padding:0;background:rgba(0,0,0,.18)}}
@media (max-width:760px){.dsh-readpilot-book{grid-template-columns:1fr!important}.dsh-readpilot-toc{display:none}.dsh-readpilot-reader{padding:20px 18px 80px}.dsh-readpilot-bar{padding:6px 10px;gap:6px}.dsh-readpilot-bar-title{order:3;flex:1 0 100%}.dsh-readpilot-bar-controls{margin-left:auto}.dsh-readpilot-page-frame{padding:18px 16px}.dsh-readpilot-pdf-spread{gap:8px}}
`;

  // src/client/runtime.ts
  var React;
  var h;
  function bindRuntime(require2) {
    React = require2("react");
    h = React.createElement;
  }

  // src/client/views/toc.ts
  function Toc({ t, detail, activeChapter, onSelect }) {
    const outline = detail.book.format === "pdf" && Array.isArray(detail.outline) && detail.outline.length > 0 ? detail.outline : null;
    const items = outline ?? detail.toc;
    const activePage = detail.toc.find((item) => item.id === activeChapter)?.page;
    return h(
      "aside",
      { className: "dsh-readpilot-toc" },
      h("div", { className: "dsh-readpilot-toc-title" }, t("toc")),
      items.length === 0 ? h("div", { className: "dsh-readpilot-muted" }, t("noToc")) : h(
        "div",
        { className: "dsh-readpilot-toc-list" },
        items.map((item) => {
          const chapterId = outline ? item.chapterId ?? detail.toc.find((entry) => entry.page === item.page)?.id : item.id;
          const active = outline ? item.chapterId === activeChapter || item.page === activePage : item.id === activeChapter;
          return h("button", {
            key: item.id,
            type: "button",
            className: "dsh-readpilot-toc-item",
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

  // src/client/views/markdown.ts
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
        return h(`h${level}`, { key, "data-block-index": index }, inline(block.text ?? "", key));
      }
      if (block.type === "code") {
        return h("pre", { key, "data-block-index": index }, h("code", null, block.text));
      }
      if (block.type === "quote") {
        return h("blockquote", { key, "data-block-index": index }, inline(block.text ?? "", key));
      }
      if (block.type === "hr") {
        return h("hr", { key, "data-block-index": index, className: "dsh-readpilot-md-hr" });
      }
      if (block.type === "li") {
        return h(
          "div",
          { key, "data-block-index": index, className: "dsh-readpilot-li" },
          h("span", { className: "dsh-readpilot-li-marker" }, block.ordered ? `${block.index}.` : "•"),
          h("span", null, inline(block.text ?? "", key))
        );
      }
      return h("p", { key, "data-block-index": index }, inline(block.text ?? "", key));
    });
  }
  function MarkdownMessage({ text, prefix }) {
    return h("div", { className: "dsh-readpilot-md" }, renderBlocks(parseMarkdownBlocks(text), prefix));
  }

  // src/client/views/panels.ts
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
      { className: "dsh-readpilot-path-row" },
      h("input", {
        value: path,
        placeholder: t("pathPlaceholder"),
        spellCheck: false,
        onChange: (event) => setPath(event.target.value)
      }),
      h("button", {
        type: "button",
        className: "dsh-readpilot-secondary",
        onClick: () => onPick(setPath)
      }, t("chooseDir"))
    );
    const actions = h(
      "div",
      { className: "dsh-readpilot-setup-actions" },
      h("button", {
        type: "button",
        className: "dsh-readpilot-primary",
        disabled: busy || !path.trim(),
        onClick: () => onConfigure(path.trim())
      }, busy ? t("loading") : t("create")),
      onCancel ? h("button", {
        type: "button",
        className: "dsh-readpilot-secondary",
        onClick: onCancel
      }, t("cancel")) : null
    );
    return h(
      "div",
      { className: "dsh-readpilot-setup" },
      h(
        "div",
        { className: "dsh-readpilot-setup-card" },
        h("h2", null, t("setupTitle")),
        h("p", null, t("setupHint")),
        row,
        actions
      )
    );
  }

  // src/client/library-utils.ts
  var SORTS = ["recent", "title", "size", "added"];
  function bookTags(bookId, tags) {
    const list = tags?.[bookId];
    return Array.isArray(list) ? list : [];
  }
  function bookStatus(bookId, status) {
    const value = status?.[bookId];
    return value === "want" || value === "reading" || value === "done" ? value : null;
  }
  function bookRating(bookId, rating) {
    const value = rating?.[bookId];
    return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5 ? value : 0;
  }
  function tagCatalogue(books, tags) {
    const counts = /* @__PURE__ */ new Map();
    for (const book of books) {
      for (const tag of bookTags(book.id, tags)) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()].map(([tag, count]) => ({ tag, count })).sort((left, right) => left.tag.localeCompare(right.tag));
  }
  function filterBooks(books, tags, options = {}) {
    const category = options.category ?? "all";
    const query = String(options.query ?? "").trim().toLowerCase();
    const sort = typeof options.sort === "string" && SORTS.includes(options.sort) ? options.sort : "recent";
    const filtered = books.filter((book) => {
      if (category === "recent" && !book.progress) return false;
      if (category === "unread" && book.progress) return false;
      if (category === "reading" && !book.progress) return false;
      if (category === "done" && bookStatus(book.id, options.status) !== "done") return false;
      if (category.startsWith("format:") && book.format !== category.slice(7)) return false;
      if (category.startsWith("tag:")) {
        const tag = category.slice(4);
        if (!bookTags(book.id, tags).includes(tag)) return false;
      }
      if (!query) return true;
      const searchable = `${book.title}
${book.format}
${bookTags(book.id, tags).join(" ")}`.toLowerCase();
      return searchable.includes(query);
    });
    const sorted = filtered.slice();
    sorted.sort((left, right) => {
      if (sort === "title") return left.title.localeCompare(right.title);
      if (sort === "size") return right.size - left.size;
      if (sort === "added") return right.mtimeMs - left.mtimeMs;
      const leftTime = left.progress?.updatedAt ?? 0;
      const rightTime = right.progress?.updatedAt ?? 0;
      return rightTime - leftTime || right.mtimeMs - left.mtimeMs;
    });
    return sorted;
  }
  function categoryCounts(books, tags, status) {
    return {
      all: books.length,
      recent: books.filter((book) => book.progress).length,
      unread: books.filter((book) => !book.progress).length,
      reading: books.filter((book) => book.progress).length,
      done: books.filter((book) => bookStatus(book.id, status) === "done").length,
      formats: ["txt", "md", "epub", "pdf"].reduce((counts, format) => {
        counts[format] = books.filter((book) => book.format === format).length;
        return counts;
      }, {})
    };
  }

  // src/client/views/library-view.ts
  var FORMATS = ["txt", "md", "epub", "pdf"];
  var STATUSES = ["want", "reading", "done"];
  var RATINGS = [1, 2, 3, 4, 5];
  function statusLabel(t, status) {
    if (status === "want") return t("statusWant");
    if (status === "reading") return t("statusReading");
    if (status === "done") return t("statusDone");
    return "";
  }
  function TagDialog({ t, book, initialTags, allTags, initialStatus, initialRating, onClose, onSave }) {
    const [draft, setDraft] = React.useState("");
    const [tags, setTags] = React.useState(() => initialTags.slice());
    const [status, setStatus] = React.useState(initialStatus);
    const [rating, setRating] = React.useState(initialRating);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState("");
    const inputRef = React.useRef(null);
    React.useEffect(() => {
      inputRef.current?.focus();
    }, []);
    const add = (value) => {
      const tag = String(value ?? "").replace(/\s+/g, " ").trim();
      if (!tag || tags.includes(tag) || tags.length >= 20) return;
      if (tag.length > 24) {
        setError(t("tagTooLong"));
        return;
      }
      setTags((previous) => [...previous, tag]);
      setDraft("");
      setError("");
    };
    const save = async () => {
      if (saving) return;
      setSaving(true);
      setError("");
      try {
        await onSave(tags, status, rating);
        onClose();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setSaving(false);
      }
    };
    return h(
      "div",
      {
        className: "dsh-readpilot-book-overlay",
        onMouseDown: (event) => {
          if (event.target === event.currentTarget) onClose();
        }
      },
      h(
        "div",
        {
          className: "dsh-readpilot-book-dialog",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": t("editBook")
        },
        h(
          "header",
          { className: "dsh-readpilot-book-dialog-head" },
          h(
            "div",
            { className: "dsh-readpilot-book-dialog-heading" },
            h("h3", null, t("editBook")),
            h("div", { className: "dsh-readpilot-book-dialog-title", title: book.title }, book.title)
          ),
          h("button", {
            type: "button",
            className: "dsh-readpilot-book-dialog-close",
            "aria-label": t("close"),
            onClick: onClose
          }, "×")
        ),
        h(
          "div",
          { className: "dsh-readpilot-book-dialog-body" },
          h(
            "section",
            { className: "dsh-readpilot-book-field" },
            h("div", { className: "dsh-readpilot-book-field-label" }, t("tags")),
            h(
              "div",
              { className: "dsh-readpilot-tag-list" },
              tags.length === 0 ? h("span", { className: "dsh-readpilot-muted" }, t("noTags")) : tags.map((tag) => h(
                "span",
                { key: tag, className: "dsh-readpilot-tag-chip" },
                tag,
                h("button", {
                  type: "button",
                  className: "dsh-readpilot-tag-remove",
                  "aria-label": `${t("removeTag")} ${tag}`,
                  onClick: () => setTags((previous) => previous.filter((item) => item !== tag))
                }, "×")
              ))
            ),
            h(
              "div",
              { className: "dsh-readpilot-tag-input-row" },
              h("input", {
                ref: inputRef,
                value: draft,
                placeholder: t("tagPlaceholder"),
                spellCheck: false,
                onChange: (event) => setDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    add(draft);
                  }
                }
              }),
              h("button", {
                type: "button",
                className: "dsh-readpilot-secondary",
                disabled: !draft.trim() || tags.length >= 20,
                onClick: () => add(draft)
              }, t("addTag"))
            ),
            allTags.length > 0 ? h(
              "div",
              { className: "dsh-readpilot-tag-suggestions" },
              allTags.filter((tag) => !tags.includes(tag)).slice(0, 12).map((tag) => h("button", {
                key: tag,
                type: "button",
                className: "dsh-readpilot-tag-suggestion",
                onClick: () => add(tag)
              }, `+ ${tag}`))
            ) : null
          ),
          h(
            "section",
            { className: "dsh-readpilot-book-field" },
            h("div", { className: "dsh-readpilot-book-field-label" }, t("readStatus")),
            h(
              "div",
              { className: "dsh-readpilot-meta-options" },
              h("button", {
                type: "button",
                className: "dsh-readpilot-status-option",
                "data-active": status === null ? "true" : "false",
                onClick: () => setStatus(null)
              }, t("statusNone")),
              STATUSES.map((value) => h("button", {
                key: value,
                type: "button",
                className: "dsh-readpilot-status-option",
                "data-active": status === value ? "true" : "false",
                onClick: () => setStatus(value)
              }, statusLabel(t, value)))
            )
          ),
          h(
            "section",
            { className: "dsh-readpilot-book-field" },
            h("div", { className: "dsh-readpilot-book-field-label" }, t("rating")),
            h(
              "div",
              { className: "dsh-readpilot-meta-options" },
              RATINGS.map((value) => h("button", {
                key: value,
                type: "button",
                className: "dsh-readpilot-rating-star",
                "data-active": rating >= value ? "true" : "false",
                "aria-label": `${value}`,
                onClick: () => setRating((previous) => previous === value ? 0 : value)
              }, "★")),
              rating > 0 ? h("button", {
                type: "button",
                className: "dsh-readpilot-secondary dsh-readpilot-rating-clear",
                onClick: () => setRating(0)
              }, t("clear")) : null
            )
          ),
          error ? h("div", { className: "dsh-readpilot-note-dialog-error" }, error) : null
        ),
        h(
          "footer",
          { className: "dsh-readpilot-book-dialog-actions" },
          h("button", {
            type: "button",
            className: "dsh-readpilot-secondary",
            disabled: saving,
            onClick: onClose
          }, t("cancel")),
          h("button", {
            type: "button",
            className: "dsh-readpilot-primary",
            disabled: saving,
            onClick: () => void save()
          }, saving ? t("loading") : t("save"))
        )
      )
    );
  }
  function BookCard({ t, book, tags, status, rating, showCover, onOpen, onEditTags }) {
    const label = statusLabel(t, status);
    const [coverState, setCoverState] = React.useState("loading");
    const showImage = showCover && coverState !== "error";
    return h(
      "div",
      {
        className: "dsh-readpilot-book-card",
        "data-format": book.format
      },
      h(
        "button",
        {
          type: "button",
          className: "dsh-readpilot-book-open",
          onClick: () => onOpen(book)
        },
        h(
          "div",
          { className: "dsh-readpilot-book-cover", "data-cover": coverState },
          !showImage ? h(
            "div",
            { className: "dsh-readpilot-book-cover-fallback" },
            h("span", { className: "dsh-readpilot-book-format" }, book.format.toUpperCase()),
            h("span", { className: "dsh-readpilot-book-cover-title" }, book.title)
          ) : h("img", {
            className: "dsh-readpilot-book-cover-img",
            src: `/api/dsh-readpilot/cover?bookId=${encodeURIComponent(book.id)}`,
            alt: "",
            loading: "lazy",
            decoding: "async",
            onLoad: () => setCoverState("ready"),
            onError: () => setCoverState("error")
          }),
          showCover && coverState === "loading" ? h("span", {
            className: "dsh-readpilot-book-cover-spinner",
            role: "status",
            "aria-label": t("loading")
          }) : null
        ),
        h(
          "div",
          { className: "dsh-readpilot-book-info" },
          h("div", { className: "dsh-readpilot-book-title" }, book.title),
          h(
            "div",
            { className: "dsh-readpilot-book-meta" },
            h("span", { className: "dsh-readpilot-book-format-chip" }, book.format.toUpperCase()),
            h("span", null, formatSize(book.size)),
            h("span", { className: "dsh-readpilot-book-progress" }, book.progress ? book.progress.chapterTitle || t("reading") : t("unread"))
          ),
          label || rating > 0 ? h(
            "div",
            { className: "dsh-readpilot-book-badges" },
            label ? h("span", { className: "dsh-readpilot-book-status", "data-status": status ?? "" }, label) : null,
            rating > 0 ? h("span", { className: "dsh-readpilot-book-rating", title: `${rating}/5` }, "★".repeat(rating)) : null
          ) : null,
          tags.length > 0 ? h(
            "div",
            { className: "dsh-readpilot-book-tags" },
            tags.slice(0, 3).map((tag) => h("span", { key: tag, className: "dsh-readpilot-book-tag" }, tag)),
            tags.length > 3 ? h("span", { className: "dsh-readpilot-book-tag" }, `+${tags.length - 3}`) : null
          ) : null
        )
      ),
      h(
        "div",
        { className: "dsh-readpilot-book-actions" },
        h("button", {
          type: "button",
          className: "dsh-readpilot-book-tag-edit",
          title: t("editTags"),
          onClick: () => onEditTags(book)
        }, t("tags"))
      )
    );
  }
  function Library({ t, snapshot, busy, onOpen, onRefresh, onSettings, onSetTags, onSetStatus, onSetRating }) {
    const books = snapshot.books;
    const tags = snapshot.tags ?? {};
    const statuses = snapshot.status ?? {};
    const ratings = snapshot.rating ?? {};
    const [category, setCategory] = React.useState("all");
    const [query, setQuery] = React.useState("");
    const [sort, setSort] = React.useState("recent");
    const [coversEnabled, setCoversEnabled] = React.useState(readCoversEnabled);
    const toggleCovers = React.useCallback(() => {
      setCoversEnabled((previous) => {
        saveCoversEnabled(!previous);
        return !previous;
      });
    }, []);
    const [tagEditor, setTagEditor] = React.useState(null);
    const counts = React.useMemo(() => categoryCounts(books, tags, statuses), [books, tags, statuses]);
    const tagStats = React.useMemo(() => tagCatalogue(books, tags), [books, tags]);
    const visible = React.useMemo(
      () => filterBooks(books, tags, { category, query, sort, status: statuses }),
      [books, tags, statuses, category, query, sort]
    );
    const categoryTitle = category === "all" ? t("allBooks") : category.startsWith("tag:") ? `#${category.slice(4)}` : category.startsWith("format:") ? category.slice(7).toUpperCase() : category === "recent" ? t("recentReading") : category === "unread" ? t("unread") : category === "done" ? t("statusDone") : t("inProgress");
    const categoryButton = (key, label, count) => h(
      "button",
      {
        key,
        type: "button",
        className: "dsh-readpilot-library-category",
        "data-active": category === key ? "true" : "false",
        onClick: () => setCategory(key)
      },
      h("span", null, label),
      typeof count === "number" ? h("span", { className: "dsh-readpilot-library-count" }, count) : null
    );
    return h(
      "div",
      { className: "dsh-readpilot-library" },
      h(
        "aside",
        { className: "dsh-readpilot-library-side" },
        h("div", { className: "dsh-readpilot-library-side-title" }, t("categories")),
        categoryButton("all", t("allBooks"), counts.all),
        categoryButton("recent", t("recentReading"), counts.recent),
        categoryButton("reading", t("inProgress"), counts.reading),
        categoryButton("done", t("statusDone"), counts.done),
        categoryButton("unread", t("unread"), counts.unread),
        h("div", { className: "dsh-readpilot-library-side-title" }, t("formats")),
        FORMATS.map((format) => categoryButton(`format:${format}`, format.toUpperCase(), counts.formats[format])),
        tagStats.length > 0 ? h("div", { className: "dsh-readpilot-library-side-title" }, t("tags")) : null,
        tagStats.map(({ tag, count }) => categoryButton(`tag:${tag}`, `# ${tag}`, count))
      ),
      h(
        "div",
        { className: "dsh-readpilot-library-main" },
        h(
          "div",
          { className: "dsh-readpilot-library-head" },
          h(
            "div",
            null,
            h("h2", null, `${t("library")} · ${books.length}`),
            h("div", { className: "dsh-readpilot-library-subtitle" }, t("librarySubtitle"))
          ),
          h(
            "div",
            { className: "dsh-readpilot-header-actions" },
            h("button", { type: "button", className: "dsh-readpilot-secondary", onClick: onSettings }, t("settings")),
            h("button", { type: "button", className: "dsh-readpilot-secondary", disabled: busy, onClick: onRefresh }, t("rescan"))
          )
        ),
        h(
          "div",
          { className: "dsh-readpilot-library-toolbar" },
          h("input", {
            className: "dsh-readpilot-library-search",
            value: query,
            placeholder: t("searchLibrary"),
            spellCheck: false,
            onChange: (event) => setQuery(event.target.value)
          }),
          h(
            "select",
            {
              className: "dsh-readpilot-palette-select",
              value: sort,
              onChange: (event) => setSort(event.target.value),
              "aria-label": t("sortBy")
            },
            h("option", { value: "recent" }, t("sortRecent")),
            h("option", { value: "title" }, t("sortTitle")),
            h("option", { value: "size" }, t("sortSize")),
            h("option", { value: "added" }, t("sortAdded"))
          ),
          h("button", {
            type: "button",
            className: "dsh-readpilot-cover-toggle",
            "data-active": coversEnabled ? "true" : "false",
            title: coversEnabled ? t("hideCovers") : t("showCovers"),
            onClick: toggleCovers
          }, coversEnabled ? t("hideCovers") : t("showCovers"))
        ),
        books.length === 0 ? h(
          "div",
          { className: "dsh-readpilot-empty" },
          h("h2", null, t("empty")),
          h("p", null, t("emptyHint"))
        ) : h(
          "div",
          { className: "dsh-readpilot-library-scroll" },
          h(
            "section",
            { className: "dsh-readpilot-all-section" },
            h(
              "div",
              { className: "dsh-readpilot-section-head" },
              h("h3", null, categoryTitle),
              h("span", null, `${visible.length}`)
            ),
            visible.length === 0 ? h("div", { className: "dsh-readpilot-library-empty" }, t("noMatches")) : h(
              "div",
              { className: "dsh-readpilot-grid" },
              visible.map((book) => h(BookCard, {
                key: book.id,
                t,
                book,
                tags: bookTags(book.id, tags),
                status: bookStatus(book.id, statuses),
                rating: bookRating(book.id, ratings),
                showCover: coversEnabled,
                onOpen,
                onEditTags: (entry) => setTagEditor({
                  book: entry,
                  initialTags: bookTags(entry.id, tags)
                })
              }))
            )
          )
        )
      ),
      tagEditor ? h(TagDialog, {
        t,
        book: tagEditor.book,
        initialTags: tagEditor.initialTags,
        allTags: tagStats.map((item) => item.tag),
        initialStatus: bookStatus(tagEditor.book.id, statuses),
        initialRating: bookRating(tagEditor.book.id, ratings),
        onClose: () => setTagEditor(null),
        onSave: async (nextTags, nextStatus, nextRating) => {
          await onSetTags(tagEditor.book, nextTags);
          if (nextStatus !== bookStatus(tagEditor.book.id, statuses)) {
            await onSetStatus(tagEditor.book, nextStatus);
          }
          if (nextRating !== bookRating(tagEditor.book.id, ratings)) {
            await onSetRating(tagEditor.book, nextRating);
          }
          setTagEditor(null);
        }
      }) : null
    );
  }

  // src/client/bookmark-label.ts
  function bookmarkContext(screen, chapterId) {
    if (!screen || screen.kind !== "book") return { chapterTitle: "", pageLabel: "" };
    const item = screen.detail.toc.find((entry) => entry.id === chapterId);
    const fallback = screen.content?.title || item?.title || "";
    if (screen.detail.book.format !== "pdf") {
      return { chapterTitle: fallback, pageLabel: "" };
    }
    const page = item?.page;
    const outline = Array.isArray(screen.detail.outline) ? screen.detail.outline : [];
    const candidates = outline.filter((entry) => Number.isInteger(entry.page) && (!Number.isInteger(page) || entry.page <= (page ?? 0))).sort((left, right) => left.page - right.page);
    const chapterTitle = candidates.at(-1)?.title || fallback;
    return {
      chapterTitle,
      pageLabel: chapterTitle === fallback ? "" : fallback
    };
  }

  // src/client/mark-filters.ts
  var HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink", "purple"];
  function filterMarks(marks, filter = {}) {
    const chapterId = filter.chapterId ?? null;
    const color = filter.color ?? null;
    if (!chapterId && !color) return marks.slice();
    return marks.filter((mark) => {
      if (chapterId && mark.chapterId !== chapterId) return false;
      if (color && !(mark.kind === "highlight" && (mark.color ?? "yellow") === color)) return false;
      return true;
    });
  }
  function markChapterIds(marks) {
    const ids = [];
    for (const mark of marks) {
      if (mark.chapterId && !ids.includes(mark.chapterId)) ids.push(mark.chapterId);
    }
    return ids;
  }
  function markColors(marks) {
    const used = /* @__PURE__ */ new Set();
    for (const mark of marks) {
      if (mark.kind !== "highlight") continue;
      used.add(mark.color ?? "yellow");
    }
    return HIGHLIGHT_COLORS.filter((color) => used.has(color));
  }

  // src/client/views/notes-search.ts
  function chapterTitleOf(screen, chapterId) {
    return screen.kind === "book" ? screen.detail.toc.find((item) => item.id === chapterId)?.title : "";
  }
  function markActions({ t, item, noteDeletingId, deleteNote, openNote }) {
    return [
      h("button", {
        key: "jump",
        type: "button",
        className: "dsh-readpilot-note-jump",
        title: t("jump"),
        onClick: () => openNote(item)
      }, t("jump")),
      h("button", {
        key: "delete",
        type: "button",
        className: "dsh-readpilot-note-delete",
        disabled: noteDeletingId === item.id,
        onClick: () => void deleteNote(item)
      }, noteDeletingId === item.id ? t("loading") : t("delete"))
    ];
  }
  function colorLabel(t, color) {
    const key = `highlight${color.slice(0, 1).toUpperCase()}${color.slice(1)}`;
    return t(key);
  }
  function NotesBody({ t, notesError, notesLoading, notes, highlights, bookmarks, screen, openNote, noteDeletingId, deleteNote }) {
    const [chapterFilter, setChapterFilter] = React.useState("all");
    const [colorFilter, setColorFilter] = React.useState("all");
    const allMarks = [...highlights, ...notes, ...bookmarks];
    const chapterIds = markChapterIds(allMarks);
    const colors = markColors(allMarks);
    const chapterTitles = screen.kind === "book" ? screen.detail.toc.filter((item) => chapterIds.includes(item.id)) : [];
    const chapterOptions = [
      ...chapterTitles.map((item) => ({ id: item.id, title: item.title })),
      ...chapterIds.filter((id) => !chapterTitles.some((item) => item.id === id)).map((id) => ({ id, title: id }))
    ];
    const filter = {
      chapterId: chapterFilter === "all" ? null : chapterFilter,
      color: colorFilter === "all" ? null : colorFilter
    };
    const visibleHighlights = filterMarks(highlights, filter);
    const visibleNotes = filterMarks(notes, filter);
    const visibleBookmarks = filterMarks(bookmarks, filter);
    const total = visibleHighlights.length + visibleNotes.length + visibleBookmarks.length;
    const allTotal = allMarks.length;
    const emptyState = (title, hint) => h(
      "div",
      { className: "dsh-readpilot-empty-state" },
      h("div", { className: "dsh-readpilot-empty-icon" }, "✎"),
      h("div", { className: "dsh-readpilot-empty-title" }, title),
      hint ? h("div", { className: "dsh-readpilot-empty-hint" }, hint) : null
    );
    return h(
      "div",
      { className: "dsh-readpilot-notes dsh-readpilot-page" },
      h(
        "header",
        { className: "dsh-readpilot-page-head" },
        h(
          "div",
          { className: "dsh-readpilot-page-heading" },
          h(
            "div",
            { className: "dsh-readpilot-page-title-row" },
            h("h3", null, t("notes")),
            h("span", { className: "dsh-readpilot-page-count" }, total === allTotal ? String(total) : `${total} / ${allTotal}`)
          ),
          h("p", { className: "dsh-readpilot-page-subtitle" }, t("notesPageHint"))
        )
      ),
      allTotal > 0 ? h(
        "div",
        { className: "dsh-readpilot-mark-filters" },
        chapterOptions.length > 1 ? h(
          "select",
          {
            className: "dsh-readpilot-palette-select",
            value: chapterFilter,
            "aria-label": t("filterChapter"),
            onChange: (event) => setChapterFilter(event.target.value)
          },
          h("option", { value: "all" }, t("allChapters")),
          chapterOptions.map((item) => h("option", { key: item.id, value: item.id }, item.title))
        ) : null,
        colors.length > 0 ? h(
          "div",
          { className: "dsh-readpilot-color-filters" },
          colors.map((color) => h("button", {
            key: color,
            type: "button",
            className: `dsh-readpilot-color-filter dsh-readpilot-color-${color}`,
            "data-active": colorFilter === color ? "true" : "false",
            title: colorLabel(t, color),
            "aria-label": colorLabel(t, color),
            onClick: () => setColorFilter((previous) => previous === color ? "all" : color)
          }))
        ) : null
      ) : null,
      notesError ? h("div", { className: "dsh-readpilot-chat-error" }, notesError) : null,
      notesLoading && total === 0 ? emptyState(t("loading"), "") : allTotal === 0 ? notesError ? null : emptyState(t("noteEmpty"), t("notesEmptyHint")) : total === 0 ? emptyState(t("noMatches"), "") : h(
        "div",
        { className: "dsh-readpilot-page-content" },
        visibleHighlights.length > 0 ? h(
          "section",
          { key: "highlights", className: "dsh-readpilot-card dsh-readpilot-mark-section" },
          h(
            "div",
            { className: "dsh-readpilot-section-head" },
            h("h4", null, t("highlights")),
            h("span", { className: "dsh-readpilot-section-count" }, String(visibleHighlights.length))
          ),
          visibleHighlights.map((highlight) => h(
            "div",
            { key: highlight.id, className: "dsh-readpilot-note dsh-readpilot-mark-highlight" },
            h(
              "button",
              {
                type: "button",
                className: "dsh-readpilot-note-main",
                onClick: () => openNote(highlight)
              },
              h(
                "div",
                { className: "dsh-readpilot-note-chapter" },
                h("span", { className: `dsh-readpilot-color-dot dsh-readpilot-color-${highlight.color ?? "yellow"}` }),
                chapterTitleOf(screen, highlight.chapterId) || t("reading")
              ),
              h("div", { className: "dsh-readpilot-note-quote" }, highlight.quote),
              highlight.annotation ? h("div", { className: "dsh-readpilot-note-body" }, highlight.annotation) : null
            ),
            ...markActions({ t, item: highlight, noteDeletingId, deleteNote, openNote })
          ))
        ) : null,
        visibleNotes.length > 0 ? h(
          "section",
          { key: "notes", className: "dsh-readpilot-card dsh-readpilot-mark-section" },
          h(
            "div",
            { className: "dsh-readpilot-section-head" },
            h("h4", null, t("shortNotes")),
            h("span", { className: "dsh-readpilot-section-count" }, String(visibleNotes.length))
          ),
          visibleNotes.map((note) => h(
            "div",
            { key: note.id, className: "dsh-readpilot-note" },
            h(
              "button",
              {
                type: "button",
                className: "dsh-readpilot-note-main",
                onClick: () => openNote(note)
              },
              h("div", { className: "dsh-readpilot-note-chapter" }, chapterTitleOf(screen, note.chapterId) || t("reading")),
              note.quote ? h("div", { className: "dsh-readpilot-note-quote" }, note.quote) : null,
              h("div", { className: "dsh-readpilot-note-body" }, note.note)
            ),
            ...markActions({ t, item: note, noteDeletingId, deleteNote, openNote })
          ))
        ) : null,
        visibleBookmarks.length > 0 ? h(
          "section",
          { key: "bookmarks", className: "dsh-readpilot-card dsh-readpilot-mark-section" },
          h(
            "div",
            { className: "dsh-readpilot-section-head" },
            h("h4", null, t("bookmarks")),
            h("span", { className: "dsh-readpilot-section-count" }, String(visibleBookmarks.length))
          ),
          visibleBookmarks.map((bookmark) => {
            const context = bookmarkContext(screen, bookmark.chapterId);
            const title = context.chapterTitle || bookmark.note || t("bookmark");
            const detail = bookmark.annotation || (context.pageLabel && context.pageLabel !== context.chapterTitle ? context.pageLabel : "");
            return h(
              "div",
              { key: bookmark.id, className: "dsh-readpilot-note dsh-readpilot-mark-bookmark" },
              h(
                "button",
                {
                  type: "button",
                  className: "dsh-readpilot-note-main",
                  onClick: () => openNote(bookmark)
                },
                h("div", { className: "dsh-readpilot-note-chapter" }, title),
                detail ? h("div", { className: "dsh-readpilot-note-body" }, detail) : null
              ),
              ...markActions({ t, item: bookmark, noteDeletingId, deleteNote, openNote })
            );
          })
        ) : null
      )
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
      { className: "dsh-readpilot-search" },
      h(
        "div",
        { className: "dsh-readpilot-search-bar" },
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
          className: "dsh-readpilot-primary",
          disabled: searchBusy || !searchQuery.trim(),
          onClick: () => void runSearch()
        }, searchBusy ? t("searching") : t("search")),
        h("button", {
          type: "button",
          className: "dsh-readpilot-icon-btn",
          title: t("closeSearch"),
          "aria-label": t("closeSearch"),
          onClick: () => setSearchOpen(false)
        }, "×")
      ),
      searchError ? h("div", { className: "dsh-readpilot-search-hint", "data-error": "true" }, searchError) : searchBusy ? h("div", { className: "dsh-readpilot-search-hint" }, t("searching")) : searchResults === null ? null : searchResults.matches.length === 0 ? h("div", { className: "dsh-readpilot-search-hint" }, t("searchEmpty")) : h(
        "div",
        { className: "dsh-readpilot-search-list" },
        searchResults.matches.map((match, index) => h(
          "button",
          {
            key: `${match.chapterId}:${match.offset}:${index}`,
            type: "button",
            className: "dsh-readpilot-search-result",
            onClick: () => openSearchMatch(match)
          },
          h("div", { className: "dsh-readpilot-search-chapter" }, match.chapterTitle),
          h("div", { className: "dsh-readpilot-search-snippet" }, match.snippet)
        )),
        searchResults.truncated ? h("div", { className: "dsh-readpilot-search-hint" }, t("searchTruncated")) : null
      )
    );
  }

  // src/client/views/modal.ts
  function ModalShell({ t, title, meta, onClose, children }) {
    return h(
      "div",
      {
        className: "dsh-readpilot-modal-overlay",
        role: "presentation",
        onClick: onClose
      },
      h(
        "div",
        {
          className: "dsh-readpilot-modal",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": title,
          onClick: (event) => event.stopPropagation()
        },
        h(
          "div",
          { className: "dsh-readpilot-modal-head" },
          h(
            "div",
            { className: "dsh-readpilot-modal-title" },
            h("h3", null, title),
            meta ? h("span", { className: "dsh-readpilot-modal-meta" }, meta) : null
          ),
          h("button", {
            type: "button",
            className: "dsh-readpilot-icon-action",
            title: t("close"),
            "aria-label": t("close"),
            onClick: onClose
          }, "×")
        ),
        ...children
      )
    );
  }

  // src/client/views/long-notes.ts
  function historyView(t, state) {
    return h(
      "div",
      { className: "dsh-readpilot-history" },
      h(
        "div",
        { className: "dsh-readpilot-section-head" },
        h(
          "div",
          { className: "dsh-readpilot-history-summary" },
          h("h4", null, t("history")),
          h("span", { className: "dsh-readpilot-section-count" }, String(state.history.length))
        ),
        h("button", {
          type: "button",
          className: "dsh-readpilot-note-delete",
          disabled: state.historyBusy || state.history.length === 0,
          onClick: () => void state.clearHistory()
        }, t("historyClear"))
      ),
      state.history.length === 0 ? h("div", { className: "dsh-readpilot-chat-empty" }, t("historyEmpty")) : state.history.map((entry) => h(
        "div",
        { key: entry.id, className: "dsh-readpilot-history-row" },
        h("span", { className: "dsh-readpilot-long-meta" }, new Date(entry.createdAt).toLocaleString()),
        h(
          "span",
          { className: "dsh-readpilot-long-meta" },
          `${entry.characters} ${t("noteContextChars")}`
        ),
        h("button", {
          type: "button",
          className: "dsh-readpilot-note-jump",
          disabled: state.historyBusy,
          onClick: () => void state.restoreHistory(entry)
        }, t("historyRestore")),
        h("button", {
          type: "button",
          className: "dsh-readpilot-note-delete",
          disabled: state.historyBusy,
          onClick: () => void state.removeHistory(entry)
        }, t("historyDelete"))
      )),
      h("button", {
        type: "button",
        className: "dsh-readpilot-note-jump",
        onClick: state.toggleHistory
      }, t("historyClose"))
    );
  }
  function LongNotes({ t, state, noteContext, autoApply }) {
    const [previewOpen, setPreviewOpen] = React.useState(false);
    const showActions = !state.active && !state.creating;
    React.useEffect(() => {
      setPreviewOpen(Boolean(state.active));
    }, [state.active]);
    React.useEffect(() => {
      if (!previewOpen || typeof document === "undefined" || !document.body) return;
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }, [previewOpen]);
    React.useEffect(() => {
      if (!previewOpen) return;
      const onKeyDown = (event) => {
        if (event.key === "Escape") state.close();
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, [previewOpen, state.close]);
    const emptyState = (title, hint) => h(
      "div",
      { className: "dsh-readpilot-empty-state" },
      h("div", { className: "dsh-readpilot-empty-icon" }, "▤"),
      h("div", { className: "dsh-readpilot-empty-title" }, title),
      hint ? h("div", { className: "dsh-readpilot-empty-hint" }, hint) : null
    );
    const draftsCard = state.drafts.length > 0 ? h(
      "div",
      { className: "dsh-readpilot-card dsh-readpilot-drafts" },
      h(
        "div",
        { className: "dsh-readpilot-section-head" },
        h("h4", null, t("noteDrafts")),
        h("span", { className: "dsh-readpilot-section-count" }, String(state.drafts.length))
      ),
      state.drafts.map((draft) => {
        const lines = diffLines(draft.baseBody, draft.body);
        const added = lines.filter((line) => line.type === "add").length;
        const removed = lines.filter((line) => line.type === "del").length;
        return h(
          "div",
          { key: draft.id, className: "dsh-readpilot-draft" },
          h(
            "div",
            { className: "dsh-readpilot-draft-head" },
            h(
              "span",
              { className: "dsh-readpilot-long-kind" },
              draft.action === "create" ? t("draftCreate") : draft.action === "append" ? t("draftAppend") : t("draftEdit")
            ),
            h("span", { className: "dsh-readpilot-long-title" }, draft.title),
            h("span", { className: "dsh-readpilot-long-meta" }, `+${added} −${removed}`)
          ),
          h(
            "div",
            { className: "dsh-readpilot-long-editor-actions" },
            h("button", {
              type: "button",
              className: "dsh-readpilot-chat-send",
              disabled: state.draftBusyId === draft.id,
              onClick: () => void state.applyDraft(draft)
            }, t("applyDraft")),
            h("button", {
              type: "button",
              className: "dsh-readpilot-note-jump",
              disabled: state.draftBusyId === draft.id,
              onClick: () => void state.rejectDraft(draft)
            }, t("rejectDraft"))
          )
        );
      })
    ) : null;
    return h(
      "section",
      { className: "dsh-readpilot-long-notes dsh-readpilot-page" },
      h(
        "header",
        { className: "dsh-readpilot-page-head dsh-readpilot-long-notes-head" },
        h(
          "div",
          { className: "dsh-readpilot-page-heading" },
          h(
            "div",
            { className: "dsh-readpilot-page-title-row" },
            h("h3", null, t("longNotes")),
            h("span", { className: "dsh-readpilot-page-count" }, String(state.notes.length))
          ),
          h("p", { className: "dsh-readpilot-page-subtitle" }, t("longNotesPageHint"))
        ),
        showActions ? h(
          "div",
          { className: "dsh-readpilot-page-actions" },
          h("button", {
            type: "button",
            className: "dsh-readpilot-note-jump dsh-readpilot-pill",
            onClick: () => state.beginCreate("book")
          }, t("bookNote")),
          h("button", {
            type: "button",
            className: "dsh-readpilot-note-jump dsh-readpilot-pill",
            onClick: () => state.beginCreate("topic")
          }, t("newTopicNote"))
        ) : null
      ),
      h(
        "div",
        { className: "dsh-readpilot-page-toolbar" },
        h("button", {
          type: "button",
          className: "dsh-readpilot-note-jump dsh-readpilot-tool-btn",
          disabled: state.exporting,
          onClick: () => void state.exportNotes(false)
        }, t("exportNotes")),
        h("button", {
          type: "button",
          className: "dsh-readpilot-note-jump dsh-readpilot-tool-btn",
          disabled: state.exporting,
          onClick: () => void state.exportNotes(true)
        }, t("exportSave")),
        state.exportStatus ? h("span", { className: "dsh-readpilot-long-hint" }, state.exportStatus) : null
      ),
      noteContext ? h(
        "button",
        {
          type: "button",
          className: "dsh-readpilot-note-context",
          "data-on": noteContext.enabled ? "true" : "false",
          disabled: noteContext.busy,
          title: t("noteContextHint"),
          onClick: noteContext.toggle
        },
        h("span", {
          className: "dsh-readpilot-note-context-switch",
          "data-on": noteContext.enabled ? "true" : "false"
        }),
        h("span", { className: "dsh-readpilot-note-context-label" }, t("noteContext")),
        h(
          "span",
          { className: "dsh-readpilot-note-context-state" },
          noteContext.enabled ? t("noteContextOn") : t("noteContextOff")
        ),
        noteContext.enabled && noteContext.characters > 0 ? h(
          "span",
          { className: "dsh-readpilot-note-context-chars" },
          `${noteContext.characters} ${t("noteContextChars")}`
        ) : null
      ) : null,
      autoApply ? h(
        "button",
        {
          type: "button",
          className: "dsh-readpilot-note-context dsh-readpilot-note-auto",
          "data-on": autoApply.enabled ? "true" : "false",
          disabled: autoApply.busy,
          title: t("autoApplyNotesHint"),
          onClick: autoApply.toggle
        },
        h("span", {
          className: "dsh-readpilot-note-context-switch",
          "data-on": autoApply.enabled ? "true" : "false"
        }),
        h("span", { className: "dsh-readpilot-note-context-label" }, t("autoApplyNotes")),
        h(
          "span",
          { className: "dsh-readpilot-note-context-state" },
          autoApply.enabled ? t("autoApplyNotesOn") : t("autoApplyNotesOff")
        )
      ) : null,
      draftsCard,
      state.error ? h("div", { className: "dsh-readpilot-chat-error" }, state.error) : null,
      state.creating ? h(
        "div",
        { className: "dsh-readpilot-card dsh-readpilot-create-card" },
        h(
          "div",
          { className: "dsh-readpilot-section-head" },
          h("h4", null, state.createKind === "book" ? t("bookNote") : t("newTopicNote"))
        ),
        h("input", {
          value: state.title,
          placeholder: t("longNoteTitle"),
          spellCheck: false,
          onChange: (event) => state.setTitle(event.target.value)
        }),
        h(
          "div",
          { className: "dsh-readpilot-long-editor-actions" },
          h("button", {
            type: "button",
            className: "dsh-readpilot-chat-send",
            disabled: state.saving || !state.title.trim(),
            onClick: () => void state.create()
          }, state.saving ? t("noteSaving") : t("createNote")),
          h("button", {
            type: "button",
            className: "dsh-readpilot-note-jump",
            onClick: state.cancelCreate
          }, t("cancel"))
        )
      ) : state.loading ? emptyState(t("loading"), "") : state.notes.length === 0 ? emptyState(t("longNoteEmpty"), t("longNotesHint")) : h(
        "div",
        { className: "dsh-readpilot-long-list" },
        h(
          "div",
          { className: "dsh-readpilot-list-head" },
          h("span", null, t("allNotes")),
          h("span", { className: "dsh-readpilot-section-count" }, String(state.notes.length))
        ),
        state.notes.map((note) => h(
          "button",
          {
            key: note.id,
            type: "button",
            className: "dsh-readpilot-long-note",
            "data-kind": note.kind,
            onClick: () => void state.open(note)
          },
          h(
            "span",
            { className: "dsh-readpilot-long-kind" },
            note.kind === "book" ? t("bookNote") : t("noteKindTopic")
          ),
          h("span", { className: "dsh-readpilot-long-title" }, note.title),
          h(
            "span",
            { className: "dsh-readpilot-long-meta" },
            `${formatSize(note.size)} · ${new Date(note.updatedAt).toLocaleDateString()}`
          )
        ))
      ),
      previewOpen && state.active ? h(ModalShell, {
        t,
        title: state.active.note.title,
        meta: `${state.active.note.kind === "book" ? t("bookNote") : t("noteKindTopic")} · ${formatSize(state.active.note.size)} · ${new Date(state.active.note.updatedAt).toLocaleDateString()}`,
        onClose: () => state.close(),
        children: [
          state.error ? h("div", { className: "dsh-readpilot-chat-error" }, state.error) : null,
          h(
            "div",
            { className: "dsh-readpilot-modal-actions" },
            h("button", {
              type: "button",
              className: "dsh-readpilot-chat-send",
              disabled: state.externalBusy,
              title: t("openExternalHint"),
              onClick: () => void state.openExternal()
            }, t("openExternal")),
            h("button", {
              type: "button",
              className: "dsh-readpilot-note-jump",
              disabled: state.saving,
              onClick: () => void state.reload()
            }, t("refresh")),
            h("button", {
              type: "button",
              className: "dsh-readpilot-note-jump",
              disabled: state.historyBusy,
              onClick: state.toggleHistory
            }, t("history")),
            h("button", {
              type: "button",
              className: "dsh-readpilot-note-delete",
              disabled: state.saving,
              onClick: () => void state.remove()
            }, t("delete")),
            h("button", {
              type: "button",
              className: "dsh-readpilot-note-jump",
              onClick: state.close
            }, t("backToNotes"))
          ),
          h(
            "div",
            { className: "dsh-readpilot-modal-body" },
            state.historyOpen ? historyView(t, state) : h(MarkdownMessage, { text: state.active.body, prefix: "long-note" })
          ),
          state.historyOpen ? null : h("div", { className: "dsh-readpilot-long-hint" }, t("openExternalHint"))
        ]
      }) : null
    );
  }

  // src/client/views/draft-notice.ts
  var seenDraftIds = /* @__PURE__ */ new Set();
  function DraftNotice({ t, state }) {
    const [draftId, setDraftId] = React.useState(null);
    const draft = state.drafts.find((item) => item.id === draftId) ?? null;
    React.useEffect(() => {
      if (state.active || state.creating) {
        setDraftId(null);
        return;
      }
      if (draftId) return;
      const unseen = state.drafts.filter((item) => !seenDraftIds.has(item.id));
      if (unseen.length === 0) return;
      for (const item of unseen) seenDraftIds.add(item.id);
      setDraftId(unseen[0].id);
    }, [state.drafts, state.active, state.creating, draftId]);
    React.useEffect(() => {
      if (draftId && !state.drafts.some((item) => item.id === draftId)) setDraftId(null);
    }, [state.drafts, draftId]);
    React.useEffect(() => {
      if (!draft) return;
      if (typeof document === "undefined" || !document.body) return;
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }, [draft]);
    React.useEffect(() => {
      if (!draft) return;
      const onKeyDown = (event) => {
        if (event.key === "Escape") setDraftId(null);
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, [draft]);
    if (!draft) return null;
    const lines = diffLines(draft.baseBody, draft.body);
    const added = lines.filter((line) => line.type === "add").length;
    const removed = lines.filter((line) => line.type === "del").length;
    return h(ModalShell, {
      t,
      title: draft.title,
      meta: `${draft.action === "create" ? t("draftCreate") : draft.action === "append" ? t("draftAppend") : t("draftEdit")} · +${added} −${removed}`,
      onClose: () => setDraftId(null),
      children: [
        state.error ? h("div", { className: "dsh-readpilot-chat-error" }, state.error) : null,
        h(
          "div",
          { className: "dsh-readpilot-modal-actions" },
          h("button", {
            type: "button",
            className: "dsh-readpilot-chat-send",
            disabled: state.draftBusyId === draft.id,
            onClick: () => void state.applyDraft(draft)
          }, t("applyDraft")),
          h("button", {
            type: "button",
            className: "dsh-readpilot-note-jump",
            disabled: state.draftBusyId === draft.id,
            onClick: () => void state.rejectDraft(draft)
          }, t("rejectDraft"))
        ),
        h(
          "div",
          { className: "dsh-readpilot-modal-body" },
          h(
            "pre",
            { className: "dsh-readpilot-diff dsh-readpilot-modal-diff" },
            lines.slice(0, 80).map((line, index) => h("div", {
              key: `${draft.id}-${index}`,
              className: `dsh-readpilot-diff-line dsh-readpilot-diff-${line.type}`
            }, `${line.type === "add" ? "+ " : line.type === "del" ? "- " : "  "}${line.text}`))
          ),
          lines.length > 80 ? h("div", { className: "dsh-readpilot-long-hint" }, t("draftDiffTruncated")) : null
        )
      ]
    });
  }

  // src/client/views/memory-panel.ts
  function modeLabel(t, mode) {
    if (mode === "off") return t("memoryModeOff");
    if (mode === "on") return t("memoryModeOn");
    return t("memoryModeAsk");
  }
  function bookStateLabel(t, state) {
    if (state === "on") return t("memoryBookOn");
    if (state === "off") return t("memoryBookOff");
    return t("memoryBookInherit");
  }
  function effectiveLabel(t, effective) {
    if (effective === "on") return t("memoryEffectiveOn");
    if (effective === "off") return t("memoryEffectiveOff");
    return t("memoryEffectiveAsk");
  }
  function cardEditor(t, scope, text, setText, history, props) {
    return h(
      "div",
      { className: "dsh-readpilot-memory-card dsh-readpilot-card" },
      h(
        "div",
        { className: "dsh-readpilot-memory-card-head" },
        h(
          "span",
          { className: "dsh-readpilot-memory-card-title" },
          scope === "book" ? t("memoryBookCard") : t("memoryReaderCard")
        ),
        h(
          "span",
          { className: "dsh-readpilot-long-meta" },
          `${text.length} ${t("noteContextChars")} · ${t("memoryHistoryCount")} ${history.length}`
        )
      ),
      h("textarea", {
        value: text,
        rows: 5,
        placeholder: scope === "book" ? t("memoryBookPlaceholder") : t("memoryReaderPlaceholder"),
        onChange: (event) => setText(event.target.value)
      }),
      h(
        "div",
        { className: "dsh-readpilot-long-editor-actions" },
        h("button", {
          type: "button",
          className: "dsh-readpilot-chat-send",
          disabled: props.busy,
          onClick: () => props.onSave(scope, text)
        }, t("save")),
        h("button", {
          type: "button",
          className: "dsh-readpilot-note-jump",
          disabled: props.busy || history.length === 0,
          onClick: () => props.onUndo(scope)
        }, t("memoryUndo")),
        h("button", {
          type: "button",
          className: "dsh-readpilot-note-delete",
          disabled: props.busy || !text.trim(),
          onClick: () => props.onClear(scope)
        }, t("clear"))
      ),
      history.length > 0 ? h(
        "details",
        { className: "dsh-readpilot-memory-history" },
        h("summary", null, `${t("history")} · ${history.length}`),
        history.slice(0, 10).map((entry) => h(
          "div",
          { key: entry.id, className: "dsh-readpilot-long-hint" },
          `${new Date(entry.createdAt).toLocaleString()} · ${entry.characters} ${t("noteContextChars")}`
        ))
      ) : null
    );
  }
  function MemoryPanel(props) {
    const { t, status } = props;
    const [bookDraft, setBookDraft] = React.useState("");
    const [readerDraft, setReaderDraft] = React.useState("");
    React.useEffect(() => {
      setBookDraft(status?.bookText ?? "");
      setReaderDraft(status?.readerText ?? "");
    }, [status?.bookText, status?.readerText]);
    const emptyState = (title, hint) => h(
      "div",
      { className: "dsh-readpilot-empty-state" },
      h("div", { className: "dsh-readpilot-empty-icon" }, "◍"),
      h("div", { className: "dsh-readpilot-empty-title" }, title),
      hint ? h("div", { className: "dsh-readpilot-empty-hint" }, hint) : null
    );
    const heading = h(
      "header",
      { className: "dsh-readpilot-page-head dsh-readpilot-memory-head" },
      h(
        "div",
        { className: "dsh-readpilot-page-heading" },
        h(
          "div",
          { className: "dsh-readpilot-page-title-row" },
          h("h3", null, t("memory")),
          status ? h("span", {
            className: "dsh-readpilot-status-pill",
            "data-state": status.effective
          }, effectiveLabel(t, status.effective)) : null
        ),
        h("p", { className: "dsh-readpilot-page-subtitle" }, t("memoryPageHint"))
      ),
      h("button", {
        type: "button",
        className: "dsh-readpilot-icon-action",
        title: t("refresh"),
        "aria-label": t("refresh"),
        disabled: props.busy,
        onClick: props.onRefresh
      }, "↻")
    );
    if (!status && props.loading) {
      return h(
        "section",
        { className: "dsh-readpilot-memory dsh-readpilot-page" },
        heading,
        emptyState(t("loading"), "")
      );
    }
    if (!status) {
      return h(
        "section",
        { className: "dsh-readpilot-memory dsh-readpilot-page" },
        heading,
        props.error ? h("div", { className: "dsh-readpilot-chat-error" }, props.error) : null,
        h(
          "div",
          { className: "dsh-readpilot-empty-state" },
          h("div", { className: "dsh-readpilot-empty-icon" }, "◍"),
          h("button", {
            type: "button",
            className: "dsh-readpilot-chat-send",
            onClick: props.onRefresh
          }, t("memoryLoad"))
        )
      );
    }
    return h(
      "section",
      { className: "dsh-readpilot-memory dsh-readpilot-page" },
      heading,
      props.error ? h("div", { className: "dsh-readpilot-chat-error" }, props.error) : null,
      h(
        "div",
        { className: "dsh-readpilot-card dsh-readpilot-memory-controls" },
        h(
          "div",
          { className: "dsh-readpilot-section-head" },
          h("h4", null, t("memorySettings"))
        ),
        h(
          "div",
          { className: "dsh-readpilot-control-row" },
          h("span", { className: "dsh-readpilot-control-label" }, t("memoryDefaultMode")),
          h(
            "div",
            { className: "dsh-readpilot-segmented" },
            ["off", "ask", "on"].map((mode) => h("button", {
              key: mode,
              type: "button",
              className: "dsh-readpilot-segment",
              "data-active": status.mode === mode ? "true" : "false",
              disabled: props.busy,
              onClick: () => props.onMode(mode)
            }, modeLabel(t, mode)))
          )
        ),
        h(
          "div",
          { className: "dsh-readpilot-control-row" },
          h("span", { className: "dsh-readpilot-control-label" }, t("memoryThisBook")),
          h(
            "div",
            { className: "dsh-readpilot-segmented" },
            ["inherit", "on", "off"].map((state) => h("button", {
              key: state,
              type: "button",
              className: "dsh-readpilot-segment",
              "data-active": status.book === state ? "true" : "false",
              disabled: props.busy,
              onClick: () => props.onBookState(state)
            }, bookStateLabel(t, state)))
          ),
          h("span", {
            className: "dsh-readpilot-status-pill",
            "data-state": status.effective
          }, `${t("memoryEffective")} ${effectiveLabel(t, status.effective)}`)
        )
      ),
      status.proposals.length > 0 ? h(
        "div",
        { className: "dsh-readpilot-card dsh-readpilot-memory-proposals" },
        h(
          "div",
          { className: "dsh-readpilot-section-head" },
          h("h4", null, t("memoryProposals")),
          h("span", { className: "dsh-readpilot-section-count" }, String(status.proposals.length))
        ),
        status.proposals.map((proposal) => h(
          "div",
          { key: proposal.id, className: "dsh-readpilot-draft" },
          h(
            "div",
            { className: "dsh-readpilot-draft-head" },
            h(
              "span",
              { className: "dsh-readpilot-long-kind" },
              proposal.scope === "book" ? t("memoryBookCard") : t("memoryReaderCard")
            ),
            h(
              "span",
              { className: "dsh-readpilot-long-title" },
              proposal.mode === "append" ? t("memoryAppend") : t("memoryReplace")
            ),
            h("span", { className: "dsh-readpilot-long-meta" }, new Date(proposal.createdAt).toLocaleTimeString())
          ),
          h("pre", { className: "dsh-readpilot-diff" }, proposal.preview.slice(0, 1200)),
          h(
            "div",
            { className: "dsh-readpilot-long-editor-actions" },
            h("button", {
              type: "button",
              className: "dsh-readpilot-chat-send",
              disabled: props.busy,
              onClick: () => props.onApprove(proposal.id)
            }, t("memoryApprove")),
            h("button", {
              type: "button",
              className: "dsh-readpilot-note-jump",
              disabled: props.busy,
              onClick: () => props.onReject(proposal.id)
            }, t("memoryReject"))
          )
        ))
      ) : null,
      cardEditor(t, "book", bookDraft, setBookDraft, status.bookHistory, props),
      cardEditor(t, "reader", readerDraft, setReaderDraft, status.readerHistory, props),
      h("div", { className: "dsh-readpilot-long-hint dsh-readpilot-memory-hint" }, t("memoryHint"))
    );
  }

  // src/client/paging.ts
  var PAGE_GAP = 40;
  var PAGE_ASPECT = 210 / 297;
  function columnsFor(layout) {
    return layout === "double" ? 2 : 1;
  }
  function finiteOrZero(value) {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }
  function validGap(gap) {
    return Number.isFinite(gap) && gap >= 0 ? gap : PAGE_GAP;
  }
  function measurePageMetrics(viewportWidth, scrollWidth, layout, gap = PAGE_GAP) {
    const columns = columnsFor(layout);
    const g = validGap(gap);
    const width = finiteOrZero(viewportWidth);
    const content = finiteOrZero(scrollWidth);
    const columnWidth = Math.max(1, (width - g * (columns - 1)) / columns);
    const stride = columns * (columnWidth + g);
    if (content <= width + 0.5) {
      return { columns, columnWidth, totalColumns: 1, pageCount: 1, stride };
    }
    const totalColumns = Math.max(1, Math.round((content + g) / (columnWidth + g)));
    const pageCount = Math.max(1, Math.ceil(totalColumns / columns));
    return { columns, columnWidth, totalColumns, pageCount, stride };
  }
  function pageBounds(pageIndex, layout, totalColumns) {
    const columns = columnsFor(layout);
    const total = Number.isFinite(totalColumns) && totalColumns >= 1 ? Math.floor(totalColumns) : 1;
    const pageCount = Math.max(1, Math.ceil(total / columns));
    const index = clampPageIndex(pageIndex, pageCount);
    const start = index * columns + 1;
    const end = Math.min(start + columns - 1, total);
    return { start, end };
  }
  function clampPageIndex(pageIndex, pageCount) {
    const count = Number.isFinite(pageCount) ? Math.floor(pageCount) : 0;
    if (count < 1) return 0;
    const index = Number.isFinite(pageIndex) ? Math.floor(pageIndex) : 0;
    if (index < 0) return 0;
    return Math.min(index, count - 1);
  }
  function pageStep(layout) {
    return columnsFor(layout);
  }
  function pageWidthForHeight(height, availableWidth, ratio = PAGE_ASPECT) {
    const h2 = finiteOrZero(height);
    const available = finiteOrZero(availableWidth);
    const r = finiteOrZero(ratio);
    if (h2 <= 0 || available <= 0 || r <= 0) return 0;
    return Math.min(available, h2 * r);
  }
  function pageSpanWidth(pageWidth, layout, gap = PAGE_GAP) {
    const width = finiteOrZero(pageWidth);
    if (width <= 0) return 0;
    if (layout !== "double") return width;
    if (!Number.isFinite(gap) || gap < 0) return 0;
    return width * 2 + gap;
  }

  // src/client/views/visual-reader.ts
  var PDF_WHEEL_THRESHOLD = 40;
  function contentBox(element) {
    const style = getComputedStyle(element);
    const paddingX = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
    const paddingY = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
    return {
      width: element.clientWidth - paddingX,
      height: element.clientHeight - paddingY
    };
  }
  function PdfPageImage({ src, alt }) {
    const [shown, setShown] = React.useState(src);
    React.useEffect(() => {
      if (src === shown) return;
      let cancelled = false;
      const image = new Image();
      const settle = () => {
        if (!cancelled) setShown(src);
      };
      image.onload = settle;
      image.onerror = settle;
      image.src = src;
      return () => {
        cancelled = true;
      };
    }, [shown, src]);
    return h("img", { src: shown, alt, draggable: false });
  }
  function renderPdfTextItems(pageView) {
    let offset = 0;
    return (pageView.textItems ?? []).map((item, index) => {
      const start = offset;
      offset += item.text.length;
      return h("span", {
        key: `pdf-text-${index}`,
        className: "dsh-readpilot-pdf-text-item",
        "data-offset": start,
        style: {
          left: item.left,
          top: item.top,
          width: item.width,
          height: item.height,
          fontSize: item.fontSize
        }
      }, item.text);
    });
  }
  function VisualReader({
    t,
    visual,
    screen,
    pageViews,
    loadedView,
    layout,
    readingMode = "paged",
    stepPdfPage,
    visualLoading,
    visualError,
    onPdfMouseUp,
    noteLayerRef,
    onEpubLoad,
    epubFrameRef
  }) {
    const containerRef = React.useRef(null);
    const spreadRef = React.useRef(null);
    const [pdfFit, setPdfFit] = React.useState(1);
    const [epubWidth, setEpubWidth] = React.useState(null);
    const pdfPaged = visual?.kind === "pdf" && screen.kind === "book";
    const epubShaped = visual?.kind === "epub" && screen.kind === "book";
    React.useEffect(() => {
      const container = containerRef.current;
      if (!pdfPaged || !container) return;
      let accumulated = 0;
      const onWheel = (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (!event.deltaY) return;
        event.preventDefault();
        if (accumulated > 0 !== event.deltaY > 0) accumulated = 0;
        accumulated += event.deltaY;
        if (Math.abs(accumulated) < PDF_WHEEL_THRESHOLD) return;
        const direction = accumulated > 0 ? 1 : -1;
        accumulated = 0;
        stepPdfPage(direction);
      };
      container.addEventListener("wheel", onWheel, { passive: false });
      return () => container.removeEventListener("wheel", onWheel);
    }, [pdfPaged, stepPdfPage]);
    React.useEffect(() => {
      if (!pdfPaged) {
        setPdfFit(1);
        return;
      }
      const container = containerRef.current;
      if (!container) return;
      const spread = spreadRef.current;
      if (layout === "double" && !spread) return;
      let lastKey = "";
      const measure = () => {
        if (layout === "single") {
          const view = pageViews[0];
          if (!view || !(view.width > 0) || !(view.height > 0)) return;
          const box2 = contentBox(container);
          if (!(box2.width > 0) || !(box2.height > 0)) return;
          const key2 = `single:${box2.width}x${box2.height}:${view.width}x${view.height}`;
          if (key2 === lastKey) return;
          lastKey = key2;
          setPdfFit(Math.min(1, box2.height / view.height, box2.width / view.width));
          return;
        }
        if (!spread) return;
        const box = contentBox(container);
        if (!(box.width > 0) || !(box.height > 0)) return;
        const key = `double:${box.width}x${box.height}:${pageViews.map((view) => `${view.width}x${view.height}`).join(",")}`;
        if (key === lastKey) return;
        lastKey = key;
        const gap = Number.parseFloat(getComputedStyle(spread).columnGap) || 0;
        const pageWidth = pageViews.reduce((sum, view) => sum + view.width, 0);
        const pageHeight = pageViews.reduce((max, view) => Math.max(max, view.height), 0);
        const available = box.width - gap * Math.max(0, pageViews.length - 1);
        setPdfFit(pageWidth > 0 && pageHeight > 0 && available > 0 ? Math.min(1, available / pageWidth, box.height / pageHeight) : 1);
      };
      measure();
      const target = container;
      let observer = null;
      if (target && typeof ResizeObserver === "function") {
        observer = new ResizeObserver(measure);
        observer.observe(target);
      }
      window.addEventListener("resize", measure);
      return () => {
        observer?.disconnect();
        window.removeEventListener("resize", measure);
      };
    }, [layout, pageViews, pdfPaged, visualError, visualLoading]);
    React.useEffect(() => {
      if (!epubShaped) {
        setEpubWidth(null);
        return;
      }
      const container = containerRef.current;
      if (!container) return;
      const spanLayout = readingMode === "paged" ? layout : "single";
      let lastKey = "";
      const measure = () => {
        const box = contentBox(container);
        if (!(box.width > 0) || !(box.height > 0)) return;
        const key = `${box.width}x${box.height}`;
        if (key === lastKey) return;
        lastKey = key;
        const width = pageSpanWidth(pageWidthForHeight(box.height, box.width), spanLayout);
        setEpubWidth(width > 0 ? width : null);
      };
      measure();
      let observer = null;
      if (typeof ResizeObserver === "function") {
        observer = new ResizeObserver(measure);
        observer.observe(container);
      }
      window.addEventListener("resize", measure);
      return () => {
        observer?.disconnect();
        window.removeEventListener("resize", measure);
      };
    }, [epubShaped, layout, readingMode]);
    if (!visual) return null;
    if (screen.kind !== "book") return null;
    if (visual.kind === "pdf") {
      const bookId = screen.detail.book.id;
      const loadedPage = loadedView && loadedView.bookId === bookId ? loadedView.page : null;
      return h(
        "div",
        {
          className: "dsh-readpilot-visual",
          "data-paged": "true",
          "data-layout": layout,
          ref: containerRef
        },
        visualError ? h(
          "div",
          { className: "dsh-readpilot-visual-error" },
          h("div", null, visualError),
          h(
            "div",
            { className: "dsh-readpilot-reader-inner" },
            renderBlocks(screen.content.blocks, screen.content.chapterId)
          )
        ) : loadedPage !== null && pageViews.length > 0 ? h(
          "div",
          { className: "dsh-readpilot-pdf-spread", ref: spreadRef },
          pageViews.map((view, index) => h(
            "div",
            {
              key: `pdf-slot-${index}`,
              className: "dsh-readpilot-pdf-slot",
              style: {
                width: view.width * pdfFit,
                height: view.height * pdfFit,
                flex: "none",
                position: "relative"
              }
            },
            h(
              "div",
              {
                className: "dsh-readpilot-pdf-page",
                "data-page": loadedPage + index,
                style: {
                  width: view.width,
                  height: view.height,
                  transform: `scale(${pdfFit})`,
                  transformOrigin: "0 0"
                }
              },
              h(PdfPageImage, {
                src: `/api/dsh-readpilot/pdf-page?bookId=${encodeURIComponent(bookId)}&page=${loadedPage + index}&scale=${visual.scale}`,
                alt: screen.content.title
              }),
              h("div", {
                className: "dsh-readpilot-pdf-text",
                onMouseUp: index === 0 ? onPdfMouseUp : void 0
              }, renderPdfTextItems(view)),
              h("div", {
                className: "dsh-readpilot-note-layer",
                ref: index === 0 ? noteLayerRef : void 0
              })
            )
          ))
        ) : visualLoading ? h("div", { className: "dsh-readpilot-muted" }, t("loading")) : null,
        visualLoading && loadedPage !== null && !visualError ? h("div", { className: "dsh-readpilot-visual-loading" }, t("loading")) : null
      );
    }
    return h(
      "div",
      {
        className: "dsh-readpilot-visual",
        "data-paged": readingMode === "paged" ? "true" : "false",
        "data-layout": layout,
        ref: containerRef
      },
      h("iframe", {
        ref: epubFrameRef,
        className: "dsh-readpilot-epub-frame",
        "data-paged": readingMode === "paged" ? "true" : "false",
        sandbox: "allow-same-origin",
        title: screen.content.title,
        src: `/api/dsh-readpilot/epub-doc?bookId=${encodeURIComponent(screen.detail.book.id)}&href=${encodeURIComponent(visual.href)}`,
        onLoad: onEpubLoad,
        style: epubWidth === null ? void 0 : { width: epubWidth, maxWidth: "100%", margin: "0 auto" }
      })
    );
  }

  // src/client/page-jump.ts
  var RANGE_RE = /(?:PDF\s*)?第?\s*(\d{1,5})\s*(?:[–—~～-]|至|到)\s*(\d{1,5})\s*页/g;
  var SINGLE_RE = /(?:PDF\s*)?第?\s*(\d{1,5})\s*页/g;
  function overlaps(left, right) {
    return left.index < right.index + right.length && right.index < left.index + left.length;
  }
  function findPageReferences(text) {
    const ranges = [];
    RANGE_RE.lastIndex = 0;
    for (let match = RANGE_RE.exec(text); match; match = RANGE_RE.exec(text)) {
      const start = Number(match[1]);
      const end = Number(match[2]);
      if (!Number.isInteger(start) || start <= 0) continue;
      ranges.push({
        start,
        ...Number.isInteger(end) && end > 0 ? { end } : {},
        text: match[0],
        index: match.index,
        length: match[0].length
      });
    }
    const singles = [];
    SINGLE_RE.lastIndex = 0;
    for (let match = SINGLE_RE.exec(text); match; match = SINGLE_RE.exec(text)) {
      const start = Number(match[1]);
      if (!Number.isInteger(start) || start <= 0) continue;
      const item = { start, text: match[0], index: match.index, length: match[0].length };
      if (!ranges.some((range) => overlaps(range, item))) singles.push(item);
    }
    return [...ranges, ...singles].sort((left, right) => left.index - right.index);
  }
  var SKIP_SELECTOR = 'a,button,input,textarea,select,summary,code,pre,[contenteditable="true"],.dsh-readpilot-page-jump';
  function linkifyPageReferences(root, onJump) {
    if (typeof document === "undefined") return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.nodeValue || !findPageReferences(node.nodeValue).length) continue;
      const parent = node.parentElement;
      if (parent?.closest(SKIP_SELECTOR)) continue;
      nodes.push(node);
    }
    for (const node of nodes) {
      const text = node.nodeValue ?? "";
      const refs = findPageReferences(text);
      if (refs.length === 0) continue;
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      for (const ref of refs) {
        if (ref.index > cursor) fragment.appendChild(document.createTextNode(text.slice(cursor, ref.index)));
        const button = document.createElement("button");
        button.type = "button";
        button.className = "dsh-readpilot-page-jump";
        button.textContent = ref.text;
        button.title = `跳转到第 ${ref.start} 页`;
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          onJump(ref.start);
        });
        fragment.appendChild(button);
        cursor = ref.index + ref.length;
      }
      if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)));
      node.parentNode?.replaceChild(fragment, node);
    }
  }

  // src/client/views/chat-panel.ts
  function ChatPanel({
    t,
    chatOpen,
    chatTab,
    setChatTab,
    setChatOpen,
    notesBody,
    longNotesBody,
    memoryBody,
    chatBody,
    nativeChat,
    onPageJump,
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
    const panelRef = React.useRef(null);
    React.useEffect(() => {
      if (!chatOpen || !onPageJump) return;
      const panel = panelRef.current;
      if (!panel) return;
      let frame = 0;
      const process = () => {
        frame = 0;
        panel.querySelectorAll(".dsh-readpilot-chat-body, .dsh-readpilot-native-chat").forEach((root) => linkifyPageReferences(root, onPageJump));
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(process);
      };
      const observer = new MutationObserver(schedule);
      observer.observe(panel, { childList: true, subtree: true, characterData: true });
      schedule();
      return () => {
        observer.disconnect();
        if (frame) cancelAnimationFrame(frame);
      };
    }, [chatOpen, chatTab, onPageJump]);
    if (!chatOpen) return null;
    return h(
      "aside",
      { className: "dsh-readpilot-chat", ref: panelRef },
      h("div", {
        key: "resizer",
        className: "dsh-readpilot-chat-resizer",
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
        { className: "dsh-readpilot-chat-head" },
        h(
          "div",
          { className: "dsh-readpilot-chat-tabs", role: "tablist" },
          h("button", {
            type: "button",
            role: "tab",
            className: "dsh-readpilot-chat-tab",
            "data-active": chatTab === "chat" ? "true" : "false",
            "aria-selected": chatTab === "chat",
            onClick: () => setChatTab("chat")
          }, t("companion")),
          h("button", {
            type: "button",
            role: "tab",
            className: "dsh-readpilot-chat-tab",
            "data-active": chatTab === "notes" ? "true" : "false",
            "aria-selected": chatTab === "notes",
            onClick: () => setChatTab("notes")
          }, t("notes")),
          h("button", {
            type: "button",
            role: "tab",
            className: "dsh-readpilot-chat-tab",
            "data-active": chatTab === "long" ? "true" : "false",
            "aria-selected": chatTab === "long",
            onClick: () => setChatTab("long")
          }, t("longNotes")),
          h("button", {
            type: "button",
            role: "tab",
            className: "dsh-readpilot-chat-tab",
            "data-active": chatTab === "memory" ? "true" : "false",
            "aria-selected": chatTab === "memory",
            onClick: () => setChatTab("memory")
          }, t("memory"))
        ),
        h("button", {
          type: "button",
          className: "dsh-readpilot-chat-close",
          onClick: () => setChatOpen(false)
        }, t("closeChat"))
      ),
      chatTab === "notes" ? notesBody : chatTab === "long" ? longNotesBody : chatTab === "memory" ? memoryBody : nativeChat ? h("div", { className: "dsh-readpilot-native-chat" }, nativeChat) : chatBody,
      chatTab === "chat" && chatError ? h("div", { className: "dsh-readpilot-chat-error" }, chatError) : null,
      chatTab === "chat" && !nativeChat ? chatCompose : null
    );
  }

  // src/client/views/header.ts
  function Header({
    t,
    screen,
    title,
    subtitle,
    onBack,
    paletteId,
    onChangePalette,
    searchOpen,
    onToggleSearch,
    onToggleChat,
    onToggleToc,
    onBookmark,
    onFontDecrease,
    onFontIncrease
  }) {
    return h(
      "div",
      { className: "dsh-readpilot-header" },
      h(
        "div",
        { className: "dsh-readpilot-header-main" },
        screen.kind !== "library" ? h("button", {
          type: "button",
          className: "dsh-readpilot-icon-btn",
          title: t("back"),
          onClick: onBack
        }, "←") : null,
        h(
          "div",
          { style: { minWidth: 0 } },
          h("div", { className: "dsh-readpilot-title" }, title),
          subtitle ? h("div", { className: "dsh-readpilot-subtitle" }, subtitle) : null
        )
      ),
      h(
        "div",
        { className: "dsh-readpilot-header-actions" },
        screen.kind === "book" ? h("select", {
          className: "dsh-readpilot-palette-select",
          value: paletteId,
          title: t("palette"),
          "aria-label": t("palette"),
          onChange: (event) => onChangePalette(event.target.value)
        }, READER_PALETTE_IDS.map((id) => h(
          "option",
          { key: id, value: id },
          t(`palette${id[0].toUpperCase()}${id.slice(1)}`)
        ))) : null,
        screen.kind === "book" ? h("button", {
          type: "button",
          className: "dsh-readpilot-icon-btn",
          title: t("search"),
          "aria-expanded": searchOpen ? "true" : "false",
          onClick: onToggleSearch
        }, t("search")) : null,
        screen.kind === "book" ? h("button", {
          type: "button",
          className: "dsh-readpilot-icon-btn",
          title: t("companion"),
          onClick: onToggleChat
        }, t("companion")) : null,
        screen.kind === "book" ? h("button", {
          type: "button",
          className: "dsh-readpilot-icon-btn",
          title: t("bookmark"),
          onClick: onBookmark
        }, "🔖") : null,
        screen.kind === "book" ? h("button", {
          type: "button",
          className: "dsh-readpilot-icon-btn",
          title: t("toc"),
          onClick: onToggleToc
        }, "☰") : null,
        screen.kind === "book" ? h("button", {
          type: "button",
          className: "dsh-readpilot-icon-btn",
          title: t("fontSize"),
          onClick: onFontDecrease
        }, "A-") : null,
        screen.kind === "book" ? h("button", {
          type: "button",
          className: "dsh-readpilot-icon-btn",
          title: t("fontSize"),
          onClick: onFontIncrease
        }, "A+") : null
      )
    );
  }

  // src/client/views/selection-note.ts
  var COLORS = ["yellow", "green", "blue", "pink", "purple"];
  function SelectionToolbar({ t, selection, onAsk, onNote, onHighlight }) {
    if (!selection) return null;
    return h(
      "div",
      {
        className: "dsh-readpilot-selection",
        style: { left: selection.x, top: Math.max(8, selection.y - 48) },
        onMouseDown: (event) => event.preventDefault()
      },
      selection.blockIndex == null ? null : h(
        "div",
        { className: "dsh-readpilot-selection-colors", role: "group", "aria-label": t("highlight") },
        COLORS.map((color) => h("button", {
          key: color,
          type: "button",
          className: "dsh-readpilot-color-btn",
          "data-color": color,
          title: `${t("highlight")}：${t(`highlight${color[0].toUpperCase()}${color.slice(1)}`)}`,
          "aria-label": `${t("highlight")}：${t(`highlight${color[0].toUpperCase()}${color.slice(1)}`)}`,
          onClick: () => onHighlight(color)
        }))
      ),
      h("button", { type: "button", onClick: onAsk }, t("askCompanion")),
      selection.blockIndex == null ? null : h("button", { type: "button", onClick: () => onNote() }, t("noteAction"))
    );
  }
  function NoteDialog({
    t,
    noteEditor,
    noteDraft,
    setNoteDraft,
    noteColor,
    setNoteColor,
    noteSaving,
    noteError,
    noteInputRef,
    activeBookId,
    deleteNote,
    closeNoteEditor,
    saveNote
  }) {
    if (!noteEditor) return null;
    const isHighlight = noteEditor.kind === "highlight";
    const title = isHighlight ? t("annotationTitle") : noteEditor.noteId ? t("noteEditTitle") : t("noteDialogTitle");
    return h(
      "div",
      {
        className: "dsh-readpilot-note-overlay",
        onMouseDown: (event) => {
          if (event.target === event.currentTarget) closeNoteEditor();
        }
      },
      h(
        "div",
        {
          className: "dsh-readpilot-note-dialog",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": title
        },
        h("h3", null, title),
        h("div", { className: "dsh-readpilot-note-dialog-quote" }, noteEditor.quote),
        isHighlight ? h(
          "div",
          { className: "dsh-readpilot-note-colors", role: "group", "aria-label": t("highlight") },
          COLORS.map((color) => h("button", {
            key: color,
            type: "button",
            className: "dsh-readpilot-color-btn",
            "data-color": color,
            "data-active": noteColor === color ? "true" : "false",
            title: t(`highlight${color[0].toUpperCase()}${color.slice(1)}`),
            "aria-label": t(`highlight${color[0].toUpperCase()}${color.slice(1)}`),
            onClick: () => setNoteColor(color)
          }))
        ) : null,
        h("textarea", {
          ref: noteInputRef,
          value: noteDraft,
          rows: 4,
          placeholder: isHighlight ? t("annotationPlaceholder") : t("notePlaceholder"),
          disabled: noteSaving,
          onChange: (event) => setNoteDraft(event.target.value)
        }),
        noteError ? h("div", { className: "dsh-readpilot-note-dialog-error" }, noteError) : null,
        h(
          "div",
          { className: "dsh-readpilot-note-dialog-actions" },
          noteEditor.noteId ? h("button", {
            type: "button",
            className: "dsh-readpilot-secondary",
            disabled: noteSaving,
            onClick: async () => {
              await deleteNote({ id: noteEditor.noteId, bookId: activeBookId });
              closeNoteEditor();
            }
          }, t("delete")) : null,
          h("button", {
            type: "button",
            className: "dsh-readpilot-secondary",
            disabled: noteSaving,
            onClick: closeNoteEditor
          }, t("cancel")),
          h("button", {
            type: "button",
            className: "dsh-readpilot-primary",
            disabled: noteSaving || !isHighlight && !noteDraft.trim(),
            onClick: () => void saveNote()
          }, noteSaving ? t("noteSaving") : t("save"))
        )
      )
    );
  }

  // src/client/views/error-boundary.ts
  function createReaderErrorBoundary() {
    if (typeof React.Component !== "function") {
      return function ReaderErrorBoundaryPassthrough({ children }) {
        return children;
      };
    }
    const Base = React.Component;
    return class ReaderErrorBoundary extends Base {
      constructor(props) {
        super(props);
        this.state = { error: null };
      }
      static getDerivedStateFromError(error) {
        return { error };
      }
      componentDidCatch(error, info) {
        console.error("dsh-readpilot: render failed", error, info);
      }
      render() {
        if (this.state.error) {
          return h("div", {
            className: "dsh-readpilot-error",
            style: { padding: 20, whiteSpace: "pre-wrap", fontFamily: "monospace" }
          }, `阅读器渲染失败
${String(this.state.error?.stack ?? this.state.error)}`);
        }
        return this.props.children;
      }
    };
  }

  // src/client/views/reader-bar.ts
  function ReaderBar({
    t,
    format,
    mode,
    layout,
    chapterTitle,
    chapterIndex,
    chapterTotal,
    pageStart,
    pageEnd,
    pageTotal,
    canPrev,
    canNext,
    onPrev,
    onNext,
    onToggleMode,
    onLayoutChange,
    pageInput,
    setPageInput,
    onPageCommit,
    zoom,
    onZoom
  }) {
    const paged = mode === "paged";
    const prevLabel = t(paged ? "pagePrev" : "chapterPrev");
    const nextLabel = t(paged ? "pageNext" : "chapterNext");
    const modeLabel2 = t(paged ? "scrollMode" : "pagedMode");
    const numericPage = paged && Boolean(onPageCommit) && pageInput !== void 0;
    const pagePosition = paged ? `${pageStart}${pageEnd > pageStart ? `–${pageEnd}` : ""} / ${pageTotal}` : `${chapterIndex + 1} / ${chapterTotal}`;
    return h(
      "div",
      {
        className: "dsh-readpilot-bar",
        "data-mode": mode,
        "data-format": format,
        "data-layout": layout
      },
      h(
        "div",
        { className: "dsh-readpilot-bar-group dsh-readpilot-bar-nav" },
        h("button", {
          type: "button",
          className: "dsh-readpilot-secondary dsh-readpilot-bar-btn",
          title: prevLabel,
          "aria-label": prevLabel,
          disabled: !canPrev,
          onClick: onPrev
        }, "‹"),
        h("button", {
          type: "button",
          className: "dsh-readpilot-secondary dsh-readpilot-bar-btn",
          title: nextLabel,
          "aria-label": nextLabel,
          disabled: !canNext,
          onClick: onNext
        }, "›")
      ),
      h("div", { className: "dsh-readpilot-bar-title", title: chapterTitle }, chapterTitle),
      h(
        "div",
        { className: "dsh-readpilot-bar-group dsh-readpilot-bar-controls" },
        numericPage ? h(
          "div",
          { className: "dsh-readpilot-bar-group dsh-readpilot-bar-page" },
          h("input", {
            className: "dsh-readpilot-page-input",
            type: "number",
            min: 1,
            max: Math.max(1, pageTotal),
            value: pageInput,
            title: t("page"),
            "aria-label": t("page"),
            onChange: (event) => setPageInput?.(event.target.value),
            onKeyDown: (event) => {
              if (event.key !== "Enter") return;
              const page = Number(pageInput);
              if (Number.isFinite(page)) onPageCommit?.(page);
            }
          }),
          h("span", { className: "dsh-readpilot-bar-position" }, `/ ${pageTotal}`)
        ) : h("span", {
          className: "dsh-readpilot-bar-position",
          title: t(paged ? "page" : "chapter")
        }, pagePosition),
        onToggleMode ? h("button", {
          type: "button",
          className: "dsh-readpilot-secondary dsh-readpilot-bar-toggle",
          title: modeLabel2,
          "aria-label": modeLabel2,
          onClick: onToggleMode
        }, modeLabel2) : null,
        paged && onLayoutChange ? h(
          "div",
          { className: "dsh-readpilot-bar-group dsh-readpilot-bar-layout" },
          h("button", {
            type: "button",
            className: "dsh-readpilot-secondary dsh-readpilot-bar-toggle",
            title: t("singlePage"),
            "aria-label": t("singlePage"),
            "aria-pressed": layout === "single" ? "true" : "false",
            "data-active": layout === "single" ? "true" : "false",
            onClick: () => onLayoutChange("single")
          }, t("singlePage")),
          h("button", {
            type: "button",
            className: "dsh-readpilot-secondary dsh-readpilot-bar-toggle",
            title: t("doublePage"),
            "aria-label": t("doublePage"),
            "aria-pressed": layout === "double" ? "true" : "false",
            "data-active": layout === "double" ? "true" : "false",
            onClick: () => onLayoutChange("double")
          }, t("doublePage"))
        ) : null,
        zoom !== void 0 && onZoom ? h(
          "div",
          { className: "dsh-readpilot-bar-group dsh-readpilot-bar-zoom" },
          h("button", {
            type: "button",
            className: "dsh-readpilot-secondary dsh-readpilot-bar-btn",
            title: t("zoomOut"),
            "aria-label": t("zoomOut"),
            onClick: () => onZoom(-0.25)
          }, "−"),
          h("span", { className: "dsh-readpilot-bar-position" }, `${Math.round(zoom * 100)}%`),
          h("button", {
            type: "button",
            className: "dsh-readpilot-secondary dsh-readpilot-bar-btn",
            title: t("zoomIn"),
            "aria-label": t("zoomIn"),
            onClick: () => onZoom(0.25)
          }, "+")
        ) : null
      )
    );
  }

  // src/client/session-recovery.ts
  function isMissingSessionError(error) {
    const text = messageOf(error).toLowerCase();
    return /archiv|not.?found|unknown session|no such session|does not exist|closed|deleted|missing|已归档|归档|不存在|已删除|已关闭|找不到.{0,8}会话/.test(text);
  }

  // src/client/hooks/use-companion.ts
  function useCompanion({
    runtime,
    call,
    t,
    screen,
    workspaceId,
    activeSessionId,
    rememberSession,
    forgetSession
  }) {
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
    const chatRef = React.useRef(null);
    const chatBodyRef = React.useRef(null);
    const chatInputRef = React.useRef(null);
    const dragRef = React.useRef(null);
    const chatWidthRef = React.useRef(chatWidth);
    chatWidthRef.current = chatWidth;
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
    const invalidateSession = React.useCallback((bookId) => {
      setChatError(t("chatSessionLost"));
      forgetSession(bookId);
      void call("session", { bookId, sessionId: null }).catch(() => {
      });
    }, [call, forgetSession, t]);
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
      } catch (error) {
        if (isMissingSessionError(error) && screen.kind === "book") {
          releaseChat();
          invalidateSession(screen.detail.book.id);
        } else {
          setChatError(`${t("loadFailed")}：${messageOf(error)}`);
        }
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
      reference.ready.then(() => {
        if (chatRef.current !== record) return;
        void call("companionPolicy", { sessionId }).catch(() => {
        });
      }).catch((error) => {
        if (chatRef.current === record) {
          if (isMissingSessionError(error) && screen.kind === "book") {
            releaseChat();
            invalidateSession(screen.detail.book.id);
          } else {
            setChatError(`${t("loadFailed")}：${messageOf(error)}`);
          }
        }
      });
      return reference;
    }, [releaseChat, runtime, t, call, screen, invalidateSession]);
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
          runtime.layout.selectPanel("dsh-readpilot");
        }
        const session = sessionId;
        await call("session", { bookId: book.id, sessionId: session });
        rememberSession(book.id, session);
        const reference = bindSession(session);
        if (!reference) throw new Error(t("loadFailed"));
        return reference;
      };
      const runPrompt = async (reference) => {
        await reference.ready;
        const result = await reference.binding.session.prompt([{ type: "text", text }], "queue");
        if (result && result.ok === false) {
          throw new Error(result.error?.message ?? t("sendFailed"));
        }
      };
      try {
        let reference = chatRef.current?.reference;
        if (!reference) reference = await createSession();
        try {
          await runPrompt(reference);
        } catch (error) {
          if (!isMissingSessionError(error)) throw error;
          await call("session", { bookId: book.id, sessionId: null }).catch(() => {
          });
          forgetSession(book.id);
          releaseChat();
          reference = await createSession();
          setChatError("");
          await runPrompt(reference);
        }
        setDraft("");
      } catch (error) {
        setChatError(`${t("sendFailed")}：${messageOf(error)}`);
      } finally {
        setSending(false);
      }
    }, [draft, sending, screen, workspaceId, rememberSession, forgetSession, bindSession, releaseChat, runtime, call, t]);
    const loadEarlier = React.useCallback(async () => {
      const reference = chatRef.current?.reference;
      if (!reference || loadingEarlier) return;
      setLoadingEarlier(true);
      setChatError("");
      try {
        await reference.binding.session.loadOlder();
      } catch (error) {
        setChatError(`${t("loadFailed")}：${messageOf(error)}`);
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
    return {
      chatOpen,
      setChatOpen,
      chatWidth,
      draft,
      setDraft,
      sending,
      chatError,
      setChatError,
      entries,
      hasMore,
      loadingEarlier,
      chatBinding,
      chatTab,
      setChatTab,
      chatBodyRef,
      chatInputRef,
      running,
      messages,
      send,
      loadEarlier,
      startResize,
      moveResize,
      endResize,
      resetResize,
      resizeKeyDown
    };
  }

  // src/client/views/chat-content.ts
  function ChatBody({
    t,
    workspaceId,
    hasMore,
    loadingEarlier,
    loadEarlier,
    messages,
    sending,
    running,
    chatBodyRef
  }) {
    return h(
      "div",
      { className: "dsh-readpilot-chat-body", ref: chatBodyRef },
      hasMore ? h("button", {
        type: "button",
        className: "dsh-readpilot-chat-more",
        disabled: loadingEarlier,
        onClick: () => void loadEarlier()
      }, loadingEarlier ? t("loading") : t("loadEarlier")) : null,
      messages.length === 0 ? h(
        "div",
        { className: "dsh-readpilot-chat-empty" },
        workspaceId ? t("chatEmpty") : t("chatDisabled")
      ) : messages.map((message) => h(
        "div",
        {
          key: message.key,
          className: "dsh-readpilot-msg",
          "data-role": message.role
        },
        h(
          "div",
          { className: "dsh-readpilot-msg-role" },
          message.role === "user" ? t("you") : t("assistant")
        ),
        message.role === "assistant" ? h(MarkdownMessage, { text: message.text, prefix: message.key }) : h("div", { className: "dsh-readpilot-msg-text" }, message.text)
      )),
      sending || running ? h(
        "div",
        { className: "dsh-readpilot-chat-thinking" },
        sending ? t("sending") : t("thinking")
      ) : null
    );
  }
  function ChatCompose({
    t,
    workspaceId,
    draft,
    setDraft,
    sending,
    send,
    chatInputRef
  }) {
    return h(
      "div",
      { className: "dsh-readpilot-chat-compose" },
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
        { className: "dsh-readpilot-chat-compose-row" },
        h("span", { className: "dsh-readpilot-chat-hint" }, workspaceId ? "Enter / Shift+Enter" : ""),
        h("button", {
          type: "button",
          className: "dsh-readpilot-chat-send",
          disabled: !draft.trim() || sending || !workspaceId,
          onClick: () => void send()
        }, sending ? t("sending") : t("send"))
      )
    );
  }

  // src/client/views/native-companion.ts
  function createNativeChatBoundary() {
    if (typeof React.Component !== "function") {
      return function NativeChatBoundaryPassthrough({ children }) {
        return children;
      };
    }
    const Base = React.Component;
    return class NativeChatBoundary extends Base {
      constructor(props) {
        super(props);
        this.state = { failed: false };
      }
      static getDerivedStateFromError() {
        return { failed: true };
      }
      componentDidCatch(error, info) {
        console.error("dsh-readpilot: native companion failed", error, info);
      }
      render() {
        if (this.state.failed) return this.props.fallback ?? null;
        return this.props.children;
      }
    };
  }
  function FixedChatView(props) {
    return props.renderSlot("conversation.session", { view: "chat" });
  }
  function NativeCompanion(props) {
    const {
      renderFactorySlot,
      useSession,
      useConversation,
      useSessions,
      sessionId,
      inputActions,
      onReady,
      fallback
    } = props;
    React.useEffect(() => {
      if (typeof onReady === "function") onReady({ inputActions });
      return () => {
        if (typeof onReady === "function") onReady(null);
      };
    }, [inputActions, onReady]);
    const session = useSession((value) => value);
    const conversation = useConversation((value) => value);
    const summaryBlank = useSessions((state) => state?.byId?.[sessionId]?.blank);
    if (typeof renderFactorySlot !== "function" || sessionId === void 0) {
      return fallback ?? null;
    }
    const activeTargets = conversation?.activeTargets;
    const shellPhase = activeTargets && typeof activeTargets.size === "number" && activeTargets.size > 0 || !session?.blank && !session?.awaitingFirstTurn || session?.running ? "active" : session?.promptAttempted ? "engaging" : "blank";
    const settling = shellPhase === "blank" && session?.openState === "loading" && summaryBlank !== true;
    const hero = shellPhase === "blank" && (session?.openState === "open" || summaryBlank === true);
    const rendered = renderFactorySlot(
      "conversation.content",
      { variant: "embedded", phase: settling ? "settling" : hero ? "hero" : "active", hero },
      { slots: { views: FixedChatView } }
    );
    return rendered ?? fallback ?? null;
  }

  // src/client/hooks/use-search.ts
  function useSearch({ call, screen, t, selectChapter }) {
    const [searchOpen, setSearchOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [searchBusy, setSearchBusy] = React.useState(false);
    const [searchResults, setSearchResults] = React.useState(null);
    const [searchError, setSearchError] = React.useState("");
    const searchInputRef = React.useRef(null);
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
          matches: value.matches,
          truncated: value.truncated
        });
      } catch (cause) {
        setSearchResults({ matches: [], truncated: false });
        setSearchError(`${t("searchFailed")}：${messageOf(cause)}`);
      } finally {
        setSearchBusy(false);
      }
    }, [call, screen, searchBusy, searchQuery, t]);
    const toggleSearch = React.useCallback(() => {
      setSearchOpen((previous) => !previous);
      setSearchError("");
    }, []);
    const resetSearch = React.useCallback(() => {
      setSearchOpen(false);
      setSearchQuery("");
      setSearchBusy(false);
      setSearchResults(null);
      setSearchError("");
    }, []);
    React.useEffect(() => {
      if (!searchOpen) return;
      const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }, [searchOpen]);
    return {
      searchOpen,
      setSearchOpen,
      searchQuery,
      setSearchQuery,
      searchBusy,
      searchResults,
      searchError,
      searchInputRef,
      openSearchMatch,
      runSearch,
      toggleSearch,
      resetSearch
    };
  }

  // src/jump-url.ts
  var READER_JUMP_ORIGIN = "https://dsh-readpilot.invalid";
  var READER_JUMP_PATH = "/jump";
  function parseReaderJumpUrl(value) {
    let url;
    try {
      url = new URL(value);
    } catch {
      return null;
    }
    if (url.origin !== READER_JUMP_ORIGIN || url.pathname !== READER_JUMP_PATH) return null;
    const bookId = url.searchParams.get("book");
    const chapterId = url.searchParams.get("chapter");
    if (!bookId || !chapterId) return null;
    const rawOffset = url.searchParams.get("offset");
    const offset = rawOffset != null && /^\d+$/.test(rawOffset) ? Number(rawOffset) : void 0;
    const q = url.searchParams.get("q") || void 0;
    return { bookId, chapterId, ...offset === void 0 ? {} : { offset }, ...q ? { q } : {} };
  }

  // src/client/hooks/use-chat-jump.ts
  function useChatJump({
    call,
    screen,
    t,
    selectChapter,
    setChatError,
    setChatOpen
  }) {
    const jumpingRef = React.useRef(false);
    const jumpToTarget = React.useCallback(async (target) => {
      if (screen.kind !== "book" || jumpingRef.current) return;
      if (target.bookId !== screen.detail.book.id) {
        setChatError(t("chatJumpOtherBook"));
        return;
      }
      jumpingRef.current = true;
      setChatError("");
      try {
        let chapterId = target.chapterId;
        let offset = target.offset;
        if (offset === void 0 && target.q) {
          const result = await call("search", { bookId: target.bookId, query: target.q, limit: 20 });
          const match = result.matches.find((item) => item.chapterId === chapterId);
          if (!match) {
            setChatError(t("chatJumpNotFound"));
            return;
          }
          chapterId = match.chapterId;
          offset = match.offset;
        }
        await selectChapter(target.bookId, chapterId, { offset, flash: true });
        if (typeof window !== "undefined" && window.innerWidth <= 1100) setChatOpen(false);
      } catch (cause) {
        setChatError(`${t("chatJumpFailed")}：${messageOf(cause)}`);
      } finally {
        jumpingRef.current = false;
      }
    }, [call, screen, selectChapter, setChatError, setChatOpen, t]);
    React.useEffect(() => {
      if (screen.kind !== "book" || typeof document === "undefined") return;
      const onLinkClick = (event) => {
        const anchor = event.target?.closest?.('a[href*="dsh-readpilot.invalid/jump"]');
        if (!anchor) return;
        const target = parseReaderJumpUrl(anchor.href);
        if (!target) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        void jumpToTarget(target);
      };
      document.addEventListener("click", onLinkClick, true);
      return () => document.removeEventListener("click", onLinkClick, true);
    }, [jumpToTarget, screen.kind]);
  }

  // src/client/anchor.ts
  function blocksText(blocks) {
    return (Array.isArray(blocks) ? blocks : []).map((block) => block?.text ?? "").join("\n\n");
  }
  function offsetInChapter(blocks, blockIndex, offset) {
    let start = 0;
    for (let index = 0; index < blockIndex; index += 1) {
      start += (blocks?.[index]?.text ?? "").length + 2;
    }
    return start + Math.max(0, Number.isInteger(offset) ? offset : 0);
  }
  function contextAround(text, start, end, size = 32) {
    const value = typeof text === "string" ? text : "";
    const from = Math.max(0, Math.min(value.length, start));
    const to = Math.max(from, Math.min(value.length, end));
    return {
      prefix: value.slice(Math.max(0, from - size), from),
      suffix: value.slice(to, Math.min(value.length, to + size))
    };
  }
  function hashText(text) {
    let hash = 2166136261;
    for (const character of String(text ?? "")) {
      hash ^= character.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  // src/client/hooks/use-notes.ts
  function useNotes({
    call,
    t,
    screen,
    activeBookId,
    activeChapterId,
    visual,
    pageView,
    palette,
    fontSize,
    paged,
    layout,
    contentRef,
    epubFrameRef,
    epubReady,
    selection,
    setSelection,
    selectChapter
  }) {
    const [notes, setNotes] = React.useState([]);
    const [notesLoading, setNotesLoading] = React.useState(false);
    const [notesError, setNotesError] = React.useState("");
    const [noteDeletingId, setNoteDeletingId] = React.useState(null);
    const [noteEditor, setNoteEditor] = React.useState(null);
    const [noteDraft, setNoteDraft] = React.useState("");
    const [noteColor, setNoteColor] = React.useState("yellow");
    const [noteSaving, setNoteSaving] = React.useState(false);
    const [noteError, setNoteError] = React.useState("");
    const [epubJumpToken, setEpubJumpToken] = React.useState(0);
    const noteInputRef = React.useRef(null);
    const noteLayerRef = React.useRef(null);
    const pendingEpubNoteRef = React.useRef(null);
    const notesRequestRef = React.useRef(0);
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
        const list = value.notes.slice();
        list.sort((left, right) => timestampOf(right.createdAt) - timestampOf(left.createdAt));
        setNotes(list);
      } catch (cause) {
        if (notesRequestRef.current === request) {
          setNotesError(`${t("notesFailed")}：${messageOf(cause)}`);
        }
      } finally {
        if (notesRequestRef.current === request) setNotesLoading(false);
      }
    }, [activeBookId, call, t]);
    React.useEffect(() => {
      notesRequestRef.current += 1;
      setNotes([]);
      setNotesLoading(false);
      setNotesError("");
      setNoteDeletingId(null);
      setNoteEditor(null);
      setNoteDraft("");
      setNoteError("");
    }, [activeBookId]);
    React.useEffect(() => {
      if (screen.kind !== "book") return;
      void loadNotes();
    }, [screen.kind, activeBookId, loadNotes]);
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
      const bookId = note.bookId ?? activeBookId;
      if (!bookId) return;
      setNoteDeletingId(note.id);
      setNotesError("");
      try {
        await call("notes", {
          action: "delete",
          bookId,
          noteId: note.id
        });
      } catch (cause) {
        setNotesError(`${t("noteDeleteFailed")}：${messageOf(cause)}`);
        setNoteDeletingId(null);
        return;
      }
      setNoteDeletingId(null);
      await loadNotes();
    }, [activeBookId, call, loadNotes, noteDeletingId, t]);
    const closeNoteEditor = React.useCallback(() => {
      setNoteEditor(null);
      setNoteDraft("");
      setNoteColor("yellow");
      setNoteError("");
    }, []);
    const selectionFields = React.useCallback(() => {
      if (!selection || selection.blockIndex == null || screen.kind !== "book") return null;
      const chapter = blocksText(screen.content.blocks);
      const stripped = selection.text.replace(/^[\s•·▪◦●]+/, "");
      const quote = stripped || selection.text;
      const shift = selection.text.length - quote.length;
      const preferred = offsetInChapter(screen.content.blocks, selection.blockIndex, selection.offset) + shift;
      const occurrence = findNoteOccurrence(chapter, quote, preferred);
      const start = occurrence?.start ?? preferred;
      const context = contextAround(chapter, start, start + quote.length);
      return {
        chapterId: activeChapterId,
        blockIndex: selection.blockIndex,
        offset: selection.offset + shift,
        quote,
        quotePrefix: context.prefix,
        quoteSuffix: context.suffix,
        textHash: hashText(chapter)
      };
    }, [activeChapterId, screen, selection]);
    const addHighlight = React.useCallback(async (color) => {
      const fields = selectionFields();
      if (!fields || screen.kind !== "book" || noteSaving) return;
      window.getSelection()?.removeAllRanges();
      epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges();
      setNoteSaving(true);
      setNoteError("");
      try {
        await call("notes", {
          action: "add",
          bookId: screen.detail.book.id,
          kind: "highlight",
          color,
          annotation: "",
          note: "",
          ...fields
        });
      } catch (cause) {
        setNoteError(`${t("noteSaveFailed")}：${messageOf(cause)}`);
        setNoteSaving(false);
        return;
      }
      setNoteSaving(false);
      setSelection(null);
      await loadNotes();
      window.getSelection()?.removeAllRanges();
      epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges();
    }, [call, epubFrameRef, loadNotes, noteSaving, screen, selectionFields, setSelection, t]);
    const openNoteEditor = React.useCallback((note) => {
      if (note) {
        window.getSelection()?.removeAllRanges();
        epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges();
        setNoteEditor({
          noteId: note.id,
          kind: note.kind ?? "note",
          chapterId: note.chapterId,
          blockIndex: note.blockIndex,
          offset: note.offset,
          quote: note.quote
        });
        setNoteDraft(note.kind === "highlight" ? note.annotation ?? "" : note.note ?? "");
        setNoteColor(note.color ?? "yellow");
        setNoteError("");
        setSelection(null);
        requestAnimationFrame(() => noteInputRef.current?.focus());
        return;
      }
      const fields = selectionFields();
      if (!fields) return;
      setNoteEditor({ kind: "note", ...fields });
      setNoteDraft("");
      setNoteColor("yellow");
      setNoteError("");
      setSelection(null);
      requestAnimationFrame(() => noteInputRef.current?.focus());
    }, [noteInputRef, selectionFields, setSelection]);
    const addBookmark = React.useCallback(async (label) => {
      if (screen.kind !== "book" || noteSaving) return;
      const context = bookmarkContext(screen, activeChapterId);
      setNoteSaving(true);
      setNoteError("");
      try {
        await call("notes", {
          action: "add",
          bookId: screen.detail.book.id,
          kind: "bookmark",
          color: "yellow",
          chapterId: activeChapterId,
          blockIndex: 0,
          offset: 0,
          quote: "",
          note: typeof label === "string" && label.trim() || context.chapterTitle || screen.content.title || t("bookmark"),
          annotation: context.pageLabel
        });
      } catch (cause) {
        setNoteError(`${t("noteSaveFailed")}：${messageOf(cause)}`);
        setNoteSaving(false);
        return;
      }
      setNoteSaving(false);
      await loadNotes();
    }, [activeChapterId, call, loadNotes, noteSaving, screen, t]);
    const saveNote = React.useCallback(async () => {
      const editor = noteEditor;
      const text = noteDraft.trim();
      if (!editor || !text && editor.kind !== "highlight" || noteSaving || screen.kind !== "book") return;
      const noteId = editor.noteId;
      const highlightNoteId = editor.kind === "highlight" ? noteId : null;
      if (editor.kind === "highlight" && !highlightNoteId) return;
      setNoteSaving(true);
      setNoteError("");
      try {
        if (highlightNoteId) {
          await call("notes", {
            action: "update",
            bookId: screen.detail.book.id,
            noteId: highlightNoteId,
            annotation: text,
            color: noteColor
          });
        } else if (noteId) {
          await call("notes", {
            action: "update",
            bookId: screen.detail.book.id,
            noteId,
            note: text
          });
        } else {
          await call("notes", {
            action: "add",
            bookId: screen.detail.book.id,
            kind: "note",
            chapterId: editor.chapterId,
            blockIndex: editor.blockIndex,
            offset: editor.offset,
            quote: editor.quote,
            quotePrefix: editor.quotePrefix,
            quoteSuffix: editor.quoteSuffix,
            textHash: editor.textHash,
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
      setNoteColor("yellow");
      void loadNotes();
    }, [call, loadNotes, noteColor, noteDraft, noteEditor, noteSaving, screen, t]);
    React.useEffect(() => {
      const layer = noteLayerRef.current;
      if (!layer) return;
      const root = visual?.kind === "pdf" ? layer.parentElement : contentRef.current?.querySelector(".dsh-readpilot-reader-inner");
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
        const layerRect = layer.getBoundingClientRect();
        const isPdf = visual?.kind === "pdf";
        for (const note of relevant) {
          const stripped = note.quote.replace(/^[\s•·▪◦●]+/, "");
          const quote = stripped || note.quote;
          const shift = note.quote.length - quote.length;
          let match = findNoteOccurrence(text, quote, note.offset + shift, note.quotePrefix, note.quoteSuffix);
          if (!match) {
            match = findNoteOccurrence(text, note.quote, note.offset, note.quotePrefix, note.quoteSuffix);
          }
          if (!match) continue;
          const range = rangeForNote(root, match.start, match.end);
          const pdfRects = isPdf ? pdfNoteRects(pageView, match) : null;
          const rects = pdfRects ?? (range ? [...range.getClientRects()] : []);
          for (const rect of rects) {
            if (!rect.width || !rect.height) continue;
            const hit = document.createElement("div");
            hit.className = note.kind === "highlight" ? `dsh-readpilot-note-hit dsh-readpilot-highlight-${note.color ?? "yellow"}` : "dsh-readpilot-note-hit";
            hit.dataset.noteId = note.id;
            hit.style.left = `${isPdf ? rect.left : rect.left - layerRect.left}px`;
            hit.style.top = `${isPdf ? rect.top : rect.top - layerRect.top}px`;
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
        const target = event.target;
        const hit = target?.closest?.(".dsh-readpilot-note-hit");
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
    }, [activeChapterId, contentRef, fontSize, layout, notes, openNoteEditor, paged, pageView, palette, screen, visual?.kind, visual?.kind === "pdf" ? visual.page : null]);
    React.useEffect(() => {
      const frame = epubFrameRef.current;
      if (visual?.kind !== "epub" || screen.kind !== "book" || !frame) return;
      const result = applyEpubNoteMarks(
        frame,
        notes,
        screen.content.chapterId,
        palette,
        openNoteEditor,
        pendingEpubNoteRef.current
      );
      if (result.jumped) pendingEpubNoteRef.current = null;
      return result.cleanup;
    }, [epubFrameRef, epubJumpToken, epubReady, layout, notes, openNoteEditor, paged, palette, screen, visual?.kind, visual?.kind === "epub" ? visual.href : null]);
    const noteItems = notes.filter((note) => note.kind !== "highlight" && note.kind !== "bookmark");
    const highlights = notes.filter((note) => note.kind === "highlight");
    const bookmarks = notes.filter((note) => note.kind === "bookmark");
    return {
      notes: noteItems,
      highlights,
      bookmarks,
      notesLoading,
      notesError,
      noteDeletingId,
      noteEditor,
      noteDraft,
      setNoteDraft,
      noteColor,
      setNoteColor,
      noteSaving,
      noteError,
      noteInputRef,
      noteLayerRef,
      loadNotes,
      openNote,
      deleteNote,
      closeNoteEditor,
      openNoteEditor,
      addHighlight,
      addBookmark,
      saveNote
    };
  }

  // src/client/reader-screen.ts
  var lastScreen = { kind: "library" };
  function currentReaderScreen() {
    return lastScreen;
  }
  function rememberReaderScreen(screen) {
    lastScreen = screen;
  }
  function visualForItem(detail, item) {
    if (!detail || !item) return null;
    if (detail.book.format === "pdf") {
      return { kind: "pdf", page: Number.isInteger(item.page) ? item.page : 1, scale: 1.5 };
    }
    if (detail.book.format === "epub" && typeof item.href === "string" && item.href) {
      return { kind: "epub", href: item.href };
    }
    return null;
  }
  function visualForChapter(detail, chapterId) {
    if (!detail || !chapterId) return null;
    return visualForItem(detail, detail.toc.find((item) => item.id === chapterId));
  }

  // src/client/shortcuts.ts
  function readerShortcut(input, context) {
    const tag = (input.targetTag ?? "").toUpperCase();
    if (input.contentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return null;
    if (input.isComposing || input.altKey) return null;
    const key = input.key;
    if ((input.ctrlKey || input.metaKey) && key.toLowerCase() === "f") return "search";
    if (input.ctrlKey || input.metaKey) return null;
    if (key === "Escape") {
      if (context.searchOpen) return "close-search";
      return context.hasSelection ? "clear-selection" : null;
    }
    if (key === "f" || key === "F") return "search";
    if (key === "b" || key === "B") return "bookmark";
    const forward = key === "ArrowRight" || key === "PageDown" || key === " ";
    const backward = key === "ArrowLeft" || key === "PageUp";
    if (!forward && !backward) return null;
    if (!context.paged) return null;
    return forward ? "next" : "prev";
  }

  // src/client/hooks/use-long-notes.ts
  function useLongNotes({ call, t, activeBookId, notesTabActive }) {
    const [notes, setNotes] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [active, setActive] = React.useState(null);
    const [title, setTitle] = React.useState("");
    const [creating, setCreating] = React.useState(false);
    const [createKind, setCreateKind] = React.useState("topic");
    const [saving, setSaving] = React.useState(false);
    const [drafts, setDrafts] = React.useState([]);
    const [draftBusyId, setDraftBusyId] = React.useState(null);
    const [history, setHistory] = React.useState([]);
    const [historyOpen, setHistoryOpen] = React.useState(false);
    const [historyBusy, setHistoryBusy] = React.useState(false);
    const [exporting, setExporting] = React.useState(false);
    const [exportStatus, setExportStatus] = React.useState("");
    const [externalBusy, setExternalBusy] = React.useState(false);
    const requestRef = React.useRef(0);
    const draftRequestRef = React.useRef(0);
    const readRef = React.useRef(0);
    const bookRef = React.useRef(activeBookId);
    bookRef.current = activeBookId;
    const load = React.useCallback(async () => {
      if (!activeBookId) {
        setNotes([]);
        return;
      }
      const request = requestRef.current + 1;
      requestRef.current = request;
      setLoading(true);
      setError("");
      try {
        const value = await call("noteFiles", { action: "list", bookId: activeBookId });
        if (requestRef.current !== request) return;
        setNotes(value.notes.slice());
      } catch (cause) {
        if (requestRef.current === request) setError(`${t("notesFailed")}：${messageOf(cause)}`);
      } finally {
        if (requestRef.current === request) setLoading(false);
      }
    }, [activeBookId, call, t]);
    const loadDrafts = React.useCallback(async () => {
      const bookId = activeBookId;
      if (!bookId) {
        setDrafts([]);
        return;
      }
      const request = draftRequestRef.current + 1;
      draftRequestRef.current = request;
      try {
        const value = await call("noteDrafts", { action: "list", bookId });
        if (draftRequestRef.current !== request || bookRef.current !== bookId) return;
        setDrafts(value.drafts.slice());
      } catch (cause) {
        if (draftRequestRef.current === request && bookRef.current === bookId) {
          setError(`${t("notesFailed")}：${messageOf(cause)}`);
        }
      }
    }, [activeBookId, call, t]);
    React.useEffect(() => {
      requestRef.current += 1;
      draftRequestRef.current += 1;
      readRef.current += 1;
      setNotes([]);
      setLoading(false);
      setError("");
      setActive(null);
      setTitle("");
      setCreating(false);
      setSaving(false);
      setDrafts([]);
      setDraftBusyId(null);
      setHistory([]);
      setHistoryOpen(false);
      setHistoryBusy(false);
      setExportStatus("");
      void load();
    }, [activeBookId, load]);
    React.useEffect(() => {
      if (!activeBookId || !notesTabActive) {
        setDrafts([]);
        return;
      }
      let cancelled = false;
      const tick = () => {
        if (!cancelled) void loadDrafts();
      };
      tick();
      const timer = window.setInterval(tick, 4e3);
      return () => {
        cancelled = true;
        window.clearInterval(timer);
      };
    }, [activeBookId, notesTabActive, loadDrafts]);
    const open = React.useCallback(async (note) => {
      if (!activeBookId) return;
      const bookId = activeBookId;
      const request = readRef.current + 1;
      readRef.current = request;
      setError("");
      try {
        const value = await call("noteFiles", { action: "read", bookId, id: note.id });
        if (readRef.current !== request || bookRef.current !== bookId) return;
        setActive({ note: value.note, body: value.body, hash: value.hash });
        setCreating(false);
        setTitle("");
        setHistory([]);
        setHistoryOpen(false);
        setExportStatus("");
      } catch (cause) {
        if (readRef.current === request && bookRef.current === bookId) {
          setError(`${t("notesFailed")}：${messageOf(cause)}`);
        }
      }
    }, [activeBookId, call, t]);
    React.useEffect(() => {
      if (typeof window === "undefined") return;
      const onFocus = () => {
        if (active) void open(active.note);
        void load();
      };
      window.addEventListener("focus", onFocus);
      return () => window.removeEventListener("focus", onFocus);
    }, [active, load, open]);
    const beginCreate = React.useCallback((kind) => {
      if (kind === "book") {
        const existing = notes.find((note) => note.kind === "book");
        if (existing) {
          void open(existing);
          return;
        }
      }
      readRef.current += 1;
      setActive(null);
      setCreating(true);
      setCreateKind(kind);
      setError("");
      setHistory([]);
      setHistoryOpen(false);
      setExportStatus("");
      setTitle(kind === "book" ? t("bookNote") : "");
    }, [notes, open, t]);
    const create2 = React.useCallback(async () => {
      if (!activeBookId || saving) return;
      const bookId = activeBookId;
      const wantedTitle = title.trim();
      if (!wantedTitle) {
        setError(t("longNoteTitleRequired"));
        return;
      }
      setSaving(true);
      setError("");
      try {
        const value = await call("noteFiles", {
          action: "create",
          bookId,
          title: wantedTitle,
          kind: createKind,
          body: `# ${wantedTitle}
`
        });
        if (bookRef.current !== bookId) return;
        setActive({ note: value.note, body: value.body, hash: value.hash });
        setCreating(false);
        setTitle("");
        await load();
        if (bookRef.current !== bookId) return;
        await call("openNoteFile", { bookId, id: value.note.id });
      } catch (cause) {
        if (bookRef.current === bookId) {
          const code = cause?.code;
          setError(code === "open-failed" ? `${t("openExternalFailed")}：${messageOf(cause)}` : `${t("noteSaveFailed")}：${messageOf(cause)}`);
        }
      } finally {
        setSaving(false);
      }
    }, [activeBookId, call, createKind, load, saving, t, title]);
    const cancelCreate = React.useCallback(() => {
      setCreating(false);
      setTitle("");
      setError("");
    }, []);
    const close = React.useCallback(() => {
      readRef.current += 1;
      setActive(null);
      setCreating(false);
      setTitle("");
      setError("");
      setHistory([]);
      setHistoryOpen(false);
    }, []);
    const remove = React.useCallback(async () => {
      if (!activeBookId || !active) return;
      const bookId = activeBookId;
      if (typeof window !== "undefined" && typeof window.confirm === "function" && !window.confirm(t("deleteLongNoteConfirm"))) return;
      setSaving(true);
      setError("");
      try {
        await call("noteFiles", { action: "remove", bookId, id: active.note.id });
        if (bookRef.current !== bookId) return;
        setActive(null);
        setCreating(false);
        setTitle("");
        await load();
      } catch (cause) {
        if (bookRef.current === bookId) {
          setError(`${t("noteDeleteFailed")}：${messageOf(cause)}`);
        }
      } finally {
        setSaving(false);
      }
    }, [active, activeBookId, call, load, t]);
    const reload = React.useCallback(async () => {
      if (!active) return;
      await open(active.note);
    }, [active, open]);
    const applyDraft = React.useCallback(async (item) => {
      if (!activeBookId || draftBusyId) return;
      const bookId = activeBookId;
      setDraftBusyId(item.id);
      setError("");
      try {
        const value = await call("noteDrafts", { action: "apply", bookId, draftId: item.id });
        if (bookRef.current !== bookId) return;
        setActive({ note: value.note, body: value.body, hash: value.hash });
        setCreating(false);
        setTitle("");
        await loadDrafts();
        await load();
      } catch (cause) {
        if (bookRef.current === bookId) setError(`${t("draftActionFailed")}：${messageOf(cause)}`);
      } finally {
        setDraftBusyId(null);
      }
    }, [activeBookId, call, draftBusyId, load, loadDrafts, t]);
    const rejectDraft = React.useCallback(async (item) => {
      if (!activeBookId || draftBusyId) return;
      const bookId = activeBookId;
      setDraftBusyId(item.id);
      setError("");
      try {
        await call("noteDrafts", { action: "reject", bookId, draftId: item.id });
        if (bookRef.current === bookId) await loadDrafts();
      } catch (cause) {
        if (bookRef.current === bookId) setError(`${t("draftActionFailed")}：${messageOf(cause)}`);
      } finally {
        setDraftBusyId(null);
      }
    }, [activeBookId, call, draftBusyId, loadDrafts, t]);
    const loadHistory = React.useCallback(async () => {
      if (!activeBookId || !active) return;
      const bookId = activeBookId;
      setHistoryBusy(true);
      try {
        const value = await call("noteFiles", { action: "history", bookId, id: active.note.id });
        if (bookRef.current === bookId) setHistory(value.history.slice());
      } catch (cause) {
        if (bookRef.current === bookId) setError(`${t("historyFailed")}：${messageOf(cause)}`);
      } finally {
        setHistoryBusy(false);
      }
    }, [active, activeBookId, call, t]);
    const toggleHistory = React.useCallback(() => {
      if (!active) return;
      if (historyOpen) {
        setHistoryOpen(false);
        return;
      }
      setHistoryOpen(true);
      void loadHistory();
    }, [active, historyOpen, loadHistory]);
    const restoreHistory = React.useCallback(async (entry) => {
      if (!activeBookId || !active || historyBusy) return;
      const bookId = activeBookId;
      if (typeof window !== "undefined" && typeof window.confirm === "function" && !window.confirm(t("historyRestoreConfirm"))) return;
      setHistoryBusy(true);
      setError("");
      try {
        const value = await call("noteFiles", {
          action: "restore",
          bookId,
          id: active.note.id,
          historyId: entry.id
        });
        if (bookRef.current !== bookId) return;
        setActive({ note: value.note, body: value.body, hash: value.hash });
        await loadHistory();
        await load();
      } catch (cause) {
        if (bookRef.current === bookId) setError(`${t("historyFailed")}：${messageOf(cause)}`);
      } finally {
        setHistoryBusy(false);
      }
    }, [active, activeBookId, call, historyBusy, load, loadHistory, t]);
    const removeHistory = React.useCallback(async (entry) => {
      if (!activeBookId || !active || historyBusy) return;
      const bookId = activeBookId;
      if (typeof window !== "undefined" && typeof window.confirm === "function" && !window.confirm(t("historyDeleteConfirm"))) return;
      setHistoryBusy(true);
      setError("");
      try {
        await call("noteFiles", {
          action: "historyRemove",
          bookId,
          id: active.note.id,
          historyId: entry.id
        });
        if (bookRef.current === bookId) await loadHistory();
      } catch (cause) {
        if (bookRef.current === bookId) setError(`${t("historyFailed")}：${messageOf(cause)}`);
      } finally {
        setHistoryBusy(false);
      }
    }, [active, activeBookId, call, historyBusy, loadHistory, t]);
    const clearHistory = React.useCallback(async () => {
      if (!activeBookId || !active || historyBusy) return;
      const bookId = activeBookId;
      if (typeof window !== "undefined" && typeof window.confirm === "function" && !window.confirm(t("historyClearConfirm"))) return;
      setHistoryBusy(true);
      setError("");
      try {
        await call("noteFiles", {
          action: "historyClear",
          bookId,
          id: active.note.id
        });
        if (bookRef.current === bookId) await loadHistory();
      } catch (cause) {
        if (bookRef.current === bookId) setError(`${t("historyFailed")}：${messageOf(cause)}`);
      } finally {
        setHistoryBusy(false);
      }
    }, [active, activeBookId, call, historyBusy, loadHistory, t]);
    const exportNotes = React.useCallback(async (save) => {
      if (!activeBookId || exporting) return;
      const bookId = activeBookId;
      setExporting(true);
      setExportStatus("");
      setError("");
      try {
        const value = await call("exportNotes", { bookId, save });
        if (bookRef.current !== bookId) return;
        if (save) {
          setExportStatus(value.path ? `${t("exportSaved")}：${value.path}` : t("exportSaved"));
        } else {
          downloadText(value.fileName, value.markdown);
        }
      } catch (cause) {
        if (bookRef.current === bookId) setError(`${t("exportFailed")}：${messageOf(cause)}`);
      } finally {
        setExporting(false);
      }
    }, [activeBookId, call, exporting, t]);
    const openExternal = React.useCallback(async () => {
      if (!activeBookId || !active || externalBusy) return;
      const bookId = activeBookId;
      setExternalBusy(true);
      setError("");
      try {
        await call("openNoteFile", { bookId, id: active.note.id });
      } catch (cause) {
        if (bookRef.current === bookId) setError(`${t("openExternalFailed")}：${messageOf(cause)}`);
      } finally {
        setExternalBusy(false);
      }
    }, [active, activeBookId, call, externalBusy, t]);
    return {
      notes,
      loading,
      error,
      active,
      title,
      creating,
      saving,
      createKind,
      drafts,
      draftBusyId,
      history,
      historyOpen,
      historyBusy,
      exporting,
      exportStatus,
      externalBusy,
      setTitle,
      open,
      beginCreate,
      create: create2,
      cancelCreate,
      close,
      remove,
      reload,
      applyDraft,
      rejectDraft,
      toggleHistory,
      restoreHistory,
      removeHistory,
      clearHistory,
      exportNotes,
      openExternal
    };
  }

  // src/client/hooks/use-memory.ts
  function useMemory({ call, t, activeBookId, notesTabActive }) {
    const [status, setStatus] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState("");
    const [busy, setBusy] = React.useState(false);
    const bookRef = React.useRef(activeBookId);
    React.useEffect(() => {
      bookRef.current = activeBookId;
      setStatus(null);
      setError("");
    }, [activeBookId]);
    const load = React.useCallback(async () => {
      if (!activeBookId) {
        setStatus(null);
        return;
      }
      const bookId = activeBookId;
      setLoading(true);
      setError("");
      try {
        const value = await call("memory", { action: "status", bookId });
        if (bookRef.current === bookId) setStatus(value);
      } catch (cause) {
        if (bookRef.current === bookId) setError(`${t("memoryFailed")}：${messageOf(cause)}`);
      } finally {
        setLoading(false);
      }
    }, [activeBookId, call, t]);
    React.useEffect(() => {
      if (!activeBookId || !notesTabActive) return;
      let cancelled = false;
      const tick = () => {
        if (!cancelled) void load();
      };
      tick();
      const timer = window.setInterval(tick, 5e3);
      return () => {
        cancelled = true;
        window.clearInterval(timer);
      };
    }, [activeBookId, notesTabActive, load]);
    const run = React.useCallback(async (payload) => {
      if (!activeBookId || busy) return;
      const bookId = activeBookId;
      setBusy(true);
      setError("");
      try {
        const value = await call("memory", { ...payload, bookId });
        if (bookRef.current === bookId) setStatus(value);
      } catch (cause) {
        if (bookRef.current === bookId) setError(`${t("memoryFailed")}：${messageOf(cause)}`);
      } finally {
        setBusy(false);
      }
    }, [activeBookId, busy, call, t]);
    return {
      status,
      loading,
      error,
      busy,
      refresh: () => run({ action: "status" }),
      setMode: (mode) => run({ action: "setMode", mode }),
      setBookState: (state) => run({ action: "setBook", state }),
      saveCard: (scope, text) => run({ action: "write", scope, text }),
      undo: (scope) => run({ action: "undo", scope }),
      clear: (scope) => run({ action: "clear", scope }),
      approve: (proposalId) => run({ action: "approve", proposalId }),
      reject: (proposalId) => run({ action: "reject", proposalId })
    };
  }

  // src/client/hooks/use-text-pager.ts
  var WHEEL_THRESHOLD = 40;
  function useTextPager({ enabled, layout, screen, fontSize, selectChapter }) {
    const [page, setPage] = React.useState(0);
    const [pageCount, setPageCount] = React.useState(1);
    const [pageTotal, setPageTotal] = React.useState(1);
    const [stride, setStride] = React.useState(0);
    const frameRef = React.useRef(null);
    const innerRef = React.useRef(null);
    const pendingLastRef = React.useRef(null);
    const pageRef = React.useRef(0);
    const scrollPageRef = React.useRef(null);
    pageRef.current = page;
    const active = enabled && screen.kind === "book";
    const chapterId = screen.kind === "book" ? screen.content.chapterId : "";
    const bookId = screen.kind === "book" ? screen.detail.book.id : "";
    const toc = screen.kind === "book" ? screen.detail.toc : [];
    const chapterIndex = toc.findIndex((item) => item.id === chapterId);
    const prevChapter = chapterIndex > 0 ? toc[chapterIndex - 1] : null;
    const nextChapter = chapterIndex >= 0 && chapterIndex + 1 < toc.length ? toc[chapterIndex + 1] : null;
    React.useEffect(() => {
      if (!active) {
        pendingLastRef.current = null;
        return;
      }
      setPage(0);
      const inner = innerRef.current;
      if (inner) inner.scrollLeft = 0;
    }, [active, chapterId, layout]);
    React.useEffect(() => {
      if (pendingLastRef.current !== null && pendingLastRef.current !== chapterId) {
        pendingLastRef.current = null;
      }
    }, [chapterId]);
    React.useEffect(() => {
      if (!active) {
        setStride(0);
        setPageCount(1);
        setPageTotal(1);
        return;
      }
      const inner = innerRef.current;
      if (!inner) return;
      let rafId = 0;
      const measure = () => {
        rafId = 0;
        if (!inner.isConnected) return;
        const width = inner.clientWidth;
        const height = inner.clientHeight;
        const content = inner.scrollWidth;
        if (width <= 0 || height <= 0) return;
        const metrics = measurePageMetrics(width, content, layout, PAGE_GAP);
        const pendingLast = pendingLastRef.current === chapterId;
        if (pendingLast) pendingLastRef.current = null;
        setStride(metrics.stride);
        setPageCount(metrics.pageCount);
        setPageTotal(metrics.totalColumns);
        if (pendingLast) {
          setPage(metrics.pageCount - 1);
        } else {
          setPage((previous) => clampPageIndex(previous, metrics.pageCount));
        }
      };
      const schedule = () => {
        if (rafId) return;
        if (typeof requestAnimationFrame === "function") {
          rafId = requestAnimationFrame(measure);
          return;
        }
        measure();
      };
      const view = typeof window === "undefined" ? null : window;
      let observer = null;
      if (typeof ResizeObserver === "function") {
        observer = new ResizeObserver(schedule);
        observer.observe(inner);
      }
      view?.addEventListener("resize", schedule);
      schedule();
      return () => {
        if (rafId && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
        observer?.disconnect();
        view?.removeEventListener("resize", schedule);
      };
    }, [active, chapterId, fontSize, layout]);
    React.useEffect(() => {
      const fromScroll = scrollPageRef.current === page;
      scrollPageRef.current = null;
      if (!active) return;
      const inner = innerRef.current;
      if (!inner) return;
      if (fromScroll) return;
      const maxLeft = Math.max(0, inner.scrollWidth - inner.clientWidth);
      const left = Math.min(clampPageIndex(page, pageCount) * stride, maxLeft);
      if (Math.abs(inner.scrollLeft - left) > 1) inner.scrollLeft = left;
    }, [active, page, pageCount, stride]);
    React.useEffect(() => {
      if (!active || stride <= 0) return;
      const inner = innerRef.current;
      if (!inner) return;
      const onScroll = () => {
        const current = clampPageIndex(pageRef.current, pageCount);
        const maxLeft = Math.max(0, inner.scrollWidth - inner.clientWidth);
        const snapped = Math.min(current * stride, maxLeft);
        if (Math.abs(inner.scrollLeft - snapped) <= 1) return;
        const next = clampPageIndex(Math.round(inner.scrollLeft / stride), pageCount);
        if (next === current) return;
        scrollPageRef.current = next;
        setPage(next);
      };
      inner.addEventListener("scroll", onScroll);
      return () => inner.removeEventListener("scroll", onScroll);
    }, [active, pageCount, stride]);
    const goPage = React.useCallback((delta) => {
      if (!active || delta === 0) return;
      const direction = delta > 0 ? 1 : -1;
      const current = clampPageIndex(page, pageCount);
      const target = current + direction;
      if (target >= 0 && target < pageCount) {
        setPage(target);
        return;
      }
      const neighbour = direction > 0 ? nextChapter : prevChapter;
      if (!neighbour) return;
      if (direction < 0) pendingLastRef.current = neighbour.id;
      void selectChapter(bookId, neighbour.id);
    }, [active, bookId, nextChapter, page, pageCount, prevChapter, selectChapter]);
    React.useEffect(() => {
      if (!enabled) return;
      const frame = frameRef.current;
      if (!frame) return;
      let accumulated = 0;
      const onWheel = (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        event.preventDefault();
        accumulated += event.deltaY;
        if (Math.abs(accumulated) < WHEEL_THRESHOLD) return;
        const direction = accumulated > 0 ? 1 : -1;
        accumulated = 0;
        goPage(direction);
      };
      frame.addEventListener("wheel", onWheel, { passive: false });
      return () => frame.removeEventListener("wheel", onWheel);
    }, [enabled, goPage]);
    const innerStyle = React.useMemo(() => ({
      height: "100%",
      width: "100%",
      maxWidth: "none",
      margin: "0",
      overflow: "hidden",
      columnCount: columnsFor(layout),
      columnGap: `${PAGE_GAP}px`,
      columnFill: "auto"
    }), [layout]);
    const safePage = active ? clampPageIndex(page, pageCount) : 0;
    const count = active ? pageCount : 1;
    const total = active ? pageTotal : 1;
    const bounds = pageBounds(safePage, layout, total);
    const canPrev = active && (safePage > 0 || prevChapter !== null);
    const canNext = active && (safePage < count - 1 || nextChapter !== null);
    return {
      frameRef,
      innerRef,
      innerStyle,
      page: safePage,
      pageCount: count,
      pageStart: bounds.start,
      pageEnd: bounds.end,
      pageTotal: total,
      canPrev,
      canNext,
      goPage
    };
  }

  // src/client/hooks/use-page-width.ts
  function paddingOf(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  function usePageWidth({ enabled, containerRef }) {
    const [width, setWidth] = React.useState(0);
    React.useEffect(() => {
      if (!enabled) {
        setWidth(0);
        return;
      }
      const view = typeof window === "undefined" ? null : window;
      let rafId = 0;
      const measure = () => {
        rafId = 0;
        const container2 = containerRef.current;
        if (!container2 || !container2.isConnected || !view) return;
        const style = view.getComputedStyle(container2);
        const contentWidth = container2.clientWidth - paddingOf(style.paddingLeft) - paddingOf(style.paddingRight);
        const contentHeight = container2.clientHeight - paddingOf(style.paddingTop) - paddingOf(style.paddingBottom);
        setWidth(pageWidthForHeight(contentHeight, contentWidth, PAGE_ASPECT));
      };
      const schedule = () => {
        if (rafId) return;
        if (typeof requestAnimationFrame === "function") {
          rafId = requestAnimationFrame(measure);
          return;
        }
        measure();
      };
      const container = containerRef.current;
      let observer = null;
      if (container && typeof ResizeObserver === "function") {
        observer = new ResizeObserver(schedule);
        observer.observe(container);
      }
      view?.addEventListener("resize", schedule);
      schedule();
      return () => {
        if (rafId && typeof cancelAnimationFrame === "function") cancelAnimationFrame(rafId);
        observer?.disconnect();
        view?.removeEventListener("resize", schedule);
      };
    }, [enabled, containerRef]);
    return enabled ? width : 0;
  }

  // src/client/hooks/use-visual.ts
  var EPUB_PAGING_STYLE_ID = "dsh-readpilot-paging";
  var EPUB_WHEEL_THRESHOLD = 40;
  function applyEpubPagingStyle(doc, layout) {
    let style = doc.getElementById(EPUB_PAGING_STYLE_ID);
    if (!style) {
      style = doc.createElement("style");
      style.id = EPUB_PAGING_STYLE_ID;
      (doc.head ?? doc.documentElement).appendChild(style);
    }
    style.textContent = `html { height: 100%; column-count: ${columnsFor(layout)}; column-gap: ${PAGE_GAP}px; column-fill: auto; overflow: hidden; } body { margin: 0 !important; }`;
  }
  function removeEpubPagingStyle(doc) {
    doc?.getElementById(EPUB_PAGING_STYLE_ID)?.remove();
  }
  function readyEpubDocument(frame) {
    const doc = frame?.contentDocument;
    if (!doc?.documentElement || doc.readyState === "loading") return null;
    const source = frame?.src;
    if (source && doc.URL !== source) return null;
    return doc;
  }
  function measureEpubDocument(doc, layout) {
    applyEpubPagingStyle(doc, layout);
    const html = doc.documentElement;
    return measurePageMetrics(html.clientWidth, html.scrollWidth, layout);
  }
  function scrollEpubPage(frame, page, stride) {
    const doc = frame?.contentDocument;
    if (doc) doc.documentElement.scrollLeft = page * stride;
  }
  function useVisual({
    call,
    t,
    screen,
    palette,
    setSelection,
    selectChapter,
    readingMode = "paged",
    layout = "single"
  }) {
    const [visual, setVisual] = React.useState(null);
    const [pageView, setPageView] = React.useState(null);
    const [pageViews, setPageViews] = React.useState([]);
    const [loadedView, setLoadedView] = React.useState(null);
    const [pdfPageCount, setPdfPageCount] = React.useState(0);
    const [pageInput, setPageInput] = React.useState("1");
    const [visualLoading, setVisualLoading] = React.useState(false);
    const [visualError, setVisualError] = React.useState("");
    const [epubReady, setEpubReady] = React.useState(0);
    const [epubPage, setEpubPage] = React.useState(0);
    const [epubPageCount, setEpubPageCount] = React.useState(1);
    const [epubPageStart, setEpubPageStart] = React.useState(1);
    const [epubPageEnd, setEpubPageEnd] = React.useState(1);
    const [epubPageTotal, setEpubPageTotal] = React.useState(1);
    const epubFrameRef = React.useRef(null);
    const epubCleanupRef = React.useRef(null);
    const epubPageRef = React.useRef(0);
    const epubPageCountRef = React.useRef(1);
    const epubStrideRef = React.useRef(0);
    const epubTotalRef = React.useRef(1);
    const epubMeasuredRef = React.useRef(false);
    const epubPendingLastRef = React.useRef(null);
    const goEpubPageRef = React.useRef(() => {
    });
    const activeChapterId = screen.kind === "book" ? visual?.kind === "pdf" ? screen.detail.toc.find((item) => item.page === visual.page)?.id ?? screen.content.chapterId : screen.content.chapterId : "";
    const epubHref = visual?.kind === "epub" ? visual.href : null;
    const epubChapterId = screen.kind === "book" ? screen.content.chapterId : "";
    const epubPaged = readingMode === "paged" && screen.kind === "book" && visual?.kind === "epub";
    React.useEffect(() => {
      if (!visual || visual.kind !== "pdf" || screen.kind !== "book") {
        setPageView(null);
        setPageViews([]);
        setPdfPageCount(0);
        setLoadedView(null);
        return;
      }
      let cancelled = false;
      setVisualLoading(true);
      setVisualError("");
      const bookId = screen.detail.book.id;
      const page = visual.page;
      const scale = visual.scale;
      const double = layout === "double";
      const load = async () => {
        const first = await call("pageView", { bookId, page, scale });
        if (cancelled) return;
        let views = [first];
        if (double && page < first.pageCount) {
          const second = await call("pageView", { bookId, page: page + 1, scale });
          if (cancelled) return;
          views = [first, second];
        }
        setPageViews(views);
        setPageView(first);
        setPdfPageCount(first.pageCount);
        setPageInput(String(page));
        setLoadedView({ bookId, page });
      };
      void load().catch((cause) => {
        if (cancelled) return;
        setPageView(null);
        setPageViews([]);
        setPdfPageCount(0);
        setLoadedView(null);
        setVisualError(`${t("loadFailed")}：${messageOf(cause)}`);
      }).finally(() => {
        if (!cancelled) setVisualLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [call, layout, screen, t, visual]);
    React.useEffect(() => {
      if (screen.kind !== "book" || visual?.kind !== "pdf" || !pageView) return;
      if (!activeChapterId || activeChapterId === screen.content.chapterId) return;
      void selectChapter(screen.detail.book.id, activeChapterId);
    }, [activeChapterId, pageView, screen, selectChapter, visual?.kind]);
    React.useEffect(() => () => {
      epubCleanupRef.current?.();
      epubCleanupRef.current = null;
    }, [visual?.kind === "epub" ? visual.href : null]);
    const goPdfPage = React.useCallback((next) => {
      const pageCount = pdfPageCount || pageView?.pageCount || 1;
      const page = Math.min(Math.max(1, next), pageCount);
      setVisual((previous) => previous?.kind === "pdf" && previous.page !== page ? { ...previous, page } : previous);
    }, [pageView, pdfPageCount]);
    const stepPdfPage = React.useCallback((delta) => {
      if (!Number.isFinite(delta) || delta === 0) return;
      const pageCount = pdfPageCount || pageView?.pageCount || 1;
      setVisual((previous) => {
        if (previous?.kind !== "pdf") return previous;
        const page = Math.min(Math.max(1, previous.page + delta * pageStep(layout)), pageCount);
        return page === previous.page ? previous : { ...previous, page };
      });
    }, [layout, pageView, pdfPageCount]);
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
      const rawText = active.toString();
      const text = rawText.trim();
      if (!text) return;
      const leading = rawText.length - rawText.trimStart().length;
      const base = Number(span.getAttribute("data-offset")) || 0;
      const before = range.cloneRange();
      before.selectNodeContents(span);
      before.setEnd(range.startContainer, range.startOffset);
      const rect = range.getBoundingClientRect();
      setSelection({
        text: text.slice(0, 2e3),
        blockIndex: 0,
        offset: base + before.toString().length + leading,
        x: Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120),
        y: rect.top
      });
    }, [setSelection]);
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
        if (!selected) return;
        const text = selected.toString().trim();
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
    }, [palette, setSelection]);
    React.useEffect(() => {
      if (visual?.kind === "epub" && epubFrameRef.current) {
        applyPaletteToFrame(epubFrameRef.current, palette);
      }
    }, [palette, visual?.kind === "epub" ? visual.href : null]);
    const goEpubChapter = React.useCallback((delta) => {
      epubPendingLastRef.current = null;
      if (screen.kind !== "book") return;
      const index = screen.detail.toc.findIndex((item) => item.id === screen.content.chapterId);
      const next = screen.detail.toc[index + delta];
      if (next) void selectChapter(screen.detail.book.id, next.id);
    }, [screen, selectChapter]);
    const resetEpubState = React.useCallback(() => {
      epubPageRef.current = 0;
      epubPageCountRef.current = 1;
      epubStrideRef.current = 0;
      epubTotalRef.current = 1;
      epubMeasuredRef.current = false;
      setEpubPage(0);
      setEpubPageCount(1);
      setEpubPageStart(1);
      setEpubPageEnd(1);
      setEpubPageTotal(1);
    }, []);
    const goEpubPage = React.useCallback((delta) => {
      if (!epubPaged || !epubMeasuredRef.current) return;
      const direction = delta > 0 ? 1 : delta < 0 ? -1 : 0;
      if (!direction) return;
      const next = epubPageRef.current + direction;
      if (next >= 0 && next < epubPageCount) {
        epubPageRef.current = next;
        setEpubPage(next);
        const total = epubTotalRef.current;
        const bounds = pageBounds(next, layout, total);
        setEpubPageTotal(total);
        setEpubPageStart(bounds.start);
        setEpubPageEnd(bounds.end);
        scrollEpubPage(epubFrameRef.current, next, epubStrideRef.current);
        return;
      }
      const toc = screen.kind === "book" ? screen.detail.toc : [];
      const index = toc.findIndex((item) => item.id === screen.content.chapterId);
      if (direction > 0) {
        if (index < 0 || index >= toc.length - 1) return;
        epubPageRef.current = 0;
        epubMeasuredRef.current = false;
        setEpubPage(0);
        goEpubChapter(1);
        return;
      }
      if (index <= 0) return;
      const previous = toc[index - 1];
      goEpubChapter(-1);
      epubMeasuredRef.current = false;
      epubPendingLastRef.current = previous.id;
    }, [epubPaged, epubPageCount, goEpubChapter, layout, screen]);
    React.useEffect(() => {
      goEpubPageRef.current = goEpubPage;
    }, [goEpubPage]);
    React.useEffect(() => {
      epubPendingLastRef.current = null;
      resetEpubState();
    }, [layout, readingMode, resetEpubState]);
    React.useEffect(() => {
      if (!epubPaged) return;
      if (epubPendingLastRef.current !== null && epubPendingLastRef.current === epubChapterId) {
        epubPageRef.current = 0;
        epubMeasuredRef.current = false;
        setEpubPage(0);
        return;
      }
      epubPendingLastRef.current = null;
      resetEpubState();
    }, [epubChapterId, epubHref, epubPaged, resetEpubState]);
    React.useEffect(() => {
      const frame = epubFrameRef.current;
      if (!epubPaged) {
        const doc = frame?.contentDocument;
        if (doc) {
          removeEpubPagingStyle(doc);
          doc.documentElement.scrollLeft = 0;
        }
        resetEpubState();
        return;
      }
      if (!readyEpubDocument(frame)) return;
      let animationFrame = 0;
      let lastSize = "";
      const measure = () => {
        animationFrame = 0;
        const doc = readyEpubDocument(frame);
        if (!doc) return;
        const metrics = measureEpubDocument(doc, layout);
        lastSize = frame ? `${frame.clientWidth}x${frame.clientHeight}` : "";
        const pendingLast = epubPendingLastRef.current !== null && epubPendingLastRef.current === epubChapterId;
        const page = clampPageIndex(pendingLast ? metrics.pageCount - 1 : epubPageRef.current, metrics.pageCount);
        epubPageRef.current = page;
        epubPageCountRef.current = metrics.pageCount;
        epubStrideRef.current = metrics.stride;
        epubTotalRef.current = metrics.totalColumns;
        epubMeasuredRef.current = true;
        const bounds = pageBounds(page, layout, metrics.totalColumns);
        setEpubPage(page);
        setEpubPageCount(metrics.pageCount);
        setEpubPageTotal(metrics.totalColumns);
        setEpubPageStart(bounds.start);
        setEpubPageEnd(bounds.end);
        doc.documentElement.scrollLeft = page * metrics.stride;
        if (pendingLast) epubPendingLastRef.current = null;
      };
      const schedule = () => {
        if (frame && `${frame.clientWidth}x${frame.clientHeight}` === lastSize) return;
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(measure);
      };
      schedule();
      let observer = null;
      if (frame && typeof ResizeObserver === "function") {
        observer = new ResizeObserver(schedule);
        observer.observe(frame);
      }
      return () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        observer?.disconnect();
      };
    }, [epubChapterId, epubHref, epubPaged, epubReady, layout, resetEpubState]);
    React.useEffect(() => {
      if (!epubPaged) return;
      const frame = epubFrameRef.current;
      if (!readyEpubDocument(frame)) return;
      const doc = frame?.contentDocument;
      if (!doc) return;
      let accumulated = 0;
      const onWheel = (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (!event.deltaY) return;
        event.preventDefault();
        if (accumulated > 0 !== event.deltaY > 0) accumulated = 0;
        accumulated += event.deltaY;
        if (Math.abs(accumulated) < EPUB_WHEEL_THRESHOLD) return;
        const direction = accumulated > 0 ? 1 : -1;
        accumulated = 0;
        goEpubPageRef.current(direction);
      };
      doc.addEventListener("wheel", onWheel, { passive: false });
      return () => doc.removeEventListener("wheel", onWheel);
    }, [epubHref, epubPaged, epubPage, epubReady, layout]);
    React.useEffect(() => {
      if (!epubPaged) return;
      const frame = epubFrameRef.current;
      if (!readyEpubDocument(frame)) return;
      const doc = frame?.contentDocument;
      if (!doc) return;
      let animationFrame = 0;
      const sync = () => {
        animationFrame = 0;
        if (!epubMeasuredRef.current) return;
        const stride = epubStrideRef.current;
        if (stride <= 0) return;
        const page = clampPageIndex(Math.round(doc.documentElement.scrollLeft / stride), epubPageCountRef.current);
        if (page === epubPageRef.current) return;
        epubPageRef.current = page;
        setEpubPage(page);
        const total = epubTotalRef.current;
        const bounds = pageBounds(page, layout, total);
        setEpubPageTotal(total);
        setEpubPageStart(bounds.start);
        setEpubPageEnd(bounds.end);
      };
      const onScroll = () => {
        if (animationFrame) return;
        animationFrame = requestAnimationFrame(sync);
      };
      doc.addEventListener("scroll", onScroll, { passive: true, capture: true });
      return () => {
        doc.removeEventListener("scroll", onScroll, true);
        if (animationFrame) cancelAnimationFrame(animationFrame);
      };
    }, [epubHref, epubPaged, epubReady, layout]);
    React.useEffect(() => () => {
      const doc = epubFrameRef.current?.contentDocument;
      if (doc) removeEpubPagingStyle(doc);
    }, [epubFrameRef]);
    return {
      visual,
      setVisual,
      pageView,
      setPageView,
      pageViews,
      loadedView,
      pdfPageCount,
      pageInput,
      setPageInput,
      visualLoading,
      visualError,
      setVisualError,
      epubReady,
      epubFrameRef,
      epubPage,
      epubPageCount,
      epubPageStart,
      epubPageEnd,
      epubPageTotal,
      goPdfPage,
      stepPdfPage,
      zoomPdf,
      onPdfMouseUp,
      onEpubLoad,
      goEpubChapter,
      goEpubPage
    };
  }

  // src/client/plugin.ts
  function createPlugin(require2) {
    bindRuntime(require2);
    const ReaderErrorBoundary = createReaderErrorBoundary();
    const NativeChatBoundary = createNativeChatBoundary();
    const NS = "dshReader";
    const style = document.createElement("style");
    style.dataset.plugin = "dsh-readpilot";
    style.dataset.pluginCss = "dsh-readpilot/reader.css";
    style.textContent = CSS;
    document.head.appendChild(style);
    let runtime;
    let boundText = (key) => key;
    const call = (async (endpoint, payload) => {
      if (!runtime || !runtime.connection) throw new Error("连接服务不可用");
      let response;
      try {
        response = await fetch("/api/dsh-readpilot", {
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
        const error = new Error(result?.error?.message ?? `请求失败（HTTP ${response.status}）`);
        error.code = result?.error?.code;
        throw error;
      }
      return result.value;
    });
    function ReaderPanel(props) {
      const t = props.t ?? boundText;
      const [snapshot, setSnapshot] = React.useState(null);
      const [screenState, setScreenState] = React.useState(currentReaderScreen);
      const setScreen = React.useCallback((next) => {
        if (typeof next === "function") {
          setScreenState((previous) => {
            const value = next(previous);
            rememberReaderScreen(value);
            return value;
          });
          return;
        }
        rememberReaderScreen(next);
        setScreenState(next);
      }, []);
      const screen = screenState;
      const [readingMode, setReadingMode] = React.useState(readReadingMode);
      const [pageLayout, setPageLayout] = React.useState(readPageLayout);
      const [error, setError] = React.useState("");
      const [busy, setBusy] = React.useState(false);
      const [tocOpen, setTocOpen] = React.useState(true);
      const [fontSize, setFontSize] = React.useState(17);
      const [selection, setSelection] = React.useState(null);
      const [paletteId, setPaletteId] = React.useState(readPaletteId);
      const palette = resolveReaderPalette(paletteId);
      const format = screen.kind === "book" ? screen.detail.book.format : null;
      const isTextFormat = format === "txt" || format === "md";
      const effectiveMode = format === "pdf" ? "paged" : readingMode;
      const contentRef = React.useRef(null);
      const pendingScrollRef = React.useRef(null);
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
        saveReadingMode(readingMode);
      }, [readingMode]);
      React.useEffect(() => {
        savePageLayout(pageLayout);
      }, [pageLayout]);
      const setBookTags = React.useCallback(async (book, tags) => {
        const result = await call("setBookTags", { bookId: book.id, tags });
        setSnapshot((previous) => previous ? { ...previous, tags: { ...previous.tags, [book.id]: result.tags } } : previous);
        return result.tags;
      }, []);
      const setBookStatus = React.useCallback(async (book, status) => {
        const result = await call("setBookStatus", { bookId: book.id, status });
        setSnapshot((previous) => {
          if (!previous) return previous;
          const statuses = { ...previous.status };
          if (result.status) statuses[book.id] = result.status;
          else delete statuses[book.id];
          return { ...previous, status: statuses };
        });
        return result.status;
      }, []);
      const setBookRating = React.useCallback(async (book, rating) => {
        const result = await call("setBookRating", { bookId: book.id, rating: rating > 0 ? rating : null });
        setSnapshot((previous) => {
          if (!previous) return previous;
          const ratings = { ...previous.rating };
          if (result.rating !== null) ratings[book.id] = result.rating;
          else delete ratings[book.id];
          return { ...previous, rating: ratings };
        });
        return result.rating;
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
      const forgetSession = React.useCallback((bookId) => {
        setSnapshot((previous) => {
          if (!previous?.sessions?.[bookId]) return previous;
          const sessions = { ...previous.sessions };
          delete sessions[bookId];
          return { ...previous, sessions };
        });
      }, []);
      const activeBookId = screen.kind === "book" ? screen.detail.book.id : null;
      const activeSessionId = activeBookId && snapshot ? snapshot.sessions?.[activeBookId]?.sessionId ?? null : null;
      const workspaceId = snapshot?.settings?.workspaceId ?? null;
      const {
        chatOpen,
        setChatOpen,
        chatWidth,
        draft,
        setDraft,
        sending,
        chatError,
        setChatError,
        chatTab,
        setChatTab,
        chatBodyRef,
        chatInputRef,
        running,
        messages,
        send,
        loadEarlier,
        startResize,
        moveResize,
        endResize,
        resetResize,
        resizeKeyDown,
        hasMore,
        loadingEarlier,
        chatBinding
      } = useCompanion({ runtime, call, t, screen, workspaceId, activeSessionId, rememberSession, forgetSession });
      const nativeInputRef = React.useRef(null);
      const handleNativeReady = React.useCallback((value) => {
        nativeInputRef.current = value;
        if (!value || !chatBinding?.sessionId) return;
        void call("companionPolicy", { sessionId: chatBinding.sessionId }).catch(() => {
        });
      }, [chatBinding, call]);
      React.useEffect(() => {
        if (screen.kind !== "book" || !activeSessionId) return;
        void call("companionContext", {
          sessionId: activeSessionId,
          bookId: screen.detail.book.id,
          title: screen.detail.book.title,
          chapter: screen.content.title
        }).catch(() => {
        });
      }, [activeSessionId, screen, call]);
      const longNotes = useLongNotes({ call, t, activeBookId, notesTabActive: chatOpen });
      const memory = useMemory({ call, t, activeBookId, notesTabActive: chatTab === "memory" });
      const [noteContextBusy, setNoteContextBusy] = React.useState(false);
      const [noteContextCharacters, setNoteContextCharacters] = React.useState(0);
      const noteContextEnabled = Boolean(activeBookId && snapshot?.companion?.notes?.[activeBookId]);
      const toggleNoteContext = React.useCallback(async () => {
        if (!activeBookId) return;
        const bookId = activeBookId;
        setNoteContextBusy(true);
        setError("");
        try {
          const result = await call("setNoteContext", { bookId, enabled: !noteContextEnabled });
          setSnapshot((previous) => {
            if (!previous) return previous;
            const notes2 = { ...previous.companion?.notes ?? {} };
            if (result.enabled) notes2[bookId] = true;
            else delete notes2[bookId];
            const companion = previous.companion ?? {
              notes: {},
              memory: { mode: "ask", books: {} },
              autoApplyNotes: false
            };
            return { ...previous, companion: { ...companion, notes: notes2 } };
          });
          setNoteContextCharacters(result.characters);
        } catch (cause) {
          setError(`${t("noteContextFailed")}：${messageOf(cause)}`);
        } finally {
          setNoteContextBusy(false);
        }
      }, [activeBookId, call, noteContextEnabled, t]);
      React.useEffect(() => {
        setNoteContextCharacters(0);
      }, [activeBookId]);
      const noteContext = {
        enabled: noteContextEnabled,
        busy: noteContextBusy,
        characters: noteContextCharacters,
        toggle: toggleNoteContext
      };
      const autoApplyNotes = Boolean(snapshot?.companion?.autoApplyNotes);
      const [autoApplyBusy, setAutoApplyBusy] = React.useState(false);
      const toggleAutoApply = React.useCallback(async () => {
        setAutoApplyBusy(true);
        setError("");
        try {
          const result = await call("setAutoApplyNotes", { enabled: !autoApplyNotes });
          setSnapshot((previous) => previous ? {
            ...previous,
            companion: { ...previous.companion, autoApplyNotes: result.enabled }
          } : previous);
        } catch (cause) {
          setError(`${t("autoApplyNotesFailed")}：${messageOf(cause)}`);
        } finally {
          setAutoApplyBusy(false);
        }
      }, [autoApplyNotes, call, t]);
      const autoApply = {
        enabled: autoApplyNotes,
        busy: autoApplyBusy,
        toggle: toggleAutoApply
      };
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
          setVisual(visualForItem(detail, target));
          setScreen({ kind: "book", detail, content });
        } catch (cause) {
          setError(`${t("loadFailed")}：${messageOf(cause)}`);
        } finally {
          setBusy(false);
        }
      }, [t]);
      const selectChapter = React.useCallback(async (bookId, chapterId, target) => {
        setSelection(null);
        setBusy(true);
        pendingScrollRef.current = null;
        try {
          const content = await call("chapter", { bookId, chapterId });
          pendingScrollRef.current = target ? {
            chapterId: content.chapterId,
            blockIndex: Number.isInteger(target.blockIndex) ? target.blockIndex : blockIndexAtOffset(content.blocks, target.offset ?? 0),
            flash: Boolean(target.flash)
          } : null;
          setScreen((previous) => previous.kind === "book" ? { ...previous, detail: { ...previous.detail, progress: { chapterId, chapterTitle: content.title } }, content } : previous);
          if (screen.kind === "book") {
            setVisual(visualForChapter(screen.detail, chapterId));
          }
          const toc2 = screen.kind === "book" ? screen.detail.toc : [];
          const index = toc2.findIndex((item) => item.id === chapterId);
          const percent = index >= 0 && toc2.length > 0 ? index / toc2.length * 100 : void 0;
          void call("progress", { bookId, chapterId, chapterTitle: content.title, percent }).catch(() => {
          });
        } catch (cause) {
          setError(`${t("loadFailed")}：${messageOf(cause)}`);
        } finally {
          setBusy(false);
        }
      }, [screen, t]);
      const jumpToPage = React.useCallback((page) => {
        if (screen.kind !== "book" || screen.detail.book.format !== "pdf") return;
        const items = screen.detail.toc.filter((item) => typeof item.page === "number" && item.page > 0);
        if (items.length === 0) return;
        const target = items.filter((item) => item.page <= page).sort((left, right) => right.page - left.page)[0] ?? items[0];
        void selectChapter(screen.detail.book.id, target.id, { flash: true });
        if (typeof window !== "undefined" && window.innerWidth <= 1100) setChatOpen(false);
      }, [screen, selectChapter, setChatOpen]);
      useChatJump({
        call,
        screen,
        t,
        selectChapter,
        setChatError,
        setChatOpen
      });
      const {
        searchOpen,
        setSearchOpen,
        searchQuery,
        setSearchQuery,
        searchBusy,
        searchResults,
        searchError,
        searchInputRef,
        openSearchMatch,
        runSearch,
        toggleSearch,
        resetSearch
      } = useSearch({ call, screen, t, selectChapter });
      React.useEffect(() => {
        resetSearch();
      }, [activeBookId, resetSearch]);
      const {
        visual,
        setVisual,
        pageView,
        setPageView,
        pageViews,
        loadedView,
        pdfPageCount,
        pageInput,
        setPageInput,
        visualLoading,
        visualError,
        setVisualError,
        epubReady,
        epubFrameRef,
        epubPage,
        epubPageCount,
        epubPageStart,
        epubPageEnd,
        epubPageTotal,
        goPdfPage,
        stepPdfPage,
        zoomPdf,
        onPdfMouseUp,
        onEpubLoad,
        goEpubChapter,
        goEpubPage
      } = useVisual({
        call,
        t,
        screen,
        palette,
        setSelection,
        selectChapter,
        readingMode: effectiveMode,
        layout: pageLayout
      });
      React.useEffect(() => {
        if (screen.kind !== "book" || visual) return;
        setVisual(visualForChapter(screen.detail, screen.content.chapterId));
      }, [screen, setVisual, visual]);
      const textPageWidth = usePageWidth({
        enabled: isTextFormat,
        containerRef: contentRef
      });
      const textPager = useTextPager({
        enabled: isTextFormat && effectiveMode === "paged",
        layout: pageLayout,
        screen,
        fontSize,
        selectChapter
      });
      const activeChapterId = screen.kind === "book" ? visual?.kind === "pdf" ? screen.detail.toc.find((item) => item.page === visual.page)?.id ?? screen.content.chapterId : screen.content.chapterId : "";
      const toc = screen.kind === "book" ? screen.detail.toc : [];
      const chapterIndex = screen.kind === "book" ? toc.findIndex((item) => item.id === screen.content.chapterId) : -1;
      const chapterTotal = toc.length;
      const goChapter = React.useCallback((delta) => {
        if (screen.kind !== "book") return;
        const item = screen.detail.toc[chapterIndex + delta];
        if (item) void selectChapter(screen.detail.book.id, item.id);
      }, [chapterIndex, screen, selectChapter]);
      const toggleReadingMode = React.useCallback(() => {
        setReadingMode((previous) => previous === "paged" ? "scroll" : "paged");
      }, []);
      const scrollToBlock = React.useCallback((pending) => {
        const container = contentRef.current;
        if (!container || !Number.isInteger(pending.blockIndex)) return;
        const target = container.querySelector(`[data-block-index="${pending.blockIndex}"]`);
        if (!target) return;
        target.scrollIntoView({ block: "center", behavior: "smooth" });
        if (pending.flash) {
          target.classList.add("dsh-readpilot-flash");
          window.setTimeout(() => target.classList.remove("dsh-readpilot-flash"), 1500);
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
      const {
        notes,
        highlights,
        bookmarks,
        notesLoading,
        notesError,
        noteDeletingId,
        noteEditor,
        noteDraft,
        setNoteDraft,
        noteColor,
        setNoteColor,
        noteSaving,
        noteError,
        noteInputRef,
        noteLayerRef,
        openNote,
        deleteNote,
        closeNoteEditor,
        openNoteEditor,
        addHighlight,
        addBookmark,
        saveNote
      } = useNotes({
        call,
        t,
        screen,
        activeBookId,
        activeChapterId,
        visual,
        pageView,
        palette,
        fontSize,
        paged: effectiveMode === "paged",
        layout: pageLayout,
        contentRef,
        epubFrameRef,
        epubReady,
        selection,
        setSelection,
        selectChapter
      });
      React.useEffect(() => {
        if (screen.kind !== "book") return;
        const onKeyDown = (event) => {
          const target = event.target;
          const action = readerShortcut({
            key: event.key,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            altKey: event.altKey,
            isComposing: event.isComposing,
            targetTag: target?.tagName,
            contentEditable: target?.isContentEditable
          }, {
            searchOpen,
            hasSelection: Boolean(selection),
            paged: effectiveMode === "paged"
          });
          if (!action) return;
          event.preventDefault();
          if (action === "next" || action === "prev") {
            const delta = action === "next" ? 1 : -1;
            if (visual?.kind === "pdf") stepPdfPage(delta);
            else if (visual?.kind === "epub") goEpubPage(delta);
            else textPager.goPage(delta);
            return;
          }
          if (action === "search") toggleSearch();
          else if (action === "close-search") setSearchOpen(false);
          else if (action === "clear-selection") setSelection(null);
          else if (action === "bookmark") void addBookmark();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
      }, [addBookmark, effectiveMode, goEpubPage, screen, searchOpen, selection, setSearchOpen, setSelection, stepPdfPage, textPager, toggleSearch, visual]);
      React.useEffect(() => {
        if (!selection) return;
        const dismiss = (event) => {
          const target = event.target;
          if (target && typeof target.closest === "function" && target.closest(".dsh-readpilot-selection")) return;
          setSelection(null);
        };
        const frameDoc = epubFrameRef.current?.contentDocument ?? null;
        document.addEventListener("pointerdown", dismiss, true);
        frameDoc?.addEventListener("pointerdown", dismiss, true);
        return () => {
          document.removeEventListener("pointerdown", dismiss, true);
          frameDoc?.removeEventListener("pointerdown", dismiss, true);
        };
      }, [epubFrameRef, selection, setSelection]);
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
      const askCompanion = React.useCallback(() => {
        if (!selection || screen.kind !== "book") return;
        window.getSelection()?.removeAllRanges();
        epubFrameRef.current?.contentWindow?.getSelection()?.removeAllRanges();
        const quote = selection.text.split("\n").map((line) => `> ${line}`).join("\n");
        const text = `${quote}

`;
        const nativeInput = nativeInputRef.current?.inputActions;
        let prefilledNative = false;
        if (nativeInput && typeof nativeInput.setDraft === "function") {
          try {
            nativeInput.setDraft(text);
            if (typeof nativeInput.focus === "function") nativeInput.focus();
            prefilledNative = true;
          } catch {
            prefilledNative = false;
          }
        }
        if (!prefilledNative) setDraft(text);
        setSelection(null);
        setChatOpen(true);
        setChatTab("chat");
        setChatError("");
        requestAnimationFrame(() => chatInputRef.current?.focus());
      }, [selection, screen]);
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
      const headerTitle = screen.kind === "book" ? screen.detail.book.title : screen.kind === "unsupported" ? screen.book.title : screen.kind === "setup" ? t("setupTitle") : snapshot?.settings.libraryDir ? t("library") : t("setupTitle");
      const headerSubtitle = screen.kind === "book" ? screen.content.title : snapshot?.settings.libraryDir ?? "";
      const chatBody = h(ChatBody, {
        t,
        workspaceId,
        hasMore,
        loadingEarlier,
        loadEarlier,
        messages,
        sending,
        running,
        chatBodyRef
      });
      const chatCompose = h(ChatCompose, {
        t,
        workspaceId,
        draft,
        setDraft,
        sending,
        send,
        chatInputRef
      });
      const fallbackChat = h(
        "div",
        { className: "dsh-readpilot-chat-fallback" },
        chatBody,
        chatError ? h("div", { className: "dsh-readpilot-chat-error" }, chatError) : null,
        chatCompose
      );
      const companionReference = chatBinding?.reference;
      const nativeChat = companionReference && props.SessionProvider && props.renderSlot ? h(
        NativeChatBoundary,
        { fallback: fallbackChat },
        h(
          props.SessionProvider,
          { session: companionReference },
          props.renderSlot("dsh-readpilot.companion", { onReady: handleNativeReady, fallback: fallbackChat })
        )
      ) : null;
      const notesBody = h(NotesBody, {
        t,
        notesError,
        notesLoading,
        notes,
        highlights,
        bookmarks,
        screen,
        openNote,
        noteDeletingId,
        deleteNote
      });
      const longNotesBody = h(LongNotes, { t, state: longNotes, noteContext, autoApply });
      const memoryBody = h(MemoryPanel, {
        t,
        status: memory.status,
        loading: memory.loading,
        error: memory.error,
        busy: memory.busy,
        onRefresh: memory.refresh,
        onMode: memory.setMode,
        onBookState: memory.setBookState,
        onSave: memory.saveCard,
        onUndo: memory.undo,
        onClear: memory.clear,
        onApprove: memory.approve,
        onReject: memory.reject
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
        longNotesBody,
        memoryBody,
        chatBody,
        nativeChat,
        onPageJump: format === "pdf" ? jumpToPage : null,
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
      const pdfVisual = visual?.kind === "pdf" ? visual : null;
      const pdfPage = pdfVisual?.page ?? 1;
      const readerBarProps = format === "pdf" ? {
        pageStart: pdfPage,
        pageEnd: Math.min(pdfPage + columnsFor(pageLayout) - 1, pdfPageCount || pdfPage),
        pageTotal: pdfPageCount || 1,
        canPrev: pdfPage > 1,
        canNext: pdfPage < pdfPageCount,
        onPrev: () => stepPdfPage(-1),
        onNext: () => stepPdfPage(1),
        pageInput,
        setPageInput,
        onPageCommit: goPdfPage,
        zoom: pdfVisual?.scale ?? 1,
        onZoom: zoomPdf,
        onLayoutChange: setPageLayout
      } : format === "epub" ? effectiveMode === "paged" ? {
        pageStart: epubPageStart,
        pageEnd: epubPageEnd,
        pageTotal: epubPageTotal,
        canPrev: epubPage > 0 || chapterIndex > 0,
        canNext: epubPage < epubPageCount - 1 || chapterIndex < chapterTotal - 1,
        onPrev: () => goEpubPage(-1),
        onNext: () => goEpubPage(1),
        onToggleMode: toggleReadingMode,
        onLayoutChange: setPageLayout
      } : {
        pageStart: 1,
        pageEnd: 1,
        pageTotal: 1,
        canPrev: chapterIndex > 0,
        canNext: chapterIndex >= 0 && chapterIndex < chapterTotal - 1,
        onPrev: () => goEpubChapter(-1),
        onNext: () => goEpubChapter(1),
        onToggleMode: toggleReadingMode
      } : effectiveMode === "paged" ? {
        pageStart: textPager.pageStart,
        pageEnd: textPager.pageEnd,
        pageTotal: textPager.pageTotal,
        canPrev: textPager.canPrev,
        canNext: textPager.canNext,
        onPrev: () => textPager.goPage(-1),
        onNext: () => textPager.goPage(1),
        onToggleMode: toggleReadingMode,
        onLayoutChange: setPageLayout
      } : {
        pageStart: 1,
        pageEnd: 1,
        pageTotal: 1,
        canPrev: chapterIndex > 0,
        canNext: chapterIndex >= 0 && chapterIndex < chapterTotal - 1,
        onPrev: () => goChapter(-1),
        onNext: () => goChapter(1),
        onToggleMode: toggleReadingMode
      };
      const readerBar = screen.kind === "book" ? h(ReaderBar, {
        t,
        format: screen.detail.book.format,
        mode: effectiveMode,
        layout: pageLayout,
        chapterTitle: screen.content.title,
        chapterIndex,
        chapterTotal,
        ...readerBarProps
      }) : null;
      const visualReader = visual ? h(VisualReader, {
        t,
        visual,
        screen,
        pageViews,
        loadedView,
        layout: pageLayout,
        readingMode: effectiveMode,
        stepPdfPage,
        visualLoading,
        visualError,
        onPdfMouseUp,
        noteLayerRef,
        onEpubLoad,
        epubFrameRef
      }) : null;
      const pageSpan = pageSpanWidth(textPageWidth, pageLayout);
      const pageFrameStyle = pageSpan > 0 ? { width: `${pageSpan}px`, maxWidth: "100%", margin: "0 auto" } : void 0;
      const textColumnStyle = textPageWidth > 0 ? { width: `${textPageWidth}px`, maxWidth: "100%", margin: "0 auto" } : void 0;
      const textReader = screen.kind === "book" ? effectiveMode === "paged" ? h(
        "div",
        {
          className: "dsh-readpilot-reader",
          "data-paged": "true",
          ref: contentRef,
          style: { fontSize },
          onMouseUp: onContentMouseUp
        },
        h(
          "div",
          { className: "dsh-readpilot-page-frame", ref: textPager.frameRef, style: pageFrameStyle },
          h(
            "div",
            {
              className: "dsh-readpilot-reader-inner dsh-readpilot-paged-inner",
              ref: textPager.innerRef,
              style: textPager.innerStyle
            },
            h("h1", { className: "dsh-readpilot-chapter-title" }, screen.content.title),
            renderBlocks(screen.content.blocks, screen.content.chapterId),
            h("div", { className: "dsh-readpilot-note-layer", ref: noteLayerRef })
          )
        )
      ) : h(
        "div",
        {
          className: "dsh-readpilot-reader",
          ref: contentRef,
          style: { fontSize },
          onMouseUp: onContentMouseUp
        },
        h(
          "div",
          { className: "dsh-readpilot-reader-inner", style: textColumnStyle },
          h("h1", { className: "dsh-readpilot-chapter-title" }, screen.content.title),
          renderBlocks(screen.content.blocks, screen.content.chapterId),
          h("div", { className: "dsh-readpilot-note-layer", ref: noteLayerRef })
        )
      ) : null;
      const bookView = screen.kind === "book" ? h(
        "div",
        {
          className: "dsh-readpilot-book",
          "data-toc": tocOpen ? "true" : "false",
          "data-chat": chatOpen ? "true" : "false",
          style: { "--dsh-readpilot-chat-width": `${chatWidth}px` }
        },
        tocOpen ? h(Toc, {
          t,
          detail: screen.detail,
          activeChapter: screen.content.chapterId,
          onSelect: (chapterId) => void selectChapter(screen.detail.book.id, chapterId)
        }) : null,
        h(
          "div",
          { className: "dsh-readpilot-main" },
          readerBar,
          visualReader ?? textReader
        ),
        chatOpen ? h("button", {
          type: "button",
          className: "dsh-readpilot-chat-backdrop",
          "aria-label": t("closeChat"),
          onClick: () => setChatOpen(false)
        }) : null,
        chatPanel
      ) : null;
      return h(
        "div",
        {
          className: "dsh-readpilot-panel",
          style: {
            "--reader-bg": palette.bg,
            "--reader-fg": palette.fg,
            "--reader-muted": palette.muted,
            "--reader-border": palette.border,
            "--reader-selection": palette.selection,
            "--reader-highlight": palette.highlight
          }
        },
        h(Header, {
          t,
          screen,
          title: headerTitle,
          subtitle: headerSubtitle,
          onBack: backToLibrary,
          paletteId,
          onChangePalette: changePalette,
          searchOpen,
          onToggleSearch: toggleSearch,
          onToggleChat: () => setChatOpen((previous) => !previous),
          onToggleToc: () => setTocOpen((previous) => !previous),
          onBookmark: addBookmark,
          onFontDecrease: () => setFontSize((previous) => Math.max(14, previous - 1)),
          onFontIncrease: () => setFontSize((previous) => Math.min(24, previous + 1))
        }),
        error ? h("div", { className: "dsh-readpilot-error" }, error) : null,
        searchPanel,
        !snapshot ? h("div", { className: "dsh-readpilot-muted" }, busy ? t("loading") : t("loadFailed")) : screen.kind === "setup" || !snapshot.settings.libraryDir ? h(Setup, {
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
          onSettings: openSetup,
          onSetTags: setBookTags,
          onSetStatus: setBookStatus,
          onSetRating: setBookRating
        }) : screen.kind === "unsupported" ? h(
          "div",
          { className: "dsh-readpilot-empty" },
          h("h2", null, screen.book.title),
          h("p", null, t("unsupportedHint")),
          h("button", {
            type: "button",
            className: "dsh-readpilot-secondary",
            onClick: backToLibrary
          }, t("back"))
        ) : bookView,
        h(SelectionToolbar, {
          t,
          selection,
          onAsk: askCompanion,
          onNote: () => openNoteEditor(),
          onHighlight: (color) => void addHighlight(color)
        }),
        h(NoteDialog, {
          t,
          noteEditor,
          noteDraft,
          setNoteDraft,
          noteColor,
          setNoteColor,
          noteSaving,
          noteError,
          noteInputRef,
          activeBookId,
          deleteNote,
          closeNoteEditor,
          saveNote
        }),
        h(DraftNotice, { t, state: longNotes })
      );
    }
    function ReaderPanelWithBoundary(props) {
      return h(ReaderErrorBoundary, null, h(ReaderPanel, props));
    }
    return {
      name: "dsh-readpilot-client",
      inject: ["slots", "layout", "locale", "connection", "sessions", "uiWorkspace"],
      foldTranscript,
      clampChatWidth,
      parseMarkdownBlocks,
      diffLines,
      NativeCompanion,
      READER_PALETTE_IDS,
      READER_PALETTES,
      resolveReaderPalette,
      findNoteOccurrence,
      apply(ctx) {
        runtime = ctx;
        boundText = ctx.locale.bind(NS);
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-readpilot: dictionaries");
        ctx.effect(
          () => ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
            name: "sidebar.panellist",
            id: "dsh-readpilot",
            order: 20,
            label: () => boundText("panel"),
            locale: NS
          }, PanelIcon)),
          "dsh-readpilot: sidebar entry"
        );
        ctx.effect(
          () => ctx.slots.inject("main", () => ctx.slots.register({
            name: "main",
            key: "dsh-readpilot",
            locale: NS,
            children: {
              "dsh-readpilot.companion": { kind: "single", scope: "session" }
            }
          }, ReaderPanelWithBoundary)),
          "dsh-readpilot: main panel"
        );
        ctx.effect(
          () => ctx.slots.inject("dsh-readpilot.companion", () => ctx.slots.register({
            name: "dsh-readpilot.companion",
            locale: NS
          }, NativeCompanion)),
          "dsh-readpilot: native companion"
        );
      }
    };
  }

  // src/client/index.ts
  function create(require2) {
    return createPlugin(require2);
  }
  return __toCommonJS(index_exports);
})();
/* Generated by scripts/build-client.ts; source in src/client/. */
window.__ModuleLoader__.load({ id: 'dsh-readpilot', factory(require) { return __dshReaderBundle.create(require) } })

