# WerewolfEdu — AI 驅動的英語學習社交遊戲

## 問題陳述

> **教學與學習創新（課堂內）**
> 我們如何利用 AI agents 來改變課堂內的教學和學習方式 — 幫助教師設計更具吸引力的課程，並大規模提供個性化學習體驗？

---

## 解決方案概述

**WerewolfEdu** 將經典的狼人殺社交推理遊戲轉變為面向香港大學生的 AI 驅動英語學習平台。學生用英語參與遊戲 — 辯論、指控、辯護 — 而 AI agents 即時分析他們所說的每一句話。遊戲結束後，AI 根據學生的實際錯誤生成個性化學習報告、詞彙練習和文法訓練。

同樣的 AI 學習內容可通過 **Microsoft 365 Copilot Chat** 隨時隨地訪問，學生無需打開遊戲網站，在課間就能用手機練習。

---

## AI Agents 如何改變課堂學習

### 問題 → 解決方案

| 傳統課堂 | WerewolfEdu + AI Agents |
|---|---|
| 教師逐一批改作文，反饋緩慢 | AI 在遊戲中即時對每段發言評分 |
| 40 個學生做同一份練習 | 根據每個學生的實際錯誤生成個性化練習 |
| 學生不敢開口說英語 | 遊戲沉浸感降低焦慮 — 為了贏必須開口 |
| 下課後學習就停止 | Copilot Chat AI 導師隨時隨地可用 |
| 教師手動追踪進度 | AI 自動生成跨遊戲的縱向分析報告 |
| 文法教學枯燥乏味 | 社交推理遊戲讓英語練習變得令人上癮 |

### AI Agent 角色

系統使用**三種類型的 AI agents** 協同工作：

| Agent | 運行位置 | 功能 |
|-------|---------|------|
| **遊戲裁判 AI** | 遊戲內 (Azure OpenAI GPT-4o-mini) | 即時語音評分：文法準確度、流暢度、自然表達。數秒內返回分數 + 修正 + 改進建議 |
| **學習導師 AI** | 網站 + Copilot Chat (Azure OpenAI) | 生成詞彙集、文法練習、角色策略指南、規則問答和個性化錯誤檢討 |
| **Copilot Chat Agent** | Microsoft 365 Copilot Chat (Copilot Studio + M365 Agents SDK) | 對話式界面 — 學生自然對話，agent 路由到正確的 AI 工具，以雙語呈現內容（English + 繁體中文） |

---

## 功能列表

### 🎮 遊戲內功能（網站）

| 功能 | AI/Agent 驅動 | 描述 |
|---------|-------------|------|
| **即時語音分析** | ✅ AI | 每位學生發言後，AI 評分文法準確度 (0-100)、流暢度 (0-100)，提供修正文本和具體改進建議 |
| **多角色遊戲** | — | 8 個角色：狼人、預言家、女巫、獵人、守衛、白痴、狼王、村民。AI bots 填補空位 |
| **語音輸入** | ✅ AI | Web Speech API + OpenAI Whisper 降級方案，跨平台語音轉文字 |
| **自動生成學習報告** | ✅ AI | 遊戲結束報告：整體評價、優勢/弱點、分階段改進計劃（1-2週 → 3-4週 → 1-2月）、文法錯誤率、詞彙/邏輯分數 |
| **房間碼多人遊戲** | — | 6 位房間碼創建/加入。WebSocket 即時同步 |
| **暗黑奇幻 UI** | — | 哥特式中世紀主題，AI 生成角色美術 |

### 📚 學習功能（網站）

| 功能 | AI/Agent 驅動 | 描述 |
|---------|-------------|------|
| **角色詞彙** | ✅ AI | 生成 8-10 個角色特定英語短語，附繁體中文翻譯、例句和使用情境 |
| **文法練習** | ✅ AI | 針對香港常見英語錯誤（冠詞、時態、介詞）生成多選題。有遊戲記錄時可個性化 |
| **角色策略指南** | ✅ AI | 每個角色的關鍵英語短語、策略提示、必備詞彙，附粵英對比註解 |
| **遊戲規則問答** | ✅ AI | 自然語言問答狼人殺規則、角色、能力和策略 |
| **個性化錯誤檢討** | ✅ AI | 提取學生過往遊戲的真實發言，顯示原文 vs 修正版，分類錯誤（文法/詞彙/表達），附粵英對比解釋 |

### 💬 Copilot Chat 功能（Microsoft 365）

| 功能 | AI/Agent 驅動 | 描述 |
|---------|-------------|------|
| **隨時學習詞彙** | ✅ AI | "教我狼人詞彙" → AI 返回角色特定詞彙，附繁體中文翻譯 |
| **隨時文法練習** | ✅ AI | "給我練習" → AI 生成 5 道多選題及解釋 |
| **角色策略對話** | ✅ AI | "女巫要點玩？" → AI 返回關鍵短語、技巧、詞彙 |
| **遊戲規則對話** | ✅ AI | "預言家做咩架？" → AI 回答並建議相關話題供追問 |
| **錯誤檢討對話** | ✅ AI | "檢討我上場遊戲" → AI 逐一講解每個錯誤及解釋 |
| **雙語 (EN + 繁體中文)** | ✅ AI | 所有內容以 English + 繁體中文呈現，方便香港學生 |
| **互動式對話** | ✅ AI | 多輪問答 — 學生追問，agent 進一步解釋 |
| **三模式入口** | — | 歡迎訊息快速選擇：📚 詞彙 / 🎯 練習 / ✨ 檢討 |

---

## 技術架構

```
┌──────────────────────────────────────────────────────────┐
│                    Azure Cloud                            │
│                                                           │
│  ┌─────────────────────┐   ┌──────────────────────────┐ │
│  │  Container App       │   │  Azure PostgreSQL (Neon)  │ │
│  │  (Express + WebSocket)│◄──┤  遊戲記錄、用戶、         │ │
│  │                      │   │  發言、分數                │ │
│  │  ┌─────────────────┐ │   └──────────────────────────┘ │
│  │  │ Game Engine      │ │                                │
│  │  │ (WebSocket)      │ │   ┌──────────────────────────┐ │
│  │  ├─────────────────┤ │   │  Azure OpenAI             │ │
│  │  │ AI 語音裁判      │─┼──►│  GPT-4o-mini              │ │
│  │  │ (即時)           │ │   │  - 語音分析               │ │
│  │  ├─────────────────┤ │   │  - 學習內容生成            │ │
│  │  │ Learning API     │─┼──►│  - 練習生成               │ │
│  │  │ (REST)           │ │   │  - 錯誤檢討               │ │
│  │  ├─────────────────┤ │   └──────────────────────────┘ │
│  │  │ M365 Bot         │ │                                │
│  │  │ (ActivityHandler) │◄──► Azure Bot Service           │
│  │  └─────────────────┘ │                                │
│  └─────────────────────┘                                  │
│           │                                               │
│           ├──► Website (React SPA，同一 app 提供)         │
│           └──► Microsoft 365 Copilot Chat                 │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Copilot Studio Agent                                │ │
│  │  Topics → HTTP Actions → Learning API                │ │
│  │  發佈至：Copilot Chat + Teams                        │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 技術棧

| 層級 | 技術 |
|-------|-----------|
| **前端** | React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion, Recharts |
| **後端** | Node.js, Express, WebSocket (ws), TypeScript |
| **AI / LLM** | Azure OpenAI (GPT-4o-mini), OpenAI Whisper (語音轉文字) |
| **Agent 框架** | Microsoft 365 Agents SDK (`@microsoft/agents-hosting`), Copilot Studio (聲明式 agent) |
| **數據庫** | PostgreSQL (Neon serverless), Drizzle ORM |
| **雲端** | Azure Container Apps, Azure Container Registry, Azure AI Agent Service |
| **身份驗證** | Express-session (訪客模式), Azure Bot Service (Copilot Chat) |
| **部署** | Docker, Azure Developer CLI (azd), GitHub Actions CI/CD |

---

## AI 功能 — 現狀 vs 路線圖

| 功能 | 狀態 | AI 如何運作 |
|---------|--------|-------------|
| 即時語音評分 | ✅ 已上線 | GPT-4o-mini 分析語音文本 → 返回 JSON：分數、修正、改進建議。幻覺過濾器驗證引用的短語確實存在於原始發言中 |
| 遊戲結束學習報告 | ✅ 已上線 | 遊戲所有發言 → GPT-4o-mini 生成涵蓋 7 個維度的結構化報告，附分階段改進計劃 |
| 角色特定詞彙 | ✅ 已上線 (demo) | AI 生成 8-10 個詞彙條目，附繁體中文翻譯、例句、每個角色的使用情境 |
| 文法練習 | ✅ 已上線 (demo) | AI 生成 5 道多選題，針對香港特有錯誤，附粵英對比解釋 |
| 角色策略指南 | ✅ 已上線 (demo) | AI 生成角色特定關鍵短語、策略提示和雙語標籤詞彙 |
| 遊戲規則問答 | ✅ 已上線 (demo) | AI 回答自然語言的狼人殺規則問題，附相關話題建議供追問 |
| 個性化錯誤檢討 | ✅ 已上線 (demo) | AI 分析數據庫中學生的實際發言，分類錯誤，附粵語對比解釋，生成針對性練習 |
| 語音轉文字轉錄 | ✅ 已上線 | Web Speech API 為主，OpenAI Whisper 作跨平台降級方案 |
| Copilot Chat 對話式 agent | ✅ 已上線 | M365 Agents SDK bot 通過 regex 處理 8 種意圖 → 路由到 AI 工具 → 返回格式化 Markdown 及雙語內容 |
| 縱向進度追蹤 | 🔜 計劃中 | A/B 測試 prompt 和 persona |
| 教師儀表板 | 🔜 計劃中 | 全班級分析、常見錯誤模式、課程建議 |
| 自適應難度 | 🔜 計劃中 | AI 根據學生隨時間的錯誤率趨勢調整練習難度 |
| Copilot Chat 語音輸入 | 🔜 計劃中 | 直接對 Copilot Chat agent 說話，Whisper 轉錄 → AI 回應 |

---

## 運作流程 — 端到端

### 場景：學生玩 Werewolf，然後在 Copilot Chat 檢討

```
1. 學生加入遊戲（網站）
   → 輸入房間碼，選擇難度，獲分配角色（例如：Werewolf 狼人）

2. 日間討論階段（網站）
   → 學生發言："I think he is werewolf because he act strange"
   → AI 裁判分析 (Azure OpenAI)：
       分數：Overall 72, Accuracy 68, Fluency 76
       修正："I think he is the werewolf because he acted strangely"
       改進建議：["缺少冠詞 'the'", "'act' → 'acted' (過去式)"]

3. 遊戲結束（網站）
   → AI 生成綜合學習報告：
       - 整體評價
       - 3 個維度的優勢
       - 3 個方面的改進建議
       - 分階段計劃：短期（1-2週）→ 中期（3-4週）→ 長期（1-2月）

4. 學生打開 Copilot Chat（手機，課間）
   → @Werewolf English Tutor 檢討我嘅錯誤
   → Agent 從數據庫提取遊戲記錄
   → AI 生成個性化檢討：
       ❌ "I think he is werewolf" → ✅ "I think he is the werewolf"
       💡 粵語冇冠詞概念，呢個係香港學生常見錯誤
       → 提供針對性練習

5. 學生練習（Copilot Chat）
   → "畀我練習"
   → AI 生成 5 道針對冠詞使用的多選題
   → 學生作答，即時獲得反饋及解釋
```

---

## 核心差異化優勢

1. **學習偽裝成遊戲** — 學生為了贏得遊戲而練習英語，而非被迫學習
2. **大規模個性化** — 每個學生根據自己的真實錯誤獲得不同練習。一位教師無法為 40+ 學生做到這點
3. **雙界面** — 網站用於沉浸式遊戲，Copilot Chat 用於隨時練習。相同的 AI 後端，相同的學生數據
4. **香港本地化** — 繁體中文、粵英對比文法註解、香港大學背景
5. **基於 Microsoft 生態系統** — Azure、M365 Copilot、Teams — 學校若已使用 Microsoft 365 可直接上手
6. **內置 AI 安全性** — 幻覺過濾器驗證 AI 修正是否對應原始發言。Model fallback 鏈確保可用性

---

## 聯繫方式與連結

- **網站**: https://wwedu-api.gentlefield-5dac8c80.spaincentral.azurecontainerapps.io
- **Copilot Chat**: @Werewolf English Tutor (Microsoft 365 Copilot)
- **Azure**: Spain Central 區域, Container Apps
- **API 基礎路徑**: `https://wwedu-api.gentlefield-5dac8c80.spaincentral.azurecontainerapps.io`
