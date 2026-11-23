---
name: ship
description: Build a theme feature end to end — scout, plan, implement, review, fix loop, optional QA.
argument-hint: "<task description> [--no-qa]"
disable-model-invocation: true
---
Ship this theme task: **$ARGUMENTS**

You are the orchestrator. Keep your own context small: agents write to files, you read only their short replies and, when needed, the verdict lines of their files. Never paste file contents back into the conversation.

**0. Setup.** Make a short kebab-case slug from the task. Create `.claude/work/<slug>/`. If on the default git branch, create `theme/<slug>`. Create a task list: scout, plan, implement, review, fix, push + QA, summary. If `.claude/work/design-source.txt` names a theme (e.g. `live`), the merchant may restyle with Sidekick: first run `shopify theme pull --theme <that theme, or --live> --only DESIGN.md --only AGENTS.md` (asks permission) and show the user any diff before planning.

**1. Size it.** Trivial (one existing file, no new section/loop/JS, no shared file)? Then skip scout/plan: implement directly, then run step 4 (review) only if you touched Liquid logic or JS. Otherwise continue.

**2. Scout.** Agent `theme-scout` with the task + slug.

**3. Plan.** Agent `planner` with the task + slug. If the plan lists questions or SHARED files, ask the user **once** with AskUserQuestion, all questions batched. Append approved shared paths to `.claude/work/approved-shared.txt`. If the user is away, take the conservative option (don't touch the shared file; build locally) and note it.

**4. Implement.** Agent `implementer` with the slug.

**5. Review** (in parallel, fresh contexts; don't pass them your opinion of the code): agent `reviewer` (code + best practices). If the change renders storefront markup, also `a11y-auditor` mode `review` and `seo-auditor` mode `review`. Any FAIL = FAIL.

**6. Fix loop** (max 2 rounds). FAIL → `implementer` with "fix Critical + Major in .claude/work/<slug>/{review,a11y,seo}.md" → re-run only the reviewers that failed. A failing check or runtime error the implementer can't explain → `debugger` with the exact error. Still FAIL after 2 rounds → stop and report the open findings. Don't loop further.

**7. Push + measure** (default; skip only with `--no-qa` or when the change touched no storefront output, e.g. locale typo). Runs only after review PASS.
   a. **Target**: if `.claude/work/push-theme.txt` or `push-store.txt` is missing, run `shopify theme list` and ask the user once for a **development/unpublished** theme id (recommend an unpublished "QA" theme made by duplicating the live theme, so the live baseline is a fair comparison) and the `<shop>.myshopify.com` domain. User away → skip 7, report "not measured".
   b. **Push changed files only**: `node .claude/scripts/push-changed.mjs` (preview list) → `node .claude/scripts/push-changed.mjs --push` (asks permission). Never a plain `shopify theme push`.
   c. **Measure**: read `.claude/work/preview-url.txt`. Agent `qa-auditor` with: slug, preview URL, the **templates affected + sample paths** from plan.md, and baseline = the live storefront (same paths, no `preview_theme_id`).
   d. **Gate**: the change fails QA if it (1) breaches a theme-ledger budget, (2) moves any Core Web Vital from pass to fail vs baseline, or (3) regresses LCP > 200 ms, CLS > 0.02, or TBT > 50 ms vs baseline (median of 3), or (4) drops any Lighthouse category score vs baseline, or leaves one below the AGENTS.md constant (Performance ≥ 70 · Accessibility ≥ 95 · Best Practices ≥ 95 · SEO ≥ 95), or (5) has a responsive/a11y failure on its own section. Failures from apps/platform go in the summary as merchant escalations, not fixes.
   e. **Fail** → one fix round (`implementer` with qa.md, or `debugger` for a metric regression with no obvious cause) → `reviewer` → push → QA again. Still failing → stop and report. No further loops.

**8. Summary to user** (≤ 15 lines): what shipped · files touched · cost delta · review verdict · QA: metric table new vs baseline + preview link, or "not measured" and why · unverified items (editor re-render, Safari, real device, PSI field data) · deviations from Figma/plan · stale reference lines reported. Don't commit or push unless asked; suggest the commit message. The preview link is already on the dev theme for the user to click through (editor + real phone).
