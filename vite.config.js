import { defineConfig } from 'vite';

export default defineConfig({
  // itch.io serves the game from a nested path — all asset URLs must be relative
  base: './',
  server: {
    host: true,
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
  },
});
