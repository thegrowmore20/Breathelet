---
description: Deep reference for Liquid TTFB: loops, metafields inside loops, pagination, render vs include, filter-chain caching, variant over-fetching, template weight. Load when writing non-trivial Liquid logic or diagnosing TTFB > 600ms — not for simple edits (use rules/liquid.md).
---

> **Examples are illustrative.** When copying code: use the canonical srcset widths, eager/lazy cut-off and breakpoints from AGENTS.md, `const` + `for...of` instead of `var`/`forEach`, the canonical breakpoints in `rules/css.md` (750/990/1024px in examples are Dawn values). Constants win; report any contradicting line you find.


## Part 2 — Liquid Performance (TTFB & server render time)

Source: https://shopify.dev/docs/storefronts/themes/best-practices/performance/

---

#### Render Essential Content Server-Side (Liquid/HTML, not client-side JS)

**Why it matters:** Client-side rendering creates a sequential waterfall (empty HTML shell → download/parse JS bundle → framework fetches data via API → framework renders DOM → browser discovers images). This delays **FCP** (content doesn't render until the framework executes), **LCP** (images can't be discovered by the preload scanner until rendered), and **INP** (large JS bundles consume main-thread resources).

**Do**
- Render initial page content using Liquid and HTML.
- If a framework is necessary, render on the server in Liquid rather than client-side approaches on Liquid storefronts.
- Use progressive enhancement: ship complete server-rendered HTML first, then layer JS for interactivity.
- Use the Section Rendering API to fetch server-rendered HTML fragments for dynamic updates instead of re-rendering with JS/JSON.
- Test with DevTools JS disabled — all above-fold content should still display.

**Don't**
- Mount an empty root `<div>` and build the DOM entirely via a JS bundle fetching data client-side.

```liquid
❌ Before: Client-Side Rendering
<div id="product-root"></div>
<script src="{{ 'product-app.bundle.js' | asset_url }}" defer></script>
<script>
  // Fetch data, then build DOM
</script>
```

```liquid
✅ After: Server-Rendered with Liquid
<div class="product">
  <div class="product__media">
    {{ product.featured_image
    | image_url: width: 1200
    | image_tag:
        loading: 'eager',
        fetchpriority: 'high',
        widths: '400, 600, 800, 1200',
        sizes: '(min-width: 1000px) 600px, calc(100vw - 2rem)'
    }}
  </div>
  <div class="product__info">
    <h1>{{ product.title }}</h1>
    <p class="product__price">
      {{ product.selected_or_first_available_variant.price | money }}
    </p>
  </div>
</div>
```

```javascript
// Progressive enhancement: minimal enhancement script
productElement.addEventListener('change', async (event) => {
  const response = await fetch(updateUrl);
  const html = await response.text();
  productElement.innerHTML = html;
});
```

```javascript
// Section Rendering API for updates
async function updateSection(sectionId, variantId) {
  const url = `${window.location.pathname}?variant=${variantId}&sections=${sectionId}`;
  const response = await fetch(url);
  const data = await response.json();
  document.getElementById(`shopify-section-${sectionId}`).outerHTML = data[sectionId];
}
```

Testing: disable-JS test, Performance panel (server-rendered pages show content appearing early), Network waterfall (check when LCP image request appears), bundle-size comparison.

Related links:
- https://shopify.dev/docs/api/ajax/section-rendering
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-variant-overfetching
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/understanding-inp

---

#### Avoid Deeply Nested Liquid Loops

**Why it matters:** Nested loops have multiplicative cost — O(n²) complexity, so "doubling the collection size roughly quadruples the rendering work," directly hurting server render time / **TTFB**.

**Do**
- Use `where` + `first` to find a single matching item instead of nesting a loop with a `break`.
- Use `map` to pre-build a lookup array (e.g., cart variant IDs) and check with `contains` instead of an inner loop per outer item.
- Use `join` to combine an inner collection into a string instead of looping to print with a separator.
- Use the Theme Inspector Chrome extension (flame graph / sandwich view) and compare TTFB in DevTools Network panel before/after.

**Don't**
- Nest a `for` loop inside another `for` loop to search for or match a single item per outer iteration.

```liquid
❌ Less performant (nested loop with break)
{% for collection in collections %}
  {% for product in collection.products %}
    {% if product.available %}
      {{ product.featured_image | image_url: width: 400 | image_tag }}
      {% break %}
    {% endif %}
  {% endfor %}
{% endfor %}
```

```liquid
✅ More performant (where + first)
{% for collection in collections %}
  {% assign in_stock = collection.products | where: "available", true | first %}
  {% if in_stock %}
    {{ in_stock.featured_image | image_url: width: 400 | image_tag }}
  {% endif %}
{% endfor %}
```

```liquid
❌ Less performant (nested membership check)
{% for variant in product.variants %}
  {% assign in_cart = false %}
  {% for item in cart.items %}
    {% if item.variant_id == variant.id %}
      {% assign in_cart = true %}
      {% break %}
    {% endif %}
  {% endfor %}
  {% if in_cart %}<span>In cart</span>{% endif %}
{% endfor %}
```

```liquid
✅ More performant (map + contains)
{% assign cart_variant_ids = cart.items | map: "variant_id" %}
{% for variant in product.variants %}
  {% if cart_variant_ids contains variant.id %}
    <span>In cart</span>
  {% endif %}
{% endfor %}
```

```liquid
❌ Less performant (nested loop to join)
{% for variant in product.variants %}
  <p>
    {% for option in variant.options %}
      {{ option }}{% unless forloop.last %} / {% endunless %}
    {% endfor %}
  </p>
{% endfor %}
```

```liquid
✅ More performant (join filter)
{% for variant in product.variants %}
  <p>{{ variant.options | join: " / " }}</p>
{% endfor %}
```

Related links:
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/move-operations-outside-loops
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/move-metafield-access-outside-loops
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-repetitive-filter-calls

---

#### Move Metafield Access Outside Loops

**Why it matters:** Each metafield access queries the backend. With nested loops (e.g., 50 products × 10 variants = 500+ lookups), this "can add seconds to page load time" (server render time / TTFB). Metaobject loops are "particularly expensive" since entries require backend queries.

**Do**
- Move metafield reads that don't vary per loop iteration (e.g., a collection-level metafield) outside the loop with `assign`.
- Read the metafield off a single resolved variant (e.g., `selected_or_first_available_variant`) instead of checking every variant in a loop.
- Limit metaobject loops with `limit:`.
- Use theme settings instead of metafields for non-product-specific data to eliminate per-product lookups entirely.
- Use Theme Inspector's sandwich view to find repetitive metafield access; measure TTFB before/after.

**Don't**
- Access `collection.metafields.*` or `variant.metafields.*` freshly on every iteration of a `for` loop.

```liquid
❌ BAD
{% for product in collection.products %}
  {% if collection.metafields.custom.badge_label != blank %}
    <span class="badge">{{ collection.metafields.custom.badge_label }}</span>
  {% endif %}
{% endfor %}
```

```liquid
✅ GOOD
{% assign badge_label = collection.metafields.custom.badge_label %}
{% for product in collection.products %}
  {% if badge_label != blank %}
    <span class="badge">{{ badge_label }}</span>
  {% endif %}
{% endfor %}
```

```liquid
❌ BAD (variant-level metafield checks in a loop)
{% for variant in product.variants %}
  {% if variant.metafields.custom.field1 %}...{% endif %}
{% endfor %}
```

```liquid
✅ GOOD (resolve one variant first)
{% assign selected = product.selected_or_first_available_variant %}
{% if selected.metafields.custom.field1 %}...{% endif %}
```

```liquid
✅ GOOD (limit metaobject loops)
{% for testimonial in metaobjects.testimonials.values limit: 3 %}
  {{ testimonial.author.value }}
{% endfor %}
```

---

#### Avoid Over-Fetching Product Variants

**Why it matters:** "Iterating over `product.variants` forces the server to load and process all variant data during page rendering. For products with hundreds or thousands of variants (Shopify supports up to **2,048 variants**), this significantly increases **TTFB** by loading unnecessary data."

**Do**
- Use `product.options_with_values` to build option pickers — it provides option data without loading full variant objects, and includes `product_option_value.available` and `product_option_value.selected` for state.
- Use the Section Rendering API + JS to fetch updated variant info on selection, passing selected option value IDs via the `option_values` parameter.
- It's fine to check properties without iterating: `product.variants.size`, `product.variants.first.price`, `product.variants_count` carry no performance penalty.
- Test with high-variant products (100+, and compare 10-variant vs 1,000-variant) using Theme Inspector flame graphs and DevTools Network.

**Don't**
- Loop over `product.variants` just to build an option `<select>`.

```liquid
❌ Problematic Pattern
{% form 'product', product %}
  <select name="id">
    {%- for variant in product.variants -%}
      <option value="{{ variant.id }}">
        {{ variant.title }} - {{ variant.price | money }}
      </option>
    {%- endfor -%}
  </select>
{% endform %}
```

```liquid
✅ Recommended Pattern
<div class="option-value-selectors" data-section-id="{{ section.id }}">
  {%- for option in product.options_with_values -%}
    <fieldset>
      <legend>{{ option.name }}</legend>
      {%- for option_value in option.values -%}
        <input
          id="{{ section.id }}-{{ option.position }}-{{ forloop.index0 }}"
          type="radio"
          name="{{ section.id }}-{{ option.name }}-{{ option.position }}"
          value="{{ option_value | escape }}"
          {% if option_value.selected %}checked{% endif %}
          {% unless option_value.available %}disabled{% endunless %}
          data-option-value-id="{{ option_value.id }}"
          onchange="updateVariantInfo(event)"
        />
        <label for="{{ section.id }}-{{ option.position }}-{{ forloop.index0 }}">
          {{ option_value }}
        </label>
      {%- endfor -%}
    </fieldset>
  {%- endfor -%}
</div>
```

```liquid
✅ Acceptable variant usage (no performance impact — no iteration)
{% if product.variants.size > 1 %}
  <p>This product has options</p>
{% endif %}

{{ product.variants.first.price }}

{{ product.variants_count }}
```

---

#### Limit Pagination Depth

**Why it matters:** Deep pagination requires scanning thousands of objects, increasing database query time and server processing overhead (TTFB), which can degrade platform-wide performance.

**Threshold / numbers**
- Keep pagination depth **at or below 25,000 objects**. Count queries return **25,001** for arrays exceeding the limit.
- The platform maximum for `{% paginate %}` is **250 items per page**; values above it are clamped to 250.
- Metaobject entries allow up to **1,000 per page**.
- Display **12–50 products per page** (50 as upper bound); with 50/page, max useful depth is **500 pages** (25,000 ÷ 50 = 500 pages).

**Do**
- Use collection filters (product type, vendor, price, size, color) instead of deep pagination.
- Promote search functionality for very large catalogs.
- Suggest filters if customers reach page 3 or later.
- Test accessing page 500+ to understand behavior; monitor TTFB for filtered vs. unfiltered collections; verify `collection.products_count` for large collections.

**Don't**
- Show all 30,000 products without filtering.
- Paginate through hundreds of pages relying solely on page offsets.

**Infinite scroll pattern:** use `IntersectionObserver` on a sentinel element rather than scroll listeners (which fire on every frame); include a fallback "Load more" button and keep keyboard/screen-reader accessibility.

---

#### Avoid Nested Renders (Flatten `render` Calls)

**Why it matters:** Reduces "compounding execution overhead of `render` tags, especially inside loops," improving **TTFB**. Each render call has fixed overhead (file lookup, scope creation, variable passing). With 50 products, a three-level nesting pattern creates **150 render calls** (50 × 3) instead of 50.

**Do**
- Replace every deprecated `include` with `render`, passing needed variables as explicit arguments (unlike `include`, `render` gives scope isolation and allows optimization).
- Inline simple markup — if a snippet contains only basic HTML without complex logic, merge it into the parent.
- Flatten nested snippets — combine e.g. product-price and product-badge into product-card rather than calling them separately.
- Use a `skip_styles` pattern to prevent duplicate stylesheet loading across loop iterations.
- Use Theme Inspector flame graphs to visualize nesting depth; compare TTFB before/after.

**Don't**
- Use `include` (deprecated — prevents scope isolation/optimization, slower than `render`).
- Pass a comparison directly as a render argument — **"Render arguments can't contain comparisons"**: expressions like `skip_styles: forloop.index > 1` silently fail. Assign the comparison to a variable first, then pass it.

```liquid
❌ Before (150 render calls with 50 products)
{%- for product in collection.products -%}
  {% render 'product-card', product: product %}
{%- endfor -%}
```

```liquid
✅ After (50 render calls, via skip_styles hoisted to a variable)
{%- for product in collection.products -%}
  {% render 'product-card',
    product: product,
    skip_styles: skip_card_product_styles
  %}
  {%- assign skip_card_product_styles = true -%}
{%- endfor -%}
```

---

#### Avoid Conditionals in Loops (Filter Collections Before Entering Loops)

**Why it matters:** "Conditional checks have a processing cost. When placed inside a `for` loop, the number of iterations multiplies this cost." This directly increases server-side rendering time and **TTFB**. Example: 50 products with 3 conditionals per iteration = 150 evaluations; pre-filtering to 12 matching products reduces this to 12 evaluations total.

**Do**
- Pre-filter with `where`, `map`, `sort`, `compact`, `uniq` before the loop.
- For complex filtering, apply multiple filters before the loop and handle any remaining condition with a single in-loop check.
- Build pre-computed lookup arrays (e.g., via `map`) before looping, for efficient `contains` membership checks.
- Use Theme Inspector to identify high Liquid rendering times; compare TTFB before/after; focus on pages with 50+ products.

**Don't**
- Put an `if` inside a `for` loop to filter items that could have been filtered before the loop.

```liquid
❌ Less Performant
{%- for product in collection.products -%}
  {% if product.available %}
    {{ product.title }} - {{ product.price | money }}
  {% endif %}
{%- endfor -%}
```

```liquid
✅ More Performant
{% assign available_products = collection.products | where: "available" %}
{%- for product in available_products -%}
  {{ product.title }} - {{ product.price | money }}
{%- endfor -%}
```

```liquid
✅ Complex filtering strategy (pre-filter, then one remaining check)
{% assign candidates = collection.products | where: "available" %}
{%- for product in candidates -%}
  {% if product.tags contains 'featured' and product.price >= 1000 and product.price <= 5000 %}
    <!-- render product -->
  {% endif %}
{%- endfor -%}
```

```liquid
✅ Pre-computed lookup variable
{% assign promoted_handles = section.settings.promoted_products | map: "handle" %}
{%- for product in collection.products -%}
  {% if promoted_handles contains product.handle %}
    <!-- promoted styling -->
  {% endif %}
{%- endfor -%}
```

Related links:
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-deeply-nested-liquid-loops
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/move-operations-outside-loops
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/move-metafield-access-outside-loops

---

#### Move Operations Outside Loops

**Why it matters:** "When you perform an operation inside a `for` loop that doesn't depend on the loop variable, you're calculating the same thing multiple times." This increases server-side Liquid execution time and negatively impacts **TTFB, FCP, and LCP**.

**Do**
- Calculate values that don't depend on the loop variable once before the loop, then reuse the result.
- Common operations to hoist: static `assign` statements not referencing the loop variable, `capture` blocks producing identical output each iteration, `image_url`/`asset_url` filters with unchanged paths, `sort`/`where` filters on collections, `money` filter on fixed values, `size` operations on static arrays.
- Real-world example: hoisting four operations (`placeholder_svg_tag`, `asset_url`, `money`, `size`) outside a 50-product loop eliminates 200 redundant filter evaluations.
- Use Theme Inspector to identify repeated operations; compare TTFB before/after.

**Don't**
- Recompute a loop-invariant value (e.g., `sort` the same collection) on every single iteration.

```liquid
❌ Less performant (sort inside loop)
{%- for product in collection.products -%}
  {% assign sorted = collection.products | sort: "price" %}
  {{ product.title }}
{%- endfor -%}
```

```liquid
✅ More performant (sort before loop)
{% assign sorted = collection.products | sort: "price" %}
{%- for product in sorted -%}
  {{ product.title }}
{%- endfor -%}
```

---

#### Avoid Repetitive Filter Calls (Cache Filter Results in a Variable)

**Why it matters:** "Repeated calls add up" — a filter might take ~50 µs per call but called 2,000 times totals **100 ms or more** of added server render time.

**Do**
- Cache filter results in a variable using `assign` instead of calling the same filter multiple times for the same result.
- Use Theme Inspector sandwich view to identify repetitive filters.

**Don't**
- Call the same filter (e.g., `image_url: width: 300`) more than once on the same input within a loop iteration.

```liquid
❌ Less Performant Example
{%- for product in collection.products -%}
  <img src="{{ product.featured_image | image_url: width: 300 }}" />
  <img src="{{ product.featured_image | image_url: width: 300 }}" />
  {%- comment -%} Calls image_url twice for the same result {%- endcomment -%}
{%- endfor -%}
```

```liquid
✅ More Performant Example
{%- for product in collection.products -%}
  {% assign product_image = product.featured_image | image_url: width: 300 %}
  <img src="{{ product_image }}" />
  <img src="{{ product_image }}" />
{%- endfor -%}
```

Related links:
- https://shopify.dev/docs/api/liquid/tags/assign
- https://shopify.dev/docs/api/liquid/filters/image_url
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/move-operations-outside-loops

---

#### Assign block.settings to a Variable

**Why it matters:** "There's a performance cost to accessing the `block.settings` object each time it appears in a template. Liquid must resolve the property chain (`block`, then `settings`, then the specific key) on every access." Impact multiplies in loops: a section with 20 blocks × 5 settings properties = 100 lookups per render vs. 20 assignments + 100 fast variable reads.

**Do**
- `{%- assign block_settings = block.settings -%}` once, then reference `block_settings.*`.
- Apply the same pattern to `section.settings` when a section accesses its own settings repeatedly.
- Highest impact: assign inside `for` loops over `section.blocks`.
- Use Theme Inspector to measure per-section/block Liquid rendering time; compare TTFB (filter Network panel to the document request, check "Waiting for server response"). Greatest impact on homepages with slideshow sections, FAQ sections with many items, or any section iterating over blocks.

**Don't**
- Repeatedly write out `block.settings.title`, `block.settings.text`, etc. instead of assigning once.

```liquid
❌ Less Performant
<h2>{{ block.settings.title }}</h2>
<p>{{ block.settings.text }}</p>
<a href="{{ block.settings.link_url }}">{{ block.settings.link_text }}</a>
{% if block.settings.show_image and block.settings.image != blank %}
  {{ block.settings.image | image_url: width: 600 | image_tag: loading: 'lazy' }}
{% endif %}
```

```liquid
✅ More Performant
{%- assign block_settings = block.settings -%}
<h2>{{ block_settings.title }}</h2>
<p>{{ block_settings.text }}</p>
<a href="{{ block_settings.link_url }}">{{ block_settings.link_text }}</a>
{% if block_settings.show_image and block_settings.image != blank %}
  {{ block_settings.image | image_url: width: 600 | image_tag: loading: 'lazy' }}
{% endif %}
```

```liquid
✅ In For Loops (Highest Impact)
{%- for block in section.blocks -%}
  {%- assign block_settings = block.settings -%}
  <div class="slide" {{ block.shopify_attributes }}>
    {% if block_settings.image != blank %}
      {{ block_settings.image | image_url: width: 800 | image_tag: loading: 'lazy', widths: '400, 600, 800', sizes: '(min-width: 768px) 50vw, 100vw', alt: block_settings.image_alt }}
    {% endif %}
    <div class="slide__content">
      {% if block_settings.heading != blank %}
        <h2>{{ block_settings.heading }}</h2>
      {% endif %}
      {% if block_settings.subheading != blank %}
        <p>{{ block_settings.subheading }}</p>
      {% endif %}
      {% if block_settings.button_label != blank %}
        <a href="{{ block_settings.button_url }}" class="button">{{ block_settings.button_label }}</a>
      {% endif %}
    </div>
  </div>
{%- endfor -%}
```

Related links:
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-deeply-nested-liquid-loops
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/move-operations-outside-loops
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-repetitive-filter-calls

---

#### Use echo for Concatenation (Instead of append/prepend)

**Why it matters:** "Each Liquid filter adds a small amount of processing overhead. For simple string concatenation, direct output avoids this overhead entirely and reduces server-side Liquid execution time" — server render time. Compounds in loops: "A product card snippet that uses `append` five times, rendered 50 times in a collection loop, means **250 filter calls** that could be zero."

**Do**
- Use direct `{{ }}` output / plain text interpolation for simple string concatenation.
- Use `assign` with `append`/`prepend` only when the result is needed as a variable for reuse in multiple places later — that's appropriate filter usage.

**Don't**
- Use `append`/`prepend` filters just to build a string for immediate one-time output.

```liquid
❌ Less Performant
{%- assign greeting = "Hello " | append: customer.first_name -%}
{{ greeting }}
```

```liquid
✅ More Performant
Hello {{ customer.first_name }}
```

```liquid
❌ CSS classes via append filters
{%- assign card_classes = "product-card" -%}
{%- if product.available == false -%}
  {%- assign card_classes = card_classes | append: " product-card--sold-out" -%}
{%- endif -%}
```

```liquid
✅ CSS classes via direct output
<div class="product-card
  {%- if product.available == false %} product-card--sold-out{% endif -%}
">
```

```liquid
❌ URL construction, less efficient
{%- assign product_url = shop.url | append: "/products/" | append: product.handle -%}
```

```liquid
✅ URL construction, more efficient
<a href="{{ shop.url }}/products/{{ product.handle }}">{{ product.title }}</a>
```

Related links:
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-deeply-nested-liquid-loops
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/move-operations-outside-loops

---

#### Limit Product Queries with Pagination (Fetch Only What You Render)

**Why it matters:** "Each product that a Liquid array loads carries database queries for variant data, images, pricing, and availability. Fetching 50 products to render 4 multiplies those queries, which increases **TTFB** and delays **FCP and LCP**."

**Core principle:** "Fetch only the items that you'll render. For `collection.products` and `collections`, a `for` loop's `limit` parameter is enough" — these arrays reduce their database fetch to match the `limit` value.

**Do**
- Use `limit:` on the `for` loop for `collection.products` and `collections`.
- Use `{% paginate %}` for arrays that ignore `limit` for their database query: `blog.articles`, `search.results`, `product.variants`, `customer.orders`.

**Don't**
- Use `{% paginate %}` to fix a one-off carousel or featured-products row: "A `{% paginate %}` block responds to the `page` URL parameter, so a section that's wrapped in one renders different items, or none at all, on `?page=2`."

```liquid
✅ For collection.products / collections: use limit
{%- comment -%} Fetches 4 products, not 50 {%- endcomment -%}
{% for product in collection.products limit: 4 %}
  {{ product.title }}
{% endfor %}
```

```liquid
❌ Don't use {% paginate %} for a fixed-size display (breaks on ?page=2)
```

```liquid
✅ For other arrays (blog.articles, search.results, product.variants, customer.orders): use paginate
{%- comment -%} Fetches 4 articles {%- endcomment -%}
{% paginate blog.articles by 4 %}
  {% for article in blog.articles limit: 4 %}
    {{ article.title }}
  {% endfor %}
{% endpaginate %}
```

**Recommended limits by section type**
- Featured products: 4–6
- Carousels (initial): 4–8
- Product recommendations: 2–4
- Grid sections: 8–12
- Paginated collections: 24–50

---

#### Liquid Performance Patterns (Overview / Roundup)

**Why it matters:** These are micro-optimizations for Liquid template rendering that collectively can save **25–50ms of TTFB** on complex themes. Individual patterns yield **1–5ms** gains each, but combined application produces noticeable improvements on complex themes with **50+ sections** and multiple blocks per section.

**Do**
- Loop optimizations: move redundant operations outside loops; minimize conditional checks within loops.
- Caching patterns: assign `block.settings` to variables rather than accessing repeatedly; cache results of repetitive filter calls.
- Data access: filter data in Liquid rather than making multiple database queries — "Liquid filtering runs in Rust and is very fast. Making multiple database calls to prefilter data is slower."
- Code structure: use `echo` tags or `{{ }}` output for faster string output than filter-based manipulation; avoid nested snippet renders, particularly in loops.
- Measure with the Theme Inspector Chrome extension and WebPageTest before and after optimization.

**Don't**
- Assume any single micro-optimization alone will be dramatic — treat these as cumulative, applied theme-wide.

---

### Quick checklist

- Render essential above-the-fold content in Liquid/HTML, not client-side JS.
- Never nest a `for` loop inside another `for` loop — use `where`/`first`, `map`+`contains`, or `join` instead.
- Move metafield reads (collection-, variant-, or metaobject-level) outside loops; resolve to a single variant first.
- Build option pickers from `product.options_with_values`, never by looping `product.variants`.
- Keep pagination depth at or below 25,000 objects; cap `{% paginate %}` at 250 items/page (1,000 for metaobjects); show 12–50 products/page.
- Replace every `include` with `render`; flatten/inline trivial snippets; never pass a comparison directly as a render argument.
- Pre-filter collections with `where`/`map`/`sort`/`compact`/`uniq` before the loop instead of `if` inside the loop.
- Hoist loop-invariant `assign`, `capture`, `image_url`, `asset_url`, `sort`, `where`, `money`, and `size` calls outside the loop.
- Cache repeated filter results (e.g., `image_url`) in a variable instead of recalculating.
- Assign `block.settings` (and `section.settings`) to a variable before referencing multiple properties, especially inside loops.
- Use direct `{{ }}` output/echo for string concatenation instead of `append`/`prepend`, unless the result is reused later as a variable.
- Use a loop's `limit:` for `collection.products`/`collections`; use `{% paginate %}` only for arrays that ignore `limit` (`blog.articles`, `search.results`, `product.variants`, `customer.orders`) and never for a one-off carousel/featured row.
- Measure everything with the Theme Inspector Chrome extension (flame graph / sandwich view) and Chrome DevTools Network panel (TTFB) before and after each change.


---

