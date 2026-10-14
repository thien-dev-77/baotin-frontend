import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { parse } from "postcss";
import config from "../tailwind.config";

const palette = {
  primary: "#171717",
  brand: "#FFC400",
  hover: "#E5B000",
  background: "#FFFFFF",
  section: "#FAFAF7",
  body: "#525252",
  muted: "#737373",
  border: "#E5E5E5",
};

test("Tailwind and global CSS use the exact same brand palette", async () => {
  expect(config.theme?.extend?.colors).toMatchObject({
    primary: palette.primary,
    "primary-dark": palette.primary,
    brand: { DEFAULT: palette.brand, hover: palette.hover },
    section: palette.section,
    text: { strong: palette.primary, secondary: palette.body, muted: palette.muted },
    border: palette.border,
  });
  const stylesheet = parse(await readFile("app/globals.css", "utf8"));
  const tokens = new Map<string, string>();
  stylesheet.walkRules(":root", rule => {
    rule.walkDecls(declaration => { tokens.set(declaration.prop, declaration.value.toUpperCase()); });
  });
  for (const [name, value] of Object.entries({ primary: palette.primary, brand: palette.brand, "brand-hover": palette.hover, background: palette.background, section: palette.section, "text-secondary": palette.body, "text-muted": palette.muted, border: palette.border })) {
    expect(tokens.get(`--color-${name}`)).toBe(value);
  }
  expect(tokens.has("--color-blue")).toBe(false);
});

function luminance(hex: string) {
  const channels = [1, 3, 5].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const linear = channels.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

test("Yellow CTAs and neutral body text meet normal-text contrast", () => {
  for (const [foreground, background] of [[palette.primary, palette.brand], [palette.primary, palette.hover], [palette.body, palette.background], [palette.muted, palette.section], [palette.background, palette.primary]]) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    expect((values[0] + 0.05) / (values[1] + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});
