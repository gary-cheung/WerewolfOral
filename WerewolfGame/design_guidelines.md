# Gen AI Werewolf English Learning Game - Dark Fantasy Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from dark fantasy games like Darkest Dungeon (gothic medieval aesthetics), Among Us (social deduction UI), and Discord (room/chat interfaces), blended with educational feedback patterns from Duolingo. Creating an immersive, mysterious atmosphere that enhances the werewolf theme while maintaining learning focus.

## Core Design Principles
1. **Dark Fantasy Immersion**: Gothic medieval aesthetic with mysterious, suspenseful atmosphere throughout
2. **Unified Visual Language**: Consistent dark fantasy theme across all pages and components
3. **Clear Learning Feedback**: AI corrections visible through subtle glowing highlights against dark backgrounds
4. **Gaming-First Experience**: Authentic Werewolf game that naturally encourages English practice
5. **Mobile-First Responsive**: Seamless experience across devices with touch-friendly dark UI

## Color Palette
**Primary Dark Fantasy Scheme**:
- Deep Navy: `#0f1729` (primary background)
- Rich Purple: `#2d1b4e` (secondary background, cards)
- Mystic Violet: `#6b46c1` (accents, interactive elements)
- Midnight Blue: `#1e3a5f` (panel backgrounds)
- Silver Mist: `#c7d0dd` (primary text)
- Fog Gray: `#8892a6` (secondary text, labels)

**Functional States**:
- Success/Correct: `#4ade80` (muted green glow)
- Danger/Error: `#dc2626` (blood red)
- Warning: `#f59e0b` (amber torchlight)
- Info/AI Feedback: `#60a5fa` (ethereal blue glow)

**Role-Specific Accents**:
- Werewolf: Deep crimson `#8b1538`
- Prophet: Celestial gold `#fbbf24`
- Villager: Earthy brown `#92400e`
- Witch: Poison green `#16a34a`
- Hunter: Steel gray `#6b7280`

## Typography System
**Font Families**:
- Primary: System fonts with fallback (-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)
- Display Headers: Bold weight (700) with slight letter-spacing for gothic feel

**Size Scale**:
- Extra Large: 18px (Section Headers, Primary CTAs)
- Large: 16px (Secondary CTAs, Important Labels)
- Base: 14px (Body Text, UI Elements)
- Small: 12px (Helper Text, Timestamps)

## Layout & Spacing System
**Tailwind Units**: Primary spacing of `2, 4, 6, 8, 12, 16, 20`
- Component padding: `p-4` to `p-6`
- Section spacing: `py-12` to `py-20`
- Card gaps: `gap-4` to `gap-6`
- Button padding: `px-6 py-3` (large), `px-4 py-2` (standard)

**Container Widths**:
- Max content: `max-w-6xl`
- Forms/cards: `max-w-md` to `max-w-2xl`
- Full-width with inner containers

## Component Library

### Navigation & Headers
- **Top Bar**: Semi-transparent dark navy (`#0f1729` at 90% opacity) with purple bottom border, werewolf logo left, user avatar right
- **Progress Indicators**: Purple-to-violet gradient fills, silver text percentages
- **Room Status**: Player count in glowing violet badges, ready checkmarks in muted green

### Buttons & Interactive
**Primary Actions**: Large rounded rectangles `w-[150px] h-[50px]` with purple gradient backgrounds, white text, subtle glow on hover
**Secondary Actions**: Outlined buttons with violet borders, transparent backgrounds, `w-[120px] h-[40px]`
**Image Overlay Buttons**: Blurred dark background (`backdrop-blur-md bg-black/40`), no hover states needed - default button styles handle all contexts
**States**: Default (gradient), Disabled (gray 40% opacity), Active (brighter purple with checkmark)

### Cards & Containers
**Player Cards**: Dark purple backgrounds (`#2d1b4e`), circular 60px avatars with role-colored borders, floating shadow effects
**Content Panels**: Midnight blue containers with subtle inner glow, rounded corners `rounded-lg`
**Modal Windows**: 300-400px centered overlays, dark navy background with purple borders, semi-transparent backdrop, 0.5s fade transitions
**Expandable Sections**: Animate height 60px→120px+ with 0.3s easing, purple chevron indicators

### Game-Specific Components
**Night Phase**: Near-black background (`#050a14`) with desaturated player avatars, purple moonlight glow effects, role action buttons with icon symbols
**Day Phase**: Lighter navy background, three-column layout (speaker list | text area | AI feedback), current speaker highlighted with violet border
**Voting Interface**: Grid of player cards with "Vote" buttons, real-time count display in glowing numbers at top
**Results Screen**: Full-screen modal with victory banner (green glow for villagers, red for werewolves), role reveals with character portraits, auto-advance after 5s

### Forms & Input
**Speech Input**: Large circular microphone button 60px, crimson when recording, purple when idle, press-and-hold with "Recording..." status
**Text Display**: Scrollable dark containers, sent messages in silver, drafts in fog gray, timestamps in small muted text
**Selection Lists**: Grid layouts with avatar + name + status badges, hover glow effects on interactive elements

### Feedback & Notifications
**AI Feedback Panel**: Collapsible sidebar (80px collapsed, 150px+ expanded), ethereal blue glow border
  - Grammar corrections: Red strikethrough → Green replacement with soft glow
  - Logic suggestions: Blue question prompts with lightbulb icons
  - Statistics: White numbers on dark purple background

**Toast Notifications**: Top-center, colored backgrounds with 80% opacity, white text, auto-dismiss 2s
**Loading States**: Animated werewolf howl icon (1 rotation/s), purple spinner trails

### Reports & Analytics
**Learning Report Cards**: Dark purple cards with role-colored accent strips, expandable details with before/after examples, gold star bookmarks
**PDF Export**: Progress modal with percentage bar, download button with document icon
**Share Function**: Unique link with glowing copy button, "Link Copied" confirmation toast

## Images

**Hero Image - Login Page**: Full-viewport dark forest scene with fog, prominent werewolf silhouette howling at purple moon. Character silhouettes (werewolf, prophet, villager, witch, hunter) arranged in foreground with subtle purple rim lighting. Werewolf logo overlaid top-center with glowing effect.

**Character Portraits**: Detailed gothic medieval style portraits for each role - werewolf (snarling beast), prophet (hooded mystic with glowing eyes), villager (fearful commoner), witch (cauldron silhouette), hunter (crossbow wielder). Use circular frames with role-colored borders.

**AI Judge Visual**: Hooded judge character with mystical staff, purple magical aura, displayed in game room header.

**Atmospheric Elements**: Fog textures, moon phases, torch flame animations, stone texture backgrounds for panels.

**Background Patterns**: Subtle medieval damask patterns in darker navy for large content areas, never overpowering text.

## Page Transitions
- Slide transitions: 0.3s with easing for sequential flows
- Fade transitions: 0.5s for modals and overlays
- Expand/collapse: 0.3s height animations
- Instant updates for real-time game status

## Responsive Behavior
**Mobile**: Single-column stacks, collapsible panels default closed, 44px minimum touch targets, fixed bottom navigation with semi-transparent dark background
**Desktop**: Multi-column grids (2-3 for players), persistent AI feedback sidebar, larger modals

## Accessibility
- High contrast text (WCAG AA+) - silver on dark backgrounds
- Focus states with purple glowing outlines
- Screen reader labels for all icons
- Keyboard navigation for all interactions
- Reduced motion option for animations