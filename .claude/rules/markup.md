---
paths:
  - "**/*.liquid"
  - "assets/**/*.js"
---
# Markup, accessibility, components

**HTML**
- Landmarks: `header`, `nav`, `main`, `footer`; `article`/`section` with headings. One `h1` per page; never skip levels.
- IDs in CamelCase, suffixed with the section/block id (`id="FaqPanel-{{ block.id }}"`).
- `<a href>` navigates, `<button type="button">` acts. Every `<button>` has an explicit `type`. No clickable divs, no `href="#"`. `target="_blank"` gets `rel="noopener noreferrer"`.
- Icon-only controls get `aria-label`. Inputs get `<label for>`, correct `type`, `autocomplete`. Errors linked with `aria-describedby`.
- Skip link + visible `:focus-visible`. `tabindex="0"` only when unavoidable, never positive.
- `<html lang="{{ request.locale.iso_code }}">`. Logical properties for RTL.
- Dynamic updates (cart count, search results, form errors, stock) announced in an `aria-live` region.
- `min-height` reserved for anything populated after paint.
- JSON-LD for Product, Offer, BreadcrumbList, Organization; must match visible content.
- Nav and add-to-cart work without JS (forms post).

**Components**
- Accordion: `<details>/<summary>` first (zero JS). One panel open at a time via a shared `<details name="…">` (native exclusive accordion, still no JS). Custom toggles: `aria-expanded` + `aria-controls`.
- Dialog/drawer: native `<dialog>` where possible, else `role="dialog"` + `aria-modal="true"`. Focus moves in on open, returns to trigger on close, trapped while open; Escape and backdrop close; background `inert` or scroll-locked.
- Tabs: `tablist`/`tab`/`tabpanel`, `aria-selected`, inactive panels `hidden`, roving tabindex, Left/Right/Home/End.
- Carousels/video: visible pause control; no autoplay with sound.
- Drawers, modals, search, size guides, quick-view, video: initialise on first interaction (biggest INP/TBT offenders).
- Open/close with `transform`. Disclosure height animation: follow the exception in `rules/css.md` exactly.

Deep patterns: `theme-reference` → accessibility (focus, dialogs, live regions, Theme Store gate), network-sections (cart drawer spec).
