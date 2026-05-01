// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Keep chunks small for low-data Android devices
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy deps into separate chunks (loaded on demand)
          "supabase": ["@supabase/supabase-js"],
          "vendor":   ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true, // expose on local network for testing on real Android
  },
});
