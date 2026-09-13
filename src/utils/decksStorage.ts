export type DeckCardEntry = {
  cardId: string;
  count: number;
};

export type SavedDeck = {
  id: string;
  name: string;
  cards: DeckCardEntry[];
  createdAt: number;
  updatedAt: number;
};

export type DecksStorageState = {
  version: 1;
  decks: SavedDeck[];
  activeDeckId: string | null;
};

const DECKS_STORAGE_KEY = 'omsk.decks.v1';
const MAX_COPIES_PER_CARD = 8;
const MAX_EXPANDED_DECK_SIZE = 240;

function createDefaultDecksState(): DecksStorageState {
  return {
    version: 1,
    decks: [],
    activeDeckId: null,
  };
}

function normalizeDeckCardEntry(value: unknown): DeckCardEntry | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<DeckCardEntry>;
  if (typeof candidate.cardId !== 'string') return null;
  const cardId = candidate.cardId.trim();
  if (cardId.length === 0) return null;
  const count = Math.floor(Number(candidate.count));
  if (!Number.isFinite(count) || count <= 0) return null;
  const safeCount = Math.min(count, MAX_COPIES_PER_CARD);

  return {
    cardId,
    count: safeCount,
  };
}

function normalizeDeckCards(values: unknown[]): DeckCardEntry[] {
  const countsByCardId = new Map<string, number>();
  const cardOrder: string[] = [];

  for (const value of values) {
    const entry = normalizeDeckCardEntry(value);
    if (!entry) continue;

    const previous = countsByCardId.get(entry.cardId) ?? 0;
    if (previous === 0) {
      cardOrder.push(entry.cardId);
    }
    countsByCardId.set(entry.cardId, Math.min(MAX_COPIES_PER_CARD, previous + entry.count));
  }

  let remainingCards = MAX_EXPANDED_DECK_SIZE;
  const cards: DeckCardEntry[] = [];

  for (const cardId of cardOrder) {
    if (remainingCards <= 0) break;

    const count = countsByCardId.get(cardId) ?? 0;
    if (count <= 0) continue;

    const nextCount = Math.min(count, remainingCards);
    cards.push({ cardId, count: nextCount });
    remainingCards -= nextCount;
  }

  return cards;
}

function normalizeDeck(value: unknown): SavedDeck | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<SavedDeck>;
  if (typeof candidate.id !== 'string') return null;
  const deckId = candidate.id.trim();
  if (deckId.length === 0) return null;
  if (typeof candidate.name !== 'string') return null;
  const normalizedName = candidate.name.trim();
  if (normalizedName.length === 0) return null;
  if (!Array.isArray(candidate.cards)) return null;

  const cards = normalizeDeckCards(candidate.cards);

  if (cards.length === 0) return null;

  const now = Date.now();
  const createdAtRaw = Number(candidate.createdAt);
  const updatedAtRaw = Number(candidate.updatedAt);
  const createdAt =
    Number.isFinite(createdAtRaw) && createdAtRaw >= 0 ? Math.floor(createdAtRaw) : now;
  const normalizedUpdatedAt =
    Number.isFinite(updatedAtRaw) && updatedAtRaw >= 0 ? Math.floor(updatedAtRaw) : createdAt;

  return {
    id: deckId,
    name: normalizedName,
    cards,
    createdAt,
    updatedAt: Math.max(createdAt, normalizedUpdatedAt),
  };
}

function normalizeDecksState(value: unknown): DecksStorageState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<DecksStorageState>;
  if (candidate.version !== 1) return null;
  if (!Array.isArray(candidate.decks)) return null;

  const normalizedDecks = candidate.decks
    .map(normalizeDeck)
    .filter((deck): deck is SavedDeck => Boolean(deck));

  const decks: SavedDeck[] = [];
  const seenDeckIds = new Set<string>();
  for (const deck of normalizedDecks) {
    if (seenDeckIds.has(deck.id)) continue;
    seenDeckIds.add(deck.id);
    decks.push(deck);
  }

  const requestedActiveDeckId =
    typeof candidate.activeDeckId === 'string' ? candidate.activeDeckId.trim() : '';

  const activeDeckId =
    requestedActiveDeckId.length > 0 && decks.some((deck) => deck.id === requestedActiveDeckId)
      ? requestedActiveDeckId
      : null;

  return {
    version: 1,
    decks,
    activeDeckId,
  };
}

export function loadDecksState(): DecksStorageState {
  if (typeof window === 'undefined') return createDefaultDecksState();
  try {
    const raw = window.localStorage.getItem(DECKS_STORAGE_KEY);
    if (!raw) return createDefaultDecksState();
    const parsed = normalizeDecksState(JSON.parse(raw));
    return parsed ?? createDefaultDecksState();
  } catch {
    return createDefaultDecksState();
  }
}

export function saveDecksState(state: DecksStorageState): void {
  if (typeof window === 'undefined') return;
  try {
    const normalizedState = normalizeDecksState(state) ?? createDefaultDecksState();
    window.localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(normalizedState));
  } catch {
    // no-op: localStorage can be unavailable
  }
}

export function setActiveDeckId(state: DecksStorageState, deckId: string): DecksStorageState {
  const normalizedDeckId = deckId.trim();
  if (normalizedDeckId.length === 0) return state;
  if (!state.decks.some((deck) => deck.id === normalizedDeckId)) return state;
  return {
    ...state,
    activeDeckId: normalizedDeckId,
  };
}

export function getActiveDeck(state: DecksStorageState): SavedDeck | null {
  if (!state.activeDeckId) return null;
  return state.decks.find((deck) => deck.id === state.activeDeckId) ?? null;
}

export function expandDeckCardIds(deck: SavedDeck): string[] {
  const normalizedCards = normalizeDeckCards(deck.cards);
  const cardIds: string[] = [];
  for (const entry of normalizedCards) {
    for (let i = 0; i < entry.count; i++) {
      cardIds.push(entry.cardId);
      if (cardIds.length >= MAX_EXPANDED_DECK_SIZE) {
        return cardIds;
      }
    }
  }
  return cardIds;
}

