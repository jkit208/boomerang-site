# useboomerang.ai

Static marketing site for Boomerang. Zero dependencies: `node build.mjs` writes `./dist`.

## Where things live
- `site.config.json`: **the only place** prices, stats (with sources), industries, links and calculator defaults live.
- `build.mjs`: page templates (home, pricing, calculator, statistics, 6 industry pages, privacy, 404, sitemap, robots).
- `src/assets/`: CSS and JS (calculator, animated demo player, Trust Dial).
- `public/`: favicon and social share image, copied as-is.

## Change something
1. Edit `site.config.json` (or a template in `build.mjs`).
2. `npm run dev` and check http://localhost:8787
3. Commit and push to `main`. Cloudflare Pages rebuilds and deploys in about a minute.

## Adding an industry page
Add an object to `industries` in `site.config.json` (copy an existing one). It gets its own page, demo conversation, calculator defaults, sitemap entry and footer link automatically.

## Pre-launch / price-change checklist
- [ ] Prices in `site.config.json` match Stripe live prices for lookup_keys `boomerang_core_monthly`, `boomerang_pro_monthly`, `boomerang_*_annual`, `boomerang_setup_fee`.
- [ ] Trial days and setup fee match the checkout copy and the onboarding email.
- [ ] Dashboard upsell modal and in-app FAQs show the same prices.
- [ ] Every stat still links to a page that loads.
- [ ] `signupUrl` opens the current Tally onboarding form.

## Hosting (Cloudflare Pages)
Build command `node build.mjs`, output directory `dist`, production branch `main`.
