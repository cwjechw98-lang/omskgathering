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

