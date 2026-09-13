import { describe, expect, it } from 'vitest';
import { CardData } from '../../src/data/cards';
import { createCardInstance, createInitialGameState, playCard } from '../../src/game/engine';

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
  const instance = createCardInstance(data);
  instance.summoningSickness = false;
  instance.hasAttacked = false;
  instance.frozen = 0;
  return instance;
}

/**
 * Regression coverage for the playCard split into
 * playLandCard / playCreatureCard / playSpellCard / playEnchantmentCard.
 *
 * Two behaviours broke during that split and are locked here:
 *  1. The "field is full" path re-inserted a card that had never been removed,
 *     duplicating the instance in hand (two entries sharing one uid).
 *  2. `cleanupDead` became unreachable, so creatures killed by a spell stayed on
 *     the field until the next attack or turn end.
 */
describe('engine playCard regression', () => {
  it('does not duplicate the card in hand when the field is full', () => {
    const state = createInitialGameState();
    state.currentTurn = 'player1';
    state.player1.mana = 10;
    state.player1.field = Array.from({ length: 7 }, (_, index) =>
      readyCreature(
        card({
          id: `filler_${index}`,
          name: `Filler ${index}`,
          type: 'creature',
          attack: 1,
          health: 1,
        })
      )
    );
    const inHand = createCardInstance(
      card({ id: 'newcomer', name: 'Newcomer', type: 'creature', cost: 2, attack: 2, health: 2 })
    );
    state.player1.hand = [inHand];

    const next = playCard(state, 'player1', inHand.uid);

    expect(next.player1.hand).toHaveLength(1);
    expect(next.player1.hand.filter((c) => c.uid === inHand.uid)).toHaveLength(1);
    expect(next.player1.field).toHaveLength(7);
    expect(next.player1.mana).toBe(10);
  });

  it('cleans up a creature killed by a spell immediately', () => {
    const state = createInitialGameState();
    state.currentTurn = 'player1';
    state.player1.mana = 10;
    const victim = readyCreature(
      card({ id: 'victim', name: 'Victim', type: 'creature', attack: 1, health: 5 })
    );
    state.player2.field = [victim];
    const spell = createCardInstance(
      card({ id: 'yama_na_doroge', name: 'Yama na Doroge', type: 'spell', cost: 1 })
    );
    state.player1.hand = [spell];

    const next = playCard(state, 'player1', spell.uid);

    expect(next.player2.field).toHaveLength(0);
    expect(next.player1.graveyard.map((c) => c.data.id)).toContain('yama_na_doroge');
  });
});
