# AI Multi-LLM Chatbot with Intent Triage & Flow Engine

An enterprise-ready, hybrid AI chatbot architecture combining microsecond-speed decision models (**Ollama `/v1/systemone`**) with conversational LLMs (**Google Gemini**, **OpenAI**, **LM Studio**), featuring a configurable node-based intent flow engine, a local JSON database engine, and a modern reactive frontend built with **Vue 3**, **TailwindCSS v4**, **Vue Router**, **Vue3-Toastify**, and **Iconify**.

---

## 🚀 Key Features

- **Hybrid System 1 & System 2 Architecture**:
    - **System 1 (Instant Intent Triage)**: Leverages Ollama's `/v1/systemone` endpoint with Jev-style decision models (`tev1:0.8b`, `nimble`) for ultra-low latency (<50ms) classification of user intentions, secondary requests, and customer identification signals without free-form token generation overhead.
    - **System 2 (Conversational Fluidity)**: Seamless fallback and text generation using Google Gemini (`gemini-1.5-flash`), OpenAI (`gpt-4o-mini`), or LM Studio with structured JSON mode.
- **Configurable Flow Engine (Node Graph)**:
    - Declarative nodes: `decision` (AI triage), `action` (customer auth, invoice lookup, plan fetch), `message` (templated responses), and `router`.
    - Handles complex multi-intent inquiries in a single step (e.g., technical support issue + duplicate invoice request auto-trigger).
- **Persistent Local JSON Database**:
    - Pre-populated mock data: Customers with CPF/CNPJ, pending & paid invoices, subscription tiers, business operating hours, and chat history.
    - Fully excluded from version control via `.gitignore`.
- **Modern Vue 3 Frontend**:
    - Built with **Vue 3 Composition API** (`<script setup lang="ts">`), **TailwindCSS v4**, and **Vue Router**.
    - Strict unified icon management using **Iconify** (`<iconify-icon>`).
    - Real-time customer metadata inspector and flow state tracker.
    - Session tracking with `localStorage` token preservation across page reloads and one-click reset to guest state.
    - Quick-suggestion chips and real-time toast alerts with `vue3-toastify`.
- **Docker Compose Ready**:
    - Configured via `compose.yml` with environment-driven port and host mappings.
- **REST Client Request Demos**:
    - Complete `.http` demo files stored in `backend/dev-contents/demo-requests/` (`chat-demo.http`, `customers-demo.http`, `flow-demo.http`).

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | NestJS v11, TypeScript, RxJS, class-validator, Node.js v22 |
| **Frontend** | Vue 3, Vite v6, Vue Router v4, TailwindCSS v4, Vue3-Toastify, Iconify |
| **AI / Multi-LLM** | Ollama `/v1/systemone` (`tev1:0.8b`), Google Gemini API, OpenAI API, LM Studio |
| **Storage** | Safe local JSON Database Engine |
| **Containerization** | Docker, Docker Compose (`compose.yml`) |

---

## 📋 Prerequisites

- **Node.js**: v20+ or v22+
- **pnpm**: v9+ or v11+
- **Ollama** (Optional for local SystemOne):
    ```bash
    ollama pull tev1:0.8b
    ```

---

## ⚙️ Configuration (.env)

Copy `.env.example` to create your local `.env`:

```bash
cp .env.example .env
```

Available variables:

```ini
# Application Ports
BACKEND_PORT=3001
FRONTEND_PORT=5173
VITE_API_URL=http://localhost:3001/api

# Default Active Provider (ollama | gemini | openai | lmstudio)
DEFAULT_PROVIDER=ollama
DEFAULT_MODEL=tev1:0.8b

# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_DECISION_MODEL=tev1:0.8b
OLLAMA_CHAT_MODEL=llama3.2:1b

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# LM Studio Configuration
LMSTUDIO_HOST=http://localhost:1234/v1
LMSTUDIO_MODEL=local-model
```

---

## 💻 Quick Start (Local Development)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start Backend (NestJS)
```bash
pnpm dev:backend
```
The NestJS server will start on `http://localhost:3001` (or your configured `BACKEND_PORT`).

### 3. Start Frontend (Vue 3)
```bash
pnpm dev:frontend
```
Open your browser at `http://localhost:5173`.

---

## 🐳 Docker Compose Deployment

To build and run the complete stack in containers:

```bash
docker compose up --build -d
```

To stop containers:
```bash
docker compose down
```

---

## 📡 REST API & Demo Requests

Ready-to-use demonstration files formatted for VS Code REST Client or JetBrains HTTP Client are available in `backend/dev-contents/demo-requests/`:

1. `backend/dev-contents/demo-requests/chat-demo.http`:
    - Session initialization (`/api/chat/init`)
    - Message dispatch with intent routing (`/api/chat/message`)
    - Provider switching (`/api/chat/providers/switch`)
    - History and session reset
2. `backend/dev-contents/demo-requests/customers-demo.http`:
    - Listing customers, plans, and business hours
    - Customer lookups by Phone or CPF
3. `backend/dev-contents/demo-requests/flow-demo.http`:
    - Querying and updating the node graph flow

---

## 🧪 Code Style & Guidelines Compliance

All code in this project follows `UNIVERSAL-CODE-STYLE-RULES.md`:
- 4 spaces indentation across TypeScript, Vue, YAML, JSON, and CSS.
- Explicit braces and early returns (guard clauses) with the else-less pattern.
- Fail-fast input validation.
- Descriptive naming and boolean variables framed as questions.
- 100% English code, comments, and API payloads.
