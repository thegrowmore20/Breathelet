---
name: seo-audit
description: Full technical SEO audit of a template or page — theme code, live HTML, structured data, Lighthouse SEO, robots/sitemap.
argument-hint: "<url | template (product, collection, index, article, page)>"
disable-model-invocation: true
---
SEO audit: **$ARGUMENTS**

1. Slug it; create `.claude/work/<slug>/`. A template name with no URL → use `.claude/work/preview-url.txt` or `push-store.txt` to build one (product/collection: take a real handle from `/products.json?limit=1` / `/collections.json?limit=1`); none available → code-only audit, say so.
2. Agent `seo-auditor`, mode `audit`. Run it per template if several are given (home, product, collection, article are the high-value set).
3. Reply: Lighthouse SEO score per page, table of findings (severity · issue · owner theme/merchant/app · fix), the manual checks list (Rich Results Test, Search Console). Offer `/seo-suggest` for a prioritised plan and `/ship` for the top theme fix.
