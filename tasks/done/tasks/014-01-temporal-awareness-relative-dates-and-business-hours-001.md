# Tarefa: Consciência Temporal, Resolução de Datas Relativas e Horários de Atendimento da Base

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 16:55<br>
**Concluído em:** 2026-10-25 17:10<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

O usuário relatou duas falhas graves de alucinação e falta de consciência temporal no chatbot:
1. Ao perguntar *"tem atendimento presencial hoje?"* em um **domingo**, o bot respondeu erroneamente que sim, o atendimento comercial estava disponível hoje.
2. Ao perguntar *"atende aos domingos?"*, o bot respondeu erroneamente que sim, e ainda alucinou dizendo que não tinha fibra óptica para a zona rural.

O usuário exigiu:
- O sistema deve entender referências relativas de datas como:
  `'hoje'`, `'ontem'`, `'amanhã'`, `'depois de amanhã'`, `'antes de ontem'`, `'sexta que vem'`, `'próxima segunda'`, `'domingo'`, etc.
- O sistema e a IA devem receber a informação explícita de que dia é **"hoje"** (dia da semana, data atual, hora, fuso horário `America/Sao_Paulo`).
- O sistema deve ler da base de conhecimento os horários e dias de atendimento oficiais:
  - **Segunda a Sexta:** 08:00 às 18:00
  - **Sábado:** 08:00 às 12:00
  - **Domingo e Feriados:** Fechado (sem atendimento presencial).
  - Exceções e avisos cadastrados nas instruções adicionais da base.
- Responder com precisão absoluta, sem alucinar nem contradizer os fatos da base.

---

## Escopo de Trabalho

- [x] **Módulo de Resolução Temporal (`backend/src/common/utils/temporal-resolver.util.ts`)**:
  - Determinação da data/hora atual no fuso de São Paulo (`America/Sao_Paulo`, UTC-3).
  - Reconhecimento de termos temporais relativos em português:
    - `hoje`, `ontem`, `anteontem` / `antes de ontem`, `amanhã`, `depois de amanhã`.
    - Dias da semana: `domingo`, `segunda`, `terça`, `quarta`, `quinta`, `sexta`, `sábado`.
    - Modificadores: `próxima`, `que vem`, `passada`.
    - Plurais de rotina: `aos domingos`, `às segundas`, `aos sábados`.
  - Cálculo da data e dia da semana correspondente ao termo referido.
  - Avaliação do status de funcionamento da loja presencial para o dia calculado (aberto com horários ou fechado).
  - Geração de `summaryPrompt` detalhado com horários oficiais e contexto para LLMs.
- [x] **Injeção de Contexto Temporal na IA (`IntentContext`, `llm.service.ts`, providers)**:
  - Injetado `temporalContext` em `IntentContext`.
  - Atualizado `ollama.provider.ts` e `gemini.provider.ts` para enriquecer prompts de sistema com `[TEMPORAL CONTEXT]`.
- [x] **Motor de Fluxo (`flow-engine.service.ts`)**:
  - `isKnowledgeQuery` expandido para capturar termos temporais e de atendimento presencial (`atende hoje`, `atende amanhã`, `atende aos domingos`, `abre domingo`, etc.).
  - `handleKnowledgeInquiry` integra `TemporalResolver.resolveTemporalQuery` com respostas determinísticas ricas, personalizadas para "hoje" (com data exata e status), "amanhã" e rotinas ("aos domingos").
  - LLM fallback instruído estritamente sobre domingo fechado e planos urbanos/rurais.
- [x] **Demonstrações e Testes (.http)**:
  - Adicionadas requisições 30, 31, 32 em `backend/dev-contents/demo-requests/chat-demo.http`.
  - Adicionadas requisições 32, 33, 34 em `dev/requests/chat-requests.example.http`.
  - Testes executados via script automatizado com 100% de sucesso.
- [x] **Verificação de Build e Formatação**:
  - `pnpm format:check` e `pnpm format` 100% aprovados.
  - `pnpm --filter backend build` e reconstrução do contêiner Docker `chatbot_backend` concluídos com sucesso.


