# Tarefa: Base de Conhecimento, Regras da Empresa e Resumo em Cache com IA Leve

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 10:05<br>
**Concluído em:** 2026-10-25 10:28<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

Adicionar ao sistema a capacidade de cadastrar e gerenciar:
1. **Regras e Base de Conhecimento da Empresa**: Instruções institucionais permanentes como atendimento presencial, dias e horários regulares, endereço físico, políticas de suporte, etc.
2. **Instruções Adicionais e Exceções**: Campo para comunicados e exceções temporárias (ex: feriados, reformas, ausência de atendimento em dia específico sem necessidade de reescrever toda a base).
3. **Resumo Compilado e Cache com IA Leve**: Ao salvar ou acionar a limpeza/recalculo de cache, o sistema concatena as informações e utiliza um modelo leve (`qwen2.5:0.5b` no Ollama) para sintetizar as regras em um resumo compacto e otimizado, armazenando-o em cache no `db.json`.
4. **Injeção de Contexto**: Esse resumo em cache é utilizado para responder perguntas do usuário sobre endereço, horários, atendimento presencial e exceções.
5. **Interface no Frontend**: Tela dedicada (`KnowledgeView.vue`) permitindo editar as regras, visualizar o resumo compilado em cache com timestamp, salvar/atualizar e forçar limpeza/recalculo do cache.

---

## Escopo de Trabalho

- [x] Definir interfaces de `KnowledgeBaseData` em `backend/src/common/interfaces/database.interface.ts` e `knowledge.interface.ts`.
- [x] Inicializar dados padrão de base de conhecimento em `default-database.ts` e `JsonDatabaseService`.
- [x] Criar módulo `knowledge` no backend (`KnowledgeController`, `KnowledgeService`, DTOs) com endpoints:
  - `GET /api/knowledge`
  - `PUT /api/knowledge`
  - `POST /api/knowledge/rebuild-cache`
- [x] Implementar geração de resumo compacto através do `LlmService` utilizando modelo leve (`qwen2.5:0.5b`).
- [x] Integrar o resumo de conhecimento no `FlowEngineService` para responder a dúvidas sobre horários, endereço, atendimento presencial e avisos temporários.
- [x] Criar view no frontend (`KnowledgeView.vue`) com formulário para regras, avisos temporários, visualizador do resumo em cache e botões de ação.
- [x] Adicionar rota e item de navegação no `App.vue` com Iconify.
- [x] Criar arquivos `.http` de demonstração em `backend/dev-contents/demo-requests/knowledge-demo.http` e `dev/requests/knowledge-requests.example.http`.
- [x] Validar execução ponta a ponta e garantir conformidade de estilo (4 espaços, UNIVERSAL-CODE-STYLE-RULES.md).

---

## Critérios de Aceitação

- Código segue UNIVERSAL-CODE-STYLE-RULES.md (4 espaços de indentação, guard clauses, sem blocos else).
- Todo o código e identificadores em inglês.
- Usuário pode cadastrar e atualizar regras da empresa e instruções adicionais via frontend e API.
- Ao salvar ou reconstruir cache, uma IA leve sintetiza as informações e salva o resumo compacto no cache com timestamp.
- Chatbot responde corretamente sobre horários, atendimento presencial, endereço e exceções com base no resumo compilado.
- Botão no frontend permite limpar e recalcular o cache sob demanda.

---

## Progresso

- 2026-10-25 10:05 - Tarefa criada e movida para `tasks/doing/tasks/`.
- 2026-10-25 10:28 - Funcionalidade implementada, compilada, testada e validada com sucesso em containers Docker.
