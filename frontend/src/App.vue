<script setup lang="ts">
import { RouterView, RouterLink, useRoute } from 'vue-router';

const route = useRoute();
</script>

<template>
    <div class="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <!-- Top Navigation Bar -->
        <header class="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <RouterLink to="/" class="flex items-center gap-3 hover:opacity-90 transition">
                    <div
                        class="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20"
                    >
                        <iconify-icon icon="fa7-solid:robot" class="text-xl text-white"></iconify-icon>
                    </div>
                    <div>
                        <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                            Multi-LLM Intent Bot
                            <span
                                class="text-xs bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full font-mono font-medium"
                            >
                                SystemOne
                            </span>
                        </h1>
                        <p class="text-xs text-slate-400">Ollama · Gemini · OpenAI · Jev Decision Graph</p>
                    </div>
                </RouterLink>

                <!-- Navigation Tabs -->
                <nav class="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
                    <RouterLink
                        to="/"
                        class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1.5"
                        :class="
                            route.name === 'portal'
                                ? 'bg-cyan-600 text-white shadow'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        "
                    >
                        <iconify-icon icon="fa7-solid:layer-group" class="text-sm"></iconify-icon>
                        <span class="hidden sm:inline">Portal</span>
                    </RouterLink>

                    <RouterLink
                        to="/chat/cliente"
                        class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1.5"
                        :class="
                            route.name === 'client-chat'
                                ? 'bg-cyan-600 text-white shadow'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        "
                    >
                        <iconify-icon icon="fa7-solid:comments" class="text-sm"></iconify-icon>
                        <span>Cliente</span>
                    </RouterLink>

                    <RouterLink
                        to="/chat/atendente"
                        class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1.5"
                        :class="
                            route.name === 'attendant-chat'
                                ? 'bg-cyan-600 text-white shadow'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        "
                    >
                        <iconify-icon icon="fa7-solid:headset" class="text-sm"></iconify-icon>
                        <span>Atendente</span>
                    </RouterLink>

                    <RouterLink
                        to="/flow"
                        class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1.5"
                        :class="
                            route.name === 'flow'
                                ? 'bg-cyan-600 text-white shadow'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        "
                    >
                        <iconify-icon icon="fa7-solid:diagram-project" class="text-sm"></iconify-icon>
                        <span class="hidden md:inline">Flow Graph</span>
                    </RouterLink>

                    <RouterLink
                        to="/knowledge"
                        class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1.5"
                        :class="
                            route.name === 'knowledge'
                                ? 'bg-cyan-600 text-white shadow'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        "
                    >
                        <iconify-icon icon="fa7-solid:book-open" class="text-sm"></iconify-icon>
                        <span class="hidden md:inline">Conhecimento</span>
                    </RouterLink>
                </nav>
            </div>
        </header>

        <!-- Main Workspace -->
        <main class="flex-1 flex flex-col w-full">
            <RouterView />
        </main>
    </div>
</template>
