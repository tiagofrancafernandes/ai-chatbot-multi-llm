# Tarefa: Markdown-it com Sanitização, Tailwind Typography e Timestamps Relativos nas Mensagens

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ✅ Concluído<br>
**Iniciado em:** 2026-10-25 11:45<br>
**Concluído em:** 2026-10-25 12:20<br>
**Responsável:** Antigravity AI<br>

---

## Contexto

O usuário solicitou melhorias visuais e de segurança na renderização das mensagens no frontend do chat:
1. **Renderização de Markdown com markdown-it e sanitização**:
   - Usar `markdown-it` para converter as mensagens (respostas da API/bot, atendente, etc.) para HTML estilizado.
   - Usar `dompurify` para sanitizar o HTML gerado antes da inserção no DOM, evitando XSS e injeção de código malicioso.
2. **Plugins TailwindCSS para blocos de código e tipografia**:
   - Ativar `@tailwindcss/typography` (`prose prose-invert`) para estilizar formatações, cabeçalhos, listas, citações e blocos de código `<pre><code>`.
   - Garantir integração de `@tailwindcss/forms` para estilização dos inputs.
3. **Data e Hora com Tempo Relativo e Tooltip ISO**:
   - Exibir data/hora em cada mensagem enviada e recebida.
   - Mensagens recentes (menos de 24h) exibidas em formato relativo (ex: 'agora', 'há 1 minuto' / '1 minute ago', 'há 1 hora' / '1 hour ago', 'ontem' / 'yesterday').
   - Mensagens com mais de 24h exibidas com data e hora formatada.
   - Ao passar o mouse por cima (`title`), exibir o timestamp completo em formato ISO 8601 com fuso horário (ex: `2026-10-25T11:42:15-03:00`).

---

## Escopo de Trabalho

- [x] Instalar `markdown-it`, `dompurify` e suas tipagens TypeScript no `frontend`.
- [x] Configurar `@plugin '@tailwindcss/typography';` e `@plugin '@tailwindcss/forms';` em `frontend/src/assets/main.css`.
- [x] Criar utilitário `frontend/src/utils/markdown.ts` para renderizar e sanitizar markdown de forma segura.
- [x] Criar utilitário `frontend/src/utils/date-format.ts` para cálculo de tempo relativo (ex: 'just now', '1 minute ago', '1 hour ago', 'yesterday at HH:mm' / datas formatadas) e string ISO com fuso horário local.
- [x] Atualizar `frontend/src/views/ChatView.vue`:
  - Renderizar conteúdo das mensagens usando o utilitário markdown sanitizado dentro de classes Tailwind Typography (`prose prose-invert max-w-none text-sm`).
  - Adicionar badge/rodapé de timestamp em cada balão de mensagem com tooltip nativo contendo ISO 8601 + timezone.
- [x] Corrigir estabilidade dos fluxos principais e resiliência em `flow-engine.service.ts`:
  - Tratar consulta de plano atual para guests não identificados sem cair em fallback genérico.
  - Tratar confirmação afirmativa sem pendingAction sem cair em fallback genérico.
  - Tratar simulação/assinatura sem contrato pendente sem cair em fallback genérico.
  - Identificação de cliente por telefone/CPF existente com resposta cadastral precisa.
- [x] Validar conformidade de código com `UNIVERSAL-CODE-STYLE-RULES.md` e `pnpm format:check`.
- [x] Verificar build do backend e frontend com zero erros e reiniciar contêineres Docker.

---

## Critérios de Aceitação

- Textos com markdown (negrito, listas, blocos de código, tabelas, links) são renderizados perfeitamente com classes `prose`.
- Não há risco de XSS (tags perigosas como `<script>` ou handlers `onerror=` são sanitizados).
- Cada mensagem exibe o tempo relativo (ou data formatada se >24h) com tooltip ISO com fuso no hover.
- Código segue padrão de 4 espaços, guard clauses, sem else e comentários em inglês.

---

## Progresso

- 2026-10-25 11:45 - Tarefa criada e movida para `tasks/doing/tasks/`.
- 2026-10-25 12:15 - Pacotes instalados, plugins `@tailwindcss/typography` e `@tailwindcss/forms` configurados, utilitários `markdown.ts` e `date-format.ts` implementados.
- 2026-10-25 12:20 - Docker build concluído com sucesso e contêineres reiniciados. Tarefa concluída.
