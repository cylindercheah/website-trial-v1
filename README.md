# websites

Front-end demos and experiments that are **not** necessarily the production `digital-designs-analytics` app.

| Path | Description |
|------|-------------|
| [`chart-eval/`](chart-eval/) | **Vite + React** — side-by-side **Plotly.js** vs **ECharts** with PPA-style demo data; good for picking a chart stack before building the real dashboard. |

## Scripts

| Script | Purpose |
|--------|---------|
| [`build-and-push.sh`](build-and-push.sh) | `npm install` + `npm run build` in `chart-eval/`, then `git add -A`, commit if there are changes, and `git push`. Run from repo root: `./build-and-push.sh` or `./build-and-push.sh "feat: update charts"`. |

See `docs/WEBSITE_DESIGN.md` for the intended production information architecture.
