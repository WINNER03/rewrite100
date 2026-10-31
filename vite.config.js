import { defineConfig } from 'vite';

export default defineConfig({
  base: '/rewrite100/',
  server: {
    port: 5173,
    strictPort: true,
  },
});
