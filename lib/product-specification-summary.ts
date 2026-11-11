import { PRODUCT_SPECIFICATION_MAX_LENGTH, productContentHtml } from "./product-content";

const BLOCK_ELEMENTS = "p,div,li,h1,h2,h3,h4,h5,h6,blockquote,tr,td,th";

// Called when preparing an admin save in the browser. Imported technical content
// must not depend on the lazy editor mounting or emitting a change event.
export function productSpecificationSummary(content: string): string {
  const document = new DOMParser().parseFromString(productContentHtml(content), "text/html");
  document.querySelectorAll("script,style,template,noscript").forEach(node => node.remove());
  document.querySelectorAll("br").forEach(node => node.replaceWith(document.createTextNode(" ")));
  document.querySelectorAll(BLOCK_ELEMENTS).forEach(node => node.appendChild(document.createTextNode(" ")));
  const text = (document.body.textContent || "").replace(/[\u200b-\u200d\ufeff]/g, "").replace(/\s+/g, " ").trim();
  return Array.from(text).slice(0, PRODUCT_SPECIFICATION_MAX_LENGTH).join("");
}
