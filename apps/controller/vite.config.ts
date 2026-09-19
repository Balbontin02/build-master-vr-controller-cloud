import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const isVercel = process.env.VERCEL === '1';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  build: {
    outDir: isVercel ? path.resolve(__dirname, '../../dist') : 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
  },
});