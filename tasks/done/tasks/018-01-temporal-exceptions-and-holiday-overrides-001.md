# Tarefa: Reconhecimento Dinâmico de Exceções Temporárias e Feriados em Datas Específicas

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 17:53<br>
**Concluído em:** 2026-10-25 18:09<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

O usuário informou a adição de exceções temporárias de atendimento em `Instruções Adicionais e Exceções Temporárias`, no formato:
```
não teremos atendimento presencial no dia YYYY-MM-DD devido ao motivo X
```
Exemplo:
`não teremos atendimento presencial no dia 2026-10-28 devido ao feriado municipal "Data de emancipação da cidade"` ou `2026-10-26 devido ao feriado municipal "Aniversário da cidade"`.

O sistema precisava:
1. Detectar automaticamente exceções cadastradas em `additionalInstructions` e `cachedSummary` associadas a datas específicas (`YYYY-MM-DD`, `DD/MM/YYYY`, `DD/MM`, `dia DD`).
2. Vincular essas exceções com a resolução temporal relativa (`TemporalResolver`), interceptando consultas como:
    - "amanhã tem atendimento presencial?"
    - "tem atendimento presencial quarta-feira / dia 28?"
    - "vai abrir na quarta?"
    - "tem atendimento dia 2026-10-26?"
    - "atende aos domingos?"
    - "tem atendimento presencial hoje?"
3. Responder informando com precisão que no dia em questão **não haverá atendimento presencial** devido ao motivo cadastrado, indicando o retorno no próximo dia útil e lembrando que o autoatendimento virtual (chat) segue disponível 24h.
4. Garantir que a síntese de cache (`cachedSummary`) e sua reconstrução (`rebuild-cache`) preservem e retenham de forma determinística todas as exceções e avisos de calendário registrados.

---

## Escopo Executado

- [x] Implementar parser de exceções de calendário (`findExceptionForDate`) em `TemporalResolver`:
    - Suportar formato ISO `YYYY-MM-DD` (ex: `2026-10-26`, `2026-10-28`), formato brasileiro `DD/MM/YYYY`, `DD/MM` e dia do mês (`dia \d{1,2}`).
    - Extrair o motivo/justificativa cadastrado (ex: `devido ao feriado municipal "Aniversário da cidade"`, `devido ao feriado municipal "Data de emancipação da cidade"`).
    - Sobrepor o status regular do dia da semana (`isOpenOnTargetDay = false`, `scheduleOnTargetDay = 'Fechado (Feriado / Exceção Temporária)'`).
- [x] Atualizar as respostas em `TemporalResolver` para casos de exceção:
    - Caso "amanhã": se houver exceção na data de amanhã, responder informando o fechamento e o motivo.
    - Caso "hoje": se houver exceção na data de hoje, informar o fechamento e motivo.
    - Caso dia específico / dia da semana (ex: quarta-feira, dia 28): informar o fechamento e motivo.
- [x] Integrar `TemporalResolver` no `FlowEngineService`:
    - Passar o texto consolidado da base de conhecimento (`additionalInstructions` + `cachedSummary` + `companyRules`).
    - Expandir `isKnowledgeQuery` para capturar padrões de data, feriados e variações coloquiais/erros de digitação.
- [x] Garantir preservação determinística de exceções no compilador de cache (`KnowledgeService.compileKnowledgeSummary`):
    - Extrair e anexar explicitamente todas as exceções sob o tópico `### Avisos e Exceções Confirmadas de Atendimento (Prioridade Absoluta):`.
- [x] Atualizar arquivos de demonstração `.http` (`knowledge-demo.http`, `chat-demo.http`, `chat-requests.example.http`).
- [x] Validação: `pnpm --filter backend build`, `pnpm --filter frontend build`, `pnpm format:check`, reinicialização de contêineres e testes de ponta a ponta com curl.
