# Tarefa: Ações de Suporte Exclusivas do Atendente e Mensagens Internas Confidenciais

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 17:20<br>
**Concluído em:** 2026-10-25 17:40<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

O usuário solicitou recursos essenciais para a operação de suporte técnico do provedor de internet:
1. **Ações Técnicas e Administrativas Exclusivas do Atendente**:
   - **Suspender internet**: interrompe o fornecimento de conexão (ex: por inadimplência prolongada ou pedido temporário do cliente).
   - **Reativar internet**: restabelece o fornecimento normal do link de fibra óptica.
   - **Verificar status do sinal**: consulta técnica de telemetria óptica (potência RX/TX em dBm, status PON, perda de pacotes, latência, status da ONU/ONT).
   - **Outras ações de suporte**:
     - Reiniciar ONU/Roteador remotamente via TR-069.
     - Consulta interna de extrato de faturas / débitos.
     - Desbloqueio em confiança (promessa de pagamento / 48h).
     - Abertura de Ordem de Serviço (OS) técnica de campo.
2. **Mensagens Internas Confidenciais (Whispers / Notas de Sistema)**:
   - Mensagens visíveis **exclusivamente no painel do atendente** (`/chat/atendente`), nunca enviadas nem apresentadas ao cliente (`/chat/cliente`).
   - Destaque visual específico em tons de **laranja / âmbar** (`bg-amber-950/80 border-amber-600/80 text-amber-200`) indicando claramente que se trata de uma nota ou ação interna.
   - Suporte a consultas como *"Ver faturas abertas"*, *"Ver status de sinal"*, *"Histórico técnico"*, trazendo informações internas diretamente no histórico do chat do atendente para orientar a tomada de decisão antes de responder ao cliente.
   - Possibilidade de o atendente escrever notas internas privadas pelo input de envio (opção "Nota Interna").

---

## Escopo de Trabalho

- [x] **Modelo de Dados e Interface (`ChatMessage`, `Customer`)**:
  - Adicionado flag `isInternal?: boolean;` e `internalCategory?: string;` em `ChatMessage`.
  - Adicionados campos de status de fornecimento em `Customer` (`connectionStatus: 'active' | 'suspended' | 'blocked'`) e telemetria óptica (`opticalSignal`).
- [x] **Filtragem Segura no Backend (`ChatService`, `ChatController`)**:
  - Endpoint para o cliente (`/chat/history?customerId=...&scope=client`) estritamente omite mensagens com `isInternal: true`.
  - Endpoint de ações do operador (`POST /chat/operator-action`) com DTO validado (`OperatorActionDto`).
  - Implementação completa das ações do operador no backend:
    - Suspender fornecimento da internet (`suspend_internet`).
    - Reativar fornecimento da internet (`activate_internet`).
    - Diagnóstico de sinal óptico (`check_signal` com telemetria RX/TX dBm e status PON).
    - Desbloqueio em confiança de 48 horas (`unlock_promise`).
    - Reiniciar ONU remota via TR-069 (`reboot_onu`).
    - Consulta interna de extrato e faturas (`view_invoices`).
    - Notas internas do operador (`internal_note`).
- [x] **Demonstrações e Requisições (.http)**:
  - Adicionadas chamadas das ações 33 a 40 em `chat-demo.http` e 35 a 42 em `chat-requests.example.http`.
- [x] **Interface do Atendente (`AttendantChatView.vue`)**:
  - Painel de Ações Rápidas de Suporte Telecom adicionado na barra lateral com botões de 1 clique.
  - Estilização diferenciada em tom âmbar/laranja (`bg-amber-950/80 border-amber-600/80 text-amber-100`) com ícone de cadeado e badge "Confidencial".
  - Opção no seletor de envio do input unificado para "Nota Interna" (`sendRole = 'note'`).
  - Cards de perfil e suporte exibem status em tempo real da conexão e potência RX/TX em dBm.
- [x] **Interface do Cliente (`ClientChatView.vue`)**:
  - Mensagens internas são filtradas no backend e adicionalmente filtradas no frontend (`!msg.isInternal`).
- [x] **Validação e Build**:
  - `pnpm --filter backend build` e `pnpm --filter frontend build` executados com sucesso (código 0).
  - `pnpm format:check` validado sem erros (100% de conformidade com Prettier e 4 espaços).
  - Contêineres Docker atualizados e testes E2E executados com sucesso.

