import { createRequire } from "node:module";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);
/** Directory for `require('buffer/')` in plotly.js CJS (must end with a path separator). */
const bufferPkgDir = path.join(
  path.dirname(require.resolve("buffer/package.json")),
  path.sep,
);

// GitHub **project** Pages serves this app at /website-trial-v1/ (not repo root).
// A relative base ("./") often breaks lazy-loaded chunks when the URL omits a trailing
// slash or the bundler emits absolute /assets/... URLs. Use an explicit prefix in prod.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "production" ? "/website-trial-v1/" : "/",
  resolve: {
    alias: {
      // plotly.js CJS (image trace) uses require('buffer/') — trailing slash matters.
      "buffer/": bufferPkgDir,
    },
  },
  // Do not use `define: { global: "globalThis" }` — it can corrupt identifiers inside
  // dependencies and yield a blank page. Use index.html + main.tsx shims instead.
  optimizeDeps: {
    include: ["plotly.js", "buffer"],
  },
}));
