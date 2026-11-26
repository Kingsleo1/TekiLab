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
      {name:'server-secrets-stay-server-side',configResolved(config){if(Object.keys(config.env).some(key=>key.startsWith('VITE_')&&/(TOKEN|SECRET|PASSWORD|PRIVATE_KEY|API_KEY)/i.test(key)&&key!=='VITE_SUPABASE_ANON_KEY'))throw new Error('Private credentials must use server-only environment variables, without the VITE_ prefix.');}},
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
