<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ApiService } from '../services/api';

const companyRules = ref('');
const additionalInstructions = ref('');
const cachedSummary = ref('');
const lastCompiledAt = ref<number>(0);

const isLoading = ref(false);
const isSaving = ref(false);
const isRebuilding = ref(false);
const statusMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

function formatTimestamp(timestamp: number): string {
    if (!timestamp) {
        return 'Nunca compilado';
    }

    const date = new Date(timestamp);

    return date.toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'medium',
    });
}

async function loadKnowledge(): Promise<void> {
    isLoading.value = true;
    statusMessage.value = null;

    try {
        const data = await ApiService.getKnowledge();

        companyRules.value = data.companyRules || '';
        additionalInstructions.value = data.additionalInstructions || '';
        cachedSummary.value = data.cachedSummary || '';
        lastCompiledAt.value = data.lastCompiledAt || 0;
    } catch (error) {
        statusMessage.value = {
            type: 'error',
            text: `Erro ao carregar dados: ${(error as Error).message}`,
        };
    } finally {
        isLoading.value = false;
    }
}

async function handleSaveKnowledge(): Promise<void> {
    if (!companyRules.value.trim()) {
        statusMessage.value = {
            type: 'error',
            text: 'As regras da empresa não podem ficar vazias.',
        };
        return;
    }

    isSaving.value = true;
    statusMessage.value = null;

    try {
        const updated = await ApiService.updateKnowledge(companyRules.value, additionalInstructions.value);

        companyRules.value = updated.companyRules;
        additionalInstructions.value = updated.additionalInstructions;
        cachedSummary.value = updated.cachedSummary;
        lastCompiledAt.value = updated.lastCompiledAt;

        statusMessage.value = {
            type: 'success',
            text: 'Regras salvas e resumo em cache recalculado com sucesso pela IA!',
        };
    } catch (error) {
        statusMessage.value = {
            type: 'error',
            text: `Erro ao salvar regras: ${(error as Error).message}`,
        };
    } finally {
        isSaving.value = false;
    }
}

async function handleRebuildCache(): Promise<void> {
    isRebuilding.value = true;
    statusMessage.value = null;

    try {
        const updated = await ApiService.rebuildKnowledgeCache();

        cachedSummary.value = updated.cachedSummary;
        lastCompiledAt.value = updated.lastCompiledAt;

        statusMessage.value = {
            type: 'success',
            text: 'Cache limpo e recalculado com sucesso pela IA leve!',
        };
    } catch (error) {
        statusMessage.value = {
            type: 'error',
            text: `Erro ao reconstruir cache: ${(error as Error).message}`,
        };
    } finally {
        isRebuilding.value = false;
    }
}

onMounted(() => {
    loadKnowledge();
});
</script>

<template>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Header Banner -->
        <div
            class="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6"
        >
            <div>
                <h1 class="text-2xl font-bold text-white flex items-center gap-3">
                    <iconify-icon icon="fa7-solid:book-open" class="text-cyan-400"></iconify-icon>
                    Base de Conhecimento e Regras
                </h1>
                <p class="text-sm text-slate-400 mt-1">
                    Cadastre regras institucionais, horários, endereço presencial e avisos temporários. Uma IA leve
                    sintetiza as regras em um resumo compacto mantido em cache para respostas rápidas.
                </p>
            </div>

            <!-- Header Quick Actions -->
            <div class="flex items-center gap-3">
                <button
                    type="button"
                    class="px-4 py-2 text-sm font-medium rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:border-slate-600 transition flex items-center gap-2 disabled:opacity-50"
                    :disabled="isLoading || isSaving || isRebuilding"
                    @click="handleRebuildCache"
                >
                    <iconify-icon
                        :icon="isRebuilding ? 'fa7-solid:spinner' : 'fa7-solid:rotate-right'"
                        :class="isRebuilding ? 'animate-spin' : ''"
                        class="text-base text-cyan-400"
                    ></iconify-icon>
                    Limpar e Recalcular Cache
                </button>

                <button
                    type="button"
                    class="px-5 py-2 text-sm font-semibold rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-600/20 transition flex items-center gap-2 disabled:opacity-50"
                    :disabled="isLoading || isSaving || isRebuilding"
                    @click="handleSaveKnowledge"
                >
                    <iconify-icon
                        :icon="isSaving ? 'fa7-solid:spinner' : 'fa7-solid:floppy-disk'"
                        :class="isSaving ? 'animate-spin' : ''"
                        class="text-base"
                    ></iconify-icon>
                    Salvar e Atualizar Resumo
                </button>
            </div>
        </div>

        <!-- Feedback Alert Banner -->
        <div
            v-if="statusMessage"
            class="mb-6 p-4 rounded-xl border flex items-center gap-3 transition"
            :class="
                statusMessage.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                    : 'bg-rose-950/60 border-rose-800 text-rose-200'
            "
        >
            <iconify-icon
                :icon="statusMessage.type === 'success' ? 'fa7-solid:circle-check' : 'fa7-solid:circle-exclamation'"
                class="text-lg"
            ></iconify-icon>
            <span class="text-sm font-medium">{{ statusMessage.text }}</span>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <!-- Left Column: Knowledge Inputs -->
            <div class="lg:col-span-7 space-y-6">
                <!-- Company Rules Card -->
                <div class="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <label class="text-sm font-semibold text-slate-200 flex items-center gap-2">
                            <iconify-icon icon="fa7-solid:building" class="text-cyan-400"></iconify-icon>
                            Regras e Informações da Empresa (Permanente)
                        </label>
                        <span class="text-xs text-slate-500 font-mono">{{ companyRules.length }} caracteres</span>
                    </div>
                    <p class="text-xs text-slate-400 mb-4">
                        Endereço físico para atendimento presencial, horários regulares de abertura e fechamento,
                        políticas de suporte, canais de contato e formas de pagamento.
                    </p>
                    <textarea
                        v-model="companyRules"
                        rows="8"
                        placeholder="Ex: A Telecom Connect oferece atendimento presencial na Av. Paulista, 1000... De segunda a sexta das 08h às 18h..."
                        class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition leading-relaxed font-sans"
                        :disabled="isLoading"
                    ></textarea>
                </div>

                <!-- Additional Instructions / Temporary Notices Card -->
                <div class="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div class="flex items-center justify-between mb-3">
                        <label class="text-sm font-semibold text-slate-200 flex items-center gap-2">
                            <iconify-icon icon="fa7-solid:triangle-exclamation" class="text-amber-400"></iconify-icon>
                            Instruções Adicionais e Exceções Temporárias
                        </label>
                        <span class="text-xs text-slate-500 font-mono">
                            {{ additionalInstructions.length }} caracteres
                        </span>
                    </div>
                    <p class="text-xs text-slate-400 mb-4">
                        Avisos de feriados, alterações de expediente em dias específicos (ex: fechamento na quarta-feira
                        das 12h às 18h para manutenção) ou avisos pontuais sem precisar reescrever a base inteira.
                    </p>
                    <textarea
                        v-model="additionalInstructions"
                        rows="5"
                        placeholder="Ex: Aviso especial: Na próxima quarta-feira não haverá atendimento presencial no período da tarde devido a manutenção..."
                        class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition leading-relaxed font-sans"
                        :disabled="isLoading"
                    ></textarea>
                </div>
            </div>

            <!-- Right Column: Compiled Summary & Cache Viewer -->
            <div class="lg:col-span-5 space-y-6">
                <div
                    class="bg-slate-900/90 border border-cyan-900/40 rounded-2xl p-6 shadow-xl relative overflow-hidden"
                >
                    <div
                        class="absolute -right-12 -top-12 w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"
                    ></div>

                    <!-- Cache Status Header -->
                    <div class="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-4">
                        <div class="flex items-center gap-2">
                            <div
                                class="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400"
                            >
                                <iconify-icon icon="fa7-solid:microchip" class="text-sm"></iconify-icon>
                            </div>
                            <div>
                                <h2 class="text-sm font-bold text-white">Resumo em Cache</h2>
                                <p class="text-xs text-cyan-400">Sintetizado por IA Leve</p>
                            </div>
                        </div>

                        <span
                            class="px-2.5 py-1 rounded-full text-xs font-mono border"
                            :class="
                                cachedSummary
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                                    : 'bg-amber-950/80 text-amber-300 border-amber-800'
                            "
                        >
                            {{ cachedSummary ? 'Cache Válido' : 'Sem Cache' }}
                        </span>
                    </div>

                    <!-- Last Compiled Metadata -->
                    <div
                        class="mb-4 bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-400"
                    >
                        <span class="flex items-center gap-1.5">
                            <iconify-icon icon="fa7-solid:clock" class="text-slate-500"></iconify-icon>
                            Última compilação:
                        </span>
                        <span class="font-mono text-slate-200">{{ formatTimestamp(lastCompiledAt) }}</span>
                    </div>

                    <!-- Summary Content Box -->
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                Conteúdo Sintetizado
                            </span>
                            <span class="text-xs text-slate-500 font-mono">{{ cachedSummary.length }} caracteres</span>
                        </div>

                        <div
                            v-if="isLoading"
                            class="py-12 flex flex-col items-center justify-center text-slate-400 gap-3"
                        >
                            <iconify-icon
                                icon="fa7-solid:spinner"
                                class="animate-spin text-2xl text-cyan-400"
                            ></iconify-icon>
                            <span class="text-xs">Carregando base de conhecimento...</span>
                        </div>

                        <div
                            v-else-if="cachedSummary"
                            class="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans max-h-96 overflow-y-auto selection:bg-cyan-900 selection:text-white"
                        >
                            {{ cachedSummary }}
                        </div>

                        <div
                            v-else
                            class="bg-slate-950/50 border border-dashed border-slate-800 rounded-xl p-6 text-center text-xs text-slate-500"
                        >
                            Nenhum resumo compilado em cache. Clique em "Salvar e Atualizar Resumo" para compilar pela
                            primeira vez.
                        </div>
                    </div>

                    <!-- Info Box -->
                    <div class="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-2">
                        <div class="flex items-start gap-2">
                            <iconify-icon
                                icon="fa7-solid:circle-info"
                                class="text-cyan-400 mt-0.5 text-sm shrink-0"
                            ></iconify-icon>
                            <p>
                                Este resumo condensado é injetado diretamente nas interações de triagem e atendimento.
                                Isso reduz o consumo de tokens e garante respostas precisas sobre horários e exceções.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
