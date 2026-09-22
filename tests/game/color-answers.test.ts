import { describe, expect, it } from 'vitest';
import { ALL_CARDS, COLOR_INFO } from '../../src/data/cards';

/**
 * Ответ на чужое существо: цвет, который не может ни убить, ни остановить чужое
 * существо, не играется вообще.
 *
 * Почему это не придирка. В движке НЕТ шага блокирования: атакует нападающий и сам
 * выбирает цель (см. engine.impl.ts, комментарий у isBlocker). В MTG цвет без убийств
 * выживает потому, что его крупные существа блокируют. Здесь они не блокируют — значит
 * единственные способы помешать атаке: убить, заморозить или встать защитником.
 *
 * Найдено замером 2026-09-22: у зелёного не было НИ ОДНОГО из трёх, у белого и синего
 * не было убийств. Дыру закрыли защитником у Бабки с Семечками, и этот тест следит,
 * чтобы она не открылась снова.
 */

/** Убивает: убирает чужое существо с поля совсем. */
function kills(card: (typeof ALL_CARDS)[number]): boolean {
  const text = (card.description ?? '').toLowerCase();
  return (card.keywords ?? []).includes('deathtouch') || text.includes('уничтож');
}

/** Останавливает: существо остаётся на поле, но атаковать не даёт. */
function stops(card: (typeof ALL_CARDS)[number]): boolean {
  const text = (card.description ?? '').toLowerCase();
  return (card.keywords ?? []).includes('defender') || text.includes('заморозьте');
}

const colors = Object.keys(COLOR_INFO) as (keyof typeof COLOR_INFO)[];

describe('у каждого цвета есть ответ на чужое существо', () => {
  it.each(colors)('%s умеет хотя бы что-то', (color) => {
    const pool = ALL_CARDS.filter((c) => c.color === color && c.type !== 'land');
    const answers = pool.filter((c) => kills(c) || stops(c));

    expect(
      answers.length,
      `цвет «${COLOR_INFO[color].name}» не может ни убить, ни остановить чужое существо: ` +
        `${pool.length} карт, ответов 0. В игре нет блокирования, поэтому такой цвет ` +
        'проигрывает любой атаке и не играется.',
    ).toBeGreaterThan(0);
  });

  it('зелёный отвечает не только статами', () => {
    // Отдельная проверка на конкретную находку: зелёный был единственным цветом
    // с нулём и убийств, и остановок — то есть вообще без взаимодействия.
    const green = ALL_CARDS.filter((c) => c.color === 'green' && c.type !== 'land');
    expect(green.filter((c) => kills(c) || stops(c)).length).toBeGreaterThan(0);
  });
});

describe('существо с нулевой атакой не тратит атаку впустую', () => {
  it('все такие существа — защитники', () => {
    // Существо с 0 атаки, которое может атаковать, наносит 0 урона: это потерянный
    // ход и для игрока, и для ИИ. Защитник атаковать не может вовсе, поэтому
    // нулевая атака перестаёт быть проблемой.
    const idle = ALL_CARDS.filter(
      (c) => c.type === 'creature' && (c.attack ?? 0) === 0 && !(c.keywords ?? []).includes('defender'),
    );

    expect(
      idle.map((c) => `${c.name} (${c.color})`),
      'существо с 0 атаки без защитника будет атаковать и наносить 0 урона',
    ).toEqual([]);
  });
});
