export const SHELL_STYLES = `
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
.dsh-readpilot-book-duplicate{display:inline-flex;align-self:flex-start;margin-top:2px;padding:1px 6px;border-radius:5px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-brand-primary);font-size:9px;font-weight:600}
.dsh-readpilot-duplicate-dialog{width:min(680px,100%);max-height:min(82vh,680px);display:flex;flex-direction:column;gap:12px;padding:18px 20px;box-sizing:border-box}
.dsh-readpilot-duplicate-dialog-head h3{margin:0;font-size:15px}
.dsh-readpilot-duplicate-dialog-head p{margin:5px 0 0;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.55}
.dsh-readpilot-duplicate-list{display:flex;flex-direction:column;gap:10px;min-height:0;overflow:auto}
.dsh-readpilot-duplicate-group{display:flex;flex-direction:column;gap:6px}
.dsh-readpilot-duplicate-group-head{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--dsw-alias-label-secondary);font-size:10px;font-weight:600}
.dsh-readpilot-duplicate-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:11px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-1)}
.dsh-readpilot-duplicate-main{min-width:0}
.dsh-readpilot-duplicate-name{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600}
.dsh-readpilot-duplicate-role{padding:1px 5px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:9px;font-weight:500}
.dsh-readpilot-duplicate-path{margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:10px}
.dsh-readpilot-duplicate-actions{display:flex;gap:6px}
.dsh-readpilot-duplicate-footer{display:flex;justify-content:flex-end;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l2)}
@media (max-width:640px){.dsh-readpilot-duplicate-row{grid-template-columns:minmax(0,1fr)}.dsh-readpilot-duplicate-actions{justify-content:flex-start}}
.dsh-readpilot-library-head h2{margin:0;font-size:15px;font-weight:600}
.dsh-readpilot-primary{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 14px;border:1px solid transparent;border-radius:8px;background:var(--reader-fg,var(--dsw-alias-label-primary));color:var(--reader-bg,var(--dsw-alias-bg-base));font:inherit;font-weight:600;cursor:pointer}
.dsh-readpilot-primary:disabled{opacity:.5;cursor:default}
.dsh-readpilot-setup-actions{display:flex;gap:8px}
.dsh-readpilot-secondary{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer}
.dsh-readpilot-secondary:hover{background:var(--dsw-alias-bg-layer-2)}
.dsh-readpilot-secondary:disabled{opacity:.45;cursor:default}
.dsh-readpilot-panel{--readpilot-on-accent:var(--dsw-alias-label-primary-inverted,#fff)}
.dsh-readpilot-panel[data-palette="light"],.dsh-readpilot-panel[data-palette="sepia"],.dsh-readpilot-panel[data-palette="green"]{--readpilot-on-accent:#fff}
.dsh-readpilot-panel[data-palette="dark"],.dsh-readpilot-panel[data-palette="night"]{--readpilot-on-accent:#111}
.dsh-readpilot-primary,.dsh-readpilot-chat-send{color:var(--readpilot-on-accent,var(--dsw-alias-label-primary-inverted,#fff))}
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
.dsh-readpilot-section-toggle{display:flex;align-items:center;gap:6px;width:100%;padding:0;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;text-align:left}
.dsh-readpilot-section-toggle h4{margin:0;color:inherit;font:inherit;font-weight:650}
.dsh-readpilot-section-chevron{flex:none;width:12px;color:var(--dsw-alias-label-secondary);font-size:10px;line-height:1;text-align:center}
.dsh-readpilot-section-toggle .dsh-readpilot-section-count{margin-left:auto}
.dsh-readpilot-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:12px}
.dsh-readpilot-library-scroll[data-virtual="true"]{display:flex;flex-direction:column;overflow:hidden}
.dsh-readpilot-library-scroll[data-virtual="true"] .dsh-readpilot-all-section{display:flex;flex-direction:column;flex:1;min-height:0}
.dsh-readpilot-grid-virtual{flex:1;min-height:0;overflow:auto;padding-right:4px}
.dsh-readpilot-grid-virtual-inner{position:relative;width:100%}
.dsh-readpilot-grid-row{position:absolute;top:0;left:0;width:100%}
.dsh-readpilot-grid-virtual .dsh-readpilot-book-card{content-visibility:visible;contain-intrinsic-size:none}
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
.dsh-readpilot-setup-card{width:min(620px,100%);padding:26px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 12px 40px rgba(0,0,0,.10)}
.dsh-readpilot-backup{display:flex;flex-direction:column;gap:10px;margin-top:20px;padding-top:18px;border-top:1px solid var(--dsw-alias-border-l2)}
.dsh-readpilot-backup h3{margin:0;font-size:14px}
.dsh-readpilot-backup-hint{margin:0!important;font-size:11px;line-height:1.6!important}
.dsh-readpilot-backup-actions{display:flex;gap:8px}
.dsh-readpilot-backup-field{display:flex;flex-direction:column;gap:5px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.dsh-readpilot-backup-field>input{width:100%;box-sizing:border-box;height:34px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
.dsh-readpilot-backup-field>input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-readpilot-backup-field .dsh-readpilot-path-row{margin:0}
.dsh-readpilot-backup-warning{margin:0!important;padding:8px 10px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-warning-primary) 30%,transparent);border-radius:7px;color:var(--dsw-alias-state-warning-primary);font-size:11px;line-height:1.5}
.dsh-readpilot-backup-result{margin:0!important;color:var(--dsw-alias-state-success-primary);font-size:11px;line-height:1.55;word-break:break-word}
.dsh-readpilot-backup-error{margin:0!important;color:var(--dsw-alias-state-error-primary);font-size:11px;line-height:1.55;word-break:break-word}
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
.dsh-readpilot-toc[data-virtual="true"]{display:flex;flex-direction:column;overflow:hidden;padding-bottom:0}
.dsh-readpilot-toc[data-virtual="true"] .dsh-readpilot-toc-title{flex:none}
.dsh-readpilot-toc-virtual{flex:1;min-height:0;overflow:auto;padding-bottom:40px}
.dsh-readpilot-toc[data-virtual="true"] .dsh-readpilot-toc-item{content-visibility:visible;contain-intrinsic-size:none}
.dsh-readpilot-toc-item{display:block;width:100%;padding:7px 8px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);text-align:left;font:inherit;line-height:1.45;cursor:pointer}
.dsh-readpilot-toc-item:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-readpilot-toc-item[data-active="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
.dsh-readpilot-toc-item:disabled{opacity:.45;cursor:default}
`
