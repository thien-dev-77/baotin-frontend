# Product link previews

Product pages generate the document title, description, canonical URL, Open Graph
and Twitter card metadata from the same public product read as the page. The
primary product image is used, with a gallery image as fallback. Relative media
paths become absolute public website URLs, including existing `/media/uploads/`
and imported image paths. HTML descriptions become concise plain text.

Metadata is included in the initial HTML head for chat clients that do not run
JavaScript. Product reads are memoized only within the render request, so a name
or image edit is reflected in subsequent requests. Private or missing products
continue to return 404 without product sharing metadata.

`SITE_URL` can set the canonical public website origin. When unset, the origin
comes from the hosting `x-forwarded-host`/`x-forwarded-proto` headers, falling back
to the request host. Do not set it to the backend or a private localhost address
in production.

Run the production regression against a controlled local API:

```sh
NEXT_PUBLIC_API_MODE=true NEXT_DIST_DIR=.next-share-preview-qa npm run build
npx playwright test tests/product-metadata.spec.ts --workers=1
```

After deployment, inspect the source HTML of a product URL and open its absolute
`og:image` URL without signing in. Chat platforms may retain the old preview for
previously shared URLs. A platform's preview refresh/debugger or a new sharing
URL query can request a fresh scrape; the canonical URL remains the product URL.
