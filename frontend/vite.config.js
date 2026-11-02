import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3002' },
    // In WSL, edits made from Windows to /mnt/c/... raise no file events, so poll instead.
    watch: process.env.WSL_DISTRO_NAME ? { usePolling: true, interval: 300 } : undefined
  }
});
