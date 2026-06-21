/**
 * DEMO DATA — Fixed content for Copilot Studio prototype.
 * These responses never change. Perfect for consistent demos.
 * All content: English + Traditional Chinese (繁體中文), HK university level.
 */

// ── Topic 1: Vocabulary ──────────────────────────────────────────────────

export const DEMO_VOCABULARY = {
  werewolf: {
    category: "Werewolf Role 狼人角色",
    description: "Essential English for playing Werewolf 玩狼人必備英文",
    entries: [
      {
        word: "suspicious behavior",
        translation: "可疑行為",
        category: "accusation",
        example: "I noticed some suspicious behavior from Player 3 last night.",
        roleRelevance: "all",
      },
      {
        word: "target",
        translation: "目標",
        category: "role-specific",
        example: "We should target the prophet tonight.",
        roleRelevance: "werewolf",
      },
      {
        word: "pretend to be",
        translation: "假扮",
        category: "strategy",
        example: "I'll pretend to be a villager and act innocent.",
        roleRelevance: "werewolf",
      },
      {
        word: "eliminate",
        translation: "淘汰",
        category: "voting",
        example: "We eliminated Player 2 last night.",
        roleRelevance: "werewolf",
      },
      {
        word: "cover for",
        translation: "掩護",
        category: "strategy",
        example: "I'll cover for you if they suspect you.",
        roleRelevance: "werewolf team",
      },
      {
        word: "blame someone else",
        translation: "嫁禍他人",
        category: "strategy",
        example: "Try to blame Player 4 — they've been quiet all game.",
        roleRelevance: "werewolf",
      },
      {
        word: "voting pattern",
        translation: "投票模式",
        category: "debate",
        example: "Look at the voting pattern — Player 2 and Player 5 always vote together.",
        roleRelevance: "all",
      },
      {
        word: "defend yourself",
        translation: "為自己辯護",
        category: "defense",
        example: "I need to defend myself — I'm just a villager.",
        roleRelevance: "all",
      },
    ],
  },
  prophet: {
    category: "Prophet Role 預言家角色",
    description: "Essential English for playing Prophet 玩預言家必備英文",
    entries: [
      {
        word: "verify",
        translation: "查驗",
        category: "role-specific",
        example: "I verified Player 3 last night — they are a werewolf.",
        roleRelevance: "prophet",
      },
      {
        word: "reveal",
        translation: "揭示",
        category: "role-specific",
        example: "I'm ready to reveal my identity. I'm the prophet.",
        roleRelevance: "prophet",
      },
      {
        word: "check result",
        translation: "查驗結果",
        category: "role-specific",
        example: "My check result shows Player 5 is innocent.",
        roleRelevance: "prophet",
      },
      {
        word: "confirm identity",
        translation: "確認身份",
        category: "role-specific",
        example: "I can confirm Player 2's identity — they're a villager.",
        roleRelevance: "prophet",
      },
      {
        word: "trustworthy",
        translation: "值得信任的",
        category: "debate",
        example: "I've proven I'm trustworthy through my checks.",
        roleRelevance: "prophet",
      },
      {
        word: "contradict",
        translation: "反駁",
        category: "debate",
        example: "Player 4's claim contradicts my check results.",
        roleRelevance: "prophet",
      },
      {
        word: "innocent",
        translation: "無辜的 / 好人",
        category: "general",
        example: "My check says Player 5 is innocent.",
        roleRelevance: "prophet",
      },
      {
        word: "werewolf",
        translation: "狼人",
        category: "general",
        example: "I found a werewolf — it's Player 3!",
        roleRelevance: "prophet",
      },
    ],
  },
  witch: {
    category: "Witch Role 女巫角色",
    description: "Essential English for playing Witch 玩女巫必備英文",
    entries: [
      {
        word: "antidote",
        translation: "解藥",
        category: "role-specific",
        example: "I used my antidote to save Player 1 last night.",
        roleRelevance: "witch",
      },
      {
        word: "poison",
        translation: "毒藥",
        category: "role-specific",
        example: "I poisoned Player 4 — they will be eliminated.",
        roleRelevance: "witch",
      },
      {
        word: "save a player",
        translation: "救人",
        category: "role-specific",
        example: "I chose to save the player who was attacked.",
        roleRelevance: "witch",
      },
      {
        word: "reveal myself",
        translation: "自爆身份",
        category: "strategy",
        example: "Should I reveal myself as the witch now?",
        roleRelevance: "witch",
      },
      {
        word: "one-time use",
        translation: "一次性使用",
        category: "rule",
        example: "Remember, each potion is one-time use only.",
        roleRelevance: "witch",
      },
      {
        word: "strategic",
        translation: "策略性的",
        category: "general",
        example: "Using the poison now would be strategic.",
        roleRelevance: "witch",
      },
      {
        word: "confirm",
        translation: "確認",
        category: "debate",
        example: "I can confirm what the prophet said.",
        roleRelevance: "witch",
      },
      {
        word: "hold back",
        translation: "保留",
        category: "strategy",
        example: "I'll hold back my antidote for now.",
        roleRelevance: "witch",
      },
    ],
  },
  villager: {
    category: "Villager Role 村民角色",
    description: "Essential English for playing Villager 玩村民必備英文",
    entries: [
      {
        word: "innocent villager",
        translation: "普通村民",
        category: "defense",
        example: "I'm just an innocent villager with no special ability.",
        roleRelevance: "villager",
      },
      {
        word: "observe",
        translation: "觀察",
        category: "debate",
        example: "I've been observing — Player 2 hasn't spoken much.",
        roleRelevance: "villager",
      },
      {
        word: "suspicious",
        translation: "可疑的",
        category: "accusation",
        example: "Player 5's behavior is very suspicious.",
        roleRelevance: "villager",
      },
      {
        word: "vote for",
        translation: "投票給",
        category: "voting",
        example: "I'm voting for Player 3 based on the evidence.",
        roleRelevance: "villager",
      },
      {
        word: "speak up",
        translation: "發聲",
        category: "strategy",
        example: "Everyone needs to speak up so we can find the werewolves.",
        roleRelevance: "villager",
      },
      {
        word: "logical",
        translation: "合乎邏輯的",
        category: "debate",
        example: "That doesn't sound logical to me.",
        roleRelevance: "villager",
      },
      {
        word: "agree with",
        translation: "同意",
        category: "debate",
        example: "I agree with Player 1's reasoning.",
        roleRelevance: "villager",
      },
      {
        word: "disagree",
        translation: "不同意",
        category: "debate",
        example: "I disagree — I think we should vote differently.",
        roleRelevance: "villager",
      },
    ],
  },
};

// ── Topic 2: Grammar Drills ──────────────────────────────────────────────

export const DEMO_DRILLS = {
  title: "🎯 Advanced English Practice 進階英文練習",
  grammarFocus: "Subjunctive, Inversion, Collocation — B2-C1 Level 假設語氣、倒裝、搭配詞 — 高階",
  drills: [
    {
      question: "'Had the prophet ___ earlier, we would have identified the werewolf sooner.' 揀正確選項：",
      correctAnswer: "revealed",
      options: ["reveal", "revealed", "revealing", "would reveal"],
      explanation:
        "This is a Type 3 conditional with INVERSION (倒裝). The normal form: 'If the prophet HAD REVEALED earlier...' When we invert, we drop 'if' and move 'had' to the front, keeping the past participle. 倒裝句：省略 'if'，將 'had' 提前，保留過去分詞。",
    },
    {
      question: "Which demonstrates the BEST use of hedging in academic debate? 邊句展現最佳學術辯論中的模糊化表達？",
      correctAnswer: "It would appear that Player 3's voting pattern is somewhat inconsistent with their stated position.",
      options: [
        "Player 3 is lying.",
        "It would appear that Player 3's voting pattern is somewhat inconsistent with their stated position.",
        "I think Player 3 might be bad.",
        "Player 3 definitely voted wrong.",
      ],
      explanation:
        "Academic hedging uses 'it would appear', 'somewhat', 'tends to' to soften claims while maintaining authority. Essential for B2-C1 level debate. 學術模糊化表達用 'it would appear'、'somewhat'、'tends to' 軟化主張同時保持權威。B2-C1 級別辯論必備。",
    },
    {
      question: "Identify the error: 'Not only he defended himself poorly, but he also contradicted his earlier testimony.' 找出錯誤：",
      correctAnswer: "'he defended' should be 'did he defend'",
      options: [
        "'defended himself' should be 'defended him'",
        "'he defended' should be 'did he defend'",
        "'contradicted' should be 'contradict'",
        "No error — the sentence is correct",
      ],
      explanation:
        "'Not only' at the start triggers SUBJECT-AUXILIARY INVERSION. Correct: 'Not only DID HE DEFEND himself poorly...' This is C1-level syntax. 'Not only' 開頭需要主語-助動詞倒裝。正確：'Not only DID HE DEFEND himself poorly...' C1 級語法。",
    },
    {
      question: "Which collocation is INCORRECT in: 'The werewolf attempted to ___ suspicion onto the villager.' 邊個搭配詞唔正確？",
      correctAnswer: "throw",
      options: ["cast", "throw", "deflect", "shift"],
      explanation:
        "CORRECT collocations: 'CAST suspicion', 'DEFLECT suspicion', 'SHIFT suspicion'. 'THROW suspicion' is NOT a natural English collocation — this is L1 transfer from Cantonese '掉'. 正確搭配：'cast suspicion'、'deflect suspicion'、'shift suspicion'。'Throw suspicion' 唔係自然英文搭配，係粵語 '掉' 嘅 L1 轉移。",
    },
    {
      question: "Which demonstrates correct use of a participial phrase? 邊句正確使用分詞短語？",
      correctAnswer: "Having observed the voting patterns carefully, I concluded that Player 2 was the werewolf.",
      options: [
        "Observing the voting patterns carefully, Player 2 was the werewolf.",
        "Having observed the voting patterns carefully, I concluded that Player 2 was the werewolf.",
        "Observed the voting patterns carefully, I concluded Player 2 was the werewolf.",
        "I having observed the voting patterns carefully concluded that Player 2 was the werewolf.",
      ],
      explanation:
        "'Having + past participle' indicates an action COMPLETED before the main verb. The subject of the participial phrase MUST match the main clause subject. Option A is a dangling modifier — 'Observing...' would mean Player 2 is observing. 'Having + 過去分詞' 表示在主動詞之前完成的動作。分詞短語的主語必須與主句主語一致。選項 A 是 dangling modifier。",
    },
  ],
};

// ── Topic 3: Role Strategy ───────────────────────────────────────────────

export const DEMO_STRATEGIES: Record<string, any> = {
  werewolf: {
    role: "werewolf",
    roleName: "Werewolf",
    roleNameCn: "狼人",
    keyPhrases: [
      {
        english: "I'm just a villager — I don't have any special information.",
        chinese: "我只係個村民，冇任何特別資訊。",
        usage: "When you need to blend in and look innocent 需要扮無辜嗰陣用",
      },
      {
        english: "Player 3 seems suspicious to me. They've been very quiet.",
        chinese: "我覺得3號玩家好可疑，佢一直好安靜。",
        usage: "To redirect suspicion onto someone else 將嫌疑轉移去其他人身上",
      },
      {
        english: "I think we should vote for Player 2 based on the evidence.",
        chinese: "根據證據，我認為我哋應該投票畀2號。",
        usage: "During voting phase to push your agenda 投票階段推動你嘅計劃",
      },
      {
        english: "Let's think about this logically. The prophet's check says...",
        chinese: "等我哋理性分析下。預言家嘅查驗結果話...",
        usage: "To sound reasonable and gain trust 聽起嚟理性，獲得信任",
      },
      {
        english: "I agree with Player 1 — that's a good point.",
        chinese: "我同意1號玩家，嗰個觀點好好。",
        usage: "To build alliances and look cooperative 建立聯盟，睇落合作",
      },
      {
        english: "I'm not convinced. Can you explain your reasoning?",
        chinese: "我唔係好信。你可唔可以解釋下你嘅邏輯？",
        usage: "To challenge others without looking aggressive 唔太有攻擊性咁挑戰人",
      },
    ],
    strategyTips: [
      "Speak early in the round — quiet players get suspected first 早啲發言，唔好做最靜嗰個",
      "Use 'we' language to create an 'us vs them' feeling against villagers 用 'we' 建立歸屬感",
      "Don't over-defend your werewolf partners — it's suspicious 唔好太明顯幫自己狼人隊友",
      "Ask questions instead of making accusations — looks more innocent 問問題而唔係指控，睇落更無辜",
      "Vary your speech length — don't always be the shortest or longest 講嘢長短要變化",
    ],
    vocabularyToKnow: [
      "suspicious",
      "innocent",
      "eliminate",
      "target",
      "pretend",
      "blame",
      "voting pattern",
      "defend",
    ],
  },
  prophet: {
    role: "prophet",
    roleName: "Prophet",
    roleNameCn: "預言家",
    keyPhrases: [
      {
        english: "I'm the prophet. I checked Player 3 last night — they are a werewolf.",
        chinese: "我係預言家。我尋晚查咗3號，佢係狼人。",
        usage: "When revealing your identity and check result 揭露身份同查驗結果嗰陣",
      },
      {
        english: "I verified Player 2's identity — they are innocent.",
        chinese: "我查驗咗2號嘅身份，佢係好人。",
        usage: "To confirm a player is a villager 確認某玩家係村民",
      },
      {
        english: "If there's another prophet claim, they are lying.",
        chinese: "如果有第二個人話自己係預言家，佢一定係講大話。",
        usage: "When someone else claims to be prophet 有人對跳預言家嗰陣",
      },
      {
        english: "I haven't revealed myself until now because I needed more information.",
        chinese: "我到而家先揭露身份，因為我需要更多資訊。",
        usage: "To explain why you stayed hidden 解釋點解之前隱藏身份",
      },
      {
        english: "Trust me — I can prove it. Let me share my check history.",
        chinese: "信我，我可以證明。等我分享我嘅查驗紀錄。",
        usage: "To establish credibility 建立可信度",
      },
      {
        english: "The witch should protect me tonight so I can check again.",
        chinese: "女巫今晚應該保護我，等我可以再查多一次。",
        usage: "To request protection from the witch 請求女巫保護",
      },
    ],
    strategyTips: [
      "Don't reveal too early — gather 2-3 checks first 唔好太早揭露，儲2-3個查驗先",
      "Keep a clear check history to share when you reveal 保持清晰查驗紀錄",
      "If you find a werewolf, reveal immediately — it's worth it 查到狼人即刻爆，值得",
      "Watch who defends you after you reveal — may be werewolves 留意揭露後邊個幫你，可能係狼人",
      "Coordinate with the witch for protection 同女巫協調保護",
    ],
    vocabularyToKnow: [
      "verify",
      "reveal",
      "check",
      "confirm",
      "trustworthy",
      "contradict",
      "innocent",
      "identity",
    ],
  },
  witch: {
    role: "witch",
    roleName: "Witch",
    roleNameCn: "女巫",
    keyPhrases: [
      {
        english: "I used my antidote last night to save the person who was attacked.",
        chinese: "我尋晚用咗解藥救咗被攻擊嘅人。",
        usage: "Revealing you used the antidote 透露你用咗解藥",
      },
      {
        english: "I haven't used my poison yet — I'm waiting for the right moment.",
        chinese: "我未用毒藥，等緊最適合嘅時機。",
        usage: "To signal you still have poison available 表示你仲有毒藥",
      },
      {
        english: "I can confirm — Player 1 was attacked last night and I saved them.",
        chinese: "我可以確認，1號尋晚被攻擊，我救咗佢。",
        usage: "To verify who was attacked 確認邊個被攻擊",
      },
      {
        english: "I'm the witch. The prophet should trust me.",
        chinese: "我係女巫，預言家應該信我。",
        usage: "Revealing your role to build trust 揭露身份建立信任",
      },
      {
        english: "Don't vote for Player 5 — I know they're good.",
        chinese: "唔好投票畀5號，我知道佢係好人。",
        usage: "Using your authority to protect someone 用你嘅權威保護某人",
      },
      {
        english: "I'll use my poison on whoever the group decides is most suspicious.",
        chinese: "我會聽大家意見，將毒藥用喺最可疑嘅人身上。",
        usage: "To coordinate with the village 同村民協調",
      },
    ],
    strategyTips: [
      "Save the antidote for the prophet if possible 盡可能留解藥畀預言家",
      "Stay hidden until you have critical information 有重要資訊先現身",
      "Use poison strategically — it can win or lose the game 毒藥係關鍵，用得好贏用得唔好輸",
      "Don't reveal both potions are used — keep enemies guessing 唔好透露兩支藥都冇晒",
      "Coordinate with confirmed good players 同已確認嘅好人合作",
    ],
    vocabularyToKnow: [
      "antidote",
      "poison",
      "save",
      "strategic",
      "confirm",
      "reveal",
      "one-time",
      "coordinate",
    ],
  },
  hunter: {
    role: "hunter",
    roleName: "Hunter",
    roleNameCn: "獵人",
    keyPhrases: [
      {
        english: "If I'm eliminated, I'm taking someone with me.",
        chinese: "如果我被淘汰，我會帶走一個人。",
        usage: "Warning — makes werewolves think twice about targeting you",
      },
      {
        english: "I'm the hunter. Vote carefully.",
        chinese: "我係獵人，投票小心啲。",
        usage: "Revealing to avoid being voted out by villagers",
      },
      {
        english: "I'll shoot the player I find most suspicious.",
        chinese: "我會開槍打最可疑嗰個。",
        usage: "To pressure werewolves during discussion",
      },
      {
        english: "Don't test me — if you vote me out, you might lose a villager too.",
        chinese: "唔好試我，投票淘汰我你可能會冇多個好人。",
        usage: "Deterrent against being voted out",
      },
    ],
    strategyTips: [
      "Stay hidden unless you're about to be voted out 除非就嚟被投走，否則隱藏身份",
      "Your death is powerful — don't be afraid to be targeted 你嘅死亡有威力，唔使驚被針對",
      "Announce your target in advance to pressure werewolves 預先宣布目標施壓狼人",
      "Coordinate with confirmed roles to pick the right target 同已確認角色協調揀目標",
    ],
    vocabularyToKnow: [
      "shoot",
      "eliminate",
      "target",
      "revenge",
      "warning",
      "confirm",
      "reveal",
      "strategy",
    ],
  },
};

// ── Topic 4: Game Rules ──────────────────────────────────────────────────

export const DEMO_RULES: Record<string, any> = {
  witch: {
    question: "What does the witch do?",
    answer:
      "The Witch 女巫 has TWO special abilities, each usable ONCE per game:\n\n" +
      "💚 **Antidote 解藥**: Save one player from being eliminated by werewolves during the night.\n" +
      "☠️ **Poison 毒藥**: Eliminate one player of your choice during the night.\n\n" +
      "You can use both in the SAME night or across different nights. Once used, they're gone. " +
      "The witch knows who the werewolves attacked each night, so you have special information.",
    relatedTopics: ["Prophet 預言家", "Guard 守衛", "Night Phase 夜晚階段", "Werewolf Elimination 狼人淘汰"],
  },
  prophet: {
    question: "What does the prophet do?",
    answer:
      "The Prophet 預言家 can CHECK one player's identity each night.\n\n" +
      "🔍 **Each night**: Choose one player — the game host tells you if they are a WEREWOLF or NOT.\n" +
      "📢 **Reveal strategy**: Share your check results during day discussion, but be careful — werewolves will target you!\n" +
      "🛡️ **Protection**: The witch and guard should protect the prophet.",
    relatedTopics: ["Witch 女巫", "Guard 守衛", "Werewolf Deception 狼人偽裝", "Night Phase 夜晚階段"],
  },
  voting: {
    question: "How does voting work?",
    answer:
      "Voting 投票 is how players eliminate suspected werewolves.\n\n" +
      "🗳️ **Day phase**: After discussion, each player votes for one person.\n" +
      "📊 **Majority wins**: The player with the MOST votes is eliminated.\n" +
      "🎲 **Tie**: If there's a tie, players re-vote. If still tied, random elimination among tied players.\n" +
      "❌ **No skipping**: Everyone must vote — not voting is suspicious!",
    relatedTopics: ["Day Phase 日間階段", "Elimination 淘汰", "Strategy 策略", "Werewolf Game Flow 遊戲流程"],
  },
  general: {
    question: "How do you win at Werewolf?",
    answer:
      "Two teams compete in Werewolf 狼人殺:\n\n" +
      "🏘️ **Villager Team 好人陣營** wins when ALL werewolves are eliminated.\n" +
      "🐺 **Werewolf Team 狼人陣營** wins when the number of werewolves EQUALS or EXCEEDS the number of villagers.\n\n" +
      "Key numbers:\n" +
      "- 5-6 players: 1-2 werewolves\n" +
      "- 9 players: 3 werewolves + 3 special roles + 3 villagers\n" +
      "- 12 players: 4 werewolves + 4 special roles + 4 villagers",
    relatedTopics: ["Roles 角色", "Night Phase 夜晚階段", "Day Phase 日間階段", "Voting 投票"],
  },
};

// ── Topic 5: Mistake Review ──────────────────────────────────────────────

export const DEMO_MISTAKE_REVIEW = {
  studentMistakes: [
    {
      originalSpeech: "Not only he defended himself poorly, but he also contradicted his earlier testimony.",
      correctedVersion: "Not only did he defend himself poorly, but he also contradicted his earlier testimony.",
      mistakeType: "grammar",
      explanation:
        "Subject-auxiliary INVERSION required after sentence-initial 'Not only'. 句首 'Not only' 需要主語-助動詞倒裝。Correct: 'Not only DID HE defend...' This is a C1-level structure — common error even among advanced HK learners.",
    },
    {
      originalSpeech: "Had the prophet revealed earlier, we would have identified the werewolf sooner, isn't it?",
      correctedVersion: "Had the prophet revealed earlier, we would have identified the werewolf sooner, wouldn't we?",
      mistakeType: "grammar",
      explanation:
        "Tag question must match the MAIN CLAUSE auxiliary ('would'), not a fixed 'isn't it'. 附加問句必須匹配主句助動詞 ('would')，而非固定用 'isn't it'。HK students often default to 'isn't it' as a calque from Cantonese '係咪'.",
    },
    {
      originalSpeech: "The professor suggested us to analyze the voting pattern more systematically.",
      correctedVersion: "The professor suggested that we analyze the voting pattern more systematically.",
      mistakeType: "grammar",
      explanation:
        "'Suggest' NEVER takes an object + infinitive. Correct patterns: (1) suggest THAT + subjunctive clause, or (2) suggest + gerund. 'Suggest' 從不接賓語+不定式。正確模式：(1) suggest THAT + 虛擬語氣從句，或 (2) suggest + 動名詞。Mandarin/Cantonese '建議某人做某事' causes this L1 transfer error.",
    },
    {
      originalSpeech: "It is worth to consider that Player 5 might be colluding with the werewolves.",
      correctedVersion: "It is worth considering that Player 5 might be colluding with the werewolves.",
      mistakeType: "grammar",
      explanation:
        "'Worth' is followed by a GERUND (-ing), never an infinitive. 'Worth' 後跟動名詞 (-ing)，絕非不定式。Fixed pattern: 'It is worth + gerund'. This is a B2-level collocation that even advanced learners frequently get wrong.",
    },
    {
      originalSpeech: "The evidences presented by Player 2 were not sufficient to warrant elimination.",
      correctedVersion: "The evidence presented by Player 2 was not sufficient to warrant elimination.",
      mistakeType: "vocabulary",
      explanation:
        "'Evidence' is UNCOUNTABLE in English — no plural form, takes singular verb. 'Evidence' 在英文中是不可數名詞 — 無複數形式，用單數動詞。This is a register-sensitive error: in academic writing, treating 'evidence' as countable is considered a significant lexical gap at B2-C1 level.",
    },
  ],
  suggestedDrills: [
    {
      question: "Correct the tag question: 'Hardly anyone suspected Player 3, ___?' 改正附加問句：",
      correctAnswer: "did they",
      options: ["isn't it", "didn't they", "did they", "wasn't it"],
      explanation:
        "'Hardly' is a NEGATIVE adverb, so the tag must be POSITIVE. Also, 'anyone' takes 'they' in tags. 'Hardly' 是否定副詞，所以附加問句必須是肯定式。'anyone' 在附加問句中用 'they'。Double rule, B2+ level.",
    },
    {
      question: "'Were the witch to use her poison now, the game ___ dramatically.' 揀正確選項：",
      correctAnswer: "would change",
      options: ["would change", "will change", "changes", "had changed"],
      explanation:
        "'Were + subject + to + verb' is a Type 2 conditional with SUBJUNCTIVE INVERSION (dropping 'if'). Same as 'If the witch WERE to use...' Main clause takes 'would + base verb'. 'Were + 主語 + to + 動詞' 是第二類條件句的虛擬倒裝。主句用 'would + 原形動詞'。C1 structure.",
    },
    {
      question: "Which demonstrates correct academic hedging? 邊句展現正確的學術模糊化？",
      correctAnswer: "It could be argued that Player 4's behaviour tends to align with werewolf patterns.",
      options: [
        "Player 4 is definitely a werewolf because I know it.",
        "It could be argued that Player 4's behaviour tends to align with werewolf patterns.",
        "I totally believe Player 4 is suspicious, no doubt about it.",
        "Player 4 is maybe a werewolf, I guess?",
      ],
      explanation:
        "Academic hedging: 'it could be argued', 'tends to', 'patterns'. Shows nuanced, evidence-based reasoning without overclaiming. 學術模糊化：'it could be argued'、'tends to'、'patterns'。展現細膩、基於證據的推理，而非過度斷言。Essential for university-level debate.",
    },
  ],
  overallTips: [
    "INVERSION structures (Not only..., Had I..., Were she to...) 是 C1 級語法標記。掌握倒裝結構能顯著提升你英文辯論的學術性和說服力。練習：每當你想用 'if' 開頭，嘗試用倒裝代替。",
    "'Evidence', 'information', 'advice', 'research' 全部是不可數名詞。香港學生常見錯誤係將呢啲詞加 's'。記住：如果你喺學術寫作中將 'evidence' 寫成 'evidences'，教授會立即標記為 lexical error。",
    "Tag questions 喺正式辯論中好有用，但必須匹配主句嘅助動詞同 polarity（肯定/否定）。避免萬能 'isn't it' — 呢個係粵語 '係咪' 嘅 L1 轉移。",
    "學術辯論中，hedging（模糊化表達）係力量而唔係弱點。用 'it would appear', 'the data suggests', 'one might argue' 代替 'I know', 'definitely', '100%'。呢個係 B2 同 C1 級別嘅關鍵分別。",
  ],
};
