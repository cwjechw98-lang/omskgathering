import { beforeEach, describe, expect, it } from 'vitest';
import { createDeck, createDeckFromCardIds } from '../../src/data/cards';
import {
  expandDeckCardIds,
  loadDecksState,
  setActiveDeckId,
  type DecksStorageState,
  type SavedDeck,
} from '../../src/utils/decksStorage';

const DECKS_STORAGE_KEY = 'omsk.decks.v1';

function countById(ids: string[]): Record<string, number> {
  return ids.reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});
}

describe('decksStorage regression', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loadDecksState returns defaults for invalid localStorage payload', () => {
    window.localStorage.setItem(DECKS_STORAGE_KEY, '{not-json');

    const state = loadDecksState();

    expect(state).toEqual({
      version: 1,
      decks: [],
      activeDeckId: null,
    });
  });

  it('loadDecksState normalizes payload: clamps counts and drops invalid activeDeckId', () => {
    const raw = {
      version: 1,
      decks: [
        {
          id: 'deck-1',
          name: '  Main Deck  ',
          cards: [
            { cardId: 'bird_omsk', count: 1000 },
            { cardId: 'dvornik', count: 2.9 },
            { cardId: 'bad', count: 0 },
          ],
          createdAt: 123,
          updatedAt: 456,
        },
        {
          id: 'deck-2',
          name: 'Invalid Deck',
          cards: [],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      activeDeckId: 'missing-deck-id',
    };
    window.localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(raw));

    const state = loadDecksState();

    expect(state.version).toBe(1);
    expect(state.decks).toHaveLength(1);
    expect(state.decks[0].name).toBe('Main Deck');
    expect(state.decks[0].cards).toEqual([
      { cardId: 'bird_omsk', count: 8 },
      { cardId: 'dvornik', count: 2 },
    ]);
    expect(state.activeDeckId).toBeNull();
  });

  it('setActiveDeckId sets active deck only when deck exists', () => {
    const state: DecksStorageState = {
      version: 1,
      activeDeckId: null,
      decks: [
        {
          id: 'deck-1',
          name: 'Deck 1',
          cards: [{ cardId: 'bird_omsk', count: 2 }],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    };

    const withActive = setActiveDeckId(state, 'deck-1');
    const unchanged = setActiveDeckId(state, 'missing');

    expect(withActive).toEqual({ ...state, activeDeckId: 'deck-1' });
    expect(unchanged).toBe(state);
  });

  it('expandDeckCardIds expands counts and enforces hard cap of 240', () => {
    const hugeDeck: SavedDeck = {
      id: 'big',
      name: 'Big Deck',
      createdAt: 1,
      updatedAt: 1,
      cards: Array.from({ length: 40 }, (_, idx) => ({
        cardId: `card-${idx + 1}`,
        count: 999,
      })),
    };

    const expanded = expandDeckCardIds(hugeDeck);

    expect(expanded).toHaveLength(240);
    expect(expanded.slice(0, 8)).toEqual(Array.from({ length: 8 }, () => 'card-1'));
    expect(expanded.slice(8, 16)).toEqual(Array.from({ length: 8 }, () => 'card-2'));
  });
});

describe('createDeckFromCardIds regression', () => {
  it('falls back to default deck for empty input', () => {
    const deck = createDeckFromCardIds([]);
    const defaultDeck = createDeck();

    expect(deck).toHaveLength(defaultDeck.length);
    expect(deck.some((card) => card.type === 'land')).toBe(true);
  });

  it('falls back to default deck when all provided ids are invalid', () => {
    const deck = createDeckFromCardIds(['not-a-card', 'still-not-a-card']);
    const defaultDeck = createDeck();

    expect(deck).toHaveLength(defaultDeck.length);
    expect(deck.some((card) => card.type === 'land')).toBe(true);
  });

  it('excludes chinovnik from resulting deck', () => {
    const deck = createDeckFromCardIds(['chinovnik', 'bird_omsk']);

    expect(deck.map((card) => card.id)).toEqual(['bird_omsk']);
  });

  it('preserves provided multiplicity for valid ids', () => {
    const input = ['bird_omsk', 'dvornik', 'bird_omsk', 'bird_omsk', 'dvornik'];

    const deck = createDeckFromCardIds(input);
    const counts = countById(deck.map((card) => card.id));

    expect(deck).toHaveLength(input.length);
    expect(counts).toEqual({
      bird_omsk: 3,
      dvornik: 2,
    });
  });
});
