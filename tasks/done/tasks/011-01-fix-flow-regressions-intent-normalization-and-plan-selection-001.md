# Tarefa: Correção Definitiva de Regressões de Fluxo, Normalização de Intenções e Seleção de Planos

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 12:25<br>
**Concluído em:** 2026-10-25 12:43<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

O usuário identificou regressões onde o bot estava "se perdendo em coisas básicas que funcionavam antes" conforme 5 cenários documentados em capturas de tela:
1. **Seleção de plano pelo guest (`quero me registrar` -> `quero contratar um plano` -> `quero o plano professional`)**: O bot repetia a lista de planos ao invés de iniciar o fluxo de cadastro e solicitação de dados para o plano escolhido.
2. **Mudança de plano para Professional (`quero mudar para o plano Professional`)**: O bot respondia erroneamente que o usuário já possuía o plano mais barato (Starter) porque a normalização do targetPlan não mapeava nomes de planos existentes e a flag `wantsCheapest` sobrepunha a escolha explícita do usuário.
3. **Simulação de assinatura do contrato (`Simular assinatura do contrato`)**: O bot cancelava a formalização do contrato como `confirmation_no` ao invés de simular a assinatura digital e ativar a conta.
4. **Consulta de plano atual por visitante ou identificado (`Qual é o meu plano atual?`)**: Caía no fallback genérico `node_fallback_message` ("Não consegui compreender com total clareza a sua mensagem...").
5. **Autenticação e consulta de dados por telefone (`Meu telefone cadastrado é 5511999999999`)**: Caía no fallback genérico quando o usuário já estava identificado na sessão ou em casos de verificação cadastral.
6. **Normalização de Intenções nos Providers LLM**: O método `normalizePrimaryIntent` em todos os provedores (`ollama.provider.ts`, `gemini.provider.ts`, `lmstudio.provider.ts`, `openai.provider.ts`) descartava 5 intenções fundamentais (`customer_registration`, `plan_subscription`, `simulate_signature`, `contract_signed`, `knowledge_inquiry`), convertendo-as para `unknown`.

---

## Escopo de Trabalho

- [x] Corrigir `normalizePrimaryIntent` em todos os provedores LLM (`ollama`, `gemini`, `lmstudio`, `openai`) para aceitar todos os 16 tipos de `PrimaryIntent`.
- [x] Aperfeiçoar `matchTargetPlan` em `flow-engine.service.ts`:
  - Mapear nomes de planos canônicos e legados (`Urbano 600/800/1GB`, `Rural 600/800/1GB`, `Professional`, `Starter`, `Premium Business`).
  - Suportar modo estrito que retorne `null` quando o usuário não especificar um plano alvo.
- [x] Corrigir `hasSpecificPlan` no fluxo de subscrição (`tryAuthenticateCustomer`):
  - Quando o usuário mencionar qualquer plano reconhecido, avançar diretamente para a coleta de dados de cadastro.
- [x] Corrigir `handlePlanChangeRequest`:
  - Checar intenção explícita de plano no texto antes de qualquer fallback para `wantsCheapest`.
  - Garantir que `wantsCheapest` só seja acionado se o usuário realmente pedir o plano mais barato / em conta.
- [x] Blindar `handleContractSigning`:
  - `isSimulate` e `isSignedClaim` têm prioridade absoluta sobre `isNegativeConfirmation`.
  - Mensagens contendo `simular`, `assinei`, `contrato` nunca são tratadas como recusa ou cancelamento.
- [x] Sincronizar dados de clientes e planos em `db.json` para evitar inconsistências entre planos antigos e novos.
- [x] Atualizar arquivos de requisições de teste `.http`.
- [x] Validar conformidade de código com `UNIVERSAL-CODE-STYLE-RULES.md`, `pnpm format:check` e testar via Docker.

---

## Critérios de Aceitação

- Visitante escolhendo plano ("quero o plano professional") inicia imediatamente o cadastro pedindo Nome, CPF, Email, Telefone e Endereço.
- Cliente solicitando migração ("quero mudar para o plano Professional") recebe confirmação do plano Professional sem dizer que já tem o mais barato.
- Clicar ou digitar "Simular assinatura do contrato" ativa o contrato com sucesso sem cancelamento indevido.
- "Qual é o meu plano atual?" responde o plano ativo para autenticado ou pede identificação para visitante.
- "Meu telefone cadastrado é 5511999999999" autentica e exibe os dados cadastrais do cliente John Doe.
- Zero erros de lint, build e formato 4 espaços mantido.

---

## Progresso

- 2026-10-25 12:25 - Tarefa criada e investigadas causas raiz das 5 capturas de tela.
- 2026-10-25 12:35 - Corrigida a normalização de todas as 16 intenções em `ollama.provider.ts`, `gemini.provider.ts`, `lmstudio.provider.ts` e `openai.provider.ts`.
- 2026-10-25 12:40 - Blindado `matchTargetPlan` e `handlePlanChangeRequest` para impedir que `wantsCheapest` sobreponha seleções de planos reais e evitar que phantom identifiers interceptem o fluxo.
- 2026-10-25 12:43 - Todos os 6 cenários validados e aprovados ponta a ponta na API em execução no Docker. Tarefa concluída.
