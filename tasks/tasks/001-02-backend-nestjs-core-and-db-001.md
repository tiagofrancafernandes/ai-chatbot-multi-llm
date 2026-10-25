# Tarefa: Backend NestJS Core & JSON Database Engine com Mock Inicial

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ⚪ Não Iniciado<br>
**Responsável:** Tiago França<br>

---

## Contexto

Inicializar a aplicação NestJS na pasta `backend/`, implementar o serviço de banco de dados em JSON local com tipagem estrita, fail-fast, mutações seguras e dados de mock iniciais (clientes com CPF/CNPJ, faturas, planos e horários de atendimento).

---

## Escopo de Trabalho

- [ ] Estruturar o projeto NestJS em `backend/` com TypeScript e 4 espaços de indentação
- [ ] Criar `DatabaseModule` e `JsonDatabaseService` com persistência em arquivo JSON
- [ ] Implementar dados mock iniciais (clientes mock, planos, horários de atendimento)
- [ ] Adicionar tipagens estritas em inglês (`Customer`, `Invoice`, `Plan`, `BusinessHours`, `ChatSession`, `ChatMessage`)
- [ ] Garantir conformidade com `UNIVERSAL-CODE-STYLE-RULES.md`

---

## Critérios de Aceitação

- Inicialização sem erros do NestJS
- Banco de dados em JSON gerado e carregado dinamicamente
- Código 100% em inglês com early returns e guard clauses
