import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import UnoCSS from "unocss/vite";
import monacoEditorPlugin from "vite-plugin-monaco-editor";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    monacoEditorPlugin({
      languageWorkers: ["editorWorkerService", "typescript", "json", "css"],
    }),
    UnoCSS(),
  ],
});
