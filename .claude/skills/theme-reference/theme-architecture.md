---
description: Deep reference for OS 2.0 architecture: directory structure, JSON vs Liquid templates, sections, theme blocks, app blocks, snippets, {% schema %} attributes, settings, editor behaviour, all platform limits, PLUS the golden theme.liquid head order, Definition of Done, and authoring standards (LiquidDoc, schema CSS-var/class patterns, block.shopify_attributes, visible_if, translations). Load when scaffolding, building schema, or wiring the theme editor.
---

> **Examples are illustrative.** When copying code: use the canonical srcset widths, eager/lazy cut-off and breakpoints from AGENTS.md, `const` + `for...of` instead of `var`/`forEach`, the canonical breakpoints in `rules/css.md` (750/990/1024px in examples are Dawn values). Constants win; report any contradicting line you find.


## 5. The golden `theme.liquid` head order

Order matters more than content here. Anything above the critical CSS delays first paint.

```liquid
<!doctype html>
<html lang="{{ request.locale.iso_code }}" class="no-js">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <link rel="canonical" href="{{ canonical_url }}">

    {%- comment -%} 1. Preconnect ONLY to origins used on first paint {%- endcomment -%}
    <link rel="preconnect" href="https://cdn.shopify.com" crossorigin>

    {%- comment -%}
      2. Fonts — swap, never render-blocking. Emit before the stylesheet so the
         @font-face rules are known as early as possible.
    {%- endcomment -%}
    {{ settings.type_body_font | font_face: font_display: 'swap' }}
    {{ settings.type_header_font | font_face: font_display: 'swap' }}

    {%- comment -%}
      3. Critical CSS — the ONLY synchronous stylesheet.
         `preload: true` emits the Early Hints preload for you; do NOT also add a
         separate preload_tag for the same file (that is a wasted request slot).
    {%- endcomment -%}
    {{ 'critical.css' | asset_url | stylesheet_tag: preload: true }}

    {%- comment -%} 4. Deferred non-critical CSS {%- endcomment -%}
    <link rel="stylesheet" href="{{ 'main.css' | asset_url }}" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="{{ 'main.css' | asset_url }}"></noscript>

    {%- comment -%}
      5. Import map BEFORE any module script. List modules explicitly — bare
         specifier keys let components import each other without asset_url paths.
    {%- endcomment -%}
    <script type="importmap">
      {
        "imports": {
          "@theme/cart": {{ 'component-cart.js' | asset_url | json }},
          "@theme/events": {{ 'utils-events.js' | asset_url | json }},
          "@theme/section-render": {{ 'utils-section-render.js' | asset_url | json }}
        }
      }
    </script>

    {%- comment -%} 6. Theme JS — module (deferred by default), never blocking {%- endcomment -%}
    <script type="module" src="{{ 'theme.js' | asset_url }}"></script>

    {%- comment -%} 7. Shopify's own head content — always last in head {%- endcomment -%}
    {{ content_for_header }}
  </head>

  <body class="template-{{ template.name }}">
    <a class="skip-to-content" href="#MainContent">{{ 'accessibility.skip_to_text' | t }}</a>
    {% sections 'header-group' %}
    <main id="MainContent" role="main" tabindex="-1">
      {{ content_for_layout }}
    </main>
    {% sections 'footer-group' %}
  </body>
</html>
```

**Rules about this file:**
- `{{ content_for_header }}` must be present and must not be moved into a snippet or conditionally rendered.
- `{{ content_for_layout }}` appears exactly once.
- Never add a synchronous `<script>` above `content_for_header`.
- Never inline more than the truly critical CSS.

---


---

## 7. Definition of Done

A template, section or component is **not done** until every line below is true.

**Rendering**
- [ ] Above-the-fold content is server-rendered Liquid — visible without JavaScript.
- [ ] The LCP element is identified, eagerly loaded, `fetchpriority="high"` where it's the page LCP, and not animated.
- [ ] Every image has `widths`, `sizes`, and reserved dimensions; below-fold images are `loading="lazy"`.
- [ ] Nothing shifts on load — verified with CLS = 0 in a throttled lab run.

**Liquid**
- [ ] No `{% include %}`. No nested loops over Shopify resource objects. No *repeated* metafield lookup inside a loop (per-item lookups within the cap in `rules/liquid.md` are fine). No repeated filter chains.
- [ ] `block.settings` / `section.settings` hoisted into variables where used more than once.
- [ ] All URLs come from the `routes` object; no hardcoded paths.
- [ ] All user-facing strings come from `locales` via the `t` filter — no hardcoded English.
- [ ] Snippet parameters documented with `{% doc %}`.

**JavaScript**
- [ ] `type="module"` and/or `defer`; nothing blocking.
- [ ] Component initialises on interaction or `IntersectionObserver`, not eagerly, unless it is above the fold.
- [ ] Event handlers debounced/throttled; listeners removed on disconnect.
- [ ] Works after theme-editor re-render (`shopify:section:load` / `shopify:block:select` bound).
- [ ] No console errors or warnings on any template.

**CSS**
- [ ] No new stylesheet *request* added — component CSS goes in `{% stylesheet %}`, which Shopify bundles into the existing request (`rules/css.md`).
- [ ] Animations use `transform`/`opacity` only, and are disabled under `prefers-reduced-motion`.
- [ ] No `!important` at all — utilities win by cascade order plus `:where()` on component bases (`rules/css.md`).

**Accessibility**
- [ ] Keyboard-operable end to end; focus visible; focus trapped and returned in dialogs.
- [ ] Correct heading order; landmarks present; icon-only buttons have accessible names.
- [ ] Text contrast ≥ 4.5:1 (≥ 3:1 for large text and UI components).
- [ ] Dynamic updates (cart, search, errors) announced via live regions.

**Editor**
- [ ] Section/block schema complete, settings labelled and translated.
- [ ] Add / remove / reorder / setting-change all behave without a reload.
- [ ] Every snippet has a `{% doc %}` header with `@param` entries for every parameter.
- [ ] Every statically-rendered block (`{% content_for 'block', type: '...', id: '...' %}`) has a `{% doc %}` header.
- [ ] Every block wrapper includes `{{ block.shopify_attributes }}` so the theme editor can select it.
- [ ] Single-CSS-property merchant settings use CSS variables via `style="--prop: {{ setting }}"`; multi-property settings use CSS class toggling — never inline `<style>` for these.
- [ ] Color/font settings that must live-preview in the editor use `{% style %}` (not `<style>` or `{% stylesheet %}`).
- [ ] All `visible_if` conditions on schema settings tested in the theme editor — conditional fields show/hide correctly without a reload.
- [ ] All user-facing text uses sentence case and is in `en.default.json`; schema strings are in `en.default.schema.json`.

---


---

## 7A. Authoring Standards (see AGENTS.md + rules/)

These rules govern how Liquid, schemas, translations, and CSS settings interact with the theme editor. They are separate from performance rules but equally non-negotiable — violating them breaks editor UX and live preview.

---

### LiquidDoc (`{% doc %}`)

**HARD RULE: Every snippet file and every statically-rendered block must start with a `{% doc %}` block.**

`{% doc %}` content is not rendered or outputted. It documents the file for tooling (code completion, linting, inline documentation) and for any developer reading the file.

**Required fields:**
- A one-sentence description of what the file renders.
- `@param {type} name` for every required parameter.
- `@param {type} [name]` (brackets = optional) for every optional parameter.
- At least one `@example` showing the minimum invocation.

**Supported `@param` types:** `string`, `number`, `boolean`, `image`, `object`, `array`, `untyped`

```liquid
{% doc %}
  Renders a responsive image optionally wrapped in a link.

  @param {image} image - The image to render
  @param {string} [url] - Optional destination URL for the image
  @param {string} [css_class] - Optional CSS class on the wrapper element
  @param {number} [width] - Max render width in pixels
  @param {number} [height] - Max render height in pixels
  @param {string} [crop] - Crop position: 'center', 'top', 'bottom', 'left', 'right'

  @example
  {% render 'image', image: product.featured_image %}

  @example
  {% render 'image',
    image: product.featured_image,
    url: product.url,
    css_class: 'product__image',
    width: 1200,
    height: 800,
    crop: 'center'
  %}
{% enddoc %}
```

**Where `{% doc %}` is required vs not:**
- `snippets/*.liquid` → **always required**
- `blocks/*.liquid` when rendered statically via `{% content_for 'block', type: '...', id: '...' %}` → **required**
- `sections/*.liquid` → not required (schema provides documentation)
- Dynamically rendered theme blocks via `{% content_for 'blocks' %}` → not required unless also statically rendered

---

### `{% style %}` vs `<style>` vs `{% stylesheet %}`

These three tags are not interchangeable. Using the wrong one breaks live preview or adds a render-blocking stylesheet request.

| Tag | When to use | Live editor preview? | Render blocking? |
|---|---|---|---|
| `{% stylesheet %}` | All static component/section CSS | No (not needed) | No — auto-deferred |
| `{% style %}` | Color, font, and other settings that must update **without a page reload** in the theme editor | **Yes** | No — inline |
| `<style>` | Instance-specific values scoped to `section.id` that don't need live preview | No | No — inline |
| `stylesheet_tag` | `critical.css` in `theme.liquid` only | No | **Yes** — sync |

**HARD RULE: Color settings referenced inside `{% style %}` tags update live in the theme editor without a reload. The same value in `{% stylesheet %}` or `<style>` does not update live. Always use `{% style %}` for color/font/size settings that merchants adjust and expect to see reflected immediately.**

```liquid
{%- comment -%} ✅ Correct — updates live in the editor when merchant changes color {%- endcomment -%}
{% style %}
  .hero-{{ section.id }} {
    background-color: {{ section.settings.background_color }};
    color: {{ section.settings.text_color }};
  }
{% endstyle %}

{%- comment -%} ❌ Wrong — does NOT update live in the editor {%- endcomment -%}
<style>
  .hero {
    background-color: {{ section.settings.background_color }};
  }
</style>
```

---

### Schema settings — CSS variable pattern vs CSS class pattern

Two patterns for wiring `{% schema %}` settings to CSS. Choose the right one based on how many CSS properties the setting controls.

#### Single-property setting → CSS variable

When a setting controls exactly one CSS property (gap, padding, font-size, border-radius, etc.), pass it as a CSS custom property on the element. Define the property usage in `{% stylesheet %}`.

```liquid
<div class="collection" style="--gap: {{ block.settings.gap }}px">
  {% content_for 'blocks' %}
</div>

{% stylesheet %}
  .collection {
    display: grid;
    gap: var(--gap);
  }
{% endstylesheet %}

{% schema %}
{
  "settings": [{
    "type": "range",
    "id": "gap",
    "label": "t:labels.gap",
    "min": 0,
    "max": 100,
    "step": 4,
    "unit": "px",
    "default": 16
  }]
}
{% endschema %}
```

**Why:** keeps the CSS value in one place, avoids inline `<style>` blocks, and lets `{% stylesheet %}` handle the property declaration.

#### Multi-property setting → CSS class

When a setting controls multiple CSS properties at once (layout direction, display mode, visual style variant), output the setting value as a CSS class. Define all variant classes in `{% stylesheet %}`.

```liquid
<div class="collection {{ block.settings.layout }}">
  {% content_for 'blocks' %}
</div>

{% stylesheet %}
  .collection--full-width {
    width: 100%;
    padding-inline: 0;
    max-width: none;
  }
  .collection--narrow {
    max-width: 800px;
    margin-inline: auto;
    padding-inline: var(--space-4);
  }
{% endstylesheet %}

{% schema %}
{
  "settings": [{
    "type": "select",
    "id": "layout",
    "label": "t:labels.layout",
    "options": [
      { "value": "collection--full-width", "label": "t:options.full_width" },
      { "value": "collection--narrow", "label": "t:options.narrow" }
    ],
    "default": "collection--full-width"
  }]
}
{% endschema %}
```

**Why:** one setting change swaps a class; `{% stylesheet %}` holds all declarations; no JavaScript needed; no inline styles.

#### Mobile column count → select input

For responsive column settings on mobile, always use a `select` input (not `range`) because the valid values are typically 1 or 2 — not a continuous scale.

```json
{
  "type": "select",
  "id": "columns_mobile",
  "label": "t:labels.columns_mobile",
  "options": [
    { "value": "1", "label": "1" },
    { "value": "2", "label": "2" }
  ],
  "default": "1"
}
```

---

### `{{ block.shopify_attributes }}` — required on every block wrapper

**HARD RULE: Every block's outermost wrapper element must include `{{ block.shopify_attributes }}`.**

This attribute outputs the data attributes Shopify needs to make the block selectable, highlightable, and reorderable in the theme editor. Without it, the editor cannot focus the block, and merchants cannot click to select it.

```liquid
{%- comment -%} ✅ Correct {%- endcomment -%}
<div class="text-block {{ block.settings.text_style }}" {{ block.shopify_attributes }}>
  {{ block.settings.text }}
</div>

{%- comment -%} ❌ Wrong — block is invisible to the theme editor {%- endcomment -%}
<div class="text-block {{ block.settings.text_style }}">
  {{ block.settings.text }}
</div>
```

The equivalent for sections is `{{ section.shopify_attributes }}` — add it to the section's outermost wrapper when you want the section to be selectable in the editor (optional but recommended for sections, mandatory for blocks).

---

### `visible_if` — conditional schema settings

`visible_if` hides a setting in the theme editor when a condition is false. The setting still exists and its default value is still saved — it just isn't shown to the merchant. Use it to reduce noise: only surface settings that are relevant given the current values of other settings.

```json
{
  "settings": [
    {
      "type": "select",
      "id": "layout_direction",
      "label": "t:labels.layout_direction",
      "default": "group--vertical",
      "options": [
        { "value": "group--horizontal", "label": "t:options.horizontal" },
        { "value": "group--vertical", "label": "t:options.vertical" }
      ]
    },
    {
      "visible_if": "{{ block.settings.layout_direction == 'group--vertical' }}",
      "type": "select",
      "id": "alignment",
      "label": "t:labels.alignment",
      "default": "flex-start",
      "options": [
        { "value": "flex-start", "label": "t:options.left" },
        { "value": "center", "label": "t:options.center" },
        { "value": "flex-end", "label": "t:options.right" }
      ]
    }
  ]
}
```

**Rules:**
- The condition is a Liquid expression in a string: `"{{ block.settings.other_id == 'value' }}"`.
- Use `block.settings` for block schema, `section.settings` for section schema.
- The hidden setting's value is still saved and applied — hiding it does not reset or disable it.
- Test every `visible_if` condition manually in the editor: change the controlling setting and confirm the dependent setting appears/disappears without a reload.

---

### Translation authoring standards

**HARD RULE: Every user-facing string must use the `t` filter. No hardcoded English anywhere in Liquid files.**

#### Key naming rules
- Maximum **3 levels deep**: `sections.hero.title` ✅ — `sections.hero.cta.button.text` ❌
- **snake_case** for all key names.
- **Descriptive and hierarchical** — group by context: `sections`, `products`, `cart`, `general`, `accessibility`.
- Add to `en.default.json` (storefront strings) and `en.default.schema.json` (editor/schema strings) — never the same key in both.

#### Content rules
- **Sentence case** for all user-facing text: `Add to cart` ✅ — `Add To Cart` ❌. Capitalize only the first word and proper nouns.
- Keep UI strings concise — consider character limits on buttons and badges.
- Use interpolation for dynamic values — never concatenate strings.
- Escape output variables unless they are expected to contain HTML: `{{ variable | escape }}`.

```liquid
{%- comment -%} ✅ Correct {%- endcomment -%}
<h2>{{ 'sections.featured_collection.title' | t }}</h2>
<button>{{ 'products.add_to_cart' | t }}</button>
<p>{{ 'general.pagination.page' | t: current: paginate.current_page, total: paginate.pages }}</p>

{%- comment -%} ❌ Wrong — hardcoded English {%- endcomment -%}
<h2>Featured Collection</h2>
<button>Add to Cart</button>
```

```json
// en.default.json — storefront strings
{
  "sections": {
    "featured_collection": {
      "title": "Featured collection"
    }
  },
  "products": {
    "add_to_cart": "Add to cart"
  },
  "general": {
    "pagination": {
      "page": "Page {{ current }} of {{ total }}"
    }
  }
}
```

```json
// en.default.schema.json — editor/schema label strings
{
  "labels": {
    "gap": "Gap",
    "layout": "Layout",
    "columns_mobile": "Columns on mobile"
  },
  "options": {
    "full_width": "Full width",
    "narrow": "Narrow"
  }
}
```

#### Locale file structure rules
- `en.default.json` — required storefront locale, must always exist.
- `en.default.schema.json` — required schema locale for editor strings.
- Additional locales follow IETF language tag naming: `fr.json`, `pt-BR.json`, `en-GB.schema.json`.
- Maximum **3,400 keys** per locale file; values must not exceed **1,000 characters**.
- Only add English — translators handle other languages from the English source.

---

### `{% content_for 'blocks' %}` vs `{% content_for 'block', type: '...', id: '...' %}`

Two variants of the same tag with completely different purposes.

| Tag | What it renders | Where to use |
|---|---|---|
| `{% content_for 'blocks' %}` | All theme blocks the merchant has added/ordered in the editor | Sections and parent blocks that accept dynamic child blocks |
| `{% content_for 'block', type: 'name', id: 'unique-id' %}` | One specific, hardcoded static block — always present, not addable/removable by the merchant | Layout areas where a specific block must always appear |

```liquid
{%- comment -%} Dynamic blocks — merchant controls what's here {%- endcomment -%}
<div class="section-content">
  {% content_for 'blocks' %}
</div>

{%- comment -%} Static block — always renders this specific block {%- endcomment -%}
{% content_for 'block', type: 'announcement-bar', id: 'header-announcement' %}
```

**Statically rendered blocks (`type` + `id` form) require `{% doc %}` in the block file** so tooling can surface the available parameters without inspecting the schema.

**Schema wiring for dynamic blocks:**
```json
{
  "blocks": [
    { "type": "@theme" },
    { "type": "@app" }
  ]
}
```
`@theme` allows any theme block; `@app` allows app blocks. Include both unless you want to restrict which blocks merchants can add.

---


---

## Part 9 — Theme Architecture, Settings & Theme Editor

Sources: shopify.dev/docs/storefronts/themes/architecture (+ subpages), /architecture/limits, /architecture/sections, /architecture/sections/section-schema, /architecture/blocks/theme-blocks, /architecture/templates, /architecture/templates/json-templates, /architecture/layouts, /architecture/snippets, /architecture/config, /architecture/locales, /tools/online-editor, /architecture/settings, /architecture/settings/input-settings, and /best-practices/editor/integrate-sections-and-blocks (linked from the editor page for JS event names).

---

### 1. Theme Directory Structure

A theme is a hierarchical set of files. Only the `layout` directory containing `theme.liquid` is strictly mandatory for uploading a theme to Shopify — everything else is added as needed.

```
theme
├── assets/        # images, CSS, and JavaScript files
├── blocks/        # theme block definitions (.liquid, each with {% schema %})
├── config/
│   ├── settings_schema.json   # required — defines Theme settings UI
│   ├── settings_data.json     # required — stores saved setting values
│   └── markets.json           # optional — market-specific theme inheritance
├── layout/
│   └── theme.liquid           # required — base layout, must exist
├── locales/
│   ├── en.default.json        # required default storefront locale
│   └── *.json / *.schema.json # additional storefront / schema locales
├── sections/       # reusable content modules, each with {% schema %}
├── snippets/       # reusable Liquid code fragments, invisible to merchants
└── templates/
    ├── *.json | *.liquid      # one per page type
    └── customers/             # legacy account page templates (deprecated)
```

Component roles, from the architecture overview:

- **Layout files** — "the base of the theme," hosting repeated elements like headers and footers.
- **Templates** — control what displays on a given page type. JSON templates act as section wrappers; Liquid templates contain code/markup directly.
- **Section groups** — "containers that enable merchants to add, remove, and reorder sections" in layout areas (e.g. header, footer, aside groups).
- **Sections** — reusable, customizable content modules merchants can configure.
- **Blocks** — granular customization units inside sections (or, as theme blocks, standalone reusable units nestable inside sections/other blocks).
- **Snippets** — reusable code fragments used throughout the theme, not exposed in the editor.

**Asset Liquid support:** CSS and JS files can use `.liquid` extensions (`.js.liquid`, `.css.liquid`) to access the `settings` object and Liquid filters from within `/assets`.

---

### 2. Layouts

"Layouts are the base of the theme, through which all templates are rendered." They hold content that repeats across page types (headers, footers, metadata).

- Location: `layout/` directory.
- `theme.liquid` is the **required** default/general layout — applies to all non-checkout pages.
- A second layout type, **checkout layouts**, applies only to checkout pages and is restricted to Shopify Plus merchants. Customizing `checkout.liquid` is deprecated for most checkout steps, and support for the thank-you and order-status pages sunset **August 28, 2025**.
- Directory shape:
```
└── theme
    ├── layout
    │   ├── theme.liquid
    │   ...
    ├── templates
    ...
```

#### Required Liquid objects in `theme.liquid`

1. **`content_for_header`** — must be placed inside `<head>`. "Dynamically loads all scripts required by Shopify into the document head," including hCaptcha and app scripts.
2. **`content_for_layout`** — placed within `<body>`; outputs the template-specific content dynamically.

```liquid
<!DOCTYPE html>
<html>
  <head>
    ...
    {{ content_for_header }}
    ...
  </head>
  <body>
    ...
    {{ content_for_layout }}
    ...
  </body>
</html>
```

#### Template-specific styling pattern

```liquid
<body className="template-{{ template.name }}">
  ...
</body>
```
```css
.template-product {
  margin-bottom: 2em;
}
```

#### `content_for_index`, `content_for 'block'` / `'blocks'` — verification note

- **`content_for 'blocks'`** is documented, but on the **theme blocks** page, not the layouts page: it is the tag used inside a section's or block's markup to render its child theme blocks (see §4 below), e.g. `{% content_for 'blocks' %}`.
- **`content_for_index`** and a bare **`content_for 'block'`** (singular) were **not found** on any of the fetched architecture/layouts/templates/sections pages. Treat `content_for_index` as unverified/legacy from this fetch — it is not documented on the current architecture pages checked here, so do not rely on it without checking the dedicated Liquid objects reference.

---

### 3. Templates: JSON vs Liquid

"Templates control what's rendered on each type of page in a theme."

#### The 17 template types
`404`, `agents.md.liquid`, `article`, `blog`, `cart`, `collection`, `gift_card.liquid`, `index`, `list-collections`, `llms-full.txt.liquid`, `llms.txt.liquid`, `page`, `password`, `product`, `robots.txt.liquid`, `search`, `metaobject`.

**Liquid-only templates** (cannot be JSON): `gift_card`, `robots.txt`, `agents.md`, `llms.txt`, `llms-full.txt` — "these template types can't be JSON templates, so you must make them Liquid templates."

Legacy `customers/account`, `customers/login`, etc. templates are deprecated.

#### JSON templates

"JSON templates allow you to control the look and feel of different pages of the online store using sections." They let merchants add/remove/reorder sections in the theme editor. "Any HTML or Liquid code needs to be included in a section that's referenced by the template."

Required schema keys: **`sections`** (object of section id → section config) and **`order`** (array defining render sequence).
Optional schema keys: **`layout`** (which layout file to use; default `theme.liquid`; can be `false` to skip layout), **`wrapper`** (HTML wrapper element: `div`, `main`, or `section`).

Full example:

```json
{
  "layout": "full-width",
  "wrapper": "div#main_wrapper.sections_container",
  "sections": {
    "main": {
      "type": "product",
      "settings": {
        "show_vendor": true
      }
    },
    "recommendations": {
      "type": "product-recommendations",
      "settings": {}
    },
    "banner": {
      "type": "image-banner",
      "disabled": false,
      "settings": {
        "image_height": "medium"
      },
      "blocks": {
        "block_1": {
          "type": "text",
          "settings": {
            "text": "Featured Product"
          }
        }
      },
      "block_order": ["block_1"]
    }
  },
  "order": ["main", "recommendations", "banner"]
}
```

Per-section instance keys: `type` (required), `settings`, `blocks`, `block_order`, `disabled` (boolean). Section IDs must be unique within a template. Sections **without presets cannot be removed** via the theme editor. Merchants can add custom CSS through the editor, stored as `custom_css` in section data — **do not hand-edit this field**.

#### Liquid templates

`.liquid` files let you add Liquid/HTML markup directly rather than composing sections.

---

### 4. Sections vs Theme Blocks vs App Blocks vs Snippets

#### Sections
Location: `sections/`. Reusable, merchant-customizable content modules built with Liquid.

A section file contains three parts:
1. Main markup (HTML/Liquid, with access to global objects)
2. Assets — JS/CSS via section-scoped `{% javascript %}` / `{% stylesheet %}` tags
3. `{% schema %}` — attributes, settings, blocks, presets, accessibility rules

**Rendering methods:**
- Referenced from a JSON template or section group (recommended)
- Statically rendered via the `{% section %}` tag, e.g. `{% section 'featured-product' %}` — "statically rendered sections can't be removed or reordered by merchants," so avoid this when possible
- Section Rendering API (for AJAX-loaded section HTML)

**Editor behavior:** when a merchant edits section settings in the theme editor, the section's HTML re-renders/updates without a full page reload — but "page-load JavaScript won't re-execute automatically" (see §6).

**App blocks:** sections can declare support for app blocks so app developers can inject content without editing theme code.

#### Section schema (`{% schema %}`)

Full example:
```json
{% schema %}
{
  "name": "Slideshow",
  "tag": "section",
  "class": "slideshow",
  "limit": 1,
  "settings": [
    {
      "type": "text",
      "id": "title",
      "label": "Slideshow"
    }
  ],
  "max_blocks": 5,
  "blocks": [
     {
       "name": "Slide",
       "type": "slide",
       "settings": [
         {
           "type": "image_picker",
           "id": "image",
           "label": "Image"
         }
       ]
     }
  ],
  "presets": [
    {
      "name": "Slideshow",
      "settings": {
        "title": "Slideshow"
      },
      "blocks": [
        { "type": "slide" },
        { "type": "slide" }
      ]
    }
  ],
  "locales": {
    "en": { "title": "Slideshow" },
    "fr": { "title": "Diaporama" }
  },
  "enabled_on": {
    "templates": ["*"],
    "groups": ["footer"]
  }
}
{% endschema %}
```

Key attributes:
- **`name`** — section title shown in the theme editor.
- **`tag`** — HTML wrapper element: `article`, `aside`, `div`, `footer`, `header`, or `section`. Defaults to `div`.
- **`class`** — extra CSS class(es) added alongside the default `shopify-section` class.
- **`limit`** — restrict instances to 1 or 2 per template/section group.
- **`settings`** — array of input settings; all setting IDs must be unique within the section.
- **`blocks`** — array of block definitions (`type`, `name`, `limit`, `settings`); all block names/types must be unique within the section.
- **`max_blocks`** — caps blocks at 50 by default (can be lowered); static blocks don't count toward this cap.
- **`presets`** — predefined configs for adding the section via the JSON-template editor (`name`, optional `category`, `settings`, `blocks`).
- **`default`** — same shape as `presets`, used for statically rendered sections.
- **`locales`** — translated strings, referenced via the `t` filter as `sections.[section-name].[key]`.
- **`enabled_on`** / **`disabled_on`** — restrict availability by `templates` and `groups` (`header`, `footer`, `aside`, or custom group names). Only one of the two may be used per schema.

#### Theme blocks (`blocks/`)

Theme blocks are reusable modules defined once at the theme level (in `/blocks`) and usable across **multiple** sections — unlike section-scoped `blocks` arrays defined inline in a section's own schema. Theme blocks can nest inside other theme blocks.

**Example theme block** (`/blocks/text.liquid`):
```liquid
<div class="text-block text-{{ block.settings.alignment }}">
  {{ block.settings.text }}
</div>

{% stylesheet %}
.text-left {
    text-align: left;
  }
.text-center {
    text-align: center;
  }
.text-right {
    text-align: right;
  }
{% endstylesheet %}

{% schema %}
{
  "name": "Text",
  "settings": [
    {
      "type": "richtext",
      "id": "text",
      "label": "Text"
    },
    {
      "type": "text_alignment",
      "id": "alignment",
      "label": "Alignment"
    }
  ],
  "presets": [
    { "name": "Text" },
    {
      "name": "Content",
      "settings": {
        "text": "<p>Hello, world!</p>"
      }
    }
  ]
}
{% endschema %}
```

**Enabling theme blocks (and app blocks) in a section:** use `{% content_for 'blocks' %}` in the section markup, and declare which block types are allowed:
```json
"blocks": [{ "type": "@theme" }, { "type": "@app" }]
```

Full custom-section example wiring it together (`/sections/custom-section.liquid`):
```liquid
<div class="custom-section color-{{ section.settings.color_scheme }}">
  {% content_for 'blocks' %}
</div>

{% schema %}
{
  "name": "Custom section",
  "blocks": [{ "type": "@theme" }, { "type": "@app" }],
  "settings": [
    { "type": "header", "content": "Color" },
    {
      "type": "color_scheme",
      "id": "color_scheme",
      "label": "Color scheme",
      "default": "scheme-1"
    }
  ],
  "presets": [
    { "name": "Custom section" },
    {
      "name": "Heading and text",
      "blocks": [
        {
          "type": "group",
          "settings": { "color_scheme": "scheme-3" },
          "blocks": [
            { "type": "text", "settings": { "text": "<h1>Image with text</h1>" } },
            { "type": "text", "settings": { "text": "<p>Pair text with an image to focus on your chosen product, collection, or blog post.</p>" } }
          ]
        }
      ]
    }
  ]
}
{% endschema %}
```

**Nesting theme blocks** — a theme block can itself declare a `blocks` attribute and render children via `{% content_for 'blocks' %}`, e.g. a `group` block (`/blocks/group.liquid`):
```liquid
<div class="group-block color-{{ block.settings.color_scheme }}">
  {% content_for 'blocks' %}
</div>

{% schema %}
{
  "name": "Group",
  "blocks": [{ "type": "@theme" }, { "type": "@app" }],
  "settings": [
    { "type": "header", "content": "Color" },
    {
      "type": "color_scheme",
      "id": "color_scheme",
      "label": "Color scheme",
      "default": "scheme-1"
    }
  ],
  "presets": [
    { "name": "Group" },
    {
      "name": "Column",
      "settings": { "color_scheme": "scheme-3" },
      "blocks": [
        { "type": "text", "settings": { "text": "<h3>Hello, world!</h3>" } },
        { "type": "text", "settings": { "text": "<p>How's it going?</p>" } }
      ]
    }
  ]
}
{% endschema %}
```

Blocks (theme or section-scoped) have access to the `block` object (its own settings/properties), the parent `section` object, and global Liquid objects — but **cannot** access external variables or receive passed parameters (unlike snippets, which take explicit parameters).

#### App blocks

Referenced with `{ "type": "@app" }` inside a section's or block's `blocks` array (alongside `{ "type": "@theme" }`), letting app developers inject block content into theme sections without editing theme code, rendered via `{% content_for 'blocks' %}`.

#### Snippets

Location: `snippets/`. "Reusable pieces of Liquid code that help you maintain consistency and reduce duplication across your theme." Used for encapsulated logic (product cards, nav, form components). **Invisible to merchants** in the theme editor — unlike sections/blocks.

Rendered with the `render` tag and named parameters:
```liquid
{% render 'product-card',
  product: product,
  show_price: true,
  max_description_length: 120
%}
```

Snippets can access global objects (`product`, `collection`, `section`) and explicitly passed parameters only; variables created inside a snippet don't leak outward. LiquidDoc can be used to document snippet parameters for editor completion/feedback.

#### When to use each — quick guidance
- **Section**: a distinct, merchant-addable/removable/reorderable content area of a page (used once or a few times per template, appears in the sections list of the editor).
- **Theme block**: a reusable content unit meant to be nested inside multiple different sections/blocks, addable/removable by merchants inside a section, potentially nestable.
- **App block**: same slot as a theme block, but content supplied by an installed app rather than theme code.
- **Snippet**: pure code-reuse for developers; no merchant-facing editor presence, supports explicit parameter passing, best for logic you `render` repeatedly (e.g., a price snippet used inside many different sections/blocks).

---

### 5. Config Files & Settings

#### Config directory
```
└── theme
    ├── config
    │   ├── settings_data.json
    │   ├── settings_schema.json
    │   └── markets.json
    └── locales
```
- **`settings_schema.json`** (required) — "Controls the organization and content of the Theme settings area."
- **`settings_data.json`** (required) — "Contains the saved values from the settings in `settings_schema.json`."
- **`markets.json`** (optional) — manages market-specific theme setting inheritance.

#### Setting categories
- **Input settings** — configurable values merchants can adjust (hold a value).
- **Sidebar settings** — informational, non-configurable elements (e.g. `header`, `paragraph`) used to add context/grouping around input settings.

#### Accessing settings in Liquid
```liquid
{{ settings.message }}
{{ section.settings.message }}
{{ block.settings.message }}
```

#### `visible_if` (conditional display)
Works on basic input settings, sidebar settings, and specialized types (`color`, `font_picker`, `richtext`, `video`, etc.):
```json
"visible_if": "{{ block.settings.layout_style == 'flex' }}"
```

#### Dynamic sources
Section/block settings inside JSON templates can let merchants connect "one or more dynamic sources" to a setting (binding it to resource metafields/data instead of a static value).

#### Safe access pattern
```liquid
{% unless settings.message == blank %}
  {{ settings.message }}
{% endunless %}
```
Resource-valued settings (`product`, `page`, `collection`, etc.) should similarly be checked that the referenced resource still exists before use. Settings without a `default` return an empty string until set.

#### Platform CSS
Shopify automatically injects certain custom CSS settings that merchants can always use; themes can't prevent this.

#### All documented input setting types
Basic (7): `checkbox`, `number`, `radio`, `range`, `select`, `text`, `textarea`
Specialized: `article`, `article_list`, `blog`, `collection`, `collection_list`, `color`, `color_background`, `color_palette`, `color_scheme`, `color_scheme_group`, `font_picker`, `html`, `image_picker`, `inline_richtext`, `link_list`, `liquid`, `metaobject`, `metaobject_list`, `page`, `product`, `product_list`, `richtext`, `text_alignment`, `url`, `video`, `video_url`

Common attributes on every input setting: `type` (required), `id` (required), `label` (required), `default` (optional), `info` (optional).

Representative examples:
```json
{ "type": "checkbox", "id": "show_announcement", "label": "Show announcement", "default": true }
{ "type": "number", "id": "products_per_page", "label": "Products per page", "default": 20 }
{
  "type": "radio",
  "id": "logo_alignment",
  "label": "Logo alignment",
  "options": [
    { "value": "left", "label": "Left" },
    { "value": "centered", "label": "Centered" }
  ],
  "default": "left"
}
{
  "type": "range",
  "id": "font_size",
  "min": 12,
  "max": 24,
  "step": 1,
  "unit": "px",
  "label": "Font size",
  "default": 16
}
{
  "type": "select",
  "id": "vertical_alignment",
  "label": "Vertical alignment",
  "options": [
    { "value": "top", "label": "Top" },
    { "value": "middle", "label": "Middle" },
    { "value": "bottom", "label": "Bottom" }
  ],
  "default": "middle"
}
{ "type": "text", "id": "footer_linklist_title", "label": "Heading", "default": "Quick links" }
{ "type": "textarea", "id": "home_welcome_message", "label": "Welcome message", "default": "Welcome to my shop!" }
{ "type": "article", "id": "article", "label": "Article" }
{ "type": "article_list", "id": "featured_articles", "label": "Featured articles", "limit": 12 }
{ "type": "blog", "id": "blog", "label": "Blog" }
{ "type": "collection", "id": "collection", "label": "Collection" }
{ "type": "collection_list", "id": "collection_list", "label": "Collections", "limit": 8 }
{ "type": "color", "id": "heading_color", "label": "Heading color", "placeholder": "Default" }
{ "type": "color_background", "id": "background", "label": "Background", "default": "linear-gradient(#ffffff, #000000)" }
{
  "type": "color_palette",
  "id": "colors",
  "default": {
    "primary": "#121212",
    "secondary": "#FFFFFF",
    "accent": "#FF4416"
  }
}
{ "type": "color_scheme", "id": "color_scheme", "default": "scheme_1", "label": "Color scheme" }
{ "type": "font_picker", "id": "heading_font", "label": "Heading font", "default": "helvetica_n4" }
{ "type": "html", "id": "video_embed", "label": "Video embed" }
{ "type": "image_picker", "id": "image_with_text_image", "label": "Image" }
{ "type": "inline_richtext", "id": "inline", "default": "my <i>inline</i> <b>text</b>", "label": "Inline rich text" }
{ "type": "link_list", "id": "menu", "label": "Menu" }
{
  "type": "liquid",
  "id": "battery_message",
  "label": "Battery message",
  "default": "{% if product.tags contains 'battery' %}This product..."
}
{ "type": "metaobject", "id": "my_material_setting", "label": "Material", "metaobject_type": "shopify--material" }
{
  "type": "metaobject_list",
  "id": "my_material_list_setting",
  "label": "Materials",
  "metaobject_type": "shopify--material",
  "limit": 12
}
{ "type": "page", "id": "page", "label": "Page" }
{ "type": "product", "id": "product", "label": "Product" }
{ "type": "product_list", "id": "product_list", "label": "Products", "limit": 12 }
{ "type": "richtext", "id": "paragraph", "label": "Paragraph" }
{ "type": "text_alignment", "id": "alignment", "label": "Text alignment", "default": "center" }
{ "type": "url", "id": "button_link", "label": "Button link" }
{ "type": "video", "id": "video", "label": "A Shopify-hosted video" }
{ "type": "video_url", "id": "product_description_video", "label": "Product description video", "accept": ["youtube", "vimeo"] }
```

Notes on specialized types:
- **Localization**: text-bearing settings (`text`, `textarea`, `richtext`, `inline_richtext`, `html`) support translation via Translate & Adapt; `liquid` settings do not.
- **List settings** (`product_list`, `collection_list`, `article_list`, `metaobject_list`) support a `limit` up to **50 items** (default).
- **`color_palette`**: one such setting per theme defines named colors usable elsewhere as dynamic references, e.g. `{{ settings.colors.primary }}`, and as defaults for `color`/`color_background` settings.
- **Metaobjects**: `metaobject` / `metaobject_list` support both standard definitions (e.g. `product_review`) and custom definitions — but Theme Store themes may only use standard definitions.

---

### 6. Theme Editor Behavior

The theme editor "lets merchants customize the content and appearance of their store, and preview changes to their theme in real time."

**Access:**
- Shopify Admin → Online Store → Themes → select theme → Customize
- Development theme via Shopify CLI
- GitHub branch connected via the Shopify GitHub integration
- Uploading a theme ZIP to a store

**Customization is driven by** `config/settings_schema.json` plus each section's own setting attributes.

#### Live preview of settings
- **Color settings** (`color`, `color_background`): must be referenced inside `{% style %}` tags to live-preview; properties `red`, `green`, `blue`, `rgb` are accessible. Limitations: filtered values can't preview (filters operate on the CSS-variable string, not the underlying value); settings referenced only from external stylesheets in `/assets` won't preview live — declare CSS variables in `theme.liquid` instead.
- **Text settings** (`text`, `textarea`, `inline_richtext`, `richtext`): the setting's rendered value must be the **sole child** of its parent HTML element to live-preview; no filters except `escape` may be applied; the element must not be conditionally hidden on page load.

#### Section/block re-rendering on setting change
"When users customize sections and blocks through the theme editor, their HTML is dynamically added, removed, or re-rendered directly onto the existing DOM, without reloading the entire page. However, any associated JavaScript that runs when the page loads won't run again."

#### Editor-only detection

Liquid:
```liquid
{% if request.design_mode %}
  <!-- Renders only in theme editor -->
{% endif %}
```

JavaScript:
```javascript
if (Shopify.designMode) {
  // Executes only in theme editor
}
```
"The `Shopify.designMode` global variable can be used in your theme's JavaScript files to detect whether the storefront is being viewed in the theme editor. The value of the variable is set to `true` when viewing the theme editor. Otherwise, it's set to `undefined`."

Related global for visual-preview contexts:
```javascript
if (Shopify.visualPreviewMode) {
  // Runs in visual preview mode
}
```

#### JavaScript events emitted by the theme editor

From "Integrate sections with the theme editor" (linked off the online-editor page):

| Event name (exact string) | Dispatched on | Fires when | `event.detail` |
|---|---|---|---|
| `shopify:inspector:activate` | `document` | Preview inspector is activated | none |
| `shopify:inspector:deactivate` | `document` | Preview inspector is deactivated | none |
| `shopify:section:load` | the section element | Section is added or re-rendered | `{ sectionId }` |
| `shopify:section:unload` | the section element | Section is deleted or about to re-render | `{ sectionId }` |
| `shopify:section:select` | the section element | Merchant selects the section in the sidebar | `{ sectionId, load }` |
| `shopify:section:deselect` | the section element | Merchant deselects the section | `{ sectionId }` |
| `shopify:section:reorder` | the section element | Section is reordered | `{ sectionId }` |
| `shopify:block:select` | the block element | Merchant selects the block in the sidebar | `{ blockId, sectionId, load }` |
| `shopify:block:deselect` | the block element | Merchant deselects the block | `{ blockId, sectionId }` |

Binding examples:
```javascript
document.addEventListener('shopify:section:load', (event) => {
  const sectionId = event.detail.sectionId;
  const sectionElement = event.target;
  // Re-execute JavaScript for proper functionality
});

document.addEventListener('shopify:block:select', (event) => {
  const { blockId, sectionId, load } = event.detail;
  const blockElement = event.target;
  // Ensure block stays visible while selected
});

document.addEventListener('shopify:section:unload', (event) => {
  const sectionId = event.detail.sectionId;
  // Remove event listeners and clean up to prevent memory leaks
});
```

#### Keeping JS working after editor re-renders
- Because page-load JS does **not** re-run automatically when a section/block HTML is replaced, initialize/reinitialize your interactive JS from inside a `shopify:section:load` (and where relevant `shopify:block:select`) listener rather than only on `DOMContentLoaded`.
- Clean up listeners/timers/observers tied to a section's old DOM node inside `shopify:section:unload` to avoid leaks and duplicate handlers when a section reloads.
- "When a section or block is selected, that section or block becomes, and remains, visible while it's selected" — scroll it into view and pause any auto-advancing/interactive behavior (e.g. slideshows) on `shopify:block:select` / `shopify:section:select`.
- Reference implementation cited by Shopify: `theme-editor.js` in the Dawn reference theme (https://github.com/Shopify/dawn/blob/main/assets/theme-editor.js).

---

### 7. Locales / Translation Files

"Locale files are JSON files that contain a set of translations for text strings used throughout the theme and theme editor."

Location: `locales/` directory.

#### Two file types
- **Storefront locale files** (`.json`) — storefront-facing content translations, editable by merchants via the Shopify Language Editor.
- **Schema locale files** (`.schema.json`) — translations for theme editor settings (section/block schema `name`, `label`, etc.).

#### Naming rules
IETF language tags: lowercase language code, uppercase region code, e.g. `en-GB.json`, `fr-CA.schema.json`. Region-agnostic languages use the bare 2-letter code, e.g. `fi.json`.
Every theme requires exactly one default file per type, named `*.default.json` (typically `en.default.json`) — only one default file per type is allowed.

#### Structure (Category → Group → Description)
```json
{
  "my_category": {
    "my_group": {
      "my_description": "translation text"
    }
  }
}
```

#### The `t` filter
Referenced from section schema `locales` as `sections.[section-name].[key]`. General storefront usage pattern: `{{ 'my_category.my_group.my_description' | t }}`, with variable interpolation via `{{ 'key' | t: variable: value }}`.

#### Limits
- Maximum **3,400 translations** per locale file.
- Translation values capped at **1,000 characters**.

---

### 8. All Documented Limits

| Area | Limit |
|---|---|
| JSON templates per theme | 1,000 |
| Sections per JSON template | 25 |
| Section groups per theme | 20 |
| Sections per section group | 25 |
| Blocks per section | 50 (default `max_blocks`, can be lowered) |
| Blocks per JSON template or section group | 1,250 |
| Theme block nesting depth | 8 levels (excluding the section level) |
| Theme block files per theme | 300 |
| `section` schema `limit` (instances per template/group) | 1 or 2 |
| List-setting items (`product_list`, `collection_list`, `article_list`, `metaobject_list`) | 50 (default) |
| Translations per locale file | 3,400 |
| Locale translation value length | 1,000 characters |
| Theme name length | 50 characters |
| Section/block schema `name` length | 25 characters |
| Merchant-assigned custom name length | 100 characters |
| JSON template file size | 512 KB |
| Section group file size | 512 KB |
| `settings_schema.json` file size | 512 KB |
| `settings_data.json` file size | 1.5 MB |
| Locale file size | 1.5 MB |
| Other Liquid file size | 256 KB |
| Single `liquid`-type setting content | 50 KB |
| Compressed theme package upload | 50 MB |
| Total code across all files (whole theme) | 250 MB |
| Files per theme | 100,000 |

"Attempting to exceed a limit results in an error" during editing, saving, or syncing.

---

### Quick checklist

- [ ] Theme has `layout/theme.liquid` (the only strictly required file) with `{{ content_for_header }}` in `<head>` and `{{ content_for_layout }}` in `<body>`.
- [ ] `config/settings_schema.json` and `config/settings_data.json` both present and under 512 KB / 1.5 MB respectively.
- [ ] Every section file has a valid `{% schema %}` block with a unique `name` (≤25 chars), unique setting `id`s, and unique block `type`/`name`s.
- [ ] Sections that should be merchant-addable in the JSON template editor have at least one `presets` entry.
- [ ] `max_blocks` and per-block `limit` values respected; total blocks per section ≤ 50, per template/group ≤ 1,250.
- [ ] Theme blocks live in `/blocks`, are wired into sections via `{% content_for 'blocks' %}` plus `"blocks": [{ "type": "@theme" }, { "type": "@app" }]`, and nesting stays within 8 levels.
- [ ] JSON templates each declare required `sections` and `order`; total JSON templates per theme ≤ 1,000, ≤25 sections each.
- [ ] Liquid-only template types (`gift_card`, `robots.txt`, `agents.md`, `llms.txt`, `llms-full.txt`) are `.liquid`, not `.json`.
- [ ] Snippets used for pure code reuse (no merchant-facing settings), invoked via `{% render 'name', param: value %}` with explicit parameters only.
- [ ] Every text-producing setting checked for `blank`/existence before rendering; resource-picker settings checked that the referenced resource still exists.
- [ ] Interactive/page-load JS re-initializes on `shopify:section:load` (and `shopify:block:select` where relevant) and tears down on `shopify:section:unload`, rather than relying only on initial page load.
- [ ] Editor-only behavior gated behind `{% if request.design_mode %}` (Liquid) or `if (Shopify.designMode) { ... }` (JS), not shipped to the live storefront.
- [ ] Locale files: one `*.default.json` storefront locale and (if needed) one `*.default.schema.json`; ≤3,400 keys, values ≤1,000 characters; IETF-tag file naming.
- [ ] All color-preview settings wrapped in `{% style %}` (not only `/assets` stylesheets); all live-preview text settings are the sole child of their parent element with no filters beyond `escape`.
- [ ] `{% schema %}` JSON validated against `schemas/section.json` (sections) or `schemas/theme_block.json` (blocks) — no invalid setting types or missing required fields.
- [ ] `locales/*.json` validated against `schemas/translations.json`; all locale values are ≤ 1,000 characters and files are ≤ 3,400 keys.
- [ ] Every block wrapper has `{{ block.shopify_attributes }}`; section wrappers have `{{ section.shopify_attributes }}`.
- [ ] Every snippet and statically-rendered block has a `{% doc %}` header with `@param` and `@example`.
- [ ] Every `visible_if` condition manually tested in the editor — dependent setting shows/hides on controlling setting change without a reload.
- [ ] Single-property merchant settings use CSS variable pattern (`style="--prop: {{ setting }}"`); multi-property settings use CSS class pattern — no inline `<style>` blocks for schema-driven values.
- [ ] All user-facing strings in sentence case; all translation keys ≤ 3 levels deep, snake_case, in `en.default.json`; schema labels in `en.default.schema.json`.


---

