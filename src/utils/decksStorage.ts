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
/**
 * Ключи, которыми пользовались прежние сборки. Основной идёт первым,
 * остальные читаются только ради миграции — иначе колоды игрока пропадут молча.
 */
const LEGACY_DECKS_STORAGE_KEYS = [DECKS_STORAGE_KEY, 'omsk.decks', 'decksState'];
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
  // Прежние сборки писали карту просто строкой с её id.
  if (typeof value === 'string') {
    const cardId = value.trim();
    return cardId.length > 0 ? { cardId, count: 1 } : null;
  }
  if (!value || typeof value !== 'object') return null;
  const candidate = value as {
    cardId?: unknown;
    id?: unknown;
    count?: unknown;
    copies?: unknown;
  };
  // `id` — прежнее имя поля с идентификатором карты, `copies` — прежнее имя количества.
  const rawCardId = typeof candidate.cardId === 'string' ? candidate.cardId : candidate.id;
  if (typeof rawCardId !== 'string') return null;
  const cardId = rawCardId.trim();
  if (cardId.length === 0) return null;
  const rawCount = candidate.count ?? candidate.copies ?? 1;
  const count = Math.floor(Number(rawCount));
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

function normalizeDeck(value: unknown, index: number): SavedDeck | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as {
    id?: unknown;
    name?: unknown;
    cards?: unknown;
    cardIds?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  };

  // Прежние сборки допускали колоду без id и без имени, а карты клали в `cardIds`.
  // Опознаватель берём из позиции в массиве — он стабилен между загрузками.
  const rawDeckId = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  const deckId = rawDeckId.length > 0 ? rawDeckId : `legacy-deck-${index}`;

  const normalizedName =
    typeof candidate.name === 'string' && candidate.name.trim().length > 0
      ? candidate.name.trim()
      : 'Колода';

  const rawCards = Array.isArray(candidate.cards)
    ? candidate.cards
    : Array.isArray(candidate.cardIds)
      ? candidate.cardIds
      : null;
  if (!rawCards) return null;

  const cards = normalizeDeckCards(rawCards);

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
  const candidate = value as {
    version?: unknown;
    decks?: unknown;
    items?: unknown;
    activeDeckId?: unknown;
    selectedDeckId?: unknown;
  };

  // Записи прежних сборок не имели поля version — считаем их версией 1.
  // Всё, что явно помечено другой версией, по-прежнему отвергаем.
  if (candidate.version !== undefined && candidate.version !== 1) return null;

  const rawDecks = Array.isArray(candidate.decks)
    ? candidate.decks
    : Array.isArray(candidate.items)
      ? candidate.items
      : null;
  if (!rawDecks) return null;

  const normalizedDecks = rawDecks
    .map((deck, index) => normalizeDeck(deck, index))
    .filter((deck): deck is SavedDeck => Boolean(deck));

  const decks: SavedDeck[] = [];
  const seenDeckIds = new Set<string>();
  for (const deck of normalizedDecks) {
    if (seenDeckIds.has(deck.id)) continue;
    seenDeckIds.add(deck.id);
    decks.push(deck);
  }

  const rawActiveDeckId =
    typeof candidate.activeDeckId === 'string'
      ? candidate.activeDeckId
      : typeof candidate.selectedDeckId === 'string'
        ? candidate.selectedDeckId
        : '';
  const requestedActiveDeckId = rawActiveDeckId.trim();

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
  // Основной ключ идёт первым. Остальные читаем только ради миграции: если игрок
  // сохранял колоды в прежней сборке, без этого его данные исчезли бы молча.
  for (const key of LEGACY_DECKS_STORAGE_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = normalizeDecksState(JSON.parse(raw));
      if (parsed && parsed.decks.length > 0) return parsed;
    } catch {
      // Битый или экспериментальный формат — пробуем следующий ключ.
    }
  }
  return createDefaultDecksState();
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

