# Tarefa: Alinhamento de Mensagens por Visão (Cliente vs Atendente) e Input Unificado de Envio

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 17:12<br>
**Concluído em:** 2026-10-25 17:18<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

O usuário solicitou melhorias visuais e de usabilidade cruciais nas interfaces de chat:
1. **Alinhamento e perspectiva das mensagens**:
   - **Na visão do Cliente (`ClientChatView.vue`)**:
     - Apenas as mensagens enviadas pelo próprio cliente (`sender === 'user'`) ficam alinhadas à **direita**.
     - Todas as outras mensagens (do sistema `system`, do atendente humano `agent` ou da IA `bot`) ficam alinhadas à **esquerda**.
   - **Na visão do Atendente (`AttendantChatView.vue`)**:
     - Perspectiva invertida: as mensagens enviadas pelo próprio atendente (`sender === 'agent'`) ficam alinhadas à **direita**.
     - Todas as mensagens que não são do atendente (do cliente `user`, da IA `bot` ou do sistema `system`) ficam alinhadas à **esquerda**.
2. **Unificação do Input de Envio no Painel do Atendente**:
   - Atualmente existiam dois campos de entrada separados: um no rodapé do chat para simular o cliente e outro na barra lateral para o atendente.
   - O usuário solicitou que exista **apenas 1 campo de envio**, permitindo alternar facilmente quem está enviando a mensagem (Atendente Humano vs Cliente/Visitante).

---

## Escopo de Trabalho

- [x] **Alinhamento na Visão do Cliente (`ClientChatView.vue`)**:
  - Garantido que apenas `msg.sender === 'user'` fica à direita (`items-end`, `justify-end`, `rounded-tr-none`).
  - Todas as demais mensagens (`bot`, `agent`, `system`) ficam à esquerda (`items-start`, `justify-start`, `rounded-tl-none`).
- [x] **Alinhamento na Visão do Atendente (`AttendantChatView.vue`)**:
  - Invertida a perspectiva: mensagens do atendente (`msg.sender === 'agent'`) agora ficam à direita (`items-end`, `justify-end`, `bg-gradient-to-r from-blue-600 to-indigo-600`, `rounded-tr-none`).
  - Mensagens do cliente (`user`), da IA (`bot`) e do sistema (`system`) agora ficam alinhadas à esquerda (`items-start`, `justify-start`, `rounded-tl-none`).
- [x] **Unificação do Input no Atendente (`AttendantChatView.vue`)**:
  - Criado seletor dinâmico de remetente no input principal (`sendRole: 'agent' | 'user'`).
  - Alternador visual elegante com botões/chips: "Enviar como: 🎧 Atendente Humano" vs "👤 Simular Cliente".
  - Se selecionado "Atendente", o envio chama `handleSendAgentMessage()` / `ApiService.sendAgentMessage`.
  - Se selecionado "Cliente", o envio chama `handleSendMessage()` / `ApiService.sendMessage`.
  - Removido o textarea duplicado no painel lateral direito, substituído por card ágil de "Respostas Rápidas do Atendente (Macros)".
- [x] **Verificação de Build, Estilos e Ícones**:
  - Utilizado Iconify (`<iconify-icon>`) e TailwindCSS.
  - Executados `pnpm format:check` e `pnpm --filter frontend build` com 100% de sucesso.
  - Reconstruído o contêiner `chatbot_frontend` via Docker Compose.
