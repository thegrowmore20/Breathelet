# DESIGN.md — design contract

How this store looks and feels, and why. Agents read this before any visual change; Sidekick may update it when the merchant restyles the store. Records **decisions, not code** (code conventions live in `AGENTS.md`). Names **theme tokens/settings**, not raw values in code: the hex values below are the *defaults* for `config/settings_schema.json`, never literals in CSS. Every rule is checkable. Keep under 15 KB.

## Brand overview
Breathelet (breathelet.com): a mindful wearable bracelet for the premium wellness market. The bracelet sends a gentle haptic vibration every 60–150 minutes as a breathing reminder — no app, no screen, no Bluetooth. Products come in Gunmetal, Sunshine Gold, Rose Gold, and Beige finishes; also sold as gift pairs and in an OneFit adjustable version. Audience: health-conscious adults, gift buyers, mindfulness practitioners globally. Price positioning: mid-to-premium (USD). Personality: **calm · minimal · premium · honest · intentional**.

## Design thesis
Dark sky, one breath: a near-black canvas with warm rose–terracotta as the sole accent. Everything feels intentional and unhurried — no noise, no clutter, one focal element per section. The palette references earth (clay, stone, night), and the terracotta secondary adds organic warmth without breaking the stillness. All typography is set in Instrument Serif for headings (editorial, timeless) and Inter for body (clear, invisible). The experience mirrors the product: quiet, then a moment of awareness.

## Source of truth
- Colours, type, spacing and components defined here, 2026-11-20. When the live site and this file disagree, this file wins; flag the conflict.
- HTML mockup references: `home-v2.html`, `home-v3.html`, `home-v4.html` and `home-v4-dark.html` (located in the user's Downloads). V3 dark mode typography scale is applied.
- Figma: none yet. If one is added, link it here (page/frame names).
- Accessibility and performance limits in `AGENTS.md` override anything here (contrast 4.5:1 text / 3:1 UI, 44×44 touch targets, no LCP animation, transform/opacity motion only).

## Colors
Tokens are CSS custom properties output from theme settings in `snippets/css-variables.liquid`. Settings marked *(add)* don't exist in the Skeleton theme yet: add them to `settings_schema.json` (shared file → ask first) before use.

| Name | Token / setting | Default | Role | Allowed on |
|---|---|---|---|---|
| Background | `--color-background` / `settings.background_color` | `#080706` | page bg, deepest layer | — |
| Surface | `--color-surface` / `settings.color_surface` *(add)* | `#131110` | alternate section bg, product image bg, cards | — |
| Surface elevated | `--color-surface-elevated` / `settings.color_surface_elevated` *(add)* | `#1E1A18` | drawers, modals, dropdowns | — |
| Foreground | `--color-foreground` / `settings.foreground_color` | `#F4EEE8` | primary body copy, icons | Background, Surface, Surface elevated |
| Foreground muted | `--color-foreground-muted` / `settings.color_foreground_muted` *(add)* | `#857870` | compare-at price, meta, captions, breadcrumbs, form-field borders | Background, Surface |
| Secondary (rose clay) | `--color-secondary` / `settings.color_secondary` *(add)* | `#A57C72` | links, inline text highlights, badges, progress indicators, focus ring, eyebrow labels | Background, Surface (large text only on Surface) |
| Secondary dark | `--color-secondary-dark` / `settings.color_secondary_dark` *(add)* | `#7A5047` | primary CTA bg (with white text), button hover/pressed state | — |
| Border | `--color-border` / `settings.color_border` *(add)* | `#252020` | card outlines and dividers only (decorative) | — |
| Star | `--color-star` / `settings.color_star` *(add)* | `#D4A843` | rating stars (decorative) | — |
| Error | `--color-error` / `settings.color_error` *(add)* | `#E05C5C` | form errors, out-of-stock text | Background |
| Success | `--color-success` / `settings.color_success` *(add)* | `#5CAF80` | form success, "in stock" | Background |

**Approved text/background pairs** (WCAG contrast ratios measured; nothing else for text):
| Text | On | Ratio | Use |
|---|---|---|---|
| Foreground `#F4EEE8` | Background `#080706` | ≈ 18.1:1 | any text |
| Foreground `#F4EEE8` | Surface `#131110` | ≈ 14.6:1 | any text |
| Foreground `#F4EEE8` | Surface elevated `#1E1A18` | ≈ 11.3:1 | any text |
| Foreground muted `#857870` | Background `#080706` | ≈ 5.4:1 | any text |
| Foreground muted `#857870` | Surface `#131110` | ≈ 4.6:1 | any text |
| Secondary `#A57C72` | Background `#080706` | ≈ 5.8:1 | links, labels (any size) |
| Secondary `#A57C72` | Surface `#131110` | ≈ 4.9:1 | links, labels (any size) |
| Background `#080706` | Secondary `#A57C72` | ≈ 5.8:1 | button text on Secondary bg |
| White `#FFFFFF` | Secondary dark `#7A5047` | ≈ 5.9:1 | CTA button text on Secondary dark bg |
| White `#FFFFFF` | Secondary `#A57C72` | ≈ 3.6:1 | **large text ≥ 24px or bold ≥ 18.66px, and UI controls only** |
| Error `#E05C5C` | Background `#080706` | ≈ 5.2:1 | error messages |
| Success `#5CAF80` | Background `#080706` | ≈ 5.5:1 | success messages |

Rules (checkable):
- One primary CTA per viewport uses Secondary dark fill + white text, or Secondary fill + dark text.
- Never two filled accent buttons side by side.
- Secondary is never small body copy on Surface (use Foreground instead).
- Status colours (error, success, sale) always come with text or an icon, never colour alone.
- Border `#252020` (< 2:1) is decorative only. Inputs, checkboxes and other control boundaries use Foreground muted (≥ 3:1, WCAG 1.4.11).
- Star colour is decorative: every rating also shows its number as text ("4.8", "(126 reviews)").
- Focus ring: 2px solid Secondary `#A57C72`, offset 3px (use Foreground `#F4EEE8` offset ring on Secondary-background elements).
- App widgets (reviews, wishlist) are styled with these tokens; don't add apps' own default colours unless they match.

## Typography
Google Fonts: **Instrument Serif** (headings) + **Inter** (body, UI). Max 2 families, 5 weights in total: Instrument Serif 400 (normal + italic) · Inter 300 / 400 / 500 / 600 / 700.

Font tokens set via CSS custom properties in `layout/theme.liquid` (override of Shopify's font-picker system):
```
--font-heading-family: 'Instrument Serif', Georgia, serif;
--font-body-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

| Style | Family | Weight | Size (desktop) | Size (mobile ≤ 767px) | Line height | Letter spacing | Role |
|---|---|---|---|---|---|---|---|
| Display (.h0) | Instrument Serif | 400 | `clamp(52px, min(6.4vw, 11vh), 108px)` | `clamp(38px, 12vw, 60px)` | 0.92 | −0.02em | hero display heading |
| H1 | Instrument Serif | 400 | `clamp(44px, min(5.6vw, 10vh), 92px)` | `clamp(36px, 11vw, 56px)` | 0.94 | −0.02em | page title (one per page) |
| H2 | Instrument Serif | 400 | `clamp(38px, min(5.4vw, 9vh), 78px)` | `clamp(28px, 9vw, 44px)` | 0.96 | −0.02em | section title |
| H3 | Instrument Serif | 400 | `clamp(28px, 2.8vw, 40px)` | `clamp(22px, 7vw, 32px)` | 1.04 | −0.02em | sub-section |
| H4 | Instrument Serif | 400 | `clamp(21px, 2vw, 27px)` | — | 1.1 | −0.02em | card group titles |
| H5 | Inter | 500 | 16px | — | 1.3 | 0 | small headings |
| H6 | Inter | 500 | 14px | — | 1.4 | 0 | labels as headings |
| Body | Inter | 400 | 16px | 14px | 1.6 | 0 | copy |
| Eyebrow / chip | Inter | 500 | 12px | 12px | 1 | 0.15–0.2em | section labels, pill chips |
| Button / nav | Inter | 500 | 14px | 14px | 1 | 0.04em | buttons, navigation |
| Rating / proof | Inter | 400 | 14px | 14px | 1.4 | 0 | star ratings, social proof |
| Small / meta | Inter | 400 | 13px | 13px | 1.5 | 0 | compare-at price, breadcrumbs, counts |

Rules:
- Headings are always Instrument Serif 400 — no bold headings.
- `letter-spacing: -0.02em` on all heading levels (H0–H4). H5/H6 use 0.
- `text-wrap: balance` on headings. h1 > h2 > h3 > h4 at every viewport width.
- Sentence case everywhere. Uppercase only for eyebrow/chip labels (≤ 4 words) with `letter-spacing: 0.15–0.2em`.
- Body is 16px desktop → 14px mobile (`@media (max-width: 767px)`).
- Italian oblique (Instrument Serif italic) is available for editorial accent text; use sparingly.

## Spacing and composition
- Spacing scale (4px base): `--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 20 · `--space-6` 24 · `--space-8` 32 · `--space-10` 40 · `--space-12` 48 · `--space-16` 64 · `--space-20` 80 · `--space-24` 96. No other values.
- Section padding: 100px desktop (≥ 1200) → 75px tablet (576–1199) → 50px mobile (≤ 575), fluid via `clamp()`. Merchant setting per section: top/bottom range 0–120, default 100.
- Radius: `--radius-s` 2px (badges, chips, pagination) · `--radius-m` 4px (inputs, cards) · `--radius-l` 8px (buttons, drawers) · `--radius-pill` 999px (filter chips, pill labels). Minimal radius reinforces the premium dark aesthetic.
- Shadow: `--shadow-soft` = `0 4px 24px rgb(0 0 0 / .4)` for floating elements and drawers. Cards use a 1px border, not a shadow. No glows.
- Container max width: 1440px with `--page-margin` inline padding (min 20px mobile, 40px desktop).
- Grid columns: ≤ 575 → 1 product card (or 2 small tiles) · 576–767 → 2 · 768–991 → 2–3 · 992–1199 → 3 · ≥ 1200 → 4 products / 3 editorial tiles / 3 blog cards.
- Rules: one focal element per section · sections alternate Background and Surface for rhythm — never two identical surfaces adjacent · text on photography always uses `--overlay` (Background at 50–70% opacity) to meet 4.5:1 · generous white-space; resist filling space.

## Components
- **Buttons**: height 48px (min 44 on every screen), padding `0 32px` (mobile `0 20px` inside cards), radius `--radius-l`.
  - Variants: *primary* (Secondary dark `#7A5047` bg, white text; use for main CTA) · *secondary* (Secondary `#A57C72` bg, Background text — 5.8:1 ✓; for supporting CTAs) · *ghost* (1px Secondary border, Secondary text, transparent bg; for tertiary actions) · *text link* (Secondary text, underlined; inline only).
  - States: hover = opacity 0.85 (`@media (hover: hover)`) · focus = focus ring · active = darken 10% via `filter: brightness(.9)` · disabled = 35% opacity, `aria-disabled` · loading = text hidden + spinner, keeps width, `aria-busy="true"`.
  - Never more than one primary button per viewport.
- **Product card**: Surface bg, 1px Border, radius `--radius-m`. Media 4:5 aspect on Surface. Second image fades in on hover, desktop only, `opacity` 300ms. Max **1 badge**, top-left, Secondary bg + dark text, 11px/500 all-caps (sale > gift > new). Title: Foreground, Instrument Serif 400, max 2 lines. Rating: stars + number + count. Price: current in Foreground, compare-at in Foreground muted 13px strikethrough + visually hidden "Regular price". Quick-add: full-width ghost button at card bottom (Section Rendering API); stays visible on mobile.
- **Header**: announcement bar (Surface bg, Foreground muted text, one message, no auto-rotating carousel). Logo: white SVG, max 120px wide mobile / 160px desktop. Nav: hamburger drawer ≤ 991, full nav ≥ 992. Sticky header: compact, max 60px. Nav links: Foreground, Inter 400 14px; active/hover: Secondary. Sticky header background: Background at 90% opacity with `backdrop-filter: blur(12px)`.
- **Footer**: Surface bg, Foreground muted text. Columns: 4 on ≥ 992, `<details>` accordion on ≤ 767. Contact items with icons, newsletter (visible label, Success/Error messages), social icons as 44×44px circles (Secondary border, Secondary icon), payment icons in Foreground muted.
- **Form fields**: label always visible above the input (no placeholder-only labels). Height 48px, radius `--radius-m`, 1px Foreground muted border, focus ring. Error: Error text + icon below, `aria-describedby`, `aria-invalid="true"`.
- **Collection filters**: "Filter" pill toggle opens a left drawer (max 380px, `transform` slide 300ms, Surface elevated bg, backdrop `opacity`). Active filters are Surface chips with Secondary text + "×" remove. Results count in a live region.
- **Cart drawer**: right side, full width ≤ 575, 400px ≥ 576. Surface elevated bg. Free-shipping progress bar uses `transform: scaleX`. Line items: image 4:5, title, variant (Foreground muted), quantity stepper (44px buttons), price. Checkout = primary button.
- **PDP gallery**: main 1:1 or 4:5 on Surface, thumbnails below on mobile (swipe), at the side on ≥ 992. First image eager (LCP), rest lazy.
- **Reviews**: app widget styled with tokens. Stars always show the number. Never invent ratings.
- **Pagination**: real `<a href>` links, 44px targets, radius `--radius-s`, current page in Secondary bg + dark text with `aria-current="page"`.
- **Blog card**: media 16:10, radius `--radius-m`, title Instrument Serif 400 22px max 2 lines, 3-line excerpt in Foreground muted Inter 400 14px, "Read →" in Secondary.

## Imagery
- Photography: product packshots on Surface (dark) or true black. Lifestyle images show the bracelet worn on wrists, natural environments (stone, water, sky), warm light. Calm, not action.
- Aspect ratios: hero 16:9 desktop / 9:16 or 4:5 mobile (art-directed `<picture>`) · product card 4:5 · PDP 1:1 or 4:5 · editorial / story 1:1 or 3:4 · blog 16:9.
- Overlay: Background at 50–70% opacity when text sits on a photo. Never light overlays.
- Product finish colours: Gunmetal (#5A5B5C, cool), Sunshine Gold (#C9A84C, warm), Rose Gold (#C4857E, warm), Beige (#D4C5B0, neutral). These are display/visual only, never brand tokens.
- Icons: inline SVG, 1.5px stroke, 20px (UI) / 24px (nav), `currentColor`.

## Motion
- Allowed: `opacity` and `transform` only, 150–300ms, `ease` (`--ease-standard: cubic-bezier(.2, 0, 0, 1)`). Links: colour 150ms. Never layout properties.
- Never animated: hero/LCP image and heading, prices, the add-to-cart button's position.
- Everything is off under `prefers-reduced-motion: reduce`.
- Section reveals: a subtle fade-up (`opacity: 0 → 1`, `transform: translateY(20px) → 0`) only for below-fold sections, 300ms, controlled by the `scroll-animations-enabled` class.

## Voice in UI
- Calm, direct, minimal. Sentence case. Short active verbs: "Add to cart", "Shop now", "Explore", "Gift this".
- Breathing-related copy is used sparingly and authentically — the product *is* the reminder; don't over-explain.
- Errors explain the fix clearly. Empty states suggest a next step ("Your cart is empty — explore the collection").
- Claims ("gentle vibration", "no app", "water-resistant") only where the product data supports them. Never invented urgency.
- Prices in the merchant's currency via `money` filters, never hardcoded symbols.

## Dos and don'ts
- Do: use Surface behind product cards · keep one primary CTA per section · show ratings with numbers · generous padding between sections · test every new colour pair against the table above.
- Don't: carousels for hero content · light/white backgrounds anywhere · more than 2 CTAs per section · Secondary text on Surface below 24px without checking the contrast · borders in `#252020` for form controls (use Foreground muted instead) · `!important` overrides for app widgets.

## Generated token index
<!-- GENERATED:START — optional. Paste or regenerate the token/class index here (e.g. from settings_schema.json). Agents must preserve this block and not hand-edit it. -->
<!-- GENERATED:END -->

## Change log
- 2026-11-20: full rewrite for Breathelet dark mode. Primary black `#080706`, secondary rose clay `#A57C72` / `#7A5047`. Typography: Instrument Serif headings + Inter body (already applied to `layout/theme.liquid`). Contrast measured for all approved pairs. Previous Mama Organic contract replaced.
