# Tarefa: Frontend Vue 3 + Tailwind v4 + Vue3-Toastify + Iconify

**Plano Relacionado:** [001-01-chatbot-multi-llm-001.md](../plans/001-01-chatbot-multi-llm-001.md)<br>
**Status:** ⚪ Não Iniciado<br>
**Responsável:** Tiago França<br>

---

## Contexto

Construir o frontend moderno em Vue 3 usando Vite, Vue Router, TailwindCSS v4, vue3-toastify e Iconify. A interface deve fornecer chat interativo, sugestões rápidas, painel lateral com metadados do cliente em tempo real, seletor de LLM provider, indicador de nós do flow e persistência no localStorage com botão de reset.

---

## Escopo de Trabalho

- [ ] Inicializar o frontend Vue 3 + TypeScript com Vite em `frontend/`
- [ ] Configurar TailwindCSS v4, vue3-toastify e Iconify (`iconify-icon`)
- [ ] Implementar páginas e rotas com Vue Router
- [ ] Implementar componente de Chat com mensagens do usuário e do bot
- [ ] Implementar persistência de `customerId` no `localStorage` e recarregamento automático
- [ ] Implementar painel de metadados do cliente (status de identificação, CPF/CNPJ, faturas, plano)
- [ ] Implementar chips de sugestões rápidas de mensagens
- [ ] Implementar visualizador de status do flow/intenção detectada e seletor de provider

---

## Critérios de Aceitação

- Interface limpa, responsiva e acessível
- `localStorage` mantém sessão no F5 e permite reset
- Notificações de feedback com `vue3-toastify`
- Ícones renderizados estritamente com Iconify
- Indentação de 4 espaços em todos os arquivos Vue, TS e CSS
