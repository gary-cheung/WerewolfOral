# Gen AI Werewolf - English Learning Game

## Overview
This project is a Gen AI-enabled Werewolf game prototype designed to help Chinese undergraduate students improve their English oral communication. It integrates immersive social gaming with real-time AI feedback on grammar, vocabulary, and logical reasoning, aiming for enhanced oral expression, grammar precision, and dual-dimension user satisfaction (gameplay and AI feedback). The target audience comprises Chinese non-English major undergraduates seeking practical English speaking opportunities.

## User Preferences
- I prefer clear, concise language.
- I like an iterative development approach.
- Please ask for my approval before making significant architectural changes or adding new, major features.
- When providing code, focus on the most relevant changes and explain the "why" behind them.
- Ensure all AI feedback mechanisms are robustly validated to prevent hallucinations.

## System Architecture
The application features a React with TypeScript frontend utilizing Tailwind CSS and Shadcn UI for a dark fantasy, gothic-themed user interface, emphasizing a mobile-first responsive design. The Web Speech API handles speech recognition, and Wouter manages routing. The backend is built with Express.js, employing WebSockets for real-time communication. A key architectural decision is the zero-friction guest authentication system, which automatically creates guest users and manages sessions with 401 auto-recovery. Game rooms support up to 12 players, with an auto-fill feature for AI bots to ensure games start, and roles are automatically assigned for balanced gameplay. The game flow includes night and day phases, a simplified voting system, and detailed learning reports. AI feedback is selectively displayed to the user during their turn, focusing on grammar, vocabulary, and logical reasoning, with a 3-layer validation system against hallucinations. Persistent game statistics are stored in a PostgreSQL database (Neon-backed via Drizzle ORM).

### UI/UX Decisions
- **Color Theme**: Dark fantasy werewolf aesthetic with deep navy, rich purple, and mystic violet. Ethereal purple for accents. Dark mode is default.
- **Typography**: Inter font family with clear hierarchy.
- **Components**: Shadcn UI with custom dark werewolf theme, hover/active elevation effects.
- **Branding**: Custom werewolf logo and unified branding.

### Technical Implementations
- **Guest Authentication**: Auto-creation, persistent sessions via localStorage, 401 auto-recovery, username deduplication, session regeneration for security.
- **Game Room System**: Unique 6-character room codes, auto-fill AI bots, balanced random role assignment (supporting 9-12 players).
- **In-game Mechanics**: Sequential speaking with "Now Speaking" banner, chronological chat feed, selective real-time AI feedback with collapsible panel, "Finish Speaking" to skip turn.
- **Voting System**: Simple majority, no abstain, random tie resolution, always eliminates one player.
- **AI Integration**: Speech-to-text (Web Speech API), AI voice synthesis for judge, OpenAI GPT-5 for grammar analysis, feedback validation against hallucinations.

## External Dependencies
- **OpenAI API**: Integrated via Replit AI Integrations (gpt-5 model) for speech analysis, grammar, vocabulary, and logic feedback. No API key is directly required, leveraging Replit credits.
- **PostgreSQL Database**: Used for persistent storage of user data, game sessions, and statistics, managed via Drizzle ORM.
- **Web Speech API**: Browser-native API for speech-to-text recognition.
- **WebSockets**: For real-time communication between frontend and backend.