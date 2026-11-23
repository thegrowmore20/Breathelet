---
description: Deep reference for CSS/fonts/CLS/FCP: critical CSS, stylesheet count/subsetting, font swap + metric overrides, reserving space, transform-only animation, mega-menu DOM, {% stylesheet %}/{% javascript %} tags. Load when building complex CSS/type systems or debugging CLS/FCP — not for simple edits (use rules/css.md).
---

> **Examples are illustrative.** When copying code: use the canonical srcset widths, eager/lazy cut-off and breakpoints from AGENTS.md, `const` + `for...of` instead of `var`/`forEach`, the canonical breakpoints in `rules/css.md` (750/990/1024px in examples are Dawn values). Constants win; report any contradicting line you find.


## Part 4 — CSS, Fonts & Layout Stability (CLS, FCP)

Source: https://shopify.dev/docs/storefronts/themes/best-practices/performance/ (10 sub-pages) and https://shopify.dev/docs/storefronts/themes/best-practices/javascript-and-stylesheet-tags

---

#### Reduce Stylesheet Count

**Why it matters**
Each `<link rel="stylesheet">` requires browser parsing and application; excessive stylesheet links cause expensive style recalculations that severely impact **INP**. Real-world case: Trade theme went from 1,150 stylesheets to 30, a 98% improvement in style recalculation time and a large INP improvement.

**Do**
- Use the `skip_styles` render parameter so a snippet rendered in a loop (e.g. product cards) only emits its `{% stylesheet %}` output once.
- Move CSS for global/site-wide components (loading spinners, progress bars, icon systems) into `base.css` instead of per-snippet stylesheets.
- Consolidate related component CSS files (e.g. `product-card.css`, `product-price.css`, `product-badge.css`) into fewer files for better gzip compression.
- Keep stylesheet counts under target thresholds (see table below).

**Don't**
- Don't render the same snippet in a loop without `skip_styles`, causing one stylesheet per iteration.
- Don't split every micro-component's CSS into its own file.
- Render arguments can't contain comparisons — don't try to inline a comparison into a `render` tag's parameter; assign it first with `{%- assign ... -%}`.

```liquid
❌ Incorrect
{%- for product in collection.products limit: 12 -%}
  {% render 'card-product', product: product %}
{%- endfor -%}
```
Result: 12 stylesheets load (one per card).

```liquid
✅ Correct
{%- assign skip_card_product_styles = false -%}
{%- for product in collection.products limit: 12 -%}
  {% render 'card-product', product: product, skip_styles: skip_card_product_styles %}
  {%- assign skip_card_product_styles = true -%}
{%- endfor -%}
```
Result: 1 stylesheet loads for 12 cards.

**Performance targets**

| Page type  | Target          | Problematic |
|------------|-----------------|-------------|
| Collection | < 50 stylesheets | > 100      |
| Product    | < 30 stylesheets | > 50       |
| Homepage   | < 40 stylesheets | —          |

**Testing**
```javascript
document.querySelectorAll("link[rel=stylesheet]").length
```
Use Chrome DevTools Performance panel to measure style recalculation speed; target INP under 200ms.

---

#### Load Critical CSS Synchronously

**Why it matters**
Critical (above-the-fold) CSS must load render-blocking (synchronously) to prevent Flash of Unstyled Content (FOUC) and layout shifts. Applying async-CSS patterns to in-viewport content causes unstyled content, late-style re-renders, and increased **CLS**. Dawn theme achieved a 95% CLS improvement (0.065 → near-zero) by removing async CSS from initial-viewport content.

**Do**
- Load the first 3 sections' CSS synchronously.
- Only apply the async pattern to section 4 and beyond, and only after testing confirms it helps.
- Benchmark before/after: record baseline CLS/FCP/LCP, implement, re-measure, and verify with RUM data post-deploy.

**Don't**
- Don't async-load CSS for anything visible in the initial viewport.
- Don't assume the async pattern always helps — "The pattern might hurt more than it helps, so always verify."

```liquid
✅ Synchronous (render-blocking) for above-the-fold
<link rel="stylesheet" href="{{ 'section.css' | asset_url }}">
```

```liquid
✅ Asynchronous for below-the-fold (section 4+)
<link
  rel="stylesheet"
  href="style.css"
  media="print"
  onload="this.media='all'"
/>
<noscript><link rel="stylesheet" href="style.css" /></noscript>
```

```liquid
✅ Conditional implementation using section.index
{% unless section.index > 3 %}
  <link rel="stylesheet" href="{{ 'section.css' | asset_url }}">
{% else %}
  <link rel="stylesheet" href="{{ 'section.css' | asset_url }}" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="{{ 'section.css' | asset_url }}"></noscript>
{% endunless %}
```

> **This theme:** section CSS goes in `{% stylesheet %}` (0 extra requests). The `stylesheet_tag`/`<link>`-in-a-section examples below apply only to themes that ship per-section asset files — do not copy them here. See `rules/css.md`.

**Thresholds**: sections 1–3 synchronous; section 4+ eligible for async (after testing). This is the *stylesheet-loading* threshold — it is deliberately looser than, and separate from, the image eager/lazy cut-off in AGENTS.md constants.

---

#### Defer Non-Critical Resources

**Why it matters**
Render-blocking JS/CSS delays **FCP**/**LCP**. Deferring non-critical JavaScript and async-loading non-critical CSS lets the browser render critical content sooner, while critical above-the-fold CSS stays synchronous to avoid FOUC.

**Do**
- Keep critical (above-fold) CSS synchronous via `stylesheet_tag`.
- Use the async pattern (`media="print" onload="this.media='all'"` + `<noscript>` fallback) for non-critical CSS, gated by `section.index`.
- Add `defer` to non-critical `<script>` tags written manually, since the `script_tag` filter doesn't support the `defer` attribute.
- Verify with Chrome DevTools Performance panel's "Render blocking requests" section and the Network waterfall; visually confirm no FOUC or layout shift.

**Don't**
- Don't defer `content_for_header` (it's Shopify-injected and can't be deferred).
- Don't defer app scripts loaded via the ScriptTag API.
- Don't defer A/B testing anti-flicker snippets — these must load synchronously.

```liquid
✅ Non-critical CSS (below fold), gated by section.index
{%- if section.index > 2 -%}
  <link rel="stylesheet" href="{{ 'section-styles.css' | asset_url }}" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="{{ 'section-styles.css' | asset_url }}"></noscript>
{%- else -%}
  {{ 'section-styles.css' | asset_url | stylesheet_tag }}
{%- endif -%}
```

```html
✅ Deferred JavaScript (manual tag, since script_tag doesn't support defer)
<script src="{{ 'theme-interactions.js' | asset_url }}" defer></script>
```

---

#### Reduce CLS from Font Swapping

**Why it matters**
With `font-display: swap`, the browser first renders a fallback system font, then swaps in the web font once downloaded. If character widths/line heights differ between fallback and web font, text reflows — measured as **CLS**. Text-heavy pages can see 0.05–0.15 CLS units from font swapping alone.

**Do**
- Set a unitless `line-height` (e.g. `1.5`) so the line box doesn't depend on font metrics.
- Define a matching fallback `@font-face` using `size-adjust`, `ascent-override`, `descent-override`, and `line-gap-override` to make the fallback font's box metrics match the web font's.
- Apply this technique **after** addressing other CLS sources (like missing image dimensions), and only when RUM data shows font swapping is a significant CLS contributor.
- Use tools to derive the override values: **Fontaine** (generates fallback `@font-face` rules from font files) or **Capsize** (exposes font metrics for manual calculation); compare rendered dimensions in Chrome DevTools.

**Don't**
- Don't assume universal override values — "There are no universal values"; they depend on the specific font pairing and must be measured individually.

```css
✅ Correct
@font-face {
  font-family: "Brand Font";
  src: url("/fonts/brand-font.woff2") format("woff2");
  font-display: swap;
}

@font-face {
  font-family: "Brand Font Fallback";
  src: local("Arial");
  size-adjust: 107%;
  ascent-override: 92%;
  descent-override: 24%;
  line-gap-override: 0%;
}

body {
  font-family: "Brand Font", "Brand Font Fallback", sans-serif;
  line-height: 1.5;
}
```

---

#### Self-Host Web Fonts

**Why it matters**
Self-hosting fonts on the Shopify CDN (via the theme's `/assets/` directory) eliminates an external DNS connection/round-trip and enables Early Hints delivery, improving font load time and reducing render delay.

**Do**
- Self-host when: the typeface isn't in the Shopify font library (e.g. licensed brand fonts), you need specific subsets/variable axes/Unicode ranges not offered by the library, or brand guidelines require a fixed, non-merchant-editable typeface.
- Prefer `font_picker` settings with the `font_face` and `font_url` filters when the font *is* in Shopify's library — same CDN delivery benefit, no code changes needed.
- Download WOFF2 and WOFF files (e.g. via Google Webfonts Helper), place them in `/assets`, define `@font-face` using the `asset_url` filter in a layout file or `.css.liquid` file, and reference the family with fallback fonts in CSS.
- Preload critical, viewport-visible fonts using the `preload_tag` filter.
- Use `font-display: swap` to avoid invisible text while the font loads.
- Limit to 1–2 font families, 2–4 weights per family, under 6 font files total.
- If self-hosting isn't possible (e.g. Adobe Typekit, Google Fonts API): add `preconnect` hints (Typekit: `https://p.typekit.net`, `https://use.typekit.net`; Google Fonts: `https://fonts.googleapis.com`, `https://fonts.gstatic.com`), load the external stylesheet asynchronously (`media="print"` + `onload`), and limit font weights requested.

**Don't**
- Don't load excessive font families/weights.
- Don't omit fallback fonts in the `font-family` declaration.

```liquid
✅ Self-hosted font-face using asset_url
{%- style -%}
  @font-face {
    font-family: "Brand Font";
    src: url({{ 'brand-font.woff2' | asset_url }}) format("woff2"),
         url({{ 'brand-font.woff' | asset_url }}) format("woff");
    font-display: swap;
  }
{%- endstyle -%}

<link rel="preload" as="font" type="font/woff2" href="{{ 'brand-font.woff2' | asset_url }}" crossorigin>
```

```liquid
✅ Font-library font via font_picker (font_face / font_url / preload_tag)
{{ settings.type_body_font | font_face }}
{{ settings.type_body_font | font_url | preload_tag: as: 'font', type: 'font/woff2', crossorigin: 'anonymous' }}
```

**Testing**: Chrome DevTools Network panel — fonts should load from `cdn.shopify.com` or the store domain with zero external-domain connections.

---

#### Use System Fonts

**Why it matters**
System fonts render immediately — no network request, no font swap, and no layout shift from font loading — improving **FCP** and **CLS**. Web fonts require the browser to parse HTML, request the font from a CDN, download it, and apply it, which "can take several hundred milliseconds" on slow connections/mobile, producing FOIT (invisible text) or FOUT (unstyled fallback text) in the interim.

**Do**
- Use a system font stack for maximum performance when brand doesn't require a distinctive typeface, especially for mobile/constrained connections.
- Configure theme settings with system font handles (e.g. `system_ui_n4` for normal 400-weight) as defaults in `settings_schema.json`.
- Guard the `font_face` filter output with a `system?` check, and skip `preload`/`preconnect` tags when a system font is selected, since `font_url` returns an empty string for system fonts.

**Don't**
- Don't output `preload`/`font_face`/`preconnect` tags unconditionally if a system font may be selected — `font_url` on a system font handle returns an empty string.

```css
✅ System font stack
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, sans-serif;
}
```

```liquid
✅ Conditional font_face / font_url output guarded by system?
{%- unless settings.type_body_font.system? -%}
  {{ settings.type_body_font | font_face }}
  {{ settings.type_body_font | font_url | preload_tag: as: 'font', type: 'font/woff2', crossorigin: 'anonymous' }}
{%- endunless -%}
```

**Testing**: Chrome DevTools Network panel (filter by Font) should show zero font requests; Performance panel's Layout Shifts track should confirm no shift during render; compare FCP with/without system fonts; visually review across macOS, Windows, and Android.

---

#### Stylesheet Subsetting

**Why it matters**
Shopify automatically subsets CSS from `{% stylesheet %}` tags so a storefront page only loads styles from Liquid files actually present in that page's render tree, reducing CSS payload and improving load time (affects **FCP**/page weight).

**Do**
- Keep styles self-contained: define and use classes within the same Liquid file.
- Parent files may define classes used by children rendered via `{% render %}` — that's compatible with subsetting.
- Move any class that must be available globally (regardless of render tree) into `assets/*.css` and load it via `asset_url | stylesheet_tag` in the layout.
- Run `shopify theme check` and rely on Theme Check's `ValidScopedCSSClass` check (enabled by default) to catch cross-file dependency issues.

**Don't**
- Don't rely on a CSS class defined in one file's `{% stylesheet %}` being available in an unrelated file — if the defining file isn't in the render tree for that page, the class won't be included and styling will break. Example: `footer.liquid` using `.site-banner` defined in `header.liquid` fails on any page where the header doesn't render.

**Not affected by subsetting** (always included regardless of render tree):
- Asset stylesheets loaded via `asset_url | stylesheet_tag`
- Inline `style` attributes
- HTML `<style>` tags
- CSS inside `{% style %}` Liquid tags

```liquid
❌ Incorrect (cross-file dependency)
{% comment %} header.liquid {% endcomment %}
{% stylesheet %}
.site-banner { background: #000; color: #fff; }
{% endstylesheet %}

{% comment %} footer.liquid — breaks if header.liquid isn't in the render tree {% endcomment %}
<div class="site-banner">...</div>
```

```liquid
✅ Correct (self-contained, or moved to global assets/*.css)
{% comment %} footer.liquid {% endcomment %}
{% stylesheet %}
.site-banner { background: #000; color: #fff; }
{% endstylesheet %}
<div class="site-banner">...</div>
```

**Section Rendering API note**: dynamic section fetches include `<style data-section-stylesheet>` tags containing the subsetted CSS for that section — insert both the style tag and the section content into the DOM together.

---

#### Reserve Space for App-Injected Content

**Why it matters**
When apps inject content dynamically (review widgets, trust badges, shipping estimates, dynamic pricing), the browser shifts existing content to make room, causing **Cumulative Layout Shift (CLS)** — users lose their place or click the wrong element.

**Do**
- Allow `@app` blocks in the section schema and reserve space with CSS `min-height` on `.shopify-app-block` before the app's content loads.
- Use these recommended `min-height` ranges:
  - Small badges/ratings: `24px`–`30px`
  - Review summaries: `48px`–`60px`
  - Full review widgets: `80px`–`200px`
- Alternative designs: position injected content beside equally-tall static content, place widgets below the viewport/section bottom, or use a skeleton/shimmer placeholder.
- Test with Chrome DevTools Performance panel (Layout Shifts track) and the Rendering tab's "Layout Shift Regions" option, with network throttling enabled.

**Don't**
- Don't leave app blocks with no reserved height — that's what causes shift when the app's content loads asynchronously.

```json
✅ Allow @app block type in section schema
{
  "name": "Product",
  "blocks": [
    {
      "type": "@app"
    }
  ]
}
```

```css
✅ Reserve space via min-height on app blocks
/* Reserve space for app blocks inside the product info column */
.product__info-container .shopify-app-block {
  min-height: 48px;
}
```

**Related links**
- https://performance.shopify.com/blogs/blog/how-to-optimize-cumulative-layout-shift-cls-on-shopify-sites
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/prevent-image-layout-shift

---

#### Use Transform for Animations

**Why it matters**
Animating layout properties (like `bottom`, `top`, `left`, `width`, `height`) triggers layout recalculation on every frame, causing a layout shift each frame, janky animations, and poor **INP**. Animating only `transform` and `opacity` is hardware-accelerated and causes no layout shift, avoiding **CLS**.

**Do**
- Animate only `transform` and `opacity`.
- Always add `prefers-reduced-motion` support to disable animation/transition for users who request reduced motion.
- Test with Chrome DevTools Performance panel (Layout Shifts track), Rendering tab's "Layout Shift Regions," and by comparing CLS scores before/after.

**Don't**
- Don't animate layout-triggering properties such as `bottom`/`top`/`left`/`right`, `width`/`height`, or `margin`.

```css
❌ Incorrect
@keyframes slideUp {
  from {
    bottom: -100%;
  }
  to {
    bottom: 0;
  }
}
```
Problems: "creates a layout shift on every frame," triggers layout recalculation, causes janky animations, and poor INP scores.

```css
✅ Correct
@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
```
Benefits: "hardware-accelerated, no layout shift"

```css
✅ Required accessibility guard
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: none;
    transition: none;
  }
}
```

---

#### Reduce Mega Menu DOM Overhead

**Why it matters**
Excessive DOM nodes slow HTML parsing and style calculations, slow initial render (harming **FCP**), increase memory usage, and slow DOM manipulation (harming **INP**). A typical navigation that duplicates mobile and desktop menu markup can contain 500–2,000 DOM nodes; consolidating to one menu can cut that roughly in half.

**Do**
- **Solution 1 — Single menu, responsive CSS**: render navigation links once with identical markup; use CSS media queries to change presentation (e.g. hide the menu button on desktop with `display: none` at `@media (min-width: 750px)`); toggle drawer visibility in JS while managing the `aria-expanded` attribute.
- **Solution 2 — Hybrid rendering**: server-render only top-level links with Liquid; fetch submenu content asynchronously via JavaScript on user interaction using the Section Rendering API, loading submenu sections only when needed; provide fallback links for search bots and users without JavaScript.
- Test by inspecting the `<nav>` element and running `$0.querySelectorAll('*').length` before/after — DOM counts above 500 suggest duplicate menus. Compare FCP using the Performance panel. Verify functionality across breakpoints with device emulation, and test with JavaScript disabled to confirm bot/no-JS fallback links work.

**Don't**
- Don't render separate, fully duplicated DOM trees for mobile and desktop versions of the same menu.

```css
✅ Responsive single-menu pattern
@media (min-width: 750px) {
  .menu-button {
    display: none;
  }
}
```

```javascript
✅ Toggle drawer while managing aria-expanded
menuButton.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!expanded));
  drawer.hidden = expanded;
});
```

**Testing**
```javascript
$0.querySelectorAll('*').length
```

---

#### JavaScript and Stylesheet Tags (`{% javascript %}` / `{% stylesheet %}`)

**Why it matters**
These Liquid tags let sections, blocks, and snippets bundle their own JS/CSS while staying modular and portable; Shopify concatenates and (for CSS) automatically subsets the output per page, which is core to how `reduce-stylesheet-count` and `stylesheet-subsetting` techniques work above.

**Do**
- Use one `{% javascript %}` tag per file; Shopify concatenates contents into `scripts.js` (sections), `block-scripts.js` (blocks), or `snippet-scripts.js` (snippets). Content is wrapped in self-executing anonymous functions for scope isolation, and the resulting script loads asynchronously via the `defer` attribute.
- Use data attributes to pass per-instance configuration into `{% javascript %}` code (since Liquid variables can't be used inside the tag directly).
- Use one `{% stylesheet %}` tag per file; Shopify bundles these into a single `styles.css` and automatically subsets CSS per page render tree.
- Use inline `<style>` tags (not the bundled `{% stylesheet %}` tag) for instance-specific styles that vary per rendered instance.

**Don't**
- Don't use Liquid code (objects, tags, filters) inside `{% javascript %}` or `{% stylesheet %}` blocks — "this causes syntax errors."
- Don't add more than one `{% javascript %}` or one `{% stylesheet %}` tag per file.

```liquid
✅ javascript tag
{% javascript %}
  document.querySelector('.slideshow').slideshow();
{% endjavascript %}
```

```liquid
✅ Instance-specific JavaScript via data attributes
<div class="slideshow-wrapper" data-slide-speed="{{ section.settings.speed }}">
  <!-- content -->
</div>

{% javascript %}
  var slideshowSpeed = parseInt(document.querySelector('.slideshow-wrapper').dataset.slideSpeed);
{% endjavascript %}
```

```liquid
✅ stylesheet tag
{% stylesheet %}
.slideshow-wrapper {
  /* your styles */
}
{% endstylesheet %}
```

---

### Quick checklist

- Pass `skip_styles: true` to snippets rendered in a loop after the first iteration.
- Move global/site-wide component CSS into `base.css`; consolidate related component CSS files.
- Keep collection pages under 50 stylesheets, product pages under 30, homepage under 40.
- Load the first 3 sections' CSS synchronously; only async-load CSS for section 4+, and only after measuring it helps.
- Use `media="print" onload="this.media='all'"` plus a `<noscript>` fallback for non-critical, below-fold CSS.
- Add `defer` manually to non-critical `<script>` tags — `script_tag` doesn't support it.
- Never defer `content_for_header`, app ScriptTag-API scripts, or A/B-test anti-flicker snippets.
- Set a unitless `line-height` and add fallback `@font-face` overrides (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`) to kill font-swap CLS.
- Self-host custom fonts under `/assets` via `asset_url`, or use `font_picker` + `font_face`/`font_url` for library fonts; preload critical fonts with `preload_tag`.
- Limit to 1–2 font families, 2–4 weights each, under 6 font files total; always set `font-display: swap`.
- Prefer system font stacks when brand allows; guard `font_face`/`preload`/`preconnect` output with a `system?` check.
- Keep CSS classes scoped to the file (or its rendered children) that uses them, or move global classes into `assets/*.css`; run `shopify theme check` for `ValidScopedCSSClass` violations.
- Reserve space for `@app` blocks with `min-height` on `.shopify-app-block` (24–30px badges, 48–60px review summaries, 80–200px full widgets).
- Animate only `transform` and `opacity`; never animate layout properties like `top`/`bottom`/`width`/`height`.
- Always add a `prefers-reduced-motion: reduce` rule disabling animation/transition.
- Merge duplicate mobile/desktop menu DOM into one responsive menu, or hybrid-render submenus via the Section Rendering API on demand.
- Use one `{% javascript %}` and one `{% stylesheet %}` tag per file; never put Liquid code inside them.


---

