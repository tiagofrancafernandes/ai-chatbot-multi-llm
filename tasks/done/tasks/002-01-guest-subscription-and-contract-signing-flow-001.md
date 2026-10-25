# Tarefa: Fluxo de Assinatura de Planos para Visitantes e Assinatura Digital de Contratos

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 02:26<br>
**Concluído em:** 2026-10-25 02:44<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

Implementar e validar o fluxo completo de contratação de serviços por clientes não identificados (guests) e mudança de planos para clientes existentes, incluindo:
1. Consulta de planos por visitante.
2. Escolha do plano desejado para contratação.
3. Coleta e validação de dados cadastrais (nome, email, telefone, CPF, endereço) de forma incremental ou unificada.
4. Geração de contrato digital com link de assinatura.
5. Verificação do status de assinatura com suporte a simulação ou webhook/API de validação.
6. Notificação adequada em caso de pendência ou confirmação e ativação da conta.
7. Fluxo equivalente de Termo Aditivo para alteração de planos de clientes existentes.

---

## Escopo de Trabalho

- [x] Definir interfaces de contrato (`Contract`, `ContractStatus`, `PendingRegistration`) nos tipos comuns.
- [x] Implementar extração e validação incremental de dados cadastrais (nome, email, telefone, CPF, endereço).
- [x] Adicionar suporte a status de contratos no `JsonDatabaseService` (gerar contrato, consultar status, simular assinatura).
- [x] Atualizar o `FlowEngineService` para gerenciar o estado de contratação e verificação de assinatura digital.
- [x] Implementar fluxo de termo aditivo de contrato para alteração de plano de clientes existentes.
- [x] Adicionar endpoint para simular assinatura de contrato (`/chat/contract/sign/:contractId`).
- [x] Atualizar o frontend para exibir links de contrato, status de assinatura e opções rápidas de simulação.
- [x] Atualizar arquivos `.http` de demonstração em `backend/dev-contents/demo-requests/` e `dev/requests/`.
- [x] Validar execução ponta a ponta e garantir conformidade de estilo de código.

---

## Critérios de Aceitação

- Código segue UNIVERSAL-CODE-STYLE-RULES.md (4 espaços, guard clauses, sem else aninhados).
- Todo o código em inglês.
- Visitante não autenticado pode escolher plano e enviar dados cadastrais em mensagens separadas ou conjuntas.
- Sistema valida campos faltantes e informa o que resta preencher.
- Link de contrato é gerado com ID único.
- Sistema detecta intenção "já assinei" e consulta o status real/simulado do contrato.
- Se não assinado: avisa que está pendente e reenvia link.
- Se assinado: efetiva o cadastro ou alteração de plano com sucesso.
- Demonstração em `.http` funcional e testada.

---

## Progresso

- 2026-10-25 02:26 - Tarefa criada e movida para `tasks/doing/tasks/`.
- 2026-10-25 02:35 - Implementada extração incremental de dados cadastrais e entidades de contrato.
- 2026-10-25 02:40 - Adicionados endpoints `/chat/contract/sign/:contractId` e `/chat/contract/:contractId`.
- 2026-10-25 02:42 - Validação automatizada completa executada com sucesso com todos os 10 passos do fluxo (guest consultando planos -> escolhendo plano -> enviando dados em partes -> gerando contrato -> alertando assinatura pendente -> simulando assinatura -> ativando cliente -> solicitando mudança de plano -> gerando termo aditivo -> verificando pendência -> assinando termo aditivo -> confirmando migração de plano).

---

## Resultado Final

Fluxo de contratação de visitantes e termo aditivo de mudança de plano implementado e 100% validado:
- Suporte a dados cadastrais em partes ou lote com extração resiliente (nome, telefone, CPF, email, endereço).
- Geração de contratos com links únicos (`https://assinatura.empresa.com.br/contrato/CONT-XXXX`).
- Verificação de status de assinatura digital via banco local e endpoint REST `/api/chat/contract/sign/:contractId`.
- Feedback imediato de assinatura pendente quando cliente alega ter assinado antes da formalização.
- Ativação imediata da conta e emissão da 1ª fatura após assinatura confirmada.
- Termo aditivo de contrato para alteração de plano de clientes existentes.

