---
name: audit
description: Full audit — Lighthouse Performance, Accessibility, Best Practices, SEO + budgets, responsive, cleanup — of a template, section or preview URL.
argument-hint: "<preview-url | template name | section file>"
disable-model-invocation: true
---
Audit: **$ARGUMENTS**

1. Slug it; create `.claude/work/<slug>/`.
2. In parallel: agent `qa-auditor` (all 4 Lighthouse categories + budgets + responsive), `a11y-auditor` mode `audit`, `seo-auditor` mode `audit`. URL → live run; file/template → static audit.
3. If the target is code (or the auditors name files), also run agent `reviewer` scoped to those files (code + best practices, no plan).
4. **Cleanup audit** (run at checkpoints: before launch, after app installs, before a major release; not every commit). Report, don't delete: unused CSS (DevTools Coverage), unused JS modules/dead handlers/orphaned web components, unused snippets/sections/settings/locale keys, leftover markup from uninstalled apps, `content_for_header` bloat, commented-out code.
5. Reply with a scorecard: Performance / Accessibility / Best Practices / SEO (score, target, pass), then CWV metrics · value · target · pass. Then budget ledgers, and the top 5 fixes ranked by metric impact ÷ effort, each with its file. Offer `/ship fix <item>` for the top one. Don't fix anything in this command.
