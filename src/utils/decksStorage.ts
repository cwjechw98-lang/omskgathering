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
  if (typeof candidate.cardId !== 'string' || candidate.cardId.length === 0) return null;
  const count = Math.floor(Number(candidate.count));
  if (!Number.isFinite(count) || count <= 0) return null;
  const safeCount = Math.min(count, MAX_COPIES_PER_CARD);

  return {
    cardId: candidate.cardId,
    count: safeCount,
  };
}

function normalizeDeck(value: unknown): SavedDeck | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<SavedDeck>;
  if (typeof candidate.id !== 'string' || candidate.id.length === 0) return null;
  if (typeof candidate.name !== 'string' || candidate.name.trim().length === 0) return null;
  if (!Array.isArray(candidate.cards)) return null;

  const cards = candidate.cards
    .map(normalizeDeckCardEntry)
    .filter((entry): entry is DeckCardEntry => Boolean(entry));

  if (cards.length === 0) return null;

  const createdAt = Number(candidate.createdAt);
  const updatedAt = Number(candidate.updatedAt);

  return {
    id: candidate.id,
    name: candidate.name.trim(),
    cards,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now(),
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
  };
}

function normalizeDecksState(value: unknown): DecksStorageState | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<DecksStorageState>;
  if (candidate.version !== 1) return null;
  if (!Array.isArray(candidate.decks)) return null;

  const decks = candidate.decks
    .map(normalizeDeck)
    .filter((deck): deck is SavedDeck => Boolean(deck));

  const activeDeckId =
    typeof candidate.activeDeckId === 'string' && decks.some((deck) => deck.id === candidate.activeDeckId)
      ? candidate.activeDeckId
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
    window.localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // no-op: localStorage can be unavailable
  }
}

export function setActiveDeckId(state: DecksStorageState, deckId: string): DecksStorageState {
  if (!state.decks.some((deck) => deck.id === deckId)) return state;
  return {
    ...state,
    activeDeckId: deckId,
  };
}

export function getActiveDeck(state: DecksStorageState): SavedDeck | null {
  if (!state.activeDeckId) return null;
  return state.decks.find((deck) => deck.id === state.activeDeckId) ?? null;
}

export function expandDeckCardIds(deck: SavedDeck): string[] {
  const cardIds: string[] = [];
  for (const entry of deck.cards) {
    const copies = Math.min(Math.max(0, Math.floor(entry.count)), MAX_COPIES_PER_CARD);
    for (let i = 0; i < copies; i++) {
      cardIds.push(entry.cardId);
      if (cardIds.length >= MAX_EXPANDED_DECK_SIZE) {
        return cardIds;
      }
    }
  }
  return cardIds;
}

