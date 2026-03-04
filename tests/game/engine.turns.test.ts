import { describe, expect, it } from 'vitest';
import { CardData } from '../../src/data/cards';
import {
  createCardInstance,
  createInitialGameState,
  endTurn,
  playCard,
} from '../../src/game/engine';

function card(overrides: Partial<CardData> & Pick<CardData, 'id' | 'name' | 'type'>): CardData {
  return {
    id: overrides.id,
    name: overrides.name,
    type: overrides.type,
    cost: overrides.cost ?? 1,
    color: overrides.color ?? 'blue',
    attack: overrides.attack,
    health: overrides.health,
    description: overrides.description ?? 'test',
    flavor: overrides.flavor ?? 'test',
    emoji: overrides.emoji ?? '🧪',
    keywords: overrides.keywords ?? [],
    rarity: overrides.rarity ?? 'common',
  };
}

describe('engine turns', () => {
  it('allows one land per turn and increases mana cap', () => {
    const state = createInitialGameState();
    state.player1.hand = [
      createCardInstance(card({ id: 'land_a', name: 'Land A', type: 'land', cost: 0, color: 'green' })),
      createCardInstance(card({ id: 'land_b', name: 'Land B', type: 'land', cost: 0, color: 'green' })),
    ];

    const afterFirstLand = playCard(state, 'player1', state.player1.hand[0].uid);
    expect(afterFirstLand.player1.maxMana).toBe(1);
    expect(afterFirstLand.player1.landsPlayed).toBe(1);

    const afterSecondLand = playCard(afterFirstLand, 'player1', afterFirstLand.player1.hand[0].uid);
    expect(afterSecondLand.player1.maxMana).toBe(1);
    expect(afterSecondLand.player1.landsPlayed).toBe(1);
  });

  it('refreshes mana, decrements freeze and draws at next turn start', () => {
    const state = createInitialGameState();
    state.currentTurn = 'player1';
    state.player2.maxMana = 3;
    state.player2.mana = 0;
    state.player2.deck = [createCardInstance(card({ id: 'deck_draw', name: 'Draw', type: 'spell' }))];

    const frozenCreature = createCardInstance(
      card({ id: 'frozen', name: 'Frozen Unit', type: 'creature', attack: 2, health: 2 })
    );
    frozenCreature.frozen = 2;
    frozenCreature.hasAttacked = true;
    frozenCreature.summoningSickness = true;
    state.player2.field = [frozenCreature];

    const next = endTurn(state);

    expect(next.currentTurn).toBe('player2');
    expect(next.player2.mana).toBe(3);
    expect(next.player2.field[0].frozen).toBe(1);
    expect(next.player2.field[0].hasAttacked).toBe(false);
    expect(next.player2.field[0].summoningSickness).toBe(false);
    expect(next.player2.hand.length).toBe(6);
  });

  it('applies Probka freeze for next attacker turn', () => {
    const state = createInitialGameState();
    state.currentTurn = 'player1';
    state.cantAttackNextTurn = true;
    const nextCreature = createCardInstance(
      card({ id: 'target', name: 'Next Target', type: 'creature', attack: 1, health: 3 })
    );
    nextCreature.frozen = 0;
    state.player2.field = [nextCreature];

    const next = endTurn(state);
    expect(next.cantAttackNextTurn).toBe(false);
    expect(next.player2.field[0].frozen).toBe(2);
  });
});
