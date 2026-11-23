#!/usr/bin/env node
// Stop / SubagentStop: run Shopify Theme Check once, report only offenses in files edited this session.
// Errors block stopping (exit 2) so Claude fixes them. Gives up after 3 blocked attempts to avoid loops.
import { readFileSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const work = join(root, '.claude/work');
const editedFile = join(work, '.edited');
const attemptsFile = join(work, '.tc-attempts');

if (!existsSync(editedFile)) process.exit(0);
const edited = [...new Set(readFileSync(editedFile, 'utf8').split(/\r?\n/).filter(Boolean))]
  .filter((p) => /\.(liquid|json|js|css)$/.test(p) && !p.startsWith('.claude/'));
if (!edited.length) { rmSync(editedFile, { force: true }); process.exit(0); }

let raw = '';
try {
  raw = execSync('shopify theme check --path . --output json', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 150000, maxBuffer: 50 * 1024 * 1024 });
} catch (e) {
  if (e.code === 'ENOENT' || e.status === 127 || /not (found|recognized)/i.test(String(e.stderr || e.message))) {
    process.stderr.write('Theme Check skipped: Shopify CLI not installed (npm i -g @shopify/cli). Say so in your summary.\n');
    process.exit(0); // never block on a missing tool
  }
  raw = String(e.stdout || ''); // theme check exits non-zero when it finds offenses
}

const SEV = { 0: 'error', 1: 'warning', 2: 'info', error: 'error', warning: 'warning', suggestion: 'warning', info: 'info', style: 'info' };
let files = [];
try {
  const parsed = JSON.parse(raw.slice(raw.indexOf('[')));
  files = Array.isArray(parsed) ? parsed : parsed.files || [];
} catch {
  // Unparseable output: fall back to raw lines that mention an edited file.
  const hits = raw.split(/\r?\n/).filter((l) => edited.some((p) => l.includes(p))).slice(0, 30);
  if (!hits.length) { rmSync(editedFile, { force: true }); process.exit(0); }
  files = [{ path: '(raw)', offenses: hits.map((m) => ({ severity: 'error', message: m })) }];
}

const errs = []; const warns = [];
for (const f of files) {
  const p = String(f.path || f.uri || '').replace(/\\/g, '/');
  if (p !== '(raw)' && !edited.some((e) => p.endsWith(e))) continue;
  for (const o of f.offenses || []) {
    const sev = SEV[o.severity] ?? 'warning';
    const row = (o.start_row ?? o.start?.line ?? 0) + 1;
    const line = `${p.replace(root.replace(/\\/g, '/') + '/', '')}:${row} [${o.check || 'check'}] ${o.message}`;
    if (sev === 'error') errs.push(line); else if (sev === 'warning') warns.push(line);
  }
}

if (!errs.length) {
  rmSync(editedFile, { force: true }); rmSync(attemptsFile, { force: true });
  if (warns.length) process.stderr.write(`Theme Check: 0 errors, ${warns.length} warnings in edited files (non-blocking):\n${warns.slice(0, 15).join('\n')}\n`);
  process.exit(0);
}

const attempts = (existsSync(attemptsFile) ? Number(readFileSync(attemptsFile, 'utf8')) || 0 : 0) + 1;
if (attempts > 3) {
  writeFileSync(join(work, 'theme-check-unresolved.txt'), errs.join('\n') + '\n');
  rmSync(attemptsFile, { force: true });
  process.stderr.write(`Theme Check still failing after 3 attempts. Stopping; list these in your summary as unresolved (saved to .claude/work/theme-check-unresolved.txt):\n${errs.slice(0, 20).join('\n')}\n`);
  process.exit(0);
}
writeFileSync(attemptsFile, String(attempts));
process.stderr.write(`Theme Check: ${errs.length} error(s) in files you edited — fix before finishing (attempt ${attempts}/3):\n${errs.slice(0, 25).join('\n')}\n`);
process.exit(2);
