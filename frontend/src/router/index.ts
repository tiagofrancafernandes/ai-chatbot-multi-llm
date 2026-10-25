import { createRouter, createWebHistory } from 'vue-router';
import HomePortalView from '../views/HomePortalView.vue';
import ClientChatView from '../views/ClientChatView.vue';
import AttendantChatView from '../views/AttendantChatView.vue';
import FlowView from '../views/FlowView.vue';
import KnowledgeView from '../views/KnowledgeView.vue';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'portal',
            component: HomePortalView,
        },
        {
            path: '/chat/cliente',
            name: 'client-chat',
            component: ClientChatView,
        },
        {
            path: '/chat/atendente',
            name: 'attendant-chat',
            component: AttendantChatView,
        },
        {
            path: '/chat/atentende',
            redirect: '/chat/atendente',
        },
        {
            path: '/flow',
            name: 'flow',
            component: FlowView,
        },
        {
            path: '/knowledge',
            name: 'knowledge',
            component: KnowledgeView,
        },
    ],
});

export default router;
