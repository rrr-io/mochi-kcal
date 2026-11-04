import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: false,
      manifest: {
        name: "Mochi Kcal",
        short_name: "Mochi Kcal",
        description: "My kawaii calorie diary",
        lang: "en",
        start_url: "/",
        display: "standalone",
        background_color: "#F3FBF9",
        theme_color: "#F3FBF9",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      injectManifest: { globPatterns: ["**/*.{js,css,html,png,svg,woff2}"], globIgnores: ["splash/**"] }, // iOS reads launch images itself
    }),
  ],
  server: { proxy: { "/api": "http://localhost:3000" } },
});
