import './assets/main.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
import axios from 'axios';
import markdownDirective from './directives/markdown-directive';
import { initializeAppData } from './helpers/initializeAuth';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.directive('markdown', markdownDirective);

// 인증 상태 초기화 후 앱 마운트
initializeAppData().then(() => {
    app.mount('#app');
});

axios.defaults.withCredentials = true;
