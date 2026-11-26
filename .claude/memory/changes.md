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


## 2026-11-25 - hide controls option in Video section
- sections/video.liquid: added `hide_controls` checkbox setting (default `false`) and passed `hide_controls` to `video-player`.
- snippets/video-player.liquid: omitted `controls` attribute on `<video-player>` when `hide_controls` is true (backwards-compatible for all other sections).
- templates/index.json: enabled `hide_controls: true` on `video_RLKz98`.
- Pushed to theme 204901220687 (--only) and GitHub.


## 2026-11-25 - remove padding from .hz-stage
- sections/love-cards.liquid: removed `padding: clamp(44px, 7vh, 76px) 0;` from `.hz-stage`.
- Pushed to theme 204901220687 (--only sections/love-cards.liquid) and GitHub.


## 2026-11-25 - show current price before compare-at price
- snippets/price.liquid: removed `flex-row-reverse justify-end` on `.price` and `order-2` on `.sale-price` (and its screen-reader label) so current/sale price renders first and compare-at price second across product cards and PDP.
- Pushed to theme 204901220687 (--only snippets/price.liquid) and GitHub.


## 2026-11-25 - emphasize Breathelet and Accessories headings
- templates/index.json: updated featured collection headings to `Shop <em>Breathelet</em>` and `Shop <em>Accessories</em>`.
- Pushed to theme 204901220687 (--only templates/index.json) and GitHub.


## 2026-11-25 - standardize theme section spacing utilities
- sections/love-cards.liquid: removed `padding-top: 0; padding-bottom: 0;` from `.section.hz` so it inherits `.section--full-width` theme vertical spacing (`--section-vertical-spacing`).
- sections/philosophy.liquid: switched to `{% render 'section-attrs' %}` + `.section-body`, removed redundant horizontal `margin`/`padding` on `.phil` and `.wrap` that double-padded inside `.section--full-width`, and aligned media breakpoints to canonical `991px`/`575px`.
- Verified `bento-benefits`, `specs-every-day`, `gift-banners`, `community-cards`, and `ritual-accordion` already use `section-bg-number-vars` + `section-attrs` + `.section-body` with no vertical padding overrides.
- Pushed to theme 204901220687 (--only) and GitHub.


## 2026-11-25 - center bento-benefits header & emphasize Breathelet/Instagram headings
- sections/bento-benefits.liquid: centered `.section-header` (`text-center`) and `.heading` (`margin-inline: auto`).
- templates/index.json: updated headings to `Why Do People Love <em>Breathelet</em>?` and `Follow Us On <em>Instagram</em>`.
- Pushed to theme 204901220687 (--only) and GitHub.


## 2026-11-25 - enable General USPs section on homepage
- templates/index.json: removed `"disabled": true` from `homepage_usps_jQz9Ba` (`General USPs`).
- Pushed to theme 204901220687 (--only templates/index.json) and GitHub.


## 2026-11-25 - include question mark in em on reviews heading
- templates/index.json: updated heading to `Why Do People Love <em>Breathelet?</em>`.
- Pushed to theme 204901220687 (--only templates/index.json) and GitHub.


## 2026-11-25 - redesign General USPs section in dark luxury palette
- sections/homepage-usps.liquid: redesigned assurance hero panel and 4-column USP cards in #000000/#A57C72/#0D0B0A palette using `{% stylesheet %}`, editorial serif `h0` heading with `<em>` accent support, eyebrow label, radial rose-taupe glow, vertical hairline badge divider, numbered cards with circular icon medallions, `data-animation="block"`, canonical breakpoints (991px/575px), and `prefers-reduced-motion`. Preserved all existing schema IDs.
- templates/index.json: updated `homepage_usps_jQz9Ba` with `eyebrow: "OUR PROMISE"`, `heading: "Buy with <em>Confidence</em>"`, `accent_color: "#a57c72"`, `card_background: "#0d0b0a"`.
- Pushed to theme 204901220687 (--only) and GitHub.


## 2026-11-25 - toggle off hide_controls on homepage Video section
- templates/index.json: set `hide_controls` to `false` on `video_RLKz98`.
- Pushed to theme 204901220687 (--only templates/index.json) and GitHub.


## 2026-11-25 - revert General USPs redesign
- sections/homepage-usps.liquid: restored original version from commit `36e7c11`.
- templates/index.json: restored `homepage_usps_jQz9Ba` settings (`heading: "Buy with Confidence"`, removed `eyebrow`, `accent_color`, `card_background`).
- Pushed to theme 204901220687 (--only) and GitHub.


## 2026-11-25 - use General USPs icons in Specs every day section
- sections/specs-every-day.liquid: added `icon_image` image_picker setting to `spec` blocks (overrides built-in SVG when set) with canonical `image_url`/`image_tag`, `46x46` styling, hover lift, and `prefers-reduced-motion`.
- templates/index.json: assigned the 4 General USPs icons (`Water-Resistant_1.png`, `Long_Battery_1.png`, `No_App_Required_1.png`, `Adjustable_fit_1.png`) to `specs_every_day_home`.
- Pushed to theme 204901220687 (--only) and GitHub.


## 2026-11-25 - add Buy with Confidence banner above Specs every day
- New: sections/confidence-banner.liquid in #000000/#A57C72/#0E0D0C palette with `section-bg-number-vars`, `section-attrs`, `.section-body`, `{% stylesheet %}`, editorial `h0` heading (`<em>` accent), radial glow, dynamic `badge` blocks, hairline divider, `data-animation="block"`, and `prefers-reduced-motion`.
- templates/index.json: added `confidence_banner` right above `specs_every_day_home` with Lifetime Warranty and 15 Days Return badges.
- Pushed to theme 204901220687 (--only) and GitHub.


## 2026-11-25 - merge Buy with Confidence into Specs every day section
- sections/specs-every-day.liquid: wrapped `.sp-box` and an integrated `.sp-assurance` bottom strip inside one unified `.sp-frame` (#0E0D0C surface, #A57C72 accent, `mix-blend-mode: screen` on icons and guarantee badges so opaque black backgrounds disappear cleanly).
- templates/index.json: removed standalone `confidence_banner` from homepage and enabled `show_confidence_strip` + badges on `specs_every_day_home`.
- Pushed to theme 204901220687 (--only) and GitHub.


## 2026-11-25 - increase guarantee badge size by 25% in Specs every day
- sections/specs-every-day.liquid: scaled `.sp-assurance__badge` by +25% (`clamp(120px, 12vw, 148px)`, mobile `115px`) and separator height (`85px`, mobile `68px`).
- Pushed to theme 204901220687 (--only sections/specs-every-day.liquid) and GitHub.


## 2026-11-25 - tablet 2-column grid for bento-benefits cards
- sections/bento-benefits.liquid: on tablet (`576px–991px`), kept the first/spotlight card ("Feel present again") full width (`span 2`) and made the remaining cards 2 columns (`span 1`, 50% each); mobile (`<= 575px`) remains single column.
- Pushed to theme 204901220687 (--only sections/bento-benefits.liquid) and GitHub.


## 2026-11-25 - increase guarantee badge size another 25% in Specs every day
- sections/specs-every-day.liquid: scaled `.sp-assurance__badge` by another +25% (`clamp(150px, 15vw, 185px)`, mobile `144px`) and separator height (`106px`, mobile `85px`).
- Pushed to theme 204901220687 (--only sections/specs-every-day.liquid) and GitHub.


## 2026-11-25 - tint Specs every day icons to rose gold (#A57C72)
- sections/specs-every-day.liquid: applied exact `#A57C72` rose-gold CSS `filter` tint to `.sp-top .sp-icon-img`.
- Pushed to theme 204901220687 (--only sections/specs-every-day.liquid) and GitHub.


## 2026-11-25 - disable General USPs section on homepage
- templates/index.json: set `"disabled": true` on `homepage_usps_jQz9Ba` (`General USPs`) now that its badges and icons are merged into `specs_every_day_home`.
- Pushed to theme 204901220687 (--only templates/index.json) and GitHub.


## 2026-11-25 - tint Specs every day icons to rose gold (#A57C72)
- sections/specs-every-day.liquid: applied exact `#A57C72` rose-gold CSS `filter` tint to `.sp-top .sp-icon-img`.
- Pushed to theme 204901220687 (--only sections/specs-every-day.liquid) and GitHub.


## 2026-11-25 - disable General USPs section on homepage
- templates/index.json: set `"disabled": true` on `homepage_usps_jQz9Ba` (`General USPs`) now that its badges and icons are merged into `specs_every_day_home`.
- Pushed to theme 204901220687 (--only templates/index.json) and GitHub.


## 2026-11-26 - mega menu product cards border color
- assets/main.css: updated `.mega__menu_products .product-card` and `:hover` border to `1px solid #f2f2f2`.
- Pushed to theme 204901220687 (--only assets/main.css) and GitHub.


## 2026-11-26 - mega menu product cards hover border rose gold
- assets/main.css: kept `.mega__menu_products .product-card` default border at `1px solid #f2f2f2` and changed `:hover` border color to rose gold (`rgb(var(--color-heading-accent, 165 124 114))`).
- Pushed to theme 204901220687 (--only assets/main.css) and GitHub.


## 2026-11-26 - use body font for cart drawer summary totals
- sections/cart-modal.liquid: set `font-family: var(--font-body-family)` on `.summary-total-price-wrapper`, `.summary-total-compare-wrapper`, and `.cart-modal-subtotal` (`Total Price`, `You Save`, `Subtotal`).
- Pushed to theme 204901220687 (--only sections/cart-modal.liquid) and GitHub.


## 2026-11-26 - add step_card block to Video with text section
- snippets/rich-text-blocks.liquid: added `when 'step_card'` branch rendering uniform `.step-card` markup (`h3` title + `p` description, `block.shopify_attributes`, inline CSS color vars).
- sections/video-with-text.liquid: added `step_card` block schema (`title`, `description`, `card_bg`, `border_color`) and bundled `{% stylesheet %}` rules (`24px` top margin after non-cards, `14px` between consecutive `.step-card` blocks, subtle hover border brighten, `prefers-reduced-motion`).
- Pushed to theme 204901220687 (--only) and GitHub.


## 2026-11-26 - add 3 step_card blocks to video_with_text_dPhCKa
- templates/index.json: added 3 `step_card` blocks (`Pull to your perfect fit`, `Trim the extra length`, `Use the hook anytime`) to `video_with_text_dPhCKa`.
- Pushed to theme 204901220687 (--only templates/index.json) and GitHub.
