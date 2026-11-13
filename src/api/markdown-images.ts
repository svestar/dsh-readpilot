/** Rewrite relative Markdown image destinations while leaving URLs and absolute paths alone. */
export function rewriteInlineImages(text: string, resolve: (src: string) => string): string {
  return text.replace(/(!\[[^\]]*\]\(\s*)([^)\s]+)([^)]*\))/g, (_match, prefix: string, src: string, suffix: string) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/|#)/i.test(src)) return `${prefix}${src}${suffix}`
    return `${prefix}${resolve(src)}${suffix}`
  })
}
