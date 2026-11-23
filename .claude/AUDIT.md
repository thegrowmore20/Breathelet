# Audit of the previous guideline system (Oct 2026)

## Good
- A canonical constants table with single ownership. The precedence rule is correct.
- The hard rules are specific and measurable. Two-ledger budgets (theme vs platform/apps) are a strong idea.
- The change authority model ("the task is the authorisation") prevents permission ping-pong.
- The references are deep and sourced from shopify.dev.

## Weak → fixed
| Issue | Impact | Fix |
|---|---|---|
| Rules used `description:` frontmatter. Claude Code reads only `paths:` and silently strips the rest | All 8 rules (~7k tokens) loaded every session; the "Read ONLY when…" routing never worked | `paths:`-scoped rules, now 5 files (~3.2k tokens total, loaded only for matching files) |
| CLAUDE.md held a routing table + restated rules | ~3k tokens always on, duplicated in the rules | Lean CLAUDE.md; routing is automatic |
| Reference examples contradicted the constants (`section.index == 1`, srcset `400,600,800,1000`, 750/990px, `var`/`forEach`, `max-height` transition, `<link rel=stylesheet>` in a section) | Agents copy examples → violations | Worst examples rewritten; banner on every file; lint hook catches the rest |
| Hydrogen content in measurement/liquid-performance | Off-scope (Liquid only) | Removed |
| "Run Theme Check before every commit" had no mechanism | Never actually ran | Stop hook runs it on edited files and blocks "done" on errors |
| Inconsistent test widths (6 vs 4) and tablet padding range 640–1199 (not a breakpoint) | Ambiguous | Constants own the widths; padding aligned to 640–1279 |
| "Touch targets on any screen that could be touch" vs a mobile-only reading | Ambiguous | One constant |

## Missing → added
- Protection for `config/settings_data.json` (merchant data) and for live-theme push/publish/delete.
- A deterministic shared-file guard that counts how many files `render` a snippet.
- Planner, implementer, reviewer, debugger, scout and QA agents, plus `/ship` `/fix` `/audit`.
- Definition of Done wired into the reviewer (it was buried in theme-architecture §7).
- An "unverified" line in every summary (PSI, editor re-render, Safari, device).
- A rule for when Figma conflicts with contrast or a hard rule.
- `.theme-check.yml` aligned with the budgets (pagination ≤ 36, asset size warnings).
- An honest-persuasion rule: no fake countdowns, stock or reviews (legal/brand-safe).

## Intentional changes (review these)
- Tablet padding 75% now covers 576–1199 (aligned to the canonical breakpoints in `rules/css.md`; earlier drafts said 640–1279).
- LCP preload: `image_tag: preload: true` (Early Hints) or `<link rel=preload imagesrcset>`, one not both.
- Exclusive accordion via `<details name>` (native, no JS) instead of a JS close-others.
- Pre-build/CRO checklist moved into the planner agent; the cleanup checklist moved into `/audit`.

## Still yours to decide
- ~~Brand defaults in css.md~~ → done (Nov 2026): brand values now live in `DESIGN.md` → Colors (Mama Organic palette) and must reach code only via `settings_schema.json` defaults.
- `SHARED_EXACT` in `guard-edit.mjs` needs the theme's real global file names.
- Lighthouse `transferSize` approximates DevTools "Size". Near a cap, confirm manually.

## Update — Shopify agentic workflows (Oct 2026)
- Theme rules moved to `AGENTS.md` at the theme root (Shopify's standard). Sidekick and other agents now follow the same performance/accessibility rules; `CLAUDE.md` imports it (`@AGENTS.md`, never loaded twice) and holds only Claude Code workflow.
- `DESIGN.md` added as the design contract (Shopify's recommended topics). Not auto-loaded: planner quotes the relevant sections into the plan, implementer reads those, reviewer checks conformance, a11y-auditor checks its colour pairs.
- Guardrails: exact casing + 50 KB limit enforced by lint; edits ask first; `/push` includes them (CLI ≥ 4.8.4); optional Sidekick pull before `/ship`.
