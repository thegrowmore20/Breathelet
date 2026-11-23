---
description: Deep reference for LCP, fetchpriority, responsive images, srcset/sizes, picture, preventing image layout shift, and popup/LCP interactions. Load when BUILDING image-heavy sections from scratch or debugging an LCP/image problem — not for simple edits (use rules/images.md for those).
---

> **Examples are illustrative.** When copying code: use the canonical srcset widths, eager/lazy cut-off and breakpoints from AGENTS.md, `const` + `for...of` instead of `var`/`forEach`, the canonical breakpoints in `rules/css.md` (750/990/1024px in examples are Dawn values). Constants win; report any contradicting line you find.


## Part 1 — Images & LCP

Source: https://shopify.dev/docs/storefronts/themes/best-practices/performance/

---

#### Never lazy-load the LCP image

**Why it matters:** `loading="lazy"` (native or JS-based) delays discovery of the LCP image until after intersection-observer/JS runs, adding latency directly to LCP.

**Do**
- Eagerly load any image visible in the initial viewport (`loading: 'eager'`, or omit the attribute).
- Use `section.index` to decide loading strategy. The canonical cut-off is `{% unless section.index > 2 %}` → eager (sections 1–2 and a `nil` index), lazy from section 3 (AGENTS.md constants). Code samples further down this file use other thresholds (`> 1`, `> 3`) to illustrate layout-specific cases — they are illustrations of the pattern, not a competing default.
- In image-dense sections (grids, carousels), eagerly load only the first few visible items using `forloop.index` (typically `<= 4`).
- Always provide explicit `sizes` attributes on above-the-fold images instead of JS-calculated sizes.
- Verify in DevTools: Performance panel Insights tab (confirm LCP image isn't lazy-loaded) and Network panel (confirm the image is discovered early by the preload scanner).

**Don't**
- Don't apply `loading="lazy"` or a JS lazy-loading library (e.g. one that swaps `src` for `data-src`) to the LCP candidate.
- Don't let a lazy-load library's script tag remain wired to above-the-fold images after migration.

```liquid
{% liquid
  if forloop.index <= 4
    assign image_loading = 'eager'
  else
    assign image_loading = 'lazy'
  endif
%}

{{ section.settings.image | image_url: width: 1000 | image_tag: loading: image_loading }}
```

Section-level variant:

```liquid
{%- comment -%} Canonical cut-off: eager for sections 1–2 and a nil index {%- endcomment -%}
{% if section.index > 2 %}
  {{ image | image_tag: loading: 'lazy' }}
{% else %}
  {{ image | image_tag: loading: 'eager' }}
{% endif %}
```

---

#### Set `fetchpriority="high"` on the LCP image

**Why it matters:** By default all images are discovered at Low priority and only upgraded to High after layout, once the browser knows what's in the viewport. `fetchpriority="high"` removes that delay for the LCP image, directly improving LCP.

**Do**
- Apply `fetchpriority: 'high'` to the one true LCP element only — confirm it visually and via DevTools first.
- Pair it with `loading: 'eager'` (or no `loading` attribute).
- Typically the hero or main product image, usually in the first section.
- Verify with Performance > Insights (identify the LCP element) and the Network panel's Priority column, comparing with/without the attribute.

**Don't**
- Never pair `fetchpriority: 'high'` with `loading: 'lazy'`.
- Don't overuse `fetchpriority="high"` on multiple elements — it interferes with the browser's own prioritization heuristics.

```liquid
{%- # Canonical: eager for sections 1–2 and nil index; fetchpriority only on the real LCP -%}
{%- liquid
  assign is_lcp = false
  unless section.index > 1
    assign is_lcp = true
  endunless
  assign eager = false
  unless section.index > 2
    assign eager = true
  endunless
-%}
{%- if is_lcp -%}
  {{ product.featured_image | image_url: width: 1920 | image_tag:
      loading: 'eager', fetchpriority: 'high', preload: true,
      widths: '352, 550, 832, 1200, 1500, 1920',
      sizes: '(min-width: 1200px) 900px, calc(100vw - 2rem)' }}
{%- elsif eager -%}
  {{ product.featured_image | image_url: width: 1920 | image_tag:
      loading: 'eager',
      widths: '352, 550, 832, 1200, 1500, 1920',
      sizes: '(min-width: 1200px) 900px, calc(100vw - 2rem)' }}
{%- else -%}
  {{ product.featured_image | image_url: width: 1920 | image_tag:
      loading: 'lazy', decoding: 'async',
      widths: '352, 550, 832, 1200, 1500, 1920',
      sizes: '(min-width: 1200px) 900px, calc(100vw - 2rem)' }}
{%- endif -%}
```

---

#### Don't hide the LCP image behind animations

**Why it matters:** The browser excludes elements with `opacity: 0` from LCP candidacy and waits until opacity is non-zero to record the metric — so fade-ins, `display: none` toggles, and "Animate On Scroll" reveals can delay LCP by hundreds of milliseconds to several seconds even after the image has finished downloading. Real stores saw LCP improve by 3–6s (one went from 3.6s to 2.2s mobile LCP, plus a 9.4% add-to-cart increase) after removing fade-in transitions.

**Do**
- First check **Online Store > Themes > Customize > Theme settings > Animations** and disable page-transition toggles if present — this alone has fixed CWV issues for multiple stores.
- Prefer removing the animation entirely from the LCP image.
- If you must animate, exempt the LCP image (e.g. gate the animation class on `section.index > 1`) and keep any remaining animation under 0.3s.
- If animating, use CSS `@keyframes` (paint-only) rather than JS-driven class toggles, and respect `prefers-reduced-motion: reduce`.
- For page-wide transitions, use the `pagereveal` event rather than hiding `body` unconditionally.
- If you trigger a fade after image load, use the `onload` attribute plus a `<noscript>` fallback so the image is visible without JS.
- Test by comparing image download completion time against the LCP event time in DevTools; a gap >500ms signals a rendering delay caused by animation.

**Don't**
- Don't apply a blanket `opacity: 0` fade-in class to all images, including the LCP one.
- Don't use `display: none` toggled by JavaScript to reveal content — it removes layout entirely and is the worst offender.
- Don't test the exemption condition as `section.index == 1` — `section.index` is `nil` in static sections and the online editor, and `nil` comparisons are falsey; use `section.index > 1` for the "not first section" branch instead.

```css
/* ❌ Problematic: fade-in applied to every image, including the LCP image */
img {
  opacity: 0;
  transition: opacity 0.3s ease;
}
img.loaded {
  opacity: 1;
}
```

```liquid
{# ✅ Exempt the LCP image from animation, animate everything else #}
{% if section.index > 1 %}
  {{ product
  | image_url: width: 1000
  | image_tag: class: 'animate-reveal'
  }}
{% else %}
  {{ product
  | image_url: width: 1000
  | image_tag: fetchpriority: 'high'
  }}
{% endif %}
```

```html
<!-- ✅ If animating, trigger only after the image itself has loaded -->
<img
  src="hero.jpg"
  alt="Model wearing the spring jacket"
  class="hero-image"
  onload="this.classList.add('loaded')"
  fetchpriority="high"
/>

<noscript>
  <img
    src="hero.jpg"
    alt="Model wearing the spring jacket"
    class="hero-image loaded"
  />
</noscript>
```

```css
.hero-image {
  opacity: 0;
  transition: opacity 0.3s ease;
}
.hero-image.loaded {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .hero-image {
    animation: none;
  }
}
```

**Related links:**
- https://performance.shopify.com/blogs/blog/improve-largest-contentful-paint-lcp-by-removing-image-transitions
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/set-fetchpriority-high-on-lcp-image
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/never-lazy-load-lcp-image

---

#### Prevent popups/dialogs from hijacking LCP

**Why it matters:** A JS-injected dialog (promo popup, cookie banner, etc.) that appears during the LCP measurement window can itself become the LCP element if it's larger than the main content — inflating (worsening) the reported LCP and misrepresenting real loading performance.

**Do**
- Gate popup display on an actual user interaction (scroll, pointerdown, keydown) rather than a timer, using one-shot listeners.
- Keep popups small — prefer a narrow banner bar over a full-screen overlay, and keep any popup text smaller than the page's main headings.
- Use server-side Liquid conditionals to render popups only on the specific pages that need them, avoiding unnecessary markup elsewhere.

**Don't**
- Don't show a dialog via a bare `setTimeout` — even a delay still leaves it eligible to be measured as LCP.
- Don't rely on the `elementtiming` attribute to opt an element out of LCP measurement — it cannot do that. Only reducing size or deferring display until after interaction prevents hijacking.

```javascript
// ❌ Incorrect: timer-based reveal is still LCP-eligible
setTimeout(() => {
  document.getElementById('popup').removeAttribute('hidden');
}, 3000);
```

```javascript
// ✅ Correct: reveal only after real user interaction
function showPopup() {
  var popup = document.getElementById('promo-popup');
  if (popup) {
    popup.removeAttribute('hidden');
  }
}

var popupShown = false;
function triggerPopup() {
  if (popupShown) return;
  popupShown = true;
  showPopup();
}

['scroll', 'pointerdown', 'keydown'].forEach(function (eventType) {
  window.addEventListener(eventType, triggerPopup, { once: true, passive: true });
});
```

---

#### Use responsive images (`srcset` + `sizes`)

**Why it matters:** Without `srcset`/`sizes`, mobile devices download unnecessarily large desktop-sized images, wasting bandwidth and directly slowing LCP.

**Do**
- Use `image_url` + `image_tag` with explicit `widths` and `sizes` so the browser can "serve the smallest image that still looks good at each viewport size."
- Keep the `widths` list to four to six values — more than that reduces caching effectiveness and adds unnecessary browser evaluation overhead.
- Always set an explicit `sizes` value for eager-loaded images, including the LCP image.
- Use `sizes: 'auto'` **only** in combination with `loading: 'lazy'`.
- Validate with the Responsive Image Linter Chrome extension, the DevTools Network panel, and Device Mode across viewports.

**Don't**
- Don't pass too many widths in `srcset`.
- Don't set the wrong `sizes` value — it can cause the browser to download an oversized image.
- Don't omit `sizes` entirely — the browser then defaults to downloading the largest image, wasting mobile bandwidth.
- Don't use `sizes: 'auto'` on eager/LCP images.

```liquid
{{ product.featured_image
| image_url: width: 1000
| image_tag:
      widths: '400, 600, 800, 1000',
      sizes: '(min-width: 1000px) 900px, calc(100vw - 2rem)'
}}
```

```liquid
{# ✅ Lazy-loaded images may use sizes: 'auto' #}
{{ product.featured_image
| image_url: width: 1000
| image_tag:
      loading: 'lazy',
      widths: '400, 600, 800, 1000',
      sizes: 'auto'
}}
```

---

#### Prevent image layout shift (CLS)

**Why it matters:** Missing `width`/`height` on `<img>` tags forces the browser to reflow content once the image loads, causing Cumulative Layout Shift (CLS).

**Do**
- Always render explicit `width` and `height` on every `<img>`.
- Use Shopify's `image_tag` filter, which sets correct `width`/`height` automatically.
- Pair with `img { max-width: 100%; height: auto; }` so intrinsic dimensions still scale responsively.
- Alternatively, use CSS `aspect-ratio` on a container with `width: 100%; height: auto` on the image (modern browsers).
- Check in DevTools: Performance panel "Layout Shift" entries, Live metrics CLS breakdown, network throttling + visual observation, and the Rendering tab's "Layout Shift Regions" overlay.

**Don't**
- Don't render `<img>` tags without `width`/`height` attributes.

```html
<!-- ❌ Incorrect: no dimensions -->
<img src="image.jpg" alt="Product" />
```

```html
<!-- ✅ Correct: explicit dimensions -->
<img src="image.jpg" width="800" height="600" alt="Product" />
```

```css
img {
  max-width: 100%;
  height: auto;
}
```

```liquid
{{ product.featured_image
| image_url: width: 800
| image_tag: alt: product.title
}}
```

Generates:

```html
<img
  src="...image-800.jpg"
  width="800"
  height="600"
  srcset="..."
  sizes="..."
  alt="Product Title"
/>
```

```css
/* ✅ Alternative: aspect-ratio container */
.image-container {
  aspect-ratio: 16 / 9;
}
.image-container img {
  width: 100%;
  height: auto;
}
```

---

#### Use `image_url` and `image_tag` instead of manual CDN URLs

**Why it matters:** A single `image_tag` filter builds all `srcset` widths on the server in one operation, dramatically reducing TTFB versus multiple manual filter calls, and it also carries width/height, focal point, format negotiation, CDN cache parameters, and — with `preload: true` on the LCP image — HTTP 103 Early Hints support (preload instructions sent before HTML finishes rendering).

**Do**
- Build image markup exclusively through `image_url` piped into `image_tag`.
- On the hero/LCP image, pass `widths`, `sizes`, `loading: 'eager'`, `fetchpriority: 'high'`, and `preload: true`.
- Test `section.index > 1` (or `> 2`, `> 3` depending on layout), not `== 1`, since `section.index` is `nil` in the online editor, static sections, and the Section Rendering API, and `nil` comparisons are falsey.
- In product grids, use `forloop.index <= 4` to decide eager vs. lazy loading per card.
- In carousels, give only the first slide `loading: 'eager'`, and add `fetchpriority: 'high'` to that slide only when the carousel is the first page section (likely LCP element).
- Validate with the DevTools Network panel (correct sizes per viewport), the Responsive Image Linter extension, the Performance panel Insights tab (LCP time with/without `preload: true`), and Early Hints via the `?tracing=1` URL parameter.

**Don't**
- Don't hand-build CDN URLs or `srcset` strings.

```liquid
{% unless section.index > 1 %}
  {{ section.settings.hero_image
  | image_url: width: 2400
  | image_tag:
        widths: '800, 1200, 1600, 2000, 2400',
        sizes: '100vw',
        loading: 'eager',
        fetchpriority: 'high',
        preload: true
  }}
{% else %}
  {{ section.settings.hero_image
  | image_url: width: 2400
  | image_tag:
        widths: '800, 1200, 1600, 2000, 2400',
        sizes: '100vw',
        loading: 'lazy'
  }}
{% endunless %}
```

```liquid
{# ✅ Product grid: eager only for the first few cards #}
{%- for product in collection.products limit: 12 -%}
  <div class="product-card">
    {%- if forloop.index <= 4 -%}
      {%- assign card_loading = 'eager' -%}
    {%- else -%}
      {%- assign card_loading = 'lazy' -%}
    {%- endif -%}

    {{ product.featured_image
    | image_url: width: 600
    | image_tag:
          widths: '300, 400, 500, 600',
          sizes: '(min-width: 990px) 25vw, (min-width: 750px) 33vw, 50vw',
          loading: card_loading
    }}
  </div>
{%- endfor -%}
```

```liquid
{# ✅ Carousel: eager + high priority only on the first slide, when it's likely LCP #}
<div class="carousel">
  {%- for product in collection.products limit: 6 -%}
    {%- liquid
      assign slide_loading = 'lazy'
      assign slide_priority = 'auto'
      if forloop.first
        assign slide_loading = 'eager'
        unless section.index > 1
          assign slide_priority = 'high'
        endunless
      endif
    -%}

    <div class="carousel-slide">
      {{ product.featured_image
      | image_url: width: 800
      | image_tag:
            widths: '400, 600, 800',
            sizes: '(min-width: 1000px) 33vw, 80vw',
            loading: slide_loading,
            fetchpriority: slide_priority
      }}
    </div>
  {%- endfor -%}
</div>
```

**Related links:**
- https://shopify.dev/docs/api/liquid/filters/image_tag
- https://shopify.dev/docs/api/liquid/filters/image_url
- https://performance.shopify.com/blogs/blog/responsive-images-on-shopify-with-liquid
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-responsive-images
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-section-index
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/set-fetchpriority-high-on-lcp-image

---

#### Use Liquid filter chains efficiently (`image_url` → `image_tag`)

**Why it matters:** Native filters compile to bytecode for fast execution, while manual string manipulation (e.g. `replace` on the raw image URL) runs interpreted Liquid, which is significantly slower and also bypasses `srcset` generation, correct `width`/`height`, focal point positioning, format negotiation (WebP/AVIF), CDN cache parameters, and Early Hints.

**Do**
- Pipe `image_url` directly into `image_tag`, letting `widths` (and, for cropping, `width`/`height`/`crop` on `image_url`) drive the responsive output.
- Note: the `widths` parameter in `image_tag` replaces the default candidate widths (352, 832, 1200, 1920).
- Note: passing `width` to `image_url` adds that width to the candidate list and filters out any upscaled widths.
- For CSS background images, still generate the URL via `image_url`; but prefer an `<img>` with `object-fit: cover` over a background-image where native lazy loading and responsive `srcset` matter, since `<img>` tags with `object-fit: cover` are more performant than background images for that purpose.
- Inside `{% paginate %}` blocks, explicit `limit` tags on loops are redundant.
- Validate with Theme Inspector render-time comparisons, DevTools Network panel `srcset` inspection, response `Content-Type` header checks for format negotiation, and visual focal-point confirmation.

**Don't**
- Don't use `replace` (or other string manipulation) on `product.featured_image.src` to build resized URLs.
- Don't manually construct `srcset` strings from repeated `replace` calls.
- Don't reference `image.src` directly for the `<img src>` — always go through `image_url`.

```liquid
{# ❌ Mistake 1: string replacement for sizing #}
<img src="{{ product.featured_image.src | replace: '.jpg', '_800x.jpg' }}" />
```

```liquid
{# ❌ Mistake 2: manual srcset construction #}
<img
  src="{{ product.featured_image.src }}"
  srcset="{{ product.featured_image.src | replace: '.jpg', '_400x.jpg' }} 400w,
          {{ product.featured_image.src | replace: '.jpg', '_800x.jpg' }} 800w"
/>
```

```liquid
{# ❌ Mistake 3: direct image.src usage #}
<img src="{{ product.featured_image.src }}" alt="{{ product.title }}" />
```

```liquid
{# ✅ Recommended: basic filter chain #}
{{ product.featured_image
| image_url: width: 800
| image_tag:
      widths: '400, 600, 800',
      loading: 'lazy'
}}
```

```liquid
{# ✅ Hero image with full optimizations #}
{% unless section.index > 1 %}
  {{ section.settings.image
  | image_url: width: 2400
  | image_tag:
        widths: '800, 1200, 1600, 2000, 2400',
        sizes: '100vw',
        loading: 'eager',
        fetchpriority: 'high',
        preload: true,
        class: 'hero-image',
        alt: section.settings.heading
  }}
{% endunless %}
```

```liquid
{# ❌ Before: manual srcset via replace #}
{%- assign img_url = product.featured_image.src -%}
<img
  src="{{ img_url }}"
  srcset="
    {{ img_url | replace: '.jpg', '_400x.jpg' }} 400w,
    {{ img_url | replace: '.jpg', '_800x.jpg' }} 800w,
    {{ img_url | replace: '.jpg', '_1200x.jpg' }} 1200w
"
  alt="{{ product.title }}"
/>
```

```liquid
{# ✅ After: filter chain #}
{{ product.featured_image
| image_url: width: 1200
| image_tag: widths: '400, 800, 1200'
}}
```

```liquid
{# ✅ Background image URL generation #}
<div
  class="hero-banner"
  style="background-image: url({{ section.settings.image | image_url: width: 2000 }});"
>
</div>
```

```liquid
{# ✅ Collection image with cropping #}
{{ collection.image
| image_url: width: 600, height: 400, crop: 'center'
| image_tag:
      widths: '300, 400, 500, 600',
      sizes: '(min-width: 750px) 300px, 50vw'
}}
```

---

#### Use `<picture>` for art-directed hero images

**Why it matters:** Serving separate mobile/desktop `<img>` tags toggled by CSS `display: none` causes *both* images to download regardless of viewport, wasting bandwidth. Themes also often apply `fetchpriority="high"` only to the desktop image, so mobile users — 60–75% of traffic — download the LCP image at default priority, delaying page performance by hundreds of milliseconds.

**Do**
- Use a single `<picture>` element with `<source media="...">` entries so the browser downloads only the image matching the current viewport.
- Include `width` and `height` on every `<source>` to prevent layout shift.
- Use the desktop image as the `<img>` fallback inside `<picture>`.
- Put `fetchpriority="high"` only on the `<img>` fallback element, never on `<source>` tags.
- Remove any CSS that toggles `.hero__image--mobile` / `.hero__image--desktop` visibility — it's no longer needed.
- Verify with DevTools: confirm only one hero image downloads on mobile, confirm it loads at High priority, confirm correct images appear at both breakpoints, and confirm `width`/`height` prevent layout shift.

**Don't**
- Don't render two `<img>` tags (mobile + desktop) and hide one with CSS `display: none` — both still download.
- Don't apply `fetchpriority="high"` to only the desktop image while leaving the mobile image at default priority.

```liquid
{# ❌ Before: two images toggled by CSS, both download #}
{{ desktop_image | image_url: width: 2560 | image_tag:
    class: 'hero__image hero__image--desktop',
    fetchpriority: fetch_priority,
    sizes: sizes
}}

{% if mobile_image != blank %}
  {{ mobile_image | image_url: width: 1200 | image_tag:
      class: 'hero__image hero__image--mobile',
      sizes: sizes
  }}
{% endif %}
```

```html
<!-- ✅ After: single picture element, browser fetches only the matching source -->
<picture>
  {% if mobile_image != blank %}
    <source
      media="(max-width: 749px)"
      srcset="{{ mobile_image | image_url: width: 600 }} 600w,
             {{ mobile_image | image_url: width: 800 }} 800w,
             {{ mobile_image | image_url: width: 1000 }} 1000w,
             {{ mobile_image | image_url: width: 1200 }} 1200w"
      sizes="100vw"
      width="{{ mobile_image.width }}"
      height="{{ mobile_image.height }}"
    >
  {% endif %}

  <source
    media="(min-width: 750px)"
    srcset="{{ desktop_image | image_url: width: 1200 }} 1200w,
           {{ desktop_image | image_url: width: 1600 }} 1600w,
           {{ desktop_image | image_url: width: 2000 }} 2000w,
           {{ desktop_image | image_url: width: 2560 }} 2560w"
    sizes="100vw"
    width="{{ desktop_image.width }}"
    height="{{ desktop_image.height }}"
  >

  {{ desktop_image | image_url: width: 2560 | image_tag:
      fetchpriority: fetch_priority,
      loading: 'eager',
      sizes: '100vw',
      class: 'hero__image'
  }}
</picture>
```

---

### Quick checklist

- Never set `loading="lazy"` (or a JS lazy-loader) on the LCP image.
- Eager-load only the first ~4 above-the-fold images; lazy-load the rest via `section.index` / `forloop.index`.
- Set `fetchpriority: 'high'` on exactly one element — the true LCP image — paired with `loading: 'eager'`.
- Disable theme fade-in/page-transition animations on the LCP image, or exempt it explicitly.
- Test `section.index` conditions as `> N`, never `== 1` — it's `nil` in the editor and static sections.
- Trigger popups/dialogs on real user interaction (scroll, pointerdown, keydown), never on a bare `setTimeout`.
- Keep popups small (banner, not full-screen) and don't rely on `elementtiming` to exclude them from LCP.
- Always pass explicit `widths` (4–6 values) and `sizes` on `image_tag` for eager-loaded images.
- Use `sizes: 'auto'` only together with `loading: 'lazy'`.
- Always render `width` and `height` on every `<img>` (via `image_tag` or explicit attributes) to prevent CLS.
- Build every image through `image_url | image_tag` — never hand-construct CDN URLs or `srcset` with `replace`.
- Add `preload: true` to the hero/LCP image to enable HTTP 103 Early Hints.
- Prefer `<img>` with `object-fit: cover` over CSS background-images when lazy loading/responsiveness matters.
- Use a single `<picture>` element with `<source media>` for art-directed mobile/desktop heroes instead of two `<img>` tags toggled by CSS.
- Put `fetchpriority="high"` only on the `<picture>` fallback `<img>`, never on `<source>`.


---

