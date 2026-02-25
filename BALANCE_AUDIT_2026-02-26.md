# Balance Audit (2026-02-26)

## Scope
- Quick design-level balance pass (no large-scale simulation).
- Focus: swing potential, mana efficiency, board-wipe pressure, lock patterns.

## High Priority Targets
- `mer_omska` (7 mana): very high immediate swing (`+1/+1` aura + 2x 1/1 tokens).
  - Suggestion: raise cost to `8` OR reduce entry tokens to `1`.
- `cluster_lord` (7 mana): global `+1/+1` plus two freezes is often tempo-lethal.
  - Suggestion: keep cost 7, reduce ETB freeze to `1` target.
- `blackhole` (6 mana): powerful low-curve wipe gate (`attack <= 2`) can invalidate early-game archetypes.
  - Suggestion: increase cost to `7` OR restrict to enemy creatures only.

## Medium Priority Targets
- `pivo_sibirskoe` (1 mana draw 2): extremely efficient card flow.
  - Suggestion: increase cost to `2`.
- `probka_lenina` (2 mana full enemy attack lock next turn): high defensive spike for cost.
  - Suggestion: increase cost to `3`.
- `bozhestvenniy_svet` (5 mana heal 6 + teamwide permanent +1/+1): strong stabilizer and finisher.
  - Suggestion: reduce heal to `4` OR make buff temporary (`temp +1/+1` this turn).

## Underperform / Volatile
- `segfault` (1 mana random): high variance, low reliability.
  - Suggestion: if roll=1, deal 1 self-damage (instead of 2) to improve playability.
- `student_omgtu`: now has implemented ETB reveal (informational only), still low impact.
  - Suggestion: optional minor buff: on ETB, `scry 1` behavior (choose keep/bottom) instead of reveal-only.

## Suggested Patch Batch (Small, Safe)
1. `mer_omska` cost `7 -> 8`
2. `cluster_lord` ETB freeze targets `2 -> 1`
3. `pivo_sibirskoe` cost `1 -> 2`
4. `probka_lenina` cost `2 -> 3`
5. `bozhestvenniy_svet` heal `6 -> 4`

## MTG Feature Backlog (Next)
- `Scry` keyword/effect (low complexity, high game feel gain).
- `Ward 1` (target tax for removal/spells).
- `Exile` zone for premium removal and graveyard control.
- Trigger timing cleanup doc ("when enters", "when dies", "on combat damage").
- Stack-lite for spell/trigger ordering in contested interactions.
