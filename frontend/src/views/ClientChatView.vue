<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { toast } from 'vue3-toastify';
import { ApiService } from '../services/api';
import { Customer, ChatMessage, ChatSession } from '../types/chat';
import { renderMarkdown } from '../utils/markdown';
import { formatRelativeTime, formatIsoWithTimezone } from '../utils/date-format';

const STORAGE_KEY = 'chat_client_session_id';

const session = ref<ChatSession | null>(null);
const messages = ref<ChatMessage[]>([]);
const inputRef = ref<HTMLInputElement | null>(null);
const customer = ref<Customer | null>(null);
const currentCustomerId = ref<string>('');
const inputText = ref<string>('');
const isLoading = ref<boolean>(false);
const isAccountModalOpen = ref<boolean>(false);
const messagesContainer = ref<HTMLDivElement | null>(null);

const attendance = computed(() => session.value?.attendance);

const quickSuggestions = [
    { label: 'Ver Planos Fibra', text: 'Quero ver os planos de internet fibra' },
    { label: 'Planos Rurais', text: 'Ver planos para área rural' },
    { label: 'Qual meu plano?', text: 'Qual é o meu plano atual?' },
    { label: 'Cobertura', text: 'Vocês atendem em Carmo do Cajuru e Salgados?' },
    { label: 'Segunda Via Fatura', text: 'Gostaria de ver minhas faturas e código PIX' },
    { label: 'Horário e Endereço', text: 'Qual o endereço e horário de atendimento da loja?' },
    { label: 'Falar com Atendente', text: 'Quero falar com um atendente humano' },
];

onMounted(async () => {
    await initSession();
    await focusMessageInput();
});

async function focusMessageInput(): Promise<void> {
    await nextTick();
    if (inputRef.value) {
        inputRef.value.focus();
    }
}

async function scrollToBottom(): Promise<void> {
    await nextTick();
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
}

async function initSession(): Promise<void> {
    const storedId = localStorage.getItem(STORAGE_KEY);

    if (storedId) {
        currentCustomerId.value = storedId;
    }

    try {
        isLoading.value = true;
        const result = await ApiService.initChat(currentCustomerId.value || undefined, undefined, undefined, 'client');

        customer.value = result.customer;
        currentCustomerId.value = result.customer.id;
        localStorage.setItem(STORAGE_KEY, result.customer.id);

        session.value = result.session;
        messages.value = (result.session.messages || []).filter((m) => !m.isInternal);

        await focusMessageInput();
        await scrollToBottom();
    } catch (error) {
        toast.error(`Não foi possível iniciar o chat: ${(error as Error).message}`);
    } finally {
        isLoading.value = false;
        await focusMessageInput();
    }
}

async function handleSendMessage(customText?: string): Promise<void> {
    const textToSend = (customText || inputText.value).trim();

    if (!textToSend) {
        await focusMessageInput();
        return;
    }

    if (isLoading.value) {
        await focusMessageInput();
        return;
    }

    inputText.value = '';
    await focusMessageInput();

    const tempUserMsg: ChatMessage = {
        id: `temp_${Date.now()}`,
        sender: 'user',
        text: textToSend,
        timestamp: Date.now(),
    };

    messages.value.push(tempUserMsg);
    await scrollToBottom();

    try {
        isLoading.value = true;
        const result = await ApiService.sendMessage(
            currentCustomerId.value,
            textToSend,
            undefined,
            undefined,
            'client'
        );

        customer.value = result.customer;

        if (result.customer.id !== currentCustomerId.value) {
            currentCustomerId.value = result.customer.id;
            localStorage.setItem(STORAGE_KEY, result.customer.id);
            toast.success(`Identificado com sucesso: ${result.customer.name || result.customer.id}`);
        }

        session.value = result.session;
        messages.value = (result.session.messages || []).filter((m) => !m.isInternal);

        await scrollToBottom();
    } catch (error) {
        toast.error(`Falha no envio da mensagem: ${(error as Error).message}`);
    } finally {
        isLoading.value = false;
        await focusMessageInput();
    }
}

async function handleResetSession(): Promise<void> {
    const confirmReset = window.confirm('Deseja iniciar uma nova conversa do zero?');
    if (!confirmReset) {
        return;
    }

    try {
        isLoading.value = true;
        const result = await ApiService.resetSession(currentCustomerId.value);

        currentCustomerId.value = result.newCustomerId;
        localStorage.setItem(STORAGE_KEY, result.newCustomerId);

        const initResult = await ApiService.initChat(result.newCustomerId);
        customer.value = initResult.customer;
        session.value = initResult.session;
        messages.value = initResult.session.messages;

        toast.info('Nova conversa iniciada!');
        await scrollToBottom();
    } catch (error) {
        toast.error(`Erro ao reiniciar conversa: ${(error as Error).message}`);
    } finally {
        isLoading.value = false;
        await focusMessageInput();
    }
}

function handleOptionClick(optionText: string): void {
    handleSendMessage(optionText);
}
</script>

<template>
    <main class="flex-1 max-w-5xl w-full mx-auto px-4 py-4 sm:py-6 flex flex-col h-[calc(100vh-4rem)]">
        <!-- Client Chat Header -->
        <header
            class="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-4 shadow-lg backdrop-blur flex items-center justify-between gap-4"
        >
            <div class="flex items-center gap-3">
                <div class="relative">
                    <div
                        class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-md shadow-cyan-500/20"
                    >
                        <iconify-icon icon="fa7-solid:tower-broadcast" class="text-2xl text-white"></iconify-icon>
                    </div>
                    <span
                        class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full"
                        title="Online"
                    ></span>
                </div>
                <div>
                    <h2 class="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        Minha Internet Fibra
                        <span
                            class="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono"
                        >
                            Online
                        </span>
                    </h2>
                    <p class="text-xs text-slate-400">
                        Atendimento Virtual Inteligente · Carmo do Cajuru & Salgados MG
                    </p>
                </div>
            </div>

            <div class="flex items-center gap-2">
                <!-- Customer Status Pill -->
                <button
                    type="button"
                    @click="isAccountModalOpen = true"
                    class="px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5"
                    :class="
                        customer?.isIdentified
                            ? 'bg-cyan-950/80 border-cyan-800 text-cyan-300 hover:bg-cyan-900/80'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    "
                >
                    <iconify-icon
                        :icon="customer?.isIdentified ? 'fa7-solid:user-check' : 'fa7-solid:user'"
                        class="text-sm"
                    ></iconify-icon>
                    <span class="max-w-[120px] truncate">
                        {{ customer?.name || 'Visitante' }}
                    </span>
                </button>

                <!-- New Conversation Button -->
                <button
                    type="button"
                    @click="handleResetSession"
                    title="Iniciar nova conversa"
                    class="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 shadow-sm"
                >
                    <iconify-icon icon="fa7-solid:arrows-rotate" class="text-xs"></iconify-icon>
                    <span class="hidden sm:inline">Nova Conversa</span>
                </button>
            </div>
        </header>

        <!-- Attendance Notification Banner (Human / Queue) -->
        <div
            v-if="attendance && attendance.mode !== 'ai'"
            class="mb-3 px-4 py-2.5 rounded-xl border flex items-center justify-between text-xs transition"
            :class="
                attendance.mode === 'human_active'
                    ? 'bg-blue-950/70 border-blue-800/80 text-blue-200'
                    : 'bg-amber-950/70 border-amber-800/80 text-amber-200'
            "
        >
            <div class="flex items-center gap-2">
                <iconify-icon
                    :icon="attendance.mode === 'human_active' ? 'fa7-solid:headset' : 'fa7-solid:clock'"
                    class="text-base"
                ></iconify-icon>
                <span v-if="attendance.mode === 'human_active'">
                    Você está em atendimento com o operador
                    <strong>{{ attendance.assignedTo.name }}</strong>
                    ({{ attendance.assignedTo.department }}).
                </span>
                <span v-if="attendance.mode === 'human_queued'">
                    Você está na fila de espera do setor
                    <strong>{{ attendance.queue?.departmentName }}</strong>
                    (Posição {{ attendance.queue?.position }}º). Em instantes um operador assumirá seu chat.
                </span>
            </div>
            <span class="text-[11px] opacity-75 hidden sm:inline">Atendimento Humano em Andamento</span>
        </div>

        <!-- Chat Stream Area -->
        <div
            ref="messagesContainer"
            class="flex-1 overflow-y-auto pr-1 space-y-4 mb-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 p-4 scroll-smooth"
        >
            <!-- Welcome Bot Greeting if empty -->
            <div v-if="messages.length === 0" class="text-center py-12">
                <div
                    class="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4"
                >
                    <iconify-icon icon="fa7-solid:comments" class="text-3xl"></iconify-icon>
                </div>
                <h3 class="text-lg font-bold text-white mb-1">Como podemos te ajudar hoje?</h3>
                <p class="text-sm text-slate-400 max-w-md mx-auto">
                    Consulte planos de internet fibra óptica, tire dúvidas sobre cobertura, 2ª via de fatura ou contrate
                    novos serviços.
                </p>
            </div>

            <!-- Messages List -->
            <div
                v-for="msg in messages"
                :key="msg.id"
                class="flex flex-col"
                :class="msg.sender === 'user' ? 'items-end' : 'items-start'"
            >
                <!-- Message Bubble -->
                <div
                    class="max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-md"
                    :class="
                        msg.sender === 'user'
                            ? 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white rounded-tr-none'
                            : msg.sender === 'agent'
                              ? 'bg-blue-950/80 border border-blue-800/90 text-blue-100 rounded-tl-none'
                              : msg.sender === 'system'
                                ? 'bg-slate-800/80 border border-slate-700/80 text-slate-300 rounded-tl-none'
                                : 'bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-tl-none'
                    "
                >
                    <!-- Sender Name / Subtitle for Agent or Bot -->
                    <div
                        v-if="msg.sender !== 'user'"
                        class="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5"
                    >
                        <iconify-icon
                            :icon="
                                msg.sender === 'agent'
                                    ? 'fa7-solid:headset'
                                    : msg.sender === 'system'
                                      ? 'fa7-solid:circle-info'
                                      : 'fa7-solid:robot'
                            "
                            class="text-xs"
                            :class="msg.sender === 'agent' ? 'text-blue-400' : 'text-cyan-400'"
                        ></iconify-icon>
                        <span>
                            {{ msg.agentName || (msg.sender === 'bot' ? 'Atendente Virtual' : 'Sistema') }}
                        </span>
                    </div>

                    <!-- Rendered Text with Markdown Sanitization -->
                    <div
                        class="prose prose-invert prose-sm max-w-none break-words leading-relaxed"
                        v-html="renderMarkdown(msg.text)"
                    ></div>

                    <!-- Interactive Options Pills -->
                    <div
                        v-if="msg.options && msg.options.length > 0"
                        class="mt-3 flex flex-wrap gap-2 pt-2 border-t border-slate-700/50"
                    >
                        <button
                            v-for="opt in msg.options"
                            :key="opt"
                            type="button"
                            @click="handleOptionClick(opt)"
                            class="px-3 py-1 rounded-xl text-xs font-medium bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-800/80 text-cyan-300 hover:text-white transition flex items-center gap-1 shadow-sm"
                        >
                            <span>{{ opt }}</span>
                            <iconify-icon icon="fa7-solid:arrow-right" class="text-[10px]"></iconify-icon>
                        </button>
                    </div>

                    <!-- Timestamp with ISO Tooltip on Hover -->
                    <div
                        class="mt-1.5 text-[10px] text-right opacity-70 cursor-help"
                        :title="formatIsoWithTimezone(msg.timestamp)"
                    >
                        {{ formatRelativeTime(msg.timestamp) }}
                    </div>
                </div>
            </div>

            <!-- Loading Indicator -->
            <div v-if="isLoading" class="flex items-center gap-2 text-xs text-cyan-400 py-2">
                <iconify-icon icon="fa7-solid:spinner" class="animate-spin text-base"></iconify-icon>
                <span>Processando resposta...</span>
            </div>
        </div>

        <!-- Quick Suggestions Horizontal Scroll -->
        <div class="mb-3 flex items-center gap-2 overflow-x-auto py-1 text-xs no-scrollbar">
            <span class="text-slate-400 text-[11px] shrink-0 font-medium flex items-center gap-1">
                <iconify-icon icon="fa7-solid:wand-magic-sparkles" class="text-cyan-400 text-xs"></iconify-icon>
                Sugestões:
            </span>
            <button
                v-for="sug in quickSuggestions"
                :key="sug.label"
                type="button"
                @click="handleSendMessage(sug.text)"
                class="shrink-0 px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
            >
                {{ sug.label }}
            </button>
        </div>

        <!-- Message Input Bar -->
        <form
            @submit.prevent="handleSendMessage()"
            class="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-lg backdrop-blur"
        >
            <input
                ref="inputRef"
                v-model="inputText"
                type="text"
                placeholder="Digite sua dúvida ou solicitação (ex: Quero ver os planos de internet)..."
                class="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                :disabled="isLoading"
            />
            <button
                type="submit"
                :disabled="isLoading || !inputText.trim()"
                class="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-sm transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
            >
                <span>Enviar</span>
                <iconify-icon icon="fa7-solid:paper-plane" class="text-xs"></iconify-icon>
            </button>
        </form>

        <!-- Customer Profile Modal -->
        <div
            v-if="isAccountModalOpen"
            class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-white flex items-center gap-2">
                        <iconify-icon icon="fa7-solid:id-card" class="text-cyan-400"></iconify-icon>
                        Minha Conta
                    </h3>
                    <button
                        type="button"
                        @click="isAccountModalOpen = false"
                        class="text-slate-400 hover:text-white text-lg"
                    >
                        <iconify-icon icon="fa7-solid:xmark"></iconify-icon>
                    </button>
                </div>

                <div v-if="customer && customer.isIdentified" class="space-y-3 text-sm">
                    <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                        <div class="text-xs text-slate-400">Nome</div>
                        <div class="text-white font-semibold">{{ customer.name }}</div>
                    </div>
                    <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                        <div class="text-xs text-slate-400">Plano Atual</div>
                        <div class="text-cyan-300 font-semibold">{{ customer.plan || 'Nenhum plano ativo' }}</div>
                    </div>
                    <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                        <div class="text-xs text-slate-400">Telefone</div>
                        <div class="text-white font-mono">{{ customer.phone || 'Não informado' }}</div>
                    </div>
                    <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                        <div class="text-xs text-slate-400">Faturas</div>
                        <div class="text-white">{{ customer.invoices?.length || 0 }} fatura(s) cadastrada(s)</div>
                    </div>
                </div>

                <div v-if="!customer || !customer.isIdentified" class="text-sm text-slate-400 py-3">
                    <p class="mb-3">
                        Você está navegando como
                        <strong>Visitante</strong>
                        .
                    </p>
                    <p class="text-xs text-slate-500">
                        Para acessar sua conta e consultar faturas ou alterar plano, envie uma mensagem no chat com seu
                        telefone ou CPF cadastrado (ex:
                        <em>"Meu telefone é 5511999999999"</em>
                        ).
                    </p>
                </div>

                <div class="mt-6 flex justify-end">
                    <button
                        type="button"
                        @click="isAccountModalOpen = false"
                        class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm transition"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    </main>
</template>
