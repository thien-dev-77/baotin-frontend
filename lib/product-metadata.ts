import type { Metadata } from "next";
import DOMPurify from "isomorphic-dompurify";
import { productContentHtml } from "./product-content";
import { DEFAULT_PRODUCT_IMAGE } from "./product-media";
import type { Product } from "./types";

const SITE_NAME = "Bảo Tín";
const DESCRIPTION_MAX_LENGTH = 200;
const WEB_PROTOCOLS = new Set(["http:", "https:"]);

export function storefrontOrigin(requestHeaders: Pick<Headers, "get">, configuredUrl?: string): URL {
  if (configuredUrl?.trim()) {
    const url = new URL(configuredUrl);
    if (!WEB_PROTOCOLS.has(url.protocol) || url.username || url.password) throw new Error("SITE_URL must be a public HTTP(S) website URL.");
    return new URL(url.origin);
  }
  const host = (requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "").split(",")[0].trim();
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim().toLowerCase();
  const protocol = forwardedProtocol || (/^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) ? "http" : "https");
  const url = new URL(`${protocol}://${host}`);
  if (!WEB_PROTOCOLS.has(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Invalid storefront origin.");
  return url;
}

function descriptionText(content: string): string {
  const html = productContentHtml(content).replace(/<br\s*\/?>|<\/(?:p|div|h[1-6]|li|tr|td|th|blockquote)>/gi, " ");
  const body = DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], RETURN_DOM: true });
  return (body.textContent || "").replace(/[•·]/g, " ").replace(/\s+/g, " ").trim();
}

export function productMetadata(product: Product, origin: URL): Metadata {
  const title = `${product.name} | ${SITE_NAME}`;
  const content = [product.shortDescription, product.description].map(value => descriptionText(value || "")).find(Boolean)
    || `${product.name}. Mã sản phẩm: ${product.code}. Xem thông tin và đặt hàng tại ${SITE_NAME}.`;
  const description = content.length > DESCRIPTION_MAX_LENGTH
    ? `${content.slice(0, DESCRIPTION_MAX_LENGTH).replace(/\s+\S*$/, "").trimEnd()}…`
    : content;
  const canonical = new URL(`/products/${encodeURIComponent(product.slug)}`, origin).href;
  const image = [product.image, ...(product.gallery || [])].flatMap(source => {
    if (!source?.trim() || source.trim() === DEFAULT_PRODUCT_IMAGE) return [];
    try {
      const url = new URL(source.trim(), origin);
      return WEB_PROTOCOLS.has(url.protocol) && !url.username && !url.password ? [url.href] : [];
    } catch { return []; }
  })[0];
  const images = image ? [{ url: image, alt: product.name }] : [];

  return {
    metadataBase: origin,
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", locale: "vi_VN", siteName: SITE_NAME, url: canonical, title, description, images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
