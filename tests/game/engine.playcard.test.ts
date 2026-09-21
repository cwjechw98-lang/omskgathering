import { describe, expect, it } from 'vitest';
import { CardData } from '../../src/data/cards';
import {
  createCardInstance,
  createInitialGameState,
  getEffectiveAttack,
  getEffectiveHealth,
  playCard,
} from '../../src/game/engine';

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

  // --- Дефекты «текст карты против кода», найденные аудитом колоды ---

  it('«Сила Шавермы» тянет карту, как написано на карте', () => {
    const state = createInitialGameState();
    state.currentTurn = 'player1';
    state.player1.mana = 10;
    state.player1.field = [
      readyCreature(card({ id: 'ally', name: 'Ally', type: 'creature', attack: 2, health: 2 })),
    ];
    state.player1.deck = [
      createCardInstance(card({ id: 'drawn', name: 'Drawn', type: 'spell' })),
    ];
    const shaverma = createCardInstance(
      card({ id: 'shaverma_power', name: 'Sila Shavermy', type: 'spell', cost: 2 })
    );
    state.player1.hand = [shaverma];

    const next = playCard(state, 'player1', shaverma.uid);

    // Раньше drawCard здесь не вызывался: рука оставалась пустой, колода не менялась.
    expect(next.player1.deck).toHaveLength(0);
    expect(next.player1.hand.map((c) => c.data.id)).toContain('drawn');
  });

  it('«Ускоренный Рост» не даёт второй атаки в тот же ход', () => {
    const state = createInitialGameState();
    state.currentTurn = 'player1';
    state.player1.mana = 10;
    const attacker = readyCreature(
      card({ id: 'attacker', name: 'Attacker', type: 'creature', attack: 2, health: 2 })
    );
    attacker.hasAttacked = true;
    state.player1.field = [attacker];
    const spell = createCardInstance(
      card({ id: 'uskorennyy_rost', name: 'Uskorennyy Rost', type: 'spell', cost: 1 })
    );
    state.player1.hand = [spell];

    const next = playCard(state, 'player1', spell.uid);
    const after = next.player1.field.find((c) => c.uid === attacker.uid)!;

    // Ускорение — это право атаковать в ход входа, а не сброс hasAttacked.
    expect(after.hasAttacked).toBe(true);
    expect(after.tempBuffAttack).toBe(2);
  });

  it('«Бокал» даёт +1/+1 и старым, и новым Писинерам', () => {
    const state = createInitialGameState();
    state.currentTurn = 'player1';
    state.player1.mana = 10;
    const oldPisiner = readyCreature(
      card({ id: 'pisiner_21', name: 'Old Pisiner', type: 'creature', cost: 3, attack: 1, health: 3 })
    );
    state.player1.field = [oldPisiner];
    const bocal = createCardInstance(
      card({ id: 'bocal', name: 'Bocal', type: 'creature', cost: 4, attack: 2, health: 5 })
    );
    state.player1.hand = [bocal];

    const withBocal = playCard(state, 'player1', bocal.uid);
    const oldAfter = withBocal.player1.field.find((c) => c.uid === oldPisiner.uid)!;
    // Раньше старый Писинер получал +2/+1: постоянный бафф при розыгрыше
    // складывался с непрерывной веткой Bocal.
    expect(getEffectiveAttack(oldAfter, withBocal.player1)).toBe(2);
    expect(getEffectiveHealth(oldAfter, withBocal.player1)).toBe(4);

    const newPisiner = createCardInstance(
      card({ id: 'pisiner_21', name: 'New Pisiner', type: 'creature', cost: 3, attack: 1, health: 3 })
    );
    withBocal.player1.hand = [newPisiner];
    const after = playCard(withBocal, 'player1', newPisiner.uid);
    const newAfter = after.player1.field.find((c) => c.uid === newPisiner.uid)!;
    // А новый получал +1/+0: hp-клаузы в getEffectiveHealth не было.
    expect(getEffectiveAttack(newAfter, after.player1)).toBe(2);
    expect(getEffectiveHealth(newAfter, after.player1)).toBe(4);
  });
});
