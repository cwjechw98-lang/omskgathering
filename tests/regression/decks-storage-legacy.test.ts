import { describe, expect, it, beforeEach } from 'vitest';
import { expandDeckCardIds, loadDecksState } from '../../src/utils/decksStorage';

/**
 * Прежние сборки писали колоды в другом формате. Если такие записи не читать,
 * колоды игрока исчезнут молча — эти проверки следят ровно за этим.
 */

function installLocalStorage(seed: Record<string, string>): void {
  const store = new Map<string, string>(Object.entries(seed));
  const fake = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: fake },
    configurable: true,
    writable: true,
  });
}

const card = (id: string, count: number) => ({ cardId: id, count });

describe('decksStorage: чтение записей прежних сборок', () => {
  beforeEach(() => {
    installLocalStorage({});
  });

  it('принимает состояние без поля version', () => {
    installLocalStorage({
      'omsk.decks.v1': JSON.stringify({
        decks: [{ id: 'a', name: 'Моя колода', cards: [card('bird_omsk', 2)] }],
        activeDeckId: 'a',
      }),
    });
    const state = loadDecksState();
    expect(state.decks).toHaveLength(1);
    expect(state.activeDeckId).toBe('a');
  });

  it('отвергает запись с чужой версией', () => {
    installLocalStorage({
      'omsk.decks.v1': JSON.stringify({
        version: 99,
        decks: [{ id: 'a', name: 'X', cards: [card('bird_omsk', 2)] }],
      }),
    });
    expect(loadDecksState().decks).toHaveLength(0);
  });

  it('понимает массив items вместо decks и selectedDeckId вместо activeDeckId', () => {
    installLocalStorage({
      'omsk.decks.v1': JSON.stringify({
        items: [{ id: 'z', name: 'Старая', cards: [card('pivo_sibirskoe', 1)] }],
        selectedDeckId: 'z',
      }),
    });
    const state = loadDecksState();
    expect(state.decks.map((deck) => deck.id)).toEqual(['z']);
    expect(state.activeDeckId).toBe('z');
  });

  it('понимает cardIds вместо cards и карту простой строкой', () => {
    installLocalStorage({
      'omsk.decks.v1': JSON.stringify({
        decks: [{ id: 'a', name: 'Строки', cardIds: ['bird_omsk', 'pivo_sibirskoe'] }],
      }),
    });
    const deck = loadDecksState().decks[0];
    expect(deck.cards).toEqual([
      { cardId: 'bird_omsk', count: 1 },
      { cardId: 'pivo_sibirskoe', count: 1 },
    ]);
  });

  it('понимает поле id вместо cardId и copies вместо count', () => {
    installLocalStorage({
      'omsk.decks.v1': JSON.stringify({
        decks: [{ id: 'a', name: 'Алиасы', cards: [{ id: 'tuman_nad_irtyshom', copies: 3 }] }],
      }),
    });
    expect(loadDecksState().decks[0].cards).toEqual([
      { cardId: 'tuman_nad_irtyshom', count: 3 },
    ]);
  });

  it('восстанавливает колоду без id и без имени', () => {
    installLocalStorage({
      'omsk.decks.v1': JSON.stringify({
        decks: [{ cards: [card('bird_omsk', 1)] }],
      }),
    });
    const deck = loadDecksState().decks[0];
    expect(deck.id).toBe('legacy-deck-0');
    expect(deck.name).toBe('Колода');
  });

  it('читает колоды из прежних ключей, если основной пуст', () => {
    installLocalStorage({
      'omsk.decks': JSON.stringify({
        decks: [{ id: 'legacy', name: 'Из старого ключа', cards: [card('bird_omsk', 1)] }],
      }),
    });
    expect(loadDecksState().decks.map((deck) => deck.id)).toEqual(['legacy']);
  });

  it('читает колоды из ключа decksState', () => {
    installLocalStorage({
      decksState: JSON.stringify({
        decks: [{ id: 'ds', name: 'Из decksState', cards: [card('bird_omsk', 1)] }],
      }),
    });
    expect(loadDecksState().decks.map((deck) => deck.id)).toEqual(['ds']);
  });

  it('основной ключ имеет приоритет над прежними', () => {
    installLocalStorage({
      'omsk.decks.v1': JSON.stringify({
        version: 1,
        decks: [{ id: 'main', name: 'Основная', cards: [card('bird_omsk', 1)] }],
        activeDeckId: null,
      }),
      'omsk.decks': JSON.stringify({
        decks: [{ id: 'old', name: 'Прежняя', cards: [card('bird_omsk', 1)] }],
      }),
    });
    expect(loadDecksState().decks.map((deck) => deck.id)).toEqual(['main']);
  });

  it('режет 12 копий прежней сборки до 8 — столько разрешает DeckBuilder', () => {
    installLocalStorage({
      'omsk.decks.v1': JSON.stringify({
        decks: [{ id: 'a', name: 'Много', cards: [{ id: 'bird_omsk', copies: 12 }] }],
      }),
    });
    expect(loadDecksState().decks[0].cards).toEqual([{ cardId: 'bird_omsk', count: 8 }]);
  });

  it('не падает на мусоре и битом JSON', () => {
    installLocalStorage({ 'omsk.decks.v1': '{ это не json', 'omsk.decks': 'null' });
    expect(loadDecksState().decks).toHaveLength(0);
  });

  it('разворачивает прежний формат карт в список id', () => {
    installLocalStorage({
      'omsk.decks.v1': JSON.stringify({
        decks: [{ id: 'a', name: 'Разворот', cardIds: ['bird_omsk', { id: 'pivo_sibirskoe', copies: 2 }] }],
      }),
    });
    const deck = loadDecksState().decks[0];
    expect(expandDeckCardIds(deck)).toEqual(['bird_omsk', 'pivo_sibirskoe', 'pivo_sibirskoe']);
  });
});
