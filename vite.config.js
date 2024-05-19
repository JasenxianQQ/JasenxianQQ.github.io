// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@three': resolve(__dirname, 'node_modules/three'),
      '@controls': resolve(__dirname, 'node_modules/camera-controls'),
    },
  },
});
