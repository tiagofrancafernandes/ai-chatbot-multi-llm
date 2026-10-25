<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { toast } from 'vue3-toastify';
import { ApiService } from '../services/api';

interface FlowNode {
    id: string;
    name: string;
    type: string;
    description: string;
    actionType?: string;
    responseTemplate?: string;
    transitions: Array<{
        id: string;
        targetNodeId: string;
        condition: {
            type: string;
            value?: string;
        };
        description?: string;
    }>;
}

interface FlowData {
    id: string;
    name: string;
    entryNodeId: string;
    nodes: FlowNode[];
    updatedAt: number;
}

const flow = ref<FlowData | null>(null);
const isLoading = ref<boolean>(true);

onMounted(async () => {
    await fetchFlow();
});

async function fetchFlow(): Promise<void> {
    try {
        isLoading.value = true;
        const data = (await ApiService.getFlow()) as FlowData;
        flow.value = data;
    } catch (error) {
        toast.error(`Failed to load flow: ${(error as Error).message}`);
    } finally {
        isLoading.value = false;
    }
}
</script>

<template>
    <div class="space-y-6">
        <!-- Header -->
        <div
            class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
            <div>
                <h2 class="text-xl font-bold text-white flex items-center gap-2">
                    <iconify-icon icon="fa7-solid:diagram-project" class="text-cyan-400"></iconify-icon>
                    Configurable Intent Flow Graph
                </h2>
                <p class="text-xs text-slate-400 mt-1">
                    Visualizing active node graph, AI triage decisions, business action triggers and routing edges.
                </p>
            </div>

            <div class="flex items-center gap-3">
                <span class="text-xs text-slate-400">
                    Entry Node:
                    <code class="text-cyan-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {{ flow?.entryNodeId || '...' }}
                    </code>
                </span>
                <button
                    @click="fetchFlow"
                    class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                >
                    <iconify-icon icon="fa7-solid:rotate-right"></iconify-icon>
                    Refresh Flow
                </button>
            </div>
        </div>

        <!-- Flow Nodes Grid -->
        <div v-if="isLoading" class="p-12 text-center text-sm text-cyan-400 animate-pulse">
            <iconify-icon icon="fa7-solid:spinner" class="animate-spin text-2xl mb-2"></iconify-icon>
            <p>Loading flow schema from JSON database...</p>
        </div>

        <div v-else-if="flow" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
                v-for="node in flow.nodes"
                :key="node.id"
                class="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-cyan-800 transition relative overflow-hidden"
            >
                <div class="space-y-3">
                    <!-- Node Badge & Title -->
                    <div class="flex items-start justify-between gap-2">
                        <div>
                            <h3 class="text-sm font-semibold text-white">{{ node.name }}</h3>
                            <code class="text-[11px] font-mono text-cyan-400 block">{{ node.id }}</code>
                        </div>

                        <span
                            class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                            :class="{
                                'bg-purple-950 text-purple-300 border-purple-800': node.type === 'decision',
                                'bg-blue-950 text-blue-300 border-blue-800': node.type === 'action',
                                'bg-emerald-950 text-emerald-300 border-emerald-800': node.type === 'message',
                                'bg-amber-950 text-amber-300 border-amber-800': node.type === 'router',
                            }"
                        >
                            {{ node.type }}
                        </span>
                    </div>

                    <p class="text-xs text-slate-300 leading-relaxed">{{ node.description }}</p>

                    <!-- Action Details -->
                    <div v-if="node.actionType" class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                        <span class="text-slate-400 block text-[10px] uppercase font-semibold">Action Trigger:</span>
                        <code class="text-blue-400 font-mono text-[11px]">{{ node.actionType }}</code>
                    </div>

                    <!-- Response Template -->
                    <div
                        v-if="node.responseTemplate"
                        class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs"
                    >
                        <span class="text-slate-400 block text-[10px] uppercase font-semibold">Response Template:</span>
                        <p class="text-slate-300 text-[11px] font-mono whitespace-pre-wrap mt-1">
                            "{{ node.responseTemplate }}"
                        </p>
                    </div>

                    <!-- Transitions / Outgoing Edges -->
                    <div v-if="node.transitions && node.transitions.length > 0" class="pt-2">
                        <span
                            class="text-slate-400 block text-[10px] uppercase font-semibold mb-1.5 flex items-center gap-1"
                        >
                            <iconify-icon icon="fa7-solid:arrow-right" class="text-cyan-400"></iconify-icon>
                            Transitions ({{ node.transitions.length }}):
                        </span>

                        <ul class="space-y-1.5">
                            <li
                                v-for="trans in node.transitions"
                                :key="trans.id"
                                class="text-[11px] p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex flex-col gap-0.5 font-mono"
                            >
                                <div class="flex items-center justify-between text-slate-300">
                                    <span class="text-cyan-300">➜ {{ trans.targetNodeId }}</span>
                                    <span class="text-amber-400 text-[10px]">
                                        [{{ trans.condition.type }}
                                        <span v-if="trans.condition.value">: {{ trans.condition.value }}</span>
                                        ]
                                    </span>
                                </div>
                                <span v-if="trans.description" class="text-slate-500 font-sans text-[10px]">
                                    {{ trans.description }}
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div
                    class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500"
                >
                    <span
                        v-if="node.id === flow.entryNodeId"
                        class="text-emerald-400 font-semibold flex items-center gap-1"
                    >
                        <iconify-icon icon="fa7-solid:play" class="text-xs"></iconify-icon>
                        Entry Point
                    </span>
                    <span v-else class="text-slate-500">Internal Node</span>
                </div>
            </div>
        </div>
    </div>
</template>
