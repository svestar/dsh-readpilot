export const READER_STYLES = `.dsh-readpilot-search-hint[data-error="true"]{color:var(--dsw-alias-state-error-primary)}
.dsh-readpilot-reader{min-height:0;overflow:auto;padding:28px 56px 90px;background:var(--reader-bg,var(--dsw-alias-bg-base));color:var(--reader-fg,var(--dsw-alias-label-primary))}
.dsh-readpilot-visual{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;gap:8px;overflow:auto;padding:12px 20px 50px;background:var(--reader-bg,var(--dsw-alias-bg-base))}
.dsh-readpilot-visual-bar{flex:none;display:flex;align-items:center;gap:8px;justify-content:center;flex-wrap:wrap;padding:2px 0}
.dsh-readpilot-page-input{width:56px;height:28px;padding:0 6px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;text-align:center}
.dsh-readpilot-page-total{color:var(--dsw-alias-label-secondary);font-size:12px}
.dsh-readpilot-epub-bar{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px}
.dsh-readpilot-epub-title{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}
.dsh-readpilot-palette-select{height:28px;max-width:112px;padding:0 6px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.dsh-readpilot-blur-control{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:11px}
.dsh-readpilot-blur-control input[type="range"]{width:84px;accent-color:var(--dsw-alias-brand-primary)}
.dsh-readpilot-blur-value{min-width:34px;text-align:right;font-variant-numeric:tabular-nums}
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
.dsh-readpilot-reader[data-paged="false"] .dsh-readpilot-reader-inner{padding-left:28px;padding-right:28px}
.dsh-readpilot-main{display:flex;flex-direction:column;min-width:0;min-height:0}
.dsh-readpilot-main>.dsh-readpilot-reader{flex:1;min-height:0}
.dsh-readpilot-bar{flex:none;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 14px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.dsh-readpilot-help{width:min(760px,100%);max-height:min(84vh,720px);display:flex;flex-direction:column;gap:12px;padding:18px 20px;box-sizing:border-box}
.dsh-readpilot-help-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-help-head h3{margin:0;font-size:15px}
.dsh-readpilot-help-head p{margin:5px 0 0;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.5}
.dsh-readpilot-help-layout{display:grid;grid-template-columns:170px minmax(0,1fr);gap:14px;min-height:0;flex:1}
.dsh-readpilot-help-nav{display:flex;flex-direction:column;gap:3px;overflow:auto;padding-right:4px}
.dsh-readpilot-help-topic{width:100%;padding:7px 9px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);text-align:left;font:inherit;font-size:11px;cursor:pointer}
.dsh-readpilot-help-topic:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-readpilot-help-topic[data-active="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
.dsh-readpilot-help-body{min-width:0;overflow:auto;padding-right:4px}
.dsh-readpilot-help-body h4{margin:0 0 8px;font-size:14px}
.dsh-readpilot-help-body p{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.75;white-space:pre-line}
.dsh-readpilot-help-footer{display:flex;align-items:center;gap:12px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-help-footer a{color:var(--dsw-alias-brand-primary);font-size:11px}
.dsh-readpilot-help-footer button{margin-left:auto}
.dsh-readpilot-bar-group{display:flex;align-items:center;gap:4px;min-width:0;flex-wrap:wrap}
.dsh-readpilot-bar button.dsh-readpilot-secondary{background:var(--dsw-alias-bg-layer-1)!important;color:var(--dsw-alias-label-primary)!important;border-color:var(--dsw-alias-border-l2)!important}
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
.dsh-readpilot-action-history{width:min(660px,100%);max-height:min(82vh,680px);display:flex;flex-direction:column;gap:12px;padding:18px 20px;box-sizing:border-box}
.dsh-readpilot-action-history-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding-bottom:10px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-action-history-heading{min-width:0}
.dsh-readpilot-action-history-head h3{margin:0;font-size:15px;font-weight:650}
.dsh-readpilot-action-history-head p{margin:5px 0 0;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.55}
.dsh-readpilot-action-history-refresh{flex:none}
.dsh-readpilot-action-history-list{display:flex;flex-direction:column;gap:8px;min-height:0;overflow:auto;padding-right:4px}
.dsh-readpilot-action-history-empty{padding:32px 12px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px}
.dsh-readpilot-action-history-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:11px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
.dsh-readpilot-action-history-row[data-undone="true"]{opacity:.58}
.dsh-readpilot-action-history-main{min-width:0}
.dsh-readpilot-action-history-title{display:flex;align-items:baseline;gap:8px;min-width:0}
.dsh-readpilot-action-history-kind{font-size:11px;font-weight:650}
.dsh-readpilot-action-history-time{margin-left:auto;color:var(--dsw-alias-label-secondary);font-size:10px;white-space:nowrap}
.dsh-readpilot-action-history-summary{margin-top:4px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.5;word-break:break-word}
.dsh-readpilot-action-history-undo{flex:none;min-width:54px}
.dsh-readpilot-action-history-done{flex:none;color:var(--dsw-alias-label-secondary);font-size:10px;white-space:nowrap}
.dsh-readpilot-action-history-footer{display:flex;justify-content:flex-end;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l2)}
@media (max-width:640px){.dsh-readpilot-action-history-row{grid-template-columns:minmax(0,1fr)}.dsh-readpilot-action-history-undo{justify-self:start}.dsh-readpilot-action-history-head{flex-direction:column;gap:8px}.dsh-readpilot-action-history-refresh{align-self:flex-end}}
.dsh-readpilot-primary,.dsh-readpilot-chat-send{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-inverted,#fff)}
.dsh-readpilot-panel .dsh-readpilot-primary,.dsh-readpilot-panel .dsh-readpilot-chat-send{background:var(--reader-fg,var(--dsw-alias-label-primary));color:var(--readpilot-on-accent,var(--dsw-alias-label-primary-inverted,#fff))}
.dsh-readpilot-preset-picker{position:relative}

.dsh-readpilot-preset-menu{position:absolute;left:0;top:calc(100% + 6px);z-index:3;display:flex;flex-direction:column;min-width:180px;max-height:240px;overflow:auto;padding:4px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 8px 24px rgba(0,0,0,.2)}
.dsh-readpilot-preset-menu button{display:block;width:100%;padding:6px 8px;border:0;border-radius:5px;background:transparent;color:inherit;text-align:left;font:inherit;font-size:12px;cursor:pointer}
.dsh-readpilot-preset-menu button:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-readpilot-preset-menu .dsh-readpilot-preset-manage{border-top:1px solid var(--dsw-alias-border-l2);border-radius:0 0 5px 5px;color:var(--dsw-alias-label-secondary)}
.dsh-readpilot-preset-empty{padding:6px 8px;color:var(--dsw-alias-label-secondary);font-size:12px}
.dsh-readpilot-preset-manager{width:min(820px,100%);max-height:min(86vh,720px);display:flex;flex-direction:column;gap:10px}
.dsh-readpilot-preset-header{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dsh-readpilot-preset-header>div{display:flex;align-items:center;gap:6px;min-width:0;flex:1}
.dsh-readpilot-preset-header h3{margin:0;font-size:14px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-readpilot-preset-count{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:18px;margin-left:6px;padding:0 6px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10px}
.dsh-readpilot-preset-columns{display:flex;gap:16px;min-height:0;flex:1}
.dsh-readpilot-preset-list{display:flex;flex-direction:column;gap:5px;width:230px;flex:none;overflow:auto;padding-right:4px}
.dsh-readpilot-preset-item{position:relative;display:flex;flex-direction:column;gap:3px;padding:9px 10px;border:1px solid transparent;border-radius:8px;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer}
.dsh-readpilot-preset-item:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-readpilot-preset-item[data-active="true"]{border-color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 7%,var(--dsw-alias-bg-layer-1))}
.dsh-readpilot-preset-item-title{font-size:12px;font-weight:600;line-height:1.35;padding-right:38px}
.dsh-readpilot-preset-item-preview{color:var(--dsw-alias-label-secondary);font-size:10px;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-readpilot-preset-badge{display:inline-flex;align-items:center;height:16px;padding:0 5px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:9px;font-weight:500;line-height:1}
.dsh-readpilot-preset-item .dsh-readpilot-preset-badge{position:absolute;right:8px;top:8px}
.dsh-readpilot-preset-editor{display:flex;flex-direction:column;gap:8px;flex:1;min-width:0;min-height:0;overflow:auto;padding-right:4px}
.dsh-readpilot-preset-editor-head{display:flex;align-items:center;gap:8px;min-height:20px}
.dsh-readpilot-preset-editor-title{color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-readpilot-preset-field{display:flex;flex-direction:column;gap:4px;color:var(--dsw-alias-label-secondary);font-size:11px}
.dsh-readpilot-preset-field input,.dsh-readpilot-preset-field textarea{width:100%;box-sizing:border-box;padding:7px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
.dsh-readpilot-preset-field input:focus,.dsh-readpilot-preset-field textarea:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
.dsh-readpilot-preset-field textarea{min-height:150px;resize:vertical;line-height:1.5}
.dsh-readpilot-preset-variables{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
.dsh-readpilot-preset-variables .dsh-readpilot-preset-hint{margin-right:2px}
.dsh-readpilot-preset-chip{padding:2px 6px;border:1px solid var(--dsw-alias-border-l2);border-radius:5px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font:inherit;font-size:10px;cursor:pointer}
.dsh-readpilot-preset-chip:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}
.dsh-readpilot-preset-hint{color:var(--dsw-alias-label-secondary);font-size:10px;line-height:1.5}
.dsh-readpilot-preset-preview{display:flex;flex-direction:column;gap:4px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 65%,transparent)}
.dsh-readpilot-preset-preview-title{color:var(--dsw-alias-label-secondary);font-size:10px;font-weight:600}
.dsh-readpilot-preset-preview pre{margin:0;max-height:110px;overflow:auto;color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;line-height:1.5;white-space:pre-wrap;word-break:break-word}
.dsh-readpilot-preset-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.dsh-readpilot-preset-footer{display:flex;justify-content:flex-end;padding-top:8px;border-top:1px solid var(--dsw-alias-border-l2)}
@media (max-width:640px){.dsh-readpilot-preset-columns{flex-direction:column}.dsh-readpilot-preset-list{width:auto;max-height:150px;flex:none}}
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
.dsh-readpilot-reader h1,.dsh-readpilot-reader h2{margin:1.6em 0 .6em;line-height:1.4}.dsh-readpilot-reader h1{font-size:1.3em}.dsh-readpilot-reader h2{font-size:1.18em}.dsh-readpilot-reader h3{margin:1.6em 0 .6em;font-size:1.08em;line-height:1.4}.dsh-readpilot-task{align-items:center}.dsh-readpilot-task input{flex:none;margin:0}.dsh-readpilot-inline-image{display:inline-block;max-width:100%;height:auto;vertical-align:middle;border-radius:4px}
.dsh-readpilot-reader blockquote{margin:1em 0;padding:2px 0 2px 14px;border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
.dsh-readpilot-reader pre{margin:1em 0;padding:12px 14px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);overflow:auto;font-size:12.5px;line-height:1.6}
.dsh-readpilot-reader code{padding:1px 4px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);font-size:.92em}
.dsh-readpilot-reader pre code{padding:0;background:transparent}
.dsh-readpilot-reader a{color:var(--dsw-alias-brand-primary);text-decoration:underline;text-underline-offset:2px}
.dsh-readpilot-li{display:flex;gap:8px;margin:0 0 .5em;white-space:pre-wrap}
.dsh-readpilot-li-marker{color:var(--dsw-alias-label-secondary);flex:none;min-width:1.1em}
.dsh-readpilot-flash{background:var(--dsw-alias-bg-layer-2);border-radius:4px;transition:background .2s ease}
.dsh-readpilot-selection{position:fixed;z-index:1000;display:flex;gap:4px;padding:5px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-overlay);box-shadow:0 10px 34px rgba(0,0,0,.24)}
.dsh-readpilot-selection button{height:26px;padding:0 9px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.dsh-readpilot-selection button:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-readpilot-selection .dsh-readpilot-color-btn{width:18px;height:18px;padding:0;border-radius:50%}
.dsh-readpilot-note-dialog{width:min(520px,100%);max-height:min(82vh,620px);display:flex;flex-direction:column;padding:18px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-overlay);box-shadow:0 18px 50px rgba(0,0,0,.28)}
.dsh-readpilot-note-dialog h3{margin:0 0 10px;font-size:14px;font-weight:650}
.dsh-readpilot-note-dialog-quote{flex:none;max-height:140px;overflow:auto;margin-bottom:10px;padding:8px 10px;border-left:3px solid var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word}
.dsh-readpilot-note-dialog textarea{display:block;width:100%;box-sizing:border-box;min-height:88px;max-height:220px;padding:8px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.6;resize:vertical}
.dsh-readpilot-note-dialog textarea:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-readpilot-note-dialog-error{margin-top:8px;padding:7px 9px;border-radius:7px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.55}
.dsh-readpilot-note-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
.dsh-readpilot-banner{flex:none;padding:8px 18px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-warn-primary);font-size:12.5px;line-height:1.5}
.dsh-readpilot-error{flex:none;padding:8px 18px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-state-error-primary);font-size:12.5px;line-height:1.5}
.dsh-readpilot-reflow-warning{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 18px;border-bottom:1px solid var(--dsw-alias-border-l2);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 8%,var(--dsw-alias-bg-layer-2));color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:1.5}
.dsh-readpilot-reflow-warning-close{border:0;background:none;color:inherit;font-size:16px;line-height:1;cursor:pointer;padding:0 2px;opacity:.7}
.dsh-readpilot-reflow-warning-close:hover{opacity:1}
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
.dsh-readpilot-status-pill[data-state="ask"]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}`
