---
paths:
  - "**/*.css"
  - "**/*.css.liquid"
  - "sections/**/*.liquid"
  - "blocks/**/*.liquid"
  - "snippets/**/*.liquid"
  - "layout/**/*.liquid"
---
# CSS + responsive

**Architecture**
- BEM for component internals; utilities for layout primitives (display, flex/grid, gap, justify/align, margin/padding, width, text-align, font-size/weight, radius, visibility).
- Reuse a utility before writing CSS. Missing one → add it as a reusable utility, never a one-off or a duplicate under a new name.
- Single-class selectors (0-1-0). No IDs, no `!important`. Utilities load after components; wrap component bases in `:where()` when a utility must win.
- Colours, fonts, sizes, spacing from theme setting tokens (CSS custom properties). Missing colour → add it to theme settings (`settings_schema.json`) first, then reference it. Brand values live in theme settings, not code. Default values and roles are in `DESIGN.md` → Colors; never copy a hex from there into CSS.
- Fixed type scale and spacing scale: no arbitrary pixel values. Use CSS variables to remove repetition.
- Native nesting (safe: Chrome/Edge 112+, Safari 16.5+, Firefox 117+), 1 level deep, plus `@media` and state selectors (`&:hover`, `&.is-active`, `&[aria-expanded]`). Nest `@media` inside the component.
- Baseline-check new features on MDN; wrap non-baseline in `@supports`. Test Safari explicitly. Prefixes only where MDN requires them. No IE. Logical properties for RTL.

**Where CSS lives**
- One authoring file per section or template (not one global file), named by scope: `section-hero`, `template-product`. A page's CSS loads only on that page.
- Component/section styles → `{% stylesheet %}` (bundled, subset, deferred; 0 extra requests).
- Setting that must live-preview (colour/font/size) → `{% style %}`.
- Instance-specific dynamic value without live preview → inline `<style>` scoped to `#shopify-section-{{ section.id }}`.
- One-property setting → CSS variable `style="--gap: {{ block.settings.gap }}px"` + `gap: var(--gap)`. Multi-property → class toggled by the setting value, all variants in `{% stylesheet %}`.
- Critical CSS in `theme.liquid`: inline `<style>` if < ~14 KB, else one `stylesheet_tag: preload: true`. Never both. Never `<link rel="stylesheet">`/`stylesheet_tag` inside a section.
- Other CSS non-blocking: `media="print" onload="this.media='all'"` + `<noscript>`. No `@import`.
- Below-fold sections: `content-visibility: auto` + `contain-intrinsic-size`.

**Motion**
- Allow-list: `transform`, `opacity`. `will-change` only during the animation, then remove it. `contain: layout paint` on animated components.
- **Disclosure exception** (accordions, FAQ panels, disclosure content): `grid-template-rows: 0fr → 1fr` (child `min-height: 0; overflow: hidden`) only if ALL hold: ≤ 300 ms · `contain: layout paint` · not above the fold or on the LCP path · disabled under `prefers-reduced-motion`. Otherwise reserve the panel height. Never `max-height`/`height` transitions.
- Every other animation/transition: `@media (prefers-reduced-motion: reduce) { animation: none; transition: none; }` (Theme Store gate).

**Breakpoints** (the only allowed values; write them as literal px — `var()` does not work inside `@media`)
| Range | Devices | Mobile-first (default) | Desktop-first pair |
|---|---|---|---|
| 0–359 | small phones (iPhone SE 320, Galaxy Fold) | base styles | `max-width: 359px` |
| 360–479 | standard phones (360–430) | `min-width: 360px` | `max-width: 479px` |
| 480–575 | large phones, phone landscape | `min-width: 480px` | `max-width: 575px` |
| 576–767 | small tablets, landscape phones | `min-width: 576px` | `max-width: 767px` |
| 768–991 | tablet portrait | `min-width: 768px` | `max-width: 991px` |
| 992–1199 | tablet landscape, small laptops | `min-width: 992px` | `max-width: 1199px` |
| 1200–1439 | desktop | `min-width: 1200px` | `max-width: 1439px` |
| 1440+ | large desktop (container max) | `min-width: 1440px` | — |
- Default: mobile-first `@media screen and (min-width: …)`. Use a `max-width` query only for a "below X only" exception, and only with the exact pair (`min-width: 768px` ⇄ `max-width: 767px`) so ranges never overlap or leave a 1px gap. Ranges: `(min-width: 768px) and (max-width: 991px)`.
- Typical layout: ≤ 575 single column + hamburger · 576–767 2-up cards · 768–991 2-column, nav may still collapse · 992–1199 full nav, 3 columns · ≥ 1200 3–4 columns, 1440 container cap.
- Not every component needs every breakpoint. Add one only when the layout actually changes there.
- JS uses the same values: `matchMedia('(min-width: 992px)')`. Optional mirror tokens for JS/docs: `--bp-md: 768px` etc. (not usable in `@media`).
- An existing theme with different breakpoints: follow this table for new code and flag the mismatch; don't silently mix two systems.

**Mobile essentials**
- `layout/theme.liquid` viewport: `<meta name="viewport" content="width=device-width, initial-scale=1">`. Never `maximum-scale` or `user-scalable=no` (blocks zoom; a11y fail).
- Reflow: usable at 320px wide (= 400% zoom, WCAG 1.4.10) with no horizontal scroll; only data tables and carousels may scroll inside themselves.
- Full-height mobile layouts: `100svh`/`100dvh` with a `100vh` fallback line before it. Never bare `100vh` (the iOS toolbar cuts off CTAs and causes jumps).
- Fixed/sticky bars (header, sticky ATC, cookie bar): pad with `env(safe-area-inset-bottom)`/`-top`; together they must leave the main content usable in phone landscape (≈ 375px tall).
- Hover-only effects behind `@media (hover: hover) and (pointer: fine)`; every hover action also works on tap.
- Desktop-first `max-width` queries only for genuine mobile-only exceptions; default is `min-width`.

**Spacing**
- Section padding with `clamp()` (fluid) built on spacing tokens: mobile (≤ 575) = 50% of desktop, tablet (576–1199) = 75%, desktop (≥ 1200) = 100%. Never one fixed px value across all widths.
- Spacing tokens as custom properties, overridden in breakpoint queries. Grid/flex `gap` scales too.
- Container max = theme max or 1440, with inline padding so content never touches the edge.

**Type**
- If the theme has a fluid type scale, use it; don't add a competing one. Otherwise headings use `clamp()` with a `rem` floor (never bare `vw`): h1 `clamp(1.75rem, 1rem + 3vw, 3.5rem)`, h2 `clamp(1.5rem, .9rem + 2.4vw, 2.75rem)`, h3 `clamp(1.25rem, .8rem + 1.8vw, 2rem)`, h4 `clamp(1.125rem, .75rem + 1.2vw, 1.5rem)`.
- Headings visibly smaller on mobile, but h1 > h2 > h3 > h4 at every width. Body fixed at the base size (no clamp). Line-height: headings 1.1–1.3, body 1.5–1.7.

**Layout checks** (at every test width)
- No horizontal scrollbar; no overflow, truncation or overlap. Grids drop columns (never more than 2 below 576, never 4 below 992).
- Nav usable at every width; a hamburger drawer is tested at 320 and 375.
- Buttons/CTAs fully visible and tappable; touch targets ≥ 44×44.
- Forms: full-width inputs, visible labels, the keyboard doesn't cover the active field.
- Touch works for dropdowns, drawers, accordions, swipe, add-to-cart.
- Content parity: don't `display:none` content users or bots need; render once, adapt with CSS (no duplicate mobile/desktop menus). No interstitial, sticky bar or popup covering primary content or the main CTA on small screens.
