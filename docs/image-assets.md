# Image assets

Images now live in `media/images/` in the separate backend repository.
Next.js rewrites `/images/*` to the backend; the table below uses paths
relative to that image directory. The former `frontend/public/images/` paths
describe the static-preview layout, not the current frontend repository.
Sources, dimensions and production-verification caveats below are unchanged.

## Current preview

Hero images were 176-464px wide; category images were about 106-108px wide,
and the LED product image was 66px wide. These screenshot crops were being
enlarged in the UI. The following original photos replace those crops without
upscaling or artificial sharpening. Files are local so rendering does not depend
on external image hosts.

| File under backend `media/images/` | Original dimensions | Source |
| --- | --- | --- |
| `hero/kitchen-lighting-hd.jpg` | 3750 x 888 | [Armacost: under-cabinet installation](https://www.armacostlighting.com/blogs/news/how-to-under-cabinet-led), lifestyle kitchen photo |
| `hero/cabinet-lighting-hd.jpg` | 3750 x 1250 | [Armacost: strip light applications](https://www.armacostlighting.com/blogs/news/led-strip-light-applications), toe-kick photo |
| `hero/wood-kitchen-hd.jpg` | 3750 x 1250 | [Armacost: strip light applications](https://www.armacostlighting.com/blogs/news/led-strip-light-applications), above-cabinet photo |
| `catalog/kitchen-storage-hd.jpg` | 1200 x 1200 | [Hafele KASON basket](https://hafelehome.com.vn/products/phu-kien-ro-xoong-noi-hafele-kason), application photo |
| `catalog/pull-out-basket-hd.jpg` | 1200 x 1200 | [Hafele KASON basket](https://hafelehome.com.vn/products/phu-kien-ro-xoong-noi-hafele-kason), product photo |
| `catalog/drawer-undermount-hd.jpg` | 1200 x 1200 | [Hafele EPC EVO undermount runners](https://hafelehome.com.vn/products/ray-truot-am-hafele-epc-evo-tich-hop-giam-chan-50-kg) |
| `catalog/hinge-hd.jpg` | 1200 x 1200 | [Hafele METALLA hinge](https://hafelehome.com.vn/products/ban-le-hafele-metalla-sm-110deg-tieu-chuan-dong-giam-chan-lap-trum-ngoai) |
| `catalog/handle-brass-hd.jpg` | 1400 x 1400 | [IKEA BAGGANAS brass handles](https://www.ikea.com/gb/en/p/bagganaes-handle-brass-colour-00338407/), PE747828 product photo |
| `catalog/handle-installed-hd.jpg` | 1400 x 1400 | [IKEA BAGGANAS brass handles](https://www.ikea.com/gb/en/p/bagganaes-handle-brass-colour-00338407/), PE719900 application photo |
| `catalog/wardrobe-hd.jpg` | 1200 x 1200 | [Hafele oval wardrobe rail](https://hafelehome.com.vn/products/thanh-treo-quan-ao-hafele-oval) |
| `catalog/hardware-hd.jpg` | 1200 x 1200 | [Hafele wall-mounted rail bracket](https://hafelehome.com.vn/products/bas-giu-thanh-treo-gan-tuong-hafele) |
| `catalog/led-strip-hd.jpg` | 2000 x 2000 | [Waveform CENTRIC HOME LED strips](https://store.waveformlighting.com/products/ultra-high-95-cri-led-strip-lights-for-home-residential), reel detail photo |

The LED category reuses the first hero photo. The lock category reuses the local
800 x 800 photo `locks/499-21-226.jpg`; its source is recorded in
[lock-category-assets.md](lock-category-assets.md).

Product photos illustrate the static demo, not verified photos of the mock
`LED-12V-8W`, `433.02.450`, `BT-RK-01`, or `TN-201` SKUs. Prices, brands,
dimensions, and specifications remain demo data. Before a production launch,
replace illustrative photos with approved SKU-specific assets and confirm usage
rights with the rights holders. Source attribution is not a reuse license.

## Rendering rules

- Keep original aspect ratios; use `object-fit: cover` in the existing hero,
  category, and product-card frames. No blur filter or pixelated rendering.
- Keep hero image-only, with existing arrows, dots, keyboard, and swipe controls.
- Prefer sources with enough pixels for the rendered frame at 2x display density.
- Use versioned filenames when replacing low-resolution images to avoid stale caches.
- Product-card overlay appears only on desktop >=1024px with a fine hover-capable
  pointer. Tablet, mobile, and touch devices have no overlay button. Image and
  title links remain usable, as does the favorite button.

## Verification

`npm run test:images` checks decoding, source resolution at 2x/3x density for
hero/category/card frames, no CSS upscaling in product galleries, nonblank pixels,
stable hero dimensions, responsive overlay behavior, direct image/title
navigation, and matching product-detail images. Screenshots and
reports are written to `/tmp/bao-tin-ui-qa/image-quality`.
