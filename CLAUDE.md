@AGENTS.md

# Claude Code workflow for this theme
(`AGENTS.md` above holds the theme's rules and is shared with Sidekick and other agents. This file adds only what's specific to Claude Code.)

## Change cycle (every task, no exceptions)
1. **Analyze** — read the relevant files; flag cost (new JS/CSS/requests, LCP/CLS risk).
2. **Plan** — confirm scope (1–2 files → proceed; feature/multi-file → `/ship <task>`).
3. **Execute** — make the changes.
4. **Verify** — lint hook + Theme Check must pass. If a bug is found → **Fix → Verify** again.
5. **Push to GitHub** — `git add <files> && git commit && git push` (khawarcp/Canvas-Theme, branch `main`).
6. **Push to Shopify** — `shopify theme push --only <file1> --only <file2> …` (dev theme; blocked without `--only`).
7. Report: files touched · cost delta · checks run · what could not be verified.

## How work runs
- **Small edit** (1–2 existing files, no new section/JS/loop): follow the cycle above directly.
- **Feature, new section, cart/JS, multi-file**: `/ship <task>` (scout → plan → implement → review → fix → push changed files to the dev theme → mobile QA vs live). Bug: `/fix`. Upload: `/push` (changed files only via `--only`; plain `shopify theme push` is blocked in Bash and PowerShell).
- Reviews: `/theme-review` (code + best practices), `/seo-review`, `/a11y-audit --diff`. Audits: `/audit` (all 4 Lighthouse categories), `/seo-audit`, `/seo-suggest`, `/a11y-audit <url>`.
- **Design**: any visual/styling change → read `DESIGN.md` first. Grep its `##` headings and Read only the sections the task touches; never the whole file unless the task is a redesign. Colours: use only the approved pairs in DESIGN.md → Colors. Don't edit `DESIGN.md`/`AGENTS.md` unless asked; propose the change instead.
- Domain checklists in `.claude/rules/` auto-load for matching files (`css.md` has the breakpoint table). JS inside a `.liquid` file → Read `.claude/rules/javascript.md` first.
- Deep patterns + code: the `theme-reference` skill, one section at a time (`skeleton-reference.md` has the full Liquid filter/object/tag list).
- Shopify docs: the Shopify AI Toolkit (`claude plugin install shopify-ai-toolkit@claude-plugins-official`) or Dev MCP (`claude mcp add --transport stdio shopify-dev-mcp -- npx -y @shopify/dev-mcp@latest`) when installed; otherwise fetch `https://shopify.dev/docs/...` with `.md` appended.
- Hooks lint every edit and run Theme Check before you stop. Edits to `AGENTS.md`/`DESIGN.md`, layout, global CSS and shared snippets prompt for approval. `config/settings_data.json` is blocked.
- Windows: the Bash tool is Git Bash; prefer it for scripts and hooks (`node .claude/...`). Paths contain spaces (`Canvas Theme`): always quote them.
- Git: private repo `khawarcp/Canvas-Theme` (branch `main`). This repo authenticates through the GitHub CLI as khawarcp (local credential config); the machine's other GitHub login (thegrowmore20) is untouched. Push to GitHub automatically after every verified change (step 5 of the cycle above). `/ship` uses a `theme/<slug>` branch then merges to `main`.

## Finish every task with
Files touched · cost delta (JS/CSS KB, new requests) · checks run (Theme Check, lint, Lighthouse) · DESIGN.md sections followed and any deviations · **what you could not verify** (PSI on a live URL, editor re-render, Safari, real device) · stale rule/reference lines found.
