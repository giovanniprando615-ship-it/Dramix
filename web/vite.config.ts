import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath, URL } from 'node:url';

// `npm run build`        -> site estático com PWA (instalável no celular), em dist/
// `npm run build:single` -> um único dramix.html que abre com duplo clique, em dist-single/
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    plugins: [
      react(),
      single
        ? viteSingleFile()
        : VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icon.svg'],
            manifest: {
              name: 'DRAMIX — Minisséries',
              short_name: 'DRAMIX',
              description: 'Minisséries em episódios curtos. 5 episódios grátis em cada história.',
              lang: 'pt-BR',
              theme_color: '#060810',
              background_color: '#060810',
              display: 'standalone',
              orientation: 'portrait',
              start_url: './',
              icons: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
              ]
            },
            workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] }
          })
    ],
    build: { outDir: single ? 'dist-single' : 'dist', chunkSizeWarningLimit: 900 },
    test: { environment: 'node', include: ['src/**/*.test.ts'] }
  };
});
