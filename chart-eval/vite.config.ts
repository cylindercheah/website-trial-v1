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

// For GitHub project Pages use: base: "/digital-designs-analytics/"
export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      // plotly.js CJS (image trace) uses require('buffer/') — trailing slash matters.
      "buffer/": bufferPkgDir,
    },
  },
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["plotly.js", "buffer"],
  },
});
