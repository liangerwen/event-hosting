import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
import monacoEditorPlugin from "vite-plugin-monaco-editor";
import { dependencies } from "./package.json";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    monacoEditorPlugin({
      languageWorkers: ["editorWorkerService", "typescript", "json", "css"],
    }),
    UnoCSS(),
  ],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: "[ext]/[name]-[hash].[ext]",
        chunkFileNames: "js/[name]-[hash].js",
        entryFileNames: "js/[name]-[hash].js",
        manualChunks: Object.keys(dependencies).reduce((pre, cur) => {
          pre[cur] = [cur];
          return pre;
        }, {} as { [chunkAlias: string]: string[] }),
      },
    },
  },
});
