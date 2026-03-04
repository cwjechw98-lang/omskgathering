# GAME ARCHITECTURE

## 1. Project Overview

**OMSK: The Gathering** is a browser-based **2-player digital collectible card game** (React SPA) with a local human-vs-human mode and a human-vs-AI mode.

- **Game type**: turn-based card duel
- **Genre**: MTG-inspired CCG / tactical duel
- **Core idea**: play lands and cards, build board presence, attack enemy hero, leverage card keywords and triggered effects
- **Theme/lore**: mystical/urban-fantasy Omsk setting with local memes, factions, and narrative flavor
- **Primary runtime**: React + TypeScript + Vite

Detected sources:
- `README.md`
- `src/game/*`
- `src/data/*`
- `src/components/*`

## 2. Game Rules Summary

### Players
- 2 participants (`player1`, `player2`) in `GameState`.
- In UI:
- `ai` mode: human as `player1`, AI as `player2`
- `local` mode: same device, both sides playable through one UI flow
- `online` mode exists in type signatures (`mode: 'ai' | 'local' | 'online'`) but **not implemented or not detected** in active app flow.

### Turn order
- `createInitialGameState()` starts with `currentTurn = 'player1'`.
- `endTurn()` swaps turn, refreshes resources, applies start-of-turn effects, draws.

### Turn phases
Two phase systems are present:
1. **Engine state enum** in `GameState.phase`: `'main' | 'combat' | 'main2' | 'end'`.
2. **UI-derived phase helper** in `GameBoard`: `'land' -> 'play' -> 'attack' -> 'done'` (based on available actions).

Engine-level explicit phase transitions are **not detected** in current `engine.impl.ts`; phase is mostly a state field + UI derivation.

### Win condition
- Hero health `<= 0` triggers `gameOver` in `checkWinCondition()`.
- Outcomes:
- `player1` wins
- `player2` wins
- draw (both heroes <= 0)

### Core action restrictions
- Cannot act when not your turn.
- Creature cannot attack when:
- summoning sickness
- already attacked this turn
- frozen (`frozen > 0`)
- has `defender`
- Board size limit: 7 creatures per side.
- Hand size limit: 10 cards (overflow burns card to graveyard).
- Land plays per turn: 1 (tracked by `landsPlayed` and `maxLandsPerTurn`).

## 3. Game Board

Board zones per player (`PlayerState`):

| Zone | Field | Meaning |
| --- | --- | --- |
| Hero stats | `health`, `maxHealth`, `mana`, `maxMana` | Hero HP and resource pool |
| Hand | `hand: CardInstance[]` | Cards available to play |
| Battlefield | `field: CardInstance[]` | Active creatures |
| Deck | `deck: CardInstance[]` | Draw pile |
| Graveyard | `graveyard: CardInstance[]` | Discarded/destroyed cards |
| Enchantments | `enchantments: CardInstance[]` | Persistent global effects |

### Placement / rendering
Main board is in `src/components/GameBoard.tsx`:
- Top area: enemy hero + enemy hand + enemy enchantments + enemy field
- Middle controls: attack button / end turn / hints / overlays
- Bottom area: player field + player enchantments + player hero + player hand

### UI components involved
- Core board: `src/components/GameBoard.tsx`
- Hero panel: `src/components/PlayerArea.tsx`
- Card visual blocks (also present as separate files):
- `src/components/game/FieldCard.tsx`
- `src/components/game/HandCard.tsx`
- `src/components/game/CardPreview.tsx`
- `src/components/game/GameControls.tsx`
- `src/components/game/MessageFeed.tsx`
- FX/overlays:
- `src/components/effects/CardDust.tsx`
- `src/components/effects/ParticleCanvas.tsx`
- `src/components/effects/Torch.tsx`

## 4. Card System

### Card types
Defined in `src/data/cards.ts`:
- `creature`
- `spell`
- `enchantment`
- `land`

### Card colors
- `white`, `blue`, `black`, `red`, `green`, `colorless`

### Core card parameters
- `id`, `name`, `cost`, `color`, `type`
- optional combat stats: `attack`, `health`
- text fields: `description`, `flavor`, `emoji`
- optional `keywords`
- `rarity`
- optional `imageUrl`

### TypeScript structures
```ts
export type CardColor = 'white' | 'blue' | 'black' | 'red' | 'green' | 'colorless';
export type CardType = 'creature' | 'spell' | 'enchantment' | 'land';
export type Keyword =
  | 'haste'
  | 'defender'
  | 'flying'
  | 'trample'
  | 'lifelink'
  | 'deathtouch'
  | 'vigilance'
  | 'first_strike'
  | 'hexproof'
  | 'unblockable';

export interface CardData {
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

export interface CardInstance {
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

## 5. Card Database

Primary card DB:
- `src/data/cards.ts`

Local image registry:
- `src/data/localCardImages.ts`

Card image fallback utilities:
- `src/utils/cardImages.ts`

### Example card entry (structure)
```ts
{
  id: 'pisiner_21',
  name: 'Писинер Школы 21',
  cost: 2,
  color: 'blue',
  type: 'creature',
  attack: 1,
  health: 3,
  description: 'При входе — +1 мана. При смерти — потяните карту.',
  flavor: '«Бассейн? Нет, Бассéйн!»',
  emoji: '👨‍💻',
  keywords: [],
  rarity: 'common',
  imageUrl: img('...', 110),
}
```

### Detected card pool stats
Computed from current `ALL_CARDS`:
- **Total cards**: 70
- By type:
- `creature`: 38
- `spell`: 18
- `enchantment`: 8
- `land`: 6

## 6. Combat System

Combat entry points:
- `attackPlayer(...)`
- `attackCreature(...)`

Both implemented in `src/game/engine.impl.ts` and re-exported via `src/game/combat.ts` and `src/game/engine.ts`.

### Attack flow
1. Validate turn and attacker state.
2. Check blockers/rules (`defender`, `flying`, `unblockable`).
3. Compute effective attack/health with buffs/debuffs.
4. Apply damage exchange (with first strike ordering).
5. Resolve keyword effects (`deathtouch`, `trample`, `lifelink`, freeze interactions).
6. Run cleanup (`cleanupDead`) and win check.

### Targeting rules
- If defending side has active `defender` creatures, attacker usually must target them first.
- Ground creature cannot attack `flying` creature.
- `unblockable` can bypass defender-wall restrictions when attacking hero.

### Damage and death
- Damage modifies `currentHealth`.
- Death detected when `currentHealth <= 0`.
- Dead cards move from `field` to `graveyard`.
- Death triggers (examples):
- `zhitel_podzemki` deals hero damage on death
- `pisiner_21` draws on death
- `shaurmaster` heals on death
- `himik_npz` AoE on death

## 7. Game Engine Architecture

### Current architecture style
A modular **facade + implementation** design:

- `src/game/engine.impl.ts`: authoritative game logic (large monolithic implementation)
- `src/game/engine.ts`: stable public API facade
- wrappers:
- `src/game/state.ts`
- `src/game/buffs.ts`
- `src/game/effects.ts`
- `src/game/combat.ts`
- `src/game/turns.ts`

### State management
- Pure-function style transformations (`state -> newState`), using deep clone (`JSON.parse(JSON.stringify(...))`).
- React stores current `GameState` in `GameBoard` (`useState`).

### Event/effect handling model
- Entry effects on creature play: `applyEntryEffects`
- Spell effects: `applySpellEffect`
- Start-of-turn effects: in `endTurn`
- Death effects: in `cleanupDead`

No separate event bus detected; trigger resolution is switch/case-driven in engine logic.

## 8. Turn System

`endTurn(state)` performs:
1. Clear temporary buffs
2. Swap turn owner
3. Increment turn counter
4. Refill mana (`maxMana` plus specific enchant bonuses)
5. Refresh creature attack flags / summoning sickness / freeze decrement
6. Apply global effects (traffic freeze, enchantments, passive heals/damage/discard)
7. Draw card
8. Cleanup dead + win condition check

### Playing cards
`playCard(state, playerKey, cardUid)`:
- validates turn and mana
- land: grants mana and consumes land play slot
- creature: enters field (max 7), may trigger ETB
- spell: resolves immediate effect then to graveyard
- enchantment: moves to enchantment zone

## 9. Deck System

Deck generation in `createDeck()` (`src/data/cards.ts`):
- base pool: all cards except token `chinovnik`
- copy rules:
- mythic: 1 copy
- rare: 2 copies
- other non-land: 2 copies
- lands: 4 copies each

Additional shuffle constraints:
- tries up to 50 shuffles to ensure opening consistency:
- at least 2 lands in first 5 cards
- at least 3 lands in first 8 cards
- fallback swap logic forces lands into opening range if needed

Detected values:
- **Generated deck size**: 145 cards
- Start hand: 5 cards in `createPlayerState()`
- `createInitialGameState()` gives player1 an additional opening draw (effectively 6 for player1 at start)

## 10. Keywords System

Declared keywords:
- `haste`, `defender`, `flying`, `trample`, `lifelink`, `deathtouch`, `vigilance`, `first_strike`, `hexproof`, `unblockable`

### Implemented mechanics summary

| Keyword | Detected behavior |
| --- | --- |
| `haste` | Creature enters without summoning sickness |
| `defender` | Cannot attack; acts as mandatory blocker gate |
| `flying` | Air-targeting restriction in creature combat |
| `trample` | Excess damage can hit defending hero |
| `lifelink` | Attacker/defender heals by actual dealt damage |
| `deathtouch` | Any successful damage can set target to lethal |
| `vigilance` | Present; explicitly not treated as mandatory defender |
| `first_strike` | Early damage step before normal retaliation |
| `hexproof` | Blocks targeted spell effects (in relevant spell checks) |
| `unblockable` | Can bypass defender-gate for hero attacks |

Freeze is not a keyword but a core status mechanic:
- `frozen` counter is stored on card instance
- helper applies `turns + 1` to represent skipped full turns

## 11. Game Balance Signals

This section is inferred from current code data and deck builders.

### Mana curve (ALL_CARDS count by cost)
- 0: 7
- 1: 8
- 2: 16
- 3: 16
- 4: 10
- 5: 7
- 6: 2
- 7: 2
- 8: 1
- 9: 1

Signal: curve is concentrated around 2-4 mana, with few top-end finishers.

### Card economy signals
- Several draw engines (`bird_omsk`, `metro_mechta`, `holy_graph`, `pisiner_21`, spell draw cards)
- Board caps and hand cap prevent runaway board/hand overflow
- Multiple AoE/tempo tools (freeze, board pings, sweeps, forced discard)

### Power scaling signals
- Permanent and temporary buffs coexist (`buff*` and `tempBuff*`)
- Enchantments and certain creatures provide global stat scaling
- Hero pressure through direct damage and trample in late game

## 12. Game Lore

Lore is explicitly implemented in `src/data/lore.ts` and reflected across card names, flavor text, and AI narration.

Theme highlights:
- Omsk as mystical city that “does not let you leave”
- five mana sources mapped to city locations
- factions (Order, underground, industrial, river, park/nature, School 21 coders)
- named AI persona: **Хранитель Омска**

Narrative systems detected:
- world chapters (`WORLD_LORE`)
- intro sequence (`INTRO_SEQUENCE`)
- turn-based story events (`STORY_EVENTS`)
- card narratives and death quotes
- contextual AI lore comments

## 13. File Map

| Path | Purpose |
| --- | --- |
| `src/game/engine.impl.ts` | Main game rules implementation |
| `src/game/engine.ts` | Public game API facade |
| `src/game/types.ts` | Game and card runtime types |
| `src/game/ai.ts` | AI decision and action planner |
| `src/game/{state,buffs,effects,combat,turns}.ts` | Thin modular wrappers/re-exports |
| `src/data/cards.ts` | Card database and deck generation |
| `src/data/localCardImages.ts` | Local card image path mapping |
| `src/data/lore.ts` | Narrative and lore content |
| `src/components/GameBoard.tsx` | Main gameplay UI and interaction orchestration |
| `src/components/MainMenu.tsx` | Menu, collection, lore/rules screens |
| `src/components/PlayerArea.tsx` | Hero panel (hp/mana/zone counters) |
| `src/components/game/*` | Reusable board subcomponents (cards, feed, controls) |
| `src/components/effects/*` | Visual effects/particles/animations |
| `src/utils/cardImages.ts` | Card image source/fallback helpers |
| `public/cards/*` | Cached local card art assets |
| `tests/game/*.test.ts` | Unit tests (engine slices, smoke) |
| `tests/regression/combat-regression.ts` | Extended combat/mechanics regression suite |
| `.github/workflows/quality-gate.yml` | CI quality gate (lint/test/regression/build) |
| `.github/workflows/deploy-pages.yml` | GitHub Pages deployment pipeline |

## 14. Example Game Flow

1. **Game start**
- `createInitialGameState()` builds two randomized decks and hands.
- `player1` starts.

2. **Early turns**
- Player plays a land (`+1 maxMana, +1 mana`, once per turn).
- Player plays a low-cost creature/spell if mana allows.
- ETB/spell effects resolve immediately.

3. **Combat step**
- Player selects own ready attacker.
- If enemy has active defenders, legal target constraints apply.
- Damage resolves, possible retaliation, keyword interactions trigger.

4. **Turn pass**
- `endTurn()` updates resources, statuses, passive effects, and draw.
- In AI mode, `aiTurn()` plays cards and queues attacks automatically.

5. **Endgame**
- Repeated pressure/buffs/removal reduces hero HP.
- `checkWinCondition()` sets winner when hero HP <= 0.

## 15. Important Mechanics

Notable project-specific mechanics and patterns:

1. **Defender gate model**
- Defender creatures enforce targeting rules before face attacks.

2. **Freeze counter model (`turns + 1`)**
- Encodes skipped turns with deterministic decrement in `endTurn()`.

3. **Large trigger matrix in engine**
- ETB, spell, turn-start, death, and attack hooks resolved centrally.

4. **Lore-integrated UX**
- Gameplay messages and AI comments are tied to card/lore events.

5. **Deck opening stabilizer**
- Guaranteed land-distribution logic in initial shuffle process.

6. **GitHub Pages-ready base path**
- Vite config uses `base: "/omskgathering/"` for repo deployment.

---

## Notes on Undetected/Partial Systems

- Online multiplayer runtime flow: **Not implemented or not detected** in active app entry (`App.tsx` routes only `ai` and `local`).
- Distinct engine phase progression (`main/combat/main2/end`) as strict FSM: **Not fully detected** in current engine implementation.
