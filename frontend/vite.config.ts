// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Polyfills for Node globals
import inject from "@rollup/plugin-inject";

export default defineConfig({
  plugins: [
    react(),
    // Inject Buffer globally
    inject({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    }),
  ],
  resolve: {
    alias: {
      // Alias "@sdk" to point to your SDK source folder
      "@sdk": path.resolve(__dirname, "../sdk/src"),
      process: "process/browser",
      buffer: "buffer",
    },
  },
  define: {
    // Define process.env to avoid "process is not defined" error
    "process.env": {},
  },
  server: {
    port: 5173,
    open: true,
  },
});
