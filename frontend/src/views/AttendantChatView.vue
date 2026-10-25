<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { toast } from 'vue3-toastify';
import { ApiService } from '../services/api';
import {
    Customer,
    ChatMessage,
    ChatSession,
    ProviderInfo,
    AttendanceDepartment,
    HumanAgent,
    ChatSessionSummary,
} from '../types/chat';
import { renderMarkdown } from '../utils/markdown';
import { formatRelativeTime, formatIsoWithTimezone } from '../utils/date-format';

const STORAGE_KEY = 'chat_attendant_customer_id';

const session = ref<ChatSession | null>(null);
const messages = ref<ChatMessage[]>([]);
const inputRef = ref<HTMLInputElement | null>(null);
const customer = ref<Customer | null>(null);
const currentCustomerId = ref<string>('');
const inputText = ref<string>('');
const isLoading = ref<boolean>(false);
const activeNodeId = ref<string>('node_intent_decision');
const currentIntent = ref<string>('unknown');

const sessionsList = ref<ChatSessionSummary[]>([]);
const sessionFilter = ref<'all' | 'human_active' | 'human_queued' | 'ai'>('all');
const sessionSearch = ref<string>('');
const isSessionsSidebarOpen = ref<boolean>(false);
const isRefreshingSessions = ref<boolean>(false);

const providers = ref<ProviderInfo[]>([]);
const activeProvider = ref<string>('ollama');
const activeModel = ref<string>('tev1:0.8b');

const deskDepartments = ref<AttendanceDepartment[]>([]);
const deskAgents = ref<HumanAgent[]>([]);
const isTransferModalOpen = ref<boolean>(false);
const sendRole = ref<'agent' | 'note'>('agent');
const selectedTimeout = ref<number>(60);
const countdownSeconds = ref<number>(60);
const currentTick = ref<number>(Date.now());
let timerInterval: ReturnType<typeof setInterval> | null = null;
let sessionsPollInterval: ReturnType<typeof setInterval> | null = null;

const operatorQuickMacros = [
    'Olá! Sou do atendimento humano e vou prosseguir com seu atendimento.',
    'Um momento, por favor, enquanto consulto seu cadastro e faturas.',
    'Identifiquei seu plano e estou verificando a estabilidade da sua conexão.',
    'Por favor, reinicie seu roteador da tomada por 30 segundos.',
    'Sua solicitação foi concluída com sucesso! Posso ajudar em algo mais?',
];

const messagesContainer = ref<HTMLDivElement | null>(null);

const attendance = computed(() => session.value?.attendance);

const filteredSessions = computed(() => {
    let list = sessionsList.value;

    if (sessionFilter.value !== 'all') {
        list = list.filter((item) => item.session.attendance?.mode === sessionFilter.value);
    }

    const query = sessionSearch.value.trim().toLowerCase();
    if (!query) {
        return list;
    }

    return list.filter((item) => {
        const name = (item.customer.name || '').toLowerCase();
        const id = (item.customer.id || '').toLowerCase();
        const phone = (item.customer.phone || '').toLowerCase();
        const cpf = (item.customer.cpfCnpj || '').toLowerCase();
        const text = (item.lastMessage?.text || '').toLowerCase();

        return (
            name.includes(query) ||
            id.includes(query) ||
            phone.includes(query) ||
            cpf.includes(query) ||
            text.includes(query)
        );
    });
});

const quickSuggestions = [
    { label: 'Saudação', text: 'Olá! Sou do atendimento humano e vou te ajudar.' },
    { label: 'Aguarde', text: 'Um momento, por favor, enquanto consulto suas informações no sistema.' },
    { label: 'Sinal OK', text: 'Verifiquei aqui e o sinal óptico da sua fibra está normal e operando em 100%.' },
    {
        label: 'Reiniciar ONU',
        text: 'Por favor, retire a fonte do seu roteador e ONU da tomada por 30 segundos e ligue novamente.',
    },
    { label: 'Faturas', text: 'Localizei suas faturas e estou gerando a 2ª via atualizada para você.' },
    { label: 'Concluído', text: 'Sua solicitação foi concluída com sucesso! Posso te ajudar em algo mais?' },
];

onMounted(async () => {
    await focusMessageInput();
    await loadProviders();
    await loadDeskInfo();
    await loadSessions();
    await initSession();
    await focusMessageInput();
    startCountdownTimer();
    startSessionsPoller();
});

onUnmounted(() => {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    if (sessionsPollInterval) {
        clearInterval(sessionsPollInterval);
    }
});

function startCountdownTimer(): void {
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    timerInterval = setInterval(() => {
        currentTick.value = Date.now();

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
            return;
        }

        countdownSeconds.value = 0;
    }, 1000);
}

function startSessionsPoller(): void {
    if (sessionsPollInterval) {
        clearInterval(sessionsPollInterval);
    }

    sessionsPollInterval = setInterval(async () => {
        await loadSessions(true);
    }, 8000);
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
        toast.error(`Não foi possível carregar provedores: ${(error as Error).message}`);
    }
}

async function loadDeskInfo(): Promise<void> {
    try {
        const data = await ApiService.getAttendanceDeskInfo();
        deskDepartments.value = data.departments || [];
        deskAgents.value = data.agents || [];
    } catch (error) {
        toast.warn(`Não foi possível carregar atendentes: ${(error as Error).message}`);
    }
}

async function loadSessions(silent: boolean = false): Promise<void> {
    if (!silent) {
        isRefreshingSessions.value = true;
    }

    try {
        const list = await ApiService.getSessions();
        sessionsList.value = list;
    } catch (error) {
        if (!silent) {
            toast.warn(`Erro ao carregar sessões de atendimento: ${(error as Error).message}`);
        }
    } finally {
        if (!silent) {
            isRefreshingSessions.value = false;
        }
    }
}

async function selectCustomerSession(customerId: string): Promise<void> {
    if (currentCustomerId.value === customerId && session.value) {
        isSessionsSidebarOpen.value = false;
        return;
    }

    try {
        isLoading.value = true;
        currentCustomerId.value = customerId;
        localStorage.setItem(STORAGE_KEY, customerId);

        const result = await ApiService.initChat(customerId);
        customer.value = result.customer;
        session.value = result.session;
        messages.value = result.session.messages;
        activeNodeId.value = result.session.activeNodeId;
        currentIntent.value = result.session.currentIntent || 'greeting';

        if (result.session.attendance?.timeoutSeconds) {
            selectedTimeout.value = result.session.attendance.timeoutSeconds;
        }

        isSessionsSidebarOpen.value = false;
        await loadSessions(true);
        await scrollToBottom();
    } catch (error) {
        toast.error(`Falha ao selecionar sessão: ${(error as Error).message}`);
    } finally {
        isLoading.value = false;
        await focusMessageInput();
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
        toast.error(`Erro na sessão: ${(error as Error).message}`);
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
        await loadSessions(true);
        await scrollToBottom();
    } catch (error) {
        toast.error(`Erro de transferência: ${(error as Error).message}`);
    } finally {
        isLoading.value = false;
        await focusMessageInput();
    }
}

async function handleSendAgentMessage(customText?: string): Promise<void> {
    const text = (customText || inputText.value).trim();

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
        inputText.value = '';
        toast.success(`Mensagem enviada como atendente: ${agentName}`);
        await loadSessions(true);
        await scrollToBottom();
    } catch (error) {
        toast.error(`Erro no envio da resposta do atendente: ${(error as Error).message}`);
    } finally {
        isLoading.value = false;
        await focusMessageInput();
    }
}

async function handleExecuteOperatorAction(
    action:
        | 'suspend_internet'
        | 'activate_internet'
        | 'check_signal'
        | 'reboot_onu'
        | 'view_invoices'
        | 'unlock_promise'
        | 'internal_note',
    noteText?: string
): Promise<void> {
    try {
        isLoading.value = true;
        const currentAssigned = attendance.value?.assignedTo;
        const opName = currentAssigned?.type === 'agent' ? currentAssigned.name : 'Mariana Silva (Suporte N2)';

        const result = await ApiService.executeOperatorAction(currentCustomerId.value, action, noteText, opName);

        customer.value = result.customer;
        session.value = result.session;
        messages.value = result.session.messages;
        toast.success(result.message);
        await loadSessions(true);
        await scrollToBottom();
    } catch (error) {
        toast.error(`Falha ao executar ação de suporte: ${(error as Error).message}`);
    } finally {
        isLoading.value = false;
        await focusMessageInput();
    }
}

async function handleUnifiedSubmit(customText?: string): Promise<void> {
    const text = (customText || inputText.value).trim();

    if (!text) {
        return;
    }

    if (sendRole.value === 'note') {
        inputText.value = '';
        await handleExecuteOperatorAction('internal_note', text);
        return;
    }

    await handleSendAgentMessage(text);
}

function handleApplyMacro(macroText: string): void {
    inputText.value = macroText;
    sendRole.value = 'agent';
    focusMessageInput();
}

async function handleResumeAi(): Promise<void> {
    try {
        isLoading.value = true;
        const result = await ApiService.resumeAiAttendance(currentCustomerId.value);

        session.value = result.session;
        messages.value = result.session.messages;
        toast.success(result.message);
        await loadSessions(true);
        await scrollToBottom();
    } catch (error) {
        toast.error(`Erro ao retomar IA: ${(error as Error).message}`);
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
        toast.info(`Provedor alterado para: ${providerId} (${activeModel.value})`);
    } catch (error) {
        toast.error(`Falha ao trocar provedor: ${(error as Error).message}`);
    }
}

async function handleResetSession(): Promise<void> {
    try {
        await ApiService.resetSession(currentCustomerId.value);
        localStorage.removeItem(STORAGE_KEY);
        currentCustomerId.value = '';
        toast.warn('Sessão redefinida para estado inicial.');
        await initSession();
        await loadSessions(true);
    } catch (error) {
        toast.error(`Falha ao redefinir: ${(error as Error).message}`);
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
    <main class="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-4 lg:px-6 py-4 flex flex-col min-h-[calc(100vh-5rem)]">
        <!-- Sub-header Bar with Toggle and Quick Info -->
        <div
            class="mb-3 flex items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5"
        >
            <div class="flex items-center gap-3">
                <button
                    type="button"
                    @click="isSessionsSidebarOpen = !isSessionsSidebarOpen"
                    class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5"
                    :class="{ 'bg-cyan-900/80 text-cyan-200 border-cyan-700': isSessionsSidebarOpen }"
                >
                    <iconify-icon icon="fa7-solid:list-ul"></iconify-icon>
                    <span>Chats Ativos ({{ sessionsList.length }})</span>
                </button>

                <div class="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                    <span>Cliente Atual:</span>
                    <strong class="text-white">{{ customer?.name || 'Visitante' }}</strong>
                    <code class="text-[11px] bg-slate-950 px-1.5 py-0.5 rounded text-cyan-400 font-mono">
                        {{ currentCustomerId }}
                    </code>
                </div>
            </div>

            <!-- Provider Selector -->
            <div class="flex items-center gap-2">
                <span class="text-xs text-slate-400 hidden md:inline">LLM Ativo:</span>
                <div class="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                        v-for="prov in providers"
                        :key="prov.id"
                        type="button"
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
                        <span class="capitalize">{{ prov.id }}</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Main Layout Grid -->
        <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
            <!-- Left Drawer / Sessions Sidebar -->
            <aside
                class="lg:col-span-3 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden"
                :class="isSessionsSidebarOpen ? 'block' : 'hidden lg:flex'"
            >
                <!-- Sidebar Header -->
                <div class="p-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <iconify-icon icon="fa7-solid:comments" class="text-cyan-400 text-sm"></iconify-icon>
                        <h3 class="text-xs font-bold text-white uppercase tracking-wider">Conversas em Andamento</h3>
                    </div>
                    <button
                        type="button"
                        @click="loadSessions()"
                        title="Recarregar lista"
                        class="p-1 rounded text-slate-400 hover:text-white transition"
                        :class="{ 'animate-spin text-cyan-400': isRefreshingSessions }"
                    >
                        <iconify-icon icon="fa7-solid:rotate" class="text-xs"></iconify-icon>
                    </button>
                </div>

                <!-- Search Input -->
                <div class="p-2.5 border-b border-slate-800 bg-slate-900">
                    <div class="relative">
                        <iconify-icon
                            icon="fa7-solid:magnifying-glass"
                            class="absolute left-2.5 top-2.5 text-xs text-slate-500"
                        ></iconify-icon>
                        <input
                            v-model="sessionSearch"
                            type="text"
                            placeholder="Buscar cliente, tel, CPF..."
                            class="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600"
                        />
                    </div>
                </div>

                <!-- Status Filter Pills -->
                <div
                    class="px-2.5 py-1.5 border-b border-slate-800 bg-slate-950/50 flex items-center gap-1 text-[11px] overflow-x-auto no-scrollbar"
                >
                    <button
                        type="button"
                        @click="sessionFilter = 'all'"
                        class="px-2 py-0.5 rounded font-medium transition shrink-0"
                        :class="
                            sessionFilter === 'all'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                : 'text-slate-400 hover:text-slate-200'
                        "
                    >
                        Todos ({{ sessionsList.length }})
                    </button>
                    <button
                        type="button"
                        @click="sessionFilter = 'human_queued'"
                        class="px-2 py-0.5 rounded font-medium transition shrink-0"
                        :class="
                            sessionFilter === 'human_queued'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'text-slate-400 hover:text-slate-200'
                        "
                    >
                        Fila
                    </button>
                    <button
                        type="button"
                        @click="sessionFilter = 'human_active'"
                        class="px-2 py-0.5 rounded font-medium transition shrink-0"
                        :class="
                            sessionFilter === 'human_active'
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : 'text-slate-400 hover:text-slate-200'
                        "
                    >
                        Humano
                    </button>
                    <button
                        type="button"
                        @click="sessionFilter = 'ai'"
                        class="px-2 py-0.5 rounded font-medium transition shrink-0"
                        :class="
                            sessionFilter === 'ai'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'text-slate-400 hover:text-slate-200'
                        "
                    >
                        IA
                    </button>
                </div>

                <!-- Sessions List -->
                <div class="flex-1 overflow-y-auto divide-y divide-slate-800/70 max-h-[65vh]">
                    <div v-if="filteredSessions.length === 0" class="p-6 text-center text-xs text-slate-500">
                        Nenhuma sessão encontrada.
                    </div>

                    <button
                        v-for="item in filteredSessions"
                        :key="item.session.id"
                        type="button"
                        @click="selectCustomerSession(item.customer.id)"
                        class="w-full text-left p-3 transition hover:bg-slate-800/60 flex flex-col gap-1.5 cursor-pointer"
                        :class="
                            item.customer.id === currentCustomerId ? 'bg-cyan-950/30 border-l-4 border-cyan-500' : ''
                        "
                    >
                        <div class="flex items-center justify-between">
                            <span class="font-semibold text-xs text-white truncate max-w-[130px]">
                                {{ item.customer.name || item.customer.id }}
                            </span>
                            <span
                                class="text-[10px] px-1.5 py-0.5 rounded-full font-mono border"
                                :class="
                                    item.session.attendance?.mode === 'ai'
                                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                        : item.session.attendance?.mode === 'human_active'
                                          ? 'bg-blue-950 text-blue-300 border-blue-800'
                                          : 'bg-amber-950 text-amber-300 border-amber-800'
                                "
                            >
                                {{
                                    item.session.attendance?.mode === 'ai'
                                        ? 'IA'
                                        : item.session.attendance?.mode === 'human_active'
                                          ? 'Humano'
                                          : 'Fila'
                                }}
                            </span>
                        </div>

                        <!-- Last Message Excerpt -->
                        <p class="text-[11px] text-slate-400 truncate line-clamp-1">
                            {{ item.lastMessage?.text || 'Sem mensagens ainda' }}
                        </p>

                        <!-- Footer Meta -->
                        <div class="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                            <span class="flex items-center gap-1 font-mono">
                                <iconify-icon icon="fa7-regular:comment" class="text-[9px]"></iconify-icon>
                                {{ item.messageCount }} msgs
                            </span>
                            <span>
                                {{ formatRelativeTime(item.session.updatedAt || item.session.createdAt, currentTick) }}
                            </span>
                        </div>
                    </button>
                </div>
            </aside>

            <!-- Center Panel: Chat Stream Area (5 or 6 cols) -->
            <section
                class="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden"
                :class="isSessionsSidebarOpen ? 'lg:col-span-5' : 'lg:col-span-6'"
            >
                <!-- Chat Header -->
                <div class="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
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
                            <h2 class="text-sm font-semibold text-white">Canal Operacional de Atendimento</h2>
                            <p class="text-xs text-slate-400">
                                Nó:
                                <span class="text-cyan-400 font-mono">{{ activeNodeId }}</span>
                                · Intenção:
                                <span class="text-amber-400 font-mono">{{ currentIntent }}</span>
                            </p>
                        </div>
                    </div>

                    <div class="text-xs text-slate-400 font-mono">{{ messages.length }} mensagens</div>
                </div>

                <!-- Attendance Status Header Bar ("Sendo Atendido Por") -->
                <div
                    class="px-5 py-2 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                    <div class="flex items-center gap-2">
                        <span class="text-slate-400 font-medium">Atendimento:</span>
                        <div
                            class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-semibold shadow-sm text-xs"
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
                                class="text-xs"
                            ></iconify-icon>
                            <span>{{ attendance?.assignedTo?.name || 'SystemOne AI' }}</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <!-- Countdown -->
                        <div
                            v-if="attendance?.mode !== 'ai'"
                            class="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-900/70 font-mono"
                        >
                            <iconify-icon icon="fa7-solid:hourglass-half" class="text-amber-400 text-xs"></iconify-icon>
                            <span>IA em: {{ countdownSeconds }}s</span>
                        </div>

                        <!-- Resume AI button -->
                        <button
                            v-if="attendance?.mode !== 'ai'"
                            type="button"
                            @click="handleResumeAi"
                            class="px-2.5 py-1 bg-cyan-900 hover:bg-cyan-800 text-cyan-200 border border-cyan-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                            <iconify-icon icon="fa7-solid:play" class="text-[10px]"></iconify-icon>
                            Retomar IA
                        </button>

                        <!-- Open transfer modal button -->
                        <button
                            v-if="attendance?.mode === 'ai'"
                            type="button"
                            @click="isTransferModalOpen = true"
                            class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 shadow-sm"
                        >
                            <iconify-icon icon="fa7-solid:headset" class="text-xs text-cyan-400"></iconify-icon>
                            Transferir
                        </button>
                    </div>
                </div>

                <!-- Messages Window -->
                <div ref="messagesContainer" class="flex-1 p-5 overflow-y-auto space-y-4 max-h-[52vh]">
                    <div v-for="msg in messages" :key="msg.id" class="flex flex-col">
                        <!-- Message Container (Agent on Right if not internal, User/Bot/System/Internal on Left) -->
                        <div
                            class="flex flex-col"
                            :class="msg.sender === 'agent' && !msg.isInternal ? 'items-end' : 'items-start'"
                        >
                            <!-- Header / Metadata -->
                            <div
                                class="flex items-center gap-2 mb-1 text-[11px] text-slate-400 px-1 max-w-[85%]"
                                :class="msg.sender === 'agent' && !msg.isInternal ? 'justify-end' : 'justify-start'"
                            >
                                <iconify-icon
                                    :icon="
                                        msg.isInternal
                                            ? 'fa7-solid:lock'
                                            : msg.sender === 'agent'
                                              ? 'fa7-solid:headset'
                                              : msg.sender === 'user'
                                                ? 'fa7-solid:user'
                                                : msg.sender === 'system'
                                                  ? 'fa7-solid:circle-info'
                                                  : 'fa7-solid:robot'
                                    "
                                    class="text-xs"
                                    :class="{
                                        'text-amber-400': msg.isInternal,
                                        'text-blue-400': msg.sender === 'agent' && !msg.isInternal,
                                        'text-cyan-400': msg.sender === 'user' && !msg.isInternal,
                                        'text-amber-300': msg.sender === 'system' && !msg.isInternal,
                                        'text-emerald-400': msg.sender === 'bot' && !msg.isInternal,
                                    }"
                                ></iconify-icon>

                                <span
                                    class="font-medium"
                                    :class="
                                        msg.isInternal
                                            ? 'text-amber-300'
                                            : msg.sender === 'agent'
                                              ? 'text-blue-200'
                                              : 'text-slate-200'
                                    "
                                >
                                    {{
                                        msg.isInternal
                                            ? 'Nota / Ação Interna'
                                            : msg.sender === 'agent'
                                              ? msg.agentName
                                                  ? `${msg.agentName} (Você)`
                                                  : 'Você (Atendente)'
                                              : msg.sender === 'user'
                                                ? customer?.name || 'Cliente'
                                                : msg.sender === 'system'
                                                  ? 'Sistema'
                                                  : 'SystemOne Bot'
                                    }}
                                </span>

                                <span
                                    v-if="msg.isInternal"
                                    class="bg-amber-950 text-amber-300 border border-amber-600/70 px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1"
                                >
                                    <iconify-icon icon="fa7-solid:user-shield" class="text-[9px]"></iconify-icon>
                                    Confidencial
                                </span>

                                <span
                                    v-if="msg.sender === 'agent' && !msg.isInternal"
                                    class="bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded text-[10px] font-mono"
                                >
                                    Humano
                                </span>

                                <span
                                    v-if="msg.sender === 'user' && !msg.isInternal"
                                    class="bg-cyan-950 text-cyan-300 border border-cyan-800 px-1.5 py-0.5 rounded text-[10px] font-mono"
                                >
                                    Cliente
                                </span>

                                <span
                                    v-if="msg.detectedIntent && msg.sender !== 'agent' && !msg.isInternal"
                                    class="bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded text-[10px] font-mono"
                                >
                                    {{ msg.detectedIntent }}
                                </span>

                                <span
                                    v-if="msg.secondaryRequest && msg.secondaryRequest !== 'none' && !msg.isInternal"
                                    class="bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.5 rounded text-[10px] font-mono"
                                >
                                    ⚡ {{ msg.secondaryRequest }}
                                </span>

                                <span
                                    v-if="msg.timestamp"
                                    class="text-[10px] text-slate-400 hover:text-slate-200 transition cursor-help flex items-center gap-1 ml-1"
                                    :title="formatIsoWithTimezone(msg.timestamp)"
                                >
                                    <iconify-icon
                                        icon="fa7-regular:clock"
                                        class="text-[9px] text-slate-500"
                                    ></iconify-icon>
                                    {{ formatRelativeTime(msg.timestamp, currentTick) }}
                                </span>
                            </div>

                            <!-- Message Bubble -->
                            <div
                                class="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm prose prose-invert max-w-none prose-p:my-1 prose-headings:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-pre:bg-slate-950/90 prose-pre:border prose-pre:border-slate-700/60 prose-pre:p-3 prose-pre:rounded-xl prose-pre:text-xs prose-code:text-cyan-300 prose-code:font-mono prose-code:bg-slate-950/60 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-a:text-cyan-400 hover:prose-a:text-cyan-300"
                                :class="{
                                    'bg-amber-950/80 border border-amber-600/80 text-amber-100 rounded-tl-none shadow-amber-950/30':
                                        msg.isInternal,
                                    'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-md':
                                        msg.sender === 'agent' && !msg.isInternal,
                                    'bg-slate-800 text-slate-100 border border-slate-700/70 rounded-tl-none':
                                        msg.sender === 'user' && !msg.isInternal,
                                    'bg-slate-900 text-slate-100 border border-slate-700/60 rounded-tl-none':
                                        msg.sender === 'bot' && !msg.isInternal,
                                    'bg-slate-950/95 text-slate-300 border border-slate-800 rounded-tl-none':
                                        msg.sender === 'system' && !msg.isInternal,
                                }"
                                v-html="renderMarkdown(msg.text)"
                            ></div>

                            <!-- Interactive Option Buttons (if bot has options) -->
                            <div
                                v-if="msg.sender === 'bot' && msg.options && msg.options.length > 0"
                                class="flex flex-wrap gap-2 mt-2 max-w-[85%]"
                            >
                                <button
                                    v-for="(opt, optIndex) in msg.options"
                                    :key="optIndex"
                                    type="button"
                                    @click="handleSendAgentMessage(opt)"
                                    :disabled="isLoading"
                                    class="text-xs bg-slate-800/90 hover:bg-cyan-950 text-cyan-300 hover:text-cyan-100 border border-slate-700 hover:border-cyan-500 px-3 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                    <iconify-icon icon="fa7-solid:arrow-right" class="text-[10px]"></iconify-icon>
                                    {{ opt }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div v-if="isLoading" class="flex items-center gap-2 text-xs text-cyan-400 animate-pulse px-2 py-1">
                        <iconify-icon icon="fa7-solid:spinner" class="animate-spin text-sm"></iconify-icon>
                        <span>Processando atendimento...</span>
                    </div>
                </div>

                <!-- Quick Suggestions Chips -->
                <div class="px-5 py-2 bg-slate-900/60 border-t border-slate-800/80">
                    <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                        <span class="text-slate-400 text-[11px] font-medium shrink-0">Sugestões:</span>
                        <button
                            v-for="(sug, index) in quickSuggestions"
                            :key="index"
                            type="button"
                            @click="handleUnifiedSubmit(sug.text)"
                            :disabled="isLoading"
                            class="shrink-0 text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700/70 px-2.5 py-1 rounded-full transition cursor-pointer disabled:opacity-50"
                        >
                            {{ sug.label }}
                        </button>
                    </div>
                </div>

                <!-- Unified Input Box (Single form with sender selector) -->
                <form
                    @submit.prevent="handleUnifiedSubmit()"
                    class="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2.5"
                >
                    <!-- Sender Mode Selector Pills -->
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
                            <span class="text-[11px] text-slate-500 font-medium px-2 hidden sm:inline">
                                Enviar como:
                            </span>

                            <button
                                type="button"
                                @click="sendRole = 'agent'"
                                class="px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                                :class="
                                    sendRole === 'agent'
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                "
                            >
                                <iconify-icon icon="fa7-solid:headset" class="text-xs"></iconify-icon>
                                <span>Atendente</span>
                            </button>

                            <button
                                type="button"
                                @click="sendRole = 'note'"
                                class="px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                                :class="
                                    sendRole === 'note'
                                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                "
                            >
                                <iconify-icon icon="fa7-solid:lock" class="text-xs"></iconify-icon>
                                <span>Nota Interna</span>
                            </button>
                        </div>

                        <div class="text-[11px] flex items-center gap-1.5 text-slate-400">
                            <span
                                v-if="attendance?.mode !== 'ai'"
                                class="text-amber-400 font-medium flex items-center gap-1"
                            >
                                <iconify-icon icon="fa7-solid:circle-pause" class="text-xs"></iconify-icon>
                                IA Pausada
                            </span>
                            <span v-else class="text-emerald-400 font-medium flex items-center gap-1">
                                <iconify-icon icon="fa7-solid:circle-check" class="text-xs"></iconify-icon>
                                IA Ativa
                            </span>
                        </div>
                    </div>

                    <!-- Main Text Input Row -->
                    <div class="flex items-center gap-2">
                        <input
                            ref="inputRef"
                            v-model="inputText"
                            type="text"
                            :placeholder="
                                sendRole === 'note'
                                    ? 'Digite uma nota interna (visível apenas para atendentes)...'
                                    : 'Digite sua resposta como atendente humano...'
                            "
                            class="flex-1 bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition"
                            :class="
                                sendRole === 'note'
                                    ? 'border-amber-600/70 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30'
                                    : 'border-blue-700/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30'
                            "
                        />

                        <button
                            type="submit"
                            :disabled="isLoading || !inputText.trim()"
                            class="px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition cursor-pointer flex items-center gap-1.5 shadow-md disabled:opacity-50 text-white whitespace-nowrap"
                            :class="
                                sendRole === 'note'
                                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                                    : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'
                            "
                        >
                            <iconify-icon
                                :icon="sendRole === 'note' ? 'fa7-solid:lock' : 'fa7-solid:headset'"
                            ></iconify-icon>
                            <span>
                                {{ sendRole === 'note' ? 'Salvar Nota Interna' : 'Enviar como Atendente' }}
                            </span>
                        </button>
                    </div>
                </form>
            </section>

            <!-- Right Panel: Operator Tools & Customer Profile (3 or 4 cols) -->
            <aside class="flex flex-col gap-4" :class="isSessionsSidebarOpen ? 'lg:col-span-4' : 'lg:col-span-6'">
                <!-- Operator Quick Macros Card -->
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <iconify-icon icon="fa7-solid:bolt" class="text-blue-400"></iconify-icon>
                            Respostas Rápidas do Atendente
                        </h3>
                        <span
                            class="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full font-mono"
                        >
                            Macros
                        </span>
                    </div>

                    <div class="space-y-1.5">
                        <button
                            v-for="(macro, mIdx) in operatorQuickMacros"
                            :key="mIdx"
                            type="button"
                            @click="handleApplyMacro(macro)"
                            class="w-full text-left p-2 rounded-xl text-xs bg-slate-950/70 hover:bg-slate-800 border border-slate-800 hover:border-blue-700/80 text-slate-300 hover:text-white transition flex items-center justify-between group cursor-pointer"
                        >
                            <span class="line-clamp-1 mr-2">{{ macro }}</span>
                            <iconify-icon
                                icon="fa7-solid:arrow-up-right-from-square"
                                class="text-[10px] text-slate-500 group-hover:text-blue-400 shrink-0"
                            ></iconify-icon>
                        </button>
                    </div>
                </div>

                <!-- Omnichannel Attendance Desk Card -->
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <iconify-icon icon="fa7-solid:headset" class="text-cyan-400"></iconify-icon>
                            Gestão de Filas e Transição
                        </h3>
                        <button
                            type="button"
                            @click="handleResumeAi"
                            :disabled="isLoading || attendance?.mode === 'ai'"
                            class="text-[11px] px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-lg font-medium transition disabled:opacity-40 flex items-center gap-1"
                        >
                            <iconify-icon icon="fa7-solid:robot" class="text-[10px]"></iconify-icon>
                            Devolver à IA
                        </button>
                    </div>

                    <!-- Transfer Department Actions -->
                    <div>
                        <span class="text-slate-400 block mb-1 text-[11px] font-medium">Transferir para Fila:</span>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            <button
                                v-for="dept in deskDepartments"
                                :key="dept.id"
                                type="button"
                                @click="handleTransfer(dept.id)"
                                :disabled="isLoading"
                                class="py-1.5 px-2 bg-slate-800/80 hover:bg-slate-800 text-left rounded-lg border border-slate-700/80 hover:border-cyan-500 transition cursor-pointer flex items-center justify-between text-[11px]"
                            >
                                <span class="font-medium text-slate-200 truncate">{{ dept.name }}</span>
                                <span class="text-slate-400 text-[10px]">~{{ dept.estimatedWaitSeconds }}s</span>
                            </button>
                        </div>
                    </div>

                    <!-- Online Agents Direct Transfer -->
                    <div v-if="deskAgents && deskAgents.length > 0">
                        <span class="text-slate-400 block mb-1 text-[11px] font-medium">Atendentes Online:</span>
                        <div class="space-y-1">
                            <button
                                v-for="ag in deskAgents"
                                :key="ag.id"
                                type="button"
                                @click="handleTransfer(undefined, ag.id)"
                                :disabled="isLoading"
                                class="w-full py-1 px-2 bg-slate-800/80 hover:bg-slate-800 text-left rounded-lg border border-slate-700/80 hover:border-blue-500 transition cursor-pointer flex items-center justify-between text-[11px]"
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

                    <!-- Inactivity Timeout Selector -->
                    <div>
                        <span class="text-slate-400 block mb-1 text-[11px] font-medium">
                            Tempo Limite de Inatividade (Retomada Automática da IA):
                        </span>
                        <div class="grid grid-cols-4 gap-1.5">
                            <button
                                v-for="sec in [15, 30, 60, 120]"
                                :key="sec"
                                type="button"
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
                </div>

                <!-- Operator Technical & Telecom Support Actions Card -->
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <iconify-icon icon="fa7-solid:screwdriver-wrench" class="text-amber-400"></iconify-icon>
                            Ações de Suporte do Provedor
                        </h3>
                        <span
                            class="text-[10px] px-2 py-0.5 rounded-full font-mono border font-semibold"
                            :class="
                                customer?.connectionStatus === 'suspended'
                                    ? 'bg-rose-950 text-rose-300 border-rose-800'
                                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            "
                        >
                            {{ customer?.connectionStatus === 'suspended' ? '🔴 Link Suspenso' : '🟢 Link Ativo' }}
                        </span>
                    </div>

                    <!-- Telemetry Summary Pill if Available -->
                    <div
                        v-if="customer?.opticalSignal"
                        class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]"
                    >
                        <span class="text-slate-400 flex items-center gap-1">
                            <iconify-icon icon="fa7-solid:tower-broadcast" class="text-cyan-400 text-xs"></iconify-icon>
                            Sinal RX/TX:
                        </span>
                        <span class="font-mono text-cyan-300">
                            {{ customer.opticalSignal.rxPowerDbm }} dBm / {{ customer.opticalSignal.txPowerDbm }} dBm
                        </span>
                        <span
                            class="px-1.5 py-0.5 rounded text-[10px] font-mono border"
                            :class="
                                customer.opticalSignal.ponStatus === 'operational'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : 'bg-rose-950 text-rose-300 border-rose-800'
                            "
                        >
                            {{ customer.opticalSignal.ponStatus }}
                        </span>
                    </div>

                    <!-- Action Buttons Grid -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <!-- Check Signal -->
                        <button
                            type="button"
                            @click="handleExecuteOperatorAction('check_signal')"
                            :disabled="isLoading"
                            class="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500 rounded-xl text-left transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <iconify-icon
                                icon="fa7-solid:chart-line"
                                class="text-cyan-400 text-sm shrink-0"
                            ></iconify-icon>
                            <div>
                                <span class="block text-xs font-semibold text-slate-200">Verificar Sinal</span>
                                <span class="block text-[10px] text-slate-400">Telemetria óptica dBm</span>
                            </div>
                        </button>

                        <!-- Toggle Suspend / Reactivate -->
                        <button
                            v-if="customer?.connectionStatus !== 'suspended'"
                            type="button"
                            @click="handleExecuteOperatorAction('suspend_internet')"
                            :disabled="isLoading"
                            class="p-2.5 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/60 hover:border-rose-600 rounded-xl text-left transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <iconify-icon icon="fa7-solid:ban" class="text-rose-400 text-sm shrink-0"></iconify-icon>
                            <div>
                                <span class="block text-xs font-semibold text-rose-200">Suspender Internet</span>
                                <span class="block text-[10px] text-rose-400/80">Corta fornecimento</span>
                            </div>
                        </button>

                        <button
                            v-else
                            type="button"
                            @click="handleExecuteOperatorAction('activate_internet')"
                            :disabled="isLoading"
                            class="p-2.5 bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-900/60 hover:border-emerald-600 rounded-xl text-left transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <iconify-icon
                                icon="fa7-solid:circle-check"
                                class="text-emerald-400 text-sm shrink-0"
                            ></iconify-icon>
                            <div>
                                <span class="block text-xs font-semibold text-emerald-200">Reativar Internet</span>
                                <span class="block text-[10px] text-emerald-400/80">Libera fornecimento</span>
                            </div>
                        </button>

                        <!-- Reboot Remote ONU -->
                        <button
                            type="button"
                            @click="handleExecuteOperatorAction('reboot_onu')"
                            :disabled="isLoading"
                            class="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500 rounded-xl text-left transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <iconify-icon
                                icon="fa7-solid:arrows-rotate"
                                class="text-amber-400 text-sm shrink-0"
                            ></iconify-icon>
                            <div>
                                <span class="block text-xs font-semibold text-slate-200">Reiniciar ONU</span>
                                <span class="block text-[10px] text-slate-400">Comando TR-069</span>
                            </div>
                        </button>

                        <!-- View Invoices Internally -->
                        <button
                            type="button"
                            @click="handleExecuteOperatorAction('view_invoices')"
                            :disabled="isLoading"
                            class="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500 rounded-xl text-left transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <iconify-icon
                                icon="fa7-solid:file-invoice-dollar"
                                class="text-blue-400 text-sm shrink-0"
                            ></iconify-icon>
                            <div>
                                <span class="block text-xs font-semibold text-slate-200">Consultar Faturas</span>
                                <span class="block text-[10px] text-slate-400">Extrato financeiro interno</span>
                            </div>
                        </button>

                        <!-- Unlock Promise (48h) -->
                        <button
                            type="button"
                            @click="handleExecuteOperatorAction('unlock_promise')"
                            :disabled="isLoading"
                            class="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 rounded-xl text-left transition flex items-center gap-2 cursor-pointer disabled:opacity-50 sm:col-span-2"
                        >
                            <iconify-icon
                                icon="fa7-solid:handshake"
                                class="text-emerald-400 text-sm shrink-0"
                            ></iconify-icon>
                            <div>
                                <span class="block text-xs font-semibold text-slate-200">
                                    Desbloqueio em Confiança (48h)
                                </span>
                                <span class="block text-[10px] text-slate-400">Promessa de pagamento temporária</span>
                            </div>
                        </button>
                    </div>
                </div>

                <!-- Customer Profile Card -->
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
                    <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                            <iconify-icon icon="fa7-solid:id-card" class="text-cyan-400"></iconify-icon>
                            Dados do Cliente
                        </h3>
                        <span
                            class="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                            :class="
                                customer?.isIdentified
                                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                    : 'bg-amber-950 text-amber-400 border-amber-800'
                            "
                        >
                            {{ customer?.isIdentified ? 'Identificado' : 'Visitante' }}
                        </span>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <span class="text-slate-400 block text-[10px]">Nome:</span>
                            <span class="font-medium text-white">{{ customer?.name || 'Não informado' }}</span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[10px]">Telefone:</span>
                            <span class="font-mono text-slate-200">{{ customer?.phone || 'Não informado' }}</span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[10px]">CPF/CNPJ:</span>
                            <span class="font-mono text-slate-200">{{ customer?.cpfCnpj || 'Não informado' }}</span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[10px]">Plano:</span>
                            <span class="font-medium text-cyan-300">{{ customer?.plan || 'Nenhum' }}</span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[10px]">Fornecimento:</span>
                            <span
                                class="font-semibold text-[11px]"
                                :class="
                                    customer?.connectionStatus === 'suspended' ? 'text-rose-400' : 'text-emerald-400'
                                "
                            >
                                {{ customer?.connectionStatus === 'suspended' ? '🔴 Suspenso' : '🟢 Ativo' }}
                            </span>
                        </div>
                        <div v-if="customer?.opticalSignal">
                            <span class="text-slate-400 block text-[10px]">Sinal RX:</span>
                            <span class="font-mono text-cyan-400">{{ customer.opticalSignal.rxPowerDbm }} dBm</span>
                        </div>
                    </div>

                    <div class="pt-2 border-t border-slate-800 flex justify-end">
                        <button
                            type="button"
                            @click="handleResetSession"
                            class="text-xs text-rose-400 hover:text-rose-300 transition flex items-center gap-1"
                        >
                            <iconify-icon icon="fa7-solid:trash-can" class="text-[10px]"></iconify-icon>
                            Resetar Sessão do Cliente
                        </button>
                    </div>
                </div>
            </aside>
        </div>

        <!-- Transfer Modal -->
        <div
            v-if="isTransferModalOpen"
            class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
            <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-base font-bold text-white flex items-center gap-2">
                        <iconify-icon icon="fa7-solid:headset" class="text-cyan-400"></iconify-icon>
                        Transferir Atendimento
                    </h3>
                    <button
                        type="button"
                        @click="isTransferModalOpen = false"
                        class="text-slate-400 hover:text-white text-lg"
                    >
                        <iconify-icon icon="fa7-solid:xmark"></iconify-icon>
                    </button>
                </div>

                <p class="text-xs text-slate-400 mb-4">
                    Selecione o setor ou atendente específico para assumir esta conversa. A resposta da IA será pausada
                    automaticamente.
                </p>

                <div class="space-y-3">
                    <div>
                        <label class="text-xs text-slate-300 font-semibold mb-1 block">Setores:</label>
                        <div class="space-y-1.5">
                            <button
                                v-for="dept in deskDepartments"
                                :key="dept.id"
                                type="button"
                                @click="handleTransfer(dept.id)"
                                class="w-full p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500 rounded-xl text-left flex items-center justify-between text-xs transition"
                            >
                                <span class="font-semibold text-white">{{ dept.name }}</span>
                                <span class="text-slate-400 text-[10px]">
                                    Espera: ~{{ dept.estimatedWaitSeconds }}s
                                </span>
                            </button>
                        </div>
                    </div>

                    <div v-if="deskAgents && deskAgents.length > 0">
                        <label class="text-xs text-slate-300 font-semibold mb-1 block">Atendentes:</label>
                        <div class="space-y-1.5">
                            <button
                                v-for="ag in deskAgents"
                                :key="ag.id"
                                type="button"
                                @click="handleTransfer(undefined, ag.id)"
                                class="w-full p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500 rounded-xl text-left flex items-center justify-between text-xs transition"
                            >
                                <div class="flex items-center gap-2">
                                    <span
                                        class="w-2 h-2 rounded-full"
                                        :class="ag.isOnline ? 'bg-emerald-400' : 'bg-slate-500'"
                                    ></span>
                                    <span class="font-semibold text-white">{{ ag.name }}</span>
                                </div>
                                <span class="text-slate-400 text-[10px]">{{ ag.departmentName }}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="mt-6 flex justify-end">
                    <button
                        type="button"
                        @click="isTransferModalOpen = false"
                        class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    </main>
</template>
