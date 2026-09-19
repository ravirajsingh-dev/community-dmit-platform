import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config({ path: "../.env" });

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: process.env.VITE_APP_ADMIN_PORT || 3001,
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
      "@assets": "/src/assets",
      "@actions": "/src/actions",
      "@middlewares": "/src/middlewares",
      "@config": "/src/config",
      "@reducers": "/src/reducers",
      "@utils": "/src/utils",
      "@user": "/src/view/user",
    },
  },
});
