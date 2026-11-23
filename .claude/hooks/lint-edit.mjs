#!/usr/bin/env node
// PostToolUse (Edit|Write|MultiEdit): fast, deterministic hard-rule lint on the edited file.
// Findings go back to Claude via stderr + exit 2 (the edit already happened; this is feedback).
// Also records the path in .claude/work/.edited so the Stop hook can run Theme Check on just these files.
// Suppress a false positive by putting `lint-ignore` on that line.
import { readFileSync, existsSync, mkdirSync, appendFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep, extname } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }
const fp = input?.tool_input?.file_path;
if (!fp) process.exit(0);
const abs = resolve(root, fp);
const rel = relative(root, abs).split(sep).join('/');
if (rel.startsWith('.claude/') || rel.startsWith('node_modules/') || !existsSync(abs)) process.exit(0);

// Theme-root agent context files (Shopify syncs them with CLI >= 4.8.4): record for /push, enforce Shopify's limits.
if (/^(agents|design)\.md$/i.test(rel)) {
  const msgs = [];
  if (rel !== 'AGENTS.md' && rel !== 'DESIGN.md') msgs.push(`ERROR ${rel}: Shopify only saves the exact names AGENTS.md / DESIGN.md (case-sensitive).`);
  const size = statSync(abs).size;
  if (size > 50 * 1024) msgs.push(`ERROR ${rel}: ${Math.round(size / 1024)} KB — Shopify's limit is 50 KB. Trim it.`);
  try { mkdirSync(join(root, '.claude/work'), { recursive: true }); appendFileSync(join(root, '.claude/work/.pending-push'), rel + '\n'); } catch {}
  if (msgs.length) { process.stderr.write(msgs.join('\n') + '\n'); process.exit(2); }
  process.exit(0);
}
const ext = rel.endsWith('.css.liquid') ? '.css' : extname(rel);
if (!['.liquid', '.css', '.js', '.mjs', '.json'].includes(ext)) process.exit(0);

// Record for Theme Check at Stop.
try {
  mkdirSync(join(root, '.claude/work'), { recursive: true });
  appendFileSync(join(root, '.claude/work/.edited'), rel + '\n');
  appendFileSync(join(root, '.claude/work/.pending-push'), rel + '\n'); // for /push --only
} catch {}

if (ext === '.json') process.exit(0);

const src = readFileSync(abs, 'utf8');
const lines = src.split(/\r?\n/);
const findings = [];
const add = (i, level, msg) => { if (!/lint-ignore/.test(lines[i] ?? '')) findings.push(`${level} ${rel}:${i + 1} ${msg}`); };
const each = (re, level, msg, test = () => true) => lines.forEach((l, i) => { if (re.test(l) && test(l, i)) add(i, level, msg); });

// Ranges of {% stylesheet %} / {% javascript %} / <style> blocks inside .liquid
function blockLines(open, close) {
  const set = new Set(); let inside = false;
  lines.forEach((l, i) => { if (open.test(l)) inside = true; if (inside) set.add(i); if (close.test(l)) inside = false; });
  return set;
}
const cssLines = ext === '.css' ? new Set(lines.map((_, i) => i))
  : new Set([...blockLines(/{%-?\s*stylesheet\s*-?%}/, /{%-?\s*endstylesheet\s*-?%}/), ...blockLines(/{%-?\s*style\s*-?%}|<style\b/, /{%-?\s*endstyle\s*-?%}|<\/style>/)]);
const jsLines = ext === '.js' || ext === '.mjs' ? new Set(lines.map((_, i) => i))
  : new Set([...blockLines(/{%-?\s*javascript\s*-?%}/, /{%-?\s*endjavascript\s*-?%}/), ...blockLines(/<script\b(?![^>]*application\/(ld\+)?json)/, /<\/script>/)]);
const tagBlock = ext === '.liquid' ? new Set([...blockLines(/{%-?\s*stylesheet\s*-?%}/, /{%-?\s*endstylesheet\s*-?%}/), ...blockLines(/{%-?\s*javascript\s*-?%}/, /{%-?\s*endjavascript\s*-?%}/)]) : new Set();

if (ext === '.liquid') {
  each(/{%-?\s*include\s/, 'ERROR', 'Hard rule 4: `{% include %}` is banned; use `{% render %}`.');
  each(/\|\s*(img_url|img_tag|product_img_url|collection_img_url|article_img_url)\b/, 'ERROR', 'Deprecated image filter; use `image_url` + `image_tag`.');
  each(/section\.index\s*(==|<=|<)\s*\d/, 'ERROR', '`section.index` is nil in the editor/static sections; test positively: `unless section.index > N`.');
  each(/for\s+\w+\s+in\s+(collections\.all\.products|all_products)\b/, 'ERROR', 'Never loop all products.');
  each(/fetchpriority/, 'ERROR', '`fetchpriority: high` combined with lazy loading.', (l) => /loading:\s*['"]lazy|loading="lazy"/.test(l));
  if (/^(sections|blocks|snippets)\//.test(rel)) {
    each(/<link[^>]+rel=["']stylesheet|\|\s*stylesheet_tag/, 'ERROR', 'No stylesheet <link>/stylesheet_tag inside a section/block/snippet (render-blocking). Use `{% stylesheet %}`.');
  }
  each(/href=["']#["']/, 'ERROR', '`href="#"` — use a real href, or a <button type="button"> for actions.');
  each(/<(div|span)[^>]*\sonclick=/, 'ERROR', 'Clickable div/span; use <button> or <a href>.');
  each(/<button(?![^>]*\stype=)[^>]*>/, 'WARN', '<button> without explicit `type`.');
  each(/<script\b(?=[^>]*\ssrc=)(?![^>]*\b(defer|async|type=["']module))[^>]*>/, 'ERROR', 'Parser-blocking <script src>; add `defer` or `type="module"`.');
  each(/<meta[^>]+name=["']viewport["'][^>]*(maximum-scale|user-scalable\s*=\s*(no|0))/i, 'ERROR', 'Viewport blocks zoom (maximum-scale/user-scalable=no); use width=device-width, initial-scale=1.');
  each(/target=["']_blank["']/, 'WARN', '`target="_blank"` needs `rel="noopener noreferrer"`.', (l) => !/noopener/.test(l));
  // SEO + accessibility
  const h1 = lines.map((l, i) => (/<h1\b/i.test(l) ? i : -1)).filter((i) => i >= 0);
  if (h1.length > 1) add(h1[1], 'WARN', `${h1.length} <h1> in one file; one h1 per page. Use a heading-level setting for section headings.`);
  each(/\|\s*within:\s*collection/, 'WARN', 'SEO: `within: collection` creates duplicate product URLs; link with `product.url`.');
  each(/<meta[^>]+name=["']robots["'][^>]*noindex/i, 'WARN', 'SEO: hardcoded noindex — make sure this is intentional and conditional.');
  each(/<img\b(?![^>]*\balt=)[^>]*>/i, 'ERROR', 'a11y/SEO: <img> without alt (use alt="" only if decorative).');
  each(/tabindex=["']?[1-9]/, 'ERROR', 'a11y: positive tabindex breaks focus order.');
  each(/<(div|span)[^>]*role=["']button["']/, 'WARN', 'a11y: role="button" on div/span; use <button type="button">.');
  each(/<video\b(?=[^>]*\bautoplay)(?![^>]*\bmuted)[^>]*>/, 'ERROR', 'a11y: autoplay video must be muted (and have controls/pause).');
  each(/(src|href)=["']http:\/\//, 'ERROR', 'Best practices: http:// URL (mixed content); use https or Shopify CDN filters.');
  lines.forEach((l, i) => { if (tagBlock.has(i) && /{{|{%(?!-?\s*(end)?(stylesheet|javascript))/.test(l)) add(i, 'ERROR', 'Liquid inside {% stylesheet %}/{% javascript %} is a syntax error. Use a CSS variable or data attribute.'); });
}

lines.forEach((l, i) => {
  if (!cssLines.has(i)) return;
  if (/outline\s*:\s*(none|0)\b/.test(l) && !/focus-visible|box-shadow/.test(l)) add(i, 'WARN', 'a11y: outline removed; provide a visible :focus-visible style.');
  if (/!important/.test(l)) add(i, 'ERROR', 'No `!important`; win by cascade order or `:where()`.');
  if (/@import\b/.test(l)) add(i, 'ERROR', '`@import` serialises requests.');
  if (/transition(-property)?\s*:[^;]*\b(max-height|height|width|top|left|right|bottom|margin[\w-]*|padding[\w-]*)\b/.test(l)) add(i, 'ERROR', 'Layout-property transition. Use transform/opacity (or the disclosure `grid-template-rows` exception).');
  if (/(^|[\s:,(])#[0-9a-fA-F]{3,8}\b/.test(l) && !/^\s*(\/\*|\*)/.test(l)) add(i, 'WARN', 'Hardcoded colour; use a theme colour token (CSS custom property).');
  if (/(^|[^\w-])100vh\b/.test(l) && !/[sd]vh/.test(l) && !/[sd]vh/.test(lines[i + 1] ?? '')) add(i, 'WARN', 'Bare 100vh breaks on mobile toolbars; add a 100svh/100dvh line after it.');
  if (/font-size\s*:[^;]*\d+(\.\d+)?vw(?![^;]*clamp)/.test(l) && !/clamp\(/.test(l)) add(i, 'WARN', 'Bare `vw` font-size breaks zoom; use clamp() with a rem floor.');
});

lines.forEach((l, i) => {
  if (!jsLines.has(i)) return;
  if (/(^|[^\w.])var\s+\w/.test(l)) add(i, 'ERROR', '`var` — use const/let.');
  if (/\.forEach\(/.test(l)) add(i, 'WARN', 'Use `for...of` instead of `forEach`.');
  if (/document\.write\(|new XMLHttpRequest|addEventListener\(\s*['"]unload['"]|\bescape\(/.test(l)) add(i, 'ERROR', 'Deprecated API.');
  if (/\bjQuery\b|\$\(\s*['"document]/.test(l)) add(i, 'ERROR', 'No jQuery; use native DOM APIs.');
  if (/console\.(log|debug|table)\(/.test(l)) add(i, 'WARN', 'Best practices: remove console logging.');
  if (/\beval\(|new Function\(/.test(l)) add(i, 'ERROR', 'Best practices/security: no eval/new Function.');
  if (/(^|[^.\w])(window\.)?(alert|confirm|prompt)\(/.test(l)) add(i, 'WARN', 'Best practices: no alert/confirm/prompt dialogs; use an accessible inline message or <dialog>.');
  if (/geolocation\.getCurrentPosition|Notification\.requestPermission/.test(l)) add(i, 'WARN', 'Best practices: never request permissions on load; only after a user action.');
  if (/setInterval\(/.test(l)) add(i, 'WARN', 'Polling — use events or observers.');
  if (/\.observe\(\s*document\.body/.test(l)) add(i, 'WARN', 'MutationObserver on document.body; scope to the narrowest node.');
  if (/addEventListener\(\s*['"](scroll|resize|mousemove|input)['"]/.test(l) && !/passive|debounce|throttle/.test(l)) add(i, 'WARN', 'High-frequency handler: debounce/throttle (and `{ passive: true }` for scroll). Prefer Intersection/ResizeObserver.');
});

// Breakpoints: only the canonical values (CSS @media, JS matchMedia, image `sizes`). See rules/css.md.
const BP_MIN = new Set([360, 480, 576, 768, 992, 1200, 1440]);
const BP_MAX = new Set([359, 479, 575, 767, 991, 1199, 1439]);
lines.forEach((l, i) => {
  if (!/@media|matchMedia|sizes\s*[:=]|<source[^>]*media=/.test(l)) return;
  for (const m of l.matchAll(/\((min|max)-width\s*:\s*([\d.]+)(px|em|rem)\)/g)) {
    const px = m[3] === 'px' ? Number(m[2]) : Math.round(Number(m[2]) * 16);
    const ok = (m[1] === 'min' ? BP_MIN : BP_MAX).has(px);
    if (!ok) {
      const hint = m[1] === 'min' && BP_MAX.has(px) ? ` (${px} is a max-width value; min-width pair is ${px + 1}px)`
        : m[1] === 'max' && BP_MIN.has(px) ? ` (${px} is a min-width value; max-width pair is ${px - 1}px — overlaps otherwise)` : '';
      add(i, 'WARN', `Non-canonical breakpoint ${m[1]}-width: ${m[2]}${m[3]}${hint}. Allowed min ${[...BP_MIN].join('/')}, max ${[...BP_MAX].join('/')}.`);
    }
  }
});

if (!findings.length) process.exit(0);
const errors = findings.filter((f) => f.startsWith('ERROR')).length;
process.stderr.write(`Theme lint (${errors} error, ${findings.length - errors} warn) — fix errors now; fix warnings unless intentional (then add lint-ignore):\n` + findings.slice(0, 25).join('\n') + (findings.length > 25 ? `\n…${findings.length - 25} more` : '') + '\n');
process.exit(2);
