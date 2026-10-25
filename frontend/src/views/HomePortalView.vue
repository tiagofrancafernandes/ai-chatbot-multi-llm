<script setup lang="ts">
import { RouterLink } from 'vue-router';

interface PortalRoute {
    title: string;
    description: string;
    path: string;
    badge: string;
    badgeClass: string;
    icon: string;
    iconBg: string;
    iconColor: string;
    features: string[];
    actionLabel: string;
}

const routes: PortalRoute[] = [
    {
        title: 'Chat do Cliente',
        description:
            'Visão pública e amigável para visitantes e clientes contratarem planos, consultarem faturas e tirarem dúvidas.',
        path: '/chat/cliente',
        badge: 'Público / Usuário',
        badgeClass: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80',
        icon: 'fa7-solid:comments',
        iconBg: 'bg-emerald-500/10 border-emerald-500/30',
        iconColor: 'text-emerald-400',
        features: [
            'Autoatendimento com IA em linguagem natural',
            'Planos de fibra óptica urbana e rural',
            'Identificação por telefone ou CPF',
            'Sugestões interativas e botões de ação',
        ],
        actionLabel: 'Acessar Chat do Cliente',
    },
    {
        title: 'Console do Atendente',
        description:
            'Painel operacional para atendentes humanos com gaveta de conversas ativas, transferência de filas e retorno para IA.',
        path: '/chat/atendente',
        badge: 'Operacional / SAC',
        badgeClass: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/80',
        icon: 'fa7-solid:headset',
        iconBg: 'bg-cyan-500/10 border-cyan-500/30',
        iconColor: 'text-cyan-400',
        features: [
            'Listagem em tempo real de chats ativos',
            'Transferência para setores ou atendentes',
            'Devolução de conversa para IA',
            'Simulação de mensagens de atendente humano',
            'Seleção de provedor LLM e visualizador de nó',
        ],
        actionLabel: 'Abrir Console do Atendente',
    },
    {
        title: 'Grafo de Decisão (Flow)',
        description:
            'Inspetor da árvore de estados do chatbot com nós de intenção, transições automáticas e ações pendentes.',
        path: '/flow',
        badge: 'Arquitetura',
        badgeClass: 'bg-purple-950/80 text-purple-400 border-purple-800/80',
        icon: 'fa7-solid:diagram-project',
        iconBg: 'bg-purple-500/10 border-purple-500/30',
        iconColor: 'text-purple-400',
        features: [
            'Visualização gráfica de nós e transições',
            'Detecção em 2 níveis (Ollama tev1 + qwen2.5)',
            'Fluxo de confirmação e contratação',
            'Monitoramento de estados em tempo real',
        ],
        actionLabel: 'Explorar Grafo de Decisão',
    },
    {
        title: 'Base de Conhecimento',
        description:
            'Gerenciador de regras comerciais, planos de fibra óptica, áreas de cobertura e resumo com cache otimizado para LLM.',
        path: '/knowledge',
        badge: 'Configurações',
        badgeClass: 'bg-amber-950/80 text-amber-400 border-amber-800/80',
        icon: 'fa7-solid:book-open',
        iconBg: 'bg-amber-500/10 border-amber-500/30',
        iconColor: 'text-amber-400',
        features: [
            'Regras corporativas e horários de atendimento',
            'Planos de fibra urbana e rural cadastrados',
            'Área atendida: Carmo do Cajuru e Salgados MG',
            'Compilação de cache inteligente de contexto',
        ],
        actionLabel: 'Gerenciar Conhecimento',
    },
];
</script>

<template>
    <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Hero Section -->
        <header class="mb-10 text-center sm:text-left">
            <div
                class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/70 text-cyan-400 text-xs font-mono mb-3"
            >
                <iconify-icon icon="fa7-solid:layer-group" class="text-xs"></iconify-icon>
                <span>Visões do Sistema Multi-LLM</span>
            </div>
            <h2 class="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                Portal de Navegação do Chatbot
            </h2>
            <p class="mt-2 text-base text-slate-400 max-w-3xl">
                Selecione abaixo a visão desejada para simular os diferentes perfis de usuário do sistema: cliente
                público em autoatendimento, atendente de SAC humano, arquiteto de fluxo ou gestor de conhecimento.
            </p>
        </header>

        <!-- Cards Grid -->
        <section class="grid grid-cols-1 md:grid-cols-2 gap-6" aria-label="Rotas disponíveis">
            <article
                v-for="item in routes"
                :key="item.path"
                class="flex flex-col justify-between bg-slate-900/70 border border-slate-800/90 rounded-2xl p-6 hover:border-slate-700 hover:shadow-xl hover:shadow-cyan-500/5 transition duration-200"
            >
                <div>
                    <!-- Header with Icon & Badge -->
                    <div class="flex items-center justify-between mb-4">
                        <div
                            class="w-12 h-12 rounded-xl flex items-center justify-center border"
                            :class="[item.iconBg]"
                        >
                            <iconify-icon :icon="item.icon" class="text-2xl" :class="item.iconColor"></iconify-icon>
                        </div>
                        <span
                            class="px-2.5 py-1 rounded-full text-xs font-medium border font-mono"
                            :class="item.badgeClass"
                        >
                            {{ item.badge }}
                        </span>
                    </div>

                    <!-- Title & Description -->
                    <h3 class="text-xl font-bold text-white mb-2">
                        {{ item.title }}
                    </h3>
                    <p class="text-sm text-slate-400 mb-5 leading-relaxed">
                        {{ item.description }}
                    </p>

                    <!-- Features Checklist -->
                    <ul class="space-y-2 mb-6 border-t border-slate-800/80 pt-4">
                        <li
                            v-for="feature in item.features"
                            :key="feature"
                            class="text-xs text-slate-300 flex items-center gap-2"
                        >
                            <iconify-icon
                                icon="fa7-solid:check"
                                class="text-emerald-400 text-xs shrink-0"
                            ></iconify-icon>
                            <span>{{ feature }}</span>
                        </li>
                    </ul>
                </div>

                <!-- Action Button -->
                <RouterLink
                    :to="item.path"
                    class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white border border-slate-700 hover:border-cyan-500 shadow-sm"
                >
                    <span>{{ item.actionLabel }}</span>
                    <iconify-icon icon="fa7-solid:arrow-right" class="text-xs"></iconify-icon>
                </RouterLink>
            </article>
        </section>

        <!-- Operational Architecture Summary -->
        <aside
            class="mt-10 p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
            <div class="flex items-center gap-3">
                <div
                    class="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0"
                >
                    <iconify-icon icon="fa7-solid:shield-halved" class="text-base"></iconify-icon>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-slate-200">Arquitetura de Isolamento de Visões</h4>
                    <p class="text-xs text-slate-400">
                        O Chat do Cliente executa em contexto público seguro sem acesso a controles operacionais,
                        enquanto o Atendente possui ferramentas de gestão de filas e intervenção humana.
                    </p>
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
                <span
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700"
                >
                    <iconify-icon icon="fa7-solid:bolt" class="text-amber-400 text-xs"></iconify-icon>
                    Triage: tev1:0.8b
                </span>
                <span
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700"
                >
                    <iconify-icon icon="fa7-solid:brain" class="text-cyan-400 text-xs"></iconify-icon>
                    Reasoning: qwen2.5:0.5b
                </span>
            </div>
        </aside>
    </main>
</template>
