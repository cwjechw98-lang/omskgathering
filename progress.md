Original prompt: давай

- Initialized regression-test task for combat/AI behavior.
- Plan: add TypeScript regression script, compile with tsc, run via node.
- Added combat/AI regression runner at tests/regression/combat-regression.ts.
- Added tsconfig.regression.json and npm script test:regression.
- Verified regression run: 4/4 PASS (freeze retaliation/thaw, lifelink actual damage, deathtouch hp=0 kill, ai attack actions).
- Playwright client from develop-web-game skill cannot run in this environment: playwright package is unavailable and npx cannot fetch from npm (cache-only/offline).
- Re-verified after installing playwright: regression still passes and Playwright is available.
- Ran develop-web-game client with browser permissions; it produced canvas captures (particle layer only), no console error artifacts.
- Ran additional full-page Playwright smoke check: main menu renders correctly, 5 buttons detected, first button is "Против Хранителя", console/page errors = [].
- Added AI regression for defender-priority path (expects attack-creature on mandatory defender); suite now 5/5 PASS.
- Fixed rules-text mismatches in engine:
- Added applyFreeze(turns) helper and aligned freeze durations to real "turns skipped" semantics.
- Implemented missing student_omgtu ETB effect (reveals top deck card in log).
- Tightened sneg_elemental trigger: freezes attacker only when elemental was actually damaged.
- Updated vigilance tooltip text to avoid defender implication.
- Expanded regression suite to 9 tests: freeze durations, student ETB, sneg trigger condition.
- Verified test run: 9/9 PASS.
- Added balance + MTG feature audit document: BALANCE_AUDIT_2026-02-26.md.
- Build check: `npm run build` succeeds when spawn restrictions are lifted; environment still warns Node 20.18.0 (< recommended 20.19+ for Vite 7.2.4).
- Applied "Small, Safe" balance patch batch:
- mer_omska cost 7 -> 8
- cluster_lord ETB freeze targets 2 -> 1 (text + logic)
- pivo_sibirskoe cost 1 -> 2
- probka_lenina cost 2 -> 3
- bozhestvenniy_svet heal 6 -> 4 (text + logic/log)
- Re-ran regression suite: 9/9 PASS.
- Added GitHub Pages deployment workflow (.github/workflows/deploy-pages.yml) to build dist and deploy on push to main via GitHub Actions.
- Performance tuning for menu/background effects:
- ParticleCanvas now caps DPR at 1.5, uses non-interactive mode by default, and avoids mouse-repulsion math unless explicitly enabled.
- MainMenu/Lore/CardCollection now use lighter particle densities on low-end/reduced-motion devices.
- Post-fix checks: regression 9/9 PASS, build PASS, local-mode UI smoke PASS with no console errors.

TODO for next agent:
- If network/package cache is enabled, install playwright and run skill client against local dev server.
- Add one more AI regression with defender-present path expecting attack-creature action.
- Optional: expose window.render_game_to_text in UI to let the skill emit state-*.json artifacts.

- Added local card-art pipeline:
- New resolver src/utils/cardImages.ts (local -> external -> emoji fallback via onError).
- GameBoard/MainMenu now use resolver for card art; enemy hand supports optional local card-back image.
- Added generated map file src/data/localCardImages.ts and download script scripts/cache-card-images.mjs + npm script cache:card-images.
- Attempted to cache covers from pollinations.ai in elevated mode; blocked by HTTP 530 (error code 1033) for all assets, so map remains empty and UI falls back to external/emoji.

TODO update:
- Run `npm run cache:card-images` from a network/location where pollinations.ai is reachable, then verify local files under public/cards and generated src/data/localCardImages.ts.
- If 530 persists, switch image source/provider (or use pre-generated local assets) and keep resolver as-is.

---

## 2026-03-04 — UI Stabilization (mod.md)

**Stage 1: UI Analysis** ✅
- Created UI_REFACTOR_PLAN.md with component analysis
- Identified absolute positioning issues
- Mapped component responsibilities

**Stage 2: Card Architecture** ✅
- Introduced CardSlot/CardContainer/CardVisual structure
- CardContainer handles hover/drag/scale
- CardVisual handles artwork/text/foil/glow
- Added overflow: hidden to CardVisual

**Stage 3: Z-index System** ✅
- Centralized z-layers in index.css
- Layers: background, board, cardSlots, cards, cardEffects, combatEffects, ui, hover, overlay
- Verified effects don't overlap UI

**Stage 4: Board Slots** ✅
- Implemented 7-slot board layout
- CSS: `grid-template-columns: repeat(7, 1fr)`
- Placeholder with dashed border and 🏔️ icon
- Auto-hide placeholder when card present
- Responsive gap: clamp(4px, 0.5vw, 10px)

**Quality Gates:**
- ✅ npm run lint (5 warnings, 0 errors)
- ✅ npm run build (494 KB JS, 100 KB CSS)
- ⏳ npm run test (pending)
- ⏳ npm run test:regression (pending)

**Stage 5: Attack Lanes** ✅
- Added visual lane highlighting
- .is-attacking: orange glow for attacking slot
- .is-target: red glow for targeted creature
- .is-valid-target: green dashed for empty enemy slot
- Pulse animations for visual feedback
- No mechanic changes (visual only)

**Quality Gates Stage 5:**
- ✅ npm run lint: PASS (5 warnings, 0 errors)
- ✅ npm run build: PASS (494 KB JS, 101 KB CSS)
- ✅ npm run test: PASS (14/14 tests)
- ✅ npm run test:regression: PASS (51/51 tests)

**Remaining Stages:**
- ⏳ Stage 6: Arc Hand Layout
- ⏳ Stage 7: Overlay for choose/discover
- ⏳ Stage 8: Verify effects_info.md
- ⏳ Stage 9: UX improvements


- Switched Pollinations image pipeline to new authenticated endpoint (gen.pollinations.ai/image) with POLLINATIONS_API_KEY.
- Added resume behavior to scripts/cache-card-images.mjs (skip existing files, incremental map writes).
- Cached local card covers successfully with API key: 60/60 cards + card-back stored in public/cards (61 files total).
- Generated src/data/localCardImages.ts with full local path map and LOCAL_CARD_BACK_IMAGE set.
- Post-cache verification: `npm run build` PASS, `npm run test:regression` PASS (9/9).


- Keeper-focused validation run completed:
- Engine stress (hundreds of simulated matches) and UI smoke in AI mode produced no runtime errors.
- Added/fixed authority rule in engine: defenders cannot attack even via direct engine API calls (attackPlayer/attackCreature guards).
- Mechanics matrix report saved to output/keeper-audit/mechanics-matrix-report.json (60/60 cards playable, keyword checks pass).
- Post-fix UI report saved to output/keeper-audit/ui-keeper-report-post-fix.json.

- Fixed GitHub Pages white-screen issue by adding dynamic Vite base path for Actions builds (`vite.config.ts`).
- Expanded combat regression suite to 15 tests (first strike, trample excess, unblockable through defender, defender API guard, vigilance semantics, flying restrictions); `npm run test:regression` now 15/15 PASS.
- Improved Keeper-mode adaptive UX in `GameBoard`: compact mode for small/touch viewports, mobile-safe log/message handling, and safer bottom safe-area behavior.
- Updated vigilance wording in menu/rules to match engine mechanics (no forced defender behavior).
- UI verification artifacts refreshed:
- `output/keeper-audit/ui-post-fix-playwright/` (skill client smoke, no errors files).
- `output/keeper-audit/ui-responsive-post-fix/` (desktop/mobile screenshots + `ui-responsive-report.json`, errors=[]).


- 2026-03-04 recovery cycle:
- Installed missing test stack (`vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `happy-dom`).
- Added tests: `tests/game/engine.turns.test.ts`, `tests/game/engine.combat.test.ts`, `tests/components/GameBoard.smoke.test.tsx`.
- Fixed strict lint blockers while keeping rules strict (no purity/set-state-in-effect/non-null errors left).
- Introduced engine modular facade: `src/game/engine.ts` now re-exports from `state/buffs/effects/combat/turns`, implementation preserved in `src/game/engine.impl.ts`.
- Added CI quality gate workflow (`.github/workflows/quality-gate.yml`) and pinned deploy Node to `22.12.0`.
- E2E smoke artifacts refreshed in `output/keeper-audit/ui-post-fix-playwright/` (`shot-0.png`, `shot-1.png`, `smoke-menu-to-game.png`, `ui-smoke-report.json`).
- Full checks now pass locally: `npm run lint` (0 errors), `npm run test` (9 passed), `npm run test:regression` (37/37), `npm run build` (passes with local Node version warning).

- Logging checkpoint (2026-03-04):
- Updated WORKLOG with recovery-cycle implementation details and verification status.
- Current quality gate state: `lint` no errors, `test` pass, `test:regression` 37/37 pass, `build` pass.
- CI quality workflow is in place; deploy workflow Node version pinned for deterministic runs.
- Latest smoke artifacts available in `output/keeper-audit/ui-post-fix-playwright/`.

- 2026-03-04 hotfix checkpoint:
- Fixed Babka (`babka_semechki`) rule inconsistency: buffed attack now participates in both attack and retaliation flows.
- Regression suite expanded for this class of issue (buffed 0-attack creatures).
- Current status: regression 39/39 pass, unit tests pass, lint has 0 errors.

- 2026-03-04 verification checkpoint (post latest commit review):
- Read latest commit (`d804b12`) first, then validated combat symmetry for Keeper -> player and player -> Keeper.
- No core engine asymmetry found; frozen defenders correctly deal 0 retaliation and thaw after hit.
- Added two Keeper-direction regression tests to lock expected behavior and prevent future drift.
- Fixed unrelated strict-lint breakage in `GameBoard.tsx` (`no-non-null-assertion`).
- Current status: regression 41/41 pass, lint has no errors.

- Log marker (2026-03-04): confirmed commit `baeafab` recorded and remote push state checked.

- Pollinations generation checkpoint (2026-03-04):
- 10 new card arts generated and normalized (source_raw + final_400x300).
- Final runtime set aligns with existing card asset profile (400x300 JPG, ~24KB average).
- Concepts/prompt package remains in `output/new-card-set-2026-03-04/` for easy import into `cards.ts`.

- 2026-03-04 review + stabilization checkpoint:
- Read recent refactor commits `00d0404` and `49f184b` to confirm scope and affected files.
- Confirmed split structure remains coherent (`src/components/game/*`, `src/components/ui/*`).
- Fixed smoke-test break introduced by new tooltip usage:
  - wrapped `GameBoard` render in `TooltipProvider` within `tests/components/GameBoard.smoke.test.tsx`.
- Current gate status after fix:
  - `npm run lint` -> 0 errors (warnings only),
  - `npm run test` -> pass,
  - `npm run test:regression` -> 41/41 pass,
  - `npm run build` -> pass (local Node version warning retained).

- 2026-03-04 new-cards matrix checkpoint:
- Added automated matrix audit script `scripts/audit-new-cards-matrix.mjs` + npm command `audit:new-cards`.
- Generated audit artifacts in `output/keeper-audit/new-cards-matrix/`.
- Current status for generated 10-card set: `ready 0/10`.
- Missing in runtime pipeline: catalog registration (`cards.ts`), local image map (`localCardImages.ts`), `public/cards` assets, and mechanics/test hooks.
- Existing game baseline remains stable: `test` pass, `test:regression` 41/41 pass.

- 2026-03-04 new-cards integration checkpoint:
- Runtime integration completed for all 10 generated cards:
  - catalog (`cards.ts`), local covers (`localCardImages.ts`), assets in `public/cards/`.
- Engine hooks implemented for all 10 cards in `engine.impl.ts` (ETB/spell/enchantment/land/death/attack triggers).
- AI layer updated for new cards (`ai.ts`) with comments/scoring and preferred land usage for `ploshchad_buhgoltsa`.
- Regression matrix expanded from 41 to 51 tests with dedicated coverage for each new card mechanic.
- Current matrix (`output/keeper-audit/new-cards-matrix/new-cards-matrix.md`): `ready 10/10`.
- Current gate after integration:
  - `npm run test:regression` -> 51/51 pass,
  - `npm run test` -> pass,
  - `npm run lint` -> 0 errors (warnings only),
  - `npm run build` -> pass (local Node warning retained).

- 2026-03-05 UI stabilization checkpoint (mod.md, stage 1):
- Added `UI_REFACTOR_PLAN.md` with full current-state UI analysis.
- Mapped component responsibilities and risk boundaries (UI-only changes vs engine-coupled interaction points).
- No gameplay code touched on this step by design.

- 2026-03-05 UI stabilization checkpoint (mod.md, stage 2):
- Implemented `CardSlot -> CardContainer -> CardVisual` architecture in active board card rendering (`GameBoard.tsx`).
- `CardVisual` now acts as strict clipping layer (`overflow: hidden`), while hover/scale behavior is moved to container layer.
- No engine mechanics changed; UI-only structural refactor.
- Quality checks remained green: unit/regression/build pass; lint without errors.
- 2026-03-05 mod.md stage 3:
- Centralized z-layer system finalized for active board/effects.
- Replaced remaining hardcoded render zIndex in GameBoard damage popups.
- Normalized CSS effect z-index usage to layer tokens (hover/card-effects/combat-effects/overlay).
- Validation: lint 0 errors (warnings only), test pass, regression 51/51 pass, build pass.
