import { test, expect, describe, beforeEach, afterEach, vi } from 'vitest';
import { createInitialGameState, endTurn } from '../../src/game/engine';
import { aiTurn } from '../../src/game/ai';

// Существующая симуляция полной игры ход противника не проверяет: она дважды
// вызывает endTurn и просто перескакивает его. Здесь aiTurn вызывается
// по-настоящему, потому что именно его поведение ломалось незамеченным.
//
// Колода тасуется через Math.random, поэтому генератор подменяется на
// детерминированный: иначе тест «противник выкладывает существ» плавает.

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

beforeEach(() => {
  vi.spyOn(Math, 'random').mockImplementation(seededRandom(20260915));
});

afterEach(() => {
  vi.restoreAllMocks();
});

function startAiTurn() {
  let gs = createInitialGameState();
  gs = endTurn(gs);
  expect(gs.currentTurn).toBe('player2');
  return gs;
}

describe('Противник действительно ходит', () => {
  test('на первом своём ходу разыгрывает землю и получает ману', () => {
    const gs = startAiTurn();
    const manaBefore = gs.player2.maxMana;
    const handBefore = gs.player2.hand.length;

    const result = aiTurn(gs);

    expect(result.state.player2.maxMana).toBe(manaBefore + 1);
    expect(result.state.player2.landsPlayed).toBe(1);
    expect(result.state.player2.hand.length).toBeLessThan(handBefore);
  });

  test('земля уходит из руки в ману, а не на поле', () => {
    // Земли в этой игре не перманенты: они покидают руку и дают ману.
    // Фиксируем именно это, чтобы поведение не менялось незаметно.
    const gs = startAiTurn();
    const handBefore = gs.player2.hand.filter((c) => c.data.type === 'land').length;

    const result = aiTurn(gs);

    const handAfter = result.state.player2.hand.filter((c) => c.data.type === 'land').length;
    expect(handAfter).toBe(handBefore - 1);
    expect(result.state.player2.field.filter((c) => c.data.type === 'land').length).toBe(0);
  });

  test('действия противника попадают в журнал', () => {
    const gs = startAiTurn();
    const logBefore = gs.log.length;

    const result = aiTurn(gs);

    expect(result.state.log.length).toBeGreaterThan(logBefore);
  });

  test('за восемь ходов противник выкладывает существ и наносит урон', () => {
    let gs = createInitialGameState();
    const hpBefore = gs.player1.health;

    for (let round = 0; round < 8; round++) {
      if (gs.currentTurn === 'player1') gs = endTurn(gs);
      if (gs.currentTurn === 'player2') gs = aiTurn(gs).state;
    }

    const creatures = gs.player2.field.filter((c) => c.data.type === 'creature').length;
    // Землю противник может и не добрать за эти ходы, поэтому проверяем рост
    // маны мягко, а существа и урон — строго: именно они и ломались.
    expect(gs.player2.maxMana).toBeGreaterThanOrEqual(5);
    expect(creatures).toBeGreaterThan(0);
    expect(gs.player1.health).toBeLessThan(hpBefore);
  });

  test('человек, который ходит так же, не отстаёт по мане', () => {
    let gs = createInitialGameState();

    for (let round = 0; round < 3; round++) {
      if (gs.currentTurn === 'player1') {
        gs = endTurn(gs);
      }
      if (gs.currentTurn === 'player2') {
        gs = aiTurn(gs).state;
      }
    }

    expect(gs.player2.maxMana).toBe(3);
  });
});
