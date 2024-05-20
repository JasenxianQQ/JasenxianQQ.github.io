import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@three': path.resolve(__dirname, 'node_modules/three'),
      '@controls': path.resolve(__dirname, 'node_modules/camera-controls'),
      '@examples': path.resolve(__dirname, 'node_modules/three/examples/jsm')
    }
  },
  build: {
    rollupOptions: {
      external: [
        '@three/build/three.module.js',
        '@controls/dist/camera-controls.module.js',
        '@examples/loaders/GLTFLoader.js',
        '@examples/controls/TransformControls.js',
        '@examples/webxr/VRButton.js'
      ]
    }
  }
});
