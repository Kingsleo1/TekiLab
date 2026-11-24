// Keep only a small formatting vocabulary. Never retain URLs, styles or event handlers.
export function sanitizeFindings(html: string): string {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const allowed = new Set(['P','BR','B','STRONG','I','EM','U','UL','OL','LI','H2','H3','BLOCKQUOTE','DIV']);
  const clean = (node: Node): Node => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || '');
    if (!(node instanceof Element)) return document.createTextNode('');
    if (['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','TEMPLATE'].includes(node.tagName)) return document.createTextNode('');
    const result = allowed.has(node.tagName) ? document.createElement(node.tagName.toLowerCase()) : document.createDocumentFragment();
    node.childNodes.forEach(child => result.appendChild(clean(child)));
    return result;
  };
  const output = document.createElement('div');
  parsed.body.childNodes.forEach(child => output.appendChild(clean(child)));
  return output.innerHTML;
}
export function findingsText(html: string): string {
  const el = document.createElement('div');
  el.innerHTML = sanitizeFindings(html).replace(/<br\s*\/?>(?!$)/gi, '\n').replace(/<\/(p|div|li|h2|h3|blockquote)>/gi, '\n');
  return el.textContent?.trim() || '';
}
export function textToFindings(text: string) {
  const el = document.createElement('div'); el.textContent = text;
  return el.innerHTML.replace(/\n/g, '<br>');
}
