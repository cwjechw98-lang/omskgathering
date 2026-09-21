import { describe, expect, it } from 'vitest';
import {
  ALL_CARDS,
  CardColor,
  COLOR_INFO,
  COLOR_ORDER,
  cardsOfColors,
  createDeck,
} from '../../src/data/cards';

/**
 * Цвет — не украшение, а правило: он решает, из чего можно собирать колоду.
 * Эти тесты держат три вещи: разметку цветов, бесцветность Школы 21 (лор,
 * подтверждённый аудитом scripts/jev/color-audit.mjs) и то, что карт на цвет
 * хватает для колоды из двух цветов.
 */

/** Не-земельные карты: именно они задают цвет колоды, земли сейчас общие. */
const NON_LAND = ALL_CARDS.filter((c) => c.type !== 'land');

function nonLandOf(color: CardColor) {
  return NON_LAND.filter((c) => c.color === color);
}

describe('Цвета: разметка', () => {
  it('у каждого цвета есть паспорт с именем и Источником', () => {
    expect(COLOR_ORDER).toHaveLength(6);
    for (const color of COLOR_ORDER) {
      expect(COLOR_INFO[color], `нет паспорта для ${color}`).toBeDefined();
      expect(COLOR_INFO[color].name.length).toBeGreaterThan(0);
      expect(COLOR_INFO[color].source.length).toBeGreaterThan(0);
    }
  });

  it('все шесть цветов реально используются картами', () => {
    for (const color of COLOR_ORDER) {
      expect(nonLandOf(color).length, `${color} пуст`).toBeGreaterThan(0);
    }
  });

  it('в самом бедном цвете хватает карт на колоду из двух цветов', () => {
    // Два цвета вместе дают минимум 22 не-земельные карты — этого хватает на
    // рекомендуемые 40 карт с землями. Порог 9 — нижняя граница беднейшего цвета.
    const smallest = Math.min(...COLOR_ORDER.map((c) => nonLandOf(c).length));
    expect(smallest).toBeGreaterThanOrEqual(9);

    // И ни один цвет не должен разрастись настолько, чтобы обесценить выбор.
    const largest = Math.max(...COLOR_ORDER.map((c) => nonLandOf(c).length));
    expect(largest).toBeLessThanOrEqual(2 * smallest);
  });
});

describe('Цвета: Школа 21 — бесцветная «шестая сила»', () => {
  // Лор (Глава IV) называет Школу 21 шестой силой в тени остальных фракций.
  // Аудит scripts/jev/color-audit.mjs подтвердил это независимо: прогон
  // «кто карта» называет бесцветной каждую из них с уверенностью 0.98-1.00.
  const SCHOOL_21 = [
    'bocal',
    'pisiner_21',
    'cluster_lord',
    'peer_review',
    'debug_mode',
    'holy_graph',
    'segfault',
    'blackhole',
    'exam_42',
    'makefile_golem',
    'norminette',
    'golos_telebashni',
    'coffee_machine',
  ];

  it('все карты Школы 21 бесцветны', () => {
    for (const id of SCHOOL_21) {
      const card = ALL_CARDS.find((c) => c.id === id);
      expect(card, `карта ${id} не найдена`).toBeDefined();
      expect(card!.color, `${id} должен быть бесцветным`).toBe('colorless');
    }
  });

  it('бесцветный не превратился в свалку — он весь про Школу 21', () => {
    // Бесцветных не-земельных карт ровно столько, сколько даёт Школа 21.
    expect(nonLandOf('colorless')).toHaveLength(SCHOOL_21.length);
  });
});

describe('cardsOfColors', () => {
  it('пустой список цветов не ограничивает пул', () => {
    expect(cardsOfColors([])).toHaveLength(ALL_CARDS.length);
  });

  it('один цвет даёт только его карты', () => {
    const white = cardsOfColors(['white']);
    expect(white.length).toBeGreaterThan(0);
    expect(white.every((c) => c.color === 'white')).toBe(true);
  });

  it('два цвета дают ровно объединение двух цветов', () => {
    const white = ALL_CARDS.filter((c) => c.color === 'white').length;
    const red = ALL_CARDS.filter((c) => c.color === 'red').length;
    expect(cardsOfColors(['white', 'red'])).toHaveLength(white + red);
  });

  it('все шесть цветов вместе дают всю игру', () => {
    expect(cardsOfColors([...COLOR_ORDER])).toHaveLength(ALL_CARDS.length);
  });
});

describe('Цвета: колода', () => {
  it('createDeck собирает карты всех шести цветов', () => {
    const deck = createDeck();
    const colors = new Set(deck.map((c) => c.color));
    for (const color of COLOR_ORDER) {
      expect(colors.has(color), `в колоде нет карт цвета ${color}`).toBe(true);
    }
  });

  it('createDeck не потерял карты после перекраски', () => {
    // 75 карт в наборе: 39 существ, 21 заклинание, 9 чар, 6 земель.
    expect(ALL_CARDS).toHaveLength(75);
    const deck = createDeck();
    expect(deck.length).toBeGreaterThan(0);
    // Чиновник — карта-исключение, в колоду не попадает.
    expect(deck.some((c) => c.id === 'chinovnik')).toBe(false);
  });
});
