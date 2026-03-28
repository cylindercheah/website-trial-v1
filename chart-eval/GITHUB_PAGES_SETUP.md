# Host this Vite + React app on GitHub Pages

## Live URL (after deploy)

**`https://sjtu-yongfu-research-grp.github.io/website-trial-v1/#/`**

- Plotly: `…/website-trial-v1/#/plotly`
- ECharts: `…/website-trial-v1/#/echarts`

## One-time GitHub configuration

1. Push this repository to  
   `https://github.com/SJTU-YONGFU-RESEARCH-GRP/website-trial-v1`  

   **Recommended:** run `npm install` locally inside `chart-eval/`, then **commit `chart-eval/package-lock.json`**. That makes CI use `npm ci` (reproducible installs). If the lockfile is missing, the workflow falls back to `npm install`.

   **Optional speed-up:** after the lockfile is in git, you can add npm caching back to `setup-node` in `.github/workflows/deploy-pages.yml` (see comments in that file).

2. In the repo on GitHub: **Settings → Pages**

3. Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”).

4. Push to **`main`** or **`master`**.  
   The workflow **Deploy to GitHub Pages** (in **`.github/workflows/deploy-pages.yml`** at the **repository root**) runs `npm ci` and `npm run build` inside **`chart-eval/`**, then uploads **`chart-eval/dist`**.

5. When the workflow finishes, open **Settings → Pages** again to see the public URL (or use the link above).

## Repo layout requirement

GitHub only loads workflows from **`.github/` at the repo root**.  
This workspace uses:

```text
website-trial-v1/          ← Git repo root
  .github/workflows/       ← workflow here
  chart-eval/              ← Vite app (package.json, src/, …)
```

If you instead publish **only** the contents of `chart-eval/` as the repo root, move `.github/workflows/deploy-pages.yml` into that root and change the workflow to remove `chart-eval/` prefixes and `working-directory` (see comments in a copy of the workflow you keep locally).

## Vite 8 dev warnings

Using **`@vitejs/plugin-react@^5.2.0`** with **`vite@^8`** matches supported peers and avoids the old Babel plugin recommending `plugin-react-oxc`.

If you still see Rolldown-related **deprecation notices**, they are often harmless until Vite stabilizes the new pipeline. To reduce noise you can stay on **Vite 5** + **`@vitejs/plugin-react@^4.3.4`** (see `README.md` troubleshooting).

## Local check before push

```bash
cd chart-eval
npm ci
npm run build
npx vite preview   # optional: smoke-test dist/
```

`vite.config.ts` uses **`base: "./"`** so assets resolve correctly on a **project** Pages URL (`/website-trial-v1/`).
