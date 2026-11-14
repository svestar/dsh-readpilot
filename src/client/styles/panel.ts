export const PANEL_STYLES = `.dsh-readpilot-status-pill[data-state="off"]{opacity:.8}
.dsh-readpilot-icon-action{display:grid;place-items:center;width:26px;height:26px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font:inherit;font-size:14px;cursor:pointer}
.dsh-readpilot-icon-action:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-readpilot-icon-action:disabled{opacity:.45;cursor:default}
.dsh-readpilot-memory-card{padding:11px;gap:8px}
.dsh-readpilot-memory-card-title{font-size:12.5px;font-weight:600}
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
.dsh-readpilot-confirm-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px}
.dsh-readpilot-modal{position:relative;width:min(820px,100%);min-height:min(520px,80vh);max-height:min(86vh,860px);display:flex;flex-direction:column;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:18px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 28px 80px rgba(0,0,0,.34);overflow:hidden;animation:dsh-readpilot-pop-in .16s ease-out}
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
@keyframes dsh-readpilot-pop-in{from{opacity:0;transform:translateY(6px) scale(.985)}to{opacity:1;transform:none}}
@media (max-width:760px){.dsh-readpilot-modal{min-height:min(500px,88vh);max-height:92vh;border-radius:14px}.dsh-readpilot-modal-head{padding:15px 16px 12px}.dsh-readpilot-modal-actions{padding:10px 16px}.dsh-readpilot-modal-body{padding:15px 16px 18px}.dsh-readpilot-modal .dsh-readpilot-long-hint{padding:10px 16px 12px}}
@media (prefers-reduced-motion:reduce){.dsh-readpilot-modal{animation:none}}
@media (prefers-reduced-motion:reduce){.dsh-readpilot-long-note,.dsh-readpilot-pill,.dsh-readpilot-tool-btn,.dsh-readpilot-segment{transition:none}.dsh-readpilot-long-note:hover{transform:none}}
@media (max-width:1100px){.dsh-readpilot-book{grid-template-columns:230px minmax(0,1fr)!important}.dsh-readpilot-book[data-toc="false"]{grid-template-columns:minmax(0,1fr)!important}.dsh-readpilot-chat{position:absolute;top:0;right:0;bottom:0;width:min(420px,92%);z-index:20;box-shadow:-8px 0 30px rgba(0,0,0,.24)}.dsh-readpilot-chat-resizer{display:none}.dsh-readpilot-chat-backdrop{display:block;position:absolute;inset:0;z-index:19;border:0;padding:0;background:rgba(0,0,0,.18)}}
@media (max-width:760px){.dsh-readpilot-book{grid-template-columns:1fr!important}.dsh-readpilot-toc{display:none}.dsh-readpilot-reader{padding:20px 22px 80px}.dsh-readpilot-reader[data-paged="false"] .dsh-readpilot-reader-inner{padding-left:16px;padding-right:16px}.dsh-readpilot-bar{padding:6px 10px;gap:6px}.dsh-readpilot-bar-title{order:3;flex:1 0 100%}.dsh-readpilot-bar-controls{margin-left:auto}.dsh-readpilot-page-frame{padding:18px 16px}.dsh-readpilot-pdf-spread{gap:8px}}
.dsh-readpilot-icon-btn[data-active="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-readpilot-settings-backdrop{position:fixed;inset:0;z-index:80;display:flex;justify-content:flex-end;align-items:flex-start;padding:52px 18px;background:rgba(15,23,42,.18)}
.dsh-readpilot-settings{width:min(360px,100%);max-height:calc(100vh - 104px);overflow:auto;display:flex;flex-direction:column;gap:16px;padding:16px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 18px 48px rgba(15,23,42,.22)}
.dsh-readpilot-settings-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.dsh-readpilot-settings-head h3{margin:0;font-size:14px;font-weight:600}
.dsh-readpilot-settings-section{display:flex;flex-direction:column;gap:8px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-settings-section:first-of-type{padding-top:0;border-top:0}
.dsh-readpilot-settings-label{font-size:11.5px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-secondary)}
.dsh-readpilot-settings-hint{margin:0;font-size:11px;line-height:1.45;color:var(--dsw-alias-label-secondary)}
.dsh-readpilot-settings-font{display:flex;align-items:center;gap:10px}
.dsh-readpilot-settings-font .dsh-readpilot-secondary{min-width:44px}
.dsh-readpilot-settings-value{min-width:48px;text-align:center;font-size:12px;color:var(--dsw-alias-label-secondary)}
.dsh-readpilot-settings-blur{display:flex;align-items:center;gap:8px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.dsh-readpilot-settings-blur input{flex:1;min-width:0}

.dsh-readpilot-sidebar-reader-root{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--reader-bg,var(--dsw-alias-bg-base));color:var(--reader-fg,var(--dsw-alias-label-primary))}
.dsh-readpilot-sidebar-reader-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-bottom:1px solid var(--reader-border,var(--dsw-alias-border-l2))}
.dsh-readpilot-sidebar-reader-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12.5px;font-weight:600}
.dsh-readpilot-sidebar-reader-body{flex:1;min-height:0;display:flex;overflow:hidden;padding:0 4px}
.dsh-readpilot-sidebar-reader{padding:4px 8px;height:100%;overflow:hidden}
.dsh-readpilot-sidebar-reader .dsh-readpilot-page-frame{padding:8px 4px;height:100%}
.dsh-readpilot-sidebar-state{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:6px;height:100%;padding:20px;text-align:center;color:var(--dsw-alias-label-secondary)}
.dsh-readpilot-sidebar-empty-title{font-size:13px;color:var(--dsw-alias-label-primary)}
.dsh-readpilot-sidebar-empty-hint{font-size:11.5px;line-height:1.5}
.dsh-readpilot-tool-card{display:flex;flex-direction:column;gap:6px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);font-size:12px;line-height:1.5}
.dsh-readpilot-tool-card-title{font-weight:600;color:var(--dsw-alias-label-primary)}
.dsh-readpilot-tool-card-pending{color:var(--dsw-alias-label-secondary)}
.dsh-readpilot-tool-card-list{display:flex;flex-direction:column;gap:4px}
.dsh-readpilot-tool-card-row{display:flex;justify-content:space-between;gap:10px;min-width:0}
.dsh-readpilot-tool-card-match{display:flex;align-items:flex-start;gap:8px;min-width:0}
.dsh-readpilot-tool-card-main{min-width:0;flex:1;display:flex;flex-direction:column;gap:2px}
.dsh-readpilot-tool-card-snippet{color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.dsh-readpilot-tool-card-open{flex:none;padding:2px 7px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);font:inherit;font-size:11px;cursor:pointer}
.dsh-readpilot-tool-card-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}
.dsh-readpilot-tool-card-meta{flex:none;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
.dsh-readpilot-tool-card-more{color:var(--dsw-alias-label-tertiary)}
.dsh-readpilot-tool-card-raw{max-height:200px;margin:0;padding:8px 10px;overflow:auto;white-space:pre-wrap;font-size:11.5px;line-height:1.5}
.dsh-readpilot-book-card{content-visibility:auto;contain-intrinsic-size:auto 220px}
.dsh-readpilot-toc-item{content-visibility:auto;contain-intrinsic-size:auto 34px}
.dsh-readpilot-note{content-visibility:auto;contain-intrinsic-size:auto 80px}
.dsh-readpilot-mark-list-virtual{flex:1;min-height:0;overflow:auto;padding-bottom:24px}
.dsh-readpilot-mark-list-virtual-inner{position:relative;width:100%}
.dsh-readpilot-mark-list-virtual-row{position:absolute;top:0;left:0;width:100%}
.dsh-readpilot-mark-section-head{padding-top:8px}
.dsh-readpilot-search-result{content-visibility:auto;contain-intrinsic-size:auto 64px}`
