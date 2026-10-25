import { createRouter, createWebHistory } from 'vue-router';
import ChatView from '../views/ChatView.vue';
import FlowView from '../views/FlowView.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'chat',
            component: ChatView,
        },
        {
            path: '/flow',
            name: 'flow',
            component: FlowView,
        },
    ],
});

export default router;
