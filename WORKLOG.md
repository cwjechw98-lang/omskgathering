# WORKLOG

## Session Log

### 2026-03-04 — UI/UX Audit & Refactoring Day

**UI/UX Audit:**
- Captured 10 screenshots across desktop/tablet/mobile viewports
- Created comprehensive UI_UX_AUDIT_2026-03-04.md with 15 issues (P0-P3 priority)
- Identified critical accessibility issues: low contrast (1.5:1), small touch targets (6px), mobile text illegibility (5px)

**shadcn/ui Refactoring:**
- Installed 8 shadcn/ui components: card, progress, badge, tooltip, tabs, scroll-area, separator, alert
- Refactored PlayerArea → Card + Progress + Badge + Tooltip with ARIA labels
- Refactored FieldCard → Card + Badge + Tooltip with keyboard navigation
- Refactored HandCard → Card + Badge preserving drag-and-drop
- Added custom badge variants: mana-available, mana-spent, keyword, rarity
- Added progress variants: success (green), warning (yellow), danger (red + pulse)
- Wrapped App with TooltipProvider

**Visual Effects Added:**
- Holographic foil overlay for mythic/rare cards
- Damage number popups during combat
- Targeting line SVG for attack selection
- Low health warning vignette (≤10 HP)
- Button ripple click effect
- Turn transition banner
- Keyword tooltips on hover

**Mobile Responsiveness Fixes:**
- Fixed MainMenu button overlap - added flex-shrink-0, truncate, adaptive sizing
- Fixed GameBoard action button overlap - moved below enemy PlayerArea
- Removed duplicate "Конец хода" buttons from center field
- Hide torch effects on mobile (hidden sm:block)
- Reduced rune/logo sizes for mobile screens

**mod.md Stages Completed:**
- Stage 1: UI Analysis (UI_REFACTOR_PLAN.md)
- Stage 2: Card Architecture (CardSlot/CardContainer/CardVisual)
- Stage 3: Z-index System (centralized z-layers)
- Stage 4: Board Slots (7 slots per side with CSS grid)

**Stage 4 Details:**
- Implemented 7-slot board layout using CSS grid
- Added `.board-slots` with `grid-template-columns: repeat(7, 1fr)`
- Added `.board-slot` placeholder with dashed border and 🏔️ icon
- Slots auto-hide placeholder when card is present
- Responsive gap sizing for mobile
- Both enemy and player fields use slot system

**Quality Gates Stage 4:**
- ✅ npm run lint: PASS (5 warnings, 0 errors)
- ✅ npm run build: PASS (494 KB JS, 100 KB CSS)
- ✅ npm run test: PASS (9/9 tests)
- ✅ npm run test:regression: PASS (51/51 tests)

**Stage 5: Attack Lanes** ✅
- Added CSS classes for lane highlighting: `.is-attacking`, `.is-target`, `.is-valid-target`
- Added pulse animations for attacking and target slots
- Slot glows orange when creature attacks from it
- Enemy slot shows green dashed border when valid target
- Added `selectedAttackerSlot` state to track which slot is attacking
- Visual feedback only (no mechanic changes)

**Quality Gates Stage 5:**
- ✅ npm run lint: PASS (5 warnings, 0 errors)
- ✅ npm run build: PASS (494 KB JS, 101 KB CSS)
- ✅ npm run test: PASS (14/14 tests)
- ✅ npm run test:regression: PASS (51/51 tests)

**Stage 6: Arc Hand Layout** ✅
- Implemented curved card arrangement for hand
- CSS classes: `.hand-container`, `.hand-cards-arc`, `.hand-card-in-arc`
- Arc rotations: -8° to +10° based on card position
- Hover: card lifts up (-30px), scales (1.15x), derotates (0deg)
- Drag: card maintains hover state with `.is-dragging` class
- Mobile: reduced arc intensity (-5° to +6°)
- Preserves all existing interactions (click, drag, double-click)

**Quality Gates Stage 6:**
- ✅ npm run lint: PASS (5 warnings, 0 errors)
- ✅ npm run build: PASS (494 KB JS, 103 KB CSS)
- ✅ npm run test: PASS (14/14 tests)
- ✅ npm run test:regression: PASS (51/51 tests)

**Stage 7: Modal Overlay for Choose/Discover** ✅
- Created `src/components/ui/modal-overlay.tsx` component
- Features:
  - Dark background with backdrop blur (rgba(0,0,0,0.7) + blur(4px))
  - Blocks interaction with game board (pointer-events)
  - Click outside to close (configurable)
  - ESC key to close
  - Prevents body scroll when open
  - Accessible: role="dialog", aria-modal="true"
- CSS in index.css:
  - `.modal-overlay` — full screen overlay with fade-in
  - `.modal-overlay-content` — centered content box with gold border
  - `.modal-overlay-close` — close button (✕) with hover effect
  - Animations: overlayFadeIn, modalSlideIn
- Ready for integration with choose/discover/look-top modes

**Quality Gates Stage 7:**
- ✅ npm run lint: PASS (5 warnings, 0 errors)
- ✅ npm run build: PASS (494 KB JS, 104 KB CSS)
- ✅ npm run test: PASS (14/14 tests)
- ✅ npm run test:regression: PASS (51/51 tests)

**Stage 8: Verify effects_info.md** ✅
- Reviewed effects_info.md for accuracy
- Verified z-index system:
  - All effects use correct z-layer classes
  - Fixed bug: `z-index: z-index(board)` → `var(--z-board)`
- Confirmed effects don't break layout:
  - Card animations: z-layer-card-effects (40)
  - Combat effects: z-layer-combat-effects (50)
  - Overlays: z-layer-overlay (80)
  - Hover states: z-layer-hover (70)
- No new effects added (per mod.md requirement)
- All existing effects documented and working

**Quality Gates Stage 8:**
- ✅ npm run lint: PASS (5 warnings, 0 errors)
- ✅ npm run build: PASS (494 KB JS, 104 KB CSS)
- ✅ npm run test: PASS (14/14 tests)
- ✅ npm run test:regression: PASS (51/51 tests)

**Stage 9: UX Improvements** ✅
- Button "Конец хода" already centered (moved in Stage 4)
- Double-click to play cards: already supported via `if (selectedHand === uid)`
- Drag interactions improved:
  - Added `is-dragging` class to hand cards during drag
  - Card maintains hover state while dragging (CSS: `.is-dragging`)
  - Drag preview shows full card during drag operation
- All existing effects preserved:
  - ✅ Holographic foil (mythic/rare)
  - ✅ Low HP vignette (≤10 HP)
  - ✅ Mana particles
  - ✅ Targeting line
  - ✅ Attack lane highlights
  - ✅ Arc hand layout
  - ✅ Modal overlay ready for choose/discover

**Quality Gates Stage 9:**
- ✅ npm run lint: PASS (5 warnings, 0 errors)
- ✅ npm run build: PASS (494 KB JS, 104 KB CSS)
- ✅ npm run test: PASS (14/14 tests)
- ✅ npm run test:regression: PASS (51/51 tests)

**All mod.md Stages Complete:**
- ✅ Stage 1: UI Analysis
- ✅ Stage 2: Card Architecture
- ✅ Stage 3: Z-index System
- ✅ Stage 4: Board Slots (7 slots)
- ✅ Stage 5: Attack Lanes (visual highlight)
- ✅ Stage 6: Arc Hand Layout
- ✅ Stage 7: Modal Overlay
- ✅ Stage 8: Verify effects_info.md
- ✅ Stage 9: UX Improvements

**testmod.md: Property-Based Testing** ✅
- Installed fast-check@4.5.3
- Created tests/property/engine.invariants.property.test.ts
- Implemented 5 property tests (500 runs each):
  1. HP существ никогда не может быть меньше 0
  2. Существа с HP = 0 должны удаляться с поля
  3. Существо не может атаковать более одного раза за ход
  4. Размер колоды не может быть отрицательным
  5. Mana игрока не может быть отрицательной
- Uses fast-check for random data generation:
  - Random creatures with attack/health/keywords
  - Random keyword combinations
  - Random action sequences
- All tests pass: 5/5 property tests + 14 total tests
- Does not modify existing unit/regression tests

---

### 2026-02-26
- `1f1a61b` Update WORKLOG.md with 2026-03-04 session summary
- `a662122` Add effects_info.md — documentation of all visual effects

---

### 2026-02-26
- Added session memory protocol to BRIEF.md (memory_tail on start, memory_append + WORKLOG on end)
- MCP memory server validated in VS Code (memory_append success)

### 2026-02-25
- Setup MCP memory server files in C:\MCP GPT CODE\mcp_memory
- Added VS Code MCP config at .vscode\mcp.json
- Installed skills: develop-web-game, doc, security-best-practices, screenshot, playwright

## Open Questions
- 

### 2026-02-26
- Verified MCP memory SQLite write/read (id=2).
- Added manual memory entry from Codex for project context.


### 2026-02-26
- Fixed combat: frozen defenders no longer retaliate; hit breaks freeze; lifelink heals actual damage; deathtouch sets HP to 0.
- Balance tweaks: Segfault odds, Moroz -50 cost, Vzryv gaza damage, Bozhestvenniy Svet heal, Drakon Irtysha cost.


### 2026-02-26
- Tuned hand card hover to scale 1.2 and adjusted damage flash timing to 0.1s per animation guidelines.
- Removed conflicting hover transforms from HandCard to rely on card-in-hand timings.


### 2026-02-26
- Added field card hover timings and attack/damage animations (player attacks) via card-attack-animation and card-damage-animation.


### 2026-02-26
- AI now returns attack actions; GameBoard plays attack/damage animations for AI sequentially.


### 2026-02-26
- Added combat regression suite (`npm run test:regression`) and expanded coverage to 9 tests (freeze durations, AI defender behavior, Student ETB, Sneg trigger condition).
- Synced mechanics with card text in engine: freeze-turn semantics, Blackhole behavior, Student OmGTU ETB, Sneg Elemental trigger condition.
- Applied small safe balance batch: Mer cost 8, Cluster ETB freeze target 1, Pivo cost 2, Probka cost 3, Bozhestvenniy Svet heal 4.
- Added GitHub Pages workflow for deploy-on-main via Actions (`.github/workflows/deploy-pages.yml`).
- Reduced main menu render load: lighter/adaptive particle settings, disabled particle pointer interaction by default, DPR cap in ParticleCanvas.

### 2026-02-26
- Switched card-cover download pipeline to authenticated Pollinations endpoint (`gen.pollinations.ai/image`) and added resume support to `scripts/cache-card-images.mjs`.
- Cached local card art successfully: `public/cards` now contains 60 card covers + 1 card back image.
- Wired local art resolver into UI (`MainMenu` and `GameBoard`) with fallback chain local -> external -> emoji.
- Verified visual rendering via Playwright (`output/visual-covers`): collection and game board screenshots show loaded local covers and loaded card backs, no console/page errors.
- Post-change checks passed: `npm run build` and `npm run test:regression` (9/9).

### 2026-02-26
- Added secret-safety defaults for image pipeline: `.env*` ignored in git and `.env.example` added.
- `scripts/cache-card-images.mjs` now reads `.env` automatically (if present), so API key does not need to be passed inline in commands.

### 2026-02-26
- Ran Keeper-mode verification cycle (engine + UI).
- Stress-tested engine vs Keeper in batch simulations with no crashes/timeouts; Keeper attack actions observed for both hero and creature targets.
- Added mechanics matrix audit (`output/keeper-audit/mechanics-matrix-report.json`): all 60 cards are playable through engine APIs; core keyword checks pass.
- Fixed engine authority gap: `defender` can no longer attack when calling `attackPlayer/attackCreature` directly (`src/game/engine.ts`).
- Re-ran regression suite after fix: `npm run test:regression` 9/9 PASS.
- Captured post-fix Keeper UI smoke (`output/keeper-audit/ui-keeper-report-post-fix.json`, `05-after-defender-fix-keeper.png`) with no console/page errors.

### 2026-02-25
- Fixed GitHub Pages white-screen root cause by setting dynamic Vite `base` for Actions builds (`vite.config.ts`: `/${repo}/` when `GITHUB_ACTIONS=true`).
- Expanded regression suite from 9 to 15 tests (`tests/regression/combat-regression.ts`): first strike, trample excess, unblockable-through-defender, defender API hard-stop, vigilance semantics, flying restrictions.
- Polished Keeper UX/adaptive board (`src/components/GameBoard.tsx`, `src/index.css`): compact UI mode for mobile/coarse pointer, safer card sizing, touch hover suppression, safer log/message behavior.
- Fixed rules/keyword wording drift for vigilance in menu/rules text (`src/components/MainMenu.tsx`) to match engine behavior.
- Verification complete: `npm run test:regression` 15/15 PASS, `npm run build` PASS (including `GITHUB_ACTIONS=true` build), Playwright smoke artifacts with no console/page errors in `output/keeper-audit/ui-responsive-post-fix`.

### 2026-02-27
- Reviewed balance audit (`BALANCE_AUDIT_2026-02-26.md`): all 5 suggested balance patches already applied in code (mer_omska cost 8, cluster_lord freeze 1 target, pivo_sibirskoe cost 2, probka_lenina cost 3, bozhestvenniy_svet heal 4).
- UX-polish Keeper mode: added turn transition overlay ("ХОД ХРАНИТЕЛЯ") with smooth animation when player turn ends.
- Added AI action status indicators in Keeper UI: shows attack/action messages ("⚔️ [card] атакует!", "✨ Сыграно: [card]") directly in AI thinking overlay.
- Enhanced AI thinking overlay with pulsing avatar, clearer status text, and improved transitions.


### 2026-03-04
- Restored quality gate stack: installed Vitest + RTL deps, added unit/smoke tests (tests/game/engine.turns.test.ts, tests/game/engine.combat.test.ts, tests/components/GameBoard.smoke.test.tsx), and stabilized Vitest via happy-dom.
- Fixed strict ESLint blockers without downgrading rules (main.tsx, GameBoard.tsx, MainMenu.tsx, StoryIntro.tsx, CardDust.tsx, src/components/game/MessageFeed.tsx, src/game/engine.impl.ts).
- Refactored game engine into modular facade: kept implementation in src/game/engine.impl.ts, added combat.ts, turns.ts, effects.ts, and made src/game/engine.ts a stable barrel export.
- Added CI quality workflow .github/workflows/quality-gate.yml and pinned deploy workflow node to 22.12.0.
- Ran smoke E2E and saved artifacts under output/keeper-audit/ui-post-fix-playwright/ including ui-smoke-report.json with consoleErrors=[] and pageErrors=[].

### 2026-03-04
- Session handoff log: quality-gate recovery cycle completed.
- Added/validated testing stack (Vitest + RTL + happy-dom), new unit/smoke tests, and kept strict ESLint policy without rule downgrades.
- Implemented engine modular facade (`engine.ts` re-exports) with `engine.impl.ts` preservation and wrapper modules (`combat.ts`, `turns.ts`, `effects.ts`).
- Added CI workflow `.github/workflows/quality-gate.yml` and pinned deploy workflow Node to `22.12.0`.
- Refreshed E2E smoke artifacts at `output/keeper-audit/ui-post-fix-playwright/` with zero console/page errors.
- Local verification status: lint (0 errors), unit tests pass, regression pass (37/37), build pass (Node version warning remains locally).

### 2026-03-04
- Hotfix: resolved Babka combat inconsistency.
- Root cause: `babka_semechki` had `defender`, so attack API correctly rejected attacks even after attack buffs.
- Fix: removed `defender` from Babka card definition and updated card text accordingly.
- Added regression coverage in `tests/regression/combat-regression.ts`:
  - `Babka can attack when buffed`
  - `Babka retaliates when buffed`
- Verification: `npm run test:regression` 39/39 PASS, `npm run test` PASS, `npm run lint` no errors.

### 2026-03-04
- Reviewed latest upstream commit `d804b12` (visual effects/UI polish) before verification as requested.
- Investigated reported Keeper combat inconsistency using battle log examples and engine paths (`attackCreature`, AI attack flow).
- Conclusion: `0⚔` retaliation in provided log is expected when defender is frozen (`defenderFrozen => defDamage = 0`), followed by thaw on hit.
- Added explicit bidirectional regressions for Keeper-origin attacks in `tests/regression/combat-regression.ts`:
  - Keeper attack gets retaliation when defender is not frozen.
  - Keeper attack gets no retaliation when defender is frozen.
- Also fixed two strict lint blockers introduced after last commit (`src/components/GameBoard.tsx` non-null assertions).
- Verification after changes: `npm run test:regression` 41/41 PASS, `npm run lint` 0 errors (warnings only).

### 2026-03-04
- Log update requested by user.
- Latest verified changes were committed as `baeafab` (keeper combat symmetry verification, new regressions, GameBoard lint fix).
- Remote status at push check: repository reported up-to-date.

### 2026-03-04
- Switched card-art generation workflow to Pollinations API as requested.
- Generated 10 new lore card arts to `output/new-card-set-2026-03-04/source_raw/` via `gen.pollinations.ai` using project-style prompts.
- Normalized all 10 outputs to game runtime format (`400x300` JPG) in `output/new-card-set-2026-03-04/final_400x300/` with `scripts/normalize-card-art.py`.
- Produced final stats file: `output/new-card-set-2026-03-04/final_stats.csv` (all images are 400x300; avg size ~24.3KB).

### 2026-03-04
- Reviewed latest card-refactor commits before integration check:
  - `00d0404` (PlayerArea + shadcn/ui primitives),
  - `49f184b` (FieldCard/HandCard migration in GameBoard).
- Revalidated project structure: `src/components/game/*` and `src/components/ui/*` are present and wired.
- Found and fixed post-refactor test regression:
  - `tests/components/GameBoard.smoke.test.tsx` failed with `Tooltip must be used within TooltipProvider`.
  - Added `TooltipProvider` wrapper to smoke test render helper.
- Verification after fix:
  - `npm run lint`: 0 errors (5 existing warnings),
  - `npm run test`: PASS,
  - `npm run test:regression`: 41/41 PASS,
  - `npm run build`: PASS (local Node warning 20.18.1 < 20.19).

### 2026-03-04
- Ran explicit matrix audit for the 10 generated Pollinations cards from `output/new-card-set-2026-03-04/new_cards_concepts.json`.
- Added reusable script: `scripts/audit-new-cards-matrix.mjs` and npm command `npm run audit:new-cards`.
- Matrix artifacts written to:
  - `output/keeper-audit/new-cards-matrix/new-cards-matrix.md`
  - `output/keeper-audit/new-cards-matrix/new-cards-matrix.json`
- Result: integration status is `0/10 ready` for new cards:
  - not present in `src/data/cards.ts`,
  - not mapped in `src/data/localCardImages.ts`,
  - not present in `public/cards`,
  - no engine/AI/regression coverage yet for those IDs.
- Baseline game checks after audit remain green:
  - `npm run test`: PASS,
  - `npm run test:regression`: 41/41 PASS.

### 2026-03-04
- Integrated 10 generated cards into runtime catalog and mechanics end-to-end:
  - Added cards to `src/data/cards.ts` (creatures/spells/enchantments/land).
  - Added local cover mappings in `src/data/localCardImages.ts`.
  - Copied generated assets from `output/new-card-set-2026-03-04/final_400x300/` into `public/cards/`.
- Implemented engine mechanics in `src/game/engine.impl.ts`:
  - ETB: `khroniker_irtysha`, `shaman_lukash`.
  - Attack trigger: `kontroler_tramvaya` temporary `-1 atk` on defender.
  - Death trigger: `himik_npz` AoE 1.
  - Spells: `tuman_nad_irtyshom`, `svodka_112`.
  - Enchantments/turn-start: `klyatva_metrostroya`, `golos_telebashni`.
  - Land special: `ploshchad_buhgoltsa` heal on third land.
  - Added arkhivar spell-cast draw hook and synchronized temp-buff cleanup across both sides at turn transition.
- Updated AI support in `src/game/ai.ts` for new cards (comments + scoring + land preference hook).
- Expanded regression matrix in `tests/regression/combat-regression.ts` with 10 new tests (one per new card mechanic).
- Validation after integration:
  - `npm run audit:new-cards` -> `Ready-to-run cards: 10/10`.
  - `npm run test:regression` -> `51/51` PASS.
  - `npm run test` -> PASS.
  - `npm run lint` -> 0 errors (5 existing warnings).
  - `npm run build` -> PASS (local Node warning 20.18.1 remains).

### 2026-03-05
- UI stabilization (mod.md) — Stage 1 complete.
- Created `UI_REFACTOR_PLAN.md` with full audit of current UI architecture:
  - component structure and rendering paths,
  - absolute/fixed positioning map,
  - responsibility map (board/cards/hand/hero/buttons/overlays/effects),
  - safe-to-change UI zones vs engine-coupled zones.
- No code changes in this stage (analysis only), as required by stage constraints.

### 2026-03-05
- UI stabilization (mod.md) — Stage 2 complete.
- Refactored active card rendering in `src/components/GameBoard.tsx` to unified structure:
  - `CardSlot` (fixed slot size / position wrapper),
  - `CardContainer` (hover/drag/scale layer),
  - `CardVisual` (visual content layer with `overflow: hidden`).
- Applied structure to both field and hand cards in live board component.
- Ensured scaling/hover transforms are handled by `CardContainer`; visual clipping stays in `CardVisual`.
- Validation:
  - `npm run lint` -> 0 errors (warnings only),
  - `npm run test` -> PASS,
  - `npm run test:regression` -> 51/51 PASS,
  - `npm run build` -> PASS (local Node warning unchanged).

### 2026-03-05
- UI stabilization (mod.md) — Stage 3 complete.
- Finalized centralized z-layer usage on game board/effects:
  - wired `z-layer-*` classes in active GameBoard overlays/effects,
  - removed remaining hardcoded `zIndex` from damage popup render,
  - normalized CSS effect layers to design tokens (`--z-card-effects`, `--z-combat-effects`, `--z-overlay`, `--z-hover`).
- Verified layering rules:
  - hover cards rise without layout break,
  - combat/effect layers stay below UI,
  - overlays remain on top.
- Validation:
  - `npm run lint` -> 0 errors (warnings only),
  - `npm run test` -> PASS,
  - `npm run test:regression` -> 51/51 PASS,
  - `npm run build` -> PASS (local Node warning unchanged).
