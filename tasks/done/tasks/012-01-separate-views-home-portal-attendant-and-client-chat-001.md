# Tarefa: Separação de Rotas e Visões (Home Portal, Chat do Atendente e Chat do Cliente)

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 12:47<br>
**Concluído em:** 2026-10-25 12:58<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

O usuário solicitou a separação das rotas do frontend em três visões distintas:
1. **Rota `'/'` (Hub / Portal de Navegação)**:
   - Exibir lista das rotas disponíveis no sistema com visual moderno, badges de status, ícones Iconify e links rápidos para cada ferramenta.
   - Rotas destacadas:
     - Chat do Cliente (`/chat/cliente`)
     - Chat do Atendente (`/chat/atendente`)
     - Flow Graph (`/flow`)
     - Base de Conhecimento (`/knowledge`)
2. **Rota `'/chat/atendente'` (com alias `'/chat/atentende'`)**:
   - Chat para atendente humano com console operacional completo:
     - Barra de status de atendimento (IA, Fila, Atendente Humano, timer de inatividade configurável).
     - Transferência de atendimento (para setores como Suporte, Comercial, Financeiro/SAC ou atendentes Mariana Silva e Carlos Mendes).
     - Devolução do chat para autoatendimento / IA ("Retomar com IA").
     - Envio de mensagem simulada de atendente humano.
     - Painel / Gaveta lateral de listagem de chats ativos e clientes para alternar conversas.
     - Seletores manuais de modelo/provedor LLM e inspetor de nó ativo.
3. **Rota `'/chat/cliente'`**:
   - Visão pública simples de cliente / visitante.
   - Interface limpa e segura (requests no contexto do cliente).
   - Sem opções de troca manual de provedor, sem inspetor interno de fluxo e sem botões de controle de atendente.
   - Mantém balões estilizados com markdown sanitizado, timestamps relativos com tooltip ISO no hover, botões de sugestões interativas e opções de resposta.

---

## Escopo de Trabalho

- [x] **Backend**:
  - Adicionado endpoint `GET /api/chat/sessions` em `chat.controller.ts` e `chat.service.ts` para listagem de sessões ativas com metadados do cliente e última mensagem.
  - Atualizados arquivos de requisições de demonstração `chat-demo.http` e `chat-requests.example.http`.
- [x] **Frontend - Rotas e Navegação**:
  - Criado componente `HomePortalView.vue` para a rota `'/'`.
  - Criado componente `ClientChatView.vue` para a rota `'/chat/cliente'`.
  - Criado componente `AttendantChatView.vue` para a rota `'/chat/atendente'` (e alias `'/chat/atentende'`).
  - Atualizado `frontend/src/router/index.ts` com as novas rotas.
  - Atualizada barra superior em `App.vue` para refletir as novas opções de navegação.
- [x] **Frontend - Listagem de Chats no Atendente**:
  - Implementada sidebar / drawer de listagem de conversas ativas na visão do atendente com filtro (Todos, Fila, Humano, IA), busca textual e badge de status.
  - Alternância imediata de sessão ao clicar no card da conversa.
- [x] **Frontend - Visão Pública do Cliente**:
  - Interface moderna focada no assinante/visitante, com cabeçalho de status da provedora de fibra óptica, modal de perfil da conta, botão de nova conversa e sugestões rápidas.
- [x] **Testes e Verificação**:
  - Compilação validada com `pnpm --filter backend build` e `pnpm --filter frontend build`.
  - Estilo de código verificado e formatado com `pnpm format:check` (4 espaços, sem else, guard clauses).
  - Contêineres Docker reconstruídos e testados com sucesso (`chatbot_backend`, `chatbot_frontend`, `chatbot_ollama_bridge`).

---

## Critérios de Aceitação

- ✅ Acessar `'/'` exibe o portal com cards e links para todas as rotas.
- ✅ Acessar `'/chat/cliente'` abre a visão limpa e pública de cliente.
- ✅ Acessar `'/chat/atendente'` (ou `'/chat/atentende'`) abre o console completo de atendente com listagem de chats, transferências e controles operacionais.
- ✅ Todas as rotas funcionam sem erros no console.
