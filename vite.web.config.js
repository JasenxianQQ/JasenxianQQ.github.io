// vite.web.config.js
import { defineConfig } from "vite";
import path from "path";
import vitePluginImp from "vite-plugin-imp";
const resolve = (url) => path.resolve(__dirname, url);

export default defineConfig({
  plugins: [
    vitePluginImp({
      libList: [
        {
          libName: "three",
          libDirectory: "src",
          camel2DashComponentName: false,
        },
      ],
    }),
  ],
  css: {
    modules: {
      generateScopedName: "[name]__[local]__[hash:5]",
    },
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
  build: {
    outDir: "dist", // 确保输出目录为 dist
    rollupOptions: {
      input: {
        main: resolve("index.html"),
      },
    },
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  base: "/", // 顶级用户或组织页面的基础路径
});
