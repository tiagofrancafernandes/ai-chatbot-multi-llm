# 🤖 AGENTS.md - AI Coding Assistant Guidelines

Welcome to the **ai-chatbot-multi-llm** codebase. This document outlines mandatory operational guidelines, architecture patterns, task tracking protocols, and code style rules that all AI agents (including Claude, Copilot, Cursor, Gemini, and others) must follow when contributing to this repository.

---

## 1. Non-Negotiable Core Rules

All AI assistants working on this codebase must strictly enforce the following rules without exception:

1. **4-Space Indentation Everywhere**:
    - All code, configuration, templates, styles, markup, and data files must use **4-space indentation** (no 2-space indentation, no tabs).
    - Applies to: TypeScript (`.ts`), Vue single file components (`.vue`), HTML, CSS, JSON (`.json`), YAML (`.yml`, `.yaml`), and Markdown (`.md`).
    - Configured in `.editorconfig`, `.prettierrc`, and enforced by `pnpm format:check`.

2. **Compliance with `UNIVERSAL-CODE-STYLE-RULES.md`**:
    - You must strictly comply with all rules defined in [UNIVERSAL-CODE-STYLE-RULES.md](UNIVERSAL-CODE-STYLE-RULES.md).
    - **Guard Clauses & Early Returns**: Flatten control flow; validate input early and return immediately.
    - **Else-less Pattern**: Avoid `else` and `else if` whenever possible.
    - **No Nested Ifs**: Keep code vertically readable with a linear happy path.
    - **Mandatory Braces**: Every `if`, `for`, `while`, and `try` must have explicit curly braces `{}`. Single-line control statements are strictly forbidden.
    - **Fail Fast**: Abort execution on invalid state or missing parameters before performing work.
    - **Vertical Readability**: Visually separate declarations, validations, executions, and returns with blank lines.

3. **All Code in English**:
    - All variable, function, class, and method names must be in **English**.
    - All code comments, docstrings, and type definitions must be in **English**.
    - All Git commit messages and pull request descriptions must be in **English**.
    - All API routes, request/response payload keys, and database schema keys must be in **English**.
    - *(Note: Natural language prompts, mock user messages, and UI text presented to customers may be in Portuguese as specified by project requirements).*

4. **Task Management Workflow via `tasks/`**:
    - All work must be tracked according to the rules in [tasks/README.md](tasks/README.md).
    - Create tasks to be executed in the `tasks/tasks/` directory following the naming pattern:
      ```
      NNN-sequencia-titulo-MMM.md
      ```
    - Transition files through the lifecycle directories:
      ```
      tasks/plans/ → tasks/tasks/ → tasks/doing/tasks/ → tasks/done/tasks/
      ```
    - Update task headers with timestamps, context, scope checklist, and final results.

5. **Security and Secret Hygiene**:
    - **Never version valid credentials, API keys, private tokens, or real `.env` files**.
    - Always use placeholders in example files (`your_gemini_api_key_here`, `dev-bearer-token-example`).
    - Keep `.gitignore` strictly updated to ignore sensitive files (`.env`, `db.json`, `*.key`, `*.pem`).

---

## 2. Project Architecture & Stack

The system is a modern, high-performance multi-LLM chatbot with fast intent triage and dynamic flow routing:

```
ai-chatbot-multi-llm/
├── backend/              # NestJS 11 + Fastify/Express Core API
│   ├── src/
│   │   ├── chat/         # Chat sessions, history, and messaging controller
│   │   ├── customer/     # Customer profile metadata, identification, and balances
│   │   ├── database/     # Thread-safe JSON database storage service (db.json)
│   │   ├── flow/         # Flow engine, node transitions, and pending actions
│   │   └── llm/          # Multi-LLM provider abstraction (Ollama, Gemini, OpenAI, LM Studio)
│   └── dev-contents/     # Demonstration request files (*-demo.http)
├── frontend/             # Vue 3 (Composition API <script setup>) + Vite + TailwindCSS v4
│   └── src/
│       ├── views/        # ChatView.vue (live chat stream) & FlowView.vue (graph inspector)
│       ├── services/     # Typed ApiService client
│       └── types/        # TypeScript domain interfaces
├── dev/requests/         # VS Code REST Client example requests (*.example.http)
└── compose.yml           # Docker Compose multi-service deployment
```

### Key Technical Pillars:
- **Two-Tier Intent Triage (Ollama)**:
  - **Tier 1 (Instant Decision)**: Uses Ollama's `/v1/systemone` endpoint with `tev1:0.8b` for ultra-fast (<50ms) classification into primary intents (`greeting`, `technical_support`, `financial`, `plan_pricing`, `unknown`).
  - **Tier 2 (Conversational Fallback)**: Uses `qwen2.5:0.5b` to handle complex colloquial language, typos, Brazilian slang, and extract action parameters (`plan_change`, `address_change`, `cancellation`, `confirmation_yes`, `confirmation_no`).
- **Multi-Turn Action Confirmation (`pendingAction`)**:
  - Serious actions (plan downgrade/upgrade, cancellation, address changes) require explicit customer confirmation before mutating records in `db.json`.
- **Smart Fallback Alternatives**:
  - When queries fall outside established flows, the bot offers polite guidance alongside clickable alternative option chips.

---

## 3. UI and Icon Standards

- **Always use Iconify** for all icon requirements (`<iconify-icon icon="collection:name"></iconify-icon>`).
- Prohibited: inline SVG blobs scattered across templates, icon font classes (`fa fa-*`), or Unicode emojis as UI icons.
- Prefer Font Awesome 7 (`fa7-solid:`, `fa7-brands:`, `fa7-regular:`) or Tabler (`tabler:`).
- Style icons using TailwindCSS utilities (`class="text-cyan-400 text-sm"`, `hover:text-white transition`).

---

## 4. Route Changes and Demonstration Files (.http)

Whenever you add or modify any API endpoint in the backend:
1. Update or generate corresponding demo requests in `backend/dev-contents/demo-requests/` with the suffix `-demo.http`.
2. Update or generate corresponding example files in `dev/requests/` with the suffix `.example.http`.
3. Support both standard static variables (`@BASE_URL=...`) and dotenv dynamic imports (`{{$dotenv BASE_URL}}`) as demonstrated in `chat-dotenv-requests.example.http`.

---

## 5. Development Workflow & Commands

Always verify your changes before submitting commits:

```bash
# Code formatting check and auto-formatting
pnpm format:check
pnpm format

# Type-check and build
pnpm --filter backend build
pnpm --filter frontend build

# Docker stack verification
docker compose up -d --build
docker compose ps
```

---

## 6. Commit Message Convention

Follow Conventional Commits with concise, imperative English:
- `feat(scope): short description in english`
- `fix(scope): short description in english`
- `docs(scope): short description in english`
- `chore(scope): short description in english`
- `refactor(scope): short description in english`
