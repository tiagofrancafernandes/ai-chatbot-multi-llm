<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { toast } from 'vue3-toastify';
import { ApiService } from '../services/api';
import { Customer, ChatMessage, ProviderInfo } from '../types/chat';

const STORAGE_KEY = 'chat_customer_id';

const messages = ref<ChatMessage[]>([]);
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

const messagesContainer = ref<HTMLDivElement | null>(null);

const quickSuggestions = [
    { label: 'Say Hi', text: 'Olá, bom dia!' },
    { label: 'Check Plans & Pricing', text: 'Quais são os planos e valores disponíveis?' },
    { label: 'Auth with Mock Phone', text: 'Meu telefone cadastrado é 5511999999999' },
    { label: 'Auth with Mock CPF', text: 'Meu CPF é 123.456.789-00' },
    {
        label: 'Broken System + Invoice Request',
        text: 'O sistema caiu de novo. Aproveitando, vocês podem me mandar a segunda via da fatura deste mês?',
    },
    { label: 'Financial Statements', text: 'Quero ver minhas faturas e extrato financeiro' },
];

onMounted(async () => {
    await loadProviders();
    await initSession();
});

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

        messages.value = result.session.messages;
        activeNodeId.value = result.session.activeNodeId;
        currentIntent.value = result.session.currentIntent || 'greeting';

        await scrollToBottom();
    } catch (error) {
        toast.error(`Session error: ${(error as Error).message}`);
    } finally {
        isLoading.value = false;
    }
}

async function handleSendMessage(customText?: string): Promise<void> {
    const textToSend = (customText || inputText.value).trim();

    if (!textToSend) {
        return;
    }

    if (isLoading.value) {
        return;
    }

    inputText.value = '';

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

        // If backend shifted customer ID (e.g. from guest to verified phone)
        if (result.customer.id !== currentCustomerId.value) {
            currentCustomerId.value = result.customer.id;
            localStorage.setItem(STORAGE_KEY, result.customer.id);
            toast.success(`Authenticated as ${result.customer.name || result.customer.id}!`);
        }

        messages.value = result.session.messages;
        activeNodeId.value = result.session.activeNodeId;

        if (result.analysis) {
            currentIntent.value = result.analysis.primaryIntent;
            secondaryRequest.value = result.analysis.secondaryRequest;
        }

        await scrollToBottom();
    } catch (error) {
        toast.error(`Failed to deliver message: ${(error as Error).message}`);
    } finally {
        isLoading.value = false;
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
                    <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    <div>
                        <h2 class="text-sm font-semibold text-white">Live AI Support Stream</h2>
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

            <!-- Messages Window -->
            <div ref="messagesContainer" class="flex-1 p-6 overflow-y-auto space-y-4 max-h-[58vh]">
                <div
                    v-for="msg in messages"
                    :key="msg.id"
                    class="flex flex-col"
                    :class="msg.sender === 'user' ? 'items-end' : 'items-start'"
                >
                    <div class="flex items-center gap-2 mb-1 text-[11px] text-slate-400 px-1">
                        <iconify-icon
                            :icon="msg.sender === 'user' ? 'fa7-solid:user' : 'fa7-solid:robot'"
                            class="text-xs"
                        ></iconify-icon>
                        <span>{{ msg.sender === 'user' ? 'You' : 'SystemOne Bot' }}</span>
                        <span
                            v-if="msg.detectedIntent"
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
                        :class="
                            msg.sender === 'user'
                                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-sm'
                                : 'bg-slate-800 text-slate-100 border border-slate-700/60 rounded-tl-sm'
                        "
                    >
                        {{ msg.text }}
                    </div>
                </div>

                <div v-if="isLoading" class="flex items-center gap-2 text-xs text-cyan-400 animate-pulse px-2 py-1">
                    <iconify-icon icon="fa7-solid:spinner" class="animate-spin text-sm"></iconify-icon>
                    <span>Analyzing state with {{ activeProvider }} ({{ activeModel }})...</span>
                </div>
            </div>

            <!-- Quick Suggestions Chips -->
            <div class="px-6 py-2.5 bg-slate-900/60 border-t border-slate-800/80">
                <p class="text-[11px] text-slate-400 mb-2 flex items-center gap-1 font-medium">
                    <iconify-icon icon="fa7-solid:lightbulb" class="text-amber-400"></iconify-icon>
                    Quick Suggestions:
                </p>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="(sug, index) in quickSuggestions"
                        :key="index"
                        @click="handleSendMessage(sug.text)"
                        :disabled="isLoading"
                        class="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700/70 hover:border-cyan-700 px-3 py-1.5 rounded-full transition cursor-pointer disabled:opacity-50"
                    >
                        {{ sug.label }}
                    </button>
                </div>
            </div>

            <!-- Input Box -->
            <form @submit.prevent="handleSendMessage()" class="p-4 bg-slate-900 border-t border-slate-800 flex gap-3">
                <input
                    v-model="inputText"
                    type="text"
                    placeholder="Type your message, phone number, or ask about plans..."
                    :disabled="isLoading"
                    class="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                />

                <button
                    type="submit"
                    :disabled="isLoading || !inputText.trim()"
                    class="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-medium text-sm transition cursor-pointer flex items-center gap-2 shadow-lg shadow-cyan-600/20"
                >
                    <iconify-icon icon="fa7-solid:paper-plane"></iconify-icon>
                    <span class="hidden sm:inline">Send</span>
                </button>
            </form>
        </section>

        <!-- Right Panel: Customer Inspector & Session Cache (4 Cols) -->
        <aside class="lg:col-span-4 flex flex-col gap-6">
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
                    <p class="text-[10px] text-slate-500 text-center mt-1.5">
                        Clears localStorage token to restart as a fresh unauthenticated guest.
                    </p>
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
