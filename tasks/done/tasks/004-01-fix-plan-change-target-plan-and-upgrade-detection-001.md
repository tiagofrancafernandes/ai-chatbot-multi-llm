# Tarefa: Corrigir Detecção de Alvo de Mudança de Plano e Upgrade

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 03:02<br>
**Concluído em:** 2026-10-25 03:06<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

O usuário identificou que quando o cliente solicitava mudança para um plano específico mais caro (ex: `"quero mudar para o plano Professional"`), o chatbot respondia erroneamente:
`"Você já possui o nosso plano mais econômico, o **"Starter"** (R$ 49.90/mês)."`

Causa identificada:
1. O LLM secundário (`qwen2.5:0.5b`) inferiu `targetPlan: "Professional"`, mas retornou `actionDetail: "Mudar pro mais barato"`.
2. Em `flow-engine.service.ts`, a flag `wantsCheapest` verificava `analysis.actionDetail?.toLowerCase().includes('barato')` e era checada antes da verificação de planos específicos (`targetPlan`).
3. Isso sobrescrevia a escolha explícita do cliente pelo plano Professional, forçando a lógica do plano mais barato e bloqueando o upgrade.

---

## Escopo de Trabalho

- [x] Corrigir `handlePlanChangeRequest` no `flow-engine.service.ts` para priorizar a detecção de planos específicos (`Professional`, `Premium Business`, `Starter`) antes da lógica de mais barato.
- [x] Remover a dependência de `actionDetail?.includes('barato')` que gerava falsos positivos de downgrade.
- [x] Atualizar os prompts em `intent-prompt.ts` para reforçar a regra de `targetPlan` específico em mudanças de plano.
- [x] Validar o fluxo de alteração de plano de Starter para Professional e geração de termo aditivo de contrato.
- [x] Testar downgrade para o plano mais barato garantindo que continue funcionando quando explicitamente pedido.
- [x] Manter 4 espaços de indentação e conformidade com UNIVERSAL-CODE-STYLE-RULES.md.

---

## Critérios de Aceitação

- Cliente com plano Starter solicitando `"quero mudar para o plano Professional"` recebe a confirmação de migração para o plano Professional (R$ 99.90/mês).
- Solicitação para plano mais barato continua funcionando quando o usuário de fato pedir o plano mais barato.
- Código segue UNIVERSAL-CODE-STYLE-RULES.md (4 espaços de indentação, guard clauses, sem blocos else).
- Todo o código em inglês.

---

## Progresso

- 2026-10-25 03:02 - Tarefa criada e movida para `tasks/doing/tasks/`.
- 2026-10-25 03:04 - Identificada prioridade incorreta e dependência de `actionDetail` em `handlePlanChangeRequest`.
- 2026-10-25 03:05 - Reestruturado `handlePlanChangeRequest` no `FlowEngineService` priorizando `targetPlan` específico.
- 2026-10-25 03:05 - Testado no backend: cliente com plano Starter solicitando `"quero mudar para o plano Professional"` aciona confirmação de migração para o plano Professional com sucesso.
- 2026-10-25 03:05 - Confirmada a alteração com `"Sim, confirmo a mudança"`, gerando Termo Aditivo `CONT-MOD-XXXX` e efetivando migração após assinatura.
- 2026-10-25 03:06 - Testado downgrade para o plano mais barato funcionando conforme esperado.
- 2026-10-25 03:06 - Tarefa concluída e movida para `tasks/done/tasks/`.
