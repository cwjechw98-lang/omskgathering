import { describe, expect, it } from 'vitest';
import { ALL_CARDS } from '../../src/data/cards';
import { AI_LORE_COMMENTS, CARD_NARRATIVES, DEATH_QUOTES } from '../../src/data/lore';

/**
 * Голос карты живёт в трёх разных таблицах: что происходит при выходе на поле,
 * что при гибели и что говорит Хранитель. Карта с одной строкой из трёх выглядит
 * как недоделка, поэтому проверяем именно полноту — по всем трём сразу.
 */

const ids = ALL_CARDS.map((c) => c.id);
const hasEmoji = /^\p{Extended_Pictographic}/u;

describe('голос каждой карты', () => {
  it('у каждой карты есть нарратив, реплика на смерть и слова Хранителя', () => {
    const silent = ids.filter(
      (id) => !CARD_NARRATIVES[id] || !DEATH_QUOTES[id] || !AI_LORE_COMMENTS[id],
    );
    expect(silent, 'карты без полного голоса').toEqual([]);
  });

  it('в таблицах нет ключей без карт — это опечатка, и игрок её никогда не увидит', () => {
    const known = new Set(ids);
    const orphans = [CARD_NARRATIVES, DEATH_QUOTES, AI_LORE_COMMENTS].flatMap((table) =>
      Object.keys(table).filter((key) => !known.has(key)),
    );
    expect(orphans).toEqual([]);
  });

  it('ни один текст не пустой и каждый начинается с эмодзи — это голос игры', () => {
    const problems: string[] = [];

    for (const id of ids) {
      const texts = [CARD_NARRATIVES[id], DEATH_QUOTES[id], ...AI_LORE_COMMENTS[id]];
      for (const text of texts) {
        if (!text || text.trim().length < 10) problems.push(`${id}: пустой или слишком короткий`);
        else if (!hasEmoji.test(text)) problems.push(`${id}: без эмодзи — ${text.slice(0, 30)}`);
      }
    }

    expect(problems).toEqual([]);
  });

  it('у Хранителя на каждую карту минимум две разные реплики', () => {
    const thin = ids.filter((id) => {
      const options = AI_LORE_COMMENTS[id];
      return options.length < 2 || new Set(options).size !== options.length;
    });
    expect(thin, 'реплики повторяются или их меньше двух').toEqual([]);
  });

  it('тексты не скопированы друг у друга', () => {
    for (const [name, texts] of [
      ['нарративы', ids.map((id) => CARD_NARRATIVES[id])],
      ['реплики на смерть', ids.map((id) => DEATH_QUOTES[id])],
    ] as const) {
      const seen = new Map<string, string>();
      const duplicates: string[] = [];
      for (const [index, text] of texts.entries()) {
        const previous = seen.get(text);
        if (previous) duplicates.push(`${previous} и ${ids[index]} говорят одно и то же`);
        else seen.set(text, ids[index]);
      }
      expect(duplicates, `дубликаты среди ${name}`).toEqual([]);
    }
  });
});
