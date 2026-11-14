export const SHELL_CHAT_STYLES = `
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
.dsh-readpilot-dsh-markdown{min-width:0;max-width:100%;font-size:13px;line-height:1.7;color:var(--dsw-alias-label-primary)}
.dsh-readpilot-md p{margin:0 0 .7em;white-space:pre-wrap}
.dsh-readpilot-md p:last-child{margin-bottom:0}
.dsh-readpilot-footnote{display:flex;gap:6px;margin:1em 0;padding-top:8px;border-top:1px solid var(--dsw-alias-border-l2);font-size:.9em;color:var(--dsw-alias-label-secondary)}.dsh-readpilot-footnote-id{flex:none;color:var(--dsw-alias-brand-primary)}.dsh-readpilot-footnote-ref a{text-decoration:none;font-size:.78em}.dsh-readpilot-md h1,.dsh-readpilot-md h2,.dsh-readpilot-md h3,.dsh-readpilot-md h4,.dsh-readpilot-md h5,.dsh-readpilot-md h6{margin:.9em 0 .35em;line-height:1.4;font-weight:650}.dsh-readpilot-md h1{font-size:1.35em}.dsh-readpilot-md h2{font-size:1.22em}.dsh-readpilot-md .dsh-readpilot-task{align-items:center}.dsh-readpilot-md .dsh-readpilot-task input{flex:none;margin:0}.dsh-readpilot-inline-image{max-width:100%;height:auto;border-radius:4px}
.dsh-readpilot-md h3:first-child,.dsh-readpilot-md h4:first-child,.dsh-readpilot-md h5:first-child,.dsh-readpilot-md h6:first-child{margin-top:0}
.dsh-readpilot-md h3{font-size:1.2em}
.dsh-readpilot-md h4{font-size:1.1em}
.dsh-readpilot-md h5,.dsh-readpilot-md h6{font-size:1em}
.dsh-readpilot-md pre{margin:.6em 0;padding:10px 12px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);overflow:auto;font-size:12px;line-height:1.6}
.dsh-readpilot-md code{padding:1px 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);font-size:.92em}
.dsh-readpilot-md pre code{padding:0;background:transparent}
.dsh-readpilot-md blockquote{margin:.6em 0;padding:2px 0 2px 10px;border-left:2px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:pre-wrap}
.dsh-readpilot-md a{color:var(--dsw-alias-brand-primary);text-decoration:underline;text-underline-offset:2px}
.dsh-readpilot-table{width:100%;border-collapse:collapse;margin:0 0 14px;font-size:.92em;line-height:1.5;table-layout:auto}
.dsh-readpilot-figure{margin:0 0 14px;text-align:center;break-inside:avoid}
.dsh-readpilot-figure img{display:block;max-width:100%;height:auto;margin:0 auto;border-radius:6px}
.dsh-readpilot-figure figcaption{margin-top:4px;font-size:.82em;line-height:1.4;color:var(--reader-muted,var(--dsw-alias-label-secondary))}
.dsh-readpilot-table th,.dsh-readpilot-table td{border:1px solid var(--reader-border);padding:5px 8px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
.dsh-readpilot-table th{background:color-mix(in srgb,var(--reader-fg) 6%,transparent);font-weight:600}
.dsh-readpilot-md-hr{border:0;border-top:1px solid var(--dsw-alias-border-l2);margin:12px 0}
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
.dsh-readpilot-history{display:flex;flex-direction:column;gap:5px;max-height:240px;overflow:auto;padding:7px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}
.dsh-readpilot-history-row{display:flex;align-items:center;gap:7px;padding:2px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-history-row:last-child{border-bottom:0}
.dsh-readpilot-long-list{display:flex;flex-direction:column;gap:4px}
.dsh-readpilot-long-list[data-virtual="true"]{flex:1;min-height:0;display:flex;flex-direction:column}
.dsh-readpilot-long-list-virtual{flex:1;min-height:0;overflow:auto;padding-right:2px}
.dsh-readpilot-long-list-virtual-inner{position:relative;width:100%}
.dsh-readpilot-long-list-virtual-row{position:absolute;top:0;left:0;width:100%}
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
.dsh-readpilot-search-host{display:contents}
.dsh-readpilot-search-more{margin-top:8px}
.dsh-readpilot-search-all{width:min(720px,100%);max-height:min(84vh,720px);display:flex;flex-direction:column;gap:12px;padding:18px 20px;box-sizing:border-box}
.dsh-readpilot-search-all-summary{color:var(--dsw-alias-label-secondary);font-size:11px}
.dsh-readpilot-search-all-list{min-height:0;overflow:auto;max-height:52vh;padding-right:4px}
.dsh-readpilot-search-all-footer{display:flex;justify-content:flex-end;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-search-all-body{display:flex;flex-direction:column;gap:8px;min-height:0}
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
`
