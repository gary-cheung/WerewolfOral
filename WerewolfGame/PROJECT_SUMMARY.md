# WerewolfEdu — AI-Powered English Learning Through Social Gaming

## Problem Statement

> **Teaching & Learning Innovation (Inside the Classroom)**
> How might we use AI agents to transform how teaching and learning happen within the classroom — empowering educators to design more engaging lessons, deliver personalized learning experiences at scale?

---

## Solution Overview

**WerewolfEdu** transforms the classic Werewolf (狼人殺) social deduction game into an AI-powered English learning platform for Hong Kong university students. Students play the game in English — debating, accusing, defending — while AI agents analyze every word they speak. After the game, AI generates personalized learning reports, vocabulary drills, and grammar exercises based on their actual mistakes.

The same AI learning content is available 24/7 through **Microsoft 365 Copilot Chat**, so students can practice on their phone between classes without opening the game website.

---

## How AI Agents Transform Classroom Learning

### Problem → Solution

| Traditional Classroom | WerewolfEdu + AI Agents |
|---|---|
| Teacher grades essays one-by-one, slow feedback | AI scores every speech instantly during gameplay |
| Same worksheet for 40 students | Personalized drills based on each student's actual mistakes |
| Students shy to speak English | Game immersion lowers anxiety — they *must* speak to win |
| Learning stops when class ends | Copilot Chat AI tutor available anytime, anywhere |
| Teacher tracks progress manually | AI generates longitudinal reports across all games played |
| Hard to make grammar fun | Social deduction game makes English practice addictive |

### AI Agent Roles

The system uses **three types of AI agents** working together:

| Agent | Where It Runs | What It Does |
|-------|--------------|--------------|
| **Game Judge AI** | In-game (Azure OpenAI GPT-4o-mini) | Real-time speech scoring: grammar accuracy, fluency, natural expression. Returns scores + corrections + improvement tips within seconds |
| **Learning Tutor AI** | Website + Copilot Chat (Azure OpenAI) | Generates vocabulary sets, grammar drills, role strategy guides, rules Q&A, and personalized mistake reviews |
| **Copilot Chat Agent** | Microsoft 365 Copilot Chat (Copilot Studio + M365 Agents SDK) | Conversational interface — students chat naturally, agent routes to the right AI tool, presents content bilingually (English + 繁體中文) |

---

## Feature List

### 🎮 In-Game Features (Website)

| Feature | AI/Agent Powered | Description |
|---------|-----------------|-------------|
| **Real-time Speech Analysis** | ✅ AI | After each student speaks, AI scores grammar accuracy (0-100), fluency (0-100), provides corrected text, and specific improvements |
| **Multi-role Gameplay** | — | 8 roles: Werewolf, Prophet, Witch, Hunter, Guard, Idiot, Wolf King, Villager. AI bots fill empty slots |
| **Voice Input** | ✅ AI | Web Speech API + OpenAI Whisper fallback for cross-platform speech-to-text |
| **Auto-generated Learning Report** | ✅ AI | End-of-game report: overall evaluation, strengths/weaknesses, phased improvement plan (1-2 weeks → 3-4 weeks → 1-2 months), grammar error rate, vocabulary/logic scores |
| **Multiplayer via Room Codes** | — | Create/join rooms with 6-character codes. WebSocket real-time sync |
| **Dark Fantasy UI** | — | Gothic medieval theme with AI-generated character art |

### 📚 Learning Features (Website)

| Feature | AI/Agent Powered | Description |
|---------|-----------------|-------------|
| **Vocabulary by Role** | ✅ AI | Generates 8-10 role-specific English phrases with Traditional Chinese translations, examples, and usage context |
| **Grammar Drills** | ✅ AI | Multiple-choice exercises generated from common HK English errors (articles, tenses, prepositions). Personalized when student has game history |
| **Role Strategy Guides** | ✅ AI | Key English phrases per role, strategy tips, must-know vocabulary, with Cantonese-English contrastive notes |
| **Game Rules Q&A** | ✅ AI | Natural language Q&A about Werewolf rules, roles, abilities, and strategy |
| **Personalized Mistake Review** | ✅ AI | Pulls student's actual speeches from past games, shows original vs corrected, classifies errors (grammar/vocabulary/expression), explains with Cantonese-English contrast |

### 💬 Copilot Chat Features (Microsoft 365)

| Feature | AI/Agent Powered | Description |
|---------|-----------------|-------------|
| **Vocabulary on Demand** | ✅ AI | "Teach me werewolf words" → AI returns role-specific vocabulary with 繁體中文 translations |
| **Grammar Drills on the Go** | ✅ AI | "Give me practice drills" → AI generates 5 multiple-choice questions with explanations |
| **Role Strategy Chat** | ✅ AI | "How do I play as witch?" → AI returns key phrases, tips, vocabulary |
| **Game Rules Chat** | ✅ AI | "What does the prophet do?" → AI answers with related topics for follow-up |
| **Mistake Review Chat** | ✅ AI | "Review my last game" → AI walks through each mistake with explanations |
| **Bilingual (EN + 繁體中文)** | ✅ AI | All content in English + Traditional Chinese for HK students |
| **Interactive Conversation** | ✅ AI | Multi-turn Q&A — students ask follow-ups, agent explains further |
| **3-Mode Entry** | — | Greeting with quick-select: 📚 Vocabulary / 🎯 Drills / ✨ Review |

---

## Technical Architecture

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
│           ├──► Website (React SPA, served by same app)    │
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

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion, Recharts |
| **Backend** | Node.js, Express, WebSocket (ws), TypeScript |
| **AI / LLM** | Azure OpenAI (GPT-4o-mini), OpenAI Whisper (speech-to-text) |
| **Agent Framework** | Microsoft 365 Agents SDK (`@microsoft/agents-hosting`), Copilot Studio (declarative agent) |
| **Database** | PostgreSQL (Neon serverless), Drizzle ORM |
| **Cloud** | Azure Container Apps, Azure Container Registry, Azure AI Agent Service |
| **Auth** | Express-session (guest mode), Azure Bot Service (Copilot Chat) |
| **Deployment** | Docker, Azure Developer CLI (azd), GitHub Actions CI/CD |

---

## AI Features — Current vs Roadmap

| Feature | Status | How AI Works |
|---------|--------|-------------|
| Real-time speech scoring | ✅ Live | GPT-4o-mini analyzes speech text → returns JSON with scores, corrections, improvements. Hallucination filter validates quoted phrases exist in original speech |
| End-of-game learning report | ✅ Live | All speeches from game → GPT-4o-mini generates structured report covering 7 dimensions with phased improvement plan |
| Role-specific vocabulary | ✅ Live (demo) | AI generates 8-10 vocabulary entries with Traditional Chinese translation, example sentences, usage context per role |
| Grammar drills | ✅ Live (demo) | AI generates 5 multiple-choice questions targeting HK-specific errors with Cantonese-English contrastive explanations |
| Role strategy guides | ✅ Live (demo) | AI generates role-specific key phrases, strategy tips, and vocabulary with bilingual labels |
| Game rules Q&A | ✅ Live (demo) | AI answers natural-language Werewolf rules questions with related topic suggestions for follow-up |
| Personalized mistake review | ✅ Live (demo) | AI analyzes actual student speeches from database, classifies errors, explains with Cantonese contrast, generates targeted drills |
| Speech-to-text transcription | ✅ Live | Web Speech API primary, OpenAI Whisper as cross-platform fallback |
| Copilot Chat conversational agent | ✅ Live | M365 Agents SDK bot handles 8 intents via regex → routes to AI tools → returns formatted Markdown with bilingual content |
| Longitudinal progress tracking | 🔜 Planned | A/B test prompts and personas |
| Teacher dashboard | 🔜 Planned | Class-level analytics across all students, common error patterns, curriculum recommendations |
| Adaptive difficulty | 🔜 Planned | AI adjusts drill difficulty based on student's error rate trends over time |
| Voice-based Copilot Chat | 🔜 Planned | Speak directly to Copilot Chat agent, Whisper transcribes → AI responds |

---

## How It Works — End to End

### Scenario: A student plays Werewolf, then reviews on Copilot Chat

```
1. STUDENT JOINS GAME (Website)
   → Enters room code, picks difficulty, gets assigned role (e.g. Werewolf)

2. DAY PHASE DISCUSSION (Website)
   → Student speaks: "I think he is werewolf because he act strange"
   → AI Judge analyzes (Azure OpenAI):
       Scores: Overall 72, Accuracy 68, Fluency 76
       Correction: "I think he is the werewolf because he acted strangely"
       Improvements: ["Missing article 'the'", "'act' → 'acted' (past tense)"]

3. GAME ENDS (Website)
   → AI generates comprehensive Learning Report:
       - Overall evaluation
       - Strengths in 3 dimensions
       - Improvement suggestions in 3 areas
       - Phased plan: Short-term (1-2 weeks) → Mid-term (3-4 weeks) → Long-term (1-2 months)

4. STUDENT OPENS COPILOT CHAT (Mobile, between classes)
   → @Werewolf English Tutor review my mistakes
   → Agent pulls game history from database
   → AI generates personalized review:
       ❌ "I think he is werewolf" → ✅ "I think he is the werewolf"
       💡 Cantonese lacks articles (冇冠詞概念), this is a common HK error
       → Offers targeted drill exercises

5. STUDENT PRACTICES (Copilot Chat)
   → "Give me drills"
   → AI generates 5 MC questions targeting article usage
   → Student answers, gets instant feedback with explanations
```

---

## Key Differentiators

1. **Learning disguised as play** — Students practice English because they want to win the game, not because they have to
2. **Personalized at scale** — Every student gets different drills based on their actual mistakes. One teacher can't do this for 40+ students
3. **Dual interface** — Website for immersive gameplay, Copilot Chat for on-the-go practice. Same AI backend, same student data
4. **HK-localized** — Traditional Chinese, Cantonese-English contrastive grammar notes, HK university context
5. **Built on Microsoft ecosystem** — Azure, M365 Copilot, Teams — familiar tools for schools already using Microsoft 365
6. **AI safety built in** — Hallucination filter validates AI corrections against original speech. Model fallback chain ensures availability

---

## Contact & Links

- **Website**: https://wwedu-api.gentlefield-5dac8c80.spaincentral.azurecontainerapps.io
- **Copilot Chat**: @Werewolf English Tutor (Microsoft 365 Copilot)
- **Azure**: Spain Central region, Container Apps
- **API Base**: `https://wwedu-api.gentlefield-5dac8c80.spaincentral.azurecontainerapps.io`
