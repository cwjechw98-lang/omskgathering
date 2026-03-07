# OMSK: THE GATHERING — Complete Game Recreation Prompt

## 🎮 PROJECT OVERVIEW

**Create a browser-based 2-player digital collectible card game (CCG) inspired by Magic: The Gathering, set in a mystical urban-fantasy version of Omsk, Russia.**

### Core Specifications
- **Type**: Turn-based card duel / tactical CCG
- **Players**: 2 (local human-vs-human OR human-vs-AI)
- **Platform**: Browser SPA (React + TypeScript + Vite + Tailwind CSS)
- **Theme**: Mystical/urban-fantasy Omsk with local memes, factions, and narrative flavor
- **Art Style**: Dark fantasy with golden accents, particle effects, atmospheric lighting
- **Language**: Russian UI/UX

### Core Loop
Play lands → Generate mana → Cast creatures/spells/enchantments → Attack opponent → Reduce hero HP to 0 → Win

---

## 📜 LORE & WORLD BUILDING

### The Premise
Omsk is NOT a normal city. Beneath the asphalt, beneath the unfinished metro, beneath the frozen Irtysh River pulses ancient power. Five Sources of Mana are scattered across the city. Mages gather to battle for control. **You cannot leave Omsk.**

### The Five Mana Sources (Lands)

| Source | Color | Location | Theme |
|--------|-------|----------|-------|
| 🏛️ Prospekt Mira | ⬜ White | City center | Order, law, bureaucracy |
| 🌊 Irtysh Embankment | 🔵 Blue | Great river | Knowledge, secrets, ice |
| ⬛ Omsk Underground | ⚫ Black | Unfinished metro | Death, shadows, ambition |
| 🔥 Omsk Refinery | 🔴 Red | Oil plant | Chaos, fire, industry |
| 🌳 30 Years of Komsomol Park | 🟢 Green | Nature park | Growth, healing, bears |

### The Prophecy
In 2012, the **Bird-Omsk** (Птица-Омич) appeared—a magical crow of pure energy. It circled the city for 7 days and 7 nights, then prophesied:

> *"One day, Omsk will become an arena of great battle. Mages from all ends will gather here to fight for control of the Mana Sources. Only one will remain standing."*

### The Factions

**🏛️ ORDER OF PROSPECT** (White Mana)
- Officials, grandmas, trolleybus drivers
- Leader: **Mayor of Omsk**
- Belief: Order and tradition

**🌊 RIVER GUILD** (Blue Mana)
- Scientists, students, water spirits
- Leader: **Irtysh Water Spirit**
- Belief: Knowledge from river depths

**⬛ SHADOWS OF UNDERGROUND** (Black Mana)
- Gopniki, underground dwellers, dark mages
- Leader: **Shadow Omsk**
- Belief: Power through sacrifice

**🔥 FLAME OF REFINERY** (Red Mana)
- Route taxi drivers, hooligans, golems
- Leader: **TEC-5 Golem**
- Belief: Industrial fire and chaos

**🌳 CHILDREN OF PARK** (Green Mana)
- Janitors, fishermen, bears
- Leader: **Siberian Bear**
- Belief: Protect the last greenery

**🖥️ SCHOOL 21** (Neutral/Fifth Column)
- Programmer-mages whose spells are written in C
- Leader: **Bocal** (the AI overseer)
- Secret weapon: **Makefile Golem**

### The AI Opponent: **Keeper of Omsk** (Хранитель Омска)
- NOT human, NOT machine—the Spirit of the City itself
- Embodiment of all Omsk residents (past and present)
- Remembers every winter, every pothole, every broken metro promise
- Avatar: 🗿 (moai statue emoji)
- Personality: Serious, patient, relentless

---

## 🎯 GAME RULES & MECHANICS

### Win Condition
- Reduce enemy hero's health from **30 HP to 0**
- If both heroes reach ≤0 simultaneously: **DRAW**

### Game Setup
- **Starting HP**: 30 per player
- **Starting hand**: 5 cards (player1 draws extra = 6 cards)
- **Deck size**: ~145 cards (auto-generated from card pool)
- **Mulligan**: Not implemented in current version
- **Opening hand guarantee**: 2+ lands in first 5 cards, 3+ lands in first 8 cards

### Turn Structure

```
┌─────────────────────────────────────┐
│ 1. START OF TURN                    │
│    - Increment turn counter         │
│    - Refresh mana (maxMana + bonus) │
│    - Unfreeze creatures (-1 frozen) │
│    - Reset attack flags             │
│    - Apply start-of-turn effects    │
│    - Draw 1 card                    │
├─────────────────────────────────────┤
│ 2. MAIN PHASE                       │
│    - Play 1 land (if available)     │
│    - Play creatures/spells          │
│    - Cast enchantments              │
├─────────────────────────────────────┤
│ 3. COMBAT PHASE                     │
│    - Declare attackers              │
│    - Choose targets                 │
│    - Resolve damage                 │
│    - Trigger death effects          │
├─────────────────────────────────────┤
│ 4. END PHASE                        │
│    - Clear temporary buffs          │
│    - Pass turn                      │
└─────────────────────────────────────┘
```

### Resource System

**Mana**
- Each land played: +1 max mana, +1 current mana
- Mana refreshes each turn
- Maximum 1 land play per turn (tracked by `landsPlayed`)
- Some enchantments grant bonus mana

**Board Limits**
- Maximum 7 creatures per player
- Maximum 10 cards in hand (overflow burns card to graveyard)

### Card Types

| Type | Description | Examples |
|------|-------------|----------|
| **Creature** ⚔️ | Attacks, blocks, has attack/health | Bird-Omsk, Gopnik, Bear |
| **Spell** ✨ | One-time effect, then graveyard | Pivo, Segfault, Explosion |
| **Enchantment** 🔮 | Persistent global effect | Metro Dream, Omsk Winter |
| **Land** 🏔️ | Generates mana, 1 per turn | Prospekt Mira, Irtysh |

### Combat System

**Attacking Rules**
- Creatures cannot attack turn they're played (unless **Haste**)
- Creatures cannot attack if **frozen** (frozen > 0)
- Creatures cannot attack if they already attacked this turn
- Creatures with **Defender** cannot attack

**Targeting Rules**
- If defending player has creatures with **Defender**, attacker MUST target them first
- Creatures with **Flying** can only be blocked by other Flying creatures
- Creatures with **Unblockable** can bypass Defender gate

**Damage Resolution**
1. Calculate effective attack/health (with buffs/debuffs)
2. Apply **First Strike** damage (if applicable)
3. Apply normal damage
4. Check for death (currentHealth ≤ 0)
5. Trigger death effects
6. Move dead creatures to graveyard

**Trample**
- Excess damage from creature attack goes to enemy hero

**Lifelink**
- Damage dealt by creature heals its owner

**Deathtouch**
- Any damage dealt by creature = instant kill

---

## 🔑 KEYWORDS SYSTEM

| Keyword | Symbol | Effect |
|---------|--------|--------|
| **Haste** ⚡ | Ускорение | Can attack turn it's played |
| **Defender** 🛡️ | Защитник | Cannot attack; enemy MUST attack this first |
| **Flying** 🕊️ | Полёт | Can only be blocked by Flying creatures |
| **Trample** 🦶 | Растоптать | Excess damage goes to enemy hero |
| **Lifelink** 💖 | Привязка к жизни | Damage dealt heals owner |
| **Deathtouch** ☠️ | Смертельное касание | Any damage = instant kill |
| **Vigilance** 👁️ | Бдительность | Can attack AND defend (doesn't tap) |
| **First Strike** ⚡ | Первый удар | Deals damage before enemy retaliates |
| **Hexproof** 🔒 | Порчеустойчивость | Cannot be targeted by spells |
| **Unblockable** 👻 | Неблокируемый | Cannot be blocked by defenders |

---

## 🃏 CARD DATABASE (70 Cards Total)

### Card Structure (TypeScript)

```typescript
type CardColor = 'white' | 'blue' | 'black' | 'red' | 'green' | 'colorless';
type CardType = 'creature' | 'spell' | 'enchantment' | 'land';

interface CardData {
  id: string;
  name: string;
  cost: number;
  color: CardColor;
  type: CardType;
  attack?: number;
  health?: number;
  description: string;
  flavor: string;
  emoji: string;
  keywords?: Keyword[];
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic';
  imageUrl?: string;
}

interface CardInstance {
  uid: string;
  data: CardData;
  currentAttack: number;
  currentHealth: number;
  maxHealth: number;
  frozen: number;
  hasAttacked: boolean;
  summoningSickness: boolean;
  buffAttack: number;
  buffHealth: number;
  tempBuffAttack: number;
  tempBuffHealth: number;
  keywords: Keyword[];
}
```

### Rarity Distribution
- **Mythic** ★★★: 4 cards (1 copy in deck)
- **Rare** ★★: 15 cards (2 copies in deck)
- **Uncommon** ★: 14 cards (2 copies in deck)
- **Common** ○: 37 cards (2 copies in deck)

### Color Distribution
| Color | Role | Cards |
|-------|------|-------|
| ⬜ White | Protection, healing, order | 11 |
| 🔵 Blue | Freeze, card draw, knowledge | 11 |
| ⚫ Black | Removal, sacrifice, death | 12 |
| 🔴 Red | Aggression, damage, chaos | 11 |
| 🟢 Green | Strength, healing, nature | 10 |
| ◇ Colorless | Neutral, artifacts | 5 |

### Notable Cards

**Mythic Rares**
- **Dragon of Irtysh** 🐉 (8 mana, 7/7, Flying + Trample, ETB: 3 damage to all enemies)
- **Black Hole** 🕳️ (6 mana, 5/5, ETB: destroy all creatures with attack ≤2)
- **Mayor of Omsk** 🎩 (7 mana, 4/7, Vigilance, ETB: summon 2 Clerk 1/1 tokens, +1/+1 to all)
- **Lord of Cluster** 🖥️ (7 mana, 5/7, ETB: freeze 2 enemies, +1/+1 to all)

**Signature Creatures**
- **Bird-Omsk** 🐦 (1 mana, 1/1, Flying, ETB: draw 1 card)
- **Siberian Bear** 🐻 (5 mana, 5/5, Trample + Vigilance)
- **TEC-5 Golem** 🏭 (6 mana, 5/6, ETB: 2 damage to all enemy creatures)
- **Bocal** 🏢 (4 mana, 2/5, Defender + Hexproof, Buff: all Pisiners +1/+1)

**Signature Spells**
- **Pivo "Sibirskaya Korona"** 🍺 (1 mana, draw 2 cards)
- **Segmentation Fault** 💀 (1 mana, roll D6: 1-2 = 2 dmg to own, 3-6 = 3 dmg to enemy)
- **Explosion of Household Gas** 💥 (5 mana, 3 damage to ALL creatures)
- **Don't Leave Omsk!** 🚫 (3 mana, return strongest enemy creature to hand)

**Signature Enchantments**
- **Metro Dream** 🚇 (3 mana, start of turn: draw extra card)
- **Omsk Winter** ❄️ (5 mana, enemies enter frozen, -1 attack)
- **Spirit of Omsk** 👻 (4 mana, start of enemy turn: they lose 1 HP, your creatures +1 attack)

---

## 🖥️ USER INTERFACE

### Main Menu Screen
- **Title**: "OMSK: THE GATHERING" with golden runic circle
- **Background**: Dark mystical city, particle embers, floating emojis (🐦 ❄️ 🏭 👻 🐉 🧙‍♀️)
- **Buttons**:
  - 🗿 **Against Keeper** (AI mode)
  - 👥 **Two Players** (local PvP)
  - 📜 **Legend of Omsk** (lore chapters)
  - 📖 **Card Collection** (browse all cards)
  - 📋 **Game Rules**
  - 🧪 **Experiments**

### Game Board Layout

```
┌────────────────────────────────────────────────────────────┐
│ ENEMY HERO (top)                                           │
│ [HP: 30] [Mana: 5/7] [Deck: 23] [Graveyard: 12]            │
│ ─────────────────────────────────────────────────────      │
│ ENEMY HAND (face-down cards)                               │
│ [🂠] [🂠] [🂠] [🂠] [🂠]                                    │
│ ─────────────────────────────────────────────────────      │
│ ENEMY ENCHANTMENTS                                         │
│ [🔮 Metro Dream] [❄️ Omsk Winter]                          │
│ ─────────────────────────────────────────────────────      │
│ ENEMY FIELD (creatures)                                    │
│ [🧙‍♀️ 3/4] [🐻 5/5] [🏭 5/6]                               │
│                                                            │
│ ═══════════════════════════════════════════════════════    │
│                    MESSAGE FEED / HINTS                    │
│ ═══════════════════════════════════════════════════════    │
│                                                            │
│ PLAYER FIELD (creatures)                                   │
│ [🐦 1/1] [👨‍💻 1/3] [🧹 2/3]                                 │
│ ─────────────────────────────────────────────────────      │
│ PLAYER ENCHANTMENTS                                        │
│ [📊 Holy Graph] [🌅 Dawn of Victory]                       │
│ ─────────────────────────────────────────────────────      │
│ PLAYER HAND (face-up cards with stats)                     │
│ [🍺 Pivo] [🔴 Norminette] [🐻 Bear] [...]                  │
│ ─────────────────────────────────────────────────────      │
│ PLAYER HERO (bottom)                                       │
│ [HP: 25/30] [Mana: 4/6] [Deck: 31] [Graveyard: 8]          │
│ [END TURN BUTTON]                                          │
└────────────────────────────────────────────────────────────┘
```

### Card Visual Design

**Hand Card**
- Vertical layout with artwork (60% height)
- Cost badge (top-left, blue circle)
- Rarity stars (top-right)
- Emoji icon (bottom-center of artwork)
- Name, type, keywords, description (bottom 40%)
- Attack/Health badges (red/green circles)

**Field Card**
- Horizontal layout
- Left: artwork with emoji overlay
- Right: stats (attack/health), keywords, frozen counter
- Attack indicator (swords icon if can attack)
- Summoning sickness indicator (zzz)

**Card Frame by Rarity**
- **Common**: Gray border, simple glow
- **Uncommon**: Silver border, subtle shimmer
- **Rare**: Golden border, animated shimmer
- **Mythic**: Orange border, fire/particle effects

### UI Components
- `GameBoard.tsx` — Main gameplay orchestrator
- `PlayerArea.tsx` — Hero panel (HP/mana/counters)
- `HandCard.tsx` — Card in hand
- `FieldCard.tsx` — Creature on battlefield
- `CardPreview.tsx` — Modal card detail view
- `GameControls.tsx` — End turn button, hints
- `MessageFeed.tsx` — Narrative message stream
- `ParticleCanvas.tsx` — Background particle effects
- `Torch.tsx` — Decorative flame torches
- `CardDust.tsx` — Death/dust particle effect

---

## 🤖 AI SYSTEM

### AI Turn Structure

**Phase 1: Play Land**
- Prioritize preferred land (Ploshchad Bukhgoltsa)
- Play any land if available
- Respect 1 land per turn limit

**Phase 2: Play Cards (Priority-Based)**
- Score all playable cards
- Play highest-score card first
- Repeat until mana exhausted or no playable cards
- Don't play creatures if board is full (7 creatures)

**Phase 3: Attack**
- Check for lethal: can we kill enemy this turn?
- If lethal available: go face
- If can bypass defenders (Flying/Unblockable): go face
- If defenders present: must attack defenders first
- Otherwise: evaluate best trade vs enemy creatures

**Phase 4: End Turn**
- Call `endTurn()` to pass initiative

### Card Scoring System

**Creature Scoring**
```
Base: 10 + (attack × 3) + (health × 1.5)
Bonuses:
  +12 Haste (can attack immediately)
  +15 Defender/Vigilance if enemy has threats
  +20 Defender/Vigilance if low HP
  +5 Flying
  +8 Deathtouch
  +10 Lifelink if low HP
  +4 Trample
  +15 if no board presence
  +2 per mana cost (up to 5)
```

**Spell Scoring**
- Removal spells: 40+ (higher if enemy has threats)
- Board clears (Explosion): 40-70 (based on enemy board)
- Freeze spells: 15-45 (based on enemy board)
- Card draw: 18-22
- Buff spells: 30 (if creatures on board)
- Healing: 10-50 (based on missing HP)

**Enchantment Scoring**
- Metro Dream (extra draw): 40
- Omsk Winter: 30-45
- Spirit of Omsk: 35
- Others: 15-35

### AI Comment System
AI makes contextual comments based on:
- Card played (specific quotes per card)
- HP level (high/mid/low pools)
- Game state (lethal, desperate, confident)

Example:
- High HP: "🐦 Лети, птичка! Ты не покинешь Омск!"
- Mid HP: "🐦 Птица, помоги..."
- Low HP: "🐦 Вынеси меня из ада..."

---

## 🎬 NARRATIVE SYSTEM

### Message Types

1. **AI Comments** (🗿)
   - Yellow-gold border
   - From Keeper of Omsk
   - Contextual to game state

2. **Narrative Events** (⚔️)
   - Card play announcements
   - Special card triggers

3. **Death Quotes** (💀)
   - When creatures die
   - Flavor text from lore

4. **Story Events** (📜)
   - Turn-based triggers
   - Chapter progression

5. **Action Messages** (✨)
   - Game mechanics feedback
   - Damage, draws, etc.

### Turn-Based Story Events

| Turn | Event |
|------|-------|
| 1 | 🌅 "Morning in Omsk. Frosty air. Battle begins." |
| 3 | 🐦 "Bird-Omsk circles above, watching..." |
| 5 | 🌨️ "Snow begins to fall. Omsk winter approaches." |
| 8 | 🗿 "Keeper of Omsk is serious. No more games." |
| 10 | 🌑 "Darkness gathers. Spirit of Omsk watches." |

### Card-Specific Narratives

When certain cards are played, special narrative text appears:

```typescript
CARD_NARRATIVES = {
  bird_omsk: '☁️ Над полем битвы пролетает Птица-Омич...',
  drakon_irtysha: '🌊 Иртыш вскипает! Из глубин поднимается ДРАКОН!',
  blackhole: '💻 Экран мерцает... «rm -rf /» выполнено.',
  omskaya_zima: '❄️ Температура падает. -30... -40... -50...',
}
```

---

## 🏗️ TECHNICAL ARCHITECTURE

### File Structure

```
src/
├── App.tsx                    # Main app router (menu/intro/game)
├── main.tsx                   # Entry point
├── index.css                  # Global styles, Tailwind
│
├── components/
│   ├── MainMenu.tsx           # Main menu screen
│   ├── StoryIntro.tsx         # Cinematic intro sequence
│   ├── GameBoard.tsx          # Main gameplay UI
│   ├── PlayerArea.tsx         # Hero panel component
│   ├── GameBoard.tsx          # Main game board
│   │
│   ├── ui/                    # Reusable UI components
│   │   ├── card.tsx
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── tooltip.tsx
│   │   ├── progress.tsx
│   │   ├── modal-overlay.tsx
│   │   └── accordion.tsx
│   │
│   ├── game/                  # Game-specific components
│   │   ├── HandCard.tsx
│   │   ├── FieldCard.tsx
│   │   ├── CardPreview.tsx
│   │   ├── GameControls.tsx
│   │   └── MessageFeed.tsx
│   │
│   └── effects/               # Visual effects
│       ├── ParticleCanvas.tsx
│       ├── Torch.tsx
│       └── CardDust.tsx
│
├── data/
│   ├── cards.ts               # Card database (70 cards)
│   ├── localCardImages.ts     # Local image path mapping
│   └── lore.ts                # Narrative content
│
├── game/
│   ├── types.ts               # TypeScript interfaces
│   ├── engine.ts              # Public API facade
│   ├── engine.impl.ts         # Core game logic
│   ├── ai.ts                  # AI decision system
│   ├── state.ts               # State utilities
│   ├── buffs.ts               # Buff/debuff helpers
│   ├── effects.ts             # Effect triggers
│   ├── combat.ts              # Combat helpers
│   └── turns.ts               # Turn management
│
├── utils/
│   ├── cardImages.ts          # Image fallback helpers
│   └── cn.ts                  # Class name utility
│
└── tests/
    └── game/                  # Unit tests
```

### Game Engine Architecture

**State Management**
- Pure functional transformations: `state -> newState`
- Deep clone via `JSON.parse(JSON.stringify(...))`
- React `useState` holds current `GameState`

**Core Engine Functions**
```typescript
// Game lifecycle
createInitialGameState(): GameState
checkWinCondition(state): void

// Turn management
endTurn(state): GameState

// Card actions
playCard(state, playerKey, cardUid): GameState

// Combat
attackPlayer(state, attackerPlayerKey, attackerUid): GameState
attackCreature(state, attackerPlayerKey, attackerUid, defenderUid): GameState

// Helpers
getEffectiveAttack(card, player, opponent): number
getEffectiveHealth(card, player): number
cleanupDead(state): GameState
```

### GameState Interface

```typescript
interface GameState {
  player1: PlayerState;
  player2: PlayerState;
  currentTurn: 'player1' | 'player2';
  turnNumber: number;
  phase: 'main' | 'combat' | 'main2' | 'end';
  gameOver: boolean;
  winner: 'player1' | 'player2' | null;
  log: string[];
  cantAttackNextTurn: boolean;
  lastDiceRoll: DiceRoll | null;
  aiComment: string | null;
  mulliganPhase: boolean;
  mulliganCount: number;
  player1Keeping: boolean | null;
  player2Keeping: boolean | null;
}

interface PlayerState {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  hand: CardInstance[];
  field: CardInstance[];
  deck: CardInstance[];
  graveyard: CardInstance[];
  enchantments: CardInstance[];
  landsPlayed: number;
  maxLandsPerTurn: number;
}
```

### Deck Generation

```typescript
function createDeck(): CardData[] {
  // Base pool: all cards except token 'chinovnik'
  // Copy rules:
  //   - Mythic: 1 copy
  //   - Rare: 2 copies
  //   - Other non-land: 2 copies
  //   - Lands: 4 copies each
  // Result: ~145 cards
  
  // Shuffle with opening consistency:
  //   - 50 attempts to ensure 2+ lands in first 5
  //   - 3+ lands in first 8
  //   - Fallback swap logic if needed
}
```

---

## 🎨 VISUAL DESIGN

### Color Palette

**Backgrounds**
- Main: `#0a0a0f` (dark blue-black)
- Cards: `#1a1a24` to `#10101a` (gradient)
- UI panels: `#12121e` (slightly lighter)

**Accents**
- Gold: `#c9a84c`, `#f0d68a` (title glow)
- White mana: `#e8e8e0`
- Blue mana: `#4a90e2`
- Black mana: `#2a2a3a`
- Red mana: `#e24a4a`
- Green mana: `#4ae24a`

**Typography**
- Titles: `font-title` (cinematic serif)
- Headings: `font-heading` (bold sans-serif)
- Body: `font-body` (readable serif)

### CSS Effects

**Title Glow**
```css
.title-glow {
  text-shadow: 0 0 20px rgba(201, 168, 76, 0.5),
               0 0 40px rgba(201, 168, 76, 0.3);
}
```

**Card Frame Animations**
```css
@keyframes cardAppear {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes runeRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

**Particle Systems**
- Embers: floating orange particles (menu background)
- Magic: sparkles (collection, lore screens)
- Card dust: death particle effect

### Responsive Design

**Breakpoints**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Adaptive Elements**
- Card grid: `repeat(auto-fill, minmax(180px, 1fr))`
- Font sizes: `clamp()` for smooth scaling
- Touch targets: minimum 44px
- Message feed: adaptive width/position

---

## 🎵 AUDIO & FEEDBACK

### Sound Effects (Not Implemented, Future)
- Card play: paper shuffle sound
- Attack: sword slash
- Damage: impact thud
- Death: dust/crumble
- Turn end: gong/chime

### Visual Feedback
- Card hover: scale up, glow
- Can attack: sword icon, pulse animation
- Frozen: ice overlay, blue tint
- Low HP: red vignette on hero panel
- Lethal threat: exclamation mark

---

## 🧪 TESTING & QUALITY

### Test Coverage

**Unit Tests** (`tests/game/`)
- Engine slice tests
- Combat mechanics
- Keyword interactions
- AI behavior smoke tests

**Regression Tests** (`tests/regression/`)
- Combat regression suite
- Freeze/lifelink/deathtouch scenarios
- AI turn simulation

**Quality Gates** (`.github/workflows/`)
- Lint: ESLint + stylelint
- Test: Vitest + regression
- Build: Vite production build
- Deploy: GitHub Pages

---

## 🚀 DEPLOYMENT

### Build Process
```bash
npm ci
npm run build  # Output to dist/
```

### Vite Config
```typescript
export default defineConfig({
  base: '/omskgathering/',  // GitHub Pages subpath
  plugins: [react()],
  // ...
})
```

### GitHub Pages Workflow
- Trigger: push to `main`
- Action: build + deploy to `gh-pages` branch
- URL: `https://<username>.github.io/omskgathering/`

---

## 📋 COMPREHENSIVE CARD LIST

### Creatures (38 cards)

| Name | Cost | Color | A/H | Keywords | Ability |
|------|------|-------|-----|----------|---------|
| 🐦 Bird-Omsk | 1 | White | 1/1 | Flying | ETB: Draw 1 |
| 🦟 Irtysh Mosquito | 1 | Black | 1/1 | Flying, Lifelink | - |
| 🧹 Janitor-Berserker | 1 | Green | 1/2 | Haste | +1/+0 per other creature |
| 🎓 OmGTU Student | 1 | Blue | 1/3 | Defender | ETB: Scry 1 |
| ☕ Cluster Coffee Machine | 1 | Colorless | 0/4 | Defender | Start: Heal 1 |
| 🌻 Grandma with Seeds | 1 | Green | 0/3 | Defender | ETB/Start: Heal 1 |
| 🧢 Gopnik from Lubinsky | 2 | Red | 2/1 | Haste, First Strike | - |
| 👵 Grandma from Metro | 2 | White | 1/4 | Defender | Spells cost +1 |
| 🌯 Shawarma Master | 2 | Green | 2/3 | Lifelink | ETB/Death: Heal 2 |
| 🕳️ Underground Dweller | 2 | Black | 2/2 | Deathtouch | Death: 2 dmg to enemy hero |
| 👨‍💻 Pisiner School 21 | 2 | Blue | 1/3 | - | ETB: +1 mana, Death: Draw 1 |
| 🚎 Trolleybus Driver | 2 | White | 1/3 | Vigilance | ETB: Heal 1 |
| 🏪 Market Trader | 2 | Red | 2/2 | - | ETB: Draw 1, Discard 1 |
| 🚐 Mad Route Driver | 3 | Red | 3/2 | Haste | ETB: 1 dmg to ALL others |
| 🐱 Scientist Cat OmGU | 3 | Blue | 2/3 | - | When you cast spell: Draw 1 |
| 🐦‍⬛ Raven of Omsk Fortress | 3 | Black | 2/2 | Flying | ETB: Return creature from graveyard |
| 🤜 Omsk Hooligan | 3 | Red | 3/3 | - | ETB: 1 dmg to enemy hero |
| 🎣 Omsk Fisherman | 3 | Green | 2/4 | - | ETB: Draw 1 |
| 🧜‍♂️ Irtysh Water Spirit | 4 | Blue | 3/5 | - | ETB: Freeze random enemy 2 turns |
| 🌑 Shadow Omsk | 4 | Black | 3/3 | Unblockable | On hit: Enemy discards 1 |
| 🏢 Bocal | 4 | White | 2/5 | Defender, Hexproof | Your Pisiners +1/+1 |
| ⚙️ Makefile Golem | 4 | Red | 4/3 | Haste, Trample | On kill: Draw 1 |
| 🧙‍♀️ Omsk Witch | 4 | Black | 3/4 | Flying | ETB: 2 dmg to random enemy |
| ❄️ Snow Elemental | 5 | Blue | 4/6 | - | When damaged: Freeze attacker 1 turn |
| 🐻 Siberian Bear | 5 | Green | 5/5 | Trample, Vigilance | - |
| 🏴‍☠️ Irtysh Pirate | 5 | Blue | 4/4 | Flying | On hit hero: Draw 1 |
| 🏭 TEC-5 Golem | 6 | Red | 5/6 | - | ETB: 2 dmg to ALL enemies |
| 🕳️ Black Hole | 6 | Black | 5/5 | - | ETB: Destroy all with attack ≤2 |
| 🌲 Spirit of Siberia | 6 | Green | 6/6 | Trample | ETB: Heal 4 |
| 🎩 Mayor of Omsk | 7 | White | 4/7 | Vigilance | ETB: Summon 2 Clerks 1/1, +1/+1 to all |
| 🖥️ Lord of Cluster | 7 | Blue | 5/7 | - | ETB: Freeze 2 enemies, +1/+1 to all |
| 🐉 Dragon of Irtysh | 8 | Red | 7/7 | Flying, Trample | ETB: 3 dmg to ALL enemies + hero |

### Spells (18 cards)

| Name | Cost | Color | Effect |
|------|------|-------|--------|
| 🍺 Pivo "Sibirskaya Korona" | 1 | Green | Draw 2 cards |
| 💀 Segmentation Fault | 1 | Black | Roll D6: 1-2 = 2 dmg own, 3-6 = 3 dmg enemy |
| 🥙 Shawarma Power | 2 | Green | Random creature +2/+2, Heal 2 |
| 🕳️ Pothole on Road | 2 | Black | Destroy enemy with attack ≤3 |
| 🔍 Peer Review | 2 | Blue | Scry 3, take best |
| 🚗 Traffic Jam on Lenina | 2 | Red | Enemies can't attack next turn |
| 🐛 Debug Mode | 2 | Green | Random creature +2/+2, Draw 1 |
| 🌬️ Icy Wind | 2 | Blue | Freeze random enemy 2 turns, Draw 1 |
| 🚫 Don't Leave Omsk! | 3 | Black | Return strongest enemy to hand, cost +2 |
| 😊 Omsk Optimism | 3 | White | Heal 6, Draw 1 |
| 🔴 Norminette | 3 | Red | Destroy enemy with attack ≤4 |
| 📝 Exam (Exam Rank) | 3 | Black | Roll D6, both discard D6/2 cards |
| 🔥 Siberian Rage | 3 | Red | 4 dmg to strongest enemy (or hero) |
| 🥶 Frost -50° | 4 | Blue | Freeze ALL enemies 1 turn |
| 💥 Household Gas Explosion | 5 | Red | 3 dmg to ALL creatures |
| ✝️ Divine Light | 5 | White | Heal 8, all your creatures +1/+1 |

### Enchantments (6 cards)

| Name | Cost | Color | Effect |
|------|------|-------|--------|
| 🌷 Landscaping | 2 | Green | Your creatures +0/+2, Start: Heal 1 |
| 🚇 Metro Dream | 3 | Blue | Start of turn: Draw extra card |
| 👻 Spirit of Omsk | 4 | Black | Start enemy turn: they lose 1 HP, your creatures +1 attack |
| 📊 Holy Graph | 4 | Green | When you play creature: Draw 1, Start: +1 mana per Pisiner |
| ❄️ Omsk Winter | 5 | Blue | Enemies enter frozen 1 turn, -1 attack |
| 🌅 Dawn of Victory | 3 | White | Your creatures +1 attack, Death: Heal 2 |

### Lands (5 cards, 4 copies each = 20 total)

| Name | Color | Effect |
|------|-------|--------|
| 🏛️ Prospekt Mira | White | +1 max mana, +1 current mana |
| 🌊 Irtysh Embankment | Blue | +1 max mana, +1 current mana |
| ⬛ Omsk Underground | Black | +1 max mana, +1 current mana |
| 🔥 Omsk Refinery | Red | +1 max mana, +1 current mana |
| 🌳 30 Years Park | Green | +1 max mana, +1 current mana |

---

## 🎯 IMPLEMENTATION CHECKLIST

### Phase 1: Core Engine
- [ ] Define TypeScript types (GameState, CardInstance, PlayerState)
- [ ] Implement deck generation with shuffle logic
- [ ] Implement `createInitialGameState()`
- [ ] Implement `playCard()` (land, creature, spell, enchantment)
- [ ] Implement `endTurn()` (refresh, draw, effects)
- [ ] Implement `attackPlayer()` and `attackCreature()`
- [ ] Implement `checkWinCondition()`

### Phase 2: Keywords & Effects
- [ ] Implement all 10 keywords
- [ ] Implement freeze counter system
- [ ] Implement buff/debuff system (permanent + temporary)
- [ ] Implement ETB (Enter The Battlefield) triggers
- [ ] Implement death triggers
- [ ] Implement start-of-turn triggers
- [ ] Implement spell-on-cast triggers

### Phase 3: AI System
- [ ] Implement card scoring system
- [ ] Implement land play logic
- [ ] Implement creature/spell play logic
- [ ] Implement attack decision tree
- [ ] Implement defender targeting rules
- [ ] Implement AI comment system

### Phase 4: UI Components
- [ ] Build Main Menu (title, buttons, background effects)
- [ ] Build Game Board layout
- [ ] Build HandCard component
- [ ] Build FieldCard component
- [ ] Build PlayerArea (hero panel)
- [ ] Build CardPreview modal
- [ ] Build MessageFeed system
- [ ] Build GameControls (end turn button)

### Phase 5: Visual Effects
- [ ] Implement particle canvas (embers, magic)
- [ ] Implement torch decorations
- [ ] Implement card death dust effect
- [ ] Implement card hover animations
- [ ] Implement attack indicators
- [ ] Implement frozen overlay
- [ ] Implement rarity-based card frames

### Phase 6: Narrative & Lore
- [ ] Implement lore chapter system
- [ ] Implement card collection browser
- [ ] Implement rules screen
- [ ] Implement story intro sequence
- [ ] Implement turn-based story events
- [ ] Implement card-specific narratives
- [ ] Implement death quotes
- [ ] Implement AI lore comments

### Phase 7: Polish & Optimization
- [ ] Implement responsive design (mobile/tablet/desktop)
- [ ] Implement touch controls (drag-and-drop, double-tap)
- [ ] Implement reduced motion mode
- [ ] Implement card image caching system
- [ ] Implement fallback image chain
- [ ] Optimize performance (memoization, virtual scrolling)
- [ ] Add error boundaries
- [ ] Implement message timeout/dismiss system

### Phase 8: Testing & Deployment
- [ ] Write unit tests for engine functions
- [ ] Write combat regression tests
- [ ] Write AI behavior tests
- [ ] Set up CI/CD pipeline
- [ ] Configure GitHub Pages deployment
- [ ] Test on multiple browsers/devices
- [ ] Performance profiling and optimization

---

## 📝 FINAL NOTES

### Design Philosophy
1. **Atmosphere First**: Dark, mystical, uniquely Omsk
2. **Accessible Depth**: Easy to learn, hard to master
3. **Local Flavor**: Every card tells an Omsk story
4. **Fair RNG**: Shuffle mitigates bad draws, skill prevails
5. **Responsive Feel**: Snappy animations, clear feedback

### Key Differentiators
- **Setting**: Not generic fantasy—specific to Omsk, Russia
- **Humor**: Local memes, self-deprecating jokes
- **Lore Integration**: Story woven into every mechanic
- **AI Personality**: Keeper of Omsk has character, not just logic
- **Visual Identity**: Golden runes on dark background, particle effects

### Success Metrics
- ✅ Smooth 60 FPS on mid-range devices
- ✅ AI turn completes in < 3 seconds
- ✅ Clear visual feedback for all actions
- ✅ Intuitive for MTG players, accessible to newcomers
- ✅ Authentic Omsk atmosphere (verified by locals)

---

**«Ты не можешь покинуть Омск. Никто не может.»**

*OMSK: THE GATHERING © MMXXVI*
