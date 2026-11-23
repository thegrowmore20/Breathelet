---
paths:
  - "**/*.js"
  - "**/*.mjs"
---
# JavaScript

**Standards**
- Native first. No jQuery, Bootstrap JS, lodash, moment. Any library needs a written justification.
- Web Components (`customElements.define`, extend `HTMLElement`). Bind in `connectedCallback`, clean up every listener/observer in `disconnectedCallback` (one `AbortController` per component).
- ES modules, `const` > `let`, never `var`; `for...of`, not `forEach`; `#private` fields/methods; group by feature.
- Baseline-check APIs on MDN. Never `document.write`, sync XHR, mutation events, `escape()`, `unload`.
- Prefer `structuredClone`, `Array.at`, `?.`, `??` over polyfills.

**Execution cost**
- `defer`/module everywhere; `async` only for fully independent scripts.
- Split work > 50 ms; yield with `scheduler.yield()` (fallback `setTimeout(0)`).
- Delegate events at a container. Debounce/throttle scroll, resize, input, variant change.
- Read layout once, batch writes, `requestAnimationFrame` for visual updates. Never poll.

**Observers**
- `IntersectionObserver` > scroll listeners; `ResizeObserver` > resize listeners.
- `MutationObserver` only when no event exists: narrowest node, only the options needed, never `document.body` with `subtree + attributes`. Disconnect once satisfied; disconnect before writing, reconnect after; debounce bursts.

**Theme editor + Section Rendering**
- Re-init on `shopify:section:load` (and `shopify:block:select` where relevant); tear down on `shopify:section:unload`. Page-load JS does not re-run in the editor.
- Editor-only code behind `Shopify.designMode`.
- Scripts inside Section Rendering HTML don't execute after `innerHTML`/`replaceWith`: delegate from an ancestor that isn't replaced.
- Request only the sections whose DOM you replace (cart: canonical param). Max 5. Never header/footer on a cart update.
- `?sections=` returns `null` per missing section inside a 200; `?section_id=` returns 404. Handle both.
- Locale-aware URLs: `window.Shopify.routes.root`.

Deep patterns: `theme-reference` → javascript-perf, network-sections.
