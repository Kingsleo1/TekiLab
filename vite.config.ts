import {fileURLToPath} from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    define: {'import.meta.env.VITE_HOSTED_DEMO': JSON.stringify(process.env.TEKILAB_HOSTED_DEMO === 'true' || process.env.VERCEL === '1')},
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'spa-404-fallback',
        closeBundle() {
          try {
            const distDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist');
            const indexFile = path.join(distDir, 'index.html');
            const fallbackFile = path.join(distDir, '404.html');
            if (fs.existsSync(indexFile)) {
              fs.copyFileSync(indexFile, fallbackFile);
            }
          } catch {}
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(fileURLToPath(new URL('.', import.meta.url)), '.'),
        react: path.resolve(fileURLToPath(new URL('.', import.meta.url)), './node_modules/react'),
        'react-dom': path.resolve(fileURLToPath(new URL('.', import.meta.url)), './node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
