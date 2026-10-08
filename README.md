# SEO Decision Engine

Free, client-side tool that turns a Google Search Console CSV into prioritized SEO opportunities. HTML + CSS + vanilla JS. No backend, no APIs, no tracking. Data is processed locally in the browser.

## Run locally
Open `index.html` in a browser, or run `python3 -m http.server` in this folder.

## Deploy free on GitHub Pages
1. Create a GitHub repository and upload `index.html`, `styles.css`, `app.js`, `README.md` to the root.
2. Go to **Settings → Pages**, set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
3. Your site appears at `https://<username>.github.io/<repo>/` after about a minute.

## Deploy free on Cloudflare Pages
1. Push the files to a Git repository.
2. In Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**.
3. Framework preset: **None**. Build command: leave empty. Output directory: `/`.
4. Deploy. (Or choose **Direct Upload** and drop the folder.)

## Input
CSV with `Query` and/or `Page`, plus `Clicks`, `Impressions`, `Position` (CTR optional, recalculated from clicks/impressions). Header names are matched ignoring case and spacing; comma, semicolon and tab delimiters are supported. A standard Query-only or Page-only export works, but query×page data unlocks cannibalization and internal-link detection.

## Methodology (heuristics, not Google data)
- **SEO Opportunity Score (0–100)** is a proprietary heuristic: impressions (25), estimated click gain (30), position (18), CTR gap (10), clicks (7), page/query relationship (10). Priority: High ≥ 70, Medium ≥ 45.
- Estimated gain uses a generic CTR-by-position curve, not your site's data. It is an estimate, not a forecast or a ranking promise.
- Rules: Quick Win (pos 4–15), CTR (pos ≤ 10 with CTR < 70% of curve), Content (pos 15–40), Internal Link (page with 3+ queries at pos 5–20), Cannibalization (2+ URLs sharing a query), Low-Value (many impressions, <1% CTR).
- Minimum impressions threshold adapts to the dataset (40th percentile, at least 10).

Not affiliated with Google.
