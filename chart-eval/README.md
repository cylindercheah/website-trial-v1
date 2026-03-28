# Chart evaluation demo (Plotly.js vs ECharts)

Small **Vite + React** app under `websites/chart-eval` to compare **Plotly.js** (basic cartesian bundle) and **Apache ECharts** for PPA-style dashboards (Pareto scatter, dual-axis scaling). Aligns with `docs/WEBSITE_DESIGN.md` (static site + JSON-driven analytics later).

## Run locally

```bash
cd chart-eval   # or your clone path
./run.sh install   # once
./run.sh dev       # starts dev server
```

Or use `npm install` / `npm run dev` directly.

### If `npm install` fails with `ERESOLVE` (Vite vs `@vitejs/plugin-react`)

**Vite 8** needs **`@vitejs/plugin-react@^5.2.0`** (this repo uses that pair). If you still see conflicts:

```bash
rm -f package-lock.json
npm install
```

**Optional (fewer Vite 8 / Rolldown warnings):** use **Vite 5** + **`@vitejs/plugin-react@^4.3.4`** instead; change `package.json` and regenerate the lockfile as above.

### How to view in the browser

1. After `./run.sh dev`, Vite prints a local URL (usually **`http://127.0.0.1:5173`**).
2. Open that URL in Chrome, Firefox, or Safari. The dev server uses **`--host 0.0.0.0`**, so Vite also prints a **Network** URL (e.g. `http://192.168.x.x:5173`) — use that on your phone on the same Wi‑Fi.
3. This app uses **hash routes** (works on GitHub Pages without server rewrites). Append:
   - **`/#/`** — Home  
   - **`/#/plotly`** — Plotly charts  
   - **`/#/echarts`** — ECharts charts  

Examples:

- `http://127.0.0.1:5173/#/`
- `http://127.0.0.1:5173/#/plotly`

### Shell helper

| Command | What it runs |
|---------|----------------|
| `./run.sh install` | `npm install` |
| `./run.sh dev` | `npm run dev` |
| `./run.sh build` | `npm run build` → `dist/` |
| `./run.sh preview` | `npm run preview` (serves `dist/` after a build) |
| `./run.sh` or `./run.sh --help` | Show usage |

## Host on GitHub Pages (`website-trial-v1`)

Target repo: **[github.com/SJTU-YONGFU-RESEARCH-GRP/website-trial-v1](https://github.com/SJTU-YONGFU-RESEARCH-GRP/website-trial-v1)**

After deployment, the site URL will be:

**`https://sjtu-yongfu-research-grp.github.io/website-trial-v1/#/`**  
(Plotly: `…/website-trial-v1/#/plotly` · ECharts: `…/website-trial-v1/#/echarts`)

### One-time setup

Full checklist: **`GITHUB_PAGES_SETUP.md`** in this folder.

Summary:

1. GitHub only reads **`.github/workflows/` at the repository root**. In this monorepo layout, the workflow lives in **`website-trial-v1/.github/workflows/deploy-pages.yml`** and builds the app in **`chart-eval/`**.
2. On GitHub: **Settings → Pages → Source: GitHub Actions**.
3. Push **`main`** or **`master`**. CI runs `npm ci` + `npm run build` inside **`chart-eval/`** and deploys **`chart-eval/dist`**.

`vite.config.ts` uses **`base: "./"`** so assets work on **`/website-trial-v1/`** project Pages.

### Local build check

```bash
./run.sh build
```

Output: `dist/` (same artifact CI uploads).

## Mobile evaluation

| Topic | Plotly (this demo) | ECharts (this demo) |
|--------|--------------------|----------------------|
| Touch | Pinch zoom, drag | Inside zoom + **slider** `dataZoom` on line chart |
| Bundle | Lazy-loaded route; **`plotly.js-dist-min`** (full Plotly, browser build) | Smaller than Plotly route; canvas rendering |
| Layout | `ResizeObserver` + `Plots.resize` | `media` queries in options for legend/grid |

Try both routes on a phone; ECharts often feels snappier on low-end devices.

## Dependencies note

- `plotly.js-dist-min` — official **pre-minified browser bundle** (same feature set as full `plotly.js`, including 3D / sankey / parcoords / treemap). We import this instead of `plotly.js` so Vite does not bundle Node-only trace code that breaks at runtime under Rolldown. Types still come from `@types/plotly.js`.
- `echarts` + `echarts-for-react` — full ECharts; for production you can switch to **tree-shaken** ECharts core imports to trim size further.
