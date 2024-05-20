import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@three': path.resolve(__dirname, 'node_modules/three'),
      '@controls': path.resolve(__dirname, 'node_modules/camera-controls'),
      '@examples': path.resolve(__dirname, 'node_modules/three/examples/jsm')
    }
  }
});
