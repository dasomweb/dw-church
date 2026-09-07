import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// base '/admin/' in production: the SPA is served under the /admin path on BOTH
// admin.truelight.app (super-admin) and each tenant's own domain (<tenant>/admin
// for staff), so all hashed assets must resolve under /admin/. Dev stays at '/'.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/admin/' : '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        admin: resolve(__dirname, 'index.html'),
      },
    },
    sourcemap: true,
  },
  server: {
    port: 3001,
  },
}));
