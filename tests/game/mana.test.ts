import { describe, expect, it } from 'vitest';
import type { ManaPool } from '../../src/game/types';
import {
  canPay,
  describePool,
  emptyPool,
  payMana,
  pipCount,
  pipsFor,
  poolTotal,
  refillPool,
} from '../../src/game/mana';

/** Пул из перечисленных цветов: `pool({ white: 2, green: 1 })`. */
function pool(partial: Partial<ManaPool>): ManaPool {
  return { ...emptyPool(), ...partial };
}

describe('Цветная мана: пипсы', () => {
  it('дешёвая карта требует один пипс, дорогая — два', () => {
    // Граница на 4 маны: до неё карту можно положить «на сдачу», после — это
    // обязательство перед цветом.
    expect(pipCount(1)).toBe(1);
    expect(pipCount(3)).toBe(1);
    expect(pipCount(4)).toBe(2);
    expect(pipCount(9)).toBe(2);
  });

  it('у бесцветной карты пипсов нет — её платит любая мана', () => {
    // Это свойство Школы 21: гибкая оплата в обмен на слабейшие статы.
    expect(pipsFor('colorless', 7)).toBe(0);
    expect(pipsFor('green', 7)).toBe(2);
  });
});

describe('Цветная мана: оплата', () => {
  it('белую карту за 3 можно оплатить одной белой и двумя любыми', () => {
    expect(canPay(pool({ white: 1, green: 2 }), 'white', 3)).toBe(true);
  });

  it('белую карту НЕЛЬЗЯ оплатить тремя зелёными землями', () => {
    // Ровно это и означает «цвет существует»: общее число маны есть, цвета нет.
    expect(canPay(pool({ green: 3 }), 'white', 3)).toBe(false);
  });

  it('дорогая карта требует два пипса, одного не хватает', () => {
    expect(canPay(pool({ green: 1, white: 4 }), 'green', 5)).toBe(false);
    expect(canPay(pool({ green: 2, white: 3 }), 'green', 5)).toBe(true);
  });

  it('бесцветную карту платит любая мана', () => {
    expect(canPay(pool({ red: 5 }), 'colorless', 5)).toBe(true);
    expect(canPay(pool({ red: 4 }), 'colorless', 5)).toBe(false);
  });

  it('мана «любая» закрывает цветной пипс', () => {
    // Писинер и Святой Граф дают именно такую ману.
    expect(canPay(pool({ any: 2, white: 3 }), 'green', 5)).toBe(true);
    expect(canPay(pool({ any: 1, white: 4 }), 'green', 5)).toBe(false);
  });

  it('оплата не портит исходный пул', () => {
    const before = pool({ white: 2, green: 1 });
    const snapshot = { ...before };
    payMana(before, 'white', 3);
    expect(before).toEqual(snapshot);
  });

  it('при нехватке возвращается null, а не испорченный пул', () => {
    expect(payMana(pool({ green: 1 }), 'white', 3)).toBeNull();
  });

  it('списывает ровно цену', () => {
    const after = payMana(pool({ white: 1, green: 2 }), 'white', 3);
    expect(after).not.toBeNull();
    expect(poolTotal(after!)).toBe(0);
  });
});

describe('Цветная мана: защита от вырожденного пула', () => {
  it('пустой объект вместо пула даёт отказ, а не NaN', () => {
    // Эту дыру нашёл property-тест: без подстраховки `Math.min(undefined, n)` давал
    // NaN, и функция возвращала пул из NaN вместо честного «не хватает маны».
    const broken = {} as ManaPool;
    const result = payMana(broken, 'white', 3);
    expect(result).toBeNull();
    expect(canPay(broken, 'white', 3)).toBe(false);
  });

  it('частичный пул достраивается нулями', () => {
    const partial = { white: 3 } as ManaPool;
    const result = payMana(partial, 'white', 3);
    expect(result).not.toBeNull();
    expect(result!.white).toBe(0);
    expect(result!.green).toBe(0);
  });
});

describe('Цветная мана: пул хода', () => {
  it('собирается по одной мане за каждую землю своего цвета', () => {
    const refreshed = refillPool(
      { white: 3, blue: 0, black: 0, red: 1, green: 2, colorless: 1 },
      0,
    );
    expect(refreshed.white).toBe(3);
    expect(refreshed.green).toBe(2);
    expect(refreshed.red).toBe(1);
    expect(refreshed.colorless).toBe(1);
    expect(refreshed.blue).toBe(0);
    expect(poolTotal(refreshed)).toBe(7);
  });

  it('бонус от Святого Графа приходит маной «любая»', () => {
    const refreshed = refillPool(
      { white: 1, blue: 0, black: 0, red: 0, green: 0, colorless: 0 },
      2,
    );
    expect(refreshed.any).toBe(2);
    expect(poolTotal(refreshed)).toBe(3);
  });

  it('расшифровка пула показывает только непустые цвета', () => {
    expect(describePool(pool({ white: 2, green: 1 }))).toBe('белая 2, зелёная 1');
    expect(describePool(emptyPool())).toBe('пусто');
  });
});
