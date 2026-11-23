---
name: fix
description: Debug and fix a theme bug or error with root-cause analysis, then independent review.
argument-hint: "<symptom, error text, or file:line> [--url <preview-url>]"
disable-model-invocation: true
---
Fix: **$ARGUMENTS**

1. Slug it; create `.claude/work/<slug>/`.
2. Agent `debugger` with the full symptom text, any error output the user pasted, and the URL if given.
3. If the fix touched more than one file, any JS, or shared snippets → agent `reviewer` on the diff (slug). A Critical/Major finding → one `debugger` round with review.md, then stop.
4. Reply ≤ 10 lines: root cause · fix · verification · what still needs a browser/editor check.
