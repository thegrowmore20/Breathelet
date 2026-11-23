---
description: Deep reference for mobile performance & UX: throttled testing, interstitials/interruptions, responsive layout, tap targets, viewport overflow, content parity. Load when doing a dedicated mobile pass or debugging a mobile-only regression — pairs with rules/css.md.
---

> **Examples are illustrative.** When copying code: use the canonical srcset widths, eager/lazy cut-off and breakpoints from AGENTS.md, `const` + `for...of` instead of `var`/`forEach`, the canonical breakpoints in `rules/css.md` (750/990/1024px in examples are Dawn values). Constants win; report any contradicting line you find.


## Part 7 — Mobile Performance & UX

Source: https://shopify.dev/docs/storefronts/themes/best-practices/performance/

---

#### Test with Real Mobile CPU and Network Throttling

**Why it matters**
Mobile processors parse and execute JavaScript significantly slower than desktop processors, and this amplifies every performance issue — especially LCP, INP, and TBT. A script that executes in 50 ms on desktop might take 200 ms or more on a phone. Network round-trip latency is also higher on cellular than wired broadband, so request count and prioritization matter more on mobile. Phones throttle CPU/GPU as they heat up (thermal throttling), and mobile browsers have less RAM, increasing the chance of the browser discarding cached resources or slowing garbage collection.

**Do**
- Test with Chrome DevTools CPU throttling set to **4x slowdown** (approximates a mid-range Android phone, Moto G Power class) AND Network throttling set to **Slow 4G** (1.6 Mbps download, 750 Kbps upload, 150 ms RTT) **at the same time** — they stack, and testing only one still leaves the other resource (CPU or network) at desktop speed.
- Enable Device Mode with a representative phone viewport (Moto G Power, Samsung Galaxy S8).
- Test on real mid-range Android devices (Moto G or Samsung Galaxy A series) to catch thermal throttling and real touch latency that emulation can't replicate.
- Conditionally load mobile-specific code with dynamic `import()`.
- Use mobile-first `sizes` attributes so the browser picks the smallest sufficient image source.
- Keep main-thread tasks under **50 ms**; anything longer blocks interactivity.
- Use `section.index` to eagerly load only above-the-fold sections and lazy-load the rest, testing with `section.index > 2` (positive test) rather than `<= 2`.

**Don't**
- Don't rely on lab testing on a fast desktop with no throttling — it tells you nothing about mobile performance.
- Don't test CPU throttling alone (it still uses your desktop's network) or network throttling alone (it still uses your desktop's CPU).
- Don't write `if section.index <= 2` — `section.index` is `nil` in static sections, the online store editor, and Section Rendering API responses, and comparisons against `nil` are falsey, so this would incorrectly lazy-load the first sections in those contexts.
- Don't load third-party app scripts synchronously on load, or attach listeners to hundreds of DOM elements instead of using event delegation — both add long main-thread tasks.

```javascript
// Conditionally load mobile-specific code with dynamic import
if (window.matchMedia('(max-width: 749px)').matches) {
  import('./mobile-nav.js').then(({ init }) => init());
}
```

```liquid
{{ product.featured_image
| image_url: width: 800
| image_tag:
      loading: image_loading,
      widths: '200, 400, 600, 800',
      sizes: '(min-width: 750px) calc(50vw - 2rem), calc(100vw - 2rem)'
}}
```

```liquid
{%- liquid
  # Test the below-the-fold case positively so a nil section.index stays eager.
  if section.index > 2
    assign section_loading = 'lazy'
  else
    assign section_loading = 'eager'
  endif
-%}

{{ section.settings.image
| image_url: width: 1200
| image_tag:
      loading: section_loading,
      widths: '400, 600, 800, 1200',
      sizes: '(min-width: 750px) 50vw, 100vw'
}}
```

```liquid
{% if template.name == 'product' %}
  <script src="{{ 'product-media.js' | asset_url }}" defer></script>
{% endif %}
```

**Testing thresholds/tools**
- Chrome DevTools: CPU **4x slowdown** + Network **Slow 4G** (1.6 Mbps down / 750 Kbps up / 150 ms RTT); check **Total Blocking Time** in the Performance panel, sort Bottom-Up by Self Time.
- WebPageTest: Moto G4 profile on a 4G connection.
- Lighthouse mobile preset: "Reduce JavaScript execution time" and "Minimize main-thread work" diagnostics.
- Shopify Web Performance Dashboard: compare mobile vs. desktop Core Web Vitals field data.

---

#### Remove or Reduce Intrusive Interstitials on Mobile

**Why it matters**
Full-screen dialogs/overlays that cover the main content immediately after load block what the customer came for, and the close control is often the smallest tap target on the page. Google's search guidance specifically discourages content covered immediately after a customer arrives from search. A dialog injected during page load can become the **Largest Contentful Paint (LCP) element**, distorting the metric so it reflects the dialog instead of real content. Dialogs that appear without warning, without a focus trap, and without focus return are hard to use with a screen reader or keyboard.

**Do**
- Prefer not showing a dialog on load at all — ask whether the message can live in the page instead of on top of it.
- If you keep a dialog, gate it on an interaction (scroll, tap, click) rather than a timer.
- Use the native `<dialog>` element with `showModal()` — it provides a focus trap, focus restoration on close, `Escape` handling, an inert background, and the `::backdrop` pseudo-element for free.
- Use a **7-day** display frequency limit via `localStorage` for eligibility checks, and suppress the dialog for customers who already subscribed/dismissed it.
- Trigger a gated dialog after the customer scrolls past **50%** of the page, or on exit intent (pointer leaving the top of the window, `clientY < 10`).
- Rely on the scroll trigger for touch-only sessions (exit intent needs a pointer) — don't add a timer fallback for touch, since that reintroduces the untriggered reveal.

**Don't**
- Don't cover main content with an overlay immediately on page load.
- Don't use a timed reveal on a page the customer hasn't touched — it still covers content and can become the LCP element.
- Don't hide the newsletter/promo behind a modal when it can be inline content or a sticky bottom banner instead.

```liquid
{%- comment -%}
Inline signup in content flow, not blocking overlay
{%- endcomment -%}
<section class="newsletter-signup">
  <div class="newsletter-content">
    <h3>{{ section.settings.heading }}</h3>
    <p>{{ section.settings.subheading }}</p>
    {% form 'customer' %}
      <div class="newsletter-form">
        <input
          type="email"
          name="contact[email]"
          placeholder="Your email"
          required
        >
        <button type="submit">Subscribe</button>
      </div>
    {% endform %}
  </div>
</section>
```

```css
.newsletter-signup {
  padding: 40px 20px;
  background: #f5f5f5;
  margin: 40px 0;
  text-align: center;
}
.newsletter-content {
  max-width: 600px;
  margin: 0 auto;
}
.newsletter-form {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
.newsletter-form input {
  flex: 1;
  padding: 12px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
.newsletter-form button {
  padding: 12px 24px;
  font-size: 16px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
```

```css
/* Sticky bottom banner, revealed on first interaction not a timer */
.promo-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #0066cc;
  color: white;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  z-index: 1000;
  transform: translateY(100%);
  transition: transform 0.3s;
}
.promo-banner.visible {
  transform: translateY(0);
}
.promo-close {
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}
@media (max-width: 767px) {
  .promo-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
```

```javascript
// Reveal the banner on the first interaction, not on a timer
function showBanner() {
  if (!localStorage.getItem('promoBannerClosed')) {
    document.getElementById('promoBanner').classList.add('visible');
  }
}
['scroll', 'pointerdown', 'keydown'].forEach(function (eventType) {
  window.addEventListener(eventType, showBanner, {once: true, passive: true});
});

function closeBanner() {
  document.getElementById('promoBanner').classList.remove('visible');
  localStorage.setItem('promoBannerClosed', 'true');
}
```

```html
<!-- Engagement-gated dialog: native <dialog>, opened after 50% scroll or exit intent -->
<dialog class="email-dialog" id="emailDialog" aria-labelledby="emailDialogTitle">
  <form method="dialog" class="email-dialog__dismiss">
    <button value="dismiss" aria-label="Close">&times;</button>
  </form>
  <h2 id="emailDialogTitle">{{ section.settings.heading }}</h2>
  <p>{{ section.settings.subheading }}</p>
  {% form 'customer' %}
    <input
      type="email"
      name="contact[email]"
      placeholder="Your email"
      aria-label="Email address"
      required
    >
    <button type="submit">Subscribe</button>
  {% endform %}
</dialog>
```

```css
.email-dialog {
  border: none;
  border-radius: 8px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}
.email-dialog::backdrop {
  background: rgba(0, 0, 0, 0.5);
}
.email-dialog__dismiss button {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  font-size: 32px;
  line-height: 1;
  color: #666;
  cursor: pointer;
  min-width: 48px;
  min-height: 48px;
}
.email-dialog input,
.email-dialog button[type="submit"] {
  font-size: 16px;
  min-height: 48px;
  padding: 12px;
}
```

```javascript
(function () {
  var dialog = document.getElementById('emailDialog');
  var opened = false;

  function shouldShowDialog() {
    // Don't show it again within a week of the last time it was seen
    var lastSeen = localStorage.getItem('emailDialogLastSeen');
    if (lastSeen) {
      var daysSince = (Date.now() - parseInt(lastSeen, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        return false;
      }
    }
    // Don't show it to a customer who already subscribed or dismissed it
    if (localStorage.getItem('emailDialogSubscribed') === 'true') {
      return false;
    }
    return true;
  }

  function openDialog() {
    if (opened || !shouldShowDialog()) {
      return;
    }
    opened = true;
    localStorage.setItem('emailDialogLastSeen', Date.now().toString());
    dialog.showModal();
  }

  // Trigger 1: the customer has scrolled past half of the page
  window.addEventListener('scroll', function () {
    var scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable > 0 && window.scrollY / scrollable > 0.5) {
      openDialog();
    }
  }, {passive: true});

  // Trigger 2: the pointer leaves the window through the top edge.
  document.documentElement.addEventListener('mouseleave', function (event) {
    if (event.clientY < 10) {
      openDialog();
    }
  });
})();
```

**Testing thresholds/tools**
- Load on a phone arriving from a search result; confirm content is usable without dismissing anything.
- Confirm the dialog opens only after scroll/exit-intent, never on an untouched page.
- Keyboard/screen reader: focus moves in, `Tab` stays trapped, `Escape` closes, focus returns to prior position.
- Dismiss, reload, confirm it stays closed per the eligibility window (7 days).
- Lighthouse mobile audit: confirm the LCP element is the main content, not the dialog/banner.

---

#### Build Responsive Layouts That Perform Well on Mobile

**Why it matters**
Poor responsive implementation wastes bandwidth and CPU three ways: (1) without a correct `sizes` attribute, the browser downloads images sized for desktop even on a phone — on a 4-column grid that becomes 1 column on mobile, this can mean images **4x larger** than needed; (2) hiding desktop-only elements with `display: none` doesn't stop the browser downloading their images/fonts, since the browser fetches everything referenced in the HTML regardless of CSS visibility; (3) duplicate DOM (two nav trees, two heroes) doubles nodes to parse/style/keep in memory, affecting LCP, CLS, and INP.

**Do**
- Match the `sizes` attribute to your actual CSS breakpoints using the formula: `calc(<column-fraction>vw - <total-horizontal-padding>)`.
- Use `sizes: 'auto'` for images with `loading="lazy"` — the browser uses the image's own layout width and stays correct as CSS changes (Shopify polyfills browsers lacking native `sizes="auto"` support). Eager images, including the LCP image, still need an explicit `sizes` value.
- Use `<picture>` with a `media` attribute for art direction (different crops for mobile vs desktop) — give every `<source>` its own `width`/`height` so the layout doesn't shift.
- Use a Liquid `{% if %}` conditional only for decisions the server can actually make (merchant setting, template, login state) — excluded markup is then never sent to the client.
- Render a single nav structure that adapts with CSS; if mobile/desktop navs are too different, render only the desktop nav in Liquid and load the mobile nav on demand via the Section Rendering API.

**Don't**
- Don't rely on a Liquid conditional to choose between a mobile and desktop image crop — "Liquid runs on the server and can't tell which device is making the request."
- Don't render both mobile and desktop hero variants in the HTML and hide one with CSS — both images still download.
- Don't render two complete navigation trees (mobile + desktop) — it doubles DOM nodes from the menu alone.

```liquid
{{!-- Full-width hero that spans the viewport --}}
{{ section.settings.image
| image_url: width: 1600
| image_tag:
      widths: '600, 900, 1200, 1600',
      sizes: '100vw'
}}
```

```liquid
{{!-- 2-column product grid, 1 column on mobile --}}
{{ product.featured_image
| image_url: width: 800
| image_tag:
      widths: '300, 400, 600, 800',
      sizes: '(min-width: 768px) calc(50vw - 2rem), calc(100vw - 2rem)'
}}
```

```liquid
{{!-- 4-column collection grid, 2 columns tablet, 1 mobile --}}
{{ product.featured_image
| image_url: width: 600
| image_tag:
      widths: '200, 300, 400, 600',
      sizes: '(min-width: 1200px) calc(25vw - 2rem), (min-width: 768px) calc(50vw - 2rem), calc(100vw - 2rem)'
}}
```

```liquid
{{!-- sizes: 'auto' for lazy-loaded images only --}}
{{ product.featured_image
| image_url: width: 600
| image_tag:
      loading: 'lazy',
      widths: '200, 300, 400, 600',
      sizes: 'auto'
}}
```

```html
<!-- <picture> for art direction: mobile crop vs. desktop crop -->
<picture>
  <source
    media="(max-width: 749px)"
    srcset="
      {{ section.settings.mobile_image | image_url: width: 400 }} 400w,
      {{ section.settings.mobile_image | image_url: width: 600 }} 600w,
      {{ section.settings.mobile_image | image_url: width: 800 }} 800w
    "
    sizes="100vw"
    width="{{ section.settings.mobile_image.width }}"
    height="{{ section.settings.mobile_image.height }}"
  >
  {{ section.settings.desktop_image
  | image_url: width: 1600
  | image_tag:
        widths: '800, 1200, 1600',
        sizes: '100vw',
        loading: 'eager',
        fetchpriority: 'high'
  }}
</picture>
```

```liquid
{% comment %}
Anti-pattern: both variants are in the HTML, and CSS hides one of them.
Both images are downloaded.
{% endcomment %}
<div class="hero--mobile">
  {{ section.settings.mobile_image | image_url: width: 800 | image_tag: sizes: '100vw' }}
</div>
<div class="hero--desktop">
  {{ section.settings.desktop_image | image_url: width: 1600 | image_tag: sizes: '100vw' }}
</div>
```

```liquid
{% comment %}
The promotional banner is a merchant setting, so the server knows whether
it's needed. When it's off, its markup and images never reach the client.
{% endcomment %}
{% if section.settings.show_promo_banner %}
  <div class="promo-banner">
    {{ section.settings.promo_image
    | image_url: width: 1200
    | image_tag: loading: 'lazy', sizes: '100vw'
    }}
  </div>
{% endif %}
```

```liquid
{%- comment -%}
Render the desktop nav in the initial HTML.
The mobile nav loads through the Section Rendering API when the menu button is tapped.
{%- endcomment -%}
<nav class="desktop-nav" aria-label="Main">
  {% for link in linklists.main-menu.links %}
    <a href="{{ link.url }}">{{ link.title }}</a>
  {% endfor %}
</nav>
<button
  class="mobile-menu-toggle"
  aria-label="Open menu"
  data-menu-section="{{ section.id }}"
>
  {% render 'icon-menu' %}
</button>
```

**Testing thresholds/tools**
- Responsive Image Linter browser extension: flags images where `sizes` doesn't match rendered size.
- DevTools Network panel: resize viewport, reload, confirm image URLs change and smaller images request at narrower widths.
- DevTools device mode with connection throttled to **3G**.
- Lighthouse "Properly size images" audit, run in both mobile and desktop mode.

---

#### Increase Tap Target Size and Spacing for Mobile Usability

**Why it matters**
"Small tap targets force customers to zoom in and tap carefully, which increases error rates." A fingertip is far less precise than a cursor: 10 mm is about 38 CSS px at the 96 px/inch reference resolution, which is why guidelines round up from that figure. Problems include mis-taps, extra corrective interactions, forced zooming, accessibility barriers for customers with motor impairments, and task abandonment.

**Do**
- Use a **minimum of 48 × 48 px** for interactive elements (buttons, links, form inputs, icon buttons) — this single figure satisfies all three major standards at once.
- Maintain **minimum 8 px spacing** between adjacent interactive elements.
- Expand the hit area with padding rather than enlarging the visible element (e.g., 12px padding around a 24px icon yields a 48×48px target).
- Make an entire card/row tappable (stretched-link pattern) rather than only a small link inside it.
- Use `16px` font-size on form inputs to match comfortable tap sizing.

**Don't**
- Don't rely on margin to enlarge a checkbox/radio's actual hit area — margin separates neighboring targets but isn't part of the hit area itself; wrap the input+label together and set `min-height: 48px` on the label if you need a larger target.
- Don't leave icon-only buttons at their visual size (e.g., 24×24px) without padding out the tappable area.

**Reference thresholds cited on the page**
- **WCAG 2.2 SC 2.5.8 Target Size (Minimum): 24 × 24 CSS px, Level AA** (has exceptions for spacing, inline targets, essential size, or an equivalent alternative elsewhere on the page).
- **WCAG 2.1 SC 2.5.5 Target Size: 44 × 44 CSS px, Level AAA** (Apple HIG uses the same 44 × 44 pt figure).
- **Material Design: 48 × 48 dp** (platform guideline, not a conformance requirement).
- Recommended default on this page: **48 × 48 px**, satisfying all three.

```css
/* Buttons */
button,
.button,
input[type="submit"],
input[type="button"] {
  min-height: 48px;
  min-width: 48px;
  padding: 12px 24px;
  font-size: 16px;
}

/* Links in navigation */
.site-nav a {
  min-height: 48px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
}

/* Icon buttons */
.icon-button {
  min-height: 48px;
  min-width: 48px;
  padding: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Form inputs */
input[type="text"],
input[type="email"],
input[type="tel"],
input[type="number"],
select {
  min-height: 48px;
  padding: 12px;
  font-size: 16px;
}

/* Checkboxes and radio buttons */
input[type="checkbox"],
input[type="radio"] {
  min-height: 24px;
  min-width: 24px;
  margin: 12px; /* Separates neighboring targets. Margin isn't part of the hit area. */
}

/* Enlarge the hit area itself by making the label the target */
.checkbox-field label {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
}
```

```css
/* Button groups */
.button-group {
  display: flex;
  gap: 12px; /* Space between buttons */
  flex-wrap: wrap;
}

/* Navigation links */
.site-nav {
  display: flex;
  gap: 8px; /* Minimum spacing */
}

/* Product grid */
.product-grid {
  display: grid;
  gap: 16px; /* Comfortable spacing for tap targets */
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

/* Form fields */
.form-field {
  margin-bottom: 20px; /* Space between fields */
}
```

```css
/* Small icon with a large tap area */
.close-button {
  position: relative;
  width: 24px;
  height: 24px;
}

.close-button::before {
  content: '';
  position: absolute;
  top: -12px;
  left: -12px;
  right: -12px;
  bottom: -12px;
  /* Creates a 48x48px tap area around a 24x24px icon */
}

/* Alternative: use padding */
.icon-link {
  display: inline-flex;
  padding: 12px; /* Adds 12px on each side, so a 24px icon becomes a 48x48px target */
}

.icon-link svg {
  width: 24px;
  height: 24px;
}
```

```html
{%- comment -%}
Make the entire product card tappable.
{%- endcomment -%}
<a href="{{ product.url }}" class="product-card">
  <img src="{{ product.featured_image | image_url: width: 400 }}" alt="{{ product.title }}">
  <h3>{{ product.title }}</h3>
  <p>{{ product.price | money }}</p>
</a>

<style>
.product-card {
  display: block;
  padding: 16px;
  text-decoration: none;
  color: inherit;
  /* The entire card is tappable */
}
.product-card:hover,
.product-card:focus {
  background: #f5f5f5;
}
</style>
```

```html
{%- comment -%}
Stretched link pattern: make the container tappable while keeping semantic HTML.
{%- endcomment -%}
<div class="blog-card">
  <img src="{{ article.image | image_url: width: 400 }}" alt="{{ article.title }}">
  <h3>
    <a href="{{ article.url }}" class="stretched-link">{{ article.title }}</a>
  </h3>
  <p>{{ article.excerpt }}</p>
</div>

<style>
.blog-card {
  position: relative;
  padding: 16px;
}
.stretched-link::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  /* Expands the link to cover the entire card */
}
</style>
```

```css
/* Mobile menu items */
.mobile-nav a {
  display: block;
  min-height: 48px;
  padding: 12px 20px;
  font-size: 16px;
  text-decoration: none;
  color: #333;
  border-bottom: 1px solid #eee;
}
.mobile-nav a:active {
  background: #f5f5f5;
}

/* Hamburger menu button */
.menu-toggle {
  min-width: 48px;
  min-height: 48px;
  padding: 12px;
  background: transparent;
  border: none;
  cursor: pointer;
}
```

```html
{%- comment -%}
Color swatches with adequate size and spacing.
{%- endcomment -%}
<div class="variant-selector">
  <label>Color</label>
  <div class="color-swatches">
    {% for option in product.options_with_values %}
      {% if option.name == 'Color' %}
        {% for value in option.values %}
          <input
            type="radio"
            name="color"
            id="color-{{ value | handle }}"
            value="{{ value }}"
            class="swatch-input"
          >
          <label for="color-{{ value | handle }}" class="swatch-label">
            <span class="swatch" style="background-color: {{ value | downcase }}"></span>
            <span class="swatch-name">{{ value }}</span>
          </label>
        {% endfor %}
      {% endif %}
    {% endfor %}
  </div>
</div>

<style>
.color-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.swatch-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.swatch-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 60px;
  min-height: 60px;
  padding: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 4px;
}
.swatch {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #ddd;
}
.swatch-name {
  font-size: 12px;
  margin-top: 4px;
}
.swatch-input:checked + .swatch-label {
  border-color: #0066cc;
}
/* The input is visually hidden, so the label carries the focus indicator */
.swatch-input:focus-visible + .swatch-label {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
</style>
```

```html
<div class="quantity-selector">
  <label for="quantity">Quantity</label>
  <div class="quantity-controls">
    <button type="button" class="quantity-button" onclick="decreaseQuantity()">
      <svg width="16" height="16" viewBox="0 0 16 16">
        <path d="M2 8h12" stroke="currentColor" stroke-width="2"/>
      </svg>
    </button>
    <input
      type="number"
      id="quantity"
      name="quantity"
      value="1"
      min="1"
      class="quantity-input"
    >
    <button type="button" class="quantity-button" onclick="increaseQuantity()">
      <svg width="16" height="16" viewBox="0 0 16 16">
        <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2"/>
      </svg>
    </button>
  </div>
</div>

<style>
.quantity-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.quantity-button {
  min-width: 48px;
  min-height: 48px;
  padding: 12px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.quantity-button:active {
  background: #e5e5e5;
}
.quantity-input {
  min-height: 48px;
  width: 60px;
  padding: 12px;
  font-size: 16px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>

<script>
  function decreaseQuantity() {
    const input = document.getElementById('quantity');
    const value = parseInt(input.value);
    if (value > 1) {
      input.value = value - 1;
    }
  }
  function increaseQuantity() {
    const input = document.getElementById('quantity');
    input.value = parseInt(input.value) + 1;
  }
</script>
```

**Testing thresholds/tools**
- Chrome DevTools Device Mode with **Show rulers** enabled: verify all targets ≥ **48 × 48 px**, spacing ≥ **8 px**.
- Real device testing for comfortable tapping and mis-tap rate.
- WCAG 2.2 SC 2.5.8 (**24 × 24 CSS px**, AA) minimum; WCAG 2.1 SC 2.5.5 (**44 × 44 CSS px**, AAA) if targeting AAA.
- Lighthouse accessibility category: **"Touch targets do not have sufficient size or spacing"** (`target-size`) audit — Lighthouse 12.0.0+ replaced the older SEO `tap-targets` audit with this one.

---

#### Fix Content Wider Than the Viewport

**Why it matters**
Content that exceeds the viewport width forces horizontal scrolling, which breaks the expectation that mobile pages scroll only vertically. It hides content off-screen, causes cramped layouts that reflow unpredictably on rotation, creates accessibility barriers for screen readers, and can push buttons/links off-screen where they're unreachable. Overflow is easy to miss on a full-width desktop browser, so it must be checked at mobile viewport sizes.

**Do**
- Set the viewport meta tag on every page.
- Use `width: 100%` with `max-width` instead of fixed pixel widths, and `box-sizing: border-box` for predictable sizing.
- Apply `max-width: 100%; height: auto; display: block;` globally to images, video, and iframes.
- Wrap tables in a horizontally-scrollable container, or convert them to a card layout on mobile via `@media (max-width: 767px)`.
- Use `overflow-wrap: break-word` / `word-wrap: break-word` (and `word-break: break-all` for URLs) to prevent long strings from forcing overflow.
- Set `min-width: 0` on CSS Grid/Flexbox items to prevent them from overflowing their container.

**Don't**
- Don't use fixed-width elements like `width: 1200px`.
- Don't leave large images without `max-width` constraints.
- Don't use absolute positioning with fixed coordinates or CSS transforms that can extend beyond the viewport.
- Don't rely on the default browser viewport behavior — without the meta tag, mobile browsers assume a desktop width (typically **980 px**), shrinking and potentially overflowing all content.

```html
<!-- Prevents content from overflowing the viewport -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

```css
/* Anti-pattern: fixed width */
.container {
  width: 1200px;
}

/* Recommended: fluid width with max-width */
.container {
  box-sizing: border-box;
  width: 100%;
  max-width: 1200px;
  padding: 0 20px;
  margin: 0 auto;
}

/* Anti-pattern: fixed element */
.sidebar {
  width: 300px;
}

/* Recommended: flexible element */
.sidebar {
  width: 100%;
  max-width: 300px;
}

@media (min-width: 768px) {
  .sidebar {
    width: 30%;
  }
}
```

```css
/* Global image constraint */
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Video and iframe constraint */
video,
iframe {
  max-width: 100%;
  height: auto;
}

/* Responsive iframe wrapper */
.video-wrapper {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  height: 0;
  overflow: hidden;
}

.video-wrapper iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

```html
{%- comment -%}
Use Shopify image filters to serve appropriately sized images.
{%- endcomment -%}

<img
  src="{{ product.featured_image | image_url: width: 800 }}"
  srcset="
    {{ product.featured_image | image_url: width: 400 }} 400w,
    {{ product.featured_image | image_url: width: 800 }} 800w,
    {{ product.featured_image | image_url: width: 1200 }} 1200w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  width="{{ product.featured_image.width }}"
  height="{{ product.featured_image.height }}"
  alt="{{ product.title | escape }}"
  style="max-width: 100%; height: auto;"
>
```

```css
/* Wrapper with horizontal scroll */
.table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-bottom: 20px;
}

.table-wrapper table {
  min-width: 600px; /* Minimum table width */
  width: 100%;
}

/* Visual indicator for scrollable content */
.table-wrapper::after {
  content: '← Scroll →';
  display: block;
  text-align: center;
  font-size: 12px;
  color: #666;
  padding: 8px;
}

@media (min-width: 768px) {
  .table-wrapper::after {
    display: none;
  }
}
```

```html
{%- comment -%}
Convert the table to a card layout on mobile.
{%- endcomment -%}

<div class="responsive-table">
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>Price</th>
        <th>Quantity</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      {% for item in cart.items %}
        <tr>
          <td data-label="Product">{{ item.title }}</td>
          <td data-label="Price">{{ item.price | money }}</td>
          <td data-label="Quantity">{{ item.quantity }}</td>
          <td data-label="Total">{{ item.line_price | money }}</td>
        </tr>
      {% endfor %}
    </tbody>
  </table>
</div>

<style>
  /* Mobile: card layout */
  @media (max-width: 767px) {
    .responsive-table table,
    .responsive-table thead,
    .responsive-table tbody,
    .responsive-table tr,
    .responsive-table th,
    .responsive-table td {
      display: block;
    }
    .responsive-table thead {
      display: none;
    }
    .responsive-table tr {
      margin-bottom: 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 12px;
    }
    .responsive-table td {
      text-align: right;
      padding: 8px;
      border-bottom: 1px solid #eee;
    }
    .responsive-table td:last-child {
      border-bottom: none;
    }
    .responsive-table td::before {
      content: attr(data-label);
      float: left;
      font-weight: 600;
    }
  }
</style>
```

```css
/* Allow code to wrap */
pre,
code {
  max-width: 100%;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: monospace;
}

/* Scrollable code blocks */
pre {
  padding: 16px;
  background: #f5f5f5;
  border-radius: 4px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

pre code {
  white-space: pre; /* Preserve formatting in scrollable container */
}
```

```css
/* Break long words */
.content {
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

/* Break URLs and long strings */
.url,
.email,
.long-text {
  word-break: break-all;
  overflow-wrap: break-word;
}

/* Product titles and descriptions */
.product-title,
.product-description {
  overflow-wrap: break-word;
  word-wrap: break-word;
  hyphens: auto;
}
```

```css
/* Grid with proper constraints */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  width: 100%;
}

.grid-item {
  min-width: 0; /* Prevents overflow */
  overflow: hidden;
}

/* Flex with wrapping */
.flex-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  width: 100%;
}

.flex-item {
  flex: 1 1 300px;
  min-width: 0; /* Prevents overflow */
  max-width: 100%;
}
```

```html
<!-- Before: image overflows on mobile -->
<img src="{{ product.featured_image | image_url: width: 1200 }}" alt="{{ product.title | escape }}">

<!-- After: image scales to fit viewport -->
<img
  src="{{ product.featured_image | image_url: width: 1200 }}"
  srcset="
    {{ product.featured_image | image_url: width: 400 }} 400w,
    {{ product.featured_image | image_url: width: 800 }} 800w,
    {{ product.featured_image | image_url: width: 1200 }} 1200w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  width="{{ product.featured_image.width }}"
  height="{{ product.featured_image.height }}"
  alt="{{ product.title | escape }}"
  style="max-width: 100%; height: auto; display: block;"
>
```

```html
<section class="hero">
  <picture>
    <source
      media="(max-width: 767px)"
      srcset="{{ section.settings.mobile_image | image_url: width: 800 }}"
    >
    <source
      media="(min-width: 768px)"
      srcset="{{ section.settings.desktop_image | image_url: width: 2000 }}"
    >
    <img
      src="{{ section.settings.desktop_image | image_url: width: 2000 }}"
      width="{{ section.settings.desktop_image.width }}"
      height="{{ section.settings.desktop_image.height }}"
      alt="{{ section.settings.heading | escape }}"
      class="hero__image"
    >
  </picture>
  <div class="hero__content">
    <h1>{{ section.settings.heading }}</h1>
    <p>{{ section.settings.subheading }}</p>
    <a href="{{ section.settings.button_link }}" class="button">
      {{ section.settings.button_text }}
    </a>
  </div>
</section>

<style>
.hero {
  position: relative;
  width: 100%;
  overflow: hidden; /* Prevents content overflow */
}
.hero__image {
  width: 100%;
  max-width: 100%;
  height: auto;
  display: block;
}
.hero__content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  width: 90%; /* Ensures content fits viewport */
  max-width: 600px;
  padding: 20px;
}
.hero h1 {
  font-size: clamp(24px, 6vw, 48px);
  margin-bottom: 16px;
  word-wrap: break-word;
}
.hero p {
  font-size: clamp(16px, 3vw, 20px);
  margin-bottom: 24px;
  word-wrap: break-word;
}
.button {
  display: inline-block;
  padding: 12px 32px;
  font-size: 16px;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
```

**Testing thresholds/tools**
- Chrome DevTools Device Mode at **320 px, 375px, and 414px** widths — verify no horizontal scroll.
- Console overflow detection: `Array.from(document.querySelectorAll('*')).filter((element) => element.scrollWidth > document.documentElement.clientWidth)`.
- Real device testing across screen sizes and orientations.
- Lighthouse mobile audit: verify no viewport meta tag issues.
- Scroll the full page vertically and confirm no horizontal scroll appears anywhere and all interactive elements stay reachable.

---

#### Ensure Content Parity Between Mobile and Desktop

**Why it matters**
Google uses mobile-first indexing, so the mobile version of a page is the primary version used for ranking. If content exists only on desktop, Google may not see it, causing lower rankings for related queries. Google's John Mueller confirmed that "content hidden in tabs or accordions on mobile is given less weight than visible content." Research cited on the page found that **30 to 40 percent** of ecommerce sites have significant content differences between mobile and desktop. Consequences include ranking drops, indexing gaps, inconsistent user experience, lower conversions from missing CTAs/details, and lost SEO signals (structured data, links, text).

**Do**
- Keep all content in the DOM, and adjust only its visibility with CSS (e.g., collapsed accordions/tabs) — content should stay indexable even when visually collapsed.
- Use proper ARIA attributes (`aria-expanded`, `aria-controls`, `role="tablist"`, `role="tab"`, `role="tabpanel"`) on accordions and tabs so collapsed content stays both accessible and indexable.
- Keep structured data (JSON-LD) identical between mobile and desktop.
- Include all links from the desktop menu in the mobile menu.
- Use responsive `srcset`/`sizes` for images, but serve the same visual content on both devices.

**Don't**
- Don't hide important content using `display: none` in a mobile media query — Google might not reliably index it.
- Don't move content off-screen with `position: absolute; left: -10000px` to fake parity — content no buyer can see is still weighted less than visible content; this only hides the gap rather than fixing it.
- Don't remove sections entirely on mobile, use different URLs for mobile/desktop, lazy-load content that never renders, or hide text behind "Read more" links as a substitute for having it visible.

```html
<!-- Anti-pattern: content hidden by default on mobile -->
<div class="product-description mobile-hidden">
  <button onclick="toggleDescription()">Read More</button>
  <div id="description" style="display: none;">
    {{ product.description }}
  </div>
</div>
```

```html
<!-- Recommended: content visible by default, optionally collapsible -->
<div class="product-description">
  <div class="description-content">
    {{ product.description }}
  </div>
  {% if product.description.size > 500 %}
    <button class="description-toggle" onclick="toggleDescription()">
      Show Less
    </button>
  {% endif %}
</div>

<style>
.description-content {
  /* Content is visible and indexable */
  max-height: none;
  overflow: visible;
}
/* Optional: add "Show less" functionality */
.description-content.collapsed {
  max-height: 300px;
  overflow: hidden;
}
</style>
```

```html
{%- comment -%}
Accessible, indexable accordion — content is in the DOM and indexable,
but visually collapsed.
{%- endcomment -%}
<div class="accordion">
  <h3>
    <button class="accordion-header" aria-expanded="true" aria-controls="panel1">
      Product details
      <span class="accordion-icon">−</span>
    </button>
  </h3>
  <div id="panel1" class="accordion-panel">
    {{ product.description }}
  </div>
  <h3>
    <button class="accordion-header" aria-expanded="false" aria-controls="panel2">
      Shipping information
      <span class="accordion-icon">+</span>
    </button>
  </h3>
  <div id="panel2" class="accordion-panel" hidden>
    {{ section.settings.shipping_info }}
  </div>
</div>

{%- comment -%} Replaced: max-height transitions are banned (rules/css.md). Use native details — zero JS, content stays indexable. {%- endcomment -%}
<details class="accordion" name="product-info">
  <summary class="accordion__summary">{{ 'products.shipping' | t }}</summary>
  <div class="accordion__panel">{{ section.settings.shipping_info }}</div>
</details>
```

```html
{%- comment -%}
All tab content is in the DOM, only display changes.
{%- endcomment -%}
<div class="tabs">
  <div class="tab-buttons" role="tablist">
    <button class="tab-button active" role="tab" aria-selected="true" aria-controls="tab1">
      Description
    </button>
    <button class="tab-button" role="tab" aria-selected="false" aria-controls="tab2">
      Specifications
    </button>
    <button class="tab-button" role="tab" aria-selected="false" aria-controls="tab3">
      Reviews
    </button>
  </div>
  <div class="tab-panels">
    <div id="tab1" class="tab-panel active" role="tabpanel">
      {{ product.description }}
    </div>
    <div id="tab2" class="tab-panel" role="tabpanel">
      {% if product.metafields.custom.specs %}
        {{ product.metafields.custom.specs.value }}
      {% endif %}
    </div>
    <div id="tab3" class="tab-panel" role="tabpanel">
      {% if product.metafields.custom.reviews %}
        {{ product.metafields.custom.reviews.value }}
      {% endif %}
    </div>
  </div>
</div>

<style>
.tab-panel {
  /* All panels are in the DOM; only visibility changes */
  display: block;
  opacity: 0;
  height: 0;
  overflow: hidden;
  transition: opacity 0.3s;
}
.tab-panel.active {
  opacity: 1;
  height: auto;
  overflow: visible;
}
</style>
```

```css
/* Anti-pattern: content removed from rendering is not reliably indexed */
@media (max-width: 767px) {
  .product-specs {
    display: none; /* Google might not index this */
  }
}

/* Recommended: content is in the DOM, just not visible */
@media (max-width: 767px) {
  .product-specs {
    /* Option 1: collapse but keep in the DOM */
    max-height: 0;
    overflow: hidden;
    opacity: 0;
  }
}
```

```html
{%- comment -%}
Use the same structured data on mobile and desktop.
{%- endcomment -%}
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": {{ product.title | json }},
  "image": {{ product.featured_image | image_url: width: 1200 | json }},
  "description": {{ product.description | strip_html | json }},
  "sku": {{ product.selected_or_first_available_variant.sku | json }},
  "brand": {
    "@type": "Brand",
    "name": {{ product.vendor | json }}
  },
  "offers": {
    "@type": "Offer",
    "url": "{{ shop.url }}{{ product.url }}",
    "priceCurrency": "{{ cart.currency.iso_code }}",
    "price": "{{ product.selected_or_first_available_variant.price | divided_by: 100.0 }}",
    "availability": "{% if product.available %}https://schema.org/InStock{% else %}https://schema.org/OutOfStock{% endif %}"
  }
}
</script>
```

```html
{%- comment -%}
Serve appropriately sized images, but the same content.
{%- endcomment -%}
<img
  src="{{ product.featured_image | image_url: width: 800 }}"
  srcset="
    {{ product.featured_image | image_url: width: 400 }} 400w,
    {{ product.featured_image | image_url: width: 800 }} 800w,
    {{ product.featured_image | image_url: width: 1200 }} 1200w,
    {{ product.featured_image | image_url: width: 1600 }} 1600w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="{{ product.title | escape }}"
>
```

```css
/* Collection grid: same products at every breakpoint, layout only changes */
.collection-grid {
  display: grid;
  gap: 20px;
  padding: 20px;
}
/* Mobile: 1 column */
@media (max-width: 767px) {
  .collection-grid {
    grid-template-columns: 1fr;
  }
}
/* Tablet: 2 columns */
@media (min-width: 768px) and (max-width: 991px) {
  .collection-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
/* Desktop: 3 columns */
@media (min-width: 992px) {
  .collection-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

**Testing thresholds/tools**
- Visual side-by-side comparison of mobile vs. desktop for missing sections, text, or images.
- Google Search Console **URL Inspection** tool to compare rendered HTML for mobile vs. desktop and verify structured data is identical.
- Chrome DevTools device mode rendering vs. desktop DOM comparison.
- Screaming Frog (or similar) crawl with mobile and desktop user agents, comparing word counts and links.
- Rich Results Test for schema markup, on both mobile and desktop.
- Manual testing that accordions/tabs expand correctly and all content/links are reachable.

---

### Quick checklist

- Throttle CPU to 4x slowdown and network to Slow 4G together when testing mobile performance in DevTools.
- Test on a real mid-range Android device, not just emulation, to catch thermal throttling and touch latency.
- Keep main-thread tasks under 50ms during page load.
- Never show an interstitial dialog on page load; gate it on scroll, tap, or exit intent instead.
- Use the native `<dialog>` element with `showModal()` for any gated popup.
- Cap popup reappearance to at most once every 7 days per visitor via localStorage.
- Write `sizes` to match your actual CSS breakpoints, not a guess.
- Use `sizes: 'auto'` only on images with `loading="lazy"`.
- Use `<picture>` with `media` queries for art-directed mobile/desktop image crops, never CSS-hidden duplicate `<img>` tags.
- Render only one navigation tree in Liquid and load the alternate on demand.
- Give every button, link, and form control a minimum 48×48px tap target.
- Keep at least 8px of spacing between adjacent tap targets.
- Expand small icon hit areas with padding rather than resizing the icon.
- Always include `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
- Replace fixed pixel widths with `max-width` and percentage-based layouts.
- Apply `max-width: 100%; height: auto;` to every image, video, and iframe.
- Wrap wide tables in a scrollable container or convert them to cards below 767px.
- Set `min-width: 0` on flex and grid items to stop them from forcing overflow.
- Test every layout at 320px, 375px, and 414px viewport widths.
- Keep all content in the DOM and toggle only its visibility for accordions and tabs.
- Never use `display: none` or off-screen positioning to hide content that should count for SEO parity.
- Keep structured data, internal links, and images identical across mobile and desktop.


---

