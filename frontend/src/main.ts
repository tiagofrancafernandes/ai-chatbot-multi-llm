import { createApp } from 'vue';
import 'iconify-icon';
import 'vue3-toastify/dist/index.css';
import Vue3Toastify, { type ToastContainerOptions } from 'vue3-toastify';
import './assets/main.css';
import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(router);
app.use(Vue3Toastify, {
    autoClose: 3000,
    theme: 'dark',
    position: 'bottom-right',
} as ToastContainerOptions);

app.mount('#app');
