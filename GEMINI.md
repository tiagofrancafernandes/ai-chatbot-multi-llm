# 🌟 GEMINI.md - Assistant Guidelines & Repository Reference

This file provides dedicated instructions, architectural context, and behavioral standards for Gemini and Google DeepMind assistants working on the **ai-chatbot-multi-llm** project.

---

## 1. Mandatory Core Guidelines

These rules take absolute precedence and must be followed on every task:

1. **4-Space Indentation Mandatory**:
    - **Always use 4 spaces** for indentation in all languages and formats: TypeScript, Vue, HTML, CSS, JSON, YAML, and Markdown.
    - Never use 2 spaces or tabs.
    - Comply with `.editorconfig` and `.prettierrc`.
    - Always verify with `pnpm format:check` and auto-format with `pnpm format`.

2. **Compliance with `UNIVERSAL-CODE-STYLE-RULES.md`**:
    - Strictly adhere to [UNIVERSAL-CODE-STYLE-RULES.md](UNIVERSAL-CODE-STYLE-RULES.md).
    - **Guard Clauses First**: Always validate inputs and state at the top of functions; return early.
    - **Else-less Style**: Never write `else` or `else if` blocks when an early return or guard clause can be used.
    - **Mandatory Braces**: Every control block (`if`, `for`, `while`, `try`, `catch`) must use curly braces `{}`. One-line statements without braces are strictly prohibited.
    - **No Nested Ifs**: Flatten control paths to ensure maximum vertical readability.
    - **Separation of Concerns**: Separate declarations, validations, business execution, and returns with empty lines.

3. **All Code in English**:
    - All code identifiers, classes, interfaces, functions, variables, comments, commit messages, and API routes must be written in **English**.
    - Customer-facing prompts, bot messages, and mock chat dialogue remain in Portuguese as per customer requirements.

4. **Task Management in `tasks/`**:
    - Follow the lifecycle described in [tasks/README.md](tasks/README.md).
    - Create tasks to be executed in `tasks/tasks/` using the naming pattern `NNN-sequencia-titulo-MMM.md`.
    - Progress tasks through `tasks/doing/tasks/` and conclude in `tasks/done/tasks/`.
    - Keep task checklists and progress notes updated.

5. **Security & Credentials**:
    - **Never version valid tokens, private keys, or actual `.env` files**.
    - Always use placeholders in `.env.example` and request demo files.
    - Ensure `.gitignore` ignores `db.json`, `.env`, `*.key`, and `*.pem`.

---

## 2. System Architecture & Routing Flow

```
                      +-----------------------------+
                      |   User Input (Chat View)    |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   Tier 1: Ollama tev1:0.8b  |
                      |   POST /v1/systemone        |
                      |   (<50ms Typed Decision)    |
                      +--------------+--------------+
                                     |
                       Definitive?  / \  Ambiguous / Action?
                                   /   \
                                 YES    NO
                                 /        \
                                v          v
             +--------------------+      +---------------------------------+
             | Direct Node Action |      | Tier 2: Ollama qwen2.5:0.5b     |
             | (Greeting/Support) |      | Deep Nuance & Typo Analysis     |
             +--------------------+      +----------------+----------------+
                                                          |
                                                          v
                                         +---------------------------------+
                                         | IntentContext & Action Analysis |
                                         | (Plan / Address / Confirmation) |
                                         +----------------+----------------+
                                                          |
                                          Requires Conf? / \ Execute Direct?
                                                        /   \
                                                      YES    NO
                                                      /        \
                                                     v          v
                                         +--------------+   +--------------+
                                         | pendingAction|   | Execute Step |
                                         | + Options    |   | + Options    |
                                         +--------------+   +--------------+
```

### Highlights:
- **Fast Decision Router**: Ollama `tev1:0.8b` acts as the primary triage engine via `/v1/systemone`.
- **Conversational Fallback**: Ollama `qwen2.5:0.5b` handles nuanced Brazilian colloquialisms, typos, and action requests (e.g., *"mudar para o plano mais barato"*).
- **Confirmation Loop (`pendingAction`)**: Sensitive operations (plan changes, cancellations, address changes) require explicit user confirmation (`isAffirmativeConfirmation` / `isNegativeConfirmation`) before mutating the JSON database.
- **Out-of-Scope Fallback**: Politely guides customers when requests are unrecognized and displays interactive option pills.

---

## 3. Demonstration Request Files (.http)

When modifying or introducing API endpoints:
- Generate or update `.http` files in `backend/dev-contents/demo-requests/` using the suffix `-demo.http` (e.g., `chat-demo.http`, `customers-demo.http`, `flow-demo.http`).
- Provide matching examples in `dev/requests/` with the suffix `.example.http` (e.g., `chat-requests.example.http` and `chat-dotenv-requests.example.http`).

---

## 4. UI Icons Policy

- Use **Iconify** for all UI icons: `<iconify-icon icon="fa7-solid:icon-name"></iconify-icon>`.
- Do not introduce inline `<svg>` elements or external icon fonts.
- Apply styling through TailwindCSS utilities (`class="text-cyan-400 text-sm"`).

---

## 5. Verification Commands

Run before committing any changes:

```bash
# Code style and formatting
pnpm format:check
pnpm format

# Backend and frontend build verification
pnpm --filter backend build
pnpm --filter frontend build

# Container rebuild and status
docker compose up -d --build
docker compose ps
```
