---
paths:
  - "sections/**/*.liquid"
  - "blocks/**/*.liquid"
  - "snippets/**/*.liquid"
  - "layout/**/*.liquid"
---
# Images

- `image_url: width:` → `image_tag` with canonical `widths`, an accurate `sizes` (update it whenever the layout changes per breakpoint), `width`/`height`, and `aspect-ratio` on the container.
- Fluid always: `max-width: 100%; height: auto` or `aspect-ratio`. No fixed pixel widths that overflow on mobile.
- `<picture>` + `<source media>` only for art direction (different crop/image per breakpoint); `srcset` alone for resolution switching.
- Eager vs lazy: canonical cut-off and grid rule. Raise the threshold only if a 3rd section genuinely paints above the fold, and say so.
- Lazy images: `loading: 'lazy'` + `decoding: 'async'`. Gallery: image 1 eager, rest lazy.
- LCP image: `loading: 'eager'`, `fetchpriority: 'high'` (never with lazy), preloaded via `image_tag: preload: true` (Early Hints) or `<link rel="preload" as="image" imagesrcset>` (one, not both; counts toward the preload cap). Verify in DevTools Performance → Insights that it is the LCP, not lazy, and found by the preload scanner. Check Theme settings → Animations for a global fade that would hit it.
- Icons: inline SVG snippets, never icon fonts or `<img>` sprites.
- Sources ≤ 2048 px; let the CDN negotiate WebP/AVIF.
- `sizes` breakpoints use the same px values as CSS, e.g. `(min-width: 1200px) 33vw, (min-width: 768px) 50vw, 100vw`.
- Check rendering at 375 / 768 / 992 / 1440 minimum before merge.
- `alt` describes the image (`image.alt | default: product.title`); `alt=""` only when decorative.

Deep patterns: `theme-reference` → images-lcp.
