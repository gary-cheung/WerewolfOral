# Copilot Studio Agent — Setup Guide

## Overview

This guide sets up the "Werewolf English Tutor" agent in Microsoft Copilot Studio.
The agent calls the WerewolfEdu backend REST API (deployed on Azure Container Apps)
for all AI-generated content. Copilot Studio handles the conversation layer:
intent routing, follow-up Q&A, and natural language understanding.

**Backend URL:** `https://wwedu-api.gentlefield-5dac8c80.spaincentral.azurecontainerapps.io`

---

## Step 1: Create Agent

1. Go to [Copilot Studio](https://copilotstudio.microsoft.com)
2. Sign in with: `MonicaT@M365CPI81240444.onmicrosoft.com`
3. Click **Create** → **New agent**
4. Name: `Werewolf English Tutor`
5. Description: `English tutor for the Werewolf educational game. Practice vocabulary, grammar drills, role strategies, and review your game mistakes.`
6. Language: English
7. Click **Create**

---

## Step 2: Configure Agent Settings

Under **Agent settings**:

- **Icon**: Upload `color.png` from the project root
- **Generative AI**: Enabled (this handles follow-up Q&A automatically)

---

## Step 3: Create User Variables

These variables store state about the linked player:

| Variable Name | Type | Description |
|---|---|---|
| `varGameUsername` | Text | The student's game username (e.g., "BraveWolf427") |
| `varUserId` | Number | The student's user ID from the game database |
| `varIsLinked` | Boolean | Whether the student has linked their account |
| `varLastRole` | Text | Last role the student played (for context) |
| `varDifficulty` | Text | Preferred difficulty level (basic/intermediate/advanced) |

---

## Step 4: Create Topics

### Topic 1: Greeting

**Trigger phrases:**
- "hello"
- "hi"
- "help"
- "what can you do"
- "who are you"

**Message (no condition):**
```
👋 Hello! I'm the **Werewolf English Tutor**.

I can help you with:
1. 📚 **Vocabulary** — Learn words and phrases for each Werewolf role
2. 🎯 **Grammar Drills** — Practice with exercises personalized from your games
3. 🗡️ **Role Strategy** — Key English phrases for your Werewolf role
4. ✨ **Review Mistakes** — See what you got wrong in your last game
5. ❓ **Game Rules** — Ask questions about how to play

If you've played on the WerewolfEdu website, tell me your username and I'll personalize everything from your game history!

What would you like to do?
```

---

### Topic 2: Link Account

**Trigger phrases:**
- "link my account"
- "my username is"
- "I am * on the game"
- "connect my game account"
- "I'm * on WerewolfEdu"

**Setup:**
1. Extract the username from the user's message using a **Generative Answers** node or a custom entity extraction
2. Add a **HTTP Request** action:

```
Method: POST
URL: https://wwedu-api.gentlefield-5dac8c80.spaincentral.azurecontainerapps.io/api/users/link
Headers:
  Content-Type: application/json
Body (JSON):
{
  "m365Email": "{System.User.Email}",
  "gameUsername": "<extracted username>"
}
```

3. **Set variable** from response:
   - `varUserId` = `response.userId`
   - `varGameUsername` = `response.username`
   - `varIsLinked` = `true`

4. **Message (success):**
```
✅ Account linked! Welcome, {varGameUsername}.

I can now access your game history and provide personalized tutoring.

What would you like to work on?
- 📚 Vocabulary
- 🎯 Grammar Drills  
- ✨ Review my last game mistakes
```

5. **Message (user not found):**
```
Hmm, I couldn't find a player named "<username>". 

Make sure you've played at least one game on the WerewolfEdu website first.
Your username is shown in the lobby when you join.

What's your game username?
```

---

### Topic 3: Learn Vocabulary

**Trigger phrases:**
- "teach me vocabulary"
- "learn words"
- "vocabulary for * role"
- "what words should I know"
- "show me English phrases"
- "quiz me on vocabulary"

**Conditions:** None (general vocabulary) or extract role from message

**Actions:**

1. **Ask a question** (if no role specified):
```
Which role do you want vocabulary for?
Options: Villager | Werewolf | Prophet | Witch | Hunter | Guard | Any role
```

2. **HTTP Request** action:
```
Method: GET
URL: https://wwedu-api.gentlefield-5dac8c80.spaincentral.azurecontainerapps.io/api/learning/vocabulary?role=<role>&difficulty={varDifficulty}&category=general
```

3. **Parse response** — use Generative AI to present vocabulary in a conversational format:
   - Show each word with translation, example sentence
   - Offer to quiz: "Want me to quiz you on these?"

---

### Topic 4: Grammar Drills

**Trigger phrases:**
- "practice grammar"
- "give me drills"
- "grammar exercises"
- "test my English"
- "drills please"

**Actions:**

1. **Set variables** — if account linked:
```
If varIsLinked = true:
  Include userId in request
Else:
  Ask: "What difficulty level? (beginner / intermediate / advanced)"
  Set varDifficulty from response
```

2. **HTTP Request** action:
```
Method: POST
URL: https://wwedu-api.gentlefield-5dac8c80.spaincentral.azurecontainerapps.io/api/learning/drills
Headers:
  Content-Type: application/json
Body (JSON):
{
  "difficulty": "{varDifficulty}",
  "count": 5,
  "userId": {varUserId}
}
```

3. **Present drills** — use Generative AI to present each drill one at a time:
   - Show the question with 4 options
   - Wait for user's answer
   - Tell them if correct/incorrect with explanation
   - Offer next drill

---

### Topic 5: Role Strategy

**Trigger phrases:**
- "how do I play as *"
- "strategy for *"
- "what should a * say"
- "* role tips"
- "help me play *"

**Actions:**

1. **HTTP Request** action:
```
Method: GET
URL: https://wwedu-api.gentlefield-5dac8c80.spaincentral.azurecontainerapps.io/api/learning/role/<role>/strategy?difficulty={varDifficulty}
```

2. **Present strategy** — Generative AI summarizes:
   - Key phrases with Chinese translations
   - When to use each phrase
   - Strategy tips
   - Essential vocabulary

---

### Topic 6: Review My Game

**Trigger phrases:**
- "review my mistakes"
- "how did I do"
- "my last game"
- "show my errors"
- "what did I get wrong"
- "review my game"

**Actions:**

1. **Check if linked:**
```
If varIsLinked = false:
  Message: "I need to link your game account first. What's your username on the WerewolfEdu website?"
  Redirect to Topic 2 (Link Account)
```

2. **HTTP Request** action:
```
Method: GET
URL: https://wwedu-api.gentlefield-5dac8c80.spaincentral.azurecontainerapps.io/api/review/mistakes/{varUserId}
```

3. **Present review** — Generative AI summarizes:
   - Recent mistakes with original vs corrected
   - Explanation of each error
   - Practice drills targeting weak areas
   - Overall tips

---

### Topic 7: Game Rules

**Trigger phrases:**
- "how does * work"
- "what is the * rule"
- "explain * role"
- "game rules"
- "how to play"

**Actions:**

1. **HTTP Request** action:
```
Method: POST
URL: https://wwedu-api.gentlefield-5dac8c80.spaincentral.azurecontainerapps.io/api/learning/rules/ask
Headers:
  Content-Type: application/json
Body (JSON):
{
  "question": "{System.Activity.Text}"
}
```

2. **Present answer** — show the answer with related topics as follow-up suggestions

---

## Step 5: Publish

1. Click **Publish** in Copilot Studio
2. Select channels:
   - ✅ **Microsoft 365 Copilot Chat** — students can find via @Werewolf English Tutor
   - ✅ **Microsoft Teams** — can be added to personal/group chats

3. Test in Copilot Chat:
   - Open Copilot Chat in Teams or Microsoft 365
   - Type `@Werewolf English Tutor help`
   - Try: "teach me vocabulary for werewolf"
   - Try: "link my account, username is BraveWolf427"

---

## Step 6: Web Chat Widget (Optional)

To embed the Copilot Studio agent on the WerewolfEdu website:

1. In Copilot Studio, go to **Channels** → **Custom Website**
2. Copy the embed code
3. Add to `client/index.html` or a new React component
4. The widget appears as a floating chat bubble on the website

This gives students access to the tutor without leaving the game site.

---

## Backend API Reference

All endpoints are REST, return JSON, CORS enabled.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/learning/vocabulary` | GET | Vocabulary by role/category/difficulty |
| `/api/learning/drills` | POST | Grammar drills (optionally personalized) |
| `/api/learning/role/:role/strategy` | GET | Role-specific strategy guide |
| `/api/learning/rules/ask` | POST | Game rules Q&A |
| `/api/review/mistakes/:userId` | GET | Personalized mistake review |
| `/api/review/exercises` | POST | Exercises from game history |
| `/api/users/link` | POST | Link M365 email to game account |
| `/api/users/me` | GET | Get user info and stats |
| `/api/speech/analyze` | POST | (Existing) Analyze speech text |
| `/api/health` | GET | Health and status check |

### Query Parameters for `/api/learning/vocabulary`:
- `category` — "general", "accusation", "defense", "debate", "role-specific"
- `role` — "werewolf", "prophet", "villager", "witch", "hunter", "guard", "idiot", "wolf_king"
- `difficulty` — "basic", "intermediate", "advanced"

### Body Parameters for `/api/learning/drills`:
```json
{
  "grammarFocus": "articles",
  "difficulty": "intermediate",
  "count": 5,
  "userId": 1
}
```
