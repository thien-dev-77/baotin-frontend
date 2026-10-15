export const PRODUCT_SPECIFICATION_MAX_LENGTH = 500;
export const PRODUCT_TECHNICAL_DETAILS_MAX_LENGTH = 10000;

// Imported product content can be plain text; preserve its line breaks in the editor and storefront.
export function productContentHtml(value: string): string {
  if (!value || /<\/?(?:p|br|div|span|strong|em|u|h[1-6]|ul|ol|li|blockquote|a|figure|table|thead|tbody|tr|th|td)\b[^>]*>/i.test(value)) return value;
  const escaped = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\r\n?|\n/g, "<br>")}</p>`;
}
