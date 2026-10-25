# Plano: Chatbot Multi-LLM com Triagem de Intenções e Flow Configurável

**Prioridade:** Alta<br>
**Data de Início Planejada:** 2026-10-25<br>
**Data de Conclusão Planejada:** 2026-10-25<br>
**Responsável:** Tiago França<br>

---

## Objetivo

Construir uma aplicação completa de Chatbot com Frontend e Backend:
- Backend em NestJS com suporte a Multi-LLM (Ollama com `/v1/systemone` e modelo `tev1:0.8b`, Gemini, OpenAI, LMStudio)
- Motor de fluxo configurável baseado em nós (node graph) orientado a intenções
- Banco de dados em JSON local (ignorado pelo versionamento) populado com mock de clientes, planos, horários de atendimento e histórico
- Frontend em Vue 3 + Vue Router + TailwindCSS v4 + vue3-toastify + Iconify (`iconify-icon`)
- Identificação de cliente com persistência em `localStorage` e triagem automatizada
- Docker Compose com arquivo `compose.yml` parametrizável por variáveis de ambiente
- Arquivos de requisição de demonstração `.http` em `backend/dev-contents/demo-requests/`
- Código 100% em inglês, indentação de 4 espaços, aderente ao `UNIVERSAL-CODE-STYLE-RULES.md`

---

## Escopo de Tarefas

- [x] Task 1: Setup do ambiente, workspace, .gitignore, .env.example e Docker compose (`tasks/tasks/001-01-environment-and-structure-001.md`)
- [x] Task 2: Backend NestJS Core & JSON Database Engine com Mock inicial (`tasks/tasks/001-02-backend-nestjs-core-and-db-001.md`)
- [x] Task 3: Provedores Multi-LLM (Ollama SystemOne, Gemini, OpenAI) e Motor de Fluxo Configurável (`tasks/tasks/001-03-backend-llm-providers-and-flow-001.md`)
- [ ] Task 4: API REST do Chat, Customers e Demo Requests (.http) (`tasks/tasks/001-04-backend-chat-api-and-demo-requests-001.md`)
- [ ] Task 5: Frontend Vue 3 + Tailwind v4 + Vue3-Toastify + Iconify (`tasks/tasks/001-05-frontend-vue3-tailwind-toastify-001.md`)
- [ ] Task 6: Validação integrada, Docker compose e documentação final (`tasks/tasks/001-06-docker-integration-and-verification-001.md`)

---

## Critérios de Sucesso

- ✅ Backend NestJS executando e expondo endpoints com validação defensiva
- ✅ Ollama `/v1/systemone` integrado com fallback para Gemini/OpenAI Structured Outputs
- ✅ Flow configurável com execução de nós e transições baseadas em intenções
- ✅ Banco de dados JSON com clientes e planos, sem versionamento via `.gitignore`
- ✅ Frontend Vue 3 reativo com TailwindCSS v4, vue3-toastify e Iconify
- ✅ Histórico e identificação preservados no `localStorage` e resetáveis
- ✅ Arquivo `compose.yml` e `.env.example` funcionais
- ✅ Demo requests `.http` em `backend/dev-contents/demo-requests/`
- ✅ Indentação de 4 espaços e conformidade estrita com `UNIVERSAL-CODE-STYLE-RULES.md`
