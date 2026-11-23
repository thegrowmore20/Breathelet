---
description: Deep reference for measuring performance: CWV lab vs field, Theme Check, Lighthouse CI, finding JS offenders, spotting fake performance apps, DevTools workflows. Load when auditing a build, setting up CI gates, or diagnosing which asset is slow.
---

> **Examples are illustrative.** When copying code: use the canonical srcset widths, eager/lazy cut-off and breakpoints from AGENTS.md, `const` + `for...of` instead of `var`/`forEach`, the canonical breakpoints in `rules/css.md` (750/990/1024px in examples are Dawn values). Constants win; report any contradicting line you find.


## Part 6 — Measurement, Testing & Tooling

Source: https://shopify.dev/docs/storefronts/themes/best-practices/performance/ (parent page + 9 sub-pages) and https://shopify.dev/docs/storefronts/themes/tools/lighthouse-ci

### Metrics table

| Metric | What it measures | Good | Needs improvement | Poor | What in a theme usually breaks it |
|---|---|---|---|---|---|
| TTFB (Time to First Byte) | How long the browser waits for the first byte of the HTML response. On Shopify storefronts this primarily reflects Liquid rendering time server-side; nothing else can proceed until this response arrives. | — (no numeric threshold given on parent page) | — | — | Expensive/deeply nested Liquid loops (grow quadratically with catalog size), overfetching, request proxies, app logic |
| FCP (First Contentful Paint) | When the browser paints the first text or image. | — | — | — | Render-blocking stylesheets and scripts in `<head>`, anti-flicker scripts, large DOM, third-party blocking requests |
| LCP (Largest Contentful Paint) | When the largest element in the initial viewport finishes rendering, usually a hero or product image. Tracks perceived load speed more closely than other single metrics. | — | — | — | `loading="lazy"` on the LCP image, missing `fetchpriority="high"`, fade-in/reveal animations hiding the LCP element, client-side JS rendering essential content instead of server-side, overusing `preload` |
| CLS (Cumulative Layout Shift) | How much visible content moves unexpectedly while the page loads. | — | — | — | Images lacking width/height dimensions, fonts swapping in late, dynamically injected app content |
| INP (Interaction to Next Paint) | How long the page takes to respond visibly after someone taps or clicks. Reports the worst (or near-worst) interaction across the entire visit, not just the first. Main-thread work (JS) is the primary bottleneck. | ≤ 200 ms | 200–500 ms (implied) | > 500 ms | Heavy JS in variant selectors, cart drawer operations (layout-triggering `width`/`height` animations), mega menu expansion/insertion, search inputs, collection filters, third-party app scripts |

Notes:
- The parent page's verbatim text gives only qualitative definitions for TTFB/FCP/LCP/CLS (no numeric good/poor split was present in the fetched content) — INP is the only metric with explicit numeric thresholds, and those come from the `understanding-inp` page: **Good INP ≤ 200 ms, Poor INP > 500 ms, both assessed at the 75th percentile of page visits.**
- Theme Store acceptance requires a minimum **60** Lighthouse performance score average across home/product/collection pages, on both desktop and mobile (see Testing section below).

#### Essential practices (highest-impact section, parent page)

| Recommendation | Summary | Metric | Impact |
|---|---|---|---|
| Never lazy-load LCP image | `loading="lazy"` on the LCP image delays it until after layout completes | LCP | High |
| Mark LCP with `fetchpriority="high"` | Tells the browser to fetch the LCP image before other resources | LCP | High |
| Don't hide LCP behind animations | Fade-in and reveal animations delay the LCP event | LCP | High |
| Server-side render essential content | Moving product info, hero content, or nav into client-side JavaScript delays LCP | LCP | High |
| Avoid deeply nested Liquid loops | Loops nested across products grow quadratically with catalog size | TTFB | High |
| Use preload sparingly | Overusing preload competes with browser prioritization | LCP | Medium |

### How to test: lab vs. field

**Core strategy** (testing-for-performance): "Use field data to find problems, lab data to debug them, and field data again to verify fixes landed."

#### Field data
Captures real user experiences across actual devices, networks, and locations.
- **Shopify Web Performance Dashboard** — Real User Monitoring (RUM), reports Core Web Vitals (LCP, INP, CLS) segmented by page type, device, and geography. Used to establish baselines, detect post-deployment regressions, validate improvements.
- **GraphQL Admin API** — `performanceMetrics` and `performanceEvents` fields (unstable API only) for custom dashboards and regression alerts.
- **Chrome User Experience Report (CrUX)** — public aggregated RUM data via PageSpeed Insights and tools like TREO Site Speed.
- Custom RUM providers such as SpeedCurve are also mentioned (lab-vs-field page).

**Use field data for:** establishing baselines, understanding actual user problems, making optimization decisions, verifying improvements worked for real users.

**Survivorship bias caveat:** "analytics and Real User Monitoring data include only users who successfully loaded the page" — users on very slow connections may abandon before analytics fire, skewing averages higher (better) than reality.

#### Lab data
Controlled synthetic tests in consistent environments, for debugging.
- **WebPageTest**, **Chrome DevTools**, **Lighthouse**, **PageSpeed Insights**.

**Use lab data for:** debugging specific issues found in RUM, testing before/after a change, understanding technical causes of poor metrics, analyzing resource-loading waterfalls, repeatable measurement during development, automated CI/CD checks.

**Caveat:** "Lighthouse scores can differ significantly from RUM data. Lab tests run on a single device with simulated network throttling." Also: "A single Lighthouse run can vary by 5 to 10 points because of CPU and network variability."

#### Throttling / decision framework
- Lab tests use a single device with simulated network throttling (Lighthouse default mobile throttling).
- For INP interaction profiling, test with **4x CPU throttling** to simulate slower devices (understanding-inp page).
- Quick decision framework (lab-vs-field):
  - Unknown problem → start with field data
  - Known problem, unknown cause → switch to lab data
  - Shipped a change → return to field data and await reporting windows

#### When lab and field disagree
Common causes: device mix differences, geographic latency variation, caching state variation, real-world interaction patterns lab tests can't reproduce (e.g., INP).

#### Shopify benchmark methodology (for Theme Store submission)
1. Create an isolated development store.
2. Import standardized test products via CSV.
3. Generate a preview link (shopifypreview.com).
4. Test home, product, and collection pages.
5. Append `?pb=0` to URLs.
6. Run Lighthouse 3+ times per URL, record median scores.
7. Calculate weighted speed score: **Home 17%, Product 40%, Collection 43%**.

Theme Store acceptance requires a **minimum 60** Lighthouse performance score average across all three page types, on both desktop and mobile.

#### Diagnosing with metric gaps (performance-gaps page)
Examine the gaps between TTFB, FCP, and LCP:
- **TTFB itself** → server response time
- **FCP − TTFB** → rendering delay
- **LCP − FCP** → resource discovery or display delay

Tools: Shopify Web Performance Dashboard, TREO Site Speed (treo.sh/sitespeed), PageSpeed Insights, WebPageTest, Chrome DevTools Performance panel.

Four gap patterns:
1. **Slow TTFB** — server/Liquid rendering issues (expensive Liquid, overfetching, request proxies, app logic). Fix: optimize Liquid, reduce pagination depth, eliminate proxies.
2. **Slow FCP** (despite fast TTFB) — render-blocking stylesheets, anti-flicker scripts, large DOM, third-party blocking requests. Fix: defer scripts, optimize CSS, reduce stylesheet count, manage A/B testing.
3. **Slow LCP** — lazy-loaded hero images, CSS backgrounds, JS rendering, animations hiding content. Fix: don't lazy-load LCP images, use `fetchpriority="high"`, render essential content server-side.
4. **Multiple gaps** — multiple simultaneous issues requiring prioritization.

Testing steps: isolate one page type/device category → compare metrics at matching percentiles → calculate the three gaps → match the largest gap to a pattern → reproduce in a lab environment → verify the fix in field data.

### Theme Check: setup and performance-related checks

Theme Check is Shopify's official linter for Liquid themes, integrated into Shopify CLI.

**Install:**
```
npm install -g @shopify/cli
```

**Run:**
```
shopify theme check
shopify theme check --auto-correct
```

**Performance-related checks:**

| Check | What it flags | Default threshold |
|---|---|---|
| `AssetSizeCSS` | CSS files exceeding size threshold | 100,000 bytes (100KB) |
| `AssetSizeJavaScript` | JS files exceeding size threshold | 10,000 bytes (10KB) |
| `ParserBlockingScript` | Scripts blocking HTML parsing; recommends adding `defer` or `async` | — |
| `RemoteAsset` | Assets loaded from external domains; recommends self-hosting via the `asset_url` filter | — |
| `ImgWidthAndHeight` | Missing width/height attributes on `<img>` tags, causing layout shift (CLS) | — |
| `PaginationSize` | Oversized pagination | 250 items (default max) |

**Configuration:** create a `.theme-check.yml` file to enable asset size checks and customize thresholds using camelCase setting names such as `thresholdInBytes`.

**Fake-performance-app detection also uses Theme Check:**
- `RemoteAsset` rule flags third-party domains.
- `ParserBlockingScript` identifies injection points.
- Audit `snippets/social-meta-tags.liquid`, `snippets/meta-tags.liquid`, and `layout/theme.liquid` for suspicious scripts, then remove confirmed malicious code after testing.

**Recommended layered workflow:** Theme Check (static analysis during development) + browser-based tools like Lighthouse and Theme Inspector for full validation.

### Lighthouse CI setup (exact YAML from shopify.dev/docs/storefronts/themes/tools/lighthouse-ci)

Shopify's Lighthouse CI GitHub Action is "based off of Google's Lighthouse CI." It runs performance audits on pull requests against three pages: home, product, collection.

**Requirements:**
- A development store dedicated to Lighthouse testing.
- Store populated with the test product CSV file.
- Dev Dashboard app credentials with `read_products` and `write_themes` scopes.

**Step 1 — Add repository secrets:**
- `SHOP_CLIENT_ID`
- `SHOP_CLIENT_SECRET`
- `SHOP_STORE` (format: `your-store-name.myshopify.com`)
- `SHOP_PASSWORD` (if store is password protected)

**Step 2 — GitHub Action workflow YAML:**

```yaml
name: Shopify Lighthouse CI
on: [push]
jobs:
  lhci:
    name: Lighthouse
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lighthouse
        uses: shopify/lighthouse-ci-action@v1
        with:
          client_id: ${{ secrets.SHOP_CLIENT_ID }}
          client_secret: ${{ secrets.SHOP_CLIENT_SECRET }}
          store: ${{ secrets.SHOP_STORE }}
          password: ${{ secrets.SHOP_PASSWORD }}
```

**Step 3 — Optional GitHub status check:**
1. Install the Lighthouse CI GitHub app.
2. Create repository secret `LHCI_GITHUB_APP_TOKEN`.
3. Add to the workflow:
```yaml
lhci_github_app_token: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

**Action arguments:**

| Attribute | Description | Required |
|---|---|---|
| `client_id` | Dev Dashboard app client ID | yes |
| `client_secret` | Dev Dashboard app client secret | yes |
| `access_token` | Legacy custom app Admin API token (pre-January 2026) | yes |
| `store` | Store URL format: `{shop}.myshopify.com` | yes |
| `password` | Store password for protected stores | no |
| `product_handle` | Product handle for testing; uses first product if unspecified | no |
| `theme_root` | Root directory for theme files; uses repo root if unspecified | no |
| `collection_handle` | Collection handle for testing; uses first collection if unspecified | no |
| `pull_theme` | Theme ID/name to pull settings and JSON templates from | no |
| `lhci_min_score_performance` | Minimum performance score (0–1 decimal); default 0.6 | no |
| `lhci_min_score_accessibility` | Minimum accessibility score (0–1 decimal); default 0.9 | no |

**GitHub status check tokens:**

| Token Type | Purpose |
|---|---|
| `lhci_github_app_token` | Lighthouse GitHub app access token |
| `lhci_github_token` | GitHub personal access token |

### Finding the worst JS offenders (finding-worst-offenders page)

Core principle (Pareto): "A handful of large dependencies or inefficient third-party scripts account for most problems."

**Three ranking methods:**

1. **Lighthouse Treemap (rank by bytes)** — run Lighthouse, open the Treemap visualization; look for unused third-party scripts, oversized dependencies, or duplicated functionality.
2. **Chrome DevTools (rank by scripting time)** — Performance tab, record a page load, use Bottom-Up or Call Tree view, sort by Self Time or Total Time to find execution bottlenecks.
3. **WebPageTest (rank by blocking time)** — run WebPageTest, open Processing Breakdown, review scripts ranked by total blocking time in the Main Thread section (directly affects INP/responsiveness).

**Theme Check integration** also catches: remote assets from external domains, parser-blocking scripts, missing image width/height, oversized bundles (100KB CSS / 10KB JS defaults). Run via `shopify theme check`.

**Recommended nine-step workflow:** Theme Check during development → Lighthouse Treemap analysis → WebPageTest real-world testing → verify necessity of each script → remove unused/legacy scripts → stakeholder evaluation → explore smaller alternatives (implied final steps include re-measuring and monitoring).

### Warning signs of fake performance apps (fake-performance-apps page)

Certain "speed optimization" apps manipulate performance metrics without improving real user experience — they detect testing tools and serve altered pages that score well in labs but provide no real benefit to shoppers.

**Three manipulation techniques:**

1. **LCP hijacking** — inject full-viewport elements (transparent images, empty divs) that paint immediately and become the LCP candidate instead of the actual hero image. The real hero loads at the same (unchanged) speed, but the reported metric looks better.
2. **Testing tool detection / fingerprinting** — checks for "Chrome-Lighthouse" in the user agent, Linux x86_64 platform detection, Moto G device emulation, or missing touch support, then serves a stripped-down page to labs vs. a full page to real users.
3. **Resource manipulation** — delays work past the measurement window by overwriting APIs like `IntersectionObserver`, `document.createElement`, or `appendChild`; some versions use `document.write()`, `document.open()`, and `document.close()` to blank the document during tests.

**Detection methods:**
- Compare PageSpeed Insights against Chrome DevTools Lighthouse — a score difference exceeding **20 points** indicates a problem.
- Check whether the LCP element looks artificial and whether the hero image actually paints before the reported metric timestamp.
- Search loaded resources for obfuscated fingerprinting code containing `"Linux x86_64"` or its hex equivalent `\x4c\x69\x6e\x75\x78\x20\x78\x38\x36\x5f\x36\x34`, plus references to testing tools.

**Removal steps:**
1. Audit `snippets/social-meta-tags.liquid`, `snippets/meta-tags.liquid`, and `layout/theme.liquid` for suspicious scripts.
2. Use Theme Check's `RemoteAsset` rule to flag third-party domains and `ParserBlockingScript` to identify injection points.
3. Remove confirmed malicious code after testing.

### Building a sustainable performance practice (sustainable-performance page)

"Performance is an ongoing practice, not a one-time project." Sites degrade naturally as features accumulate without continuous monitoring.

**Regression pattern:** audit finds problems → fixes ship → metrics improve temporarily → team moves on → within months, performance returns to baseline or worsens.

**Common regression causes:** new features adding code/scripts, unoptimized images from design updates, third-party apps injecting JS, leftover tracking pixels and seasonal scripts, lack of clear ownership.

**Repeatable 5-step cycle:**
1. Measure and identify biggest opportunities using RUM data.
2. Research solutions and formulate hypotheses.
3. Test changes with tools like WebPageTest before deployment.
4. Implement only validated improvements.
5. Monitor results post-deployment to confirm real-world gains.

**Organizational requirements:** a designated performance champion with decision-making authority, a cross-functional team (Development, Design, Marketing), leadership support to resolve priority conflicts.

**Testing strategy:** use RUM as the primary signal (Shopify Web Performance Dashboard or Chrome UX Report), compare current metrics against baseline regularly, catch regressions early via scheduled reviews, validate fixes with lab data before and field data after deployment.

### Quick checklist

- [ ] Establish a field-data baseline (Shopify Web Performance Dashboard / CrUX) before making any changes.
- [ ] Never lazy-load the LCP image; set `fetchpriority="high"` on it instead.
- [ ] Ensure no fade-in/reveal animation hides the LCP element.
- [ ] Server-side render hero/product/nav content rather than injecting it via client JS.
- [ ] Avoid deeply nested Liquid loops that scale quadratically with catalog size.
- [ ] Set explicit width/height on all images to prevent CLS.
- [ ] Defer or async all non-critical, parser-blocking scripts.
- [ ] Self-host assets instead of pulling from remote/third-party domains.
- [ ] Run `shopify theme check` (and `--auto-correct`) regularly; configure `.theme-check.yml` thresholds (100KB CSS / 10KB JS defaults, 250-item pagination default).
- [ ] Wire up the Shopify Lighthouse CI GitHub Action on pull requests (target: performance ≥ 0.6, accessibility ≥ 0.9 by default; Theme Store minimum average is 60).
- [ ] Profile INP-heavy interactions (variant selectors, cart drawer, mega menu, search, filters) with Chrome DevTools under 4x CPU throttling; target INP ≤ 200ms (poor > 500ms) at the 75th percentile.
- [ ] Rank JS offenders via Lighthouse Treemap (bytes), Chrome DevTools Performance (scripting time), and WebPageTest (blocking time); remove or replace the worst.
- [ ] Audit installed apps for necessity and duplicate functionality; confirm removed apps stop injecting code.
- [ ] Watch for fake "speed" apps: compare PageSpeed Insights vs. local Lighthouse (>20-point gap is a red flag), inspect for LCP-hijacking elements and fingerprinting code (`"Linux x86_64"` / hex-obfuscated variants) in `theme.liquid` and meta-tag snippets.
- [ ] Assign a performance owner/champion and put the measure → hypothesize → test → implement → monitor cycle on a recurring schedule to prevent regression.


---

