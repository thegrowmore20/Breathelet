---
name: push
description: Push only the changed theme files to a development/unpublished theme with --only.
argument-hint: "[--theme <id|name>]"
disable-model-invocation: true
---
Push changed files only: **$ARGUMENTS**

1. If no target theme is given and `.claude/work/push-theme.txt` doesn't exist, run `shopify theme list` and ask the user which **development or unpublished** theme to use. Never the live theme.
2. Preview: `node .claude/scripts/push-changed.mjs $ARGUMENTS` (no upload). Show the user the file list.
3. If the list looks right (only files from this work; no `config/settings_data.json`), run it again with `--push` added. This step asks the user for permission.
4. Reply ≤ 6 lines: theme, files pushed, files deleted locally (not deleted on the theme), and the preview link if the CLI printed one.

Never run `shopify theme push` directly. It is blocked, because a plain push uploads the whole theme.
