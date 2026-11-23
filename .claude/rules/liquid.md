---
paths:
  - "**/*.liquid"
---
# Liquid

**Performance**
- Never loop `collections.all.products` / `all_products`.
- Resource loop (products, collections, variants, metaobjects, blogs, articles) inside another resource loop: banned. An inner loop over a materialised array (`block.settings`, a `split`, `product.images | limit:`) is fine within the loop ceiling.
- Cap every loop with `limit:`; paginate 24–36.
- Output only the fields you render; never full product JSON per card.
- Metafields by exact key, never iterate the set. Hoist anything constant into an `assign` above the loop. Per-item lookups: ≤ 3 keys/item, ≤ 24 items; past that, use schema, one metaobject fetch, or pagination.
- `assign` repeated filter chains and `block.settings`/`section.settings` used twice or more.
- Render variant data, prices, badges and conditionals in Liquid, not JS. TTFB > 600 ms → profile the template.

**Structure (OS 2.0)**
- JSON templates, section groups, theme blocks, app blocks.
- Schema: few settings, clear labels, ordered by visual position, grouped under headers, `visible_if` ≤ 2 levels deep.
- Schema text in `locales/*.schema.json`; storefront text in `locales/*.json` via `t`, sentence case.
- Delete unused snippets, sections, settings, locale keys.

**Correctness**
- `{% render %}` only. Nesting: 2 levels. A 3rd only for a leaf presentational snippet (no loop, no object lookups) not inside a loop > 24 iterations. Never 4.
- Render arguments can't contain comparisons: assign first, then pass the variable.
- Verify every tag, filter, object and property exists and is in scope for the template (`theme-reference` → liquid-api) before using it. Confirm metafield namespace/key/type; guard optional values with `| default:`.
- Deprecated, never use: `img_url`, `img_tag`, `product_img_url`, `collection_img_url`, `article_img_url`.
- URLs from `routes`. Multiline logic in `{% liquid %}`.
- Every snippet and every static block (`{% content_for 'block', type:, id: %}`) has `{% doc %}` with `@param` + `@example`.
- Every block wrapper outputs `{{ block.shopify_attributes }}`; sections output `{{ section.shopify_attributes }}`.
- `section.index` is nil in the editor, static sections and Section Rendering responses: test positively (`unless section.index > N`).
- No Liquid inside `{% stylesheet %}` / `{% javascript %}`; at most one of each per file.
- Editor-only output behind `{% if request.design_mode %}`.
