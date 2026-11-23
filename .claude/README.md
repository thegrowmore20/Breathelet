# GrowMore theme agent kit — how it works

Not loaded by Claude. This is for the humans on the team.

## Install
1. Copy `AGENTS.md`, `DESIGN.md`, `CLAUDE.md`, `.theme-check.yml`, `.shopifyignore` and `.claude/` into the theme repo root (replace the old `.claude/rules` and `.claude/reference`).
   - `AGENTS.md` = the theme's rules for **every** agent (Claude Code, Shopify Sidekick, others). `CLAUDE.md` imports it and adds Claude-only workflow.
   - `DESIGN.md` = your design contract. **Fill in the TODOs before the first `/ship`.** Agents read only the sections a task touches.
   - Shopify CLI **4.8.4+** is required to push/pull `AGENTS.md`/`DESIGN.md` (and the GitHub integration syncs them).
2. Requirements: Node 18+, Shopify CLI 4.8.4+ (`npm i -g @shopify/cli`). For screenshots + Safari checks: `npm i -D playwright @axe-core/playwright && npx playwright install chromium webkit`.
   First `/ship` asks once for the QA theme id (in admin: duplicate the live theme, rename it "QA"; re-duplicate after each release so the before/after comparison stays fair) and the `<shop>.myshopify.com` domain; both are remembered per developer in `.claude/work/`.
3. Keep `.shopifyignore` (stops `shopify theme push` from overwriting merchant settings in `config/settings_data.json`). If the theme repo has its own, merge the line into it.
4. Run `shopify theme check` once to confirm `.theme-check.yml` is accepted.
5. In `.claude/hooks/guard-edit.mjs`, set `SHARED_EXACT` to this theme's real global files (critical CSS, tokens snippet).
6. In Claude Code, run `/context`: you should see `CLAUDE.md` with `AGENTS.md` imported (not DESIGN.md: it loads on demand). `/agents` shows the 8 agents.
7. If merchants restyle with Sidekick (Canvas), Sidekick may edit `DESIGN.md` on the store. Create `.claude/work/design-source.txt` containing `live` (or a theme id) and `/ship` will pull the latest `DESIGN.md`/`AGENTS.md` before planning.

## Use
| You want | Type |
|---|---|
| Small tweak | Just ask |
| New section / feature / cart work | `/ship build a FAQ section with schema blocks`: plans, builds, reviews, pushes only the changed files to your dev theme, then runs mobile Lighthouse vs live and fails the change if it slows pages. `--no-qa` to skip |
| Something broken | `/fix Liquid error in sections/hero.liquid line 40` |
| Upload changes to a dev theme | `/push --theme 123456789` (first time; remembered after). Only changed files go up, via `--only`, with `--nodelete` |
| Code review of changes / a branch / a PR | `/theme-review` · `/theme-review feature/faq` · `/theme-review 42` |
| SEO review of changes | `/seo-review` |
| SEO audit of a page | `/seo-audit product` or `/seo-audit <url>` |
| SEO opportunities, ranked | `/seo-suggest <url> rich results` |
| Accessibility audit / review | `/a11y-audit <url>` · `/a11y-audit --diff` |
| Full scorecard: Performance, Accessibility, Best Practices, SEO + cleanup | `/audit https://<store>.myshopify.com/?preview_theme_id=123` |

## What loads when (token cost)
| Layer | Loads | ≈ tokens |
|---|---|---|
| `CLAUDE.md` + imported `AGENTS.md` + agent/skill descriptions | every session | ~3.1k |
| `DESIGN.md` | only the sections a visual task touches | depends on how much you write; aim < 15 KB total |
| `rules/liquid, markup, css, images` | when a `.liquid` file is opened | ~2.7k |
| `rules/javascript` (+ markup) | when a `.js` file is opened | ~1k |
| all 10 slash commands | only when you type them | ~0.5k |
| `theme-reference` files | one section at a time, on demand | 0.5–2k per section |
| Agents | own context window; only a ≤ 15-line summary returns | — |

## Agents
- **theme-scout** (Haiku): maps existing sections, tokens and shared snippets so the planner doesn't guess.
- **planner**: conversion goal, LCP/CLS plan, cost delta, files + change authority, steps, acceptance checks.
- **implementer**: follows the plan, gets through lint and Theme Check before it returns.
- **reviewer**: fresh-context adversarial review against the plan, hard rules and Definition of Done. Never edits.
- **debugger**: root cause → smallest fix → verify.
- **qa-auditor** (Sonnet): Lighthouse mobile (all 4 categories), budget ledgers, DOM, responsive screenshots.
- **seo-auditor** (Sonnet): head tags, canonical, h1/headings, JSON-LD, OG, crawlable links/pagination, robots/sitemap, Lighthouse SEO; review / audit / suggest modes.
- **a11y-auditor** (Sonnet): WCAG 2.2 AA + Theme Store gate, axe, keyboard walk-through, Lighthouse accessibility.

Agents pass work through `.claude/work/<slug>/` files (gitignored) instead of the chat, which keeps the main conversation small.

## Guardrails (deterministic, not "please remember")
- `config/settings_data.json`: edits denied.
- `shopify theme publish/delete`, push `--live`/`--allow-live`, `git push --force`, `git reset --hard`: denied.
- A plain `shopify theme push` is denied because it uploads the whole theme. Use `/push`: it finds the changed files (Claude's edits + `git status`, minus files identical to the last push), skips `settings_data.json`, refuses live/publish, never deletes remote files, and asks before running.
- `git commit/push`: asks you first.
- `AGENTS.md` / `DESIGN.md` edits: asks first (team- and merchant-owned). Lint enforces the exact names and Shopify's 50 KB limit.
- Shared files (layout, settings_schema, global CSS, snippets rendered by 2+ files): asks first, unless listed in `.claude/work/approved-shared.txt`.
- Every edit: lint for hard-rule violations (include, deprecated filters, `section.index == 1`, lazy + fetchpriority, blocking scripts, stylesheet tags in sections, Liquid in `{% stylesheet %}`, `!important`, layout transitions, `var`, jQuery…). Add `lint-ignore` to a line for a deliberate exception.
- Before finishing: Theme Check on the edited files. Errors block "done" (up to 3 attempts, then reported as unresolved).
