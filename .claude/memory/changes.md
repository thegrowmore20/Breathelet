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

