import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ═══════════════════════════════════════════════════════════════
  // PRODUCTION: Rimuovi console.log e debugger per sicurezza
  // In dev (npm run dev) → vedi tutto
  // In prod (npm run build) → zero log, zero segreti esposti
  // ═══════════════════════════════════════════════════════════════
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
