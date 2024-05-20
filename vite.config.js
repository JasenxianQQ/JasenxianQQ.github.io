// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/', // 顶级用户或组织页面的基础路径
  resolve: {
    alias: {
      '@three': resolve(__dirname, 'node_modules/three'),
      '@controls': resolve(__dirname, 'node_modules/camera-controls'),
    },
  },
});
