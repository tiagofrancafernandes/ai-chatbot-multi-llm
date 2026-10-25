# Tarefa: Fluxo Dedicado de Cadastro de Cliente e Seleção Direta de Planos

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 02:46<br>
**Concluído em:** 2026-10-25 03:01<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

O usuário identificou que o chatbot se comportava de forma inadequada quando um visitante não autenticado dizia `"quero me registrar"`, `"quero contratar um plano"` ou `"quero o plano professional"`.
Ao invés de iniciar o processo de cadastro de cliente ou prosseguir diretamente para a coleta de dados do plano escolhido, o sistema:
1. Pedia o número de telefone/CPF cadastrado (assumindo que o usuário era um cliente existente tentando autenticar).
2. Ao receber `"quero o plano professional"`, repetia a lista de planos ao invés de selecionar o plano Professional e avançar para o cadastro e assinatura.

Objetivo desta tarefa:
1. Criar a intenção dedicada `customer_registration` reconhecida pelos classificadores Tier 1 (`tev1:0.8b`) e Tier 2 (`qwen2.5:0.5b`) e prompts de fallback.
2. Adicionar o nó `node_customer_registration_action` e transições na definição de fluxo do banco de dados (`FlowDefinition`), visível no grafo do `FlowView`.
3. Ajustar o `FlowEngineService` para que mensagens como `"quero me registrar"`, `"cadastrar"`, `"criar conta"` iniciem o fluxo de cadastro com apresentação acolhedora e opções de planos.
4. Fazer com que mensagens como `"quero o plano professional"` ou menções diretas a planos selecionem imediatamente o plano sem repetir o catálogo genérico de preços.
5. Manter suporte completo à coleta incremental de dados cadastrais e emissão de contrato digital.

---

## Escopo de Trabalho

- [x] Adicionar `customer_registration` em `PrimaryIntent` (`llm-provider.interface.ts`).
- [x] Atualizar heurísticas e prompts em `intent-prompt.ts` para mapear expressões de registro (`"quero me registrar"`, `"cadastrar"`, `"criar conta"`, `"novo cadastro"`).
- [x] Adicionar o nó de fluxo `node_customer_registration_action` em `default-database.ts` e sincronizar com o banco de dados ativo.
- [x] Atualizar `FlowEngineService.tryAuthenticateCustomer` para priorizar a detecção de registro e seleção direta de planos, prevenindo loops de autenticação ou de exibição de preços.
- [x] Atualizar requisições `.http` de demonstração em `backend/dev-contents/demo-requests/` e `dev/requests/`.
- [x] Validar com testes ponta a ponta reproduzindo o cenário do usuário (guest dizendo `"quero me registrar"`, depois `"quero o plano professional"`, informando dados e assinando).
- [x] Garantir 4 espaços de indentação e regras de estilo UNIVERSAL-CODE-STYLE-RULES.md.

---

## Critérios de Aceitação

- Código segue UNIVERSAL-CODE-STYLE-RULES.md (4 espaços de indentação, guard clauses, sem blocos else, chaves explícitas).
- Todo o código e identificadores em inglês.
- Mensagem `"quero me registrar"` aciona o fluxo de cadastro e não pede autenticação de cliente existente.
- Mensagem `"quero o plano professional"` (ou similar) seleciona o plano Professional imediatamente e avança para a solicitação de dados, sem repetir a listagem estática de planos.
- O grafo de fluxo (`FlowView`) reflete o nó de registro de cliente.
- Testes automatizados validam o fluxo sem regressões.

---

## Progresso

- 2026-10-25 02:46 - Tarefa criada e movida para `tasks/doing/tasks/`.
- 2026-10-25 02:50 - Adicionada intenção `customer_registration` em `PrimaryIntent`, prompts e classificadores `tev1:0.8b` e `qwen2.5:0.5b`.
- 2026-10-25 02:52 - Criado nó `node_customer_registration_action` e sincronizado com `db.json`.
- 2026-10-25 02:55 - Reestruturado `tryAuthenticateCustomer` no `FlowEngineService` com prioridade para registro e seleção direta de planos.
- 2026-10-25 02:58 - Validação end-to-end com sucesso em todos os passos (registro -> seleção de plano Professional -> envio de dados -> emissão de contrato digital -> validação de pendência -> assinatura simulada -> cliente ativado no banco).
- 2026-10-25 03:00 - Arquivos `.http` atualizados e formatação verificada.
- 2026-10-25 03:01 - Tarefa concluída e movida para `tasks/done/tasks/`.
