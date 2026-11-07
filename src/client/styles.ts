export const CSS = `
.dsh-readpilot-panel{height:100%;min-height:0;display:flex;flex-direction:column;background:transparent;color:var(--dsw-alias-label-primary);font-size:14px}
.dsh-readpilot-library{background:rgba(240,243,248,.5);box-shadow:inset 0 0 0 1px rgba(15,23,42,.05);-webkit-backdrop-filter:blur(4px) saturate(130%);backdrop-filter:blur(4px) saturate(130%)}
body[data-ds-dark-theme] .dsh-readpilot-library{background:rgba(0,0,0,.50);box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)}
.dsh-readpilot-setup{background:rgba(240,243,248,.5)}
body[data-ds-dark-theme] .dsh-readpilot-setup{background:rgba(0,0,0,.50)}
.dsh-readpilot-book{background:var(--dsw-alias-bg-base)}
.dsh-readpilot-panel[data-palette="glass"] .dsh-readpilot-reader{background:var(--reader-bg);-webkit-backdrop-filter:blur(var(--reader-glass-blur,25px)) saturate(150%);backdrop-filter:blur(var(--reader-glass-blur,25px)) saturate(150%)}
.dsh-readpilot-panel{--dsh-readpilot-surface:rgba(240,243,248,.5)}
body[data-ds-dark-theme] .dsh-readpilot-panel{--dsh-readpilot-surface:rgba(0,0,0,.5)}
.dsh-readpilot-panel[data-palette="auto"] .dsh-readpilot-reader,.dsh-readpilot-panel[data-palette="auto"] .dsh-readpilot-visual{background:var(--dsh-readpilot-surface)}
.dsh-readpilot-header{flex:none;display:flex;align-items:center;gap:12px;padding:10px 18px;border-bottom:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dsh-readpilot-header-main{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
.dsh-readpilot-header-actions{display:flex;align-items:center;gap:6px;flex:none}
.dsh-readpilot-header-workspace{flex:none;display:flex;align-items:center;padding-left:12px;border-left:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-workspace-btn{height:28px;padding:0 10px;border-radius:14px;font-size:12px}
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
.dsh-readpilot-book-dialog{width:min(460px,94vw);max-height:100%;display:flex;flex-direction:column;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-overlay);box-shadow:0 24px 60px rgba(0,0,0,.3);overflow:hidden}
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
.dsh-readpilot-status-pill[data-state="ask"]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}
.dsh-readpilot-status-pill[data-state="off"]{opacity:.8}
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
.dsh-readpilot-search-result{content-visibility:auto;contain-intrinsic-size:auto 64px}`
