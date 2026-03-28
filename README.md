# websites

Front-end demos and experiments that are **not** necessarily the production `digital-designs-analytics` app.

| Path | Description |
|------|-------------|
| [`chart-eval/`](chart-eval/) | **Vite + React** — side-by-side **Plotly.js** vs **ECharts** with PPA-style demo data; good for picking a chart stack before building the real dashboard. |

## Scripts

| Script | Purpose |
|--------|---------|
| [`build-and-push.sh`](build-and-push.sh) | **`npm ci`** if `chart-eval/package-lock.json` exists (else **`npm install`**), optional **`--typecheck`** / **`--clean-dist`**, **`NODE_ENV=production npm run build`**, verify **`dist/`** vs **`/website-trial-v1/`** (override with **`GH_PAGES_BASE`**), then git. Flags: `--use-install`, `--skip-install`, `--no-verify`, `--no-push`, `-n`, `-v`. |

See `docs/WEBSITE_DESIGN.md` for the intended production information architecture.
