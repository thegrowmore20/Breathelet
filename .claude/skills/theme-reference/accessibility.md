---
description: Deep reference for accessibility, standard theme events/actions, and Theme Store requirements: landmarks, focus management, keyboard, contrast, reduced motion, live regions, plus the Theme Store gate checklist. Load when building interactive components, doing the a11y pass, or preparing for Theme Store submission — pairs with rules/markup.md and rules/markup.md.
---

> **Examples are illustrative.** When copying code: use the canonical srcset widths, eager/lazy cut-off and breakpoints from AGENTS.md, `const` + `for...of` instead of `var`/`forEach`, the canonical breakpoints in `rules/css.md` (750/990/1024px in examples are Dawn values). Constants win; report any contradicting line you find.


## Part 8 — Accessibility, Standard Events & Theme Store Requirements

Research notes compiled from shopify.dev. Quotes are reproduced as returned by Shopify's docs (WebFetch summarization tool); exact original phrasing may vary slightly in wording but all numbers, names, and code are verified/cross-checked across multiple fetches of the same pages.

Sources:
- https://shopify.dev/docs/storefronts/themes/best-practices/accessibility
- https://shopify.dev/docs/storefronts/themes/best-practices/standard-events-and-actions
- https://shopify.dev/docs/api/storefront-events-and-actions/events (+ per-event sub-pages)
- https://shopify.dev/docs/api/storefront-events-and-actions/actions (+ per-action sub-pages)
- https://shopify.dev/docs/storefronts/themes/store/requirements
- https://shopify.dev/docs/storefronts/themes/best-practices/merchant-stores
- https://shopify.dev/docs/storefronts/themes/best-practices/deceptive-code
- https://shopify.dev/docs/storefronts/themes/best-practices/file-transformation
- https://shopify.dev/docs/storefronts/themes/best-practices/version-control

---

### Semantic HTML and landmark structure

From the "Page structure" > "Global" section:

- Set the page's `lang` attribute (e.g. `<html lang="en">`) so screen readers use the right pronunciation rules.
- Don't disable pinch-zoom / user scaling in the viewport meta tag (viewport zoom must remain enabled).
- Provide a skip link to jump past repeated navigation into main content.
- Content must flow in a logical, linear reading order in the DOM — don't use positive `tabindex` values to reorder focus; if an element needs to be reachable by keyboard but isn't naturally focusable, use `tabindex="0"` (never `tabindex="1"`, `"2"`, etc.).
- Use semantic landmark elements (`<header>`, `<nav>`, `<main>`, `<footer>`) rather than generic `<div>`s so assistive technology can jump between regions.

```html
<html lang="en">
  <body>
    <a class="skip-link" href="#MainContent">Skip to content</a>
    <header>...</header>
    <nav aria-label="Main">...</nav>
    <main id="MainContent" tabindex="-1">
      ...
    </main>
    <footer>...</footer>
  </body>
</html>
```

### Heading order

From "Page structure" > "Headings":

- HTML heading elements (`h1`–`h6`) must use actual heading markup, not styled `<div>`/`<span>` text.
- Heading tags must be used in sequence (don't skip from `h2` to `h4`).
- The `h1` element identifies the main topic of the page and should generally appear once per page.

```html
<h1>Product title</h1>
<section>
  <h2>Product details</h2>
  <h3>Materials</h3>
</section>
<section>
  <h2>Reviews</h2>
</section>
```

### Skip-to-content link

Called out explicitly under "Global": themes should provide a **skip link** that lets keyboard/screen-reader users bypass the header and navigation and jump straight to main content. Standard pattern:

```html
<a class="skip-link visually-hidden" href="#MainContent">Skip to content</a>

<main id="MainContent" tabindex="-1">
  ...
</main>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  z-index: 100;
}
.skip-link:focus {
  top: 0;
}
```

### Focus management and visible focus states

From "Keyboard support":

- "The focus indicator is visible and consistent on active elements."
- "The keyboard focus order must match the DOM order."
- "The Tab key and Shift + Tab keys can be used to navigate your theme."
- "No sudden changes of context when a part of your theme receives focus" (focus alone should never trigger navigation, form submission, or opening/closing of UI).

Never remove the focus outline without replacing it:

```css
/* Bad — kills the focus indicator with nothing to replace it */
:focus { outline: none; }

/* Good — visible, consistent focus style */
a:focus-visible,
button:focus-visible,
input:focus-visible {
  outline: 2px solid #005fcc;
  outline-offset: 2px;
}
```

For the main-content skip target and programmatically-focused regions (e.g. after a form error or opening a drawer), move focus explicitly with JS:

```js
mainContent.setAttribute('tabindex', '-1');
mainContent.focus();
```

### Keyboard navigation and focus traps in dialogs/drawers

From "Dynamic components" > "Drawers and modals":

- Modals/drawers use `role="dialog"` (the doc states: "The role used to identify modals is `dialog`.").
- Focus must move into the dialog when it opens, be trapped inside it while open (Tab/Shift+Tab cycle only through focusable elements in the dialog), and return to the triggering element when it closes.
- The `Esc` key must close the dialog/drawer.
- Keyboard support required: `Enter`, `Space`, `Tab`, and `Esc` for interactive nav/menu and dialog components.

```js
class CartDrawer extends HTMLElement {
  open() {
    this.previouslyFocused = document.activeElement;
    this.setAttribute('open', '');
    this.querySelector('[data-first-focusable]').focus();
    document.addEventListener('keydown', this.onKeydown);
  }
  close() {
    this.removeAttribute('open');
    document.removeEventListener('keydown', this.onKeydown);
    this.previouslyFocused?.focus();
  }
  onKeydown = (event) => {
    if (event.key === 'Escape') this.close();
    if (event.key === 'Tab') this.trapFocus(event);
  };
}
```

### ARIA usage rules (including when NOT to use ARIA)

Rules distilled from across the "Page structure" sections (Navigation, Product information, Controls, Forms, Form errors):

**Use ARIA for:**
- `aria-current="page"` on the active nav link.
- `aria-expanded` / `aria-controls` on menu/dropdown/accordion triggers to expose open/closed state and the controlled element.
- `aria-live` (polite or assertive, as appropriate) to announce dynamic changes — e.g. price/availability updates when a buyer selects a different variant, and to announce cart updates, form errors, and success messages.
- `aria-describedby` on form inputs, pointing at the id of their error-message container, so the error is read out with the field.
- `aria-label` as a fallback for labeling a control when no visible text label exists (e.g. icon-only buttons).
- `aria-hidden="true"` (or empty `alt=""`) to hide purely decorative content from assistive tech.

**When NOT to use ARIA (prefer native semantics first):**
- Use a real `<a>` element for links (navigation, loading a new page, moving keyboard focus) — don't build a link out of a `<div>`/`<span>` with `role="link"` and a click handler.
- Use a real `<button>` element for on-screen actions (opening a modal, sorting a table) rather than adding `role="button"` to a non-interactive element.
- Use real table markup (`<table>`, `<caption>`, `<th scope="col">`/`<th scope="row">`) instead of ARIA grid roles for tabular data.
- Use real `<label for="id">` (or wrapping `<label>`) for form fields as the primary method; `aria-label`, `.visually-hidden` label text, and floating labels are the fallback techniques — not a reason to skip a real label element entirely.
- General principle implied throughout: ARIA should supplement semantic HTML to expose state/relationships that HTML alone can't express (like live-region announcements), not replace a native interactive element that already has the right semantics and keyboard behavior built in.

```html
<!-- Icon-only accessible name -->
<button type="button" aria-label="Close">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>

<!-- External/new-window link warning -->
<a href="https://example.com" target="_blank" rel="noopener">
  Warranty details
  <span class="visually-hidden">Opens in a new window</span>
</a>
```

### Form labels and error messaging

From "Forms":

- "All form fields include a label." Labeling techniques: a real `<label for="id">`, `aria-label`, a `.visuallyhidden` element, or a floating label.
- "Form inputs and controls have names that clearly state their purpose."
- "Form inputs have labels with `for` attributes, including form labels in the theme settings."
- "Required inputs have the `required` attribute."
- "Fields use the `autocomplete` attribute" — helps buyers autofill from browser-stored data.

From "Form errors":

- "Focus is placed on the feedback message."
- "Any errors returned as a result of completing or submitting a form are communicated to screen readers where possible and as soon as possible."
- "Error messages are clear and descriptive."
- "The `aria-describedby` attribute is applied to input elements which reference the error text container."
- "Notifications, error messages, success messages are announced aloud." — critical info is announced via `aria-live`.

```html
<label for="Email">Email</label>
<input
  type="email"
  id="Email"
  name="email"
  required
  autocomplete="email"
  aria-describedby="EmailError"
  aria-invalid="true"
>
<span id="EmailError" role="alert" class="form-error">
  Enter a valid email address.
</span>
```

### Alt text rules for product/collection images

From "Images and icons":

- "All `img` elements must have an `alt` attribute. Without an `alt` attribute, screen readers announce the name and path of the image file."
- "Product or content images feature `alt` text which describes the image for screen reader users."
- Decorative images/icons get an empty alt so they're skipped: `<img src="/content/assets/images/…" alt="" />`.
- Reference objects/filters: `image.alt` (`https://shopify.dev/docs/api/liquid/objects/image#image-alt`) and the `image_tag` filter's `alt` parameter (`https://shopify.dev/docs/api/liquid/filters/image_tag#image_tag-alt`) should be used to output merchant-provided alt text; fall back to the product/page title only if no alt text is set.

```liquid
{{ product.featured_image | image_url: width: 800 | image_tag: alt: product.featured_image.alt | default: product.title }}

{{ 'icon-decorative.svg' | inline_asset_content }} {%- comment -%} wrap decorative inline SVGs with aria-hidden="true" {%- endcomment -%}
```

### Color contrast ratios (exact numbers)

Two related but distinct sets of numbers appear in Shopify's docs — a **best-practice** guideline and a **hard Theme Store requirement**:

**Accessibility best-practices page — "Color and contrast":**
- Text smaller than 24px regular / 18.5px bold: contrast ratio **4.5:1** against its background.
- Text 24px regular / 18.5px bold or larger: contrast ratio **3.0:1** against its background.
- Icons: contrast ratio **3.0:1** against their background.
- "Color isn't the only indicator used to convey information" (don't rely on color alone, e.g. for form errors or sale badges).

**Theme Store requirements page — "Accessibility":**
- "Text color contrast ratio must be **4.5:1** for main body content. For text larger than 18pt, and non-text elements such as borders and icons, the color contrast ratio must be **3:1**." (This is WCAG 2.1 SC 1.4.3 / 1.4.11 language.)

### Touch target sizes

Two figures appear, at different strictness levels:

- **Theme Store hard requirement**: "The size of the touch target for pointer inputs must be at least **24 by 24 CSS pixels**" — citing WCAG 2.2 Target Size (Minimum), `https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html`.
- **Accessibility best-practices page (stricter recommendation)**: "Touch targets on primary controls and links need to be at least **44 by 44 pixels**" (menu links, submit buttons, product variant selectors, etc.) — this aligns with the WCAG Target Size (Enhanced) guidance.

Treat 24×24px as the compliance floor and 44×44px as the recommended target for primary/high-traffic controls.

### Reduced motion

Not called out with an explicit heading on the accessibility page in the fetched content, but implied by the "Dynamic components" > "Slideshows" and "Video"/"Audio" rules, which require that auto-playing motion/media be pausable/stoppable. Standard implementation pattern to combine with those rules:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

```js
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) {
  slideshow.pause();
}
```

### Screen-reader-only utility CSS

Referenced in the Forms section as the `.visuallyhidden` element/class (used to visually hide a label or supplementary text while keeping it in the accessibility tree). Standard implementation:

```css
.visually-hidden {
  position: absolute !important;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Used for: skip-link text before focus, "(opens in a new window)" warnings on links, distinguishing sale vs. regular price for screen readers, and hidden `<label>` text on inputs that only show a placeholder visually.

### Accessible name for icon-only buttons

From "Controls": "The destination of your link must be clear from the text alone." For icon-only controls (close button, search icon, cart icon, hamburger menu), give them an accessible name via visible-but-hidden text or `aria-label`:

```html
<button type="button" class="header__icon" aria-label="Search">
  <svg aria-hidden="true" focusable="false"><use href="#icon-search"/></svg>
</button>

<!-- or with visually-hidden text (often preferred over aria-label for translatability) -->
<button type="button" class="header__icon">
  <svg aria-hidden="true" focusable="false"><use href="#icon-cart"/></svg>
  <span class="visually-hidden">Cart</span>
</button>
```

### Live regions for cart updates

From "Product information": "If your theme dynamically changes a product price and availability when different variants are selected, then the changes must also be communicated to screen readers. `aria-live` is used to communicate dynamic changes in the UI." The same `aria-live` requirement is reiterated under "Form errors" for notifications/success/error messages.

```html
<div id="CartCount" aria-live="polite" aria-atomic="true" class="visually-hidden">
  Cart updated: 3 items
</div>

<div id="VariantAvailability" aria-live="polite">
  <!-- updated via JS when a variant with different availability is selected -->
</div>
```

Pair this with the standard `shopify:cart:lines-update` event (see below) so any listener — including your own live-region updater — reacts consistently to cart changes regardless of what triggered them (line-item stepper, app upsell, quick-add, etc.).

### Video / carousel controls

**Video** ("Media" > "Video"):
- Closed captions must be available.
- Descriptive audio should be available.
- Auto-playing video must be muted.
- The `Space` key can be used to pause and play the video.

**Audio** ("Media" > "Audio"):
- Transcripts are available.
- Auto-playing audio can be paused.

**Slideshows** ("Dynamic components" > "Slideshows"):
- "Content that plays automatically in a slideshow can be paused or stopped." Provide visible, keyboard-operable pause/play and prev/next controls, and don't rely on hover/gesture-only interaction (ties back to the Gesture support rule that "any functionality that requires several fingers or complex gestures should be available with a single tap or click").

```html
<div class="slideshow" role="region" aria-roledescription="carousel" aria-label="Featured products">
  <button type="button" class="slideshow__pause" aria-pressed="false">
    <span class="visually-hidden">Pause slideshow</span>
  </button>
  <div class="slideshow__slide" role="group" aria-roledescription="slide" aria-label="1 of 4">...</div>
  <button type="button" aria-label="Previous slide">‹</button>
  <button type="button" aria-label="Next slide">›</button>
</div>
```

---

### Standard theme events and actions

Source: "Standard events and actions" best-practices page + the full events/actions API reference (`https://shopify.dev/docs/api/storefront-events-and-actions/events`, `https://shopify.dev/docs/api/storefront-events-and-actions/actions`).

Core idea (quoted): "Your theme dispatches an event when a buyer does something, such as viewing a product or updating the cart. Apps call an action when they need your theme to change something, such as opening the cart." This replaces bespoke "a separate integration for every theme" wiring — apps can call the same actions/listen for the same events on any theme that implements the standard.

- **Actions** run automatically on every Liquid storefront with default implementations (e.g. an app can call `updateCart` without any theme configuration). Default/fallback behavior can be a full page reload if the theme's custom cart markup isn't recognized — themes should configure their own handlers to avoid that degraded fallback.
- **Events** are dispatched by the theme at the DOM locations where buyers interact; developers can attach listeners to update custom UI instead of relying on fallback behavior.

#### Standard events (12 total)

All events are namespaced `shopify:<object>:<change>` and dispatched as DOM CustomEvents:

| Event name | Fires when | Key properties |
|---|---|---|
| `shopify:cart:attributes-update` | Cart attributes change | — |
| `shopify:cart:discount-update` | Buyer applies or removes discount codes | — |
| `shopify:cart:error` | A cart operation fails | — |
| `shopify:cart:lines-update` | Cart lines are added, updated, or removed (one event for all three; `action` field disambiguates) | `action: 'add'\|'remove'\|'update'`, `context: 'product'\|'cart'\|'dialog'\|'standard-action'`, `lines: CartLinesUpdateLine[]`, `promise: Promise<CartLinesUpdateResult>`, `detail?` |
| `shopify:cart:note-update` | Buyer changes the cart note | — |
| `shopify:cart:view` | Buyer opens the cart page or cart drawer | `context: 'page'\|'dialog'`, `cart: StandardEventCart\|null`, `detail?` |
| `shopify:collection:update` | Buyer filters or sorts a collection | — |
| `shopify:collection:view` | Buyer lands on a collection | — |
| `shopify:page:view` | Fires once on every page load | — |
| `shopify:product:select` | Buyer changes a product option (e.g. size/color) — variant change | `product: ProductSelectProduct`, `selectedOptions: SelectedOption[]`, `promise: Promise<ProductSelectResult>`, `detail?` |
| `shopify:product:view` | A product comes into view | — |
| `shopify:search:update` | Buyer submits a search, or changes filters/sort on existing results — powers predictive search integrations | `search: SearchQuery`, `promise: Promise<SearchUpdateResult>`, `detail?` |

##### `shopify:cart:lines-update` — detail

```js
document.addEventListener('shopify:cart:lines-update', (event) => {
  if (event.action === 'add') {
    console.log('Added', event.lines);
  }
  event.promise.then(({ cart }) => updateCartCount(cart?.totalQuantity));
});
```
- `action`: `'add' | 'remove' | 'update'` — determines the shape of `lines`.
- `context`: `'product' | 'cart' | 'dialog' | 'standard-action'` — `'standard-action'` is reserved for events emitted automatically by standard actions (e.g. when an app calls `updateCart`).
- `lines`: `CartLinesUpdateLine[]` — at least one entry.
- `promise`: `Promise<CartLinesUpdateResult>` — resolves when the update finishes, rejects on failure/abort.
- `detail?`: `Record<string, unknown>` — optional custom data.
- Dispatched from: the cart element, and the product element (for adds from a product page).

Reference: `https://shopify.dev/docs/api/storefront-events-and-actions/events/cart-lines-update`

##### `shopify:product:select` — detail (variant change)

```js
const deferred = ProductSelectEvent.createPromise();
element.dispatchEvent(
  new ProductSelectEvent({
    product: { id: productId, title, handle },
    selectedOptions: [{ name: 'Size', value: 'Large' }],
    promise: deferred.promise,
  }),
);
deferred.resolve({ variant: await lookupVariant(selectedOptions) });
```
- `SelectedOption`: `{ name: string, value: string }` (e.g. `{ name: 'Size', value: 'Large' }`).
- `ProductSelectResult`: `{ variant: ProductVariant | null, detail?: Record<string, unknown> }` — `variant` is `null` when no variant matches the selection.
- `ProductVariant`: `{ id: string (GID), title: string, availableForSale: boolean, price: MoneyV2, selectedOptions: SelectedOption[] }`.
- `MoneyV2`: `{ amount: string, currencyCode: string }` (e.g. `{ amount: "29.99", currencyCode: "USD" }`).

Reference: `https://shopify.dev/docs/api/storefront-events-and-actions/events/product-select`

##### `shopify:search:update` — detail (predictive search)

```js
import { SearchUpdateEvent } from '@shopify/standard-events';

const deferred = SearchUpdateEvent.createPromise();
element.dispatchEvent(
  new SearchUpdateEvent({
    search: { query: input.value, sortKey: 'RELEVANCE' },
    promise: deferred.promise,
  }),
);
const results = await runSearch(input.value);
deferred.resolve({ totalCount: results.totalCount });
```
```js
document.addEventListener('shopify:search:update', (event) => {
  event.promise.then(({ totalCount }) => {
    if (totalCount === 0) recordEmptySearch(event.search.query);
  });
});
```
- `SearchQuery`: `{ query: string, sortKey: string (e.g. 'RELEVANCE'), filters: ProductFilter[] }` — `query` persists when the buyer changes only filters.
- `SearchUpdateResult`: `{ totalCount: number, detail?: Record<string, unknown> }`.
- Dispatched from: the search's filter form.

Reference: `https://shopify.dev/docs/api/storefront-events-and-actions/events/search-update`

##### `shopify:cart:view` — detail

```liquid
<s-view-event view-event-payload='{{ cart | standard_event_data: "view", context: "dialog" | escape }}'>
  <!-- cart drawer contents -->
</s-view-event>
```
```js
document.addEventListener('shopify:cart:view', (event) => {
  if (event.context === 'dialog' && event.cart?.totalQuantity > 0) {
    showFreeShippingProgress(event.cart.cost.totalAmount);
  }
});
```
- `context`: `'page' | 'dialog'`.
- `cart`: `StandardEventCart | null` (null when no cart exists yet).
- Dispatched via a `<s-view-event>` custom element wrapping the payload built with the `standard_event_data` Liquid filter.

Reference: `https://shopify.dev/docs/api/storefront-events-and-actions/events/cart-view`

#### Standard actions (3 total)

| Action | Description |
|---|---|
| `getCart()` | Returns the current cart. |
| `openCart()` | Shows the cart to the buyer (opens a drawer or navigates to `/cart`, theme's choice). |
| `updateCart(payload, options?)` | Adds, updates, or removes cart lines, sets the cart note, applies discount codes, and updates cart attributes. |

##### `updateCart`

```js
const { cart, userErrors, warnings } = await Shopify.actions.updateCart({
  lines: [{ merchandiseId: 'gid://shopify/ProductVariant/123', quantity: 1 }],
});

if (userErrors?.length) {
  showMessage(userErrors[0].message);
  return;
}
if (warnings?.length) {
  showMessage(warnings[0].message);
}
updateCartCount(cart.totalQuantity);
```
- `payload: UpdateCartPayload` (required) — lines, note, discount codes, attributes.
- `options?: UpdateCartOptions` (optional) — abort signal / event shaping config.
- Returns `Promise<UpdateCartResult>`: `{ cart: CartSummary (lines, cost, totalQuantity), userErrors?: CartMutationUserError[], warnings?: CartMutationWarning[], detail?: Record<string, unknown> }`.

Reference: `https://shopify.dev/docs/api/storefront-events-and-actions/actions/update-cart`

##### `openCart`

```js
await Shopify.actions.updateCart({ lines: [{ merchandiseId: variantId, quantity: 1 }] });
await Shopify.actions.openCart();
```
```js
Shopify.actions.openCart.configure({
  async handler() {
    const drawer = document.querySelector('cart-drawer');
    if (drawer) {
      drawer.open();
    } else {
      window.location.href = '/cart';
    }
  },
});
```
- No parameters. Returns `Promise<void>`.
- Default behavior: opens a recognized cart drawer, or navigates to `/cart` if no drawer element is found.
- Themes register a custom handler via `.configure({ handler })` so apps calling `openCart()` open the theme's real drawer instead of falling back to a page navigation.

Reference: `https://shopify.dev/docs/api/storefront-events-and-actions/actions/open-cart`

##### `getCart`
- No parameters documented beyond returning `Promise<Cart>` — "Returns the current cart."

Reference: `https://shopify.dev/docs/api/storefront-events-and-actions/actions/get-cart`

---

### Theme Store requirements

Source: `https://shopify.dev/docs/storefronts/themes/store/requirements` (22 requirement categories on one page).

#### Performance & accessibility (hard numeric gates)

- **Lighthouse performance score**: minimum **average of 60** across the theme's product, collection, and home pages, for **both desktop and mobile**.
- **Lighthouse accessibility score**: minimum **average of 90** across the theme's product, collection, and home pages, for **both desktop and mobile**.
- **Text color contrast**: **4.5:1** minimum for main body content; **3:1** minimum for text larger than 18pt and for non-text elements (borders, icons).
- **Touch target size**: at least **24 × 24 CSS pixels** for pointer inputs (WCAG 2.2 Target Size Minimum).
- Full keyboard navigation and visible, consistent focus states required throughout.
- All images require appropriate `alt` text.
- Valid HTML required (checked with the W3 HTML checker).

#### Exclusivity & uniqueness
- Themes submitted to the Theme Store must be exclusive to the Theme Store.
- Must be substantially different from existing themes — differences can't be achieved through minor cosmetic changes alone.

#### Design & UX
- Unique visual direction, professional-quality imagery, consistent typography, clear content hierarchy.
- Flexible layouts that stay visually appealing regardless of content length (long/short titles, many/few images, long/short descriptions, etc.).

#### Required storefront features
- Sections Everywhere (full Online Store 2.0 section support on every template).
- Discount display (sale vs. regular price shown distinctly).
- Accelerated checkout buttons on product and cart pages.
- Faceted/filtered search on collection and search results.
- Gift cards (dedicated gift card template).
- Image focal points.
- Social sharing meta images (Open Graph / Twitter Card tags).
- Country/region and language selectors (localized currency, multi-language support).
- Multi-level (nested) navigation menus.
- Newsletter signup form.
- Pickup availability display.
- Product recommendations (related products and complementary products).
- Rich product media (video, 3D/AR models, multiple images).
- Predictive search.
- Selling plans / subscriptions display in cart.
- Shop Pay Installments banner.
- Unit pricing (required in EU/Switzerland).
- Variant images.

#### Required templates (14+)
404, article, blog, cart, collection, product, search, gift card, page, index/home, list-collections, password, customers/account and related account templates, policy — templates must support Sections Everywhere except account and checkout-adjacent pages (checkout itself is not theme-editable).

#### Sections & blocks
- All templates must support sections (except account/checkout-related pages).
- Must include a **Custom Liquid** section, and **Custom Liquid blocks** within product sections, so that apps and merchants can inject custom markup/app blocks.

#### Code requirements
- No Sass in the shipped theme.
- No minified CSS or JS in source, **except** compiled ES6 output and third-party libraries.
- Use protocol-relative or HTTPS URLs (no hardcoded `http://`).
- Proper licensing required for any third-party code, fonts, or assets bundled with the theme.

#### Browser support
- Latest versions of: Safari, Chrome, Firefox, Edge (desktop).
- Mobile Safari, Chrome Mobile, Samsung Internet (mobile).

#### SEO
- Theme must output correct SEO metadata (title tags, meta description, canonical, Open Graph/Twitter Card tags).
- Must produce valid Google rich snippets / structured data (verified with Google's Structured Data Testing Tool).

#### Settings & terminology
- Settings schema must use specific American English terminology (e.g. "canceled," not "cancelled").
- Merchant-first language: settings should read clearly to merchants, not developers.

#### Demo store content
- Authentic content only — no Lorem Ipsum placeholder text.
- Content/catalog must match the theme's assigned industry and catalog-size tags.
- Test payment gateway (Bogus Gateway) enabled for review.
- Demo store must showcase the theme's full versatility (e.g. long and short content variations).

#### Documentation & support
- Theme documentation required, including an FAQ.
- A clear, public support policy.
- A public contact form with specific required fields.
- Theme Partners must reply to support requests within **two business days**.
- Critical bugs must be fixed immediately.
- Ongoing theme support is a standing obligation, not a one-time deliverable.

---

### Merchant stores best practices

Source: `https://shopify.dev/docs/storefronts/themes/best-practices/merchant-stores`

- Use **collaborator accounts** to access client stores through your own Partner Dashboard — these don't count against the merchant's staff account limits and restrict access to only what the merchant permits.
- For work that needs broader permissions, ask the merchant to create a dedicated **staff account** for you.
- **Never** ask for or use the merchant's own login password/credentials directly.
- When setting up GitHub integration for an ongoing client relationship, clarify **repository ownership** up front — you may need to transfer the repository to the merchant as part of the final deliverable so they retain control of future development.

### Deceptive code — prohibited practices

Source: `https://shopify.dev/docs/storefronts/themes/best-practices/deceptive-code`

Enforced via the Partner Program Agreement and API Terms of Service. Two explicit prohibitions:

1. **Obfuscating code**: "Obfuscation means changing simple, straightforward code into code that is difficult to understand." No legitimate purpose is recognized for this, and it can degrade performance.
2. **Manipulating search engines**: themes must not use techniques to deceive search engines about site content, explicitly including **cloaking** (serving different content to crawlers than to real users) — and explicitly warns against using such tricks "including increasing page speed scores."

Violations can trigger **Partner governance action**.

### File transformation best practices

Source: `https://shopify.dev/docs/storefronts/themes/best-practices/file-transformation`

- File transformations let developers write source in preferred tools/structure (e.g. multiple scoped SCSS partials) and compile to optimized output (fewer, larger bundles) for delivery.
- Common transforms: custom folder structures → Shopify theme structure, SCSS → CSS, SVG → Liquid snippets for inlining, PostCSS (Autoprefixer, cssnano, Tailwind), section-folder organization → flat Liquid/JS/CSS/JSON files, critical-CSS calculation/inlining, JS bundling, minification of JS/CSS/HTML.
- **Compiled code drift**: merchants editing in the theme editor/code editor, or apps writing via the Asset REST API, can modify *compiled* files directly. Those edits are lost on the next build unless manually ported back into source — developers must watch for out-of-band changes (e.g. via GitHub commit diffs) and backfill them into source.
- **Just-in-time (JIT) transformations** are recommended as an alternative: compile on-demand at request time from source rather than shipping precompiled files. Benefits: fewer compiled files to track, merchants can edit source directly, stays compatible with GitHub integration, shifts maintenance burden to the service/tool owner.
- Shopify **automatically minifies CSS and JS** on upload and re-minifies when source changes — so developers don't need to manage separate minified copies themselves.

### Version control best practices

Source: `https://shopify.dev/docs/storefronts/themes/best-practices/version-control`

- Shopify's **GitHub integration**: once connected, merchant edits in the theme/code editor are tracked automatically as commits to the connected branch.
- Connect your `main`/`master` branch for regular ongoing publishing; use separate branches for temporary campaigns/sales, publishing them temporarily and reverting to `main` afterward.
- GitHub integration only understands the **default flat Shopify theme folder structure** — it cannot work with a branch containing `src`/`dist` build-pipeline folders. Four strategies to reconcile a build pipeline with GitHub integration:
  1. **Separate repositories** for source vs. compiled code — easiest to adopt, but requires cross-repo maintenance.
  2. **Branch separation (recommended)** — use `git subtree` to push compiled output to a dedicated branch that Shopify's integration connects to.
  3. **Mixed approach** — keep source and compiled files together in the same folder structure; minimizes extra compiled files but risks merchants directly editing generated output.
  4. **Source-only versioning** — track only source in git; deploy compiled code manually via Shopify CLI or CI/CD. Well-supported for CI/CD but incompatible with the GitHub integration's live-sync behavior.
- JIT file transformations (see above) are offered as an alternative that sidesteps the whole compiled-code-in-git problem.

---

### Quick checklist

- Use one `<h1>` per page and never skip heading levels.
- Wrap the page in real landmarks: `<header>`, `<nav>`, `<main>`, `<footer>`.
- Add a visible-on-focus skip-to-content link as the first focusable element.
- Set `<html lang="...">` and never disable pinch-zoom in the viewport meta tag.
- Never use positive `tabindex` values; keep DOM order = focus order.
- Style `:focus-visible` with a visible, consistent outline — never `outline: none` with no replacement.
- Trap focus inside open dialogs/drawers, restore focus to the trigger on close, and close on `Esc`.
- Use `role="dialog"` on modals/drawers.
- Use real `<a>` for navigation and real `<button>` for actions — don't fake them with ARIA roles on `<div>`s.
- Reserve ARIA for state/relationships HTML can't express natively (`aria-expanded`, `aria-current`, `aria-live`, `aria-describedby`).
- Label every form field with a real `<label for>` (or `.visually-hidden`/`aria-label` fallback), mark `required` fields, and set `autocomplete`.
- Tie every form error to its field with `aria-describedby` and announce it via `aria-live`/`role="alert"`; move focus to the error/feedback message.
- Give every image a meaningful `alt`, or `alt=""` if purely decorative.
- Give every icon-only button an accessible name via `aria-label` or `.visually-hidden` text.
- Meet 4.5:1 contrast for body text, 3:1 for large text (≥24px/18.5px bold) and icons/borders.
- Make touch targets at least 24×24px (compliance floor) — aim for 44×44px on primary controls.
- Mute all autoplaying video, make it pausable with `Space`, and provide captions.
- Provide transcripts for audio and let buyers pause autoplaying audio.
- Give slideshows/carousels visible pause/stop and prev/next controls operable by keyboard.
- Respect `prefers-reduced-motion` and reduce/disable non-essential animation.
- Dispatch and listen for the standard `shopify:*` events (`cart:lines-update`, `cart:view`, `product:select`, `search:update`, etc.) instead of theme-specific custom events.
- Implement/configure the standard `updateCart`, `openCart`, and `getCart` actions so apps integrate without falling back to full page reloads.
- Never obfuscate code or cloak content from search engines.
- Never use a merchant's own password; use collaborator or staff accounts instead.
- Hit Lighthouse ≥60 performance and ≥90 accessibility (desktop + mobile average) on product, collection, and home pages before Theme Store submission.


---

