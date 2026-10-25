# Tarefa: Validação Integrada, Docker Compose e Documentação Final

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ⚪ Não Iniciado<br>
**Responsável:** Tiago França<br>

---

## Contexto

Garantir o funcionamento conjunto do frontend e backend, testar os fluxos ponta a ponta, validar o arquivo Docker Compose (`compose.yml`) com Dockerfiles para produção/desenvolvimento, e documentar instruções de uso e inicialização no README.

---

## Escopo de Trabalho

- [ ] Criar `backend/Dockerfile` e `frontend/Dockerfile`
- [ ] Validar sintaxe e execução do `compose.yml`
- [ ] Testar fluxo completo de inicialização de chat, triagem com Ollama/Gemini e identificação de cliente
- [ ] Atualizar `README.md` com instruções detalhadas de inicialização local e via Docker
- [ ] Realizar checagens de formatação e integridade de tipos

---

## Critérios de Aceitação

- Docker compose sobe serviços corretamente respeitando as portas configuradas em `.env`
- README contém guia completo
- Código segue rigorosamente `UNIVERSAL-CODE-STYLE-RULES.md`
