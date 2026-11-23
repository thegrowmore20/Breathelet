---
name: a11y-audit
description: Accessibility audit (WCAG 2.2 AA + Shopify Theme Store gate) of a page/template, or a11y review of current changes.
argument-hint: "<url | template> | --diff"
disable-model-invocation: true
---
Accessibility: **$ARGUMENTS**

1. Slug it; create `.claude/work/<slug>/`.
2. `--diff` (or no argument) → agent `a11y-auditor` mode `review` on the current changes. Otherwise → mode `audit` on the URL/template (build the URL from `.claude/work/preview-url.txt` if only a template is given; home, product, collection are the Theme Store set).
3. Reply: Lighthouse a11y score + axe counts per page, findings (severity · WCAG criterion · element/file · fix), and the manual checks (screen reader, 200% zoom, real device). No edits.
