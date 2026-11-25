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

