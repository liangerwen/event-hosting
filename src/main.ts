import { createApp } from "vue";
import ArcoVue from "@arco-design/web-vue";
import App from "./App.vue";
import ArcoVueIcon from "@arco-design/web-vue/es/icon";
import "@arco-design/web-vue/dist/arco.css";
import "virtual:uno.css";
import './global.css'

createApp(App).use(ArcoVue).use(ArcoVueIcon).mount("#app");
