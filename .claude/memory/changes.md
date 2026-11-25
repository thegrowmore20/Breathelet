## 2026-11-25 - bento/philosophy spacing alignment
- sections/bento-benefits.liquid: wrapper now 'section section--full-width' + render 'section-bg-number-vars'.
- sections/philosophy.liquid: added render 'section-bg-number-vars'.
- Pushed to theme 204901220687 (Breathelet Revamp | Before Black Friday V2) with --only on those two files.
- Not changed: bento is transparent/full-width vs philosophy's inset black rounded panel.


## 2026-11-25 - homepage rebuild sections
- New: sections/specs-every-day.liquid (v2 .sp), gift-banners.liquid (v4 #gift .bn), love-cards.liquid (vercel #love), community-cards.liquid (vercel #community).
- templates/index.json: 4 sections added after bento_benefits_home.
- Repaired mojibake (UTF-8 double-encoding) I introduced earlier in bento-benefits.liquid and philosophy.liquid.
- Dropped from source: gsap scroll, rv/fade JS, stroke-draw, counter, add-to-cart JS, non-transform hover transitions.


## 2026-11-25 - bento dynamic + palette
- bento-benefits.liquid rebuilt: eyebrow/heading settings, tile blocks (style, width, marker, icon, title, text), colour settings; rv JS removed in favour of theme data-animation (fixes content hidden without JS).
- index.json: bento_benefits_home now has 5 tile blocks.
- specs, gift, love, community: primary #000000 / accent #A57C72 colour settings replace theme button tokens.


## 2026-11-25 - dark luxury palette & visual polish
- specs-every-day.liquid: switched from light grey/white to #000000 bg + #0E0D0C surface + #A57C72 eyebrow/numbers/icons/em, fixed italic kerning.
- gift-banners.liquid: switched section bg to #000000, warm obsidian #141211 + #0B0A0A cards with #A57C72 ambient glow & CTAs, refined right-card image padding/scrim to eliminate text overlap.
- love-cards.liquid: CSS grid row alignment so numbers/icons/dividers align across all 6 cards, #0C0B0A surface, #A57C72 numbers/accents, responsive 6/3/2/scroll.
- community-cards.liquid: strengthened bottom scrim for text contrast, unified button weights/focus rings, hover polish + reduced-motion support.
- Pushed to theme 204901220687 (--only) and GitHub.


## 2026-11-25 - typography alignment, background banners, dynamic product price, arrows removed
- community-cards.liquid: removed top-right arrows (.cm-go), aligned eyebrow to theme .subheading and card headings to theme heading_size classes.
- gift-banners.liquid: converted card images to full-bleed background images with gradient scrim, added optional product picker + show_price toggle for dynamic price/link, removed hardcoded .99 from index.json, aligned eyebrow to .subheading and heading to theme heading_size.
- specs-every-day.liquid & love-cards.liquid: aligned section headings to theme h0 (3X-Large) via heading_size setting and eyebrows to theme .subheading.
- Pushed to theme 204901220687 (--only) and GitHub.


## 2026-11-25 - Buy the Pair PDP link & dynamic price
- templates/index.json: wired gift_banners_home banner_2 product to eternal-love-pair-set (dynamic price + shopify://products/eternal-love-pair-set PDP redirect).
- Pushed to theme 204901220687 (--only templates/index.json) and GitHub.


## 2026-11-25 - philosophy stats animation
- sections/philosophy.liquid: added theme data-animation stagger + <philosophy-stats> custom element count-up animation (cubic ease-out, tabular-nums for 0 CLS, prefers-reduced-motion safe, works without JS).
- Pushed to theme 204901220687 (--only sections/philosophy.liquid) and GitHub.


## 2026-11-25 - featured collection headings to 3XL (h0)
- templates/index.json: updated featured_collection_PHPzLB (Shop Breathelet) and featured_collection_rJaDDf (Shop Accessories) heading_size from h2 to h0 (3X-Large).
- Pushed to theme 204901220687 (--only templates/index.json) and GitHub.


## 2026-11-25 - hide price on Buy the Pair button
- templates/index.json: set show_price to false on gift_banners_home banner_2 while keeping PDP link to eternal-love-pair-set.
- Pushed to theme 204901220687 (--only templates/index.json) and GitHub.


## 2026-11-25 - ritual accordion section
- New: sections/ritual-accordion.liquid extracted from home-dark.vercel.app (#how .ritual) without the bottom CTA button; uses <ritual-accordion> Web Component, grid-template-rows <= 280ms with contain: layout paint, prefers-reduced-motion, #000000/#A57C72 palette.
- templates/index.json: added ritual_accordion_home after community_cards_home with 3 items and images.
- Pushed to theme 204901220687 (--only) and GitHub.


## 2026-11-25 - ritual accordion image aspect ratio setting
- sections/ritual-accordion.liquid: added image_aspect_ratio setting (Auto, Square 1:1, Landscape 4:3, Landscape wide 16:9, Portrait 3:4, Portrait 4:5, Portrait tall 2:3) with dynamic --rit-ratio updates in auto mode.
- Pushed to theme 204901220687 (--only sections/ritual-accordion.liquid) and GitHub.


## 2026-11-25 - rename ritual-accordion to ritual_accordion
- Renamed sections/ritual-accordion.liquid -> sections/ritual_accordion.liquid per user request (overrides AGENTS.md kebab-case convention).
- Updated templates/index.json ritual_accordion_home type to ritual_accordion.
- Pushed to theme 204901220687 (--only) and GitHub.


## 2026-11-25 - remove inline link from ritual_accordion
- sections/ritual_accordion.liquid & templates/index.json: removed .ri-link markup, CSS, and link_label/link_url settings.
- Pushed to theme 204901220687 (--only) and GitHub.


## 2026-11-25 - restore ritual-accordion.liquid filename and rename index.json key to ritual_accordion
- Restored sections/ritual-accordion.liquid (kebab-case per AGENTS.md) and renamed index.json section key from ritual_accordion_home to ritual_accordion.
- Pushed to theme 204901220687 (--only) and GitHub.



## 2026-11-25 - global heading italic/em accent color
- config/settings_schema.json & locales/en.default.schema.json: added `colors_heading_accent` color setting (default `#a57c72`) under Theme Settings > Colors.
- snippets/theme-css-colors.liquid: output `--color-heading-accent` CSS custom property with `165 124 114` fallback when unset.
- assets/main.css: added global `:where(h1, h2, h3, h4, h5, h6, .h0, .h1, .h2, .h3, .h4, .h5, .h6, .heading) em` italic + accent color rule.
- snippets/rich-text-blocks.liquid: removed `| escape` from heading output so `<em>` renders in all richtext heading blocks.
- Pushed to theme 204901220687 (--only) and GitHub.
