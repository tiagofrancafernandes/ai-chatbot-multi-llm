<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { toast } from 'vue3-toastify';
import { ApiService } from '../services/api';
import { Customer, ChatMessage, ChatSession, ProviderInfo, AttendanceDepartment, HumanAgent } from '../types/chat';

const STORAGE_KEY = 'chat_customer_id';

const session = ref<ChatSession | null>(null);
const messages = ref<ChatMessage[]>([]);
const inputRef = ref<HTMLInputElement | null>(null);
const customer = ref<Customer | null>(null);
const currentCustomerId = ref<string>('');
const inputText = ref<string>('');
const isLoading = ref<boolean>(false);
const activeNodeId = ref<string>('node_intent_decision');
const currentIntent = ref<string>('unknown');
const secondaryRequest = ref<string>('none');

const providers = ref<ProviderInfo[]>([]);
const activeProvider = ref<string>('ollama');
const activeModel = ref<string>('tev1:0.8b');

const deskDepartments = ref<AttendanceDepartment[]>([]);
const deskAgents = ref<HumanAgent[]>([]);
const isTransferModalOpen = ref<boolean>(false);
const agentInputText = ref<string>('');
const selectedTimeout = ref<number>(60);
const countdownSeconds = ref<number>(60);
let timerInterval: ReturnType<typeof setInterval> | null = null;

const messagesContainer = ref<HTMLDivElement | null>(null);

const attendance = computed(() => session.value?.attendance);

const quickSuggestions = [
    { label: 'Say Hi', text: 'Olá, bom dia!' },
    { label: 'Ver Planos', text: 'Quero ver os planos de internet' },
    { label: 'Qual meu plano?', text: 'Qual é o meu plano atual?' },
    { label: 'Consultar Cobertura', text: 'Vocês atendem em Carmo do Cajuru e São José dos Salgados?' },
    { label: 'Horário de Sábado', text: 'Qual o horário de funcionamento no sábado?' },
    { label: 'Endereço da Loja', text: 'Onde fica o atendimento presencial?' },
    { label: 'Falar com Atendente', text: 'Quero falar com um atendente humano' },
    { label: 'Retomar com IA', text: 'Retomar atendimento com IA' },
];

function formatMessage(text: string): string {
    if (!text) {
        return '';
    }

    let formatted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    formatted = formatted.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 underline font-semibold inline-flex items-center gap-1">$1 ↗</a>'
    );

    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>');

    formatted = formatted.replace(
        /`([^`]+)`/g,
        '<code class="bg-slate-950 text-cyan-300 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-700/60">$1</code>'
    );

    return formatted;
}

onMounted(async () => {
    await focusMessageInput();
    await loadProviders();
    await loadDeskInfo();
    await initSession();
    await focusMessageInput();
    startCountdownTimer();
});

onUnmounted(() => {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
});

function startCountdownTimer(): void {
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    timerInterval = setInterval(() => {
        if (!attendance.value || attendance.value.mode === 'ai') {
            countdownSeconds.value = selectedTimeout.value;
            return;
        }

        const now = Date.now();
        const lastInteraction =
            attendance.value.lastAgentInteractionAt || attendance.value.pausedAt || session.value?.updatedAt || now;
        const elapsed = Math.floor((now - lastInteraction) / 1000);
        const limit = attendance.value.timeoutSeconds || selectedTimeout.value || 60;
        const remaining = limit - elapsed;

        if (remaining > 0) {
            countdownSeconds.value = remaining;
        }

        if (remaining <= 0) {
            countdownSeconds.value = 0;
        }
    }, 1000);
}

async function focusMessageInput(): Promise<void> {
    await nextTick();
    if (inputRef.value) {
        inputRef.value.focus();
    }
}

async function loadProviders(): Promise<void> {
    try {
        const data = await ApiService.getProviders();
        providers.value = data.providers;
        activeProvider.value = data.activeProvider;
        activeModel.value = data.activeModel;
    } catch (error) {
        toast.error(`Could not fetch LLM providers: ${(error as Error).message}`);
    }
}

async function loadDeskInfo(): Promise<void> {
    try {
        const data = await ApiService.getAttendanceDeskInfo();
        deskDepartments.value = data.departments || [];
        deskAgents.value = data.agents || [];
    } catch (error) {
        toast.warn(`Could not load attendance desk info: ${(error as Error).message}`);
    }
}

async function initSession(): Promise<void> {
    const storedId = localStorage.getItem(STORAGE_KEY);

    if (storedId) {
        currentCustomerId.value = storedId;
    }

    try {
        isLoading.value = true;
        const result = await ApiService.initChat(currentCustomerId.value || undefined);

        customer.value = result.customer;
        currentCustomerId.value = result.customer.id;
        localStorage.setItem(STORAGE_KEY, result.customer.id);

        session.value = result.session;
        messages.value = result.session.messages;
        activeNodeId.value = result.session.activeNodeId;
        currentIntent.value = result.session.currentIntent || 'greeting';

        if (result.session.attendance?.timeoutSeconds) {
            selectedTimeout.value = result.session.attendance.timeoutSeconds;
        }

        await focusMessageInput();
        await scrollToBottom();
    } catch (error) {
        toast.error(`Session error: ${(error as Error).message}`);
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
            activeProvider.value,
            activeModel.value
        );

        customer.value = result.customer;

        if (result.customer.id !== currentCustomerId.value) {
            currentCustomerId.value = result.customer.id;
            localStorage.setItem(STORAGE_KEY, result.customer.id);
            toast.success(`Authenticated as ${result.customer.name || result.customer.id}!`);
        }

        session.value = result.session;
        messages.value = result.session.messages;
        activeNodeId.value = result.session.activeNodeId;

        if (result.analysis) {
            currentIntent.value = (result.analysis as { primaryIntent: string }).primaryIntent;
            secondaryRequest.value = (result.analysis as { secondaryRequest: string }).secondaryRequest;
        }

        await scrollToBottom();
    } catch (error) {
        toast.error(`Failed to deliver message: ${(error as Error).message}`);
    } finally {
        isLoading.value = false;
        await focusMessageInput();
    }
}

async function handleTransfer(deptId?: string, agentId?: string): Promise<void> {
    try {
        isLoading.value = true;
        const result = await ApiService.transferAttendance(
            currentCustomerId.value,
            deptId,
            agentId,
            selectedTimeout.value
        );

        session.value = result.session;
        messages.value = result.session.messages;
        isTransferModalOpen.value = false;
        toast.info(result.message);
        await scrollToBottom();
    } catch (error) {
        toast.error(`Transfer error: ${(error as Error).message}`);
    } finally {
        isLoading.value = false;
        await focusMessageInput();
    }
}

async function handleSendAgentMessage(customText?: string): Promise<void> {
    const text = (customText || agentInputText.value).trim();

    if (!text) {
        return;
    }

    try {
        isLoading.value = true;
        const currentAssigned = attendance.value?.assignedTo;
        const agentName = currentAssigned?.type === 'agent' ? currentAssigned.name : 'Mariana Silva (Suporte Técnico)';

        const result = await ApiService.sendAgentMessage(currentCustomerId.value, text, agentName, currentAssigned?.id);

        session.value = result.session;
        messages.value = result.session.messages;
        agentInputText.value = '';
        toast.success(`Mensagem enviada como atendente: ${agentName}`);
        await scrollToBottom();
    } catch (error) {
        toast.error(`Agent message error: ${(error as Error).message}`);
    } finally {
        isLoading.value = false;
        await focusMessageInput();
    }
}

async function handleResumeAi(): Promise<void> {
    try {
        isLoading.value = true;
        const result = await ApiService.resumeAiAttendance(currentCustomerId.value);

        session.value = result.session;
        messages.value = result.session.messages;
        toast.success(result.message);
        await scrollToBottom();
    } catch (error) {
        toast.error(`Resume error: ${(error as Error).message}`);
    } finally {
        isLoading.value = false;
        await focusMessageInput();
    }
}

async function handleSwitchProvider(providerId: string): Promise<void> {
    if (providerId === activeProvider.value) {
        return;
    }

    try {
        const response = await ApiService.switchProvider(providerId);
        activeProvider.value = response.activeProvider;
        activeModel.value = response.activeModel;
        toast.info(`Switched active AI provider to: ${providerId} (${activeModel.value})`);
    } catch (error) {
        toast.error(`Failed to switch provider: ${(error as Error).message}`);
    }
}

async function handleResetSession(): Promise<void> {
    try {
        await ApiService.resetSession(currentCustomerId.value);
        localStorage.removeItem(STORAGE_KEY);
        currentCustomerId.value = '';
        toast.warn('Session cache cleared. Reset to fresh guest state.');
        await initSession();
    } catch (error) {
        toast.error(`Failed to reset: ${(error as Error).message}`);
    }
}

async function scrollToBottom(): Promise<void> {
    await nextTick();

    if (!messagesContainer.value) {
        return;
    }

    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    await focusMessageInput();
}
</script>

<template>
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-6rem)]">
        <!-- Left Panel: Chat Area (8 Cols) -->
        <section
            class="lg:col-span-8 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden"
        >
            <!-- Chat Header -->
            <div class="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div
                        class="w-3 h-3 rounded-full animate-pulse"
                        :class="
                            attendance?.mode === 'ai'
                                ? 'bg-emerald-500'
                                : attendance?.mode === 'human_active'
                                  ? 'bg-blue-500'
                                  : 'bg-amber-500'
                        "
                    ></div>
                    <div>
                        <h2 class="text-sm font-semibold text-white">Live Customer Support Stream</h2>
                        <p class="text-xs text-slate-400">
                            Node:
                            <span class="text-cyan-400 font-mono">{{ activeNodeId }}</span>
                            · Intent:
                            <span class="text-amber-400 font-mono">{{ currentIntent }}</span>
                        </p>
                    </div>
                </div>

                <!-- Provider Selector -->
                <div class="flex items-center gap-2">
                    <span class="text-xs text-slate-400 hidden sm:inline">Provider:</span>
                    <div class="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                        <button
                            v-for="prov in providers"
                            :key="prov.id"
                            @click="handleSwitchProvider(prov.id)"
                            class="px-2.5 py-1 text-xs rounded-md font-medium transition cursor-pointer flex items-center gap-1"
                            :class="
                                activeProvider === prov.id
                                    ? 'bg-cyan-600 text-white shadow'
                                    : 'text-slate-400 hover:text-white'
                            "
                            :title="`${prov.displayName} (${prov.defaultModel})`"
                        >
                            <iconify-icon
                                :icon="
                                    prov.id === 'ollama'
                                        ? 'fa7-solid:server'
                                        : prov.id === 'gemini'
                                          ? 'fa7-solid:wand-magic-sparkles'
                                          : 'fa7-solid:microchip'
                                "
                                class="text-xs"
                            ></iconify-icon>
                            {{ prov.id }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Attendance Status Header Bar ("Sendo Atendido Por") -->
            <div
                class="px-6 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
                <div class="flex items-center gap-2">
                    <span class="text-slate-400 font-medium">Sendo atendido por:</span>
                    <div
                        class="flex items-center gap-1.5 px-3 py-1 rounded-xl font-semibold shadow-sm transition"
                        :class="
                            attendance?.mode === 'ai'
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                                : attendance?.mode === 'human_active'
                                  ? 'bg-blue-950/90 text-blue-300 border border-blue-700'
                                  : 'bg-amber-950/90 text-amber-300 border border-amber-800'
                        "
                    >
                        <iconify-icon
                            :icon="
                                attendance?.mode === 'ai'
                                    ? 'fa7-solid:robot'
                                    : attendance?.mode === 'human_active'
                                      ? 'fa7-solid:headset'
                                      : 'fa7-solid:clock'
                            "
                            class="text-sm"
                        ></iconify-icon>
                        <span>{{ attendance?.assignedTo?.name || 'SystemOne AI' }}</span>
                        <span
                            v-if="attendance?.mode !== 'ai'"
                            class="text-[10px] px-1.5 py-0.5 bg-slate-900 rounded-md font-mono text-amber-300 border border-amber-900/60"
                        >
                            IA Pausada
                        </span>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <!-- Inactivity countdown pill -->
                    <div
                        v-if="attendance?.mode !== 'ai'"
                        class="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-900/70 font-mono shadow-sm"
                    >
                        <iconify-icon icon="fa7-solid:hourglass-half" class="text-amber-400"></iconify-icon>
                        <span>Retomada da IA em: {{ countdownSeconds }}s</span>
                    </div>

                    <!-- Resume AI button -->
                    <button
                        v-if="attendance?.mode !== 'ai'"
                        @click="handleResumeAi"
                        class="px-3 py-1 bg-cyan-900 hover:bg-cyan-800 text-cyan-200 border border-cyan-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
                    >
                        <iconify-icon icon="fa7-solid:play" class="text-[10px]"></iconify-icon>
                        Retomar com IA
                    </button>

                    <!-- Open transfer modal button -->
                    <button
                        v-if="attendance?.mode === 'ai'"
                        @click="isTransferModalOpen = true"
                        class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
                    >
                        <iconify-icon icon="fa7-solid:headset" class="text-xs text-cyan-400"></iconify-icon>
                        Transferir Atendente
                    </button>
                </div>
            </div>

            <!-- Messages Window -->
            <div ref="messagesContainer" class="flex-1 p-6 overflow-y-auto space-y-4 max-h-[58vh]">
                <div v-for="msg in messages" :key="msg.id" class="flex flex-col">
                    <!-- System Notification Message (Centered pill) -->
                    <div
                        v-if="msg.sender === 'system'"
                        class="mx-auto my-2 max-w-[90%] bg-slate-950/90 border border-slate-800 text-slate-300 px-4 py-2.5 rounded-2xl text-xs shadow-md whitespace-pre-wrap leading-relaxed"
                        v-html="formatMessage(msg.text)"
                    ></div>

                    <!-- User, Bot or Human Agent Messages -->
                    <div v-else class="flex flex-col" :class="msg.sender === 'user' ? 'items-end' : 'items-start'">
                        <div class="flex items-center gap-2 mb-1 text-[11px] text-slate-400 px-1">
                            <iconify-icon
                                :icon="
                                    msg.sender === 'user'
                                        ? 'fa7-solid:user'
                                        : msg.sender === 'agent'
                                          ? 'fa7-solid:headset'
                                          : 'fa7-solid:robot'
                                "
                                class="text-xs"
                                :class="{
                                    'text-blue-400': msg.sender === 'agent',
                                    'text-cyan-400': msg.sender === 'bot',
                                }"
                            ></iconify-icon>
                            <span class="font-medium">
                                {{
                                    msg.sender === 'user'
                                        ? 'You'
                                        : msg.sender === 'agent'
                                          ? msg.agentName || 'Atendente Humano'
                                          : 'SystemOne Bot'
                                }}
                            </span>
                            <span
                                v-if="msg.sender === 'agent'"
                                class="bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded text-[10px] font-mono"
                            >
                                👤 Humano
                            </span>
                            <span
                                v-if="msg.detectedIntent && msg.sender !== 'agent'"
                                class="bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded text-[10px] font-mono"
                            >
                                {{ msg.detectedIntent }}
                            </span>
                            <span
                                v-if="msg.secondaryRequest && msg.secondaryRequest !== 'none'"
                                class="bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded text-[10px] font-mono"
                            >
                                ⚡ {{ msg.secondaryRequest }}
                            </span>
                        </div>

                        <div
                            class="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap"
                            :class="{
                                'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-sm':
                                    msg.sender === 'user',
                                'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-sm':
                                    msg.sender === 'bot',
                                'bg-gradient-to-r from-blue-950 to-indigo-950 border border-blue-700/70 text-blue-100 rounded-tl-sm shadow-md':
                                    msg.sender === 'agent',
                            }"
                            v-html="formatMessage(msg.text)"
                        ></div>

                        <!-- Interactive Option Buttons / Confirmation Chips -->
                        <div
                            v-if="msg.sender === 'bot' && msg.options && msg.options.length > 0"
                            class="flex flex-wrap gap-2 mt-2 max-w-[85%]"
                        >
                            <button
                                v-for="(opt, optIndex) in msg.options"
                                :key="optIndex"
                                @click="handleSendMessage(opt)"
                                :disabled="isLoading"
                                class="text-xs bg-slate-800/90 hover:bg-cyan-950 text-cyan-300 hover:text-cyan-100 border border-slate-700 hover:border-cyan-500 px-3 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                <iconify-icon
                                    :icon="
                                        opt.toLowerCase().includes('sim') || opt.toLowerCase().includes('confirm')
                                            ? 'fa7-solid:check'
                                            : opt.toLowerCase().includes('não') || opt.toLowerCase().includes('cancel')
                                              ? 'fa7-solid:xmark'
                                              : opt.toLowerCase().includes('assinar') ||
                                                  opt.toLowerCase().includes('contrato')
                                                ? 'fa7-solid:file-signature'
                                                : opt.toLowerCase().includes('atendente') ||
                                                    opt.toLowerCase().includes('falar com')
                                                  ? 'fa7-solid:headset'
                                                  : 'fa7-solid:arrow-right'
                                    "
                                    class="text-[10px]"
                                ></iconify-icon>
                                {{ opt }}
                            </button>
                        </div>
                    </div>
                </div>

                <div v-if="isLoading" class="flex items-center gap-2 text-xs text-cyan-400 animate-pulse px-2 py-1">
                    <iconify-icon icon="fa7-solid:spinner" class="animate-spin text-sm"></iconify-icon>
                    <span>Processando atendimento com {{ activeProvider }} ({{ activeModel }})...</span>
                </div>
            </div>

            <!-- Quick Suggestions Chips -->
            <div class="px-6 py-2.5 bg-slate-900/60 border-t border-slate-800/80">
                <p class="text-[11px] text-slate-400 mb-2 flex items-center gap-1 font-medium">
                    <iconify-icon icon="fa7-solid:lightbulb" class="text-amber-400"></iconify-icon>
                    Sugestões Rápidas:
                </p>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="(sug, index) in quickSuggestions"
                        :key="index"
                        @click="handleSendMessage(sug.text)"
                        :disabled="isLoading"
                        class="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700/70 hover:border-cyan-700 px-3 py-1.5 rounded-full transition cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                        {{ sug.label }}
                    </button>
                </div>
            </div>

            <!-- Input Box -->
            <form @submit.prevent="handleSendMessage()" class="p-4 bg-slate-900 border-t border-slate-800 flex gap-3">
                <input
                    v-model="inputText"
                    ref="inputRef"
                    type="text"
                    autofocus
                    :placeholder="
                        attendance?.mode !== 'ai'
                            ? 'Digite sua mensagem para o atendente humano (IA pausada)...'
                            : 'Digite sua mensagem, consulte planos ou informe seu telefone/CPF...'
                    "
                    class="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                />

                <button
                    type="submit"
                    :disabled="isLoading || !inputText.trim()"
                    class="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-medium text-sm transition cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-600/20 active:scale-95"
                >
                    <iconify-icon icon="fa7-solid:paper-plane"></iconify-icon>
                    <span class="hidden sm:inline">Enviar</span>
                </button>
            </form>
        </section>

        <!-- Right Panel: Omnichannel Attendance Desk & Session Inspector (4 Cols) -->
        <aside class="lg:col-span-4 flex flex-col gap-6">
            <!-- Omnichannel Attendance Desk Card (Simulação e Controle de Atendimento) -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 class="text-sm font-semibold text-white flex items-center gap-2">
                        <iconify-icon icon="fa7-solid:headset" class="text-cyan-400"></iconify-icon>
                        Central de Atendimento
                    </h3>

                    <span
                        class="text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5"
                        :class="
                            attendance?.mode === 'ai'
                                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                                : attendance?.mode === 'human_active'
                                  ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                                  : 'bg-amber-950/80 text-amber-400 border-amber-800'
                        "
                    >
                        <span
                            class="w-1.5 h-1.5 rounded-full"
                            :class="
                                attendance?.mode === 'ai'
                                    ? 'bg-emerald-400'
                                    : attendance?.mode === 'human_active'
                                      ? 'bg-blue-400'
                                      : 'bg-amber-400'
                            "
                        ></span>
                        {{
                            attendance?.mode === 'ai'
                                ? 'IA Automatizada'
                                : attendance?.mode === 'human_active'
                                  ? 'Humano Ativo'
                                  : 'Fila de Espera'
                        }}
                    </span>
                </div>

                <!-- Active Operator Info -->
                <div class="space-y-3 text-xs">
                    <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                        <div class="flex justify-between items-center">
                            <span class="text-slate-400">Atendente / Fila:</span>
                            <span class="font-semibold text-white">
                                {{ attendance?.assignedTo?.name || 'SystemOne AI' }}
                            </span>
                        </div>
                        <div v-if="attendance?.queue" class="flex justify-between items-center">
                            <span class="text-slate-400">Posição na Fila:</span>
                            <span class="text-amber-400 font-mono font-medium">
                                {{ attendance.queue.position }}º Lugar (~{{ attendance.queue.estimatedWaitSeconds }}s)
                            </span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-slate-400">Status da IA:</span>
                            <span
                                class="font-semibold"
                                :class="attendance?.mode === 'ai' ? 'text-emerald-400' : 'text-amber-400'"
                            >
                                {{ attendance?.mode === 'ai' ? '🟢 Respondendo' : '⏸️ Pausada' }}
                            </span>
                        </div>
                        <div v-if="attendance?.mode !== 'ai'" class="flex justify-between items-center">
                            <span class="text-slate-400">Timeout Inatividade:</span>
                            <span class="text-amber-300 font-mono font-medium">{{ countdownSeconds }}s restantes</span>
                        </div>
                    </div>

                    <!-- Inactivity Timeout Selector -->
                    <div>
                        <span class="text-slate-400 block mb-1 text-[11px] font-medium">
                            Tempo Limite de Inatividade para Retomar IA:
                        </span>
                        <div class="grid grid-cols-4 gap-1.5">
                            <button
                                v-for="sec in [15, 30, 60, 120]"
                                :key="sec"
                                @click="selectedTimeout = sec"
                                class="py-1 text-[11px] font-medium rounded-lg border transition cursor-pointer text-center"
                                :class="
                                    selectedTimeout === sec
                                        ? 'bg-cyan-600 text-white border-cyan-500'
                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                "
                            >
                                {{ sec }}s
                            </button>
                        </div>
                    </div>

                    <!-- Transfer Department Actions -->
                    <div>
                        <span class="text-slate-400 block mb-1.5 text-[11px] font-medium">
                            Transferir para Fila Departamental:
                        </span>
                        <div class="space-y-1.5">
                            <button
                                v-for="dept in deskDepartments"
                                :key="dept.id"
                                @click="handleTransfer(dept.id)"
                                :disabled="isLoading"
                                class="w-full py-1.5 px-2.5 bg-slate-800/80 hover:bg-slate-800 text-left rounded-lg border border-slate-700/80 hover:border-cyan-500 transition cursor-pointer flex items-center justify-between text-[11px]"
                            >
                                <span class="font-medium text-slate-200">{{ dept.name }}</span>
                                <span class="text-slate-400 text-[10px]">~{{ dept.estimatedWaitSeconds }}s</span>
                            </button>
                        </div>
                    </div>

                    <!-- Online Agents Direct Transfer -->
                    <div v-if="deskAgents && deskAgents.length > 0">
                        <span class="text-slate-400 block mb-1.5 text-[11px] font-medium">
                            Transferir para Atendente Online:
                        </span>
                        <div class="space-y-1.5">
                            <button
                                v-for="ag in deskAgents"
                                :key="ag.id"
                                @click="handleTransfer(undefined, ag.id)"
                                :disabled="isLoading"
                                class="w-full py-1.5 px-2.5 bg-slate-800/80 hover:bg-slate-800 text-left rounded-lg border border-slate-700/80 hover:border-blue-500 transition cursor-pointer flex items-center justify-between text-[11px]"
                            >
                                <span class="flex items-center gap-1.5 font-medium text-slate-200">
                                    <span
                                        class="w-1.5 h-1.5 rounded-full"
                                        :class="ag.isOnline ? 'bg-emerald-400' : 'bg-slate-500'"
                                    ></span>
                                    {{ ag.name }}
                                </span>
                                <span class="text-slate-400 text-[10px]">{{ ag.departmentName }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Simulate Agent Response (Human interaction) -->
                    <div class="pt-2 border-t border-slate-800">
                        <span class="text-slate-400 block mb-1.5 text-[11px] font-medium flex items-center gap-1">
                            <iconify-icon icon="fa7-solid:comment-dots" class="text-blue-400"></iconify-icon>
                            Simular Resposta do Atendente Humano:
                        </span>
                        <form @submit.prevent="handleSendAgentMessage()" class="flex gap-2">
                            <input
                                v-model="agentInputText"
                                type="text"
                                placeholder="Digite a mensagem do atendente..."
                                class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                                type="submit"
                                :disabled="isLoading || !agentInputText.trim()"
                                class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition cursor-pointer"
                            >
                                Enviar
                            </button>
                        </form>

                        <div class="flex flex-wrap gap-1.5 mt-2">
                            <button
                                @click="handleSendAgentMessage('Olá! Sou a Mariana do suporte. Como posso te ajudar?')"
                                class="text-[10px] bg-slate-800 hover:bg-slate-700 text-blue-300 px-2 py-1 rounded border border-slate-700 transition cursor-pointer"
                            >
                                "Olá! Sou do suporte..."
                            </button>
                            <button
                                @click="handleSendAgentMessage('Estou analisando a conexão da sua fibra óptica agora.')"
                                class="text-[10px] bg-slate-800 hover:bg-slate-700 text-blue-300 px-2 py-1 rounded border border-slate-700 transition cursor-pointer"
                            >
                                "Estou analisando a fibra..."
                            </button>
                        </div>
                    </div>

                    <!-- Manual Resume AI Button -->
                    <div class="pt-2 border-t border-slate-800">
                        <button
                            @click="handleResumeAi"
                            :disabled="isLoading || attendance?.mode === 'ai'"
                            class="w-full py-2 px-3 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 hover:text-white border border-cyan-800/80 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                        >
                            <iconify-icon icon="fa7-solid:robot"></iconify-icon>
                            Reativar Atendimento com IA
                        </button>
                    </div>
                </div>
            </div>

            <!-- Customer Metadata Card -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 class="text-sm font-semibold text-white flex items-center gap-2">
                        <iconify-icon icon="fa7-solid:id-card" class="text-cyan-400"></iconify-icon>
                        Customer Profile
                    </h3>

                    <span
                        class="text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5"
                        :class="
                            customer?.isIdentified
                                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                                : 'bg-amber-950/80 text-amber-400 border-amber-800'
                        "
                    >
                        <span
                            class="w-1.5 h-1.5 rounded-full"
                            :class="customer?.isIdentified ? 'bg-emerald-400' : 'bg-amber-400'"
                        ></span>
                        {{ customer?.isIdentified ? 'Identified' : 'Guest State' }}
                    </span>
                </div>

                <!-- Attributes List -->
                <div class="space-y-3 text-xs">
                    <div>
                        <span class="text-slate-400 block mb-0.5">Tracking Token (Local Identifier):</span>
                        <code
                            class="bg-slate-950 text-cyan-300 px-2 py-1 rounded block overflow-x-auto font-mono text-[11px] border border-slate-800"
                        >
                            {{ currentCustomerId || 'Initializing...' }}
                        </code>
                    </div>

                    <div class="grid grid-cols-2 gap-3 pt-1">
                        <div>
                            <span class="text-slate-400 block">Name:</span>
                            <span class="font-medium text-slate-100 text-sm">
                                {{ customer?.name || 'Unidentified Guest' }}
                            </span>
                        </div>
                        <div>
                            <span class="text-slate-400 block">Phone / Mobile:</span>
                            <span class="font-medium text-slate-100">{{ customer?.phone || 'Not provided' }}</span>
                        </div>
                        <div>
                            <span class="text-slate-400 block">Document (CPF/CNPJ):</span>
                            <span class="font-medium text-slate-100">{{ customer?.cpfCnpj || 'Not provided' }}</span>
                        </div>
                        <div>
                            <span class="text-slate-400 block">Active Plan:</span>
                            <span
                                class="inline-block mt-0.5 bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded font-medium"
                            >
                                {{ customer?.plan || 'None' }}
                            </span>
                        </div>

                        <div v-if="customer?.metadata?.address" class="col-span-2 pt-1">
                            <span class="text-slate-400 block">Registered Address:</span>
                            <span class="font-medium text-slate-200 text-xs flex items-center gap-1.5 mt-0.5">
                                <iconify-icon icon="fa7-solid:location-dot" class="text-cyan-400"></iconify-icon>
                                {{ customer.metadata.address }}
                            </span>
                        </div>
                    </div>

                    <div v-if="customer?.notes">
                        <span class="text-slate-400 block mb-0.5">Customer Notes:</span>
                        <p class="text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 italic">
                            "{{ customer.notes }}"
                        </p>
                    </div>

                    <!-- Invoices Section -->
                    <div class="pt-2 border-t border-slate-800">
                        <span class="text-slate-400 block mb-2 font-medium flex items-center justify-between">
                            <span>Invoices & Statements:</span>
                            <span class="text-[11px] text-cyan-400">{{ customer?.invoices?.length || 0 }} total</span>
                        </span>

                        <div v-if="customer?.invoices && customer.invoices.length > 0" class="space-y-2">
                            <div
                                v-for="inv in customer.invoices"
                                :key="inv.id"
                                class="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                            >
                                <div>
                                    <span class="font-mono font-medium text-slate-200">{{ inv.id }}</span>
                                    <span class="text-slate-400 block text-[10px]">Due: {{ inv.dueDate }}</span>
                                </div>
                                <div class="text-right">
                                    <span class="font-semibold text-slate-200">R$ {{ inv.amount.toFixed(2) }}</span>
                                    <span
                                        class="block text-[10px] font-medium"
                                        :class="inv.status === 'paid' ? 'text-emerald-400' : 'text-amber-400'"
                                    >
                                        {{ inv.status.toUpperCase() }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div v-else class="text-slate-500 text-xs italic py-2">
                            No billing records registered for this token.
                        </div>
                    </div>
                </div>

                <!-- Session Reset Button -->
                <div class="pt-2 border-t border-slate-800">
                    <button
                        @click="handleResetSession"
                        class="w-full py-2.5 px-4 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 border border-rose-800/80 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                    >
                        <iconify-icon icon="fa7-solid:trash-can"></iconify-icon>
                        Reset Session Cache (Clear LocalStorage)
                    </button>
                </div>
            </div>

            <!-- Flow Engine Status Card -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-xs space-y-3">
                <h4 class="text-sm font-semibold text-white flex items-center gap-2">
                    <iconify-icon icon="fa7-solid:network-wired" class="text-cyan-400"></iconify-icon>
                    SystemOne Router State
                </h4>

                <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 font-mono text-[11px]">
                    <div class="flex justify-between">
                        <span class="text-slate-400">Engine Node:</span>
                        <span class="text-cyan-400">{{ activeNodeId }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Primary Intent:</span>
                        <span class="text-amber-400">{{ currentIntent }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Secondary Req:</span>
                        <span class="text-emerald-400">{{ secondaryRequest }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Active Provider:</span>
                        <span class="text-slate-200">{{ activeProvider }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Model:</span>
                        <span class="text-slate-200">{{ activeModel }}</span>
                    </div>
                </div>
            </div>
        </aside>
    </div>
</template>
