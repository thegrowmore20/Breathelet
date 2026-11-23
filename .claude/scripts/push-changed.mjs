#!/usr/bin/env node
// Push ONLY changed theme files to a development/unpublished theme:
//   shopify theme push --theme <id> --nodelete --only <file> --only <file> ...
// Never pushes the whole theme, never deletes remote files, never targets the live theme.
//
// Changed = edited by Claude (.claude/work/.pending-push) + git working-tree changes,
//           minus files whose content is identical to what was last pushed (.claude/work/.pushed.json).
//
// Usage: node .claude/scripts/push-changed.mjs [--theme <id|name>] [--store <shop>.myshopify.com] [--push] [--files a b ...]
//   After a push, the preview URL is written to .claude/work/preview-url.txt (used by /ship QA).
//   Without --push it only previews (dry run). --push uploads (permission-prompted).
//   Theme falls back to .claude/work/push-theme.txt (per developer, gitignored).
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const work = join(root, '.claude/work');
mkdirSync(work, { recursive: true });
const args = process.argv.slice(2);
const fail = (msg) => { console.error(`push-changed: ${msg}`); process.exit(1); };

if (args.some((a) => /^(--live|--allow-live|-l|--publish|-p)$/.test(a))) fail('live/publish flags are not allowed. Push to a development or unpublished theme.');

const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const dryRun = !args.includes('--push');
const themeFile = join(work, 'push-theme.txt');
const theme = flag('--theme') || (existsSync(themeFile) ? readFileSync(themeFile, 'utf8').trim() : '');
if (!theme) fail('no target theme. Pass --theme <id|name> (it is saved to .claude/work/push-theme.txt for next time). Run `shopify theme list` to see ids.');
if (flag('--theme')) writeFileSync(themeFile, theme + '\n');
const storeFile = join(work, 'push-store.txt');
const store = (flag('--store') || (existsSync(storeFile) ? readFileSync(storeFile, 'utf8').trim() : '')).replace(/^https?:\/\//, '').replace(/\/.*$/, '');
if (flag('--store')) writeFileSync(storeFile, store + '\n');

if (existsSync(join(work, 'theme-check-unresolved.txt'))) fail('Theme Check has unresolved errors (.claude/work/theme-check-unresolved.txt). Fix them or delete that file after review.');

const THEME_DIRS = /^((assets|blocks|config|layout|locales|sections|snippets|templates)\/[^/].*|AGENTS\.md|DESIGN\.md)$/; // root context files need Shopify CLI >= 4.8.4
const NEVER = new Set(['config/settings_data.json']);

// 1. Candidates
let candidates = [];
const fi = args.indexOf('--files');
if (fi >= 0) {
  candidates = args.slice(fi + 1).filter((a) => !a.startsWith('--'));
} else {
  const pending = join(work, '.pending-push');
  if (existsSync(pending)) candidates.push(...readFileSync(pending, 'utf8').split(/\r?\n/));
  try {
    const st = execSync('git status --porcelain -uall', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    for (const line of st.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const path = line.slice(3).split(' -> ').pop().replace(/^"|"$/g, '');
      candidates.push(path);
    }
  } catch { /* not a git repo: rely on .pending-push */ }
}

// 2. Filter + diff against last push
const pushedFile = join(work, '.pushed.json');
const pushed = existsSync(pushedFile) ? JSON.parse(readFileSync(pushedFile, 'utf8')) : {};
const hash = (p) => createHash('sha1').update(readFileSync(join(root, p))).digest('hex');
const files = []; const deleted = []; const skipped = [];
for (const p of [...new Set(candidates.map((c) => c.trim().replace(/\\/g, '/')).filter(Boolean))].sort()) {
  if (!THEME_DIRS.test(p)) continue;
  if (NEVER.has(p)) { skipped.push(`${p} (merchant data, never pushed)`); continue; }
  if (!existsSync(join(root, p))) { deleted.push(p); continue; }
  if (pushed[p] && pushed[p] === hash(p)) continue; // unchanged since last push
  files.push(p);
}

if (deleted.length) console.log(`Deleted locally — NOT deleted on the theme (remove in admin if intended):\n  ${deleted.join('\n  ')}`);
if (skipped.length) console.log(`Skipped:\n  ${skipped.join('\n  ')}`);
if (!files.length) { console.log('Nothing to push: no theme files changed since the last push.'); process.exit(0); }

const cmd = ['theme', 'push', '--theme', theme, ...(store ? ['--store', store] : []), '--nodelete', ...files.flatMap((f) => ['--only', f])];
console.log(`Pushing ${files.length} file(s) to theme "${theme}":\n  ${files.join('\n  ')}`);
if (dryRun) { console.log(`\n[preview only — re-run with --push to upload]\nshopify ${cmd.map((c) => (/\s/.test(c) ? `"${c}"` : c)).join(' ')}`); process.exit(0); }

// 3. Push
const r = spawnSync('shopify', cmd, { cwd: root, stdio: ['inherit', 'pipe', 'pipe'], encoding: 'utf8', shell: process.platform === 'win32' });
const output = `${r.stdout || ''}${r.stderr || ''}`;
process.stdout.write(output);
if (r.error?.code === 'ENOENT') fail('Shopify CLI not found (npm i -g @shopify/cli).');
if (r.status !== 0) fail(`shopify theme push exited with ${r.status}. Nothing marked as pushed.`);

// 4. Record
for (const f of files) pushed[f] = hash(f);
writeFileSync(pushedFile, JSON.stringify(pushed, null, 2));
rmSync(join(work, '.pending-push'), { force: true });
writeFileSync(join(work, 'last-push.txt'), `${new Date().toISOString()} → ${theme}\n${files.join('\n')}\n`);
// Preview URL for QA: prefer the one the CLI prints, else build it from store + numeric theme id.
const printed = output.match(/https?:\/\/[^\s'"]*preview_theme_id=\d+/);
const preview = printed ? printed[0] : (store && /^\d+$/.test(theme) ? `https://${store}/?preview_theme_id=${theme}` : '');
if (preview) { writeFileSync(join(work, 'preview-url.txt'), preview + '\n'); console.log(`Preview: ${preview}`); }
else console.log('Preview URL unknown: pass --store <shop>.myshopify.com once (and a numeric --theme id) so QA can run.');
console.log('Done. Recorded in .claude/work/last-push.txt');
