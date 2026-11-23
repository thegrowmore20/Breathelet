---
name: seo-review
description: SEO review of the current theme changes (or given files) before merge.
argument-hint: "[files | branch] (default: current uncommitted changes)"
disable-model-invocation: true
---
SEO review: **$ARGUMENTS** (empty = current `git diff` + untracked files)

1. Slug it; create `.claude/work/<slug>/`.
2. Agent `seo-auditor`, mode `review`, with the scope.
3. Reply: verdict, findings (severity · file:line · fix). Show merchant-content items separately from code fixes. No edits.
