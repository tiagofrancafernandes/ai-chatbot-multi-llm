# Tarefa: Planos Urbanos por Padrão, Planos Rurais como Alternativa e Triagem por Área

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 16:37<br>
**Concluído em:** 2026-10-25 16:53<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

O usuário solicitou uma mudança fundamental na forma como os planos são oferecidos:
1. **Padrão Urbano**:
   - Ao consultar ou solicitar planos de internet, o chatbot deve apresentar **por padrão os planos urbanos** (600 Mega = R$ 79,99, 800 Mega = R$ 89,99, 1 Giga = R$ 99,99 com instalação grátis).
2. **Rural como Alternativa**:
   - Os planos para a zona rural vêm apresentados como uma **alternativa** (sítios, chácaras e propriedades nas proximidades, a partir de R$ 99,99 com taxa de instalação sob consulta).
3. **Pergunta e Triagem Ativa de Área**:
   - O sistema deve **perguntar explicitamente** se o ponto de atendimento/instalação é dentro da cidade (área urbana) ou nas áreas ao redor (zona rural).
   - Deve fornecer botões interativos e reconhecer respostas em linguagem natural como:
     - "Área urbana (dentro da cidade)" / "Moro na cidade" / "urbano" -> Mostra/foca nos planos urbanos para contratação.
     - "Área rural (sítio / arredores)" / "Moro no sítio" / "rural" -> Mostra os planos rurais detalhados (600 Mega = R$ 99,99, 800 Mega = R$ 110,99, 1 Giga = R$ 120,99) e explica sobre a taxa de instalação de acordo com a distância até a rede.
4. **Respeito a Intenções Específicas**:
   - Se o cliente já perguntar diretamente por planos rurais ("planos para zona rural", "planos rurais"), apresentar diretamente os planos rurais mantendo os urbanos como alternativa.
   - Se já especificar um plano ("quero o plano de 79,99" ou "quero Urbano 600 Mega"), seguir para a contratação/cadastro normalmente.

---

## Escopo de Trabalho

- [x] **Backend - Heurísticas e Intent Classification (`intent-prompt.ts`)**:
  - Ajustadas heurísticas e prompt para não classificar respostas de área ("área rural", "área urbana", "dentro da cidade", "nos arredores", "planos rurais") como `knowledge_inquiry`, direcionando para `plan_pricing` ou área de atendimento do plano.
  - Reconhecimento automático de intenções de seleção de área rural ou urbana.
- [x] **Backend - Flow Engine (`flow-engine.service.ts`)**:
  - Implementado `detectAreaPreference()`, `formatPlansMessage(plans, areaPref)` e `getPlanOptionsByArea(areaPref)`:
    - Padrão: Planos urbanos destacados, chamada dos planos rurais como alternativa e pergunta sobre a área (dentro da cidade ou arredores/rural).
    - Área Urbana: Foco nos planos urbanos com instalação 100% grátis.
    - Área Rural: Planos rurais (600, 800, 1GB) com aviso sobre taxa de instalação calculada sob consulta da distância da rede.
  - Atualizados os fluxos de consulta (`plan_pricing`) em `tryAuthenticateCustomer`, `routeIdentifiedCustomer` e `node_plan_pricing_action`.
  - Atualizado o fluxo de contratação (`isSubscription` / `isRegistration`) para também seguir a triagem de área quando o usuário não tiver selecionado um plano específico.
  - Disponibilizados botões interativos:
    - `'Área urbana (dentro da cidade)'`
    - `'Área rural (sítio / arredores)'`
    - `'Quero Urbano 600 Mega (R$ 79,99)'`
    - `'Quero Urbano 800 Mega (R$ 89,99)'`
    - `'Ver planos para área rural'`
- [x] **Frontend - Sugestões Rápidas**:
  - Adicionado chip de sugestão rápida de planos rurais (`Planos Rurais`) tanto em `ClientChatView.vue` quanto em `AttendantChatView.vue`.
- [x] **Demonstrações e Testes (.http)**:
  - Adicionados testes de fluxo de triagem de planos urbanos e rurais em `backend/dev-contents/demo-requests/chat-demo.http` e `dev/requests/chat-requests.example.http`.
  - Validados testes ponta a ponta via API (inquérito padrão, escolha rural, escolha urbana e contratação).
  - Verificação de estilo com `pnpm format:check` e compilação com `pnpm build`.
