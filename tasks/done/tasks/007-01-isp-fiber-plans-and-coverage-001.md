# Tarefa: Configuração do Provedor de Internet Fibra Óptica, Planos Urbanos/Rurais, Cobertura e Contato

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 10:30<br>
**Concluído em:** 2026-10-25 11:15<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

Configurar o chatbot para o domínio específico de provedor de internet e serviços corporativos (fibra óptica, rede mesh, Wi-Fi corporativo, links dedicados):
1. **Tecnologia & Serviços**:
   - Conexão 100% Fibra Óptica.
   - Serviços adicionais: Rede Mesh, Wi-Fi corporativo, Links Dedicados para empresas e venda de roteadores adicionais (valores a combinar mediante análise técnica de necessidade).
2. **Planos de Internet**:
   - **Área Urbana**:
     - 600 Mega: R$ 79,99/mês
     - 800 Mega: R$ 89,99/mês
     - 1 Giga: R$ 99,99/mês
   - **Área Rural**:
     - 600 Mega: R$ 99,99/mês
     - 800 Mega: R$ 110,99/mês
     - 1 Giga: R$ 120,99/mês
     - Taxa de instalação sob consulta (depende da distância e ponto de instalação em relação à rede).
3. **Áreas Atendidas / Cobertura**:
   - Carmo do Cajuru - MG: 100% da área urbana e parcialmente zona rural nas proximidades da cidade.
   - São José dos Salgados - MG (distrito de Carmo do Cajuru): 100% da área urbana e parcialmente zona rural nas proximidades.
4. **Dados de Contato & Endereço**:
   - Telefone: (37) 3333-4444
   - E-mail: comercial@minhainternet.com
   - Endereço: R. Tiradentes, 405 - Carmo do Cajuru, MG, 35510-000
   - Horário de atendimento presencial e telefônico: Segunda a Sexta: 08h às 18h | Sábado: 08h às 12h.

---

## Escopo de Trabalho

- [x] Atualizar catálogo de planos no `default-database.ts` e na interface `Plan` (separação clara entre Urbana e Rural com novos preços).
- [x] Atualizar horários de funcionamento no `default-database.ts` (Seg-Sex 08h-18h, Sáb 08h-12h).
- [x] Atualizar a Base de Conhecimento (`knowledgeBase.companyRules`) com todos os detalhes do provedor (fibra óptica, cobertura, serviços mesh/link dedicado/wifi corporativo, contato, endereço, horários).
- [x] Recompilar o resumo em cache da base de conhecimento com a IA leve (`qwen2.5:0.5b`).
- [x] Atualizar extração e reconhecimento de planos e intenções no `FlowEngineService` e `intent-prompt.ts` (suporte a planos Urbanos e Rurais 600MB, 800MB, 1GB e perguntas sobre cobertura).
- [x] Atualizar clientes mock com dados compatíveis da região (Carmo do Cajuru / São José dos Salgados).
- [x] Atualizar arquivos `.http` de demonstração em `backend/dev-contents/demo-requests/` e `dev/requests/`.
- [x] Testar e validar consultas sobre planos urbanos, planos rurais, viabilidade/cobertura, endereço e horários.
- [x] Validar conformidade de código com `UNIVERSAL-CODE-STYLE-RULES.md` e `pnpm format:check`.

---

## Critérios de Aceitação

- Código segue UNIVERSAL-CODE-STYLE-RULES.md (4 espaços de indentação, guard clauses, sem blocos else).
- Catálogo de planos reflete os 3 planos urbanos e 3 planos rurais com os preços especificados.
- Base de conhecimento e resumo contêm todos os dados de contato, endereço em Carmo do Cajuru, horário de sábado e áreas atendidas.
- Bot responde corretamente sobre cobertura em Carmo do Cajuru, São José dos Salgados e zona rural.
- Bot apresenta os planos urbanos e rurais de forma organizada e permite contratar/mudar para os novos planos.

---

## Progresso

- 2026-10-25 10:30 - Tarefa criada e movida para `tasks/doing/tasks/`.
- 2026-10-25 10:45 - Modelos de dados, planos, horários de funcionamento e regras da base de conhecimento atualizados.
- 2026-10-25 11:04 - Cache de conhecimento recompilado com IA leve (`qwen2.5:0.5b`) e validado via API.
- 2026-10-25 11:15 - Testes de diálogo de cobertura, endereço e horários de sábado aprovados com sucesso. Tarefa concluída.
