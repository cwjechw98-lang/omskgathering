type DeckCardEntry = string | { id?: unknown; cardId?: unknown; count?: unknown; copies?: unknown };

export interface StoredDeck {
  id?: string;
  name: string;
  cards: DeckCardEntry[];
}

export interface DecksState {
  activeDeckId: string | null;
  decks: StoredDeck[];
}

const DECKS_STORAGE_KEYS = ['omsk.decks.v1', 'omsk.decks', 'decksState'];

function normalizeDeck(value: unknown): StoredDeck | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const cards = Array.isArray(raw.cards)
    ? raw.cards
    : Array.isArray(raw.cardIds)
      ? raw.cardIds
      : null;
  if (!cards) return null;
  return {
    id: typeof raw.id === 'string' ? raw.id : undefined,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Колода',
    cards: cards as DeckCardEntry[],
  };
}

function normalizeDecksState(value: unknown): DecksState {
  if (!value || typeof value !== 'object') return { activeDeckId: null, decks: [] };
  const raw = value as Record<string, unknown>;
  const decksSource = Array.isArray(raw.decks)
    ? raw.decks
    : Array.isArray(raw.items)
      ? raw.items
      : [];
  const decks = decksSource.flatMap((deck) => {
    const normalized = normalizeDeck(deck);
    return normalized ? [normalized] : [];
  });
  const activeDeckId =
    typeof raw.activeDeckId === 'string'
      ? raw.activeDeckId
      : typeof raw.selectedDeckId === 'string'
        ? raw.selectedDeckId
        : null;
  return { activeDeckId, decks };
}

export function loadDecksState(): DecksState {
  if (typeof window === 'undefined') return { activeDeckId: null, decks: [] };
  for (const key of DECKS_STORAGE_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      const state = normalizeDecksState(JSON.parse(raw));
      if (state.decks.length > 0) return state;
    } catch {
      // Ignore stale or experimental deck storage shapes.
    }
  }
  return { activeDeckId: null, decks: [] };
}

export function getActiveDeck(state: DecksState): StoredDeck | null {
  if (state.activeDeckId) {
    return state.decks.find((deck) => deck.id === state.activeDeckId) ?? null;
  }
  return state.decks[0] ?? null;
}

export function expandDeckCardIds(deck: StoredDeck): string[] {
  return deck.cards.flatMap((entry) => {
    if (typeof entry === 'string') return [entry];
    const id =
      typeof entry.id === 'string'
        ? entry.id
        : typeof entry.cardId === 'string'
          ? entry.cardId
          : null;
    if (!id) return [];
    const countValue =
      typeof entry.count === 'number'
        ? entry.count
        : typeof entry.copies === 'number'
          ? entry.copies
          : 1;
    const count = Math.max(1, Math.min(12, Math.floor(countValue)));
    return Array.from({ length: count }, () => id);
  });
}
