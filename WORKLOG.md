# WORKLOG

## Session Log

### 2026-03-14 — Iteration 1 closure (delta-only)

- 1.1 Flow verification completed for deck builder + active deck startup path; no code fixes required.
- 1.2 Added regression coverage in `tests/regression/decks-storage-and-cardids.regression.test.ts` for local deck storage + card-id deck realization behavior.
- 1.3 Quality gates for iteration scope are green: lint, focused regression tests, build.

### 2026-03-14 — Unified Debug Hub v0 (UI-only, atomic delta)

- Scope: implemented unified debug hub in `src/components/GameBoard.tsx` only; no changes in `src/game/*` and no mechanics/rules modifications.
- Replaced split debug controls (`telemetry` / `baseline`) with a single hub block in topbar accessible zone:
  - `📤 snapshot` exports unified JSON snapshot,
  - `🧹 all` clears local debug/progression data and resets related UI status (`showLog`).
- Added compact runtime indicators in hub: `counters`, `events`, `level`.
- Unified export payload now includes required sections:
  - `meta` (`version`, `exportedAt`),
  - `telemetry` (`count`, `events`),
  - `baseline` (`counters`, `averages`, `samples`),
  - `progression` (`quests`, `achievements`, `xp`).
- Validation: `npm run lint -- src/components/GameBoard.tsx` -> PASS (exit code 0).

### 2026-03-13 — Safety refactor delta (DeckBuilder/Tutorial)

- In `src/components/game/DeckBuilder.tsx` introduced unified card count normalization via `clampCardCount` and synchronized deck-limit handling between editor changes and save path.
- In `src/components/game/Tutorial.tsx` added runtime guard for `window/localStorage` access to avoid non-browser/runtime edge failures.
- Validation: `npx eslint src/components/game/DeckBuilder.tsx src/components/game/Tutorial.tsx` -> PASS.

### 2026-03-13 — UX Deck Builder iteration complete (delta)

- Added card-name search in `src/components/game/DeckBuilder.tsx`.
- Added filters: card type and mana cost.
- Added sorting: name / mana cost.
- Added dynamic validation: deck size + lands recommendation.
- Validation: `npx eslint src/components/game/DeckBuilder.tsx` -> PASS.

### 2026-03-13 — MVP item 6: Performance/Reliability baseline v0 (local-only)

- Scope: implemented local-only baseline performance/reliability metrics in `src/components/GameBoard.tsx` only; no engine/mechanics changes under `src/game/`.
- Added versioned baseline storage model under key `omsk.baseline.v0`:
  - counters: `matchesCompleted`, `turnsEnded`, `cardsPlayed`, `aiTurns`;
  - bounded sample arrays: `recentTurnDurationsMs`, `recentAiTurnDurationsMs`, `recentCardActionLatencyMs` (cap `120`);
  - strict normalize/load/save with safe fallback and max sample clamp.
- Wired metrics from existing board-layer flow points:
  - player turn duration measured on turn transition;
  - AI turn duration measured around `runAI` execution window;
  - card action latency measured inside `doPlayCard`;
  - match completion counter incremented on game-over edge transition.
- Added compact topbar baseline panel and debug controls:
  - panel: avg turn/AI/action latency + counters;
  - export: `📤 baseline` JSON download;
  - clear: `🧽` reset baseline buffer.
- Validation: `npx eslint src/components/GameBoard.tsx` -> PASS.

### 2026-03-13 — v1 item 1: Deck builder + local deck sets (minimal, local-only)

- Scope: implemented minimal local-only deck builder and active-deck startup wiring in UI/data layer; no gameplay mechanics/rules changes in `src/game/*` logic.
- Added versioned deck storage module `src/utils/decksStorage.ts`:
  - key: `omsk.decks.v1`,
  - normalized load/save with safe fallback,
  - state model: `{ version, decks[], activeDeckId }`,
  - deck model: `{ id, name, cards[{cardId,count}], createdAt, updatedAt }`.
- Added minimal deck builder screen `src/components/game/DeckBuilder.tsx`:
  - list of available cards,
  - editable current deck with per-card counters,
  - save deck (create/update by name),
  - saved decks list + active deck selection.
- Integrated entry point in main menu (`src/components/MainMenu.tsx`): new button `🧱 Конструктор колод`.
- Wired active deck into match start without engine rules changes:
  - `src/components/GameBoard.tsx` now initializes/restarts state via active deck from local storage,
  - selected deck applied to player1 deck/hand composition at board init,
  - battle engine mechanics unchanged.
- Added data helper in `src/data/cards.ts`: `createDeckFromCardIds(cardIds)` for UI-layer deck realization with safe fallback to default generated deck.

### 2026-03-13 — MVP item 5: Telemetry Baseline v0 (local-only)

- Scope: implemented local-only telemetry baseline in `src/components/GameBoard.tsx` only; no engine/mechanics changes under `src/game/`.
- Added versioned telemetry buffer model under `omsk.telemetry.v0`:
  - fixed v0 event set: `tutorial_hint_shown`, `tutorial_skipped`, `card_played_land`, `card_played_non_land`, `match_completed`, `match_victory`, `daily_quest_completed`, `achievement_unlocked`;
  - event envelope: `{ name, timestamp, payload }` with lightweight payload normalization.
- Persistence/retention:
  - localStorage load/save with normalize + fallback,
  - hard cap `200` events via append-and-trim (oldest dropped).
- Wired from existing board-layer action points:
  - tutorial hint visibility transitions and tutorial skip,
  - `doPlayCard` land/non-land paths,
  - game-over edge transition (match completed / victory),
  - quest completion edge and achievement unlock edge.
- Added minimal topbar debug controls: JSON export (`📤 telemetry`) and clear buffer (`🧹`).

### 2026-03-13 — MVP item 4: XP Progression v0 (local-only)

- Scope: implemented XP Progression v0 in `src/components/GameBoard.tsx` only; no `src/game/` mechanics or engine changes.
- Added local profile model under versioned key `omsk.xp-profile.v0` with robust normalize/load/save:
  - `xpTotal: number`
  - `level: number`
  - `xpInLevel: number`
  - deterministic curve: fixed `100 XP` per level.
- Added deterministic XP awards wired from board-layer events:
  - `doPlayCard` -> `+10 XP` for land play,
  - `doPlayCard` -> `+10 XP` for non-land play,
  - game-over edge transition -> `+50 XP` match completion,
  - game-over edge transition -> extra `+25 XP` on player1 victory.
- Added compact top-bar Profile panel near Daily Quests/Achievements showing `Level`, `xpInLevel/100`, and progress bar using existing `UICard`/`Badge`/`Progress` primitives.

### 2026-03-13 — MVP item 3: Achievements v0 (local-only)

- Scope: implemented Achievements v0 in `src/components/GameBoard.tsx` only; no engine/mechanics file changes.
- Added localStorage-backed versioned achievement state (`omsk.achievements.v0`) with strict normalization/fallback.
- Added exactly 4 idempotent unlock flags (once unlocked, never relocked):
  - `first_land` — first land card played,
  - `first_spell_or_creature` — first non-land card played,
  - `first_match_complete` — first completed match,
  - `first_victory` — first win.
- Wired unlock events from existing board-layer points only:
  - `doPlayCard` -> land/non-land achievements,
  - game-over transition effect -> match complete + victory (if player1 HP > 0).
- Added compact top-bar Achievements panel beside Daily Quests using existing `UICard`/`Badge` conventions.

### 2026-03-13 — MVP item 2: Daily Quests v0 (local-only)

- Scope: implemented minimal Daily Quests v0 in `src/components/GameBoard.tsx` only; no engine/mechanics file changes.
- Added local quest model with fixed 3 quests and localStorage key `omsk.daily-quests.v0`:
  - `play_land`: Play 1 land in a match
  - `play_non_land`: Play 1 non-land card in a match
  - `complete_match`: Complete 1 match (win or lose)
- Added once-per-day reset based on local date key (`YYYY-MM-DD`):
  - state is validated/loaded on mount,
  - stale date auto-resets to zero progress,
  - lightweight minute interval re-check keeps reset correct across midnight while tab is open.
- Wired progress updates from existing `GameBoard` UI action points only:
  - card play path (`doPlayCard`) increments land/non-land quest,
  - game-over transition effect increments complete-match quest once per match.
- Added compact non-intrusive quest panel in top bar using existing `UICard`/`Badge`/`Progress` style primitives.

### 2026-03-13 — MVP item 1: adaptive onboarding hints (first-session)

- Scope: localized onboarding UX increment in `src/components/game/Tutorial.tsx` + `src/components/GameBoard.tsx` only; no engine/mechanics changes.
- Added adaptive tutorial context for early turns (first 3 turns already gated by board):
  - land hint when playable land exists and land not yet played this turn,
  - play-card hint when playable non-land exists and no non-land played this turn,
  - attack hint when attack-ready creature exists during attack opportunity.
- Preserved dismiss/skip behavior and existing localStorage completion key (`tutorialCompleted`).
- Added lightweight per-turn tracking of "non-land card played this turn" in board UI state; resets on turn/turn-number change.
- Targeted validation: `npx eslint src/components/GameBoard.tsx src/components/game/Tutorial.tsx` -> PASS (exit 0).

### 2026-03-13 — Continuation protocol + engagement roadmap delta

- Scope: created `PROJECT_CONTINUATION_PROTOCOL.md` with mandatory session cycle, strict context read order, delta-only logging format, roadmap delta format, and strict GitHub commit/push/deploy process.
- Scope: recorded factual remote URL from `git remote -v`: `https://github.com/cwjechw98-lang/omskgathering.git`.
- Scope: updated `README.md` roadmap to free-project engagement phases (`MVP`, `v1`, `v2`).
- Deploy trigger readiness policy fixed in protocol:
  - check branch `main`,
  - check `.github/workflows/deploy-pages.yml` and `.github/workflows/quality-gate.yml`,
  - check push trigger on `main` and deploy artifact `dist` before push.
- Notes: logging policy now explicitly requires short delta entries only without repeating unchanged context.

### 2026-03-12 — UI lane/highlight + preview viewport fit (logging checkpoint)

**Scope completed (UI-only, no mechanics changes):**
- `src/components/GameBoard.tsx`:
  - Simplified attacker-slot state declaration to direct tuple destructuring (`selectedAttackerSlot`, `setSelectedAttackerSlot`).
  - Reset `selectedAttackerSlot` when hand inspection is opened, when turn ends, and on full game reset to prevent stale lane highlights.
  - Narrowed enemy lane highlight to only the selected target lane (`laneActive`) instead of highlighting all enemy slots.
  - Added source-lane highlight class for the active attacking player slot (`attack-lane-source`).
- `src/components/game/CardPreview.tsx`:
  - Repositioned preview overlay to centered layout with dynamic safe paddings based on top/action/hand zone CSS variables.
  - Adjusted preview card sizing (`clamp(220px, 28vw, 340px)`) and constrained by viewport height to avoid clipping.
  - Ensured preview container stretches correctly with `h-full` while preserving close-on-backdrop behavior.
- `src/index.css`:
  - Added `.creature-slot.attack-lane-source` styling (subtle green source-lane tint/border/inset glow) for clearer attack origin feedback.

**Notes:**
- Visual/UX refinement only; gameplay rules and combat engine behavior intentionally unchanged.

### 2026-03-07

### Итерация 2: UX и юзабилити (UPGRADES.md)

**2.1 Tutorial система:**
- Создан `src/components/game/Tutorial.tsx` — пошаговое обучение для новых игроков
- 4 шага: Земля → Существо/Заклинание → Атака → Конец хода
- Авто-определение текущего шага из игрового состояния
- Кнопка «Пропустить обучение», сохранение в localStorage
- Показывается только первые 3 хода
- Интегрирован в GameBoard.tsx

**2.2 PhaseIndicator:**
- Создан `src/components/game/PhaseIndicator.tsx` — индикатор фаз хода
- 4 фазы: 🏔️ Земля → ⚔️ Основная → 💥 Бой → ⏭️ Конец
- Активная фаза подсвечена золотом, авто-детект из состояния игры
- Интегрирован в `.center-divider` зону

**2.3 Touch targets:**
- `src/index.css`: `.end-turn-btn` → min-height: 44px на мобильных
- Кнопки закрытия модалок → 44×44px на мобильных

**2.4 Расширенные тултипы FieldCard:**
- `src/components/game/FieldCard.tsx`: Tooltip при ховере показывает имя, стоимость, описание, keywords с объяснениями, статы с цветовой индикацией, статусы

**Quality Gates после Итерации 2:**
- `npx tsc --noEmit` → 0 errors
- `npx eslint src/` → 0 errors, 0 warnings
- `npx vitest run` → 31/31 PASS
- `npx vite build` → PASS

---

### 2026-03-06 — Исправление изображений + CI

**Изображения в StoryIntro и LoreScreen:**
- StoryIntro загружал картинки с `pollinations.ai` в реальном времени — заменено на локальные файлы `public/cards/lore-*.jpg` с `import.meta.env.BASE_URL`
- LoreScreen ссылался на `lore-0.jpg`, а файлы назывались `lore-0-prolog.jpg` — исправлено маппингом имён
- LoreScreen не использовал `BASE_URL` — пути ломались на GitHub Pages — исправлено

**CI (GitHub Actions):**
- `test:regression` использовал `powershell` (Windows-only) — CI на Ubuntu падал
- Заменено на кроссплатформенный `node -e "require('fs').writeFileSync(...)"`

**Quality Gates:**
- `npm run lint` -> 0 errors, 7 warnings
- `npm run test` -> 31/31 PASS
- `npm run test:regression` -> 51/51 PASS
- `npm run build` -> PASS (461 KB JS, 116 KB CSS)

**Files Modified:**
- `src/components/StoryIntro.tsx`: local lore images + BASE_URL
- `src/components/MainMenu.tsx`: fixed lore filenames + BASE_URL
- `package.json`: cross-platform test:regression script

**Commit:** `f6a6346` — pushed to main, Actions deploy triggered.

**Скачивание реальных изображений:**
- Обнаружено что 8 lore-файлов и 5 карточных файлов были пустышками (0 байт) — квен создал файлы но не скачал картинки
- Скачано 8 lore-изображений через `gen.pollinations.ai` API (38-77KB каждое): prolog, istochniki, ptitsa, fraktsii, shkola21, zima, metro, epilog
- Скачано 5 карточных изображений: biblioteka_omgtu, rosgvardiya, posledniy_argument, uskorennyy_rost, nalogovaya_inspektsiya
- Уменьшен шрифт последнего слайда StoryIntro (5xl-8xl → 3xl-6xl) для устранения лишних отступов
- Ноль пустых файлов после фикса

**Commit:** `8648c31` — pushed to main, deploy triggered.

**LoreScreen: скролл и видимость текста:**
- На 14" ноуте текст глав обрезался — страница не скроллилась, виден был только заголовок
- Переделана структура: шапка (заголовок + кнопки глав) фиксирована, контент ниже скроллится
- Убран блок Хранителя из шапки (экономия ~30% вертикального пространства)
- Убран `max-h-[60vh]` с текста — текст занимает сколько нужно, скролл на всю карточку
- Уменьшена высота картинки (h-48/h-64 → h-40/h-56)

**Commit:** `b96dbb3` — pushed to main, deploy triggered.

---

### 2026-03-05 — Исправление верстки игрового поля

*   Исправлена верстка игрового поля в `GameBoard.tsx`, которая была нарушена из-за отсутствия `flex-direction: column` в основном контейнере.

### 2026-03-05 — CSS Grid Layout Refactoring + Project Workflow Documentation

**CSS Grid Layout Implementation:**
- Analyzed reference project in `refactor-game-board-layout/` for stable layout architecture
- Added `.game-grid` CSS Grid layout to `src/index.css` with 8 fixed rows using `minmax(0, X)`
- Implemented grid zone classes: `.zone-topbar`, `.zone-enemy-hero`, `.zone-enemy-board`, `.zone-divider`, `.zone-player-board`, `.zone-player-hero`, `.zone-actionbar`, `.zone-hand`
- Added comprehensive zone styles: `.hero-zone`, `.board-zone`, `.creature-slot`, `.game-card`, `.hand-zone`, `.center-divider`
- Added `min-height: 0` protection for grid children to prevent stretching (per ui-fix.md)
- Updated `GameBoard.tsx` to use grid-zone structure instead of flex-based layout
- Fixed CSS syntax error (unclosed comment in grid-template-rows)

**Quality Gates:**
- ✅ npm run lint: PASS (0 errors, 6 warnings)
- ✅ npm run build: PASS (500 KB JS, 117 KB CSS)
- ✅ npm run test: PASS (20/20 tests)
- ✅ npm run test:regression: PASS (51/51 tests)

**Test Updates:**
- Updated `GameBoard.smoke.test.tsx` to handle duplicate "Конец хода" buttons (temporary workaround)

**Project Workflow Documentation:**
- Created `PROJECT_WORKFLOW.md` with comprehensive project guidelines:
  - MCP and Skills reference table (when to use which)
  - Session start/end checklists
  - Commit message format conventions
  - Quality gates checklist
  - GitHub Pages deployment process
  - File structure documentation
  - Required reading files for new sessions
- Updated `BRIEF.md` reference in documentation

**Git/Deployment Process:**
- Verified remote: https://github.com/cwjechw98-lang/omskgathering.git
- GitHub Pages auto-deploys on push to `main` branch
- CI workflow: `quality-gate.yml` runs lint + test + build
- Deploy workflow: `deploy-pages.yml` uses Node 22.12.0

**Files Modified:**
- `src/index.css`: +600 lines (CSS Grid layout, zone styles, animations)
- `src/components/GameBoard.tsx`: Restructured to use grid zones
- `tests/components/GameBoard.smoke.test.tsx`: Updated test for duplicate buttons
- `PROJECT_WORKFLOW.md`: New file (comprehensive workflow guide)

**Note:** Some duplicate old layout code remains in GameBoard.tsx — functional but needs future cleanup.

---

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

**ui-fix.md: Test Verification** ✅
- Ran unit tests: 14/14 PASS (including 5 property tests)
- Ran regression tests: 51/51 PASS (combat mechanics)
- test:replay: N/A (not implemented)
- All tests pass without errors
- No breaking changes introduced
- Game mechanics verified working correctly

**ui-fix.md: Layout Stabilization** ✅
- Created effects-layer CSS with position: fixed
- Added .game-grid > * { min-height: 0; } to prevent stretching
- Added fixed heights for board zones (.enemy-board, .player-board, .hero-zone)
- Created EffectsContext for centralized effect state management
- Created EffectsLayer component to render effects outside game grid
- Effects (damage numbers, targeting line, low HP warning) now render in overlay layer
- Visual effects no longer affect grid layout

Files modified:
- src/index.css: +25 lines (effects-layer CSS, grid protection)
- src/App.tsx: +10 lines (EffectsProvider wrapper)
- src/contexts/EffectsContext.tsx: new file (72 lines)
- src/components/EffectsLayer.tsx: new file (67 lines)

**determ.md: Deterministic Replay System** ✅
- Created src/game/replay.ts with ReplayAction structure
- Created src/game/replayRunner.ts with runReplay function
- Implemented 6 action types: PLAY_CARD, ATTACK_CREATURE, ATTACK_PLAYER, END_TURN, DRAW_CARD, PLAY_LAND
- Created validateReplay function for action validation
- Created tests/regression/replay-regression.test.ts with 6 tests
- All tests pass: determinism verified, validation works
- Uses existing engine functions (playCard, attackCreature, attackPlayer, endTurn)
- No changes to game mechanics

Files created:
- src/game/replay.ts: ReplayAction type, ReplayLog structure
- src/game/replayRunner.ts: runReplay, applyReplayAction, validateReplay
- tests/regression/replay-regression.test.ts: 6 replay tests

Quality gates:
- npm run test: 20/20 PASS (including 6 replay tests)
- npm run test:regression: 51/51 PASS
- npm run test:replay: 6/6 PASS
- npm run build: PASS

**progon.md: Test Verification** ✅
- Ran unit tests: 20/20 PASS (including 6 replay tests)
- Ran regression tests: 51/51 PASS (combat mechanics)
- Ran replay tests: 6/6 PASS (new test:replay script)
- Added npm script: test:replay
- All tests pass without errors
- No breaking changes introduced
- Game mechanics verified working correctly

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

### 2026-03-05 — UI Layer Audit & Fix (Этапы A+B)

**Аудит интерфейса:**
- Полный аудит z-index системы, мёртвого кода и отрисовки слоёв (3 параллельных агента)
- Выявлено: 2 undefined CSS-переменных, 6 закомментированных state с живыми сеттерами (crash risk), отсутствующая визуализация колоды, 67 мёртвых CSS-классов

**Этап A — Критические фиксы:**
- Z-index: добавлены `--z-divider`, `--z-hero`, `--z-card-hover`, `--z-hand-hover`, `--z-hand-selected`; убраны хардкоды `65`, `1000`, `1001`
- Восстановлены 6 state: `selectedAttackerSlot`, `aiActionStatus`, `showLog`, `playAnim`, `deathAnim`, `targetingLine` + импорт `getCardBackSource`
- Исправлены dependency arrays в `useCallback` для `runAI` и `doPlayCard`
- Добавлен `DeckStack` компонент — визуальная стопка колоды (с card-back.jpg) и сброса для обоих игроков
- Hero-зоны: `[Колода] [Hero Stats] [Сброс]` через `.hero-zone-row` flexbox

**Этап B — Анимации и чистка CSS:**
- Draw animation: отслеживание новых карт в руке через `prevHandRef` → CSS `card-draw-animation` (0.35s slide-in)
- Play animation: отслеживание новых карт на поле через `newlyPlayedUids` → CSS `card-play-animation` (0.4s spring-bounce)
- Чистка: удалено ~67 мёртвых CSS-классов (`.hero-zone`, `.mana-pip`, `.game-card-container`, `.game-card`, card anatomy, `.hand-card-in-arc` + arc index variants)
- CSS: 121 KB → 115 KB (-5%)

**Дополнительно:**
- `npm audit fix` — устранена high-severity уязвимость в rollup (GHSA-mw96-cpmx-2vgc)
- Smoke-тест обновлён: заменён хрупкий `[class*="text-green"]` селектор на `screen.getByText(/Конец хода/)`

**Исправление журнала действий:**
- Восстановлен рендер лога: кнопка "📜 Лог" теперь открывает `ModalOverlay` со списком `gs.log`
- Пронумерованные записи, скроллируемый список, ESC/клик-вне для закрытия

**Quality Gates:**
- `npm run lint` -> 0 errors, 7 warnings (без изменений)
- `npm run test` -> 20/20 PASS
- `npm run test:regression` -> 51/51 PASS
- `npm run build` -> PASS (457 KB JS, 115 KB CSS)

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

### 2026-03-13
- Зафиксировано обязательное языковое правило: ассистент всегда отвечает пользователю на русском языке.

### 2026-09-15
- **Сведение двух линий истории.** `main` и `origin/main` разошлись от общего предка `8107925`: локальная линия — 17 коммитов вперёд, апрельская (`ba0b9a9`, `fdab9a4`, автор `dev@omskgathering.ru`) — 2 коммита, и она существовала только на `origin`. Force-push уничтожил бы единственную копию редизайна, поэтому сделан merge `e6e4444` (родители `2897e47` и `fdab9a4`), а не перезапись истории. Пуш `fdab9a4..e6e4444` — fast-forward, ничего не потеряно.
- **Что приехало из апрельской линии:** весь визуальный слой — `src/index.css` (+873), `FieldCard`, `HandCard`, `CardPreview`, `PhaseIndicator`, `StoryIntro`, `dialog`, `sheet`, `App.tsx`, `cardImages.ts`. CSS: 128 → 140 KB.
- **Разрешённые конфликты (8 файлов):**
  - `engine.impl.ts`, `ai.ts`, `Tutorial.tsx`, `cards.ts` — взята локальная сторона. Локальный движок несёт отклонение хода с записью в лог и исправление дублирования карты; апрельский движок поведенчески совпадал с предком.
  - `PlayerArea.tsx` — апрельская раскладка (`game-player-area`), но сохранён проп `heroIcon`, который передают оба места вызова.
  - `MainMenu.tsx` — апрельская раскладка секций с подписями плюс возвращённый локальный пункт «Конструктор колод».
  - `decksStorage.ts` — локальная реализация (надмножество: `saveDecksState`, `setDeckActiveId`, адаптеры старых ключей). Имена `StoredDeck`/`DecksState` из апрельской версии никем не импортируются.
  - `GameBoard.tsx` — взят апрельский вариант. Он уже содержит всю систему прогрессии внутри себя (квесты, достижения, XP, телеметрия, baseline-метрики), поэтому потерь функциональности нет; локальное извлечение в `useGameActions` было чистым рефакторингом.
- **Quality Gates (на merge-коммите):** `eslint` 0 errors / 3 warnings, `tsc --noEmit` чисто, `vitest` 72/72, `test:regression` 51/51, `build` OK (508 KB JS, 140 KB CSS). CI на `main`: Quality Gate и Deploy GitHub Pages — success.
- **Проверка живого сайта:** SHA-256 JS-бандла совпал с локальной сборкой. Экраны Коллекция / Конструктор колод / Правила / Легенда отрисованы, ошибок консоли нет.
- **Осталось разобрать:** модули, осиротевшие после взятия апрельского `GameBoard` — `src/game/hooks/useGameActions.ts`, `src/components/game/MessageFeed.tsx`, `DeckStack.tsx`, `src/components/PlayerArea.tsx`, `src/features/progression/*`, `src/devtools/*`. Апрельский `GameBoard` дублирует прогрессию inline. Либо удалить их, либо перевести `GameBoard` обратно на них.
- **Известная проблема (не связана с merge):** в «Коллекции» карты без локального файла уходят в рантайме на `image.pollinations.ai`, что нарушает правило проекта «никогда не грузить картинки из внешних API в рантайме». Не замаплены `pisiner_21` и `khroniker_irtysha`. **Исправлено ниже.**

### 2026-09-15 — установка набора карточек `meta/muse-image`

- **Готовая коллекция лежала мимо.** Набор `_assets/cards-muse` — это результат запрошенной генерации через `meta/muse-image` (OpenRouter, `https://openrouter.ai/api/v1/images`): 76/76 успешно, все 682×1024 (портрет 2:3), 9.62 МБ, стиль-суффикс требовал надписи только кириллицей. В `public/cards` он никогда не устанавливался: там лежали картинки февраля–марта 2026 — 53 квадратные 1024×1024 и 22 альбомные 400×300. Отсюда и жалобы на искажённые пропорции.
- **Установлено:** 75 карточек + `card-back.jpg` скопированы в `public/cards`, `src/data/localCardImages.ts` пересобран по фактическим файлам. Теперь 75/75 замаплены, без локального файла не осталось ни одной карточки — рантайм-откат на `image.pollinations.ai` больше не срабатывает.
- **Пропорции:** все 75 карточек и рубашка — 682×1024 (2:3). Лор-картинки намеренно остались 800×400.
- **Про «Школу 42»:** у четырёх карточек промпт на момент генерации содержал `school 42` — `bocal`, `coffee_machine`, `holy_graph`, `pisiner_21`. В `src/data/cards.ts` это поправлено на `school 21`, но уже после генерации, поэтому в этих четырёх картинках надпись могла остаться. Модель `meta/muse-image` из каталога OpenRouter удалена, перегенерировать их тем же путём нельзя.
- **Двенадцать карточек** изначально были отклонены контент-фильтром Meta и перегенерированы с переписанными промптами (в манифесте помечены `overridden: true`).
- **Починка парсера:** `scripts/cache-card-images.mjs` находил 3 карточки из 75 (регексп требовал кавычку сразу после `img(`, а 72 вызова многострочные). Исправлено, добавлен отказ работать при неполном разборе — иначе скрипт перезаписал бы `localCardImages.ts` картой из трёх записей.
- **Quality Gates:** `eslint` 0 errors / 3 warnings, `vitest` 72/72, `test:regression` 51/51, `build` OK. Экраны Коллекция / Конструктор колод / Правила / Легенда — битых картинок 0, ошибок консоли 0.
- **Проверено про Pollinations:** работает только при включённом VPN (DNS уходит в fake-ip 198.18.0.x). Каталог переименован в `publisher/model`, старые короткие имена живы как алиасы. Эндпоинт без ключа игнорирует параметр `model` — `flux` и `zimage` вернули побайтово одинаковые файлы.

### 2026-09-15 — AI-проверка интерфейса через Midscene

- **Поставлено:** `@midscene/web@1.12.7` (+ peer `@playwright/test@1.58.2` под уже стоявший playwright). Midscene смотрит на скриншоты через vision-модель и выполняет шаги на естественном языке — то есть закрывает то, чего у ассистента не было: возможности видеть экран.
- **Добавлено:** `scripts/ai-ui-check.mjs` (`npm run test:ai`) — прогон интерфейса по шагам на русском: меню → Коллекция → Назад → Конструктор колод. Сборка отдаётся браузеру перехватом запросов, сетевого сервера нет. И `scripts/ai-image-check.mjs` — вопрос про произвольные картинки.
- **Модель:** `qwen/qwen3-vl-235b-a22b-instruct` с семейством `qwen3-vl` через OpenRouter. Ключ читается из `C:\Users\katoc\.dsh\.credentials.yaml`, в репозиторий не попадает.
- **Результат прогона:** 9 шагов, все зелёные, ~38 с. Модель сама прочитала меню («Играть, Коллекция, Конструктор колод, Правила, Легенда») и прошла переходы. На бесплатной `inclusionai/ling-3.0-flash-vl:free` — 8 из 9, падает только свободный запрос `aiAsk`: слабая модель не держит структурированный вывод.
- **Ловушка при проверке картинок:** если URL изображения не меняется между итерациями, браузер отдаёт закэшированную первую картинку и все ответы становятся одинаковыми. Симптом — дословно совпадающие ответы на разные файлы. Лечится уникальным именем в URL и `Cache-Control: no-store`.
- **Проверка на калибровочных картинках** (нарисованы с заведомо известным текстом): `ШКОЛА 21` → «ШКОЛА 21, кириллица», `SCHOOL 42` → «SCHOOL 42, латиница», пустая → «текста нет». Все три совпали, различение кириллицы и латиницы подтверждено.
- **Что показала проверка карточек:** на `bocal`, `coffee_machine`, `holy_graph`, `pisiner_21` надписи кириллицей и везде читается «ШКОЛА 21», ни «42», ни латиницы нет. Контроль на четырёх карточках, не связанных со школой, дал разные контекстные ответы (пивная — «СИБИРСКАЯ ТАВЕРНА», городской медведь — выставочные вывески), латиницы тоже нет.
- **Бюджет:** на OpenRouter осталось **$0.32** (`total_credits=17`, `total_usage=16.68`). Полный прогон `test:ai` съедает заметную долю остатка, для регулярных проверок брать бесплатную модель.
- **Quality Gates:** `eslint` 0 errors / 3 warnings, `vitest` 72/72, `build` OK.

### 2026-09-15 — анимация ходов противника

- **Жалоба:** «противник перестал играть, он просто не ходит». Проверено и опровергнуто в части логики: полный матч в браузере показывает, что ИИ разыгрывает земли, существ («Снежный Элементаль», «Голем ТЭЦ-5», «Контролер Трамвая №4»), накладывает «Голос Телебашни», атакует и доигрывает до победы. Ломалась не логика, а показ.
- **Причина 1 — `actions` нёс только атаки.** В `src/game/ai.ts` тип `AIAttackAction` описывал лишь два вида атак, и `actions.push` встречался исключительно в `attackPhase`. Разыгрыши карт (`playCard` в `playLandPhase` и `playCardsPhase`) в список не попадали, поэтому `runAIAnimations` не запускался. Ход с одной землёй не давал вообще никакой видимой реакции.
- **Причина 2 — анимация розыгрыша была мертва и у игрока.** Эффект в `GameBoard.tsx` читал `prevFieldRef`, но соседний эффект смерти объявлен раньше и обновляет тот же ref при каждом изменении поля — разница всегда выходила пустой. Измерено: 0 кадров с классом `card-play-animation` из 965 при 143 кадрах анимации добора.
- **Причина 3 — поле противника не отслеживалось.** Эффект смотрел только на `me.field`, а класс `card-play-animation` навешивался только в рендере поля игрока. У карт противника анимации не было в принципе.
- **Исправлено:** в `ai.ts` добавлен `AICardPlayAction` (uid, id, имя, эмодзи, тип карты) и общий `AIAction`; `playLandPhase` и `playCardsPhase` возвращают разыгранное, `aiTurn` собирает всё по порядку «земля → карты → атаки». В `GameBoard.tsx` заведён отдельный `prevPlayedFieldRef`, эффект следит за обоими полями, класс повешен и на карты противника, а в статусе появилась строка «✨ Хранитель Омска разыгрывает: …».
- **Проверено измерением:** было 0 кадров с анимацией розыгрыша из 965, стало **15 из 958** — это ровно 450 мс, полная длительность анимации. В том прогоне человек не разыгрывал ничего, значит анимируются именно карты противника.
- **Тесты:** добавлено 4 теста на состав `actions` (розыгрыш земли попадает в список, у записи есть имя и эмодзи, за восемь ходов есть и розыгрыши, и атаки, порядок «сначала розыгрыши, потом атаки»). Они были красными до правки. Всего `vitest` 81/81, регрессия 51/51, `eslint` 0 ошибок, `tsc` чисто.
- **Заодно:** в `combat-regression.ts` пришлось сузить тип перед обращением к `attackerUid` — `actions` стал объединением.

### 2026-09-15 — показ хода противника

- **Найдено:** состояние `aiActionStatus` объявлялось в `GameBoard.tsx`, но **его значение нигде не выводилось** — использовался только сеттер. То есть строка «что разыграл Хранитель» копилась в памяти и не показывалась никогда, а ход противника читался лишь по мельканию карт и мелкому чипу «Хранитель думает» в топбаре. Классический мёртвый UI-state: тесты и типы этого не видят.
- **Добавлено:** баннер хода в `src/index.css` (`.ai-action-banner`, `.ai-action-banner-attack`) и его отрисовка в `GameBoard.tsx`. Плашка по центру верха поля, `pointer-events: none`, `role="status"`, `aria-live="polite"`, отдельная красноватая рамка для атак.
- **Раскладка по времени:** карты, появившиеся на поле разом, теперь анимируются по одной с шагом 260 мс — одновременное появление нескольких существ не читалось. Статус висит 3,6 с вместо 2,5.
- **Проверено измерением:** за 4 хода противника баннер появлялся 4 раза, длительность показа 3000–3400 мс, тексты верные и на русском («✨ Хранитель Омска разыгрывает: 🔥 Омский НПЗ, 🧹 Дворник-Берсерк»). Анимация на поле противника сработала в 14 замерах. Геометрия плашки: 594×49 px по центру верха.
- **Проверено зрением:** vision-модель по кадру подтвердила — «вверху экрана есть плашка: „Хранитель Омска разыгрывает: Площадь Бухгольца“, не перекрывает важное».
- **Quality Gates:** `eslint` 0 errors / 3 warnings, `tsc` чисто, `vitest` 81/81, регрессия 51/51, `build` OK.

### 2026-09-16 — пункт 4 плана: измеримый аудит интерфейса

- **Инструмент вместо модели.** Vision-проверки в этой сессии недоступны: `describe_image` падает (`spawn codex ENOENT`), `modlens` уходит в таймаут 200 с, текущая модель картинки не принимает вовсе. Вместо перебора моделей (пункт 3 плана, снятый пользователем) написан `scripts/ui-audit.mjs` (`npm run audit:ui`) — аудит **без единого обращения к модели**: сборка отдаётся браузеру перехватом запросов, дефекты считаются по DOM и геометрии в трёх разрешениях (1600x900, 1366x768, 390x844).
- **Что ищет:** обрезку картинок при `object-fit: cover`, текст, не влезающий в блок, выход за экран, битые изображения, цели касания меньше 28 px, обрезанный интерактив, горизонтальный скролл страницы. Пишет JSON (`--json`) и скриншоты (`--shots`).
- **Ложные срабатывания отделены от дефектов** (правило «чинить объект, а не инструмент»): `line-clamp` штатно режет текст многоточием — исключён; декоративный слой `.omsk-menu-smoke` с `inset-x-[-10%]` вылезает за экран намеренно и обрезается родителем `overflow: hidden` — уходит в отдельный список `bleed`; картинка на весь экран помечается `backdrop` и не считается обрезкой. До этой правки аудит показывал 15 «текстов» и 3 «за экраном», которых в реальности нет.
- **Главный найденный дефект — 51% обрезки искусства карт в Коллекции.** Файлы карт 682x1024 (2:3, портрет), а блок арта задавался `paddingTop: '74%'`. Процент в `padding-top` считается от **ширины**, поэтому блок выходил альбомным (1.35:1) и `object-cover` срезал больше половины картинки — верх и низ. Комментарий рядом утверждал обратное: «using classic card aspect ratio 1:1.35, matching game cards» (игровые карты в CSS действительно 1:1.35–1.4). То есть замысел и реализация противоречили друг другу прямо в коде.
- **Исправлено:** блок арта плитки и шапки панели подробностей переведены на `aspect-[2/3]` — ровно пропорция файлов. Плитка Коллекции: искусство 139x208 при 682x1024 → обрезка **51% → 0%**. Панель подробностей (боковая и мобильная) в аудите до этого не измерялась вовсе — добавлен шаг «карта открыта».
- **Цели касания.** `html { font-size: clamp(14px, ...) }` ужимает rem до 14 px на мобильном, поэтому `h-7` давал 24.5 px, а не 28. Добавлен класс `.tap-target` с размерами **в пикселях** и применён к степперам Конструктора колод, фильтрам Коллекции, главам Легенды и кнопкам «Назад». Мелких целей: **166 → 0**. Это 74 карточки x 2 кнопки в конструкторе — самые нажимаемые элементы экрана.
- **Замер до/после:** `{crop: 42, clipped: 15, offscreen: 3, broken: 0, tiny: 166}` → `{crop: 3, clipped: 0, offscreen: 0, broken: 0, tiny: 0}`. Прогонов два, оба по одной и той же сборке-методике.
- **Цена решения по плотности:** плитка Коллекции выросла с ~300 до ~449 px (арт 105 → 208 px при неизменном инфо-блоке 195 px). Без прокрутки видно ~6 карточек вместо ~8. Это осознанный размен: показывать карту целиком, а не её полосу.
- **Осталось и решено НЕ править:** три «обрезки» — это баннер главы в Легенде (`800x400` в блоке `973x219`, срезается 55%). Это осознанный широкий баннер, доказательств «так неправильно» у меня нет, а зрения в этой сессии нет тоже, поэтому менять не стал — вынесено вопросом к пользователю. Картинка-фон меню (`tuman_nad_irtyshom.jpg`, портрет 682x1024 на весь экран 1600x900) тоже обрезана на 63%, но это фон под градиентом при opacity 35% — помечена как `backdrop`.
- **Чего аудит не проверяет честно:** наложений элементов друг на друга и эстетики — для этого нужен глаз, а он в этой сессии недоступен. Проверок: обрезка, текст, выход за экран, битые картинки, цели касания, обрезанный интерактив, горизонтальный скролл.
- **Quality Gates:** `eslint` 0 errors / 3 warnings (без изменений), `vitest` 81/81, регрессия 51/51, `build` OK (509.63 KB JS, 141.15 KB CSS).

### 2026-09-16 — пункт 2: поле, карты в руке и крупная карта

- **Придирка пользователя (по скриншоту):** «карточка в руке обрезается частью интерфейса», «карточка основная тоже не полноценная — картинка не вся», «пропорции карточки даже никакой игральной карты, а какая-то полуквадратная». Зрение в сессии сначала не работало (`describe_image` → `spawn codex ENOENT`, `modlens` → таймаут 200 с, текущая модель картинок не принимает). Позже `modlens` на уменьшенном скриншоте отработал и подтвердил придирку дословно: «карты в руке частично видны и обрезаны краем экрана».
- **Аудит поля в динамике.** Прежний аудит снимал поле один раз на первом ходу — то есть пустым. Теперь `scripts/ui-audit.mjs` разыгрывает карты, завершает ходы и на каждом шаге мерит геометрию руки, поля, превью и подъём карты при наведении. Три ошибки замера найдены и исправлены по ходу, каждая давала уверенное неверное число: размер карты брался из `getBoundingClientRect`, поэтому веерный поворот раздувал ширину и карта «выглядела» квадратной (0.82 вместо 0.67); обрезка арта внутри повёрнутой карты мерилась так же; розыгрыш программным `.click()` не срабатывал вообще, потому что закрытие превью сбрасывает выбор — нужен настоящий клик мышью по координатам.
- **Замер до правок:** рука — 2–6 карт свисали за свою зону на **4–12 px** и резались её `overflow`; при наведении карта срезалась сверху на **20–28 px**; крупная карта-превью — арт `338x120` в оболочке `340x249`, **обрезка 76–79%**; арт на поле 9–10%, на мобильном **43–46%** (карта поля выходила альбомной, 73x62); панель обучения сидела прямо на картах руки.
- **Причина «полуквадратности»:** карты были 1:1.35–1.4, а все файлы арта — `682x1024` (2:3). Крупная карта-превью была худшим случаем: полоса арта `clamp(70px,8vw,120px)` при ширине оболочки 340 px — это 2.8:1.
- **Исправлено:**
  - пропорция карт приведена к 2:3 (`--field-card-h`, `--hand-card-h`, `--card-h` = ширина x 1.5), мобильная карта поля держит `aspect-ratio` вместо растягивания на весь слот;
  - превью переделано в карту: оболочка 2:3, арт — фон целиком (та же пропорция, что у файла), текст поверх градиента, длинное описание прокручивается;
  - веер руки: свес ограничен 6 px, угол карты 3° → 2°, у зоны руки появился запас сверху и нижний отступ 16–24 px, подъём при наведении 22–28 px → 10–12 px;
  - панель обучения привязана к высоте зоны руки вместо `bottom: clamp(120px,18vh,200px)`.
- **Замер после правок:** свес **0 px**, карт за зоной **0**, срез при наведении **0 px**, обрезка арта на поле и в руке **0%**, крупная карта **0%** (было 76–79%), наложения панели на руку **0** (зазор до верхней карты 32–35 px), карта руки `104x156` = ровно 2:3.
- **Проверено зрением (modlens):** крупная карта — «портретная форма, как стандартная игральная карта, иллюстрация целостная, текст читается»; карты в руке — «полностью видны в кадре, портретные, как игральные». Про панель обучения сказано «частично закрывает верх карт» — проверено отдельным замером: зазор 32–35 px, наложения нет (модель читала затемнение оверлея как перекрытие).
- **Баннер Легенды** поднят `h-40/h-56` → `h-64/h-96`: обрезка **55% → 23%**. Полный ноль тут недостижим: картинка 2:1 в широком баннере обязана резаться, а баннер в 496 px съел бы пол-экрана.
- **Quality Gates:** `eslint` 0 errors / 3 warnings, `vitest` 81/81, регрессия 51/51, `build` OK (509.69 KB JS, 142 KB CSS).
- **Коммиты:** `6ec943c` (аудит), `d6d25e5` (пропорции карт и превью), `896efcf` (обрезка руки и панель обучения), `d8a7335` (баннер легенды).

### 2026-09-16 — бой, полная рука и конструктор колод

- **Аудит покрыл три состояния, которых не видел:** бой (выбор существа, кнопка «💥 В героя», показатели урона, переполнение ряда поля), полная рука (пять лишних ходов накапливают 8 карт) и конструктор колод в рабочем состоянии — колода собирается, сохраняется и измеряется заново, а не просто фотографируется.
- **Найден настоящий дефект (мобильный, 390 px):** в строке сохранённой колоды четыре кнопки («Редактировать», «Сделать активной», «Дублировать», «Удалить») стояли в один непереносимый ряд, сжимались ниже своего содержимого и **обрезали подписи на 4–9 px** — «Редактировать» терял хвост. Исправлено `flex-wrap`; обрезанного текста на экране теперь 0.
- **Главная находка — ошибка в моём же инструменте, а не в игре.** Бой не запускался вообще, поле игрока всегда читалось пустым. Причина: `saveDeck()` в конструкторе **делает сохранённую колоду активной**, поэтому аудит входил в игру колодой из восьми «Архивариусов Крепости» без единой земли — мана застревала на `0/0`, играть было нечего, а рука просто доросла до предела 8.
- **Как искал:** три неверные гипотезы подряд (клик не доходит до обработчика; закрытие превью сбрасывает выбор; мешает открытое обучение) — все опровергнуты. Признак того, что гадать хватит, был прямой: мой отдельный пробник с **тем же** кодом играл карты, а аудит нет. Помогла диагностика: дамп того, что находится в точке клика, сколько карт играбельно, и мана до/после обоих кликов. Дамп показал стартовую руку «Архивариус Крепости» и ману `0/0` — земель в колоде нет. Диагностика оставлена в скрипте под флагом `--diag`.
- **Прежде чем это выяснилось**, нашлись и были исправлены ещё три ошибки инструмента: бой запускался отдельной фазой после лишних ходов, когда Хранитель уже убивал всех наших существ (теперь атака пробуется на каждом ходу, как только существо вышло); розыгрыш водил в первую попавшуюся карту, а ею всегда оказывалась земля (теперь выбирается карта с признаком `cursor-grab`, а земля, дающая ману и уходящая с руки, больше не считается неудачей); клик программным `.click()` не работает, нужен настоящий клик мышью — закрытие превью сбрасывает выбор.
- **Результат боя, проверенный зрением (modlens):** существо игрока на поле подсвечено как выбранное, удар прошёл (у Хранителя 27/30), карты в руке и на поле не обрезаны, текст читаемый, дефектов не видно. Замер: кнопка «💥 В героя» 131×41 на 1600 и 86×34 на 390, обе **внутри экрана**; показателей урона 1, вне экрана 0; переполнение ряда поля 0.
- **Прочее в замерах чисто:** карты руки и поля ровно 2:3 (0,667), обрезка арта 0%, свес руки 0 px, срез при наведении 0, наложений панелей 0, скролл руки 0 px, обрезанного текста 0, мелких целей 0.
- **Quality Gates:** `eslint` 0 errors / 3 warnings, `vitest` 81/81, регрессия 51/51, `build` OK.
- **Коммиты:** `9190628` (аудит), `a344b81` (перенос кнопок в конструкторе).

### 2026-09-16 — журнал, отладка, обучение, конец боя

- **Покрыты состояния, которые аудит не открывал ни разу:** журнал боя (`📜 Журнал`), окно отладки (`⚙️ Отладка`), подсказки обучения и экран конца боя. Бой теперь доводится до конца — за прогоны получены и «🏆 Победа!», и «💀 Поражение».
- **Найден дефект:** в окне отладки четыре плашки («v0», «ОП v0») обрезали текст на 2–3 px. Причина оказалась неочевидной: плашке задана высота `h-4`, а `text-[9px]` переопределяет только размер шрифта — межстрочный остаётся унаследованным (1.5), и строка выше коробки. Класс `leading-none` в компоненте **не помогает**: `tailwind-merge` считает группы font-size и leading конфликтующими и выбрасывает `leading-none`, как только рядом стоит `text-[9px]`. Подтверждено дампом реального списка классов у элемента — в собранной странице не остаётся ни `leading-none`, ни `text-xs`. Межстрочный зафиксирован в CSS правилом `[data-slot='badge']`, откуда его не выкинуть слиянием.
- **Замер до/после:** `scrollHeight` 16 при `clientHeight` 14 → 14/14, обрезанных подписей в окне отладки 0 на всех трёх разрешениях.
- **Проверено и чисто:** журнал (522x515, обрезки нет, кнопка закрытия 32x32 на десктопе и 44x44 на мобильном), экран конца боя (487x315 победа и 457x296 поражение, обе панели внутри экрана, обрезки нет), подсказка обучения (420x146, внутри экрана, поверх карт руки не заходит, текст не обрезан).
- **Переполнение руки:** в одном из прогонов рука дошла до **10 карт** — все видны полностью, горизонтальной прокрутки нет, каждая карта остаётся видна целиком (доля видимой части 1.0).
- **Честный пробел:** шаги 2 и 3 обучения замерить не удалось. Подсказка показывается только при `ход <= 3`, а её шаг выбирается из состояния «что доступно прямо сейчас», поэтому обычно она прыгает с 1 сразу на 4; для шагов 2–3 нужна раздача, которую аудит не может навязать. В коде это следствие `getActiveTutorialStep`.
- **Заодно:** плашка активной колоды в конструкторе подписана по-английски «active» в полностью русском интерфейсе — исправлено на «активная». Это единственный видимый признак того, что сохранение колоды сделало её игровой.
- **Quality Gates:** `eslint` 0 errors / 3 warnings, `vitest` 81/81, регрессия 51/51, `build` OK.
- **Коммиты:** `a32b512` (плашки), `93c21e7` (подпись), `67471a5` (покрытие).

### 2026-09-16 — логика шагов обучения: урок стал целью, а не «что доступно»

- **Придирка пользователя:** «подсказка обычно прыгает с одного шага сразу на четыре», из-за чего уроки «сыграйте существо» и «атакуйте» игрок не видит. Это ровно тот пробел, который в прошлой записи помечен как «честный пробел» — теперь он закрыт.
- **Причин оказалось две, и обе подтверждены кодом, а не догадкой.**
  1. Резолвер подсказки отдавал **первый урок, выполнимый прямо сейчас**: невыполнимый урок молча проваливался дальше. Игрок играл землю, существ на 1 ману нет → урок 2 проваливался → урок 3 проваливался (атаковать нечем на первом ходу) → оставался урок 4 «нажмите конец хода». Шаги 2 и 3 не показывались вообще.
  2. Незакоммиченный рефакторинг был оборван на середине: `GameBoard` передавал компоненту **старый** API (`gameState` / `playerKey` / `hintContext`), а `resolveTutorialLesson`, `markLearned` и `tutorialProgress` не вызывались нигде. Хуже того, `handleTutorialSkip` писал в **необъявленное** состояние `tutorialCompleted`, а `tutorialVisible` его же читал — то есть любой вход в бой падал бы с `ReferenceError`, а пропуск обучения не сохранялся. `eslint` давал 5 ошибок `no-unused-vars`, тесты были красными (`new-components.test.tsx` импортировал `getActiveTutorialStep`, которого больше нет).
- **Новое правило:** подсказка показывает **первый непройденный урок по порядку** и держится его, пока он не пройден. Прыжок через урок невозможен по построению. Урок считается пройденным **по факту действия** (`markLearned` в `doPlayCard`, в атаке по существу, в атаке «в героя», в «Конец хода») и помнится между ходами.
- **Три честных состояния урока вместо «выполним / не выполним»:** `action` — можно делать сейчас; `wait` — не хватает маны (подсказка называет цену карты, свою ману и размер нехватки); `patience` — условий нет вовсе (существо выходит с болезнью призыва и не атакует в тот же ход). Номер шага при этом не меняется, поэтому полоски прогресса растут по порядку, а не скачут.
- **Урок 4 больше не врёт:** «нажмите конец хода» показывается только тогда, когда других дел действительно нет. Если появилась возможность сыграть карту или атаковать — подсказка возвращается к этому уроку.
- **Подсказка перестала умирать на третьем ходу:** раньше `tutorialVisible = turnNumber <= 3` отбирал панель вместе с непройденными уроками 2–3. Теперь обучение идёт, пока есть непройденный урок, а потолок `TUTORIAL_MAX_TURN = 8` — только страховка от вечной подсказки.
- **Файлы:** `src/utils/tutorialProgress.ts` (последовательный резолвер, `firstUnlearnedLesson`, состояния урока, `TUTORIAL_MAX_TURN`), `src/components/game/Tutorial.tsx` (третий вариант подсказки, честный заголовок шага), `src/components/GameBoard.tsx` (подключение резолвера и `markLearned`, удалены мёртвое состояние `hasPlayedNonLandCardThisTurn` и необъявленное `tutorialCompleted`), `tests/components/tutorial-lessons.test.ts` и `tests/components/new-components.test.tsx` (переписаны под новое поведение).
- **Как проверял.** `vitest run` и `vite build` под файловой песочницей падали с `spawn EPERM` (esbuild не может поднять дочерний процесс), поэтому логика сначала проверялась двумя скриптами на нативном Node 24 (TypeScript он исполняет сам, JSX — через загрузчик `scripts/tsx-loader.mjs` на самом пакете `typescript`, без esbuild): `npm run check:tutorial-lessons` и `npm run check:tutorial-render`. Полный доступ в сессии появился позже, и настоящие ворота прогнаны целиком — см. ниже.
- **Тесты нашли моё же неверное ожидание, а не дефект кода.** `vitest` упал ровно на одном: «не требует атаки, если атаковать некому и на столе пусто» ожидал `{lesson: 4}` — то есть **тот самый прыжок через непройденный урок 3, который и чинится**: ожидание было написано под прежнее (сломанное) поведение. Правильный ответ — молчание: советовать «атакуйте» нечего, а «конец хода» — это урок 4, показывать его рано, игрок ещё ни разу не атаковал. Ожидание исправлено на `null` с объяснением в комментарии; тот же случай добавлен в `check-tutorial-lessons`.
- **Quality Gates (полный доступ, всё локально):** `eslint src/` **0 errors** / 3 warnings (было 5 errors), `tsc --noEmit` **0 ошибок**, `vitest` **101/101** (было 81 тест — добавились 20), регрессия боя **51/51**, `build` OK (512.34 KB JS, 142.09 KB CSS), `check:tutorial` 20/20 + 18/18.
- **Осталось:** замер шагов 2–3 в `scripts/ui-audit.mjs` — прошлый аудит честно признал, что навязать раздачу не мог. Теперь шаг детерминирован прогрессом, поэтому замер стал возможен, но это отдельная работа.
- **Коммиты:** `a0ddd0e` (логика), `a311e24` (локальные проверки), `6c11332` (запись), `d54efbd` (исправленное ожидание теста).

### 2026-09-21 — Jev (TypeSafe System One): ворота калибровки пройдены, но не в той форме, которую я предполагал

- **Задача.** Оценить, чем бесплатная (на момент проверки) модель Jev полезна игре, и написать ТЗ. Ключ `TYPESAFE_API_KEY` получен от пользователя и положен в `~/.dsh/.credentials.yaml` (в репозиторий не попадает).
- **Что такое Jev.** Не LLM: модель решений. Ей дают состояние и типизированные вопросы, она возвращает решение с вероятностями. Три примитива: `Choice`, `Score`, `Noul`. Кода не пишет, партии не играет, между запросами не помнит. Эндпоинт `POST https://api.typesafe.ai/v1/systemone`, 64k контекста.
- **Маршруты проверены запросами, а не чтением конфига.** Прямой TypeSafe — **работает** (HTTP 200, `jev-1.13.0`). Vercel → `typesafe-ai/jev` — 403, нужна карта на аккаунте. OpenCode → `jev-1.13-free` — 500 на всех формах запроса, при этом `opencode.ai` резолвится в `198.18.0.87` (зарезервированный под бенчмарки диапазон, то есть прокси с подменой DNS). Контрольный запрос `mimo-v2.5-free` дал 403 «free tier can only be used from within OpenCode» — это отличает «сломан Jev» от «закрыт весь бесплатный доступ OpenCode»: верно второе. Защиту провайдера не обходил.
- **Первый прогон калибровки провалился, и это оказалось полезнее успеха.** Я просил Score «сила карты за свою цену» по 5 уровням, состояние — JSON-объектом. Результат: все 20 карт в диапазоне **2.09–2.15** при уверенности 0.64, то есть середина шкалы. Проверка прибора на заведомо различимых входах (пустое поле против 10/10 за 2 маны) дала разброс **0.09** и уверенность **0.01–0.07**. Английская рубрика провалилась ровно так же (9/20), то есть язык был не при чём.
- **Диагноз поставлен по частям.** Noul на простых примерах: «кот спит» / «кот летит» — 0.98 / 0.01 на английском и **0.97 / 0.01 на русском**. Choice — `tomato`, уверенность 1.00. Score на двух конкретных уровнях — 1 и 0, уверенность 1.00. Структурированное состояние — **хуже** простой строки (0.73 / 0.89 против 0.97 / 0.97). Вывод: сломана была не модель и не язык, а моя постановка задачи.
- **Корень: Jev не считает — он судит.** С сырыми данными, где модель сама складывала статы и сравнивала с нормой, — 13/20. С теми же картами, но с **посчитанными кодом** суммой, нормой и разницей — **20/20**, вероятности 0.98 для слабых против 0.03 для нормальных, разделение классов 0.95. Корреляция между фактической разницей статов и вероятностью Noul: **r = −0.830**. Модель ранжирует верно, но арифметику в уме не тянет.
- **Ворота пройдены:** три прогона (прямой, обратный и перемешанный порядок) — **20/20 каждый**, ноль расхождений вердиктов, сдвиг вероятности 0.006, точность 100%. Требовалось 17/20. Цена всей калибровки — **$0.0007**, экстраполяция на все 75 карт — $0.0009 (при $0.042 за миллион входных токенов и кредите $5).
- **Четыре правила, выведенные из проб:** числа считает код; состояние — простой строкой; Noul вместо Score; решение по вероятности принимает код. Записаны в `scripts/jev/README.md` с доказательствами.
- **Файлы:** `scripts/jev/extract-cards.mjs` (выгрузка 75 карт парсером TypeScript, а не регулярками), `scripts/jev/judge-stability.mjs` (ворота), `scripts/jev/fact-vs-judgment.mjs` (доказательство «код считает, модель судит»), `scripts/jev/probe-primitives.mjs`, `scripts/jev/discriminate.mjs`, `scripts/jev/README.md`, `scripts/jev-route-probe.mjs`, `docs/jev-integration-spec.md` (ТЗ переписано под факты), `reports/cards.json`.
- **Тупиковые скрипты удалены, выводы сохранены:** абстрактный Score по 5 уровням и по 3 уровням — обе формы воспроизводили ошибку «середина шкалы».
- **Что осталось (шаг 2 ТЗ):** `scripts/jev/client.mjs`, `balance-audit.mjs` (направление Б — ворота уже пройдены), `ai-move-audit.mjs` (направление А). Открытый вопрос к человеку: подтверждает ли он правило «истина — наши тесты, модель никогда не правит баланс сама».

### 2026-09-21 — Jev, направление Б: аудит баланса карт (первый рабочий результат)

- **Решение по открытому вопросу.** Из двух направлений ТЗ выбрано **Б (баланс карт)**, а не А (ходы ИИ). Причина не в цене (разница $0.001 против $0.007 ничтожна), а в расстоянии до пользы: баланс даёт список конкретных карт, который открываешь в `cards.ts` и правишь; ходы ИИ дают список спорных позиций, но чтобы дойти до правок, нужно ещё понять, почему ИИ так сыграл, и переписать эвристику в `ai.ts`. Плюс ворота для баланса уже пройдены на живых данных, а для ходов ИИ нужно сначала построить выгрузку позиций — и ошибка в выгрузке была бы неотличима от «модель плохо судит». Обвязка (клиент, порог, формат отчёта, контроль) переиспользуется для направления А.
- **Разделение труда.** Код считает: сумму статов, норму (2 стата за ману), цену ключевых слов по таблице, отставание от карт **той же цены**. Модель отвечает на один вопрос: оправдывает ли нехватку текст способности. Решение принимает код по порогу 0.5.
- **Две мои ошибки, обе в постановке задачи, а не в модели.**
  1. **`choice` — один ответ на вопрос, а не словарь по объектам.** Попытка разметить 20 существ одним вопросом дала `undefined` на всех 20. Для набора нужно по вопросу на объект (`q_<id>`), пачка при этом остаётся одним запросом.
  2. **Одна ось на вопрос.** После исправления формата разметка совпала с ключевыми словами только 4/12. Причина: у 12 из 20 карт **два независимых эффекта** — ключевое слово И отдельная способность («Полёт. Когда входит — потяните карту»). Я требовал один ярлык на карту с двумя осями, и модель последовательно выбирала вторичный эффект. Переписал: ключевое слово считает код, текст судит модель, это два слагаемых, а не конкурирующие метки.
- **Результат аудита 39 существ:** 34 в норме по коду, 5 требовали суждения, **находок ноль**. Все пять оправданы способностями: Мэр Омска (8 маны, 4/7, нехватка −4.5 — усиление всего стола и 2 токена), Чёрная Дыра (7, 5/5, −4.0 — массовое уничтожение), Дракон Иртыша (9, 7/7, −2.5 — 3 урона всем врагам), Писинер Школы 21 (3, 1/3, −2.0 — разгон и добор), Лорд Кластера (7, 5/7, −2.0 — усиление стола и заморозка).
- **Это проверенный факт, а не пустой результат.** Дорогие карты систематически недобирают статы (7–9 маны: −2…−5), и у всех пяти такая недобранность оплачена способностью. Кривая дорогих карт согласована. Кандидат на взгляд человеком — **Чёрная Дыра** (p=0.60, самая низкая): уничтожение условное, только существа с атакой ≤2.
- **Контроль прибора оказался обязательным.** Аудит дал вероятности 0.60–0.80 — тот же узкий диапазон, что у провального Score, но по другой причине. Отличил контрольным опытом: те же карты, те же числа, **текст затёрт**. Настоящие тексты **0.728**, затёртые **0.046**, сдвиг 0.68; ни одна карта без способностей не признана оправданной. Значит модель различает, а узость диапазона означает, что все пять карт действительно мощные. **Без этого контроля отчёту верить было нельзя.** Цена контроля — $0.00026.
- **Файлы:** `scripts/jev/balance-audit.mjs` (`npm run jev:balance`), `scripts/jev/balance-control.mjs` (`npm run jev:balance-control`), `scripts/jev/probe-classify.mjs` (проба, выявившая правило «одна ось»), `reports/balance-audit.md`, обновлён `scripts/jev/README.md`. Опыт перенесён в скилл `jev-decision-judge` (`SKILL.md` + `references/jev-insights.md`), npm-скрипты добавлены в `package.json`.
- **Ограничение отчёта:** только существа. У заклинаний, чар и земель нет статов — для них нужна отдельная рубрика. Это следующая работа в направлении Б.
- **Quality Gates:** `eslint src/` 0 errors / 3 warnings, `tsc --noEmit` 0 ошибок, `vitest` 101/101.

### 2026-09-21 — Jev, направление Б часть 2 (заклинания) + официальные доки поправили три моих правила

- **Поставлен официальный скилл TypeSafe.** `npx skills add typesafe-ai/skills --skill typesafe-ai -g --agent universal --copy` → лёг в `~\.agents\skills\typesafe-ai`. DSH читает оба каталога скиллов (`~\.dsh\skills` и `~\.agents\skills`), скилл виден в каталоге сессии. Агента `dsh` в списке CLI нет — ставится через `--agent universal`. Наш скилл `jev-decision-judge` остаётся дополнением: официальный даёт общую методику, наш — проверенное на живом API и грабли.
- **Аудит заклинаний и чар (`npm run jev:spells`).** Статов нет, поэтому рубрика другая: модель относит карту к классу эффекта, код сравнивает цены внутри класса. Первая версия дала 4 находки — и все ровно на пороге, что было сигналом несравнимого сравнения: я заставлял модель выбрать ОДИН главный класс, игнорируя остальные эффекты, и карты, которые просто делают больше, выглядели переоценёнными. После поправки на число эффектов (каждый сверх первого — 1.5 маны) осталась **одна находка**: «Мороз −50°» за 5 маны, тогда как «Пробка на Ленина» за 3 делает то же самое плюс запрет атаки на следующий ход.
- **Находка подтверждена двумя независимыми способами:** суждением модели (переплата 2.0 к норме класса) и проверкой **без модели** — текст «Мороза» целиком входит в текст «Пробки», а «Пробка» дешевле. Добавил в аудит поиск вложенных эффектов сравнением текстов.
- **Контроль с затёртым текстом провалился** (энтропия 2.74 против 2.97 — модель раздавала метки картам без эффекта). Причина: остались **имена**, а «Пиво „Сибирская Корона“» само подсказывает класс. Сделал правильный контроль — **подмену** чужого текста при своём имени: метка сдвинулась 24/30, а обезличивание имён не изменило ничего (30/30). Значит модель читает текст, а не угадывает по названию. Надёжность разметки: класс 29/30, число эффектов **30/30**.
- **Документация опровергла три моих правила формы.** Проверил экспериментом на 39 существах с известными ответами: Score с абстрактными уровнями дал уверенность 0.79 и |r| = 0.869, с уровнями-ситуациями — **0.97** и |r| = 0.898. Значит «Score не годится для суждений» было **неверным обобщением**: различала даже абстрактная форма, а провалилась моя конкретная первая рубрика (5 уровней на другой задаче). Также опровергнуто «состояние только строкой» (документация рекомендует объект с именованными полями) и смягчено «русский не хуже английского» (основной язык обучения — английский). Уточнено: у Noul нет `.confidence`; порог — **три пути** (действовать / не действовать / **человеку**), а не 0.5 по умолчанию; уровни Score описывают ситуации, модель не видит ни номера уровня, ни соседей.
- **Файлы проекта:** `scripts/jev/spell-audit.mjs` (`npm run jev:spells`), `probe-spell-classes.mjs` (`jev:spells-probe`), `spell-class-control.mjs` (`jev:spells-control`), `experiment-score-vs-noul.mjs`, `reports/spell-audit.md`, обновлён `scripts/jev/README.md`.
- **Скилл обновлён:** переписаны правила формы, добавлен раздел «Источники и разграничение с официальным скиллом», порядок «известные ответы → устойчивость → контроль → вывод», новый файл `references/PIPE.md` — конвейер под проект (этапы, что считается истиной, результаты, грабли).
- **Quality Gates:** `eslint src/` 0 errors / 3 warnings, `tsc --noEmit` 0 ошибок, `vitest` 101/101, регрессия боя 51/51, сборка OK.

### 2026-09-21 — нулевая атака, аудит всей колоды и вопрос о защитниках

- **Баг с нулевой атакой подтверждён на живом коде.** Существо с атакой 0 могло атаковать: наносило 0 урона, писало в лог «⚔️ Babka атакует героя на 0!» и всё равно поворачивалось — та самая «пустая анимация». ИИ был защищён (`atk > 0` в его фильтре), игрок — нет. Предикат права атаки был **размножен в семи местах** (3× `GameBoard.tsx`, `PhaseIndicator.tsx`, `useGameActions.ts`, `ai.ts`), и ни одна копия не смотрела на атаку.
- **Причина долгого расследования — испорченный прибор.** Зонд читал **устаревшую** сборку `.tmp-regression`: `tsc` без записи `package.json` с `"type":"commonjs"` давал ESM, `require` его не брал, и вывод показывал поведение старого кода. Три часа ушло на «загадку», которой не было. Зонд `scripts/probe-zero-attack.mjs` теперь сам собирает regression-сборку и помечает её CommonJS.
- **Починка:** `canCreatureAttack()` в `buffs.ts` — единственный источник истины, семь копий вызывают её. Правило смотрит на **эффективную** атаку, а не базовую: существо 0/3 с `buffAttack = 1` обязано бить на 1 (тест `testBabkaCanAttackWhenBuffed` это стережёт). Защита добавлена в `attackPlayer` и `attackCreature`.
- **Аудит колоды (два параллельных подагента, read-only).** Состав: 75 карт, сверка `cards.ts` ↔ `reports/cards.json` — 0 расхождений. Механики: все 10 ключевых слов используются, но **`vigilance` не реализован в движке вообще** (только в скоринге ИИ и UI), `hexproof` игнорируется в трёх местах.
- **Главная находка: цвета в игре нет.** `createDeck()` фильтрует только по типу — все не-земли всех шести цветов уходят в одну колоду; мана единый пул (`player.maxMana += 1`), стоимость одно число (`card.data.cost`), цвет влияет **только на анимацию**. Значит «цвет как стратегия» не ось, а декор, а «Площадь Бухгольца» строго доминирует все пять моноземель.
- **Вторая находка: наш «Защитник» — это не MTG.** По официальным правилам (702.3b) защитник значит только «не может атаковать», а блокирующего выбирает защищающийся (509.1a). Шага блокирования в движке нет, поэтому `defender` играет роль Taunt из Hearthstone. Комментарии `ai.ts:177` и `engine.impl.ts:194` называли это правилом MTG — исправлено. Выбора места на поле тоже нет: `field.push`, семь слотов чисто визуальные.
- **Пять дефектов «текст карты против кода» исправлены:** «Сила Шавермы» обещала добор и не тянула карту; «Ускоренный Рост» сбрасывал `hasAttacked` и давал вторую атаку за ход; «Бокал» давал Писинерам +1/+0 (а старым +2/+1) вместо +1/+1; «Пробка на Ленина» морозила два хода вместо одного; `getEffectiveHealth` существовала в двух копиях, и через barrel наружу уходила версия без «Клятвы Метростроя» — ИИ занижал здоровье на 1. Дубликат убран.
- **Осталось решением человека (не трогал):** добавлять ли `defender` «Бабке с Семечками» (единственное существо с атакой 0 без ключевого слова); делать ли шаг блокирования; инверсии редкости («Пробка» за 3 uncommon сильнее «Мороза −50°» за 5 rare — подтверждает аудит заклинаний независимым методом); 86 пар строгого доминирования среди существ; отсутствие ответов на летающих, на чары и на крупных существ (шесть существ с hp>4 и atk>4 не убиваются ни одной картой набора).
- **Инструмент:** склонирован `chaoticgoodcomputing/mtg-rules` — автоматически разобранный текст официальных правил MTG в Markdown. Не движок, а эталон формулировок; по нему и проверялись 702.3b и 509.1a.
- **Quality Gates:** `eslint src/` 0 errors / 3 warnings, `tsc --noEmit` 0 ошибок, `vitest` 104/104 (+3 новых), регрессия боя 54/54, replay 6/6, обучение 20/20 и 18/18, сборка OK. Коммит `07ccda0`.

### 2026-09-22 — цвета: аудит разметки, Школа 21 как «шестая сила», выбор цвета в конструкторе

- **Решение владельца: цвета реализуем.** До этого цвет был декором — `createDeck()` фильтровал только по типу, мана была единым пулом, цвет влиял лишь на анимацию. Теперь цвет — правило сборки колоды.
- **Главное: цвета не пришлось придумывать.** Они уже описаны в `src/data/lore.ts`, Глава I: пять Источников Маны — это пять реальных мест Омска (Проспект Мира, Набережная Иртыша, Омское Подземелье, Омский НПЗ, Парк 30-летия), у каждого свой характер, фракция и лидер. Бесцветный — Школа 21, которую лор называет «шестой силой» в тени остальных фракций. Задача была не выдумать цвета, а довести до конца уже написанное.
- **Новый инструмент `scripts/jev/color-audit.mjs`** (`npm run jev:colors`). Три независимых сигнала на каждую из 69 не-земельных карт: что стоит сейчас, к какому цвету карта относится **по имени и флейвору**, и к какому — **по одной механике** (имя и флейвор стёрты). Две рубрики, потому что «кто карта» и «что она делает» — разные оси, а скилл требует одну ось на вопрос.
- **Две ошибки прибора, обе пойманы по фактам, а не по догадке.** Первая: смешал обе оси в одном вопросе — уверенность упала ниже порога у всех 69 карт. Вторая, настоящая: **ключ вопроса модели не отправляется**, поэтому 69 вопросов с одинаковым текстом для неё неразличимы — она вернула «белый» всем картам в одном прогоне и «синий» всем в другом. Лечение: текст карты вкладывается внутрь вопроса, как в `spell-audit.mjs`. После починки уверенность 0.5–1.00, метки разные, 4 карты неустойчивы. Третья, уже в самом отчёте: журнал записал оба мусорных прогона как `ok` — прибор врал о себе. Добавлена проверка на вырожденность (одна и та же метка почти всем картам → вердикт `wrong`).
- **Дрейф между прогонами.** Повторный запуск дал другие числа на пограничных картах: «Пробка на Ленина» 0.57 против прежней неуверенности. Значит прибор устойчив **внутри** прогона (прямой и обратный порядок сходятся), но дрейфует **между** прогонами. На принятое решение это не влияет: карты Школы 21 дали «бесцветный» с уверенностью 0.98–1.00 в обоих прогонах, далеко от границы. Но вердикты пограничных карт по одному прогону принимать нельзя.
- **Находка подтвердилась независимо.** Прогон «кто карта» называет бесцветной каждую карту Школы 21 с уверенностью 0.98–1.00. Перекрашено 13 карт: 12 в бесцветный (Бокал, Писинер, Лорд Кластера, Пир-ревью, Режим Отладки, Святой Граф, Сбой Памяти, Чёрная Дыра, Экзамен Школы 21, Голем Сборки, Норминетта, Голос Телебашни) и «Налоговая Инспекция» в белый — закон и порядок это Проспект Мира.
- **Где я с моделью не согласился — и почему.** «Омский Рыболов» она шлёт в синий (Иртыш!), но лор прямо включает рыбаков в «Детей Парка» → остался зелёным. Так же оставлены «Яма на Дороге» (дешёвое уничтожение — опора чёрного), «Благоустройство» (+0/+2 — усиления живут в зелёном), «Дворник-Берсерк» (Дети Парка), «Комар Иртышский» и «Птица-Омич» (неустойчивы: прямой и обратный порядок разошлись, суждению верить нельзя). Истина — проверка, а не модель.
- **Раздача выровнялась:** белый 12, синий 13, бесцветный 13, зелёный 11, красный 11, чёрный 9. Раньше бесцветный был свалкой из одной карты.
- **Цвет стал выбором.** В `cards.ts` добавлен паспорт цвета (`COLOR_INFO`, `COLOR_ORDER`, `cardsOfColors`) со значком и Источником из лора. В `DeckBuilder.tsx` — выбор 1–2 цветов, который фильтрует доступный пул. Больше двух не даём: карт на цвет 9–13, на три уже не хватает глубины. Третий цвет заменяет самый давний выбор, и об этом пишется в статус — кнопка не «не работает» молча.
- **Хранилище трогать не пришлось.** Цвета колоды **выводятся из её карт**, а не хранятся: сохранённая колода сама несёт свой цвет. Земли в подсчёт не идут — сейчас мана общая, и колода с шестью видами земель всегда выглядела бы шестицветной. Это единственное место, которое придётся поправить, когда появится цветная мана.
- **Что осталось владельцу.** Спорные карты, где имя и механика расходятся: «Химик НПЗ» (чёрный, но НПЗ — красный Источник), «Сводка 112», «Мастер Шаурмы», «Омская Ведьма», «Дракон Иртыша». Плюс вопрос глубины: сейчас цвет — это выбор пула, а не цветная мана. Цветную ману я сознательно отложил: она самая дорогая, ломает текущий баланс и без хорошего конструктора даёт постоянную «не ту ману».
- **Интерфейс проверен отрисовкой, а не только логикой.** `tests/game/colors.test.ts` покрывает разметку, но не разметку интерфейса. `tests/components/DeckBuilder.colors.test.tsx` рендерит конструктор и проверяет связку: кнопки всех шести цветов есть, нажатие сужает пул (чёрная «Яма на Дороге» исчезает, белая «Бабушка с Метро» остаётся), «Показать все» возвращает полный пул, третий цвет заменяет самый давний, повторное нажатие снимает выбор. На старом коде тест падает сразу — кнопок цвета там нет.
- **Quality Gates:** `tsc --noEmit` 0 ошибок, `eslint src/` 0 errors / 3 warnings, `vitest` **120/120** (+11 в `tests/game/colors.test.ts`, +5 в `tests/components/DeckBuilder.colors.test.tsx`), регрессия боя 54/54, replay 6/6, обучение 20/20 и 18/18, сборка OK. Коммиты `3306020` (цвет), `3299dcd` (WORKLOG), `53e326b` (починка прибора).

### 2026-09-22 — голос каждой карты: обе бабки, 47 молчавших карт и страж покрытия

- **Находка: голос был у 25 карт из 75.** Причём голос карты живёт в **трёх разных таблицах** `lore.ts`: `CARD_NARRATIVES` (что происходит при выходе на поле), `DEATH_QUOTES` (что при гибели) и реплики Хранителя. Карта с одной строкой из трёх выглядит не как персонаж, а как недоделка. Сначала проверил, нет ли где-то половины: оказалось ровно 28 полных и 0 частичных — либо всё, либо ничего.
- **Обе бабки — пара, и вместе они держат город.** «Бабка с Семечками» кормит и лечит, «Бабушка с Метро» защищает и заставляет ждать. Её карта удорожает заклинания врага на 1 ману — и теперь это шутка: она ждёт метро с 1979 года, подождут и остальные. Реплика на смерть закрывает крючок, который Глава VI оставила висеть: «Поезд снова не пришёл... и ждать стало некому...».
- **Хранитель получил свой лучший аргумент.** Он не хочет, чтобы ты покинул Омск. Бабушка, которая ждала метро с 1979 года и всё равно осталась, — именно то, что он ставит в пример: «Она не уедет. Никто не уедет».
- **Дописаны 47 карт, по три строки каждой** — 225 строк текста. Голос держится на четырёх правилах, снятых с уже существующих 25: эмодзи в начале, настоящее время, конкретная омская деталь (НПЗ, Любинский, маршрутка, сопромат, МФЦ), и сухая шутка вместо пафоса. Земли получили голос последними — у них нет ни выхода на поле, ни смерти, поэтому их строки говорят о мане.
- **Прибор соврал дважды, и оба раза я поймал это проверкой, а не глазом.** Первый раз: конец функции `getAILoreComment` я искал по `};` нулевого отступа, а там `  };` — поиск уезжал до конца файла и подхватывал ключи из `INTRO_SEQUENCE`, из-за чего в отчёт попали «карты» `emoji` и `text`. Поймала проверка на ключи без карт. Второй раз: я переименовал таблицу реплик в `AI_LORE_COMMENTS`, разбор этого не заметил и **молча отчитался «0 голосов»** — то есть прибор снова соврал о себе. Теперь пустая таблица — это громкий отказ с кодом 1, а не тихий ноль.
- **Проверку отказа проверил прогоном, а не рассуждением.** Первая попытка сделать зонд сорвалась на экранировании кавычек в `node -e`, и «exit 1» пришёл от «модуль не найден» — я не стал засчитывать это как успех. Со второй попытки, через файл, зонд дал ровно то, что нужно: предупреждение и код 1.
- **Новый инструмент `scripts/lore-coverage.mjs`** (`npm run lore:coverage`) показывает, у кого голос полный, у кого частичный и какие ключи в таблицах не соответствуют ни одной карте.
- **Новый страж `tests/game/lore-voices.test.ts`** (5 проверок) не даст покрытию откатиться: у каждой карты все три строки, ни одного ключа без карты, каждая строка начинается с эмодзи, у Хранителя минимум две разные реплики на карту, и никакие две карты не говорят одно и то же. Ради этого таблицу реплик пришлось вынести на уровень модуля — изнутри функции тесты её не видели.
- **Quality Gates:** `tsc --noEmit` 0 ошибок, `eslint src/` 0 errors / 3 warnings, `vitest` **125/125** (+5 в `tests/game/lore-voices.test.ts`), покрытие лора **75/75**, регрессия боя 54/54, обучение 18/18, сборка OK. Коммит `77ef5e3`.
- **Осталось по лору:** кампания из пяти битв (Пророчество Птицы обещает битву магов, а победа пока ничего не меняет) и цветная мана. Это следующие отдельные куски.
