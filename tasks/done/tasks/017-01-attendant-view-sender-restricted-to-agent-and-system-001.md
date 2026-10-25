# Tarefa: Restringir Envio na Rota do Atendente para Agente e Sistema

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 17:42<br>
**Concluído em:** 2026-10-25 17:45<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

O usuário determinou que, na rota do atendente (`/chat/atendente`):
- Todas as mensagens enviadas a partir desta visão devem ser feitas e exibidas como **agente/humano** ou **sistema/nota interna**, e **não como cliente**.
- Não deve haver opção de "Simular Cliente" no input de mensagens do atendente.
- Respostas rápidas, macros, chips de sugestão e envios pelo formulário principal devem ser emitidos pelo atendente (`sender: 'agent'`) ou pelo sistema (`sender: 'system'` / notas internas).

---

## Escopo de Trabalho

- [x] Remover a opção "Simular Cliente" do seletor do formulário unificado em `AttendantChatView.vue`.
- [x] Definir o seletor de modo de envio estritamente entre `Atendente Humano` (`agent`) e `Nota Interna` (`note`).
- [x] Ajustar `handleUnifiedSubmit` para que qualquer mensagem de texto seja enviada como `agent` (ou `note` caso esteja selecionado modo nota).
- [x] Ajustar chips de sugestões e botões de opções de resposta na tela do atendente para enviar como atendente (`agent`) em vez de cliente.
- [x] Remover função e fluxo de envio simulando cliente (`handleSendMessage`) da rota do atendente.
- [x] Garantir que na visão do atendente o alinhamento e indicação visual mostrem mensagens do operador à direita (`Humano / Atendente`), notas internas em destaque âmbar, e mensagens do cliente apenas como recebidas do interlocutor.
- [x] Validação: `pnpm --filter frontend build`, `pnpm format:check`, e contêineres atualizados.

