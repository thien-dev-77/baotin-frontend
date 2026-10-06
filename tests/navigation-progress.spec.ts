import { expect, test, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const base = process.env.QA_BASE_URL || "http://localhost:3010";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) {
  throw new Error("Navigation QA requires a local frontend.");
}

async function holdNavigation(page: Page, matches: (url: URL) => boolean) {
  let release!: () => void;
  let entered!: () => void;
  const blocked = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.headers().rsc !== "1" || !matches(new URL(request.url()))) {
      await route.continue();
      return;
    }
    if (request.headers()["next-router-prefetch"] === "1") {
      await route.abort();
      return;
    }
    entered();
    await gate;
    await route.continue();
  });
  return { blocked, release };
}

async function expectProgress(page: Page) {
  const progress = page.getByRole("progressbar", { name: "Đang tải trang" });
  await expect(progress).toBeVisible();
  expect(
    await progress.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        position: style.position,
        height: style.height,
        color: style.backgroundColor,
        top: element.getBoundingClientRect().top,
      };
    }),
  ).toEqual({
    position: "fixed",
    height: "3px",
    color: "rgb(22, 119, 210)",
    top: 0,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}

for (const width of [1440, 390]) {
  test(`Slow link navigation shows and completes the top bar at ${width}px`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      isMobile: width < 768,
      hasTouch: width < 768,
      reducedMotion: width < 768 ? "reduce" : "no-preference",
    });
    const page = await context.newPage();
    const path = width < 768 ? "/contact" : "/category/khoa";
    const held = await holdNavigation(page, (url) => url.pathname === path);
    try {
      await page.goto(base);
      await expect(page.locator(".bt-product-card").first()).toBeVisible();
      if (width < 768)
        await page
          .getByRole("link", { name: "Liên hệ", exact: true })
          .last()
          .click();
      else
        await page
          .locator(
            'header nav[aria-label="Danh mục sản phẩm"] a[href="/category/khoa"]',
          )
          .click();
      await held.blocked;
      await expectProgress(page);
      if (width < 768)
        await expect(page.getByRole("progressbar")).toHaveCSS(
          "transition-duration",
          "0s",
        );
      await page.screenshot({
        path: `/private/tmp/baotin-navigation-progress-${width}.png`,
      });
      held.release();
      await expect(page).toHaveURL(`${base}${path}`);
      await expect(page.getByRole("progressbar")).toHaveCount(0);
    } finally {
      held.release();
      await context.close();
    }
  });
}

test("Search submission via router.push shows progress until its route commits", async ({
  page,
}) => {
  const held = await holdNavigation(
    page,
    (url) => url.pathname === "/search" && url.searchParams.get("q") === "LED",
  );
  try {
    await page.goto(base);
    const search = page
      .getByRole("combobox", { name: "Tìm sản phẩm, mã hàng, thương hiệu" })
      .first();
    await search.fill("LED");
    await search.press("Enter");
    await held.blocked;
    await expectProgress(page);
    held.release();
    await expect(page).toHaveURL(`${base}/search?q=LED`);
    await expect(page.getByRole("progressbar")).toHaveCount(0);
  } finally {
    held.release();
  }
});

test("Search query changes on the same route also complete progress", async ({
  page,
}) => {
  const held = await holdNavigation(
    page,
    (url) => url.pathname === "/search" && url.searchParams.get("q") === "ray",
  );
  try {
    await page.goto(`${base}/search?q=LED`);
    const search = page
      .getByRole("combobox", { name: "Tìm sản phẩm, mã hàng, thương hiệu" })
      .first();
    await search.fill("ray");
    await search.press("Enter");
    await held.blocked;
    await expectProgress(page);
    held.release();
    await expect(page).toHaveURL(`${base}/search?q=ray`);
    await expect(page.getByRole("progressbar")).toHaveCount(0);
  } finally {
    held.release();
  }
});

test("Hash, external, download and modifier clicks do not start progress", async ({
  page,
}) => {
  await page.goto(base);
  await page
    .getByRole("button", { name: "Ảnh tiếp theo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Chọn slide 2", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => {
    const cases = [
      { id: "hash", href: "#main-content" },
      { id: "same", href: "/" },
      { id: "external", href: "https://example.test/" },
      { id: "email", href: "mailto:test@example.test" },
      { id: "download", href: "/catalog", download: true },
      { id: "new-tab", href: "/contact", target: "_blank" },
      { id: "modifier", href: "/contact" },
      { id: "opt-out", href: "/contact", prevent: true },
    ];
    for (const value of cases) {
      const link = document.createElement("a");
      link.id = `qa-${value.id}`;
      link.href = value.href;
      if (value.download) link.download = "catalog";
      if (value.target) link.target = value.target;
      if (value.prevent) link.dataset.preventProgress = "true";
      link.textContent = value.id;
      link.onclick = (event) => event.preventDefault();
      document.querySelector("body > .contents")!.append(link);
    }
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  for (const id of [
    "hash",
    "same",
    "external",
    "email",
    "download",
    "new-tab",
    "modifier",
    "opt-out",
  ]) {
    await page
      .locator(`#qa-${id}`)
      .click(id === "modifier" ? { modifiers: ["Control"] } : {});
    await page.waitForTimeout(200);
    await expect(page.getByRole("progressbar")).toHaveCount(0);
  }
  await expect(page).toHaveURL(base + "/");
});

test("Swiping a hero slide cancels progress without navigating", async ({
  page,
}) => {
  await page.goto(base);
  const hero = page.locator(".bt-home-hero-link");
  await hero.dispatchEvent("pointerdown", {
    pointerType: "touch",
    clientX: 150,
    clientY: 200,
  });
  await hero.dispatchEvent("pointerup", {
    pointerType: "touch",
    clientX: 40,
    clientY: 200,
  });
  await hero.dispatchEvent("click", { button: 0 });
  await expect(
    page.getByRole("button", { name: "Chọn slide 2", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(200);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page).toHaveURL(base + "/");
});

test("Back and Forward settle without leaving a stuck progress bar", async ({
  page,
}) => {
  await page.goto(base);
  await page
    .locator(
      'header nav[aria-label="Danh mục sản phẩm"] a[href="/category/khoa"]',
    )
    .click();
  await expect(page).toHaveURL(`${base}/category/khoa`);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(base + "/");
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await page.goForward();
  await expect(page).toHaveURL(`${base}/category/khoa`);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
});

test("Admin links share the same navigation indicator", async ({
  page,
  context,
}) => {
  const backend = resolve(process.env.QA_BACKEND_DIR || "../backend");
  const requireBackend = createRequire(resolve(backend, "package.json"));
  const env = requireBackend("dotenv").parse(
    await readFile(resolve(backend, ".env.local"), "utf8"),
  );
  if (new URL(env.DATABASE_URL).hostname !== "127.0.0.1")
    throw new Error("Admin QA must use the local database.");
  const login = await context.request.post(`${base}/api/backend/auth/login`, {
    headers: { Origin: base, "X-BaoTin-Client": "web" },
    data: { identity: "admin@baotin.local", password: env.SEED_PASSWORD },
  });
  expect(login.status()).toBe(201);
  const held = await holdNavigation(
    page,
    (url) => url.pathname === "/admin/pricing",
  );
  try {
    await page.goto(`${base}/admin`);
    await expect(page.locator("#admin-content")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await page
      .getByRole("navigation", { name: "Quản trị nội bộ" })
      .getByRole("link", { name: "Bảng giá", exact: true })
      .click();
    await held.blocked;
    await expectProgress(page);
    held.release();
    await expect(page).toHaveURL(`${base}/admin/pricing`);
    await expect(
      page.getByRole("heading", { name: "Bảng giá B2B", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
  } finally {
    held.release();
  }
});

test("The provider does not hide server-rendered products when JavaScript is disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    for (const path of ["/", "/category/khoa", "/search?q=LED"]) {
      expect((await page.goto(`${base}${path}`))?.status()).toBe(200);
      await expect(page.locator(".bt-product-card").first()).toBeVisible();
    }
    await expect(page.getByRole("progressbar")).toHaveCount(0);
  } finally {
    await context.close();
  }
});
