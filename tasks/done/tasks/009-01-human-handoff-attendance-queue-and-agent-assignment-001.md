# Tarefa: Sistema de Atendimento Omnichannel, Fila/Atendente Humano e Pausa/Retomada da IA por Inatividade

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 11:30<br>
**Concluído em:** 2026-10-25 11:42<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

Implementar a arquitetura completa de atendimento omnichannel empresarial com transição entre IA e Atendente Humano:
1. **Identificação de "Sendo Atendido Por"**:
   - Status visual e estruturado indicando se a sessão está com a **IA (SystemOne Bot)**, em uma **Fila Departamental** (Suporte Técnico, Comercial/Planos, Financeiro/SAC) ou com um **Atendente Humano Específico** (ex: Mariana Silva, Carlos Mendes).
2. **Pausa do Atendimento Automatizado**:
   - Ao transferir para uma fila ou atendente humano, a IA suspende respostas automáticas para não conflitar com a conversa humana.
   - Mensagens enviadas pelo cliente enquanto em atendimento humano são registradas no histórico e encaminhadas ao atendente.
3. **Retomada Automática por Inatividade (Timeout)**:
   - Se um atendente humano ou fila não interagir com o cliente por X segundos/minutos (tempo configurável, ex: 60s para testes rápidos), a IA detecta a inatividade, emite um aviso cordial ao cliente e reassume o atendimento automaticamente.
4. **Simulação e Painel Interativo no Frontend**:
   - Cabeçalho exibindo `Sendo atendido por: ...` com badge de status dinâmico.
   - Controles de simulação no chat: transferir para fila/atendente, simular mensagem do atendente humano, ajustar tempo de inatividade e botão para retomar com IA manualmente.

---

## Escopo de Trabalho

- [x] Definir interfaces de `AttendanceInfo`, `AttendanceAgent`, `AttendanceDepartment` em `backend/src/common/interfaces/attendance.interface.ts`.
- [x] Atualizar `ChatMessage` para suportar `sender: 'agent'` e `agentName`.
- [x] Atualizar `ChatSession` com o campo `attendance?: AttendanceInfo`.
- [x] Cadastrar atendentes e departamentos padrão no `default-database.ts` e métodos de consulta no `JsonDatabaseService`.
- [x] Implementar métodos em `ChatService`:
  - `transferAttendance(customerId, { department, agentId, timeoutSeconds })`: pausa IA e transfere.
  - `sendAgentMessage(customerId, { text, agentName })`: simula mensagem de atendente humano e atualiza timestamp de interação.
  - `resumeAiAttendance(customerId)`: retoma atendimento pela IA.
  - `getAvailableAgents()`: lista departamentos e atendentes disponíveis.
  - Atualizar `sendMessage`: verificar timeout de inatividade; se estourado, retomar IA; se em atendimento humano ativo, não gerar resposta da IA.
- [x] Adicionar rotas na API em `ChatController`:
  - `POST /api/chat/transfer`
  - `POST /api/chat/agent-message`
  - `POST /api/chat/resume-ai`
  - `GET /api/chat/agents`
- [x] Atualizar rotas de demonstração em `backend/dev-contents/demo-requests/attendance-demo.http` e `dev/requests/attendance-requests.example.http`.
- [x] Atualizar o frontend (`frontend/src/types/chat.ts`, `api.ts`, `ChatView.vue`):
  - Badge e cabeçalho "Sendo atendido por: [IA / Fila / Atendente]".
  - Balões de chat diferenciados para mensagens de atendente humano (`sender: 'agent'`).
  - Painel de controle/simulação com botões para transferir, simular resposta do atendente, configurar timeout e retomar IA.
  - Renderização de ícones com Iconify.
- [x] Validar conformidade de código com `UNIVERSAL-CODE-STYLE-RULES.md` e `pnpm format:check`.
- [x] Verificar build do backend e frontend com zero erros e reiniciar contêineres Docker.

---

## Critérios de Aceitação

- Código segue UNIVERSAL-CODE-STYLE-RULES.md (4 espaços de indentação, guard clauses, sem blocos else).
- Usuário vê claramente quem está realizando o atendimento no chat.
- Ao solicitar transferência para humano, a IA pausa suas respostas automáticas.
- Mensagens do atendente humano aparecem no chat identificadas com o nome do operador.
- Se o atendente não interagir dentro do tempo limite configurado, a IA assume o controle automaticamente na próxima mensagem ou ciclo.
- O cliente pode alternar manualmente entre IA e atendente humano a qualquer momento.

---

## Progresso

- 2026-10-25 11:30 - Tarefa criada e movida para `tasks/doing/tasks/`.
- 2026-10-25 11:42 - Implementação concluída, testada ponta a ponta e contêineres Docker atualizados com sucesso.
