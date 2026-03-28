# Chart evaluation demo (Plotly.js vs ECharts)

Small **Vite + React** app under `websites/chart-eval` to compare **Plotly.js** (basic cartesian bundle) and **Apache ECharts** for PPA-style dashboards (Pareto scatter, dual-axis scaling). Aligns with `docs/WEBSITE_DESIGN.md` (static site + JSON-driven analytics later).

## Run locally

```bash
cd websites/chart-eval
./run.sh install   # once
./run.sh dev       # starts dev server
```

Or use `npm install` / `npm run dev` directly.

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

1. Put **this folder’s contents at the root** of `website-trial-v1` (include `.github/`, `package.json`, `package-lock.json`, `src/`, `index.html`, `vite.config.ts`, etc.).  
   If the repo already has other files, either use a dedicated branch/folder layout and adjust the workflow `working-directory`, or keep the trial repo focused on this app only.
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions** (not “Deploy from branch” unless you switch strategies).
3. Push to **`main`** (or **`master`** — both are listed in the workflow). The workflow **Deploy to GitHub Pages** builds with `npm ci` / `npm run build` and publishes `dist/`.

`vite.config.ts` uses **`base: "./"`** so asset URLs work as a **project site** under `/website-trial-v1/` without hardcoding the repo name.

### Local build check

```bash
./run.sh build
```

Output: `dist/` (same artifact CI uploads).

## Mobile evaluation

| Topic | Plotly (this demo) | ECharts (this demo) |
|--------|--------------------|----------------------|
| Touch | Pinch zoom, drag | Inside zoom + **slider** `dataZoom` on line chart |
| Bundle | Lazy-loaded route; uses `plotly.js-basic-dist` (not full Plotly) | Smaller than Plotly route; canvas rendering |
| Layout | `ResizeObserver` + `Plots.resize` | `media` queries in options for legend/grid |

Try both routes on a phone; ECharts often feels snappier on low-end devices.

## Dependencies note

- `plotly.js-basic-dist` — 2D charts only. Full `plotly.js` adds 3D, geo, etc. (much larger).
- `echarts` + `echarts-for-react` — full ECharts; for production you can switch to **tree-shaken** ECharts core imports to trim size further.
