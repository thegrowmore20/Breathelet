---
name: seo-suggest
description: Prioritised SEO opportunities for a store/template — theme fixes, structured data, internal linking, merchant content — ranked by impact ÷ effort.
argument-hint: "<url | template> [focus: rich results | collections | blog | international]"
disable-model-invocation: true
---
SEO suggestions: **$ARGUMENTS**

1. Slug it; reuse `.claude/work/*/seo.md` from a recent `/seo-audit` of the same target if it exists; otherwise run agent `seo-auditor` mode `audit` first.
2. Agent `seo-auditor`, mode `suggest`, with the audit file and any focus given.
3. Reply with the top 10 as a table: rank · opportunity · expected effect (CTR, rich results, crawl/index, rankings) · effort S/M/L · owner (theme | merchant | app). Theme items first when impact is equal. No invented traffic numbers: give the mechanism, not a guess. Offer `/ship` for the top theme item.
