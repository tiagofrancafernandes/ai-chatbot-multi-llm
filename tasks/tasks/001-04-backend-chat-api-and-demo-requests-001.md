# Tarefa: API REST do Chat, Customers e Demo Requests (.http)

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ⚪ Não Iniciado<br>
**Responsável:** Tiago França<br>

---

## Contexto

Criar os controllers e endpoints REST no NestJS para inicialização de conversa, envio de mensagem, recuperação de histórico, gestão de clientes, e criar os arquivos de requisição de demonstração `.http` em `backend/dev-contents/demo-requests/` com o sufixo `-demo`.

---

## Escopo de Trabalho

- [ ] Implementar `ChatController` com rotas `/api/chat/init`, `/api/chat/message`, `/api/chat/history`, `/api/chat/sessions`, `/api/chat/providers`
- [ ] Implementar `CustomerController` com `/api/customers` e busca por identificador
- [ ] Implementar DTOs com validação fail-fast
- [ ] Criar `backend/dev-contents/demo-requests/chat-demo.http`
- [ ] Criar `backend/dev-contents/demo-requests/customers-demo.http`
- [ ] Criar `backend/dev-contents/demo-requests/flow-demo.http`

---

## Critérios de Aceitação

- Endpoints respondem conforme contratos esperados
- Validação rápida de entradas
- Arquivos `.http` em `backend/dev-contents/demo-requests/` funcionais para testes manuais
