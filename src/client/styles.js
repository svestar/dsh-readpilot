export const CSS = `
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
.dsh-reader-primary{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 14px;border:1px solid transparent;border-radius:8px;background:var(--reader-fg,var(--dsw-alias-label-primary));color:var(--reader-bg,var(--dsw-alias-bg-base));font:inherit;font-weight:600;cursor:pointer}
.dsh-reader-primary:disabled{opacity:.5;cursor:default}
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
.dsh-reader-library{flex:1;min-height:0;display:grid;grid-template-columns:190px minmax(0,1fr);overflow:hidden}
.dsh-reader-library-side{min-height:0;overflow:auto;padding:16px 10px 28px;border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1)}
.dsh-reader-library-side-title{padding:10px 8px 5px;color:var(--dsw-alias-label-secondary);font-size:11px;font-weight:600;letter-spacing:.04em}
.dsh-reader-library-category{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:7px 9px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;text-align:left;cursor:pointer}
.dsh-reader-library-category:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dsh-reader-library-category[data-active="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-weight:600}
.dsh-reader-library-count{color:var(--dsw-alias-label-secondary);font-size:10px;font-weight:400}
.dsh-reader-library-main{min-height:0;display:flex;flex-direction:column;padding:16px 22px 30px;overflow:hidden}
.dsh-reader-library-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px}
.dsh-reader-library-head h2{margin:0;font-size:16px;font-weight:650}
.dsh-reader-library-subtitle{margin-top:3px;color:var(--dsw-alias-label-secondary);font-size:11px}
.dsh-reader-library-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:14px}
.dsh-reader-library-search{flex:1;min-width:120px;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
.dsh-reader-library-search:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.dsh-reader-library-scroll{flex:1;min-height:0;overflow:auto;padding-right:4px}
.dsh-reader-section-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:4px 0 10px}
.dsh-reader-section-head h3{margin:0;font-size:13px;font-weight:650}
.dsh-reader-section-head span{color:var(--dsw-alias-label-secondary);font-size:11px}
.dsh-reader-recent-section{margin-bottom:20px}
.dsh-reader-recent-row{display:flex;gap:10px;overflow-x:auto;padding:2px 2px 8px}
.dsh-reader-recent-card{flex:none;display:flex;align-items:center;gap:10px;width:230px;padding:9px;border:1px solid var(--dsw-alias-border-l2);border-radius:11px;background:var(--dsw-alias-bg-layer-1);color:inherit;text-align:left;font:inherit;cursor:pointer}
.dsh-reader-recent-card:hover{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2)}
.dsh-reader-recent-cover{flex:none;display:flex;align-items:center;justify-content:center;width:38px;height:52px;border-radius:6px;background:linear-gradient(135deg,#475569,#1e293b);color:#fff;font-size:9px;font-weight:700;letter-spacing:.06em}
.dsh-reader-recent-cover[data-format="md"]{background:linear-gradient(135deg,#0f766e,#134e4a)}
.dsh-reader-recent-cover[data-format="epub"]{background:linear-gradient(135deg,#7c3aed,#4c1d95)}
.dsh-reader-recent-cover[data-format="pdf"]{background:linear-gradient(135deg,#b45309,#7c2d12)}
.dsh-reader-recent-info{min-width:0;display:flex;flex-direction:column;gap:3px}
.dsh-reader-recent-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600}
.dsh-reader-recent-meta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:10px}
.dsh-reader-recent-tags{display:flex;gap:4px;overflow:hidden}
.dsh-reader-recent-tags span{padding:1px 5px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:9px;white-space:nowrap}
.dsh-reader-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:12px}
.dsh-reader-book-card{position:relative;min-width:0}
.dsh-reader-book-open{display:block;width:100%;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);color:inherit;text-align:left;font:inherit;cursor:pointer;overflow:hidden;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease}
.dsh-reader-book-open:hover{transform:translateY(-2px);border-color:var(--dsw-alias-brand-primary);box-shadow:0 8px 22px rgba(0,0,0,.16)}
.dsh-reader-book-cover{position:relative;display:flex;flex-direction:column;justify-content:space-between;height:104px;padding:10px;background:linear-gradient(135deg,#64748b,#334155);color:#fff}
.dsh-reader-book-card[data-format="md"] .dsh-reader-book-cover{background:linear-gradient(135deg,#0f766e,#134e4a)}
.dsh-reader-book-card[data-format="epub"] .dsh-reader-book-cover{background:linear-gradient(135deg,#7c3aed,#4c1d95)}
.dsh-reader-book-card[data-format="pdf"] .dsh-reader-book-cover{background:linear-gradient(135deg,#b45309,#7c2d12)}
.dsh-reader-book-format{align-self:flex-start;padding:2px 6px;border-radius:5px;background:rgba(255,255,255,.18);font-size:9px;font-weight:700;letter-spacing:.08em}
.dsh-reader-book-cover-title{display:-webkit-box;overflow:hidden;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:13px;font-weight:650;line-height:1.35;text-shadow:0 1px 3px rgba(0,0,0,.25)}
.dsh-reader-book-info{padding:9px 10px 10px}
.dsh-reader-book-title{display:-webkit-box;overflow:hidden;-webkit-line-clamp:2;-webkit-box-orient:vertical;font-size:12px;font-weight:600;line-height:1.4;word-break:break-word}
.dsh-reader-book-meta{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:5px;color:var(--dsw-alias-label-secondary);font-size:10px}
.dsh-reader-book-meta span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:65%}
.dsh-reader-book-reading{margin-top:6px;color:var(--dsw-alias-brand-primary);font-size:10px;font-weight:600}
.dsh-reader-book-tags{display:flex;gap:4px;margin-top:6px;overflow:hidden}
.dsh-reader-book-tag{max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:1px 5px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:9px}
.dsh-reader-book-tag-edit{position:absolute;top:7px;right:7px;padding:2px 6px;border:0;border-radius:5px;background:rgba(0,0,0,.35);color:#fff;font:inherit;font-size:9px;cursor:pointer;opacity:0;transition:opacity .14s ease}
.dsh-reader-book-card:hover .dsh-reader-book-tag-edit,.dsh-reader-book-tag-edit:focus{opacity:1}
.dsh-reader-library-empty{padding:36px 12px;color:var(--dsw-alias-label-secondary);font-size:12px;text-align:center}
.dsh-reader-tag-dialog{width:min(480px,94vw)}
.dsh-reader-tag-book{margin-bottom:10px;color:var(--dsw-alias-label-secondary);font-size:12px}
.dsh-reader-tag-list{display:flex;flex-wrap:wrap;gap:6px;min-height:28px;margin-bottom:10px}
.dsh-reader-tag-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 4px 3px 8px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:11px}
.dsh-reader-tag-remove{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer}
.dsh-reader-tag-remove:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-state-error-primary)}
.dsh-reader-tag-input-row{display:flex;gap:8px}
.dsh-reader-tag-input-row input{flex:1;min-width:0;height:32px;padding:0 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
.dsh-reader-tag-suggestions{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px;max-height:92px;overflow:auto}
.dsh-reader-tag-suggestion{padding:3px 7px;border:1px dashed var(--dsw-alias-border-l2);border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:10px;cursor:pointer}
.dsh-reader-tag-suggestion:hover{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}
@media (max-width:760px){.dsh-reader-library{grid-template-columns:1fr;overflow:auto}.dsh-reader-library-side{display:flex;gap:4px;overflow-x:auto;padding:8px 10px;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l2)}.dsh-reader-library-side-title{display:none}.dsh-reader-library-category{width:auto;flex:none;white-space:nowrap}.dsh-reader-library-main{overflow:visible;padding:14px 14px 30px}.dsh-reader-library-scroll{overflow:visible}.dsh-reader-book-tag-edit{opacity:1}}
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
.dsh-reader-chat-send{height:28px;padding:0 12px;border:0;border-radius:7px;background:var(--reader-fg,var(--dsw-alias-label-primary));color:var(--reader-bg,var(--dsw-alias-bg-base));font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.dsh-reader-chat-send:disabled{opacity:.5;cursor:default}
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
.dsh-reader-epub-bar{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:8px}
.dsh-reader-epub-title{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}
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
`
