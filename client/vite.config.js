import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import dotenv from "dotenv";

// Load env: base .env first, then .env.prod for production builds so VITE_* are correct at build time.
dotenv.config({ path: "../.env" });
if (process.env.NODE_ENV === "production" || process.env.DEP_ENV === "prod") {
  dotenv.config({ path: "../.env.prod" });
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: process.env.VITE_APP_PORT || 3000,
    proxy: {
      "/api": {
        target: process.env.VITE_APP_SERVER_URL || "http://server:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "redux-vendor": ["redux", "react-redux", "@reduxjs/toolkit"],
          "ui-vendor": ["react-bootstrap", "bootstrap"],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
  resolve: {
    extensions: [".js", ".jsx", ".json"],
    alias: {
      "@src": "/src",
      "@views": "/src/views",
      "@assets": "/src/assets",
      "@actions": "/src/actions",
      "@middlewares": "/src/middlewares",
      "@config": "/src/config",
      "@reducers": "/src/reducers",
      "@utils": "/src/utils",
      "@layout": "/src/views/Layout",
    },
  },
});
