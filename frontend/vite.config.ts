// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Alias "@sdk" to point to your SDK source folder
      "@sdk": path.resolve(__dirname, "../sdk/src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
