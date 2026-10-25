import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        vue({
            template: {
                compilerOptions: {
                    isCustomElement: (tag) => tag === 'iconify-icon',
                },
            },
        }),
        tailwindcss(),
    ],
    server: {
        port: 5173,
        host: true,
        proxy: {
            '/api': {
                target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
                changeOrigin: true,
            },
        },
    },
});
