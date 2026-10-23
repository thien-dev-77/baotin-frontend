import { expect, test } from "@playwright/test";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { catalog, categoryCatalog } from "../lib/catalog";
import { productMetadata, storefrontOrigin } from "../lib/product-metadata";
import { DEFAULT_PRODUCT_IMAGE } from "../lib/product-media";

const frontend = "http://127.0.0.1:3047";
const backend = "http://127.0.0.1:4017";

test("Sharing URLs use the public origin, sanitize rich content and fall back to a gallery photo", () => {
  const headers = new Headers({ host: "internal:3000", "x-forwarded-host": "shop.example.test", "x-forwarded-proto": "https" });
  const origin = storefrontOrigin(headers);
  expect(origin.href).toBe("https://shop.example.test/");
  expect(storefrontOrigin(headers, "https://canonical.example.test/").origin).toBe("https://canonical.example.test");
  expect(() => storefrontOrigin(headers, "file:///private/tmp")).toThrow();
  expect(storefrontOrigin(new Headers({ host: "localhost:3000" })).origin).toBe("http://localhost:3000");
  const product = { ...catalog[0], image: DEFAULT_PRODUCT_IMAGE, gallery: ["javascript:alert(1)", "/media/uploads/gallery.png"],
    shortDescription: "<p>Inox &amp; kính</p><p>Bền đẹp<br>Gọn gàng</p><script>unwanted()</script>" };
  const metadata = productMetadata(product, origin);
  expect(metadata.description).toBe("Inox & kính Bền đẹp Gọn gàng");
  expect(metadata.openGraph).toMatchObject({ images: [{ url: "https://shop.example.test/media/uploads/gallery.png", alt: product.name }] });
  expect(productMetadata({ ...product, shortDescription: "<p>&nbsp;</p>", description: "Mô tả sản phẩm" }, origin).description).toBe("Mô tả sản phẩm");
  expect(productMetadata({ ...product, shortDescription: "", description: "" }, origin).description).toContain(product.code);
  expect(productMetadata({ ...product, shortDescription: "Nội dung ".repeat(100) }, origin).description!.length).toBeLessThanOrEqual(201);
});

test("Production HTML exposes fresh product previews to chat crawlers without JavaScript", async ({ request }) => {
  test.setTimeout(120000);
  const image = await readFile("public/logo-baotin.png");
  let product = { ...catalog[0], slug: "qa-share-product", name: "Vòi bếp kiểm tra chia sẻ", image: "/media/uploads/qa-product.png", gallery: ["/media/uploads/other.png"],
    shortDescription: "<p>Inox SUS304 cao cấp</p><p>Vòi nóng lạnh<br>Dễ lắp đặt</p>" };
  let reads = 0;
  const cookies: (string | undefined)[] = [];
  const api = createServer((incoming, outgoing) => {
    const url = new URL(incoming.url!, backend);
    const json = (value: unknown, status = 200) => {
      outgoing.writeHead(status, { "Content-Type": "application/json" });
      outgoing.end(JSON.stringify(value));
    };
    if (url.pathname.startsWith("/media/")) {
      outgoing.writeHead(200, { "Content-Type": "image/png" }); outgoing.end(image);
    } else if (url.pathname === "/api/catalog/bootstrap") json({ products: [product], categories: categoryCatalog });
    else if (url.pathname === `/api/catalog/product/${product.slug}`) {
      reads++; cookies.push(incoming.headers.cookie); json(product);
    } else if (url.pathname.startsWith("/api/catalog/product/")) json({ message: "Not found" }, 404);
    else if (url.pathname === "/api/content") json({ items: [] });
    else json({ ok: true });
  });
  api.listen(4017, "127.0.0.1");
  await once(api, "listening");
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3047", "-H", "127.0.0.1"], {
    env: { ...process.env, BACKEND_URL: backend, SITE_URL: "", NEXT_DIST_DIR: ".next-share-preview-qa", NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", chunk => { logs += chunk; });
  child.stderr.on("data", chunk => { logs += chunk; });
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error(logs);
      if (await request.get(`${frontend}/api/backend/health`).then(response => response.ok()).catch(() => false)) break;
      if (attempt === 99) throw new Error(`Sharing QA startup timed out: ${logs}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    for (const userAgent of ["TelegramBot (like TwitterBot)", "facebookexternalhit/1.1", "Zalo/1.0", "Mozilla/5.0"]) {
      const before = reads;
      const response = await request.get(`${frontend}/products/${product.slug}?share=1`, { headers: { "User-Agent": userAgent, Cookie: "baotin_session=qa-private" } });
      expect(response.status()).toBe(200);
      const html = await response.text(), head = html.match(/<head>([\s\S]*?)<\/head>/)?.[1] || "";
      expect(head).toContain(`<title>${product.name} | Bảo Tín</title>`);
      expect(head).toContain(`property="og:title" content="${product.name} | Bảo Tín"`);
      expect(head).toContain(`property="og:image" content="${frontend}${product.image}"`);
      expect(head).toContain(`property="og:url" content="${frontend}/products/${product.slug}"`);
      expect(head).toContain('name="description" content="Inox SUS304 cao cấp Vòi nóng lạnh Dễ lắp đặt"');
      expect(head).toContain('name="twitter:card" content="summary_large_image"');
      expect(head).toContain(`name="twitter:image" content="${frontend}${product.image}"`);
      expect(head).not.toContain(`property="og:image" content="${frontend}/media/uploads/other.png"`);
      expect(reads - before).toBe(1);
    }
    expect(cookies.every(cookie => cookie === undefined)).toBe(true);
    const photo = await request.get(`${frontend}${product.image}`, { headers: { "User-Agent": "TelegramBot" } });
    expect(photo.ok()).toBe(true);
    expect(photo.headers()["content-type"]).toContain("image/png");
    expect((await photo.body()).equals(image)).toBe(true);
    product = { ...product, name: "Tên sản phẩm vừa cập nhật", image: "/media/uploads/updated.png" };
    const updated = await request.get(`${frontend}/products/${product.slug}`, { headers: { "x-forwarded-host": "public.example.test", "x-forwarded-proto": "https" } });
    const head = (await updated.text()).match(/<head>([\s\S]*?)<\/head>/)?.[1] || "";
    expect(head).toContain(`property="og:title" content="${product.name} | Bảo Tín"`);
    expect(head).toContain(`property="og:image" content="https://public.example.test${product.image}"`);
    const missing = await request.get(`${frontend}/products/qa-private-or-missing`, { headers: { "User-Agent": "Zalo/1.0" } });
    expect(missing.status()).toBe(404);
    expect(await missing.text()).not.toContain('property="og:image"');
  } finally {
    if (child.exitCode === null) { child.kill("SIGTERM"); await once(child, "exit"); }
    api.closeAllConnections();
    await new Promise<void>(resolve => api.close(() => resolve()));
  }
});
