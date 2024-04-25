import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./assets/tailwind.css";
import "@icon-park/vue-next/styles/index.css";
import "highlight.js/styles/dark.css";
import "./assets/global.css"

const app = createApp(App);

app.config.compilerOptions.isCustomElement = (tag) => {
  console.log("Checking tag:", tag); // This will log if the check is actually being performed
  return tag === 'close-one';
};

app.use(router).mount("#app");
