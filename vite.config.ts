import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the site from https://<user>.github.io/little-island-game/
  base: '/little-island-game/',
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 1600 },
});
