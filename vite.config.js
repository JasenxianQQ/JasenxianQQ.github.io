import { defineConfig } from 'vite';
import alias from '@rollup/plugin-alias';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@three': path.resolve(__dirname, 'node_modules/three'),
      '@controls': path.resolve(__dirname, 'node_modules/camera-controls'),
    },
  },
  build: {
    rollupOptions: {
      external: [
        '@three/build/three.module.js',
        '@controls/dist/camera-controls.module.js',
        '@three/examples/jsm/loaders/GLTFLoader.js',
        '@three/examples/jsm/controls/TransformControls.js',
        '@three/examples/jsm/webxr/VRButton.js'
      ]
    }
  }
});
