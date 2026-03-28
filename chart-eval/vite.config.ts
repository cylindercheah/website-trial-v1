import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// For GitHub project Pages use: base: "/digital-designs-analytics/"
export default defineConfig({
  plugins: [react()],
  base: "./",
});
