---
description: Deep reference for network hints (preload/preconnect/speculation rules), Shopify CDN, avoiding proxies, section.index, the Section Rendering API, AND the full custom cart-drawer implementation spec (optimistic UI, morph, coalescing, edge cases). Load when building cart drawer, AJAX section updates, quick-add, facets, or tuning resource hints.
---

> **Examples are illustrative.** When copying code: use the canonical srcset widths, eager/lazy cut-off and breakpoints from AGENTS.md, `const` + `for...of` instead of `var`/`forEach`, the canonical breakpoints in `rules/css.md` (750/990/1024px in examples are Dawn values). Constants win; report any contradicting line you find.


## Part 5 — Network, Resource Hints & Section Rendering

Source: https://shopify.dev/docs/storefronts/themes/best-practices/performance/ (and the templates-sections-blocks best-practices page)

---

#### Use Preload Resource Hints Sparingly

**Why it matters**
Shopify already auto-preloads up to **10** render-blocking scripts/stylesheets via `Link` response headers, filled in this priority order: (1) automatic render-blocking preloads, (2) stylesheet preloads, (3) other preloads (fonts, etc.), (4) script preloads, (5) image preloads. Anything past position 10 is dropped. Adding your own `<link rel="preload">` tags competes for this same limited budget and can push higher-priority assets out, delaying LCP instead of improving it.

**Do**
- Use `<link rel="preload">` (or the Liquid preload filters, which trigger HTTP 103 Early Hints) for only one or two genuinely late-discovered critical resources — e.g. fonts referenced inside a separate CSS file, or a resource proven by before/after testing to help.
- Prefer Liquid filters so the hint is sent as an Early Hint, discovered before Shopify even finishes rendering HTML:

```liquid
{{ 'font.woff2' | asset_url | preload_tag: as: 'font', type: 'font/woff2' }}
{{ 'critical.css' | asset_url | stylesheet_tag: preload: true }}
{{ product.featured_image | image_url: width: 800 | image_tag: preload: true }}
```

**Don't**
- Don't preload render-blocking scripts/stylesheets already in `<head>` — Shopify already handles these automatically.
- Don't preload assets that are already referenced in the initial HTML — the browser's preload scanner already finds them.
- Don't add more than one or two manual preload hints.
- Don't preload without before/after testing.
- Don't use preload to try to fix a JavaScript rendering problem.

```html
<!-- ❌ Unnecessary: the browser's preload scanner already finds this image tag -->
<link rel="preload" href="hero.jpg" as="image" />
<img src="hero.jpg" alt="Hero" />
```

---

#### Use Preconnect

**Why it matters**
Shopify already scans the rendered `<head>` of every storefront and automatically preconnects (via `Link` headers, delivered before the HTML body) to the first three third-party origins serving render-blocking resources, plus it always preconnects to the Shopify CDN asset host. Redundant manual `preconnect` hints waste the browser's limited early-connection budget.

**Do**
- Preconnect only to origins the platform *cannot* discover automatically:
  - Origins contacted late, by JavaScript at runtime (e.g. a video host initialized after the player loads, a payment widget provider whose script is injected dynamically).
  - A font-file origin that differs from the stylesheet's origin (because the font URL is inside the CSS file, not the visible `<head>`).
- Add `crossorigin` only for CORS-fetched resources (fonts, `fetch()` requests). If a domain serves both CORS and non-CORS resources, add two separate hints.
- Limit yourself to the one or two most critical late-discovered third-party domains for `preconnect`; use `dns-prefetch` for less-critical third-party domains.
- Verify first: check the `Link` response header in Chrome DevTools Network panel — if the origin is already listed there, Shopify has already preconnected and your hint is redundant.

```html
<!-- ✅ Basic syntax -->
<link rel="preconnect" href="https://external-domain.com" crossorigin />

<!-- ✅ Font origin only discoverable inside a stylesheet, not the rendered <head> -->
{%- comment -%}
  The font files are requested from inside the stylesheet, so this origin isn't
  visible in the rendered <head> and the platform can't preconnect to it.
{%- endcomment -%}
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- ✅ Domain serving both CORS and non-CORS resources: use two hints -->
<link rel="preconnect" href="https://example.com">
<link rel="preconnect" href="https://example.com" crossorigin>
```

**Don't**
- Don't preconnect to origins already serving render-blocking `<head>` resources (Shopify already did it).
- Don't preconnect to your own store's domain.
- Don't preconnect to `cdn.shopify.com` (the platform manages this).
- Don't preconnect to other Shopify domains (e.g. `monorail-edge.shopifysvc.com`).
- Don't preconnect to domains the page doesn't actually use.

---

#### Use Speculation Rules

**Why it matters**
The Speculation Rules API lets the browser prefetch or prerender a link's target page before the user clicks, making navigation feel near-instant. Since June 2025, Shopify automatically enables platform-wide speculation rules via an HTTP header pointing to a JSON config, using `"prefetch"` at `"conservative"` eagerness. Shopify's own measurement ("Speculation Rules at Shopify") found ~220ms median desktop speedup and ~20ms mobile speedup on Chromium, at the cost of only ~0.7% additional traffic.

**Do**
- Add custom rules via a `<script type="speculationrules">` tag in `theme.liquid`'s `<head>` when you want stronger behavior (e.g. prerender) for specific, high-confidence links:

```html
<script type="speculationrules">
{
  "prerender": [
    {
      "where": {
        "selector_matches": "[data-instant-navigation]"
      },
      "eagerness": "moderate"
    }
  ]
}
</script>
```

```html
<a href="{{ product.url }}" data-instant-navigation>
  View product
</a>
```

- Choose eagerness deliberately (most to least aggressive):
  - `"immediate"` — speculates as soon as the rule is parsed; costly on collection pages.
  - `"eager"` — acts on cursor movement or scroll pausing.
  - `"moderate"` — acts on sustained hover (~200ms in Chrome); recommended balance.
  - `"conservative"` — acts on touchdown/mousedown; lowest resource cost (Shopify's own default).
- Choose `prefetch` (fetch only, no render — cheaper, safer) vs `prerender` (fetch + render + run JS — faster nav, higher cost) based on how confident you are in the navigation and how expensive false positives are.

**Don't**
- Don't assume Safari or Firefox benefit — they currently silently ignore Speculation Rules (Chromium-only support: Chrome, Edge, Opera).
- Don't ignore state/staleness risk: prerendering can fire analytics prematurely, and can render stale content if cart or other state changes between prerender and the actual navigation. Shopify sends `Clear-Site-Data` headers for cart changes, but you must handle other state changes yourself.

---

#### Use Shopify CDN

**Why it matters**
Every additional third-party domain a page loads from requires a fresh DNS lookup + TCP handshake + TLS handshake. On mobile with ~150ms latency, that's "a delay of nearly half a second before the asset starts downloading" — before any bytes of the actual asset arrive. Serving assets from the Shopify CDN instead reuses the connection already open to the storefront.

**Do — theme (static) assets**
```liquid
{{ 'theme.css' | asset_url | stylesheet_tag }}
<script src="{{ 'theme.js' | asset_url }}" type="module"></script>
<img src="{{ 'logo.svg' | asset_url }}" alt="Store logo" width="240" height="80"/>
```

**Do — merchant-supplied images (need responsive resizing)**
```liquid
{{ images['hero.jpg']
  | image_url: width: 1600, height: 900, crop: 'center'
  | image_tag: widths: '400, 800, 1200, 1600', sizes: '100vw'
}}
```

**Do — CSS backgrounds** (use `asset_url` inside a `.css.liquid` file)
```css
/* ✅ Correct */
background: url({{ 'bg.gif' | asset_url }});
```

**Don't**
```html
<!-- ❌ Incorrect: loading from external CDNs instead of Shopify's -->
<link rel="stylesheet" href="https://cdn.example-ui.com/example-ui@3/example.css">
<script src="https://scripts.example-cdn.com/slider-3.7.1.min.js"></script>
<img src="https://images.example-cdn.com/logo.svg" alt="Store logo" width="240" height="80">
```

```css
/* ❌ Incorrect: hardcoded filename with no cache-busting version */
background: url(bg.gif);
```

**Caveats / numbers**
- Filter choice matters: use `asset_url` for fixed theme files in `assets/` (logos, icons); use `image_url` + `image_tag` for merchant-supplied images that need responsive resizing.
- `asset_url` automatically appends a version query parameter (e.g. `?v=1384022871`) so browsers bust cache when the file changes. Only that `v=<number>` parameter format triggers cache invalidation — arbitrary timestamps or other parameter names do not. Without proper versioning, image changes can take a day or more to propagate.
- Test with Chrome DevTools Network panel: audit domains, check the Timing tab for `0 ms` DNS/SSL on same-origin assets, and compare before/after traces.

---

#### Avoid Request Proxies

**Why it matters**
"Each layer in front of Shopify's edge is another hop the browser pays for on work that Shopify already does close to the shopper." Proxies in front of a storefront add network hops that directly hurt TTFB (delayed HTML), LCP (rendering blocked until the document arrives), and FCP (if assets also route through the proxy). Cached HTML behind a proxy can also serve stale product data, inventory, or pricing.

**Do**
- Remove the proxy entirely if it exists only for caching/CDN purposes (Shopify's own CDN already does this).
- If a proxy is required for compliance or security reasons, restrict it to HTML documents only (not assets/API/cart).
- Cap HTML cache TTL at **5 minutes or less** if you must cache.
- Measure cart and API paths **separately** from document requests — they bypass shared caches and behave differently.
- Detect proxies:

```bash
# DNS check — look for non-Shopify nameservers or a CNAME not pointing to shops.myshopify.com
dig +noall +answer www.example.com
dig +short NS example.com
```

- Compare response headers between your custom domain and the `.myshopify.com` domain; watch for duplicated `x-cache`, `via`, or `cf-ray` headers.
- Note the Cloudflare special case: Shopify's own CDN already runs on Cloudflare, so a `cf-ray` header alone proves nothing — look for *duplicated* `cf-cache-status` or an extra `age` entry compared to the origin instead.
- Sample TTFB from identical networks and compare medians, not single runs.

**Don't**
- Don't leave a caching/CDN-only proxy in front of the storefront — it duplicates what Shopify's edge already provides while adding a hop.
- Don't rely on a single request's TTFB reading as proof either way.
- Don't proxy the cart or API paths through a shared HTML cache.

If a proxy can't be removed, address root causes instead: optimize Liquid rendering, audit third-party scripts, use responsive images.

---

#### Use section.index (and section.index0 / section.location)

**Why it matters**
`section.index`, `section.index0`, and `section.location` let a section know its position on the page so it can make above-the-fold vs below-the-fold decisions (eager vs lazy image loading, `fetchpriority`, sync vs async CSS). Getting the `nil` case wrong silently breaks LCP-image eager-loading in the theme editor.

**Semantics**
- `section.index` — **1-based** position (1, 2, 3, 4, …).
- `section.index0` — **0-based** position (0, 1, 2, 3, …).
- `section.location` — returns `template`, `static`, `content_for_index`, `preset`, a section-group type (`header`, `footer`, `aside`), or `custom.<value>`.
- In the **theme editor**, `section.index` can be `nil`. In Liquid, comparisons against `nil` are falsey: `nil <= 2` does not raise an error and does not evaluate to `true` — it evaluates to `false`.

**Don't**
```liquid
{% if section.index <= 2 %}
  {%- comment -%} Eager load {%- endcomment -%}
{% else %}
  {%- comment -%} Lazy load {%- endcomment -%}
{% endif %}
```
❌ This silently lazy-loads the LCP image whenever `section.index` is `nil` (i.e., in the theme editor), because `nil <= 2` is falsey.

**Do**
```liquid
{% unless section.index > 2 %}
  {%- comment -%} Sections 1 and 2, and any context where section.index is nil {%- endcomment -%}
  {{ image | image_url: width: 1000 | image_tag: loading: 'eager' }}
{% else %}
  {%- comment -%} Sections 3 and later {%- endcomment -%}
  {{ image | image_url: width: 1000 | image_tag: loading: 'lazy' }}
{% endunless %}
```
✅ `unless section.index > 2` treats a `nil` index the same as an above-the-fold section (safe default), because `nil > 2` is also falsey — so `unless` runs the eager branch.

**Other uses**
- Conditional `fetchpriority`: apply `fetchpriority: 'high'` only to the first section's images.
- Conditional async CSS: load render-blocking CSS synchronously for above-the-fold sections; load it asynchronously (e.g. `media="print"` swap trick) for below-the-fold sections.

**Testing**
- Test on the live storefront, not just the theme editor (`section.index` is `nil` there).
- Reorder sections in the editor, save, then re-verify on the storefront preview.
- Confirm all images still render correctly in the theme editor.
- Confirm the LCP image has `fetchpriority="high"` via Chrome DevTools Network panel.

**Related links**
- https://shopify.dev/docs/api/liquid/objects/section#section-index
- https://shopify.dev/docs/api/liquid/filters/image_tag
- https://web.dev/articles/fetch-priority

---

#### Use Section Rendering API

**Why it matters**
The Section Rendering API fetches and updates specific sections via Ajax without a full page reload, so only the sections that actually changed are requested and re-rendered.

**Caveats / thresholds**
- **Maximum 5 sections per request.** Exceeding this returns `400 Bad Request`.
- `?sections=` (multi-section) returns `null` for a section that fails to render or doesn't exist, inside a `200` response — it does not 404.
- `?section_id=` (single section) returns a `404` if the section doesn't exist — different failure mode than `?sections=`.
- Static sections use their filename as the section ID (`header.liquid` → `header`); sections inside JSON templates get dynamic IDs (e.g. `template--123__product-info`). Always read the ID from `{{ section.id }}` or from the section wrapper's `id`/`data-section-id` — never hardcode it.
- Scripts inside HTML returned by the API **do not execute** when inserted via `innerHTML`, `DOMParser`, or `replaceWith`. Bind behavior via event delegation on an ancestor element that isn't replaced.

**Don't**
```javascript
// ❌ Exceeds the 5-section limit -> 400 Bad Request
fetch("/?sections=header,template--123__product-info,cart-drawer,footer,sidebar,extra")
```

**Do — multi-section fetch (URL format: `?sections=id1,id2,id3`)**
```javascript
fetch("/?sections=header,template--123__product-info,cart-drawer")
  .then((response) => response.json())
  .then((data) => {
    // data.header contains rendered HTML
    // data["template--123__product-info"] contains rendered HTML
  });
```

**Do — find the section ID**

```liquid
<div data-section-id="{{ section.id }}">
  {%- comment -%} section.id outputs the unique section ID {%- endcomment -%}
</div>
```

```html
<div id="shopify-section-template--123__product-info" class="shopify-section">
  <!-- The ID is: template--123__product-info -->
</div>
```

**Do — single-section fetch (URL format: `?section_id=<id>`)**
```javascript
fetch(`${window.Shopify.routes.root}?section_id=header`)
  .then((response) => response.text())
  .then((html) => {
    document.querySelector("#header").innerHTML = html;
  });
```

**Do — bundled cart rendering via `sections` param on the Cart API**
```javascript
fetch("/cart/add.js", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    items: [{ id: 39072856, quantity: 1 }],
    // Only the sections whose DOM this response will replace.
    // For this theme's drawer that is exactly these two — see AGENTS.md constants.
    sections: "cart-drawer,cart-icon-bubble",
  }),
})
  .then((response) => response.json())
  .then((data) => {
    // data.sections["cart-drawer"] contains rendered HTML
  });
```

**Do — handle `null` sections defensively**
```javascript
fetch("/?sections=header,footer,missing-section")
  .then((response) => response.json())
  .then((data) => {
    if (data.header) {
      // Update header
    }
    if (!data["missing-section"]) {
      console.error("Section failed to render or doesn't exist");
    }
  });
```

**Do — use locale-aware URLs**
```javascript
fetch(window.Shopify.routes.root + "?sections=header")
```

---

#### Cart Drawer — Custom Implementation Spec

**Why it matters**
Every cart drawer — Dawn, Horizon, or custom — hits the same Shopify Cart API endpoints (`/cart/add`, `/cart/change`) and waits 200–400 ms for the server. No amount of custom code eliminates that network round-trip. What a custom drawer *can* control is everything around that request: perceived latency (optimistic UI = 0 ms felt by the user), DOM update strategy (morph vs. `innerHTML` replace = eliminates flicker and focus/scroll reset), JS payload (no third-party cart app = −50–200 KB), and app compatibility (light DOM = every Klaviyo, Appstle, Loox, and upsell app can reach into the drawer without Shadow DOM restrictions).

**Why not Dawn or Horizon out of the box**
- **Dawn** drawer: full `innerHTML` replace on every cart update → flicker, scroll-position reset, focus lost, visible "loading" overlay. No optimistic UI. Perceived time = debounce delay + network TTFB + DOM parse + paint ≈ 600 ms.
- **Horizon** drawer: web components inside Shadow DOM (morph instead of `innerHTML`) → smoother updates. But Shadow DOM breaks older cart/subscription/review apps that rely on `querySelector` patterns into the drawer. Mobile PageSpeed ~52 vs Dawn's ~82 on demo stores (PageSpeed Insights). Architecture is harder to customize.
- **Custom drawer on Dawn's Liquid skeleton**: light DOM (all apps work), Section Rendering API for server content (same Shopify guarantee), custom JS with optimistic UI and morph. Best of both. Perceived time: 0–50 ms (optimistic update fires instantly); actual reconcile time: 200–400 ms in background.

**Where time actually goes on a quantity change**

| Phase | Typical time | Custom code can fix? |
|---|---|---|
| Debounce wait | ~300 ms | Yes → 150 ms, or skip for dedicated ± buttons |
| `/cart/change` + Section Rendering (server TTFB) | 200–400 ms | No — reduce only by requesting fewer sections |
| Parse response + DOM update | 30–80 ms (`innerHTML`) / 5–10 ms (morph) | Yes → morph |
| Layout + paint of drawer | 20–50 ms | Yes → `contain`, `transform`-only animation |
| **Total felt by user (no optimistic UI)** | **~600 ms** | **→ ~0 ms felt + ~300 ms background reconcile** |

**RULE — request only the sections whose DOM this response replaces.** For this theme's cart that is the canonical pair `cart-drawer,cart-icon-bubble` (AGENTS.md constants). Never header, footer, or a `cart-footer` section — the drawer renders its own footer inside `cart-drawer`. Every extra section is server render time added to a request the user is waiting on. Maximum 5 sections per request; a 6th returns `400 Bad Request`.

**Architecture decisions (locked)**

| Decision | Locked value |
|---|---|
| DOM strategy | Light DOM — never Shadow DOM on the drawer |
| Liquid base | Dawn's section/snippet structure; throw away `cart-drawer.js` entirely |
| JS update method | DOM morph (morphdom or idiomorph, ~4 KB) — never `innerHTML` replace |
| Optimistic UI | Required — update quantity, line total, subtotal, and free-shipping bar from in-memory cart state before the request fires |
| Request coalescing | `AbortController` cancels in-flight request on new tap; last write wins |
| Cart event bus | Dispatch `cart:updated` with cart JSON on `document` after every mutation so apps hook in without polling |
| Third-party cart apps | Zero — free-shipping bar, upsell slot, discount code, cart note all built into the drawer section in Liquid |
| Drawer open mechanism | CSS `transform: translateX` only — zero requests, < 100 ms, no layout trigger |
| JS module size | ≤ 10 KB gzipped total for drawer + quantity + add-to-cart combined |

**Optimistic UI pattern**

```javascript
// component-cart-drawer.js
class CartDrawer extends HTMLElement {
  #cart = {};          // in-memory cart state (hydrated from JSON on page load)
  #controller = null;  // AbortController for the current in-flight request

  async updateQuantity(lineIndex, newQty) {
    // 1. Optimistic update — fires immediately, 0 ms perceived
    this.#applyOptimistic(lineIndex, newQty);

    // 2. Cancel any pending request (rapid taps → one network call)
    this.#controller?.abort();
    this.#controller = new AbortController();

    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line: lineIndex,
          quantity: newQty,
          sections: 'cart-drawer,cart-icon-bubble', // only these two — HARD RULE
        }),
        signal: this.#controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        // Out of stock / inventory cap — roll back optimistic state
        this.#rollback();
        this.#announceError(data.description);
        return;
      }

      // 3. Morph — preserve focus, scroll position, and app-injected nodes
      this.#morph(data.sections['cart-drawer']);
      document.querySelector('#cart-icon-bubble')
              ?.morph(data.sections['cart-icon-bubble']);

      // 4. Update in-memory state from server truth
      this.#cart = data;

      // 5. Notify apps
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: data }));

    } catch (err) {
      if (err.name === 'AbortError') return; // superseded by a newer tap
      this.#rollback();
    }
  }

  #applyOptimistic(lineIndex, newQty) {
    const line = this.#cart.items[lineIndex - 1];
    if (!line) return;
    const delta = newQty - line.quantity;
    line.quantity = newQty;
    line.line_price = line.price * newQty;
    this.#cart.total_price += delta * line.price;
    this.#cart.item_count += delta;
    this.#renderOptimisticUpdate(lineIndex, line);
  }

  #renderOptimisticUpdate(lineIndex, line) {
    // Update only the affected number nodes — no full re-render
    this.querySelector(`[data-line-index="${lineIndex}"] .line-quantity`)
        ?.textContent = line.quantity;
    this.querySelector(`[data-line-index="${lineIndex}"] .line-price`)
        ?.textContent = Shopify.formatMoney(line.line_price);
    this.querySelector('.cart-subtotal')
        ?.textContent = Shopify.formatMoney(this.#cart.total_price);
    this.querySelector('.free-shipping-bar')
        ?.setAttribute('data-cart-total', this.#cart.total_price);
  }

  #rollback() {
    // Re-render from the last known-good server state
    // (morph from the previous server HTML stored in #cart.sections)
  }
}
customElements.define('cart-drawer', CartDrawer);
```

**Add-to-cart pattern (from PDP)**

```javascript
// component-product-form.js
async addToCart(variantId, quantity) {
  // 1. Open drawer immediately with skeleton line item (0 ms wait)
  cartDrawer.openWithSkeleton();

  const response = await fetch('/cart/add.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ id: variantId, quantity }],
      sections: 'cart-drawer,cart-icon-bubble', // HARD RULE: only 2 sections
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    cartDrawer.showError(data.description);
    return;
  }

  // 2. Morph skeleton → real content
  cartDrawer.morph(data.sections['cart-drawer']);
  document.dispatchEvent(new CustomEvent('cart:updated', { detail: data }));
}
```

**Liquid section structure (`sections/cart-drawer.liquid`)**

```liquid
{%- comment -%}
  cart-drawer: HARD RULE — the complete section.
  Build all sub-features here in Liquid so zero extra requests fire
  after the drawer opens: free-shipping bar, upsell slot, discount code,
  cart note, line-item properties — all server-rendered on Section Rendering.
{%- endcomment -%}

<cart-drawer id="CartDrawer" class="cart-drawer" role="dialog"
             aria-modal="true" aria-label="{{ 'cart.title' | t }}"
             hidden>

  <div class="cart-drawer__overlay" aria-hidden="true"></div>

  <div class="cart-drawer__panel" tabindex="-1">

    {%- comment -%} Free-shipping progress — built in Liquid, zero app needed {%- endcomment -%}
    {%- assign threshold = section.settings.free_shipping_threshold | times: 100 -%}
    {%- if threshold > 0 -%}
      {%- render 'free-shipping-bar', cart: cart, threshold: threshold -%}
    {%- endif -%}

    {%- if cart == empty -%}
      {%- render 'cart-empty-state' -%}
    {%- else -%}
      <ul class="cart-drawer__items" role="list" aria-live="polite" aria-label="{{ 'cart.items' | t }}">
        {%- for item in cart.items -%}
          <li class="cart-item" data-line-index="{{ forloop.index }}">
            {%- render 'cart-line-item', item: item, index: forloop.index -%}
          </li>
        {%- endfor -%}
      </ul>

      {%- comment -%} Single upsell slot from Shopify recommendations — zero app needed {%- endcomment -%}
      {%- if section.settings.show_upsell and recommendations.performed -%}
        {%- render 'cart-upsell', product: recommendations.products.first -%}
      {%- endif -%}

      <div class="cart-drawer__footer">
        {%- comment -%} Discount code — no app needed {%- endcomment -%}
        {%- if section.settings.show_discount_input -%}
          {%- render 'cart-discount-input' -%}
        {%- endif -%}

        <div class="cart-drawer__totals">
          <p class="cart-subtotal">{{ cart.total_price | money }}</p>
          <p class="cart-drawer__tax-note">{{ 'cart.taxes_and_shipping' | t }}</p>
        </div>

        <a href="{{ routes.checkout_url }}" class="button button--primary cart-drawer__checkout">
          {{ 'cart.checkout' | t }}
        </a>
      </div>
    {%- endif -%}

  </div>
</cart-drawer>

{% schema %}
{
  "name": "Cart drawer",
  "settings": [
    { "type": "number", "id": "free_shipping_threshold", "label": "Free shipping threshold (0 = off)", "default": 0 },
    { "type": "checkbox", "id": "show_discount_input", "label": "Show discount code field", "default": true },
    { "type": "checkbox", "id": "show_upsell", "label": "Show product upsell", "default": false }
  ]
}
{% endschema %}
```

**CSS rules (non-negotiable)**

```css
/* Open/close: transform only — never left/right/top position (causes layout) */
.cart-drawer__panel {
  transform: translateX(100%);
  transition: transform 0.3s ease;
  contain: layout paint;          /* isolate reflows to the drawer */
}

.cart-drawer[open] .cart-drawer__panel {
  transform: translateX(0);
}

/* No will-change while idle — only while animating */
.cart-drawer[data-animating] .cart-drawer__panel {
  will-change: transform;
}

/* Prevent layout-triggering on update — morph only touches text nodes + data-attrs */
.cart-item {
  contain: layout;
}

/* Recommendations block below fold — defer paint cost */
.cart-drawer__upsell {
  content-visibility: auto;
  contain-intrinsic-size: 0 120px;
}

@media (prefers-reduced-motion: reduce) {
  .cart-drawer__panel {
    transition: none;
  }
}
```

**Performance targets for the cart drawer**

| Metric | Target | Measured how |
|---|---|---|
| Drawer open (closed → visible) | < 100 ms | `performance.measure()` from click to `transitionend` |
| Quantity change (tap → DOM settled) | < 50 ms perceived / < 400 ms reconciled | DevTools Performance panel, measure from pointerup |
| Add to cart (tap → drawer shows) | < 100 ms (skeleton) + < 400 ms (real content) | Network + Performance panel |
| Drawer JS total (gz) | ≤ 10 KB | DevTools Coverage tab |
| CLS during cart update | 0 | Layout Shifts track in Performance panel |
| Cart apps installed on GrowMore stores after launch | 0 | Shopify admin — Apps |

**Bug surface: where optimistic UI goes wrong**
- **Inventory cap**: user taps +5 on an item with only 3 left. Optimistic update shows 5 + shows higher subtotal. Server returns `422`. Must roll back both the line quantity and the subtotal simultaneously.
- **Subscription / Appstle selling plans**: line price includes discount; optimistic calculation of `line.price × qty` is wrong. Do not optimistically update price on subscription lines — update quantity only and wait for server.
- **Discount codes that change on quantity thresholds** (e.g. 10% off orders over $100): optimistic subtotal may cross the threshold. Don't optimistically update the discount line — reconcile from server.
- **Gift cards**: `line.price` is 0 for a gift-card redemption line item. Guard `price × qty` calculation against 0-price lines.
- **Rapid +/+/+/- taps**: `AbortController` coalesces these into one request. The quantity shown optimistically must match what the last non-aborted request will send — track the latest intended quantity in a variable, not the number of clicks.

**Definition of Done — cart drawer**
- [ ] Drawer opens in < 100 ms with zero network requests.
- [ ] Quantity ± fires one `/cart/change` request per coalesced tap sequence.
- [ ] Optimistic update fires before the request; rollback fires on any non-2xx or inventory error.
- [ ] DOM morph preserves focus and scroll position on every update.
- [ ] `cart:updated` dispatched on `document` with full cart JSON after every successful mutation.
- [ ] Zero cart apps installed — free-shipping bar, upsell, discount code, cart note all in Liquid.
- [ ] Drawer passes all accessibility checklist items: `role="dialog"`, `aria-modal="true"`, focus trap on open, focus returned to trigger on close, `aria-live` region for quantity/stock errors.
- [ ] `prefers-reduced-motion` disables the slide animation.
- [ ] All optimistic edge cases (inventory cap, subscription lines, discount thresholds, gift cards) covered by unit tests or manual test script.
- [ ] Appstle, Loox, Klaviyo, and any active upsell app verified working inside the drawer on a staging store.

---

#### The Shopify Platform (general performance behavior)

**Why it matters** — knowing what Shopify already does for you prevents duplicating effort (or fighting the platform) in your theme code.

**Do**
- Rely on the Shopify CDN (built on Cloudflare) for automatic minification and Brotli/gzip compression, and HTTP/3 + TLS 1.3 transport.
- Use Liquid filters (`asset_url`, `image_url`) rather than hardcoding `cdn.shopify.com` URLs — asset URLs follow the `/cdn` path pattern (e.g. `/cdn/shop/files/hero.jpg`) to maximize connection reuse.
- Use CSS `url({{ 'bg.gif' | asset_url }})` syntax so background images get automatic cache-busting versioning.
- Rely on Shopify's automatic minification of CSS and valid ES5 JavaScript — files are only served unminified if the minified version would be *larger*, or if the filename already ends in `.min.js` / `.min.css`.
- Rely on Shopify's own Speculation Rules injection in supporting browsers (see above) rather than reinventing it.
- Rely on the bundled `es-module-shims` polyfill for import-map compatibility — avoid loading a separate/duplicate polyfill, which can conflict.

**Don't**
```css
/* ❌ Incorrect: no cache-busting, hardcoded filename */
background: url(bg.gif);
```
```css
/* ✅ Correct */
background: url({{ 'bg.gif' | asset_url }});
```
- Don't expect immediate image cache invalidation without the `v=<number>` query parameter — without it, changes can take a day or more to show. Only the `v=<number>` format busts cache; arbitrary timestamps/param names do not.
- Don't be surprised by minification stripping `debugger` statements when troubleshooting — temporarily rename the file to `.min.js`/`.min.css` to see the original, unminified code served instead.

**Caveats / thresholds**
- Pagination is capped at **25,000 objects**. A count query on a larger set returns `25,001` to signal "more than the cap" rather than an exact count.

---

#### Optimize Checkout UI Extensions

**Why it matters**
Each checkout UI extension adds network requests, JS execution time, and potentially DOM nodes — and an unused extension still initializes on load even if it renders nothing, silently costing LCP/INP budget. Applies to Shopify Plus merchants using checkout UI extensions.

**Two key timing signals**
- `extension_visible` — when the extension's content becomes visible (LCP-relevant).
- `extension_buyer_usable` — when the extension's content accepts input (INP-relevant).

**Do — audit workflow**
1. Identify the slowest extensions:
   - Test on a real checkout, not the editor, in incognito mode.
   - Use Chrome DevTools with cache disabled and Slow 4G throttling.
   - Filter the Network panel by "extensions", sort by Size and Time.
   - Record a Performance panel trace to identify LCP candidates.
2. Triage each slow extension:
   - Late-appearing content → LCP problem → fix first.
   - Visible but unresponsive → INP problem → main-thread work issue.
   - Never appears → remove it.
3. Remove unused extensions: Settings > Checkout > Customize → find extensions with no active surface assignment.
4. Consolidate overlapping extensions (e.g. two separate trust-badge apps serving the same purpose).
5. Share timing data with each extension's developers — they control bundle size and render logic.

**Do — rank extension assets by weight (paste into DevTools console)**
```javascript
console.table(
  performance
    .getEntriesByType('resource')
    .filter((entry) => entry.name.includes('/extensions/'))
    .map((entry) => ({
      asset: entry.name.split('?')[0].split('/').slice(-2).join('/'),
      transferKB: Math.round(entry.transferSize / 1024),
      decodedKB: Math.round(entry.decodedBodySize / 1024),
      startedAtMs: Math.round(entry.startTime),
      durationMs: Math.round(entry.duration),
    }))
    .sort((first, second) => second.decodedKB - first.decodedKB),
);
```

**Don't**
- Don't leave extensions installed with no active surface assignment.
- Don't run duplicate-purpose extensions side by side.
- Don't target Checkout with an extension that's only valuable on the Thank You / Order Status page.
- Don't request the `network_access` capability unless it's demonstrably necessary.

**Quarterly audit checklist (per the doc)**
- Every installed extension is assigned to an active surface.
- No duplicate functionality across extensions.
- No checkout-page targets on extensions only valuable on Thank You/Order Status pages.
- `network_access` capability requested only when demonstrably necessary.

---

#### Templates, Sections, and Blocks — Structure Best Practices

(Source: https://shopify.dev/docs/storefronts/themes/best-practices/templates-sections-blocks — related, non-network but structural best practice referenced alongside section-rendering/section.index guidance.)

**Why it matters**
Sections are page-level components merchants can add, remove, and reorder, controlling theme settings scoped to that section's layout and content. Blocks operate within a section. Getting the block/section boundary and layout strategy wrong creates either rigid layouts that break under merchant customization, or cluttered settings UIs.

**Do**
- Use sections for layout- and content-scoped settings for a whole page area.
- Use blocks to add, remove, or reorder content within a section, or when it improves usability of that section.
- Use one of three deliberate block layout strategies:
  1. Vertical stacking for hierarchical text content.
  2. Horizontal stacking with wrapping for non-hierarchical content.
  3. Adaptive grids that respond to whichever block types are actually present.
- Group related settings/attributes together within a block to avoid clutter.
- Use theme settings for look-and-feel options, and Shopify's standard metafields as dynamic sources that update to reflect their context.
- Include app blocks in sections that have a clear use case for layering additional conversion tools — but verify the layout stays robust when unexpected block types are dropped in.

**Don't**
- ❌ Don't squeeze blocks to fit narrow viewports.
- ❌ Don't rely on a specific block sequence/order to determine grid layout.
- ❌ Don't create overly granular blocks — grouping related attributes prevents settings clutter.
- ❌ Don't create too many blocks/options in the name of flexibility — balance simplicity and flexibility.

---

### Quick checklist

- Limit manual `<link rel="preload">` hints to one or two proven, late-discovered resources — Shopify already auto-preloads up to 10 render-blocking assets via `Link` headers.
- Prefer the Liquid `preload_tag` / `stylesheet_tag: preload: true` / `image_tag: preload: true` filters to get HTTP 103 Early Hints instead of manual `<link>` tags.
- Never preload an asset that's already referenced in the initial HTML — the preload scanner already finds it.
- Only add `<link rel="preconnect">` for origins Shopify can't see in the rendered `<head>` (late JS-injected origins, font files loaded from inside CSS).
- Never preconnect to `cdn.shopify.com`, your own domain, or other Shopify domains — the platform already handles these.
- Add `crossorigin` to a preconnect hint only for CORS-fetched resources (fonts, `fetch()`); split into two hints if a domain serves both CORS and non-CORS assets.
- Use `dns-prefetch` instead of `preconnect` for lower-priority third-party domains.
- Verify Shopify's automatic preconnect/preload via the `Link` response header in DevTools before adding your own.
- Add custom `<script type="speculationrules">` rules only for high-confidence links, choosing `prefetch` vs `prerender` and an eagerness level (`immediate` > `eager` > `moderate` > `conservative`) deliberately — Shopify's own default is `prefetch` at `conservative`.
- Handle cart/state staleness yourself for anything beyond cart changes when using `prerender` (Shopify only sends `Clear-Site-Data` for cart changes).
- Serve all theme assets and merchant images from the Shopify CDN via `asset_url` / `image_url` / `image_tag` — never hardcode third-party asset CDNs.
- Always let `asset_url` append its `v=<number>` cache-busting parameter — no other parameter format busts the CDN cache.
- Remove or narrowly scope any request proxy in front of the storefront; if unavoidable, cap HTML cache TTL to 5 minutes and never proxy cart/API paths.
- Use `dig` and header comparisons (`x-cache`, `via`, `cf-ray`, `cf-cache-status`, `age`) to detect a hidden proxy — remember Shopify's own CDN already uses Cloudflare, so `cf-ray` alone proves nothing.
- Use `{% unless section.index > 2 %}` (not `{% if section.index <= 2 %}`) so a `nil` `section.index` in the theme editor is treated as above-the-fold, not lazy-loaded.
- Test `section.index`-driven logic on the live storefront, not just the theme editor, since the editor can report `section.index` as `nil`.
- Batch Section Rendering API requests to 5 or fewer section IDs per `?sections=` call — a 6th section triggers `400 Bad Request`.
- Read section IDs from `{{ section.id }}` or the `shopify-section-<id>` wrapper — never hardcode them, since JSON-template sections get dynamic IDs.
- Remember `?sections=` returns `null` (inside a `200`) for a missing/failed section, while `?section_id=` returns a `404` — handle each failure mode differently.
- Re-bind behavior via event delegation on an unreplaced ancestor, since `<script>` tags in Section Rendering API responses never execute via `innerHTML`/`DOMParser`/`replaceWith`.
- Audit checkout UI extensions quarterly: remove ones with no active surface, consolidate duplicate-purpose extensions, and request `network_access` only when demonstrably necessary.
- Distinguish LCP-type checkout extension problems (`extension_visible`, late-appearing) from INP-type problems (`extension_buyer_usable`, visible-but-unresponsive) before optimizing.
- Keep section/block boundaries clean: sections own page-level layout settings, blocks own reorderable content within a section — avoid over-granular blocks and rigid block-order-dependent grids.


---

