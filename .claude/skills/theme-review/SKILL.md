---
name: theme-review
description: Code review of theme changes — correctness, hard rules, performance, best practices, responsive, editor/i18n (plus SEO and accessibility review when markup changed).
argument-hint: "[files | branch | PR number] (default: current uncommitted changes)"
disable-model-invocation: true
---
Review: **$ARGUMENTS** (empty = current `git diff` + untracked files)

1. Slug it; create `.claude/work/<slug>/`. Resolve the scope: a branch → `git diff <default-branch>...<branch>`; a PR number → `gh pr diff <n>` if gh exists; files → those files.
2. In parallel: agent `reviewer` (code + best practices) with the scope. If the scope touches storefront markup (sections, blocks, snippets, layout, templates) → also `seo-auditor` mode `review` and `a11y-auditor` mode `review`.
3. Reply: one verdict per reviewer, merged findings table (severity · area · file:line · fix), Critical/Major first. Offer `/fix` or `/ship fix <item>` for the top issue. Don't edit anything here.
