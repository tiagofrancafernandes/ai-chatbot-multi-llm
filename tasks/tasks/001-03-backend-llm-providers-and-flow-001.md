# Tarefa: Provedores Multi-LLM e Motor de Fluxo Configurável

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ⚪ Não Iniciado<br>
**Responsável:** Tiago França<br>

---

## Contexto

Implementar o módulo Multi-LLM para classificação de intenções e geração de mensagens, suportando Ollama `/v1/systemone` com modelo `tev1:0.8b` (e outros), Google Gemini API (com structured JSON), OpenAI e LMStudio. Construir o motor de fluxo (Flow Engine) com nós encadeados (Decision, Action, Router, Message).

---

## Escopo de Trabalho

- [ ] Implementar `LlmModule` com interface unificada de Provedores (`LlmProvider`)
- [ ] Implementar `OllamaProvider` com suporte a `/v1/systemone` e fallback para `/api/chat`
- [ ] Implementar `GeminiProvider` com JSON Structured Output
- [ ] Implementar `OpenAiProvider` e adaptador para `LmStudio`
- [ ] Implementar `FlowEngineService` com nós configuráveis em grafo
- [ ] Suportar nó de triagem, nós condicionais e ramificações baseadas em intenções primárias/secundárias

---

## Critérios de Aceitação

- Roteador de intenções retorna formato previsível independentemente do provedor ativo
- Motor de fluxo processa nós e transições de maneira declarativa e configurável
- Código segue `UNIVERSAL-CODE-STYLE-RULES.md`
