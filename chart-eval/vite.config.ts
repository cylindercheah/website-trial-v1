import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub **project** Pages serves this app at /website-trial-v1/ (not repo root).
// Use an explicit prefix in prod so lazy chunks load from the right path.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "production" ? "/website-trial-v1/" : "/",
  // plotly.js-dist-min is a browser bundle; do not bundle raw `plotly.js` (pulls Node
  // shims like stream/buffer that break under Rolldown with "undefined.prototype").
  optimizeDeps: {
    include: ["plotly.js-dist-min"],
  },
}));
