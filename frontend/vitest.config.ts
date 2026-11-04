import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Unit tests only: no PWA plugin, a browser-like DOM, nothing from the network.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
});
