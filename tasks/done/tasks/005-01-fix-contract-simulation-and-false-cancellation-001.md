# Tarefa: Corrigir Simulação de Assinatura e Falso Cancelamento de Contrato

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 07:51<br>
**Concluído em:** 2026-10-25 07:56<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

O usuário relatou erro grave no fluxo de assinatura digital de contrato:
Ao clicar na opção `"Simular assinatura do contrato"`, o sistema classificou a intenção como `confirmation_no` e cancelou a formalização do contrato (`"A formalização do contrato foi cancelada conforme solicitado."`).

Causas identificadas:
1. Em `handleContractSigning`, a checagem `isCancel` era executada antes da verificação de `isSimulate` e `isSignedClaim`.
2. Em `isNegativeConfirmation`, se o LLM classificasse erroneamente como `confirmation_no`, a função retornava `true` de imediato, mesmo quando o texto era explicitamente uma ação de assinatura/simulação.
3. Em `intent-prompt.ts` e classificadores locais, expressões de simulação e assinatura de contrato não estavam protegidas de falso positivo de confirmação negativa.

---

## Escopo de Trabalho

- [x] Priorizar `isSimulate` e `isSignedClaim` em `handleContractSigning` antes de qualquer verificação de cancelamento.
- [x] Bloquear falso cancelamento em `isNegativeConfirmation` quando o texto contiver termos como `simular`, `assinar`, `assinei`, `contrato`.
- [x] Garantir que `evaluateFallbackIntent` e `intent-prompt.ts` classifiquem `"Simular assinatura do contrato"` com prioridade absoluta como `simulate_signature`.
- [x] Validar o fluxo com testes automatizados simulando a sequência do usuário.
- [x] Manter 4 espaços de indentação e conformidade com UNIVERSAL-CODE-STYLE-RULES.md.

---

## Critérios de Aceitação

- Clicar ou digitar `"Simular assinatura do contrato"` assina e efetiva o contrato com sucesso, sem nunca cancelar a operação.
- Clicar ou digitar `"Já assinei"` verifica o contrato com sucesso.
- Cancelamento explícito (`"Cancelar"`, `"Não quero mais"`, etc.) continua cancelando normalmente.
- Todo o código em inglês e 4 espaços de indentação.

---

## Progresso

- 2026-10-25 07:51 - Tarefa criada e movida para `tasks/doing/tasks/`.
- 2026-10-25 07:53 - Corrigida a ordem em `handleContractSigning`: `isSimulate` e `isSignedClaim` agora são processados antes de qualquer avaliação de cancelamento.
- 2026-10-25 07:53 - Adicionada proteção em `isNegativeConfirmation` impedindo que mensagens contendo termos de simulação e assinatura sejam tratadas como cancelamento.
- 2026-10-25 07:54 - Atualizado `evaluateFallbackIntent` e `OllamaProvider.analyzeIntent` para resolução determinística de simulação e confirmação de assinatura.
- 2026-10-25 07:55 - Teste automatizado executado com sucesso reproduzindo o cenário exato da captura de tela do usuário: `"Simular assinatura do contrato"` ativa imediatamente o termo aditivo e atualiza a conta do cliente.
- 2026-10-25 07:55 - Testado cancelamento explícito confirmando que continua funcionando perfeitamente quando solicitado.
- 2026-10-25 07:56 - Formatação validada com `pnpm format:check`. Tarefa concluída e movida para `tasks/done/tasks/`.
