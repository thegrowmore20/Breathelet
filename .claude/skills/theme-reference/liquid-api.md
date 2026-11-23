---
description: Pure Liquid API reference — every non-deprecated tag, filter, object, property, and the deprecated list. Load ONLY to verify a filter/tag/object exists or check its exact parameters before using it. Do not load for general work.
---

> **Examples are illustrative.** When copying code: use the canonical srcset widths, eager/lazy cut-off and breakpoints from AGENTS.md, `const` + `for...of` instead of `var`/`forEach`, the canonical breakpoints in `rules/css.md` (750/990/1024px in examples are Dawn values). Constants win; report any contradicting line you find.


## Part 10 — Liquid API Reference

Source: https://shopify.dev/docs/api/liquid and its subpages. Compiled for writing correct, non-deprecated Shopify theme Liquid code.

---

### Tags

Liquid tags are wrapped in `{% %}` and contain logic. 31 tags total, grouped as Shopify's docs group them.

#### Theme tags
| Tag | Syntax | Does |
|---|---|---|
| `content_for` | `{% content_for "blocks" %}` / `{% content_for "block", type: "...", id: "..." %}` | Renders theme blocks (dynamic area) or a single static theme block. |
| `include` | `{% include 'filename' %}` | **DEPRECATED.** Renders a snippet, sharing the parent's variable scope. Replaced by `render`. Never use. |
| `javascript` | `{% javascript %} ... {% endjavascript %}` | JS included in section/block/snippet files; Liquid is not rendered inside. One per file. |
| `layout` | `{% layout name %}` | Specify which layout (`theme.liquid` by default) to use, or `none`. |
| `render` | `{% render 'filename' %}` | Renders a snippet or app block in an isolated scope. Preferred over `include`. |
| `section` | `{% section 'name' %}` | Renders a section statically (used in layout files). |
| `sections` | `{% sections 'group-name' %}` | Renders a section group (used in layout files). |
| `stylesheet` | `{% stylesheet %} ... {% endstylesheet %}` | CSS included in section/block/snippet files; Liquid is not rendered inside. One per file. |
| `theme-break` (displayed as "break") | `{% break %}` | Stops the rest of a **file** from rendering (theme-blocks context). Caution: a snippet rendered with the deprecated `include` tag shares scope, so `break` inside it can break the parent. |

#### Iteration tags
| Tag | Syntax | Does |
|---|---|---|
| `break` | `{% break %}` | Stops a `for` loop from iterating. |
| `continue` | `{% continue %}` | Skips to the next iteration of a `for` loop. |
| `cycle` | `{% cycle string, string, ... %}` | Loops through a group of strings, outputting one per `for` iteration. Must be used inside `for`. |
| `else` (iteration-else) | `{% for ... %} ... {% else %} ... {% endfor %}` | Default expression rendered when the `for` loop's array has zero length. |
| `for` | `{% for var in array %} ... {% endfor %}` | Renders a block for every item in an array. Max 50 iterations — use `paginate` for more. |
| `paginate` | `{% paginate array by page_size %} ... {% endpaginate %}` | Splits an array's items across multiple pages so `for` can loop >50 items. |
| `tablerow` | `{% tablerow var in array %} ... {% endtablerow %}` | Generates `<tr>`/`<td>` HTML table rows for every item in an array. Must be wrapped in `<table>`. |

#### Conditional tags
| Tag | Syntax | Does |
|---|---|---|
| `case` | `{% case var %}{% when val %}...{% endcase %}` | Renders an expression depending on the variable's value; supports `when val1, val2` and `when val1 or val2`. |
| `else` (conditional-else) | used inside `case`, `if`, `unless` | Default expression when no other condition is met. |
| `if` | `{% if condition %} ... {% endif %}` | Renders an expression if a condition is `true`. Supports `elsif`. |
| `unless` | `{% unless condition %} ... {% endunless %}` | Renders an expression unless a condition is `true`. Supports `elsif`. |

#### Variable tags
| Tag | Syntax | Does |
|---|---|---|
| `assign` | `{% assign var = value %}` | Creates a new variable from a value, object, or object property. |
| `capture` | `{% capture var %} ... {% endcapture %}` | Creates a new variable holding a rendered **string**. |
| `decrement` | `{% decrement var %}` | Creates/decrements a variable starting at -1, decreasing by 1 each call. Shares storage with `increment`. |
| `increment` | `{% increment var %}` | Creates/increments a variable starting at 0, increasing by 1 each call. Independent of `assign`/`capture`. |

#### Syntax tags
| Tag | Syntax | Does |
|---|---|---|
| `comment` | `{% comment %} ... {% endcomment %}` | Prevents content from rendering or being output. |
| `doc` | `{% doc %} ... {% enddoc %}` | LiquidDoc: documents a snippet/section's params with `@param`/`@example`; content is parsed but never rendered. |
| `echo` | `{% echo expression %}` | Outputs an expression; same as `{{ }}` but usable inside a `liquid` tag block, and filters can be chained. |
| `liquid` | `{% liquid ... %}` | A block of Liquid with one tag per line and no `{% %}` delimiters per line. Use `echo` inside it to output. |
| `raw` | `{% raw %} ... {% endraw %}` | Outputs Liquid code as literal text instead of rendering it. |

#### HTML tags
| Tag | Syntax | Does |
|---|---|---|
| `form` | `{% form 'type', object %} ... {% endform %}` | Generates a `<form>` (+ hidden inputs) for one of 15 built-in form types (see full detail below). |
| `style` | `{% style %} ... {% endstyle %}` | Generates `<style data-shopify>...</style>`; color-setting references live-update in the theme editor. |

---

### Full detail: required tags

#### render
```liquid
{% render 'filename' %}
```
- `filename` — snippet name, without `.liquid`.
- Snippets/app blocks **cannot** directly access variables created outside them (via `assign`/`capture`) — only global objects and objects passed in explicitly. Variables created *inside* a rendered snippet are not accessible outside it either. This isolation is the core reason `render` replaced `include`.
- You cannot use the `include` tag inside a snippet rendered with `render`.

**`for` parameter** — render once per array item:
```liquid
{% render 'filename' for array as item %}
```
Supplies an optional `as` alias for the current item, and exposes a `forloop` object inside the snippet.

**Passing variables:**
```liquid
{% render 'filename', variable: value %}
```
Changes made to a passed variable inside the snippet apply only within the snippet (it's a copy, not a reference).

**`with` parameter** — pass a single object:
```liquid
{% render 'filename' with object as name %}
```
Without `as`, reference the object inside the snippet using the snippet's filename.

#### content_for
**blocks** — dynamic block area (theme-editor configurable):
```liquid
{% content_for "blocks" %}
```
**block** — a single static block:
```liquid
{% content_for "block", type: "button", id: "static-block-1", color: "red" %}
```
Extra parameters (like `color`) become variables inside the static block (`{{ color }}`).

#### paginate
```liquid
{% paginate array by page_size %}
  {% for item in array %}
    ...
  {% endfor %}
{% endpaginate %}
```
- `array` — the array to paginate (must be a pageable type, see below).
- `page_size` — items per page, 1–250.
- Required because `for` caps at 50 iterations.
- Exposes the `paginate` object (see Objects section) inside the block.
- `window_size` parameter controls how many page-links surround the current page in generated nav:
```liquid
{% paginate collection.products by 3, window_size: 1 %}
```
- Use the `default_pagination` filter to render nav links from the `paginate` object.
- Pagination is capped at the 25,000th item total — filter the array further if you need more.
- Pageable objects/properties: `article.comments`, `blog.articles`, `collections`, `collection.products`, `customer.addresses`, `customer.orders`, `metaobject_definition.values`, `pages`, `product.variants`, `search.results`, and `article_list`/`collection_list`/`product_list` settings.

#### liquid
```liquid
{% liquid
  assign product_type = product.type | downcase
  case product_type
    when 'health'
      assign message = 'This is a health potion!'
    else
      assign message = 'This is a potion!'
  endcase
  echo message
%}
```
- One Liquid tag per line, no per-line `{% %}` delimiters.
- Use `echo` inside it (not `{{ }}`) to output values.

#### echo
```liquid
{% echo expression %}
```
Same as `{{ expression }}`, but usable inside `{% liquid %}` blocks. Filters work normally:
```liquid
{% liquid
  echo product.price | money
%}
```

#### form
```liquid
{% form 'form_type' %}
  content
{% endform %}
```
`form_type` requires (and some require an extra parameter):

| Type | Extra param | Notes |
|---|---|---|
| `activate_customer_password` | `article`-style, optional | account activation |
| `cart` | `cart` object (required) | POST `/cart` — proceed to checkout |
| `contact` | — | POST `/contact` |
| `create_customer` | — | POST `/account` — registration |
| `currency` | — | **DEPRECATED**, replaced by `localization` |
| `customer` | — | create customer w/o full account (e.g. newsletter) |
| `customer_address` | `customer.new_address` or `address` (required) | add/edit address |
| `customer_login` | — | POST `/account/login` |
| `guest_login` | — | guest checkout instead of login |
| `localization` | — | country/language selector; replaces deprecated `currency` form |
| `new_comment` | `article` object (required) | blog comment |
| `product` | `product` object (required) | POST `/cart/add` |
| `recover_customer_password` | — | forgot-password |
| `reset_customer_password` | — | reset password |
| `storefront_password` | — | password-protected storefront login |

**`return_to` parameter:**
```liquid
{% form 'customer_login', return_to: routes.root_url %}
```
Value can be `back`, a relative path, or a `routes` attribute.

**HTML attributes:** any parameter matching an attribute name (e.g. `id:`, `class:`) is added to the `<form>` tag.

Example:
```liquid
{% form 'product', product %}
  <input type="submit" value="Add to cart">
{% endform %}
```
Output includes `<input type="hidden" name="form_type" value="product">` and other required hidden fields automatically.

#### section
```liquid
{% section 'header' %}
```
Renders a section **statically** — only usable in layout/template files, not inside another section or snippet (use `render` for that context, which supports app blocks).

#### sections
```liquid
{% sections 'header-group' %}
```
Renders an entire section group (JSON file under `sections/`) — used in layout files.

#### javascript
```liquid
{% javascript %}
  console.log('hi');
{% endjavascript %}
```
One per section/block/snippet file. Liquid is **not** parsed inside — don't put `{{ }}` or `{% %}` in here.

#### stylesheet
```liquid
{% stylesheet %}
  .my-class { color: red; }
{% endstylesheet %}
```
One per section/block/snippet file. Liquid is **not** parsed inside.

#### style
```liquid
{% style %}
  .h1 { color: {{ settings.colors_accent_1 }}; }
{% endstyle %}
```
Renders `<style data-shopify>...</style>`. Liquid **is** rendered inside (unlike `stylesheet`). Referencing color settings here enables live-preview updates in the theme editor without a page refresh.

#### capture
```liquid
{% capture variable %}
  value
{% endcapture %}
```
Creates a string variable from rendered Liquid — useful for building complex strings with logic:
```liquid
{%- capture title -%}
  {% if show_up_title -%}
    Upcase title: {{ up_title }}
  {%- else -%}
    Downcase title: {{ down_title }}
  {%- endif %}
{%- endcapture %}
```
Caution: predefined Liquid objects can be shadowed by a variable of the same name.

#### assign
```liquid
{% assign variable_name = value %}
```
```liquid
{%- assign product_title = product.title | upcase -%}
{{ product_title }}
```
Same shadowing caution as `capture`.

#### increment
```liquid
{% increment variable_name %}
```
- Starts at `0`, +1 each call.
- Scoped to the layout/template/section file (shared with snippets rendered inside it).
- Independent of `assign`/`capture`; **shares** its counter storage with `decrement`.

#### cycle
```liquid
{% cycle string, string, ... %}
```
Must be inside a `for` loop; outputs the next string each iteration, wrapping around.
```liquid
{% for i in (1..4) -%}
  {% cycle 'one', 'two', 'three' %}
{%- endfor %}
{# => one two three one #}
```
**Named groups** — multiple `cycle` tags with identical string args in one template are treated as the same group and can desync. Disambiguate with a group name:
```liquid
{% cycle 'group_1': 'one', 'two', 'three' %}
```

#### tablerow
```liquid
<table>
{% tablerow product in collection.products %}
  {{ product.title }}
{% endtablerow %}
</table>
```
Parameters: `cols: number` (columns per row), `limit: number`, `offset: number`, and range form `{% tablerow i in (1..3) %}`. Auto-wraps output in `<tr class="rowN"><td class="colN">...</td></tr>`.

Associated **`tablerowloop`** object properties: `col`, `col0`, `col_first`, `col_last`, `first`, `last`, `index`, `index0`, `length`, `rindex`, `rindex0`, `row`.

#### for / else
```liquid
{% for item in array %}
  {{ item }}
{% else %}
  No items.
{% endfor %}
```
Parameters:
- `limit: number` — cap iterations (max 50 total regardless).
- `offset: number` — 1-based start index.
- `(number..number)` range instead of an array — literal or variable bounds.
- `reversed` — iterate in reverse.
- `else` — renders only when the array has zero items.

Associated **`forloop`** object properties: `first`, `index` (1-based), `index0` (0-based), `last`, `length`, `parentloop` (nil if not nested), `rindex` (1-based from end), `rindex0`.

#### case
```liquid
{% case variable %}
  {% when first_value %}
    first_expression
  {% when second_value %}
    second_expression
  {% else %}
    third_expression
{% endcase %}
```
`when` accepts multiple values: `{% when 'Love' or 'Luck' %}` or `{% when 'Strength', 'Health' %}`.

#### unless
```liquid
{% unless product.has_only_default_variant %}
  <!-- variant picker -->
{% endunless %}
```
Renders unless the condition is true; supports `elsif` like `if`.

#### doc
```liquid
{% doc %}
  Renders a message.

  @param {string} foo - A string value.
  @param {string} [bar] - An optional string value.

  @example
  {% render 'message', foo: 'Hello', bar: 'World' %}
{% enddoc %}
```
Nothing inside is rendered or executed (even Liquid tags inside are only parsed, not run) — used for editor tooling (autocomplete, linting) via LiquidDoc.

---

### render vs include

**`include` is deprecated and must never be used in new code.** Shopify's stated reason: "the way that variables are handled reduces performance and makes code harder to both read and maintain." It has been fully replaced by `render`.

| | `include` (deprecated) | `render` |
|---|---|---|
| Syntax | `{% include 'filename' %}` | `{% render 'filename' %}` |
| Scope | Shares the **entire** variable scope of the including file — the snippet can read *and mutate* any variable from the parent, and variables the snippet creates leak back out. | **Isolated scope.** The snippet cannot see outer variables at all unless explicitly passed in; nothing it creates leaks back out. |
| Performance | Slower — full scope must be made available. | Faster — isolated context can be optimized/cached. |
| Nesting rule | — | A snippet rendered with `render` cannot itself use `include`. |

**Passing variables to a snippet with `render`:**
```liquid
{% render 'filename', variable: value %}
```
Changes made to `variable` inside the snippet do **not** propagate back out — it's copy-in only.

**`with` — pass a single object under a name:**
```liquid
{% render 'filename' with product as item %}
```
Without `as`, the object is referenced inside the snippet by the snippet's own filename.

**`for` — render once per array item:**
```liquid
{% render 'filename' for collection.products as product %}
```
Gives access to a `forloop` object inside the snippet.

**What a snippet CAN still see even with `render`'s isolation:** global objects (e.g. `shop`, `settings`, `routes`) and any object directly accessible in the calling context (e.g. `product` inside a product template, `section` inside a section) — it just can't see locally `assign`ed/`capture`d variables unless passed explicitly.

---

### Asset & media filters

#### image_url
```liquid
variable | image_url: width: number, height: number
```
Returns the CDN URL for an image. Works on `article`, `collection`, `image`, `line_item`, `product`, `variant`, `country` (and their `src` property). **You must specify `width` or `height`** — omitting both is an error. An image is never upscaled past its original size.

| Parameter | Type | Notes |
|---|---|---|
| `width` | number | Up to 5760px. Height auto-calculates if only width given. |
| `height` | number | Up to 5760px. Width auto-calculates if only height given. |
| `crop` | string | `top`, `center` (default), `bottom`, `left`, `right`, `region`. `region` requires `crop_left`, `crop_top`, `crop_width`, `crop_height` (optionally resize the cropped region with `width`/`height`). SVG country flags can only be cropped if `format` is also set. |
| `format` | string | `pjpg` or `jpg`. Supported conversions: png→jpg, png→pjpg, jpg→pjpg. Shopify auto-selects WebP/AVIF/etc. for the client unless you force a format. |
| `pad_color` | string | Hex color (`hex3`/`hex6`) to pad with when the target aspect ratio differs from the source. |
| `quality` | number | 10–90. Omit to let Shopify auto-select (not equivalent to 100). |

```liquid
{{ product | image_url: width: 450 }}
{{ product | image_url: width: 400, height: 400, crop: 'bottom' }}
{{ product | image_url: crop: 'region', crop_left: 32, crop_top: 32, crop_width: 512, crop_height: 512 }}
{{ product | image_url: width: 450, format: 'pjpg' }}
{{ product | image_url: width: 400, height: 400, pad_color: '000' }}
{{ product | image_url: width: 450, quality: 80 }}
```
```html
//shop.myshopify.com/cdn/shop/files/science-beakers.jpg?v=1683744744&width=450
```

#### image_tag
```liquid
image_url | image_tag
```
Generates an `<img>` tag for an `image_url` result. Auto-adds `width`/`height` from the URL's dimensions/aspect ratio, applies `object-position` CSS from the image's focal point when available, and auto-generates a smart `srcset`.

| Parameter | Notes |
|---|---|
| `width` | Overrides the auto width; `nil` removes the attribute. |
| `height` | Overrides the auto height; `nil` removes the attribute. |
| `sizes` | Sets the HTML `sizes` attribute for responsive images. |
| `widths` | Custom comma-separated `srcset` widths (default: Shopify picks smart widths up to the URL's max). |
| `srcset` | Fully custom `srcset` string; takes precedence over `width`; `nil` removes the attribute. |
| `preload` | boolean. When `true`, sends a `Link: <url>; rel=preload; as=image` resource hint (with matching `imagesrcset`/`imagesizes`) — does not affect the `<img>` tag itself. Use sparingly, only above-the-fold. |
| `alt` | Overrides default alt text (media alt text, or resource title as fallback). |
| loading / fetchpriority / class / etc. | Any parameter matching an HTML `<img>` attribute name is passed through as-is. |

Lazy loading: if `preload` isn't applied, `loading="lazy"` is set automatically for images further down the page (don't lazy-load above-the-fold images — override via `section.index`/`section.location` logic if needed).

```liquid
{{ product | image_url: width: 200 | image_tag }}
{{ product | image_url: width: 400 | image_tag: width: 300 }}
{{ product | image_url: width: 200 | image_tag: sizes: '(min-width:1600px) 960px, (min-width: 750px) calc((100vw - 11.5rem) / 2), calc(100vw - 4rem)' }}
{{ product | image_url: width: 600 | image_tag: widths: '200, 300, 400' }}
{{ product | image_url: width: 200 | image_tag: srcset: nil }}
{{ product | image_url: width: 200 | image_tag: alt: "Custom alt text" }}
{{ product | image_url: width: 200 | image_tag: class: 'custom-class', loading: 'lazy' }}
```
```html
<img src="//shop.myshopify.com/cdn/.../science-beakers.jpg?v=1683744744&width=200"
     alt="Health potion"
     srcset="//shop.myshopify.com/cdn/.../science-beakers.jpg?v=1683744744&width=200 200w"
     width="200" height="133">
```

#### asset_url
```liquid
'cart.js' | asset_url
```
Returns the CDN URL for a file in the theme's `assets/` directory (auto-versioned query param for cache busting).
```liquid
{{ 'cart.js' | asset_url }}
{# => //shop.myshopify.com/cdn/shop/t/4/assets/cart.js?v=8397178126... #}
```

#### asset_img_url
```liquid
'file.jpg' | asset_img_url: 'size'
```
Returns the CDN URL for an image specifically in `assets/`. Defaults to the `small` (100×100) size; pass a size string (e.g. `'large'`) to override.
```liquid
{{ 'red-and-black-bramble-berries.jpg' | asset_img_url: 'large' }}
```

#### file_url
```liquid
'disclaimer.pdf' | file_url
```
Returns the CDN URL for a file uploaded via the **Files** page of the Shopify admin (not the theme's `assets/` folder).
```liquid
{{ 'disclaimer.pdf' | file_url }}
```

#### stylesheet_tag
```liquid
stylesheet_url | stylesheet_tag
```
Generates `<link rel="stylesheet" type="text/css" media="all" href="...">`. `href` and `rel` are managed by the filter and can't be overridden.

| Parameter | Notes |
|---|---|
| `preload` | boolean — sends `Link: <url>; rel=preload; as=style`. Use sparingly, only for render-blocking above-the-fold stylesheets. |
| any HTML attribute | e.g. `fetchpriority:` — passed through. |

```liquid
{{ 'base.css' | asset_url | stylesheet_tag }}
{{ 'base.css' | asset_url | stylesheet_tag: fetchpriority: 'high' }}
```

#### script_tag
```liquid
script_url | script_tag
```
Generates `<script src="..." type="text/javascript"></script>`. `src` can't be overridden. Boolean attrs (`defer`, `async`) render when `true`, omit when `false`.
```liquid
{{ 'cart.js' | asset_url | script_tag }}
{{ 'cart.js' | asset_url | script_tag: type: 'module', defer: true }}
```

#### preload_tag
```liquid
url | preload_tag: as: string
```
Generates `<link rel="preload" href="..." as="...">` and adds a matching `Link` resource-hint header. Input **must** come from `asset_url`, `global_asset_url`, or `shopify_asset_url`. Requires `as`. Use sparingly — only above-the-fold resources.
```liquid
{{ 'cart.js' | asset_url | preload_tag: as: 'script' }}
{{ 'cart.js' | asset_url | preload_tag: as: 'script', type: 'text/javascript' }}
```
For stylesheets prefer `stylesheet_tag: preload: true`; for images prefer `image_tag: preload: true`.

#### font_face
```liquid
font | font_face
```
Generates a CSS `@font-face` block (family, weight, style, `src` with woff2+woff URLs) for a `font` object (e.g. `settings.type_header_font`).

| Parameter | Notes |
|---|---|
| `font_display` | Sets the `font-display` CSS property, e.g. `'swap'`. |

```liquid
{{ settings.type_header_font | font_face }}
{{ settings.type_header_font | font_face: font_display: 'swap' }}
```
```css
@font-face {
  font-family: Assistant;
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  src: url("...assistant_n4....woff2") format("woff2"),
       url("...assistant_n4....woff") format("woff");
}
```

#### font_url
```liquid
font | font_url
```
Returns the CDN URL for a font in `woff2` format by default; pass `'woff'` for the woff format.
```liquid
{{ settings.type_header_font | font_url }}
{{ settings.type_header_font | font_url: 'woff' }}
```

#### font_modify
```liquid
font | font_modify: property, value
```
Returns a **font object** (not a URL) — a different weight/style variant of the same font family. Requires two args: the property to change (`'weight'` or `'style'`) and the new value/delta.

| Property | Values |
|---|---|
| `style` | `'normal'`, `'italic'`, `'oblique'` |
| `weight` | `'100'`–`'900'`, `'normal'` (400), `'bold'` (700), `'+100'`…`'+900'` (relative increase), `'-100'`…`'-900'` (relative decrease), `'lighter'`, `'bolder'` |

Returns `nil` if the requested variant doesn't exist in the font family — pair with `default` or a `nil` check.
```liquid
{%- assign bold_font = settings.type_body_font | font_modify: 'weight', 'bold' -%}
h2 { font-weight: {{ bold_font.weight }}; }

{%- assign heavy_font = settings.type_body_font | font_modify: 'weight', '900' | default: bold_font -%}
```

---

### Objects

Liquid objects are output with `{{ }}`. Accessed globally, within specific templates, or through a parent object. There are 142 documented objects; the ones most relevant to theme code follow.

#### routes — always use this instead of hardcoding URLs
```liquid
{{ routes.root_url }}
```
Ensures URLs stay correct across languages/markets and future URL-format changes. **Never hardcode a storefront path.**

| Property | Description |
|---|---|
| `account_addresses_url` | Account addresses page (redirects to customer accounts if enabled). |
| `account_login_url` | Account login page. |
| `account_logout_url` | Log the customer out. |
| `account_profile_url` | Customer-accounts profile page. |
| `account_recover_url` | Password recovery page. |
| `account_register_url` | Account registration page. |
| `account_url` | Account page. |
| `all_products_collection_url` | The auto-generated "all products" collection. |
| `cart_add_url` | `/cart/add` Cart API endpoint. |
| `cart_change_url` | `/cart/change` Cart API endpoint. |
| `cart_clear_url` | `/cart/clear` Cart API endpoint. |
| `cart_update_url` | `/cart/update` Cart API endpoint. |
| `cart_url` | Cart page. |
| `collections_url` | Collection list page. |
| `predictive_search_url` | Predictive Search API endpoint. |
| `product_recommendations_url` | Product Recommendations API endpoint. |
| `root_url` | Home page (`/`). |
| `search_url` | Search page. |
| `storefront_login_url` | Customer-accounts login (redirects back to prior page). |

#### product (key properties)
`available`, `category` (taxonomy_category), `collections`, `compare_at_price`, `compare_at_price_max`, `compare_at_price_min`, `compare_at_price_varies`, `content`/`description`, `created_at`, `featured_image`, `featured_media`, `first_available_variant`, `gift_card?`, `handle`, `has_only_default_variant`, `id`, `images`, `media`, `metafields`, `options`, `options_by_name`, `options_with_values`, `price`, `price_max`, `price_min`, `price_varies`, `published_at`, `quantity_price_breaks_configured?`, `requires_selling_plan`, `selected_or_first_available_selling_plan_allocation`, `selected_or_first_available_variant`, `selected_selling_plan`, `selected_selling_plan_allocation`, `selected_variant`, `selling_plan_groups`, `tags`, `template_suffix`, `title`, `type`, `url`, `variants`, `variants_count`, `vendor`.

#### variant (key properties)
`available`, `barcode`, `compare_at_price`, `featured_image`, `featured_media`, `id`, `image`, `incoming`, `inventory_management`, `inventory_policy`, `inventory_quantity`, `matched`, `metafields`, `next_incoming_date`, `option1`/`option2`/`option3`, `options`, `options_with_values`, `price`, `product`, `quantity_price_breaks`, `quantity_price_breaks_configured?`, `quantity_rule`, `requires_selling_plan`, `requires_shipping`, `selected`, `selected_selling_plan_allocation`, `selling_plan_allocations`, `sku`, `store_availabilities`, `taxable`, `title`, `unit_price`, `unit_price_measurement`, `url`, `weight`, `weight_in_unit`, `weight_unit`.

#### collection (key properties)
`all_products_count`, `all_tags`, `all_types`, `all_vendors`, `current_type`, `current_vendor`, `default_sort_by`, `description`, `featured_image`, `filters`, `handle`, `id`, `image`, `metafields`, `next_product`, `previous_product`, `products`, `products_count`, `published_at`, `sort_by`, `sort_options`, `tags`, `template_suffix`, `title`, `url`.

#### cart (key properties)
`attributes`, `cart_level_discount_applications`, `checkout_charge_amount`, `currency`, `discount_applications`, `discounts` (deprecated property), `duties_included`, `empty?`, `item_count`, `items`, `items_subtotal_price`, `original_total_price`, `requires_shipping`, `taxes_included`, `total_discount`, `total_price`, `total_weight`.

#### image (key properties)
`alt`, `aspect_ratio`, `attached_to_variant?`, `height`, `id`, `media_type`, `position`, `presentation`, `preview_image`, `product_id`, `src`, `variants`, `width`.

#### media (key properties)
An abstract type representing `image`, `model` (3D), `video`, or `external_video`. Common properties: `alt`, `id`, `media_type`, `position`, `preview_image`. Access type-specific fields by checking `media_type`.

#### section (key properties)
`blocks`, `id`, `index` (1-based), `index0` (0-based), `location`, `settings`.

#### block (key properties)
`id`, `settings`, `shopify_attributes` (spread on the wrapping element for editor support), `type`.

#### settings
```liquid
{{ settings.favicon }}
```
Accesses every setting defined in `config/settings_schema.json`. Available **globally**.
```liquid
{% if settings.favicon != blank %}
  <link rel="icon" type="image/png" href="{{ settings.favicon | image_url: width: 32, height: 32 }}">
{% endif %}
```

#### request
| Property | Notes |
|---|---|
| `design_mode` | `true` when previewing inside the theme editor. Don't use to change customer-facing behavior — only editor-only concerns (e.g. disabling analytics). |
| `host` | Domain the request is hosted on. |
| `locale` | `shop_locale` object for this request. |
| `origin` | Protocol + host — use with any relative URL to build an absolute one: `{{ product.url | prepend: request.origin }}`. |
| `page_type` | One of: `404`, `article`, `blog`, `captcha`, `cart`, `collection`, `list-collections`, `customers/account`, `customers/activate_account`, `customers/addresses`, `customers/login`, `customers/order`, `customers/register`, `customers/reset_password`, `gift_card`, `index`, `metaobject`, `page`, `password`, `policy`, `product`, `search`. |
| `path` | Current request path; `nil` if the page doesn't exist. |
| `visual_preview_mode` | `true` inside the editor's visual section-preview. |

#### paginate (object, populated inside `{% paginate %}`)
| Property | Notes |
|---|---|
| `current_offset` | Items shown before the current page. |
| `current_page` | Current page number. |
| `items` | Total items being paginated (capped at 25,000). |
| `next` / `previous` | `part` objects for next/previous page links. |
| `page_param` | URL query param name (default `page`; a suffix is appended for setting/metafield-driven lists). |
| `page_size` | Items per page (max 250). |
| `pages` | Total page count. |
| `parts` | Array of `part` objects for building pagination nav. |

Prefer the `default_pagination` filter over manually looping `parts`.

#### metafield
```liquid
{{ product.metafields.namespace.key }}
```
| Property | Notes |
|---|---|
| `list?` | `true` if the metafield is a list type. |
| `type` | One of: `single_line_text_field`, `multi_line_text_field`, `rich_text_field`, `product_reference`, `collection_reference`, `variant_reference`, `page_reference`, `file_reference`, `number_integer`, `number_decimal`, `date`, `date_time`, `url_reference`, `json`, `boolean`, `color`, `weight`, `volume`, `dimension`, `rating`, `money`. |
| `value` | Typed value — object, string, number, etc. per `type` (see table above). |

If a metafield's **key** is `size`, `first`, or `last`, you must use bracket notation — `product.metafields.namespace["size"]` — since those names collide with built-in filters under dot notation.

#### shop (key properties)
`accepts_gift_cards`, `address`, `brand`, `collections_count`, `currency`, `customer_accounts_enabled`, `customer_accounts_optional`, `description`, `domain`, `email`, `enabled_currencies`, `enabled_locales`, `enabled_payment_types`, `id`, `locale`, `metafields`, `metaobjects`, `money_format`, `money_with_currency_format`, `name`, `password_message`, `permanent_domain`, `phone`, `policies`, `privacy_policy`, `products_count`, `published_locales`, `refund_policy`, `search_types`, `secure_url`, `shipping_policy`, `subscription_policy`, `taxes_included`, `terms_of_service`, `types`, `url`, `vendors`.

#### template
| Property | Notes |
|---|---|
| `directory` | Parent directory name; `nil` if directly under `/templates`. |
| `name` | One of: `404`, `article`, `blog`, `cart`, `collection`, `list-collections`, `customers/account`, `customers/activate_account`, `customers/addresses`, `customers/login`, `customers/order`, `customers/register`, `customers/reset_password`, `gift_card`, `index`, `page`, `password`, `product`, `search`. |
| `suffix` | Alternate-template custom name; `nil` for the default template. |

#### localization
| Property | Notes |
|---|---|
| `available_countries` | Array of `country`. |
| `available_languages` | Array of `shop_locale`. |
| `country` | Currently selected `country`. |
| `language` | Currently selected `shop_locale`. |
| `market` | Currently selected `market`. |

Used with the `{% form 'localization' %}` tag.

#### All top-level objects (142 total)
`additional_checkout_buttons`, `address`, `all_country_option_tags`, `all_products`, `app`, `article`, `articles`, `block`, `blog`, `blogs`, `brand`, `brand_color`, `brand_colors`, `canonical_url`, `cart`, `checkout` (deprecated), `closest`, `collection`, `collections`, `color`, `color_scheme`, `color_scheme_group`, `comment`, `company`, `company_address`, `company_location`, `content_for_additional_checkout_buttons`, `content_for_header`, `content_for_index`, `content_for_layout`, `country`, `country_option_tags`, `currency`, `current_page`, `current_tags`, `customer`, `customer_payment_method`, `discount` (deprecated), `discount_allocation`, `discount_application`, `external_video`, `filter`, `filter_value`, `filter_value_display` (deprecated), `focal_point`, `font`, `forloop`, `form`, `form_errors`, `fulfillment`, `generic_file`, `gift_card`, `group`, `handle`, `image`, `image_presentation`, `images`, `instructions`, `line_item`, `link`, `linklist`, `linklists`, `localization`, `location`, `market`, `measurement`, `media`, `metafield`, `metafield_namespace`, `metafields`, `metaobject`, `metaobject_definition`, `metaobject_system`, `metaobjects`, `model`, `model_source`, `money`, `option_with_value`, `order`, `page`, `page_description`, `page_image`, `page_title`, `pages`, `paginate`, `parent_relationship`, `part`, `pending_payment_instruction_input`, `policy`, `powered_by_link`, `predictive_search`, `predictive_search_resources`, `product`, `product_option`, `product_option_value`, `quantity_price_break`, `quantity_rule`, `rating`, `recipient`, `recommendations`, `remote_details`, `remote_product`, `remote_shop`, `request`, `robots`, `routes`, `rule`, `script`, `scripts`, `search`, `section`, `self`, `selling_plan`, `selling_plan_allocation`, `selling_plan_allocation_price_adjustment`, `selling_plan_checkout_charge`, `selling_plan_group`, `selling_plan_group_option`, `selling_plan_option`, `selling_plan_price_adjustment`, `settings`, `shipping_method`, `shop`, `shop_locale`, `sitemap`, `sort_option`, `store_availability`, `store_credit_account`, `swatch`, `tablerowloop`, `tax_line`, `taxonomy_category`, `template`, `theme` (deprecated), `transaction`, `transaction_payment_details`, `unit_price_measurement`, `user`, `user_agent`, `variant`, `video`, `video_source`.

---

### Filters cheat-sheet

153 filters total, grouped by Shopify's own sidebar categories. One line each.

#### String (40)
`append` add to end · `base64_decode` decode Base64 · `base64_encode` encode Base64 · `base64_url_safe_decode` decode URL-safe Base64 · `base64_url_safe_encode` encode URL-safe Base64 · `blake3` Blake3 hash · `camelize` to CamelCase · `capitalize` capitalize first word · `downcase` lowercase · `escape` HTML-escape · `escape_once` HTML-escape without double-escaping · `handleize` convert to a handle · `hmac_sha1` HMAC-SHA1 hash · `hmac_sha256` HMAC-SHA256 hash · `lstrip` strip left whitespace · `md5` MD5 hash · `newline_to_br` `\n` → `<br>` · `pluralize` singular/plural by count · `prepend` add to start · `remove` remove all instances of a substring · `remove_first` remove first instance · `remove_last` remove last instance · `replace` replace all instances · `replace_first` replace first instance · `replace_last` replace last instance · `rstrip` strip right whitespace · `sha1` SHA-1 hash (not cryptographically secure) · `sha256` SHA-256 hash (prefer `blake3`) · `slice` substring/array slice · `split` split into an array · `strip` strip both sides · `strip_html` remove all HTML tags · `strip_newlines` remove all newlines · `truncate` truncate to N characters · `truncatewords` truncate to N words · `upcase` uppercase · `url_decode` decode percent-encoding · `url_encode` percent-encode URL-unsafe chars · `url_escape` escape URL-unsafe chars (no `+` for spaces) · `url_param_escape` escape for use as a URL query param.

#### Math (11)
`abs` absolute value · `at_least` clamp to a minimum · `at_most` clamp to a maximum · `ceil` round up · `divided_by` division · `floor` round down · `minus` subtract · `modulo` remainder · `plus` add · `round` round to nearest int · `times` multiply.

#### Array (17)
`compact` remove nil items · `concat` combine two arrays · `find` first item matching a property value · `find_index` index of first item matching a property value · `first` first item · `has` test if any item matches a property/value · `join` combine items into a string · `last` last item · `map` extract a property from every item · `reject` exclude items matching a property/value · `reverse` reverse order · `size` length of a string or array · `sort` case-sensitive alphabetical/numeric sort · `sort_natural` case-insensitive sort · `sum` sum of all items · `uniq` remove duplicates · `where` include only items matching a property/value.

#### Money (5)
`money` format price per store's HTML-with-currency setting · `money_amount` format as a plain decimal string, no currency symbol · `money_with_currency` format with ISO currency code · `money_without_currency` format without symbol/code · `money_without_trailing_zeros` format dropping trailing `.00`.

#### HTML (8)
`highlight` wrap matches of a string in `<strong>` · `inline_asset_content` inline an asset file's content · `link_to` generate an `<a>` tag · `placeholder_svg_tag` generate a placeholder `<svg>` · `preload_tag` generate a `<link rel="preload">` — see Asset & media section · `script_tag` generate a `<script>` tag — see Asset & media section · `stylesheet_tag` generate a `<link rel="stylesheet">` — see Asset & media section · `time_tag` generate an HTML `<time>` tag from a timestamp.

#### Localization (3)
`currency_selector` **DEPRECATED**, no replacement (was for the deprecated `currency` form) · `format_address` generate an HTML address block · `translate` (aka `t`) translated string for a translation key.

#### Metafield (2)
`metafield_tag` generate an HTML element to host a metafield's data · `metafield_text` generate a plain-text version of a metafield's data.

#### Tag (3)
`link_to_add_tag` `<a>` that adds a tag to the current search/filter · `link_to_remove_tag` `<a>` that removes a tag · `link_to_tag` `<a>` that filters by a tag.

#### Format (6)
`date` format a timestamp (options: `date`, `date_at_time`, `default`, `on_date`, `short` (deprecated), `long` (deprecated)) · `json` convert to JSON · `standard_event_data` JSON payload for standard analytics events · `structured_data` schema.org structured-data JSON-LD · `unit_price_with_measurement` format a unit price + measurement · `weight_with_unit` format a variant's weight with its unit.

#### Color (16)
`brightness_difference` perceived-brightness diff between two colors · `color_brightness` perceived brightness of one color · `color_contrast` WCAG contrast ratio numerator · `color_darken` darken by % · `color_desaturate` desaturate by % · `color_difference` difference between two colors · `color_extract` extract one color component · `color_lighten` lighten by % · `color_mix` blend two colors by % · `color_modify` set one color component · `color_saturate` saturate by % · `color_to_hex` → hex · `color_to_hsl` → HSL(A) · `color_to_oklch` → OKLCH · `color_to_rgb` → RGB(A) · `hex_to_rgba` **DEPRECATED**, replaced by `color_to_rgb`/`color_modify`.

#### Hosted File (6)
`asset_img_url` CDN URL for an image in `assets/`, sized · `asset_url` CDN URL for a file in `assets/` — see Asset & media section · `file_img_url` CDN URL for an image from the Files page, sized · `file_url` CDN URL for a Files-page file — see Asset & media section · `global_asset_url` CDN URL for a globally shared Shopify asset · `shopify_asset_url` CDN URL for a globally accessible Shopify asset.

#### Media (12)
`article_img_url` **DEPRECATED** article image URL (use `image_url`) · `collection_img_url` **DEPRECATED** collection image URL (use `image_url`) · `external_video_tag` `<iframe>` for a YouTube/Vimeo video · `external_video_url` URL for an external video · `image_tag` `<img>` tag — see Asset & media section · `image_url` CDN image URL — see Asset & media section · `img_tag` **DEPRECATED** (use `image_tag`) · `img_url` **DEPRECATED** (use `image_url`) · `media_tag` appropriate HTML tag for any `media` object · `model_viewer_tag` Google `<model-viewer>` embed for a 3D model · `product_img_url` **DEPRECATED** product image URL (use `image_url`) · `video_tag` `<video>` tag.

#### Font (3)
`font_face` `@font-face` CSS block — see Asset & media section · `font_modify` a variant of a font (weight/style) — see Asset & media section · `font_url` CDN font URL — see Asset & media section.

#### Cart (2)
`item_count_for_variant` total cart quantity of a given variant · `line_items_for` subset of cart line items matching a product/variant.

#### Collection (7)
`highlight_active_tag` wrap the active filter tag in an HTML element · `link_to_type` `<a>` to a collection listing a product type · `link_to_vendor` `<a>` to a collection listing a vendor · `sort_by` collection URL with a `sort_by` param applied · `url_for_type` URL for a product-type collection · `url_for_vendor` URL for a vendor collection · `within` product URL within the context of a given collection.

#### Customer (5)
`avatar` HTML for a customer's avatar · `customer_login_link` `<a>` to log in · `customer_logout_link` `<a>` to log out · `customer_register_link` `<a>` to register · `login_button` accelerated-checkout login button.

#### Default (3)
`default` fallback value if input is empty/false/nil · `default_errors` default error messages for form errors · `default_pagination` HTML nav links for a `paginate` object.

#### Payment (4)
`payment_button` accelerated-checkout button container · `payment_terms` Shop Pay Installments banner HTML · `payment_type_img_url` SVG image URL for a payment icon · `payment_type_svg_tag` `<svg>` tag for a payment icon.

---

### Deprecated / never use

**Tags**
- `include` — replaced entirely by `render`. Shares full variable scope (a performance/maintainability problem); never use in new code.
- `{% form 'currency' %}` — replaced by `{% form 'localization' %}`.

**Filters**
- `img_tag` → use `image_tag`.
- `img_url` → use `image_url`.
- `article_img_url` → use `image_url` on the article's image.
- `collection_img_url` → use `image_url` on the collection's image.
- `product_img_url` → use `image_url` on the product's image.
- `hex_to_rgba` → use `color_to_rgb` / `color_modify`.
- `currency_selector` → deprecated with no replacement (the `currency` form it supported is gone).
- `date`/`time_tag` format options `short` and `long` are deprecated (other format keywords are fine: `date`, `date_at_time`, `default`, `on_date`).
- `sha1`/`hmac_sha1` are not cryptographically secure — prefer `blake3` (or `sha256`/`hmac_sha256`) for new code.

**Objects**
- `checkout` — deprecated for the Information/Shipping/Payment pages (as of Aug 13, 2024) in favor of Checkout Extensibility; don't build new `checkout.liquid` customizations.
- `discount` — deprecated because it doesn't capture all discount types/details; use `discount_allocation` / `discount_application`.
- `filter_value_display` — deprecated in favor of `swatch`.
- `theme` — deprecated because its properties are subject to change without notice.
- Several objects (`cart`, `line_item`, `order`, `shipping_method`, `shop`, `variant`, `filter_value`) have individual **Deprecated Properties** subsections for specific fields (e.g. `cart.discounts`, `order.discounts`, `shipping_method.price`, `shop.enabled_locales`, `variant.option1/2/3` in some contexts) — check the object's `## Deprecated Properties` section before relying on an older-looking field.

**Metafield types**
- `integer`, `json_string`, `string` metafield types are deprecated legacy formats (they return the raw value directly, not a metafield object with `type`/`value`/`list?`). Use `number_integer`, `json`, and `single_line_text_field` respectively for new metafields.
