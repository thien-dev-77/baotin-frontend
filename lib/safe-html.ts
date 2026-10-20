import DOMPurify from "isomorphic-dompurify";

type HtmlLinkOptions = { autoLink?: boolean; linksInNewTab?: boolean };
const allowedTags = ["p", "br", "strong", "em", "u", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "a", "table", "thead", "tbody", "tr", "th", "td"];
const allowedAttributes = ["href", "target", "rel", "class", "colspan", "rowspan"];
const webAddressPattern = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const trailingPunctuation = /[.,!?;:，。！？；：…“”‘’]+$/;
const bracketPairs = [["(", ")"], ["[", "]"], ["{", "}"]] as const;

function trimAddress(value: string) {
  let address = value.replace(trailingPunctuation, "");
  for (const [open, close] of bracketPairs) {
    while (address.endsWith(close) && address.split(close).length > address.split(open).length) address = address.slice(0, -1).replace(trailingPunctuation, "");
  }
  return address;
}

function linkText(node: Node) {
  // Visit text only: preserve existing link labels, markup and attributes.
  if (node.nodeName === "A") return;
  if (node.nodeName !== "#text") {
    Array.from(node.childNodes).forEach(linkText);
    return;
  }
  const content = node.textContent || "";
  const document = node.ownerDocument!;
  const fragment = document.createDocumentFragment();
  let offset = 0;
  for (const match of Array.from(content.matchAll(webAddressPattern))) {
    const address = trimAddress(match[0]);
    let url: URL;
    try { url = new URL(/^www\./i.test(address) ? `https://${address}` : address); }
    catch { continue; }
    if (!["http:", "https:"].includes(url.protocol)) continue;
    fragment.appendChild(document.createTextNode(content.slice(offset, match.index)));
    const anchor = document.createElement("a");
    anchor.setAttribute("href", url.href);
    anchor.textContent = address;
    fragment.appendChild(anchor);
    offset = match.index + address.length;
  }
  if (!offset) return;
  fragment.appendChild(document.createTextNode(content.slice(offset)));
  node.parentNode?.replaceChild(fragment, node);
}

export function safeHtml(html: string, { autoLink = false, linksInNewTab = false }: HtmlLinkOptions = {}) {
  const config = { ALLOWED_TAGS: allowedTags, ALLOWED_ATTR: allowedAttributes, ALLOW_DATA_ATTR: false };
  if (!autoLink && !linksInNewTab) return DOMPurify.sanitize(html, config);
  const body = DOMPurify.sanitize(html, { ...config, RETURN_DOM: true }) as HTMLElement;
  if (autoLink) linkText(body);
  if (linksInNewTab) for (const anchor of Array.from(body.querySelectorAll("a[href]"))) {
    anchor.setAttribute("target", "_blank");
    anchor.setAttribute("rel", "noopener noreferrer");
  }
  return body.innerHTML;
}
