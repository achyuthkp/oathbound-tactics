import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// viteSingleFile inlines all JS/CSS into dist/index.html so the built game
// can be opened straight from disk (file://) with no server.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
});
