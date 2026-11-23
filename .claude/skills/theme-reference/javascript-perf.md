---
description: Deep reference for JavaScript INP/TBT: deferring, interaction-loading, import maps, web components, third-party scripts, long-task chunking, observers. Load when writing or reviewing non-trivial JS — not for simple edits (use rules/javascript.md).
---

> **Examples are illustrative.** When copying code: use the canonical srcset widths, eager/lazy cut-off and breakpoints from AGENTS.md, `const` + `for...of` instead of `var`/`forEach`, the canonical breakpoints in `rules/css.md` (750/990/1024px in examples are Dawn values). Constants win; report any contradicting line you find.


## Part 3 — JavaScript (INP, TBT, main-thread work)

Source: https://shopify.dev/docs/storefronts/themes/best-practices/performance/

---

#### Remove or Optimize Apps Causing Render-Blocking Issues

**Why it matters:** Render-blocking JS/CSS from third-party apps delays First Contentful Paint (FCP) and LCP. The Web Almanac 2022 third parties chapter reports an average median blocking time of **1.4 seconds** across the 10 most popular third parties.

**Do**
- Prefer native theme/metafield alternatives to app widgets (e.g. render a star rating from a metafield instead of loading a reviews app's JS/CSS).
- Defer non-critical app scripts with a facade pattern — load the real widget only after user interaction or a timeout.
- Load app assets conditionally, scoped to the templates/products that actually need them.
- Target: 500ms+ improvement in Start Render time; remove resources blocking >500ms first.

**Don't**
- Don't load app CSS/JS synchronously in `<head>` for widgets like chat, reviews, or email capture that aren't needed immediately.
- Don't keep unused/duplicate apps installed "just in case."

Common culprits: chat widgets (Intercom, Drift, Zendesk Chat), review apps (Yotpo, Judge.me, Loox), email capture (Klaviyo, Privy, Justuno), analytics (Google Analytics, Facebook Pixel, Hotjar), A/B testing (Optimizely, VWO), recommendation engines (LimeSpot, Wiser, Nosto).

❌ Before — synchronous loading:
```html
<!-- Yotpo reviews loading synchronously -->
<link rel="stylesheet" href="https://staticw2.yotpo.com/widget.css">
<script src="https://staticw2.yotpo.com/widget.js"></script>
<!-- Blocks rendering by 450 ms -->
```

✅ After — native alternative:
```liquid
{% if product.metafields.reviews.rating.value != blank %}
  <div class="product-rating">
    <span class="stars">
      {{ product.metafields.reviews.rating.value.rating }} out of
      {{ product.metafields.reviews.rating.value.scale_max }}
    </span>
  </div>
{% endif %}
<!-- No render blocking, instant display -->
```

✅ Defer with facade pattern (e.g. chat widget):
```html
<div id="chat-facade" onclick="loadIntercom()">
  <svg class="chat-icon"><!-- icon --></svg>
</div>
<script>
  var intercomLoaded = false;
  function loadIntercom() {
    if (intercomLoaded) return;
    intercomLoaded = true;
    var script = document.createElement('script');
    script.src = 'https://widget.intercom.io/widget/{app_id}';
    document.head.appendChild(script);
  }
  setTimeout(loadIntercom, 10000);
</script>
```

✅ Conditional loading (product pages only):
```liquid
{% if template.name == 'product' and product.type == 'Apparel' %}
  <link rel="stylesheet" href="{{ 'size-chart.css' | asset_url }}" media="print" onload="this.media='all'">
  <script src="{{ 'size-chart.js' | asset_url }}" defer></script>
{% endif %}
```

Priority framework:
- **High priority (remove):** unused apps, duplicates, or blocking >500ms
- **Medium priority (optimize):** occasionally-used apps with async options
- **Low priority (optimize only):** business-critical apps with <100ms blocking

Testing: Lighthouse; target 500ms+ Start Render improvement and 10-20% Core Web Vitals improvement.

---

#### Audit and Remove Third-Party Scripts

**Why it matters:** Third-party scripts degrade performance via cumulative main-thread blocking — "death by a thousand cuts": marketing adds a tracking pixel, a developer adds analytics, a merchant installs an app. Affects **INP** (blocks responsiveness during interactions), **FCP** (render-blocking scripts delay first paint), **LCP** (scripts delay resource discovery/image/text rendering), and **TBT** (long tasks increase Total Blocking Time).

**Do**
1. Run Lighthouse Treemap to inventory all JavaScript by origin and size. Use Chrome DevTools Coverage tab to identify unused code (red bars = downloaded but unexecuted).
2. Verify necessity with stakeholders. Common bloat: duplicate analytics, A/B testing tools, chat widgets, review apps, email capture dialogs, social embeds, marketing pixels.
3. After uninstalling an app, confirm complete removal:
   - Search theme files for the app's name/domain
   - Check `snippets/` for app-created files
   - Search for `{% render %}` or `{% include %}` references
   - View page source to confirm the script no longer loads
4. Load any remaining necessary scripts conditionally via Liquid.
5. Evaluate trade-offs — consolidate similar apps, find lighter alternatives, weigh business value vs. performance cost.

**Don't**
- Don't assume an uninstalled app is fully gone — check snippets and render/include references left behind in theme code.
- Don't load third-party scripts unconditionally on every template.

✅ Conditional loading by template:
```liquid
{% if template.name == 'product' %}
  <script src="https://reviews.example.com/widget.js" defer></script>
{% endif %}
```

✅ Delayed loading on scroll (excluding cart template):
```liquid
{% if template.name != 'cart' %}
  <script>
    window.addEventListener('scroll', function() {
      var s = document.createElement('script');
      s.src = 'https://chat.example.com/widget.js';
      document.head.appendChild(s);
    }, { once: true });
  </script>
{% endif %}
```

Testing tools: Lighthouse Treemap, Chrome DevTools Coverage tab, Chrome DevTools Network Request Blocking, Chrome DevTools Performance panel (Bottom-Up view), multiple Lighthouse audits using median scores.

---

#### Use `defer` and `async` on Non-Critical Scripts

**Why it matters (FCP / LCP):** Scripts without `defer` or `async` halt HTML parsing, delaying rendering and blocking resource discovery. Adding these attributes lets parsing continue while scripts download.

**Do**
- Use `defer` for theme scripts that depend on the DOM or on each other — downloads in background, executes in document order after HTML parsing, and maintains execution order.
- Use `async` for independent third-party scripts (analytics, tracking pixels) — downloads and executes immediately on completion, with no guaranteed execution order.
- Compare FCP/LCP before and after.

**Don't**
- Don't defer/async A/B testing anti-flicker snippets (they must stay synchronous to prevent content flash).
- Don't defer/async scripts that modify above-the-fold content (risk of layout shift).

❌ Before — synchronous, blocking:
```html
<head>
  <script src="{{ 'vendor.js' | asset_url }}"></script>
  <script src="{{ 'theme.js' | asset_url }}"></script>
</head>
```

✅ After — deferred, parallel:
```html
<head>
  <script src="{{ 'vendor.js' | asset_url }}" defer></script>
  <script src="{{ 'theme.js' | asset_url }}" defer></script>
</head>
```

Testing: Chrome DevTools Network panel (waterfall view), Performance panel Insights tab ("Render blocking requests"), before/after FCP and LCP comparison.

---

#### Load JavaScript on User Interaction

**Why it matters (INP):** Loading code only when the user shows intent to use a feature keeps the initial bundle small, enables faster page load, improves INP scores, and makes features feel instant.

**Do**
- Use dynamic `import()` inside event listeners to defer loading until interaction.
- Trigger loading on: click (most common), hover/focus (intent signal), visibility/scroll via `IntersectionObserver`, or idle time via `requestIdleCallback`/`setTimeout`.
- Preload on hover/intent so execution on click feels instant.
- Defer expensive Liquid-driven dialog content until the dialog actually opens.

**Don't**
- Don't ship all interactive feature code in the initial bundle if it's only needed after a click/hover/scroll.

✅ Click-based dynamic import (pattern):
```javascript
button.addEventListener('click', async () => {
  const { initChatWidget } = await import('./chat-widget.js');
  initChatWidget();
});
```

✅ Preload on hover, execute on click (pattern):
```javascript
let modulePromise;
button.addEventListener('mouseenter', () => {
  modulePromise = modulePromise || import('./feature.js');
});
button.addEventListener('click', async () => {
  const mod = await (modulePromise || import('./feature.js'));
  mod.init();
});
```

✅ IntersectionObserver-triggered load (pattern):
```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      import('./below-fold-widget.js').then((mod) => mod.init());
      observer.unobserve(entry.target);
    }
  });
});
observer.observe(document.querySelector('#below-fold-widget'));
```

✅ Idle-time load with fallback (pattern):
```javascript
function loadWhenIdle(callback) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback);
  } else {
    setTimeout(callback, 1);
  }
}
loadWhenIdle(() => import('./non-critical.js').then((mod) => mod.init()));
```

Testing: Chrome DevTools Performance panel (check Scripting time), Coverage tool (identify unused JavaScript), Network panel (verify interaction-triggered loads), user testing to confirm functionality.

Related: "Defer dialog content loading", "Use import maps for modules".

---

#### Remove A/B Test Anti-Flicker Snippets When No Tests Are Running

**Why it matters (FCP / LCP):** The anti-flicker snippet is synchronous JavaScript that blocks rendering by hiding content until the testing script loads — commonly adding **2+ seconds** to FCP and harming LCP.

**Do**
- Add a theme setting to fully remove the anti-flicker code when no active test is running.
- After a test completes: close the test in the testing platform, verify the anti-flicker code is automatically disabled, and confirm the performance cost is removed.
- Consider server-side A/B testing, since content then arrives pre-rendered with the correct variant — eliminating the anti-flicker performance cost entirely.

**Don't**
- Don't leave the anti-flicker/testing snippet permanently enabled once a test has ended.

✅ Theme setting to gate the snippet:
```json
{
  "name": "Third parties",
  "settings": [
    {
      "type": "checkbox",
      "id": "enable_vwo",
      "label": "Enable VWO Async SmartCode (for A/B testing)",
      "default": false
    }
  ]
}
```

✅ Conditional inclusion:
```liquid
{% if settings.enable_vwo %}
  <script>
    // VWO Async SmartCode
  </script>
{% endif %}
```

Testing: Chrome DevTools Performance panel to measure FCP delay; compare metrics with anti-flicker enabled vs. disabled; check Real User Monitoring (RUM) data for actual user impact.

---

#### Defer Non-Critical Resources (CSS & JS)

**Why it matters (FCP / LCP):** Be strategic about render-blocking resources — defer non-critical JS with `async`/`defer` and non-critical CSS with the async-CSS pattern, while keeping critical above-the-fold CSS render-blocking to avoid Flash of Unstyled Content (FOUC).

**Do**
- Use `section.index` (or similar) to conditionally defer below-the-fold section styles.
- Keep critical/above-fold CSS synchronous.
- Add manual `<script defer>` tags for theme JS — note the `script_tag` Liquid filter does **not** support `defer` or `async`.

**Don't**
- Don't defer `content_for_header` (Shopify-injected — not under your control).
- Don't expect to defer app scripts injected via the ScriptTag API (controlled by the app developer).
- Don't defer A/B testing anti-flicker snippets — they must load synchronously.
- Don't use the `script_tag` filter when you need `defer`/`async` — write the `<script>` tag manually.

✅ Deferred CSS for below-fold sections:
```liquid
{%- if section.index > 2 -%}
  <link rel="stylesheet" href="{{ 'section-styles.css' | asset_url }}" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="{{ 'section-styles.css' | asset_url }}"></noscript>
{%- else -%}
  {{ 'section-styles.css' | asset_url | stylesheet_tag }}
{%- endif -%}
```

✅ Deferred JS with manual `<script>` tag:
```html
<script src="{{ 'theme-interactions.js' | asset_url }}" defer></script>
```

Testing: Chrome DevTools Performance panel ("Render blocking requests"), Network panel resource waterfall, before/after FCP comparison, visual check for FOUC or layout shifts.

---

#### Debounce, Throttle, and Optimize Event Handlers

**Why it matters (INP / long tasks / responsiveness):** Unthrottled/undebounced handlers and layout thrashing (interleaved DOM reads/writes) create long tasks and janky visual updates that hurt INP.

**Do**
- **Debounce** for search inputs, resize handlers, form validation — delay execution until user action stops.
- **Throttle** for scroll handlers, mouse-move tracking, resize events — limit execution frequency.
- Use passive event listeners (`{ passive: true }`) for `touchstart`/`wheel`/`scroll` so the browser isn't blocked waiting to see if you'll call `preventDefault()`.
- Batch visual updates with `requestAnimationFrame`.
- Break up long synchronous tasks by yielding back to the browser between chunks — use `scheduler.yield()` when available, falling back to `setTimeout(resolve, 0)`.
- Defer non-critical work (URL updates via `history.pushState`/`replaceState`, analytics calls, non-visual state, third-party script triggers) with a yield callback so it doesn't block the critical interaction response.
- Batch DOM reads together, then batch DOM writes together, to avoid forced synchronous reflow (layout thrashing) — reported improvements of **300+ ms** on complex pages with multiple interactive components.
- Gate `:hover` styles behind `@media (hover: hover)` so touch devices don't pay for hover-triggered animations on tap.
- Offload expensive computation to a Web Worker.

**Don't**
- Don't attach non-passive listeners for `touchstart`/`wheel` if you don't need to call `preventDefault()`.
- Don't mutate styles directly inside a raw `scroll` handler without `requestAnimationFrame` batching.
- Don't run large synchronous loops (e.g. 10,000 iterations) directly inside a click handler.
- Don't interleave reads (`offsetWidth`, etc.) and writes (`style.x = ...`) in the same pass — it forces repeated reflow.
- Don't apply `:hover` styles unconditionally — they can trigger expensive animations on mobile taps.

Debounce utility:
```javascript
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const searchInput = document.querySelector("#search");
const debouncedSearch = debounce((event) => {
  performSearch(event.target.value);
}, 300);
searchInput.addEventListener("input", debouncedSearch);
```

Throttle utility:
```javascript
function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

const throttledScroll = throttle(() => {
  updateScrollPosition();
}, 100);
window.addEventListener("scroll", throttledScroll);
```

❌ Non-passive listener blocks browser optimization:
```javascript
document.addEventListener("touchstart", handleTouch);
```

✅ Passive listener enables optimization:
```javascript
document.addEventListener("touchstart", handleTouch, { passive: true });
document.addEventListener("wheel", handleWheel, { passive: true });
```

❌ Updates on every scroll event:
```javascript
window.addEventListener("scroll", () => {
  element.style.transform = `translateY(${window.scrollY}px)`;
});
```

✅ Batched with `requestAnimationFrame`:
```javascript
let ticking = false;
window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        element.style.transform = `translateY(${window.scrollY}px)`;
        ticking = false;
      });
      ticking = true;
    }
  },
  { passive: true }
);
```

❌ Long synchronous task blocks main thread:
```javascript
button.addEventListener("click", () => {
  for (let i = 0; i < 10000; i++) {
    processItem(i);
  }
});
```

✅ Yield to browser between chunks:
```javascript
button.addEventListener("click", async () => {
  const chunkSize = 50;
  for (let i = 0; i < 10000; i += chunkSize) {
    for (let j = i; j < Math.min(i + chunkSize, 10000); j++) {
      processItem(j);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
});
```

✅ Best — use `scheduler.yield()` when available:
```javascript
button.addEventListener("click", async () => {
  const chunkSize = 50;
  for (let i = 0; i < 10000; i += chunkSize) {
    for (let j = i; j < Math.min(i + chunkSize, 10000); j++) {
      processItem(j);
    }
    if ("scheduler" in window && "yield" in scheduler) {
      await scheduler.yield();
    } else {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
});
```

❌ URL update blocks interaction:
```javascript
function handleVariantChange(variant) {
  updateProductDisplay(variant);
  updateURL(variant.url); // Triggers tracking pixels
}
```

✅ Defer non-critical updates:
```javascript
function requestYieldCallback(callback) {
  requestAnimationFrame(() => {
    setTimeout(callback, 0);
  });
}

function handleVariantChange(variant) {
  updateProductDisplay(variant); // Critical
  requestYieldCallback(() => {
    updateURL(variant.url); // Non-critical
  });
}
```

**When to use this yield pattern:** URL updates (`history.pushState`, `history.replaceState`), analytics tracking calls, non-visual state updates, and operations triggering third-party scripts.

❌ Multiple reflows (read-write-read-write):
```javascript
function initSlideshow() {
  const width1 = element1.offsetWidth; // Read
  element1.style.left = "10px"; // Write
  const width2 = element2.offsetWidth; // Read (forces reflow)
  element2.style.left = "20px"; // Write
}
```

✅ Batch reads, then writes:
```javascript
function initSlideshow() {
  requestAnimationFrame(() => {
    const width1 = element1.offsetWidth;
    const width2 = element2.offsetWidth;
    const height1 = element1.offsetHeight;

    element1.style.left = "10px";
    element2.style.left = "20px";
    element1.style.top = `${height1 / 2}px`;
  });
}
```

**Impact:** improvements of 300+ ms on complex pages with multiple interactive components.

Layout-triggering properties (reads that force reflow): `offsetWidth`, `offsetHeight`, `offsetTop`, `offsetLeft`, `clientWidth`, `clientHeight`, `scrollWidth`, `scrollHeight`, `scrollTop`, `scrollLeft`, `getBoundingClientRect()`, `getComputedStyle()`.

❌ Hover styles trigger expensive animations on mobile taps:
```css
.header__icon:hover {
  opacity: 0.7;
}
```

✅ Applies only on hover-capable devices:
```css
@media (hover: hover) {
  .header__icon:hover {
    opacity: 0.7;
  }
}
```

✅ Web Worker for expensive computation:
```javascript
// worker.js
self.addEventListener("message", (e) => {
  const result = expensiveComputation(e.data);
  self.postMessage(result);
});

// main.js
const worker = new Worker("worker.js");
button.addEventListener("click", () => {
  worker.postMessage(inputData);
});
worker.addEventListener("message", (e) => {
  displayResults(e.data);
});
```

Real-world example — debounced product filter:
```javascript
const filterInput = document.querySelector("#product-filter");
const productGrid = document.querySelector("#products");

const debouncedFilter = debounce((query) => {
  const products = Array.from(productGrid.querySelectorAll(".product"));
  requestAnimationFrame(() => {
    products.forEach((product) => {
      const matches = product.textContent
        .toLowerCase()
        .includes(query.toLowerCase());
      product.style.display = matches ? "" : "none";
    });
  });
}, 200);

filterInput.addEventListener("input", (e) => {
  debouncedFilter(e.target.value);
});
```

Real-world example — throttled infinite scroll:
```javascript
const loadMore = throttle(() => {
  if (isNearBottom() && !loading) {
    fetchMoreProducts();
  }
}, 200);

window.addEventListener("scroll", loadMore, { passive: true });

function isNearBottom() {
  const scrollPosition = window.scrollY + window.innerHeight;
  const pageHeight = document.documentElement.scrollHeight;
  return scrollPosition > pageHeight - 1000;
}
```

Real-world example — parallax effect:
```javascript
const parallaxElements = document.querySelectorAll("[data-parallax]");
let ticking = false;

window.addEventListener(
  "scroll",
  () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        parallaxElements.forEach((el) => {
          const speed = el.dataset.parallax || 0.5;
          el.style.transform = `translateY(${scrollY * speed}px)`;
        });
        ticking = false;
      });
      ticking = true;
    }
  },
  { passive: true }
);
```

Testing tools: Chrome DevTools Performance panel, `web-vitals` library for INP debugging, Shopify Web Performance dashboards, CrUX field data.

Related links:
- https://web.dev/optimize-long-tasks/
- https://css-tricks.com/debouncing-throttling-explained-examples/
- https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#using_passive_listeners
- https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
- https://github.com/WICG/scheduling-apis/blob/main/explainers/yield-and-continuation.md
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/understanding-inp
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/audit-remove-third-party-scripts
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/defer-scripts
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/cancel-view-transitions-on-interaction

---

#### Cancel In-Progress View Transitions on User Interaction

**Why it matters (INP):** The View Transitions API creates smooth page transitions but can block rendering during navigation. If a user interacts during that blocked period, it causes significant INP delays.

**Do**
- Opt in to view transitions with the `@view-transition` CSS at-rule.
- Cancel an in-progress transition when the user interacts, by calling `viewTransition.skipTransition()`.
- Register the cancel listeners on `window`, not on the Navigation API object.
- Handle **both** `pageswap` (outgoing) and `pagereveal` (incoming) events.
- Use `{ once: true }` on the interaction listeners for automatic cleanup.
- Restrict view transitions to selective use cases: product navigation, image galleries, variant switching.
- Always check `window.matchMedia("(prefers-reduced-motion: reduce)").matches` for accessibility.

**Don't**
- Don't use view transitions for form submissions, checkout, or every navigation.
- Don't attach the cancel listeners to the Navigation API object instead of `window`.

✅ Opt-in with CSS:
```css
@view-transition {
  navigation: auto;
}
```

✅ Cancel on user interaction:
```javascript
function cancelOnInteraction(event) {
  const viewTransition = event.viewTransition;
  if (!viewTransition) return;

  ["pointerdown", "keydown"].forEach((eventType) => {
    document.addEventListener(
      eventType,
      () => {
        viewTransition.skipTransition();
      },
      { once: true }
    );
  });
}

window.addEventListener("pageswap", cancelOnInteraction);
window.addEventListener("pagereveal", cancelOnInteraction);
```

Browser support:
| Type | Chrome/Edge | Safari | Firefox |
|------|-------------|--------|---------|
| Cross-document | 126+ | 18.2+ | Not supported |
| Same-document | 111+ | 18+ | 144+ |

Selective use: ✅ product navigation, image galleries, variant switching. ❌ form submissions, checkout, every navigation.

---

#### Use Import Maps for Shared JavaScript Modules

**Why it matters (LCP / total JS weight):** Without import maps, multiple sections requiring the same utility module either bundle duplicate copies or depend on fragile relative paths. This increases total JavaScript weight and delays LCP by occupying the main thread.

**Do**
- Define a single `<script type="importmap">` in your layout, mapping bare specifiers to `asset_url` outputs.
- Import shared modules in section JS by bare specifier (e.g. `import { addToCart } from 'cart-api'`).
- Rely on Shopify's automatically-included `es-module-shims` polyfill for older-browser support.
- Use import maps when multiple sections share modules; use plain `<script>` tags for a single small script with no dependencies; use a bundler (Vite, webpack) for TypeScript, tree-shaking, or complex dependency graphs.

**Don't**
- Don't manually load your own `es-module-shims` — Shopify already includes it, and loading your own causes duplicate execution and version conflicts.

✅ Correct — define the import map once in the layout:
```liquid
<script type="importmap">
{
  "imports": {
    "cart-api": "{{ 'cart-api.js' | asset_url }}",
    "utils": "{{ 'utils.js' | asset_url }}"
  }
}
</script>
```

Then import by bare specifier in section scripts:
```javascript
import { addToCart } from 'cart-api';
import { formatMoney } from 'utils';
```

❌ Incorrect — manually loading the shim polyfill:
```html
<script async src="https://unpkg.com/es-module-shims@1.5.4/dist/es-module-shims.js"></script>
```

When to use which approach:
| Scenario | Approach |
|----------|----------|
| Multiple sections sharing modules | Import maps |
| Single small script, no dependencies | Traditional `<script>` tags |
| TypeScript, tree-shaking, complex graphs | Bundler (Vite, webpack) |

Testing: verify shared modules appear once in the Network tab's JS waterfall; confirm the polyfill loads automatically in page source; test in older browsers (Safari 16.3 or earlier) for compatibility.

---

#### Lazy DOM Rendering for Hidden Components

**Why it matters (INP):** Deferring DOM node creation for initially hidden components (filter panels, cart drawers, dialogs) until first user interaction reduces style recalculation costs and improves INP.

**Do**
- Store markup in a `<template>` element and clone/inject it into a placeholder only on first interaction.
- Yield between chunks when injecting components exceeding **1,000 nodes**.
- Alternatively, embed server-rendered HTML as an escaped string in a `data-html` attribute and swap it into `innerHTML` on interaction.
- Check `placeholder.dataset.html` (not `hasChildNodes()`) to decide whether content has already been injected — whitespace text nodes cause `hasChildNodes()` false positives.
- For heavier content, fetch the markup on demand via the Section Rendering API (`?sections=...`).
- Measure `document.querySelectorAll("*").length` before/after; target a 2,000+ node reduction on collection pages.

**Don't**
- Don't render full hidden components (filter panels, drawers, dialogs) into the DOM on initial page load if they may never be opened.
- Don't use `hasChildNodes()` to check whether a template has already been injected.

✅ Template element method:
```javascript
const placeholder = document.querySelector("#filter-panel-placeholder");
const template = document.querySelector("#filter-panel-template");

toggleButton.addEventListener("click", async () => {
  if (placeholder.children.length === 0) {
    const shell = template.content.cloneNode(true);
    placeholder.appendChild(shell);
    placeholder.hidden = false;
    // Initialize sections with optional yielding for large components
  }
});
```

✅ Data attribute method:
```javascript
const placeholder = document.querySelector("#filter-panel-placeholder");

toggleButton.addEventListener("click", () => {
  if (placeholder.dataset.html) {
    placeholder.innerHTML = placeholder.dataset.html;
    placeholder.removeAttribute("data-html");
    placeholder.hidden = false;
  }
});
```

✅ Section Rendering API method:
```javascript
cartIcon.addEventListener("click", async () => {
  if (!cartDrawerLoaded) {
    const response = await fetch(`${window.location.pathname}?sections=cart-drawer`);
    const data = await response.json();
    document.querySelector("#cart-drawer-placeholder").innerHTML = data["cart-drawer"];
    cartDrawerLoaded = true;
  }
});
```

Performance impact example: a collection page with 24 products plus a fully rendered filter panel can run 8,000+ DOM nodes → 4,500–5,000 nodes after deferral.

Related:
- https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template
- https://shopify.dev/docs/api/ajax/section-rendering
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/reduce-mega-menu-dom-overhead

---

#### Defer Dialog Content Loading Until User Interaction

**Why it matters (TTFB):** Dialogs, drawers, and expandable components that load content on every page request waste server resources even when never opened. A Horizon v2.1.4 optimization that removed an unguarded collection assignment "saved 400 ms on every page load" by preventing evaluation of `product.available` and related properties. Stores with high-variant products (1,000+ variants) can see **1-3+ seconds** of added time-to-first-byte from accessing unlimited collections.

**Do**
- Guard expensive Liquid operations inside dialogs/drawers with a conditional `load_content`/`load_empty_state`-style parameter so they don't run unless requested.
- Render the dialog **shell** on initial page load with the guard parameter set `false`.
- On user interaction, fetch a dedicated section via the Section Rendering API with the guard set `true`, then swap the returned markup into the page.
- Keep queries small even inside the guarded branch — use `limit` on loops.
- Use `{% paginate %}` for arrays like `blog.articles` that require limiting.
- Access only the variant data you need (e.g. `product.selected_or_first_available_variant`) instead of iterating all variants.
- Note: the `recommendations` object only populates when sections render via the Product Recommendations API endpoint, not a generic Section Rendering API request.

**Don't**
- Don't run unguarded `collections.all.products` (or similarly unbounded) Liquid assignments inside a dialog snippet that renders on every page load.
- Don't omit a `limit` on loops inside dialog content, even when guarded.

❌ Before optimization:
```liquid
<div class="predictive-search-empty-state">
  {% liquid
    assign products = settings.empty_state_collection.products | default: collections.all.products
    assign default_title = 'content.search_results_resource_products' | t
  %}
  {% if products.size > 0 %}
    {% render 'predictive-search-products-list',
      title: title,
      products: products,
      limit: 4
    %}
  {% endif %}
</div>
```
Problems: loads `collections.all.products` on every page; no loop limit on the initial fetch (defaults to 50 products); evaluates all variant data unnecessarily; adds 400+ ms to TTFB.

✅ After optimization:
```liquid
<div class="predictive-search-empty-state">
  {% if load_empty_state %}
    {% liquid
      assign collection = settings.empty_state_collection | default: collections.all
      assign default_title = 'content.search_results_resource_products' | t
      assign title = collection.title
    %}
    {% assign products = collection.products %}
    {% if products.size > 0 %}
      {% render 'predictive-search-products-list',
        title: title,
        products: products,
        limit: 4
      %}
    {% endif %}
  {% endif %}
</div>
```

✅ Reusable conditional-load snippet pattern:
```liquid
{% doc %}
@param {boolean} [load_content] - Whether to load modal content.
{% enddoc %}

{% if load_content %}
  {% liquid
    assign collection = settings.featured_collection | default: collections.all
    assign title = collection.title
  %}
  {%- for product in collection.products limit: 4 -%}
    {{ product.title }}
  {%- endfor -%}
{% endif %}
```

✅ Initial page load — render dialog shell only:
```liquid
<!-- sections/header.liquid -->
<button id="search-toggle">Search</button>
<div id="search-modal" hidden>
  {% render 'search-modal-content', load_content: false %}
</div>
```

✅ On interaction — fetch the loaded section via the Section Rendering API:
```javascript
searchToggle.addEventListener('click', async () => {
  if (!contentLoaded) {
    const response = await fetch('?sections=search-modal-loaded');
    const data = await response.json();
    const parser = new DOMParser();
    const doc = parser.parseFromString(data['search-modal-loaded'], 'text/html');
    const loadedContent = doc.querySelector('#search-modal');
    searchModal.replaceWith(loadedContent);
    searchModal = document.querySelector('#search-modal');
    contentLoaded = true;
  }
  searchModal.hidden = false;
});
```

Testing: measure TTFB before/after; use Theme Inspector to verify expensive operations don't execute on initial load; check the Network tab for Section Rendering API requests when dialogs open; test with realistic data (100+ variant products, 50+ product collections).

Related:
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/use-section-rendering-api
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-variant-overfetching
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/limit-pagination-depth

---

#### Defer Child Product Loading in Combined Listings

**Why it matters (TTFB):** Combined listings link a parent product to multiple child products. "A parent with 20 to 60 children can add seconds to TTFB, and including descriptions and full image sets for each child makes it worse."

**Do**
- Render option values up front using `product.options_with_values` and `product_option_value` — including availability state and `product_option_value.product_url` — without loading full child product data.
- Fetch child product data only when a buyer selects an option, via the Section Rendering API.
- Branch on `product_option_value.product_url` being `nil` vs. present, since there is no Liquid property that reports whether a product is a combined-listing parent or child.
- Remember the combined listing limits: up to 2,000 variants across all children; up to 60 child products per parent; a parent can have a maximum of three options.

**Don't**
- Don't loop over `product.variants` directly to build the option picker for a combined listing — this loads all variants upfront and silently caps at 250 variants, rendering incomplete pickers for large listings.

❌ Problematic pattern:
```liquid
{%- for variant in product.variants -%}
  {{ variant.title }}
  {{ variant.image }}
  {{ variant.price | money }}
{%- endfor -%}
```
Issue: loads all variants upfront; caps at 250 variants, silently rendering incomplete pickers for large listings.

✅ Recommended pattern — render option values with availability + product URLs:
```liquid
<div class="option-value-selectors" data-section-id="{{ section.id }}">
  {%- for option in product.options_with_values -%}
    <fieldset>
      <legend>{{ option.name }}</legend>
      {%- for option_value in option.values -%}
        <input
          id="{{ section.id }}-{{ option.position }}-{{ forloop.index0 }}"
          type="radio"
          name="{{ section.id }}-{{ option.name }}-{{ option.position }}"
          value="{{ option_value | escape }}"
          {% if option_value.selected %}checked{% endif %}
          {% unless option_value.available %}disabled{% endunless %}
          data-option-value-id="{{ option_value.id }}"
          data-product-url="{{ option_value.product_url }}"
          onchange="onOptionValueChange(event)"
        />
        <label for="{{ section.id }}-{{ option.position }}-{{ forloop.index0 }}">
          {{ option_value }}
        </label>
      {%- endfor -%}
    </fieldset>
  {%- endfor -%}
</div>
```

✅ Section Rendering API integration on option change:
```javascript
<script>
  function onOptionValueChange(event) {
    const selectors = event.target.closest('.option-value-selectors');
    const sectionId = selectors.dataset.sectionId;
    const productUrl = event.target.dataset.productUrl;
    const selectedOptionValues = Array.from(
      selectors.querySelectorAll('input[type="radio"]:checked')
    ).map(({dataset}) => dataset.optionValueId);

    const params = selectedOptionValues.length > 0
      ? `&option_values=${selectedOptionValues.join(',')}`
      : '';

    const basePath = productUrl || window.location.pathname;

    fetch(`${basePath}?section_id=${sectionId}${params}`)
      .then((response) => response.text())
      .then((responseText) => {
        const html = new DOMParser().parseFromString(responseText, 'text/html');
        document.getElementById(`product-info-${sectionId}`).innerHTML =
          html.querySelector('.product-info').innerHTML;
        selectors.innerHTML = html.querySelector('.option-value-selectors').innerHTML;
      });
  }
</script>
```

Key `product_option_value.product_url` semantics:
- Returns `nil` unless the current product is a combined listing parent.
- Returns `nil` for option values owned by child products.
- On the parent, its own options return sibling product URLs.
- Child-owned options return `nil` — treat that as a signal to update in place rather than navigate.

Combined listing specs: parent product is non-purchasable/display-only; child products are purchasable with separate inventory and URLs; limits are up to 2,000 variants across all children, up to 60 child products per parent, and up to 3 options on the parent. Combined listings are exclusive to Shopify Plus plans and online store only.

Testing: use Theme Inspector to check for child product queries inside nested loops; compare TTFB on parents with 20+ child products; verify sibling products load correctly via Ajax; confirm option values without `product_url` still update availability.

---

### Quick checklist

- Replace app widgets with native theme/metafield alternatives wherever possible.
- Defer non-critical app scripts behind a facade or a timeout instead of loading them synchronously.
- Scope app CSS/JS to only the templates/products that need them with Liquid conditionals.
- Audit all JS with Lighthouse Treemap and Chrome DevTools Coverage; remove or consolidate unused/duplicate scripts.
- Confirm full removal of uninstalled apps by searching theme files, `snippets/`, and page source.
- Add `defer` to theme scripts that depend on the DOM; add `async` to independent third-party scripts.
- Never defer/async A/B testing anti-flicker snippets or scripts that touch above-the-fold content.
- Load feature code with dynamic `import()` inside click/hover/`IntersectionObserver`/idle-time triggers instead of bundling it upfront.
- Gate A/B testing anti-flicker snippets behind a theme setting and disable them the moment a test ends.
- Defer below-the-fold CSS with the `media="print" onload="this.media='all'"` pattern; keep critical CSS synchronous.
- Write deferred `<script>` tags manually — the `script_tag` filter doesn't support `defer`/`async`.
- Debounce high-frequency input handlers (search, resize, validation) and throttle continuous handlers (scroll, mousemove).
- Add `{ passive: true }` to `touchstart`/`wheel`/`scroll` listeners that don't call `preventDefault()`.
- Batch visual DOM writes inside `requestAnimationFrame`, and batch all DOM reads before any writes to avoid layout thrashing.
- Break up long synchronous tasks with `scheduler.yield()` (or a `setTimeout(0)` fallback) between chunks.
- Defer non-critical work like URL updates and analytics calls off the critical interaction path.
- Wrap `:hover` styles in `@media (hover: hover)` so touch devices skip them.
- Offload expensive computation to a Web Worker.
- Cancel in-progress View Transitions on `pointerdown`/`keydown` via `viewTransition.skipTransition()`, listening on `window` for both `pageswap` and `pagereveal`.
- Respect `prefers-reduced-motion` before running view transitions; restrict transitions to product nav, galleries, and variant switching only.
- Share JS modules across sections with a single `<script type="importmap">` instead of bundling duplicates; never load your own `es-module-shims`.
- Keep hidden components (filter panels, drawers, dialogs) out of the DOM until first interaction, using `<template>`, a `data-html` attribute, or the Section Rendering API.
- Yield between chunks when injecting DOM subtrees larger than 1,000 nodes.
- Guard expensive Liquid inside dialogs/drawers with a `load_content`-style parameter, rendering only a shell on first load and fetching real content via the Section Rendering API on open.
- Never iterate `product.variants` directly for a combined listing's option picker — use `product.options_with_values` and fetch child data only on selection.


---

