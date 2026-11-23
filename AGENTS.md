# AGENTS.md — how this theme is built

For any AI agent working on this theme (Claude Code, Shopify Sidekick, others). Online Store 2.0, Liquid only (no Hydrogen), started from Shopify's Skeleton theme (pre-v2: it has `sections/` and JSON templates). Every change must be performance-safe and accessible by default. These are rules, not a tutorial; each has a reason, so apply the reason to cases the rule doesn't name.

**Design**: before any visual or styling change, read `DESIGN.md` (only the sections the task touches). DESIGN.md decides how things look (brand: Mama Organic). This file decides how they're built, plus performance and accessibility limits. If a design instruction would break a rule here, build the nearest compliant version and say so.

**Shopify tooling**: if the Shopify AI Toolkit / Dev MCP is installed, call `learn_shopify_api` (`api_name: liquid`) once per conversation before other Shopify tools, use `search_docs_chunks` to confirm unfamiliar tags/filters/objects, and run `validate_theme` on the files you created or changed. Without it, verify Liquid against shopify.dev (append `.md` to any shopify.dev URL for Markdown) and run `shopify theme check`.

## Precedence
Constants below > deeper checklists (`.claude/rules/` for Claude Code) > reference examples. If anything contradicts a constant, follow the constant, finish, and name the stale line.

## Canonical constants
| Constant | Value |
|---|---|
| Eager/lazy section cut-off | `{% unless section.index > 2 %}` → eager (nil = eager). Never `<= 2` / `== 1` (nil in the editor). Stricter than Shopify's `image_tag` default (first 3 sections eager); set `loading` explicitly so the cut-off is ours |
| Eager items in grid/carousel | `forloop.index <= 4` |
| `fetchpriority="high"` | exactly 1 per page, the real LCP element |
| `srcset` widths | `352, 550, 832, 1200, 1500, 1920` (6 = Shopify's upper limit; never more) |
| Preload hints | 1–2 per page |
| Stylesheet requests | ≤ 3 per page (`{% stylesheet %}` adds 0) |
| Breakpoints (px, literal; `var()` doesn't work in `@media`) | min-width `360 · 480 · 576 · 768 · 992 · 1200 · 1440` ⇄ max-width `359 · 479 · 575 · 767 · 991 · 1199 · 1439`. Mobile-first `min-width` by default; `max-width` only with its exact pair |
| Ranges | ≤ 359 small phones · 360–479 phones · 480–575 large phones · 576–767 small tablets/landscape · 768–991 tablet portrait · 992–1199 tablet landscape/laptop · 1200–1439 desktop · 1440+ large (container cap) |
| Section padding | desktop (≥ 1200) 100% · tablet (576–1199) 75% · mobile (≤ 575) 50%, fluid `clamp()` |
| Test widths | 320 (reflow) / 375 / 430 / 576 / 768 / 992 / 1200 / 1440 + phone landscape 667×375 |
| Cart Section Rendering `sections` | `cart-drawer,cart-icon-bubble`; max 5 per request (6th → `400`) |
| `{% render %}` nesting | 2 (a 3rd only for a leaf snippet with no loop/lookups, not in a loop > 24) |
| Loop ceiling | outer × inner ≤ 100 items; paginate 24–36 |
| Contrast | text 4.5:1 · large text (≥ 24px / 18.66px bold) + UI 3:1 |
| Touch target | ≥ 44×44 px on any screen that could be touch (Theme Store minimum is 24×24; ours is stricter) |
| Lighthouse mobile | Performance ≥ 70 · Accessibility ≥ 95 · Best Practices ≥ 95 · SEO ≥ 95; no category may drop vs live (Theme Store floor: perf 60 / a11y 90 average of home, product, collection) |

**Targets:** LCP < 2.5s · INP < 200ms (TBT < 200ms in lab) · CLS < 0.1 · FCP < 1.8s · TTFB < 600ms · Speed Index < 3.4s, on mobile with Slow 4G and 4× CPU. The mobile score is the real score.
**Budgets per template** (home / product / collection / cart; Brotli transfer as in DevTools "Size", cold load): theme JS ≤ 150 KB · theme CSS ≤ 60 KB · LCP image ≤ 150 KB → a breach blocks merge. Platform + apps (`content_for_header`, consent, pixels, checkout, app assets) JS ≤ 100 KB → escalate to the merchant; never change theme code to compensate. DOM < 1,500 nodes · depth ≤ 32 · ≤ 60 children per parent · ≤ 3 third-party origins · no task > 50 ms · 0 lazy images above the fold.

## Hard rules (if a request conflicts: name the rule, the metric it hurts, the compliant alternative)
1. LCP image: never lazy, never animated/opacity:0, never a CSS background. No popup/age-gate painting before or over it. No lazy image above the fold.
2. Images only via `image_url` → `image_tag` with `widths`, `sizes`, width/height. No hand-built CDN URLs, no deprecated image filters (`img_url`, `img_tag`, `product_img_url`, `collection_img_url`, `article_img_url`).
3. Hero, title, price, add-to-cart and nav are server-rendered Liquid and work without JS.
4. No `{% include %}`. No resource loop inside a resource loop. No repeated metafield lookup in a loop. Never fetch more than you render.
5. `<head>`: only `content_for_header` + one critical stylesheet block render. All theme JS `type="module"`/`defer`.
6. Heavy UI (drawers, modals, search, size guides, quick-view, carousels, video, reviews, chat, maps) initialises on first interaction. Debounce/throttle scroll, resize, mousemove, input.
7. Zero third-party scripts by default; Shopify CDN only; no reverse proxy; no leftover anti-flicker snippets.
8. Animate `transform`/`opacity` only. One exception: accordion/FAQ/disclosure panels may animate `grid-template-rows: 0fr → 1fr` if ≤ 300 ms, `contain: layout paint`, not above the fold, and off under `prefers-reduced-motion`. Every animation respects `prefers-reduced-motion`.
9. Reserve space for anything that loads late. Fonts: `font-display: swap` + metric overrides, or a system stack.
10. Cart, facets, pagination, quick-add use the Section Rendering API with only the sections in the constants.
11. Semantic HTML first, ARIA only where needed. Keyboard operable, visible focus, correct heading order, labelled controls, unique input IDs.
12. No hardcoded colours, strings or URLs: colours from settings tokens, strings via `t`, URLs from `routes`.
13. SEO: `page_title`, `page_description`, `canonical_url` and OG tags in the layout head; one `h1` per page; JSON-LD that matches visible content (never invented ratings); internal links via `product.url` (no `within: collection`); crawlable `<a href>` pagination.
14. Best practices: no console errors or logging, no deprecated APIs, no `eval`, HTTPS only, no permission prompts on load. No Sass; no minified theme CSS/JS (Theme Store).
15. Design source (DESIGN.md, Figma) that breaks contrast or a hard rule → build the nearest compliant version and flag it. Never silently ship either.

## Composition model
- `sections/` = page areas the merchant adds/reorders. `blocks/` = theme blocks (reusable, nestable, merchant-configurable). `snippets/` = code reuse with no merchant settings. `layout/` = wrappers. `templates/*.json` = composition only (users may also build templates in the editor, so ship snippets, blocks and sections, not one-off templates).
- **Block vs snippet**: needs merchant settings or reordering → block; pure markup reuse → snippet with a `{% doc %}` contract (`@param`, `@example`). Statically rendered blocks (`{% content_for 'block', type:, id: %}`) also need `{% doc %}`.
- Every block wrapper outputs `{{ block.shopify_attributes }}`. Section/block JS re-initialises on `shopify:section:load`.
- **Current inventory** (Skeleton baseline — update as the theme grows):
  - Layout: `layout/theme.liquid` (renders `css-variables`, `base.css` with `preload: true`, `meta-tags`; section groups `header-group` / `footer-group`), `layout/password.liquid`.
  - Sections: one per template (`product`, `collection`, `collections`, `cart`, `search`, `article`, `blog`, `page`, `404`, `password`) + `header`, `footer`, `custom-section`, `video` (standalone video section: hosted + YouTube/Vimeo embed + muted autoplay), `hello-world` (demo; delete when no template uses it).
  - Blocks: `text` (richtext), `group` (nestable container), `heading` (h1–h6 dynamic tag, fluid clamp sizes), `subheading` (eyebrow label, uppercase, letter-spaced), `custom-liquid` (merchant Liquid/HTML input), `buttons` (two buttons, horizontal flex, primary/secondary/outline styles), `image` (image_picker, link, alt override, border-radius, canonical srcset widths), `icon-with-text` (icon image + heading + subtext, column layout), `menu` (nav menu, optional heading omitted when blank).
  - Snippets (shared, ask before changing): `image` (rendered by 5 sections), `css-variables` (design tokens → `:root`), `meta-tags` (title/description/OG, both layouts).
  - Assets: `base.css` (every page, reset + base + skip-link styles), SVG icons.
- **Known gaps vs these rules** (fix when touching the file): `snippets/image.liquid` has no `widths`/`sizes`/loading control (hard rule 2); `sections/hello-world.liquid` uses a non-canonical `max-width: 1100px`.
- Naming: files kebab-case (`section-name.liquid`); CSS classes BEM by file (`.product-card__title`); IDs CamelCase + `{{ section.id }}`/`{{ block.id }}` suffix; settings ids snake_case.

## Styling and tokens
- Colours, type, spacing, radius from theme settings via CSS custom properties output in `snippets/css-variables.liquid`; values and roles are documented in `DESIGN.md`. Never hardcode a value DESIGN.md names as a token. A new colour → add a setting to `settings_schema.json` first.
- Colour settings: at least 4, and every background colour setting has a matching foreground setting (Theme Store).
- Section CSS lives in `{% stylesheet %}` (bundled, 0 requests); live-preview settings in `{% style %}`; one-property settings as inline CSS variables (`style="--gap: {{ block.settings.gap }}px"`); multi-property settings as a class from a `select`. No `!important`, no IDs in selectors.
- `{% stylesheet %}` is subset per page: it ships only when its file renders. A class used by more than one unrelated file goes in `assets/` CSS, not in one file's `{% stylesheet %}` (Theme Check `ValidScopedCSSClass`). No Liquid inside `{% stylesheet %}`/`{% javascript %}`.
- `assets/` holds only critical CSS and every-page files.
- `DESIGN.md` → "Generated token index" block: regenerate it from `settings_schema.json` + `css-variables.liquid` when tokens change; never hand-edit inside the markers.

## JavaScript
Web components (`customElements.define`), ES modules, `const`, `for...of`, `AbortController` cleanup in `disconnectedCallback`, event delegation, no libraries without a written reason. Editor-only code behind `Shopify.designMode` / `request.design_mode`.

## Translations
- All storefront text via `{{ 'key' | t }}` in `locales/en.default.json`; schema labels via `t:` keys in `locales/en.default.schema.json`; sentence case.
- Keys: nested by area then component (`products.product.add_to_cart`, `sections.cart.empty`), snake_case, reuse `general.*` before adding a duplicate. Variables via `{{ 'key' | t: count: n }}`, pluralise with `one`/`other`. Never concatenate translated fragments.
- Delete unused keys with the code that used them.

## Change authority
- Proceed: anything the task names or obviously needs (its section, new blocks/snippets/stylesheets, schema, locale keys).
- Ask first: shared files outside the named scope (`layout/`, global CSS/tokens, a snippet rendered by 2+ sections, `config/settings_schema.json`, removing/renaming a populated setting), and edits to `AGENTS.md` / `DESIGN.md`.
- Never without approval: delete a section/template/snippet; rename a schema `id`; change selectors other sections use; publish or push to a live theme.
- Never edit `config/settings_data.json` (merchant data; the theme editor overwrites it). It is in `.shopifyignore`.

## Before coding, flag the cost
New script (KB, execution time, blocking?) · new origin · new font/weight · new above-fold element (new LCP?) · late-injected element (CLS) · new product/collection/metafield loop (TTFB) · library instead of native · changed shared selectors.
Fix order: LCP → CLS → INP/TBT → FCP → TTFB → semantics/a11y. Prefer fewer requests, less JS, more server-rendered Liquid, less DOM.

## Maintaining this file
- Exact names `AGENTS.md` and `DESIGN.md`, theme root only, ≤ 50 KB each (Shopify won't save other casings or locations). Synced by Shopify CLI ≥ 4.8.4 (`theme pull/push/package`), the GitHub integration (both directions) and the admin code editor. Never served on the storefront.
- Update this file in the same change that introduces a new architectural pattern (and the inventory above when sections/blocks/snippets are added or removed).
- Not the same as `templates/agents.md.liquid` (the public `/agents.md` page for shopping agents).
- Sidekick can edit `DESIGN.md` when a merchant restyles the store: pull before starting local design work.
- Full Liquid filter/object/tag signatures and long examples (from Skeleton's original AGENTS.md) live in `.claude/skills/theme-reference/skeleton-reference.md`.
