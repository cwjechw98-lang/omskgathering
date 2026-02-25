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
