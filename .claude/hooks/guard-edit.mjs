#!/usr/bin/env node
// PreToolUse (Edit|Write|MultiEdit): enforce Change Authority deterministically.
//   deny  -> config/settings_data.json (merchant data, overwritten by the editor)
//   ask   -> shared files (layout, settings_schema, global CSS/tokens, snippets rendered by 2+ files)
//            unless listed in .claude/work/approved-shared.txt (one path per line, written after the user approves)
//   --work-only -> read-only agents (scout, planner, reviewer, qa) may only write inside .claude/work/
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const workOnly = process.argv.includes('--work-only');

// Edit these to match the theme's real global files.
const SHARED_EXACT = ['AGENTS.md', 'DESIGN.md', 'config/settings_schema.json', 'assets/base.css', 'assets/critical.css', 'snippets/css-variables.liquid', 'snippets/theme-tokens.liquid'];
const SHARED_PREFIX = ['layout/'];

function out(decision, reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason },
  }));
  process.exit(0);
}

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const fp = input?.tool_input?.file_path;
if (!fp) process.exit(0);

const rel = relative(root, resolve(root, fp)).split(sep).join('/');

if (workOnly) {
  if (rel.startsWith('.claude/work/')) process.exit(0);
  out('deny', `This agent is read-only. Write findings to .claude/work/<slug>/ only (tried: ${rel}).`);
}

if (rel === 'config/settings_data.json') {
  out('deny', 'config/settings_data.json holds merchant data and is overwritten by the theme editor. Change defaults in settings_schema.json or section schema instead.');
}

const approvedFile = join(root, '.claude/work/approved-shared.txt');
const approved = existsSync(approvedFile)
  ? readFileSync(approvedFile, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  : [];
if (approved.includes(rel)) process.exit(0);

let sharedReason = '';
if (SHARED_EXACT.includes(rel) || SHARED_PREFIX.some((p) => rel.startsWith(p))) {
  sharedReason = `${rel} is a shared/global file (Change Authority: ask first).`;
} else if (rel.startsWith('snippets/') && rel.endsWith('.liquid') && existsSync(join(root, rel))) {
  const name = rel.slice('snippets/'.length, -'.liquid'.length);
  const re = new RegExp(`render\\s+['"]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
  const users = new Set();
  for (const dir of ['sections', 'blocks', 'snippets', 'layout', 'templates']) {
    const d = join(root, dir);
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (!f.endsWith('.liquid') || !statSync(p).isFile()) continue;
      if (re.test(readFileSync(p, 'utf8'))) users.add(`${dir}/${f}`);
      if (users.size >= 2) break;
    }
    if (users.size >= 2) break;
  }
  if (users.size >= 2) sharedReason = `${rel} is rendered by 2+ files (${[...users].join(', ')}). Editing it affects all of them.`;
}

if (sharedReason) out('allow', `${sharedReason} Approve, or add the path to .claude/work/approved-shared.txt to pre-approve.`);
process.exit(0);
