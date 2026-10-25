# Tarefa: Resolução de Consulta do Plano Atual e Confirmação de Telefone Cadastrado

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 10:45<br>
**Concluído em:** 2026-10-25 11:15<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

Identificação e correção de duas falhas reportadas nas capturas de tela do chat:
1. **Consulta do Plano Atual:**
   - O usuário autenticado clicava ou enviava a mensagem `"Qual é o meu plano atual?"` (opção sugerida pelo próprio bot).
   - O fluxo caía no fallback genérico `"Não consegui compreender com total clareza a sua mensagem..."` porque a rota `routeIdentifiedCustomer` não possuía tratamento explícito para consulta de informações do plano ativo do cliente.
2. **Confirmação de Telefone Cadastrado / Dados do Cliente:**
   - O usuário enviava `"Meu telefone cadastrado e 5511999999999"`.
   - O bot ativava indevidamente `isKnowledgeQuery` por conter a palavra genérica `"telefone"`, interpretando como pergunta sobre o telefone da empresa, ou caía em fallback sem confirmar os dados cadastrais do assinante.

---

## Escopo de Trabalho

- [x] Implementar detecção e resposta direta para `"Qual é o meu plano atual?"` em `routeIdentifiedCustomer` exibindo o plano atual, valor mensal, benefícios inclusos e status da assinatura.
- [x] Implementar detecção de consulta de dados cadastrais e envio de telefone/CPF em `routeIdentifiedCustomer`, exibindo o cartão cadastral do titular ou alternando a conta se pertencer a outro assinante.
- [x] Ajustar `hasSubtleActionKeywords` em `ollama.provider.ts` para incluir `"plano"`, `"meu plano"`, `"meus dados"`, `"telefone"` e regex de CPF/telefone para que o tev1 não descarte a mensagem como desconhecida sem consultar o Tier 2 ou fallback.
- [x] Ajustar `isKnowledgeQuery` no `flow-engine.service.ts` e `intent-prompt.ts` para desconsiderar termos de dados pessoais (`"meu telefone"`, `"telefone cadastrado"`, `"meu cpf"`, `"meus dados"`), prevenindo falsos positivos na base de conhecimento.
- [x] Adicionar respostas determinísticas imediatas em `handleKnowledgeInquiry` para cobertura em Carmo do Cajuru e São José dos Salgados, horários de funcionamento (sábado) e endereço na R. Tiradentes 405.
- [x] Corrigir Dockerfile do backend adicionando `--ignore-scripts` nas etapas de build para prevenir interrupção por builds de esbuild no pnpm v11.
- [x] Validar conformidade de código com `UNIVERSAL-CODE-STYLE-RULES.md` e `pnpm format:check`.

---

## Critérios de Aceitação

- Código segue UNIVERSAL-CODE-STYLE-RULES.md (4 espaços de indentação, guard clauses, sem blocos else).
- Usuário que pergunta `"Qual é o meu plano atual?"` recebe os dados do seu plano atual com opções de mudança de plano e suporte.
- Usuário que informa `"Meu telefone cadastrado e 5511999999999"` recebe a confirmação dos dados cadastrais sincronizados.
- Perguntas sobre cobertura em Carmo do Cajuru e São José dos Salgados são respondidas com 100% de precisão sobre a fibra óptica.
- Rebuild do Docker e testes de API executam com código de saída 0.

---

## Progresso

- 2026-10-25 10:45 - Análise das mensagens nas capturas de tela e identificação das causas raízes.
- 2026-10-25 10:55 - Implementados os handlers de plano atual e dados cadastrais no `FlowEngineService`.
- 2026-10-25 11:05 - Corrigida configuração do pnpm e Dockerfile do backend com `--ignore-scripts`.
- 2026-10-25 11:15 - Testes de API realizados com sucesso para as duas mensagens reportadas e para a base de conhecimento. Tarefa concluída.

