import { useMemo, useState } from 'react';
import { ALL_CARDS, CardType } from '../../data/cards';
import {
  DeckCardEntry,
  DecksStorageState,
  SavedDeck,
  loadDecksState,
  saveDecksState,
  setActiveDeckId,
} from '../../utils/decksStorage';
import { Button } from '../ui/button';

type DeckBuilderProps = {
  onBack: () => void;
  onDecksChanged?: (state: DecksStorageState) => void;
};

const CANDIDATE_CARDS = ALL_CARDS.filter((card) => card.id !== 'chinovnik');
const CARD_BY_ID = new Map(CANDIDATE_CARDS.map((card) => [card.id, card]));
const MAX_COPIES_PER_CARD = 8;
const MAX_EXPANDED_DECK_SIZE = 240;
const RECOMMENDED_DECK_SIZE = 40;
const DEFAULT_DECK_NAME = 'Новая колода';

type SortOption = 'name_asc' | 'cost_asc';

type EditorSnapshot = {
  deckName: string;
  counts: Record<string, number>;
};

const CARD_TYPE_LABELS: Record<CardType, string> = {
  creature: 'Существо',
  spell: 'Заклинание',
  enchantment: 'Чары',
  land: 'Земля',
};

function createDeckId(): string {
  return `deck_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function clampCardCount(raw: number, min = 0): number {
  const numericValue = Number(raw);
  if (!Number.isFinite(numericValue)) return min;
  return Math.min(MAX_COPIES_PER_CARD, Math.max(min, Math.floor(numericValue)));
}

function toDeckEntries(counts: Record<string, number>): DeckCardEntry[] {
  return Object.entries(counts)
    .filter(([cardId, count]) => CARD_BY_ID.has(cardId) && count > 0)
    .map(([cardId, count]) => ({ cardId, count: clampCardCount(count, 1) }))
    .sort((a, b) => a.cardId.localeCompare(b.cardId));
}

function getTotalCards(counts: Record<string, number>): number {
  return Object.values(counts).reduce((acc, value) => acc + clampCardCount(value), 0);
}

function entriesToCounts(entries: DeckCardEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  let remainingTotal = MAX_EXPANDED_DECK_SIZE;

  for (const entry of entries) {
    if (remainingTotal <= 0) break;
    if (!CARD_BY_ID.has(entry.cardId)) continue;

    const normalizedCount = clampCardCount(entry.count, 1);
    const current = counts[entry.cardId] ?? 0;
    const mergedCount = Math.min(MAX_COPIES_PER_CARD, current + normalizedCount);
    const addedCopies = mergedCount - current;

    if (addedCopies <= 0) continue;

    const allowedCopies = Math.min(addedCopies, remainingTotal);
    if (allowedCopies <= 0) break;

    counts[entry.cardId] = current + allowedCopies;
    remainingTotal -= allowedCopies;
  }
  return counts;
}

function normalizeEntriesForSave(entries: DeckCardEntry[]): DeckCardEntry[] {
  return toDeckEntries(entriesToCounts(entries));
}

function normalizeCountsForSnapshot(raw: Record<string, number>): Record<string, number> {
  const normalizedCounts = entriesToCounts(
    Object.entries(raw).map(([cardId, count]) => ({
      cardId,
      count,
    }))
  );

  return Object.entries(normalizedCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce<Record<string, number>>((acc, [cardId, count]) => {
      acc[cardId] = count;
      return acc;
    }, {});
}

function createSnapshot(deckName: string, rawCounts: Record<string, number>): EditorSnapshot {
  return {
    deckName: deckName.trim(),
    counts: normalizeCountsForSnapshot(rawCounts),
  };
}

function areSnapshotsEqual(a: EditorSnapshot, b: EditorSnapshot): boolean {
  if (a.deckName !== b.deckName) return false;
  const aKeys = Object.keys(a.counts);
  const bKeys = Object.keys(b.counts);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => a.counts[key] === b.counts[key]);
}

function createDuplicateDeckName(existingDecks: SavedDeck[], baseName: string): string {
  const normalizedBase = baseName.trim() || DEFAULT_DECK_NAME;
  const firstCandidate = `${normalizedBase} (копия)`;
  const hasFirstCandidate = existingDecks.some((deck) => deck.name === firstCandidate);
  if (!hasFirstCandidate) return firstCandidate;

  let index = 2;
  while (existingDecks.some((deck) => deck.name === `${normalizedBase} (копия ${index})`)) {
    index += 1;
  }
  return `${normalizedBase} (копия ${index})`;
}

function getFallbackActiveDeckIdAfterDeletion(decks: SavedDeck[], deletedDeckId: string): string | null {
  const deletedIndex = decks.findIndex((deck) => deck.id === deletedDeckId);
  const remainingDecks = decks.filter((deck) => deck.id !== deletedDeckId);

  if (remainingDecks.length === 0) return null;
  if (deletedIndex < 0) return remainingDecks[0].id;

  const logicalNext = remainingDecks[deletedIndex] ?? remainingDecks[deletedIndex - 1];
  return logicalNext?.id ?? null;
}

export function DeckBuilder({ onBack, onDecksChanged }: DeckBuilderProps) {
  const [storageState, setStorageState] = useState<DecksStorageState>(() => loadDecksState());
  const [deckName, setDeckName] = useState(DEFAULT_DECK_NAME);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadedDeckId, setLoadedDeckId] = useState<string | null>(null);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<EditorSnapshot>(() =>
    createSnapshot(DEFAULT_DECK_NAME, {})
  );
  const [status, setStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | CardType>('all');
  const [costFilter, setCostFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<SortOption>('name_asc');

  const totalCards = useMemo(() => getTotalCards(counts), [counts]);

  const editableEntries = useMemo(() => {
    const entries = Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([cardId, count]) => ({ cardId, count, card: CARD_BY_ID.get(cardId) }))
      .filter((entry): entry is { cardId: string; count: number; card: (typeof CANDIDATE_CARDS)[number] } =>
        Boolean(entry.card)
      )
      .sort((a, b) => a.card.name.localeCompare(b.card.name));
    return entries;
  }, [counts]);

  const availableCosts = useMemo(() => {
    return Array.from(new Set(CANDIDATE_CARDS.map((card) => card.cost))).sort((a, b) => a - b);
  }, []);

  const filteredCards = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const filtered = CANDIDATE_CARDS.filter((card) => {
      const matchesSearch = normalizedSearch.length === 0 || card.name.toLowerCase().includes(normalizedSearch);
      const matchesType = typeFilter === 'all' || card.type === typeFilter;
      const matchesCost = costFilter === 'all' || card.cost === Number(costFilter);
      return matchesSearch && matchesType && matchesCost;
    });

    return filtered.sort((a, b) => {
      if (sortOption === 'cost_asc') {
        if (a.cost !== b.cost) return a.cost - b.cost;
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }, [costFilter, searchQuery, sortOption, typeFilter]);

  const landsInDeck = useMemo(() => {
    return Object.entries(counts).reduce((acc, [cardId, count]) => {
      const card = CARD_BY_ID.get(cardId);
      if (card?.type === 'land') return acc + count;
      return acc;
    }, 0);
  }, [counts]);

  const deckSizeHint = useMemo(() => {
    if (totalCards < RECOMMENDED_DECK_SIZE) {
      return {
        tone: 'warning' as const,
        text: `Рекомендуемый размер колоды: ${RECOMMENDED_DECK_SIZE}. Сейчас не хватает ${RECOMMENDED_DECK_SIZE - totalCards} карт.`,
      };
    }
    if (totalCards > RECOMMENDED_DECK_SIZE) {
      return {
        tone: 'warning' as const,
        text: `Рекомендуемый размер колоды: ${RECOMMENDED_DECK_SIZE}. Сейчас на ${totalCards - RECOMMENDED_DECK_SIZE} карт больше.`,
      };
    }
    return {
      tone: 'ok' as const,
      text: `Размер колоды соответствует рекомендации: ${RECOMMENDED_DECK_SIZE} карт.`,
    };
  }, [totalCards]);

  const landsHint = useMemo(() => {
    if (totalCards === 0) {
      return {
        tone: 'neutral' as const,
        text: 'Рекомендация по землям появится после добавления карт.',
      };
    }

    const minLands = Math.max(1, Math.floor(totalCards * 0.35));
    const maxLands = Math.max(1, Math.ceil(totalCards * 0.45));

    if (landsInDeck < minLands) {
      return {
        tone: 'warning' as const,
        text: `Земель маловато: ${landsInDeck}. Рекомендуется ${minLands}–${maxLands}.`,
      };
    }

    if (landsInDeck > maxLands) {
      return {
        tone: 'warning' as const,
        text: `Земель многовато: ${landsInDeck}. Рекомендуется ${minLands}–${maxLands}.`,
      };
    }

    return {
      tone: 'ok' as const,
      text: `Земли в норме: ${landsInDeck} (рекомендация ${minLands}–${maxLands}).`,
    };
  }, [landsInDeck, totalCards]);

  const hasUnsavedChanges = useMemo(() => {
    const currentSnapshot = createSnapshot(deckName, counts);
    return !areSnapshotsEqual(currentSnapshot, lastSavedSnapshot);
  }, [counts, deckName, lastSavedSnapshot]);

  const persistState = (next: DecksStorageState) => {
    setStorageState(next);
    saveDecksState(next);
    onDecksChanged?.(next);
  };

  const changeCount = (cardId: string, delta: number) => {
    if (!CARD_BY_ID.has(cardId)) {
      setStatus('Нельзя изменить количество: карта не найдена.');
      return;
    }

    const normalizedDelta = Math.trunc(Number(delta));
    if (!Number.isFinite(normalizedDelta) || normalizedDelta === 0) return;

    setCounts((prev) => {
      const current = prev[cardId] ?? 0;
      const currentTotal = getTotalCards(prev);

      if (normalizedDelta > 0 && currentTotal >= MAX_EXPANDED_DECK_SIZE) {
        setStatus(`Достигнут максимальный размер колоды: ${MAX_EXPANDED_DECK_SIZE} карт.`);
        return prev;
      }

      let next = clampCardCount(current + normalizedDelta);

      if (normalizedDelta > 0 && next > current) {
        const maxAllowedForCard = Math.min(MAX_COPIES_PER_CARD, current + (MAX_EXPANDED_DECK_SIZE - currentTotal));
        if (next > maxAllowedForCard) {
          next = maxAllowedForCard;
        }
      }

      if (next === current && normalizedDelta > 0) {
        setStatus(`Нельзя добавить больше карт: максимум ${MAX_EXPANDED_DECK_SIZE} в колоде.`);
        return prev;
      }

      if (next === 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [cardId]: removedCardCount, ...rest } = prev;
        setStatus(null);
        return rest;
      }

      if (normalizedDelta > 0 && getTotalCards({ ...prev, [cardId]: next }) >= MAX_EXPANDED_DECK_SIZE) {
        setStatus(`Достигнут лимит: ${MAX_EXPANDED_DECK_SIZE} карт в колоде.`);
      } else if (normalizedDelta !== 0) {
        setStatus(null);
      }

      return { ...prev, [cardId]: next };
    });
  };

  const saveDeck = () => {
    const trimmedName = deckName.trim();
    const entries = normalizeEntriesForSave(toDeckEntries(counts));
    const total = entries.reduce((acc, entry) => acc + entry.count, 0);

    if (!trimmedName) {
      setStatus('Введите имя колоды.');
      return;
    }

    if (entries.length === 0) {
      setStatus('Добавьте хотя бы 1 карту в колоду.');
      return;
    }

    if (total > MAX_EXPANDED_DECK_SIZE) {
      setStatus(`Сохранение невозможно: в колоде ${total} карт, максимум ${MAX_EXPANDED_DECK_SIZE}.`);
      return;
    }

    const now = Date.now();
    const maybeExisting = storageState.decks.find((deck) => deck.name === trimmedName);

    let nextDecks: SavedDeck[];
    let deckIdToActivate: string;

    if (maybeExisting) {
      const updated: SavedDeck = {
        ...maybeExisting,
        cards: entries,
        updatedAt: now,
      };
      nextDecks = storageState.decks.map((deck) => (deck.id === maybeExisting.id ? updated : deck));
      deckIdToActivate = maybeExisting.id;
    } else {
      const created: SavedDeck = {
        id: createDeckId(),
        name: trimmedName,
        cards: entries,
        createdAt: now,
        updatedAt: now,
      };
      nextDecks = [created, ...storageState.decks];
      deckIdToActivate = created.id;
    }

    const withDecks: DecksStorageState = {
      version: 1,
      decks: nextDecks,
      activeDeckId: storageState.activeDeckId,
    };
    const nextState = setActiveDeckId(withDecks, deckIdToActivate);
    persistState(nextState);
    setLoadedDeckId(deckIdToActivate);
    setLastSavedSnapshot(createSnapshot(trimmedName, counts));
    setStatus('Колода сохранена и выбрана активной.');
  };

  const loadIntoEditor = (deck: SavedDeck) => {
    const nextCounts = entriesToCounts(Array.isArray(deck.cards) ? deck.cards : []);
    const normalizedDeckName = deck.name.trim() || DEFAULT_DECK_NAME;
    const normalizedDeckId = deck.id.trim();

    setDeckName(normalizedDeckName);
    setCounts(nextCounts);
    setLoadedDeckId(normalizedDeckId.length > 0 ? normalizedDeckId : null);
    setLastSavedSnapshot(createSnapshot(normalizedDeckName, nextCounts));
    setStatus(`Колода «${normalizedDeckName}» загружена в редактор.`);
  };

  const activateDeck = (deckId: string) => {
    const next = setActiveDeckId(storageState, deckId);
    persistState(next);
    const deck = next.decks.find((item) => item.id === deckId);
    setStatus(deck ? `Активная колода: ${deck.name}` : 'Активная колода обновлена.');
  };

  const duplicateDeck = (deck: SavedDeck) => {
    const now = Date.now();
    const normalizedCards = normalizeEntriesForSave(deck.cards);
    if (normalizedCards.length === 0) {
      setStatus('Нельзя дублировать колоду без валидных карт.');
      return;
    }

    const duplicated: SavedDeck = {
      ...deck,
      id: createDeckId(),
      name: createDuplicateDeckName(storageState.decks, deck.name),
      cards: normalizedCards,
      createdAt: now,
      updatedAt: now,
    };

    const nextState: DecksStorageState = {
      version: 1,
      decks: [duplicated, ...storageState.decks],
      activeDeckId: storageState.activeDeckId,
    };

    persistState(nextState);
    setStatus(`Колода «${deck.name}» дублирована как «${duplicated.name}».`);
  };

  const deleteDeck = (deck: SavedDeck) => {
    const nextDecks = storageState.decks.filter((item) => item.id !== deck.id);
    const wasActive = storageState.activeDeckId === deck.id;
    const fallbackActiveDeckId = wasActive
      ? getFallbackActiveDeckIdAfterDeletion(storageState.decks, deck.id)
      : storageState.activeDeckId;
    const wasLoadedInEditor = loadedDeckId === deck.id;

    let nextState: DecksStorageState = {
      version: 1,
      decks: nextDecks,
      activeDeckId: wasActive ? null : storageState.activeDeckId,
    };

    if (wasActive && fallbackActiveDeckId) {
      nextState = setActiveDeckId(nextState, fallbackActiveDeckId);
    }

    persistState(nextState);

    if (wasLoadedInEditor) {
      setDeckName(DEFAULT_DECK_NAME);
      setCounts({});
      setLoadedDeckId(null);
      setLastSavedSnapshot(createSnapshot(DEFAULT_DECK_NAME, {}));
    }

    const statusParts = [`Колода «${deck.name}» удалена.`];

    if (wasActive) {
      const newActive = nextState.decks.find((item) => item.id === nextState.activeDeckId);
      if (newActive) {
        statusParts.push(`Активная колода: ${newActive.name}.`);
      } else {
        statusParts.push('Активной колоды больше нет.');
      }
    }

    if (wasLoadedInEditor) {
      statusParts.push('Редактор сброшен к новой пустой колоде.');
    }

    setStatus(statusParts.join(' '));
  };

  return (
    <div className="h-[100dvh] bg-[#0a0a0f] text-white overflow-y-auto p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-title text-2xl text-gold-light">🧱 Deck Builder</h2>
          <Button variant="nav" onClick={onBack}>
            ← Назад
          </Button>
        </div>

        <div className="bg-[#11111a] border border-[#c9a84c]/20 rounded-lg p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <label className="text-sm text-gray-300">Имя колоды</label>
            <input
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              className="bg-[#1a1a24] border border-gray-700 rounded px-3 py-2 text-sm flex-1"
              placeholder="Например: Быстрый Омск"
            />
            <Button variant="mythic" onClick={saveDeck}>
              Сохранить колоду
            </Button>
          </div>
          <div className="text-xs text-gray-400">
            Карт в текущей колоде: {totalCards} / {MAX_EXPANDED_DECK_SIZE}
          </div>
          <div className={`text-xs ${hasUnsavedChanges ? 'text-amber-300' : 'text-emerald-300'}`}>
            {hasUnsavedChanges ? 'Есть несохранённые изменения' : 'Все изменения сохранены'}
          </div>
          <div className={`text-xs ${deckSizeHint.tone === 'ok' ? 'text-emerald-300' : 'text-amber-300'}`}>
            {deckSizeHint.text}
          </div>
          <div
            className={`text-xs ${
              landsHint.tone === 'ok'
                ? 'text-emerald-300'
                : landsHint.tone === 'warning'
                  ? 'text-amber-300'
                  : 'text-gray-400'
            }`}
          >
            {landsHint.text}
          </div>
          {status && <div className="text-xs text-[#c9a84c]">{status}</div>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#11111a] border border-[#c9a84c]/20 rounded-lg p-4">
            <h3 className="font-heading text-[#f0d68a] mb-3">Доступные карты</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#1a1a24] border border-gray-700 rounded px-3 py-2 text-sm sm:col-span-2"
                placeholder="Поиск по названию карты"
                aria-label="Поиск по названию карты"
              />

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | CardType)}
                className="bg-[#1a1a24] border border-gray-700 rounded px-3 py-2 text-sm"
                aria-label="Фильтр по типу карты"
              >
                <option value="all">Все типы</option>
                <option value="creature">{CARD_TYPE_LABELS.creature}</option>
                <option value="spell">{CARD_TYPE_LABELS.spell}</option>
                <option value="enchantment">{CARD_TYPE_LABELS.enchantment}</option>
                <option value="land">{CARD_TYPE_LABELS.land}</option>
              </select>

              <select
                value={costFilter}
                onChange={(e) => setCostFilter(e.target.value)}
                className="bg-[#1a1a24] border border-gray-700 rounded px-3 py-2 text-sm"
                aria-label="Фильтр по стоимости"
              >
                <option value="all">Любая стоимость</option>
                {availableCosts.map((cost) => (
                  <option key={cost} value={String(cost)}>
                    Стоимость: {cost}
                  </option>
                ))}
              </select>

              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-[#1a1a24] border border-gray-700 rounded px-3 py-2 text-sm sm:col-span-2"
                aria-label="Сортировка списка карт"
              >
                <option value="name_asc">Сортировка: по имени</option>
                <option value="cost_asc">Сортировка: по стоимости</option>
              </select>
            </div>

            <div className="text-[11px] text-gray-500 mb-2">Найдено карт: {filteredCards.length}</div>
            <div className="max-h-[55dvh] overflow-y-auto space-y-2 pr-1">
              {filteredCards.length === 0 ? (
                <div className="text-xs text-gray-500">По текущим условиям карты не найдены.</div>
              ) : (
                filteredCards.map((card) => {
                  const count = counts[card.id] ?? 0;
                  const canIncrement = count < MAX_COPIES_PER_CARD && totalCards < MAX_EXPANDED_DECK_SIZE;
                  return (
                    <div
                      key={card.id}
                      className="flex items-center justify-between gap-2 border border-gray-800 rounded px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm truncate">
                          {card.emoji} {card.name}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {CARD_TYPE_LABELS[card.type]} · Стоимость {card.cost}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          className="tap-target rounded bg-[#2a2a36] px-2 hover:bg-[#3a3a4a]"
                          onClick={() => changeCount(card.id, -1)}
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm">{count}</span>
                        <button
                          className="tap-target rounded bg-[#2a2a36] px-2 hover:bg-[#3a3a4a] disabled:opacity-40 disabled:cursor-not-allowed"
                          onClick={() => changeCount(card.id, 1)}
                          disabled={!canIncrement}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#11111a] border border-[#c9a84c]/20 rounded-lg p-4">
              <h3 className="font-heading text-[#f0d68a] mb-3">Редактируемая колода</h3>
              <div className="max-h-[24dvh] overflow-y-auto space-y-1 pr-1">
                {editableEntries.length === 0 ? (
                  <div className="text-xs text-gray-500">Пока пусто.</div>
                ) : (
                  editableEntries.map((entry) => (
                    <div key={entry.cardId} className="flex items-center justify-between text-sm">
                      <span className="truncate pr-2">
                        {entry.card.emoji} {entry.card.name}
                      </span>
                      <span className="text-gray-300">x{entry.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#11111a] border border-[#c9a84c]/20 rounded-lg p-4">
              <h3 className="font-heading text-[#f0d68a] mb-3">Сохранённые колоды</h3>
              <div className="max-h-[24dvh] overflow-y-auto space-y-2 pr-1">
                {storageState.decks.length === 0 ? (
                  <div className="text-xs text-gray-500">Нет сохранённых колод.</div>
                ) : (
                  storageState.decks.map((deck) => {
                    const cardsTotal = deck.cards.reduce((acc, item) => acc + item.count, 0);
                    const isActive = storageState.activeDeckId === deck.id;
                    return (
                      <div key={deck.id} className="border border-gray-800 rounded p-2 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium truncate">{deck.name}</div>
                          {isActive && (
                            <span className="text-[10px] bg-[#5a4010] text-[#f0d68a] px-2 py-0.5 rounded">
                              active
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500">{cardsTotal} карт</div>
                        {/* flex-wrap: на 390 px четыре кнопки в одну строку сжимались,
                            и подписи обрезались на 4–9 px (замер: scripts/ui-audit.mjs) */}
                        <div className="flex flex-wrap gap-2">
                          <Button variant="nav" size="sm" onClick={() => loadIntoEditor(deck)}>
                            Редактировать
                          </Button>
                          <Button variant="blue" size="sm" onClick={() => activateDeck(deck.id)}>
                            Сделать активной
                          </Button>
                          <Button variant="purple" size="sm" onClick={() => duplicateDeck(deck)}>
                            Дублировать
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteDeck(deck)}>
                            Удалить
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

