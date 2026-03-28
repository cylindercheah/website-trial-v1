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

## Troubleshooting: deploy job `404` / `Failed to create deployment`

The **`actions/deploy-pages`** step calls GitHub’s Pages API. A **404** usually means Pages is **not enabled** for this repo or **not** wired to **GitHub Actions**.

### Fix (repository)

1. Open **`https://github.com/SJTU-YONGFU-RESEARCH-GRP/website-trial-v1/settings/pages`**
2. Under **Build and deployment**:
   - **Source** must be **GitHub Actions** (not *Deploy from a branch*).
3. Click **Save** if you changed anything.
4. Re-run the failed workflow (**Actions** → failed run → **Re-run all jobs**).

Until Source is **GitHub Actions**, the API has nothing to deploy to and returns **Not Found (404)**.

### Fix (organization)

If the repo is under an **organization**, an owner may need to allow Pages:

- **Organization → Settings → Member privileges** (or **Actions / Pages** policies): ensure **GitHub Pages** is allowed for repositories.
- Some orgs restrict who can enable Pages; you need **admin** on the repo (or org owner) to turn it on.

### Private repository

On **free** GitHub plans, **private** repos often **cannot** publish a **public** GitHub Pages site without a paid feature. If `website-trial-v1` is private:

- **Make the repo public**, or  
- Use **GitHub Enterprise / Team** features your org pays for, or  
- Host the built `dist/` elsewhere (e.g. Cloudflare Pages).

### First deploy and `github-pages` environment

The workflow uses the **`github-pages`** environment. The first time, GitHub may ask you to **approve** deployment rules (e.g. wait for approval). Check:

- **Settings → Environments → github-pages**

If a protection rule blocks deployment, adjust it or approve the pending deployment in the Actions run.

### Verify build job succeeded

The **deploy** job only runs after **build** uploads the artifact. If **build** failed, fix that first; a misleading error can sometimes follow a partial run—always check the **build** job logs.
