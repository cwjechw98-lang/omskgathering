import { describe, expect, it } from 'vitest';
import { CardData } from '../../src/data/cards';
import { attackCreature, attackPlayer, createCardInstance, createInitialGameState } from '../../src/game/engine';

function card(overrides: Partial<CardData> & Pick<CardData, 'id' | 'name' | 'type'>): CardData {
  return {
    id: overrides.id,
    name: overrides.name,
    type: overrides.type,
    cost: overrides.cost ?? 1,
    color: overrides.color ?? 'red',
    attack: overrides.attack,
    health: overrides.health,
    description: overrides.description ?? 'test',
    flavor: overrides.flavor ?? 'test',
    emoji: overrides.emoji ?? '⚔️',
    keywords: overrides.keywords ?? [],
    rarity: overrides.rarity ?? 'common',
  };
}

function readyCreature(data: CardData) {
  const c = createCardInstance(data);
  c.summoningSickness = false;
  c.hasAttacked = false;
  c.frozen = 0;
  return c;
}

describe('engine combat', () => {
  it('does not allow direct hero attack while defender exists', () => {
    const state = createInitialGameState();
    const attacker = readyCreature(
      card({ id: 'atk', name: 'Attacker', type: 'creature', attack: 3, health: 3 })
    );
    const defender = readyCreature(
      card({
        id: 'def',
        name: 'Defender',
        type: 'creature',
        attack: 1,
        health: 4,
        keywords: ['defender'],
      })
    );
    state.player1.field = [attacker];
    state.player2.field = [defender];

    const next = attackPlayer(state, 'player1', attacker.uid);
    expect(next.player2.health).toBe(state.player2.health);
    expect(next.player1.field[0].hasAttacked).toBe(false);
  });

  it('does not allow non-flying attacker to hit flying defender', () => {
    const state = createInitialGameState();
    const attacker = readyCreature(
      card({ id: 'ground', name: 'Ground', type: 'creature', attack: 4, health: 4 })
    );
    const flyingDefender = readyCreature(
      card({
        id: 'flyer',
        name: 'Flyer',
        type: 'creature',
        attack: 2,
        health: 2,
        keywords: ['flying'],
      })
    );
    state.player1.field = [attacker];
    state.player2.field = [flyingDefender];

    const next = attackCreature(state, 'player1', attacker.uid, flyingDefender.uid);
    expect(next.player2.field[0].currentHealth).toBe(flyingDefender.currentHealth);
    expect(next.player1.field[0].hasAttacked).toBe(false);
  });

  it('applies trample excess and lifelink correctly', () => {
    const state = createInitialGameState();
    const attacker = readyCreature(
      card({
        id: 'trampler',
        name: 'Trampler',
        type: 'creature',
        attack: 5,
        health: 3,
        keywords: ['trample', 'lifelink'],
      })
    );
    const blocker = readyCreature(
      card({ id: 'blocker', name: 'Blocker', type: 'creature', attack: 1, health: 1 })
    );
    state.player1.field = [attacker];
    state.player2.field = [blocker];
    state.player1.health = 20;
    state.player2.health = 20;

    const next = attackCreature(state, 'player1', attacker.uid, blocker.uid);

    expect(next.player2.health).toBe(16);
    expect(next.player1.health).toBe(21);
  });

  it('deathtouch kills creature regardless of remaining health', () => {
    const state = createInitialGameState();
    const attacker = readyCreature(
      card({
        id: 'assassin',
        name: 'Assassin',
        type: 'creature',
        attack: 1,
        health: 2,
        keywords: ['deathtouch'],
      })
    );
    const defender = readyCreature(
      card({ id: 'tank', name: 'Tank', type: 'creature', attack: 1, health: 10 })
    );
    state.player1.field = [attacker];
    state.player2.field = [defender];

    const next = attackCreature(state, 'player1', attacker.uid, defender.uid);
    expect(next.player2.field.length).toBe(0);
    expect(next.player2.graveyard.some((c) => c.uid === defender.uid)).toBe(true);
  });
});
