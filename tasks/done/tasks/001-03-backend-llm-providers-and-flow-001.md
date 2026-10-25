# Tarefa: Provedores Multi-LLM e Motor de Fluxo Configurável

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 00:12<br>
**Concluído em:** 2026-10-25 00:14<br>
**Responsável:** Tiago França<br>

---

## Contexto

Implementar o módulo Multi-LLM para classificação de intenções e geração de mensagens, suportando Ollama `/v1/systemone` com modelo `tev1:0.8b` (e outros), Google Gemini API (com structured JSON), OpenAI e LMStudio. Construir o motor de fluxo (Flow Engine) com nós encadeados (Decision, Action, Router, Message).

---

## Escopo de Trabalho

- [x] Implementar `LlmModule` com interface unificada de Provedores (`LlmProvider`)
- [x] Implementar `OllamaProvider` com suporte a `/v1/systemone` e fallback para `/api/chat`
- [x] Implementar `GeminiProvider` com JSON Structured Output
- [x] Implementar `OpenAiProvider` e adaptador para `LmStudio`
- [x] Implementar `FlowEngineService` com nós configuráveis em grafo
- [x] Suportar nó de triagem, nós condicionais e ramificações baseadas em intenções primárias/secundárias

---

## Progresso

- 2026-10-25 00:12 - Iniciado design da arquitetura de provedores e do motor de fluxo
- 2026-10-25 00:14 - Provedores Ollama (/v1/systemone Jev), Gemini, OpenAI, LMStudio e FlowEngineService implementados e testados

---

## Resultado Final

Módulo Multi-LLM com suporte a Ollama SystemOne, Gemini e OpenAI com fallback resiliente e padronização de schema de triagem. Motor de fluxo orientando decisões de autenticação, triagem de suporte e auto-trigger de faturas secundárias.



---

## Critérios de Aceitação

- Roteador de intenções retorna formato previsível independentemente do provedor ativo
- Motor de fluxo processa nós e transições de maneira declarativa e configurável
- Código segue `UNIVERSAL-CODE-STYLE-RULES.md`
