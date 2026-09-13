import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeckBuilder } from '../../src/components/game/DeckBuilder';
import type { DecksStorageState } from '../../src/utils/decksStorage';

const DECKS_STORAGE_KEY = 'omsk.decks.v1';

function getDeckNameInput(): HTMLInputElement {
  return screen.getByPlaceholderText('Например: Быстрый Омск') as HTMLInputElement;
}

describe('DeckBuilder validation hardening', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads malformed stored deck deterministically: trims name and merges duplicate card entries', () => {
    const malformedState = {
      version: 1,
      decks: [
        {
          id: 'deck-1',
          name: '  Stored Deck  ',
          cards: [
            { cardId: 'bird_omsk', count: 3 },
            { cardId: ' bird_omsk ', count: 6 },
            { cardId: 'dvornik', count: 2 },
            { cardId: 'missing-card', count: 7 },
          ],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      activeDeckId: 'deck-1',
    };
    window.localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(malformedState));

    render(<DeckBuilder onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Редактировать' }));

    expect(getDeckNameInput().value).toBe('Stored Deck');
    expect(screen.getAllByText(/Птица-Омич/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Дворник-Берсерк/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('x8')).toBeTruthy();
    expect(screen.getByText('x2')).toBeTruthy();
    expect(screen.queryByText(/missing-card/)).toBeNull();
    expect(screen.getByText(/Карт в текущей колоде:\s*10\s*\/\s*240/)).toBeTruthy();
  });

  it('saveDeck sends normalized payload to callback: trimmed name and merged card entries', () => {
    const onDecksChanged = vi.fn<(state: DecksStorageState) => void>();
    const initialState = {
      version: 1,
      decks: [
        {
          id: 'deck-1',
          name: 'Base Deck',
          cards: [
            { cardId: 'bird_omsk', count: 3 },
            { cardId: 'bird_omsk', count: 2 },
            { cardId: ' dvornik ', count: 1 },
          ],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      activeDeckId: null,
    };
    window.localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(initialState));

    render(<DeckBuilder onBack={vi.fn()} onDecksChanged={onDecksChanged} />);

    fireEvent.click(screen.getByRole('button', { name: 'Редактировать' }));

    fireEvent.change(getDeckNameInput(), { target: { value: '  Fresh Deck  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить колоду' }));

    const latestState = onDecksChanged.mock.calls[onDecksChanged.mock.calls.length - 1]?.[0];
    expect(latestState).toBeTruthy();
    expect(latestState.decks[0].name).toBe('Fresh Deck');
    expect(latestState.decks[0].cards).toEqual([
      { cardId: 'bird_omsk', count: 5 },
      { cardId: 'dvornik', count: 1 },
    ]);
    expect(latestState.activeDeckId).toBe(latestState.decks[0].id);
  });
});
