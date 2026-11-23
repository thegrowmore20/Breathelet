---
name: theme-reference
description: Deep Shopify Liquid theme reference with code — LCP/images, Liquid TTFB, Liquid API (verify tags/filters/objects), JS/INP, CSS/fonts/CLS, Section Rendering + cart drawer spec, mobile, a11y/Theme Store, measurement, theme architecture/editor. Use when building from scratch, debugging a metric, verifying Liquid syntax, or stuck on a pattern.
---

# Theme reference: read one section, not a whole file

Files are 20–50 KB each (5–13k tokens). Never Read one whole.

1. Pick the file from the table.
2. `grep -n '^#\{2,4\} ' ${CLAUDE_SKILL_DIR}/<file>` to list headings.
3. Read only the section you need (`offset` = heading line, `limit` ≈ distance to the next heading).
4. Each file ends with a `Quick checklist`; for a review, read only that.

| Need | File |
|---|---|
| LCP element, fetchpriority, srcset/sizes, `<picture>`, preload, popups vs LCP | `images-lcp.md` |
| Loops, metafields, pagination, variant over-fetch, render vs include, TTFB | `liquid-performance.md` |
| Does this tag / filter / object / property exist? Deprecated list | `liquid-api.md` |
| Web components, import maps, interaction loading, third-party scripts, long tasks, observers | `javascript-perf.md` |
| Critical CSS, stylesheet count, fonts + metric overrides, CLS, animation | `css-fonts.md` |
| Preload/preconnect, CDN, proxies, `section.index`, Section Rendering API, **cart drawer spec** | `network-sections.md` |
| Throttled testing, interstitials, tap targets, overflow, content parity | `mobile.md` |
| Landmarks, focus, dialogs, keyboard, live regions, theme events, **Theme Store gate** | `accessibility.md` |
| CWV lab vs field, Theme Check, Lighthouse CI, worst JS offenders, fake perf apps | `measurement.md` |
| `theme.liquid` head order, **Definition of Done (§7)**, schema, `{% doc %}`, blocks, editor, limits | `theme-architecture.md` |
| Skeleton theme's original guide: full filter/object/tag signatures, schema good practices, translation + locale-key standards, snippet/block/section examples | `skeleton-reference.md` |

Examples are illustrative. AGENTS.md constants and `.claude/rules/` win on any conflict; report the stale line in your summary.
