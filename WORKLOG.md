# WORKLOG

## Session Log

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

