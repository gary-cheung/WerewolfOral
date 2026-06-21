# 🐺 Werewolf Oral — AI-Powered English Learning Through Social Gaming

> **Teaching & Learning Innovation (Inside the Classroom)**  
> How might we use AI agents to transform how teaching and learning happen within the classroom — empowering educators to design more engaging lessons, deliver personalized learning experiences at scale?

---

## 📺 Demo & Pitch

| Resource | Link |
|----------|------|
| 🎥 **Demo / Walkthrough Video** | [Watch on YouTube](https://www.youtube.com/watch?v=UW-Mcw62uJk) |
| 📊 **Pitch Deck** | [View on Canva](https://canva.link/12nfr334lbxetuw) |
| 🌐 **Live Website** | [wwedu-api.gentlefield-5dac8c80.spaincentral.azurecontainerapps.io](https://wwedu-api.gentlefield-5dac8c80.spaincentral.azurecontainerapps.io) |
| 💬 **Copilot Chat** | `@Werewolf English Tutor` (Microsoft 365 Copilot) |

---

## 🧩 What Is Werewolf Oral?

**Werewolf Oral** transforms the classic Werewolf (狼人殺) social deduction game into an AI-powered English learning platform for Hong Kong university students. Students play the game in English — debating, accusing, defending — while AI agents analyze every word they speak. After the game, AI generates personalized learning reports, vocabulary drills, and grammar exercises based on their actual mistakes.

This repository contains two parts:

| Part | Description | Directory |
|------|-------------|-----------|
| 🎮 **Werewolf Game** | Full-stack web application — React frontend + Express/WebSocket backend + AI speech analysis | [`WerewolfGame/`](WerewolfGame/) |
| 💬 **Werewolf English Tutor** | Microsoft 365 Copilot Chat agent — conversational AI tutor via Copilot Studio | [`WerewolfEnglishTutor/`](WerewolfEnglishTutor/) |

---

## 🎮 Werewolf Game (Website)

A browser-based multiplayer Werewolf game where AI judges your English in real-time.

### In-Game Features
- **Real-time Speech Analysis** — AI scores grammar accuracy, fluency, and provides corrections with improvement tips
- **8 Werewolf Roles** — Werewolf, Prophet, Witch, Hunter, Guard, Idiot, Wolf King, Villager
- **Voice Input** — Web Speech API + OpenAI Whisper for cross-platform speech-to-text
- **Auto-generated Learning Report** — End-of-game evaluation with phased improvement plan
- **Multiplayer via Room Codes** — Create/join rooms with 6-character codes, WebSocket real-time sync

### Learning Features
- **Vocabulary by Role** — AI generates role-specific English phrases with 繁體中文 translations
- **Grammar Drills** — Multiple-choice exercises targeting common HK English errors
- **Role Strategy Guides** — Key phrases, tips, and vocabulary per role
- **Game Rules Q&A** — Natural language Werewolf rules questions
- **Personalized Mistake Review** — AI pulls your actual speeches and explains errors

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Node.js, Express, WebSocket (ws), TypeScript |
| AI / LLM | Azure OpenAI (GPT-4o-mini), OpenAI Whisper |
| Database | PostgreSQL (Neon serverless), Drizzle ORM |
| Cloud | Azure Container Apps, Azure Container Registry |
| Deployment | Docker, Azure Developer CLI (azd) |

---

## 💬 Werewolf English Tutor (Microsoft 365 Copilot Chat)

A conversational AI tutor available 24/7 inside Microsoft 365 Copilot Chat. Students can practice English on their phone between classes without opening the game website.

### Copilot Chat Features
- **Vocabulary on Demand** — "Teach me werewolf words" → role-specific vocabulary with 繁體中文
- **Grammar Drills on the Go** — AI generates multiple-choice questions with explanations
- **Role Strategy Chat** — "How do I play as witch?" → key phrases, tips, vocabulary
- **Game Rules Chat** — Natural language Q&A about Werewolf rules
- **Mistake Review Chat** — "Review my last game" → walkthrough of each mistake
- **Bilingual (EN + 繁體中文)** — All content in English + Traditional Chinese for HK students
- **3-Mode Entry** — Quick-select: 📚 Vocabulary / 🎯 Drills / ✨ Review

### Agent Architecture
- Built with **Microsoft 365 Agents SDK** (`@microsoft/agents-hosting`)
- **Copilot Studio** declarative agent with 8+ conversational topics
- HTTP Actions → Learning API for AI content generation
- Published to Copilot Chat + Microsoft Teams

---

## 🤖 AI Agent Roles

| Agent | Where It Runs | What It Does |
|-------|--------------|--------------|
| **Game Judge AI** | In-game (Azure OpenAI GPT-4o-mini) | Real-time speech scoring: grammar accuracy, fluency, natural expression |
| **Learning Tutor AI** | Website + Copilot Chat (Azure OpenAI) | Generates vocabulary, grammar drills, role strategies, mistake reviews |
| **Copilot Chat Agent** | Microsoft 365 Copilot Chat (Copilot Studio + M365 Agents SDK) | Conversational interface — routes to the right AI tool, presents bilingually |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Azure Cloud                            │
│                                                           │
│  ┌─────────────────────┐   ┌──────────────────────────┐ │
│  │  Container App       │   │  Azure PostgreSQL (Neon)  │ │
│  │  (Express + WebSocket)│◄──┤  Game history, users,     │ │
│  │                      │   │  speeches, scores          │ │
│  │  ┌─────────────────┐ │   └──────────────────────────┘ │
│  │  │ Game Engine      │ │                                │
│  │  │ (WebSocket)      │ │   ┌──────────────────────────┐ │
│  │  ├─────────────────┤ │   │  Azure OpenAI             │ │
│  │  │ AI Speech Judge  │─┼──►│  GPT-4o-mini              │ │
│  │  │ (real-time)      │ │   │  - Speech analysis        │ │
│  │  ├─────────────────┤ │   │  - Learning content gen    │ │
│  │  │ Learning API     │─┼──►│  - Drill generation       │ │
│  │  │ (REST)           │ │   │  - Mistake review          │ │
│  │  ├─────────────────┤ │   └──────────────────────────┘ │
│  │  │ M365 Bot         │ │                                │
│  │  │ (ActivityHandler) │◄──► Azure Bot Service           │
│  │  └─────────────────┘ │                                │
│  └─────────────────────┘                                  │
│           │                                               │
│           ├──► Website (React SPA)                        │
│           └──► Microsoft 365 Copilot Chat                 │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Copilot Studio Agent                                │ │
│  │  Topics → HTTP Actions → Learning API                │ │
│  │  Published to: Copilot Chat + Teams                  │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Azure OpenAI API access

### Werewolf Game (Website)

```bash
cd WerewolfGame
npm install
npm run dev          # Development server
npm run build        # Production build
npm start            # Production server
```

### Werewolf English Tutor (Copilot Chat)

Import `WerewolfEnglishTutor/` into **Microsoft Copilot Studio** as a declarative agent, or deploy via the **Teams Developer Portal**.

---

## 🔗 Links

- 🎥 **Demo / Walkthrough Video**: [https://www.youtube.com/watch?v=UW-Mcw62uJk](https://www.youtube.com/watch?v=UW-Mcw62uJk)
- 📊 **Pitch Deck**: [https://canva.link/12nfr334lbxetuw](https://canva.link/12nfr334lbxetuw)
- 🌐 **Website**: [https://wwedu-api.gentlefield-5dac8c80.spaincentral.azurecontainerapps.io](https://wwedu-api.gentlefield-5dac8c80.spaincentral.azurecontainerapps.io)
- 💬 **Copilot Chat**: `@Werewolf English Tutor` (Microsoft 365 Copilot)

---

## 📄 License

MIT
