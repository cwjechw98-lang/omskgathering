import { describe, expect, it } from 'vitest';
import { CardData } from '../../src/data/cards';
import {
  createCardInstance,
  createInitialGameState,
  endTurn,
  playCard,
} from '../../src/game/engine';
import { giveMana } from '../helpers/mana';

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
    // Мана больше не хранится числом: на начало хода пул собирается заново из
    // разыгранных земель. Три белые земли — это три БЕЛЫЕ маны, а не «три маны».
    state.player2.landsByColor = { white: 3, blue: 0, black: 0, red: 0, green: 0, colorless: 0 };
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
    // Цвет — суть изменения: земля даёт ману СВОЕГО цвета, и в пуле три белых,
    // а не три «вообще». Без этой проверки тест не отличил бы цветную ману от старой.
    expect(next.player2.manaPool.white).toBe(3);
    expect(next.player2.manaPool.green).toBe(0);
    expect(next.player2.mana).toBe(
      next.player2.manaPool.white +
        next.player2.manaPool.blue +
        next.player2.manaPool.black +
        next.player2.manaPool.red +
        next.player2.manaPool.green +
        next.player2.manaPool.colorless +
        next.player2.manaPool.any
    );
    expect(next.player2.field[0].frozen).toBe(1);
    expect(next.player2.field[0].hasAttacked).toBe(false);
    expect(next.player2.field[0].summoningSickness).toBe(false);
    expect(next.player2.hand.length).toBe(6);
  });

  it('«Пробка на Ленина» морозит врага ровно на один ход', () => {
    const state = createInitialGameState();
    state.currentTurn = 'player1';
    // «Пробка на Ленина» в этом файле собирается хелпером с цветом по умолчанию — синим.
    giveMana(state.player1, 'blue', 10);
    state.player1.maxMana = 10;

    const probka = createCardInstance(
      card({ id: 'probka_lenina', name: 'Пробка на Ленина', type: 'spell', cost: 3 })
    );
    state.player1.hand = [probka];

    const enemy = createCardInstance(
      card({ id: 'target', name: 'Next Target', type: 'creature', attack: 1, health: 3 })
    );
    enemy.frozen = 0;
    state.player2.field = [enemy];

    // Розыгрыш: applyFreeze(c, 1) хранит N+1, то есть ровно один пропущенный ход.
    const afterCast = playCard(state, 'player1', probka.uid);
    expect(afterCast.player2.field[0].frozen).toBe(2);

    // Первый ход врага: счётчик падает до 1, атаковать ещё нельзя.
    const afterFirstEnd = endTurn(afterCast);
    expect(afterFirstEnd.currentTurn).toBe('player2');
    expect(afterFirstEnd.player2.field[0].frozen).toBe(1);

    // Второй ход врага: мороз кончился — атака снова доступна.
    // Раньше здесь стоял повторный applyFreeze, и существо пропускало два хода.
    const afterSecondEnd = endTurn(afterFirstEnd);
    const afterThirdEnd = endTurn(afterSecondEnd);
    expect(afterThirdEnd.currentTurn).toBe('player2');
    expect(afterThirdEnd.player2.field[0].frozen).toBe(0);
  });
});
