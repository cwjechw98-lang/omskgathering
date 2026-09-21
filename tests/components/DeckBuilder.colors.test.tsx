import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeckBuilder } from '../../src/components/game/DeckBuilder';

/**
 * Проверка того, что выбор цвета действительно работает в интерфейсе, а не только
 * в данных. Логика разметки покрыта tests/game/colors.test.ts; здесь проверяется
 * связка: нажатие на цвет сужает пул доступных карт.
 */

const DECKS_STORAGE_KEY = 'omsk.decks.v1';

/** Пустая сохранённая колода — чтобы у конструктора была кнопка «Редактировать». */
const EMPTY_DECK_STATE = {
  version: 1,
  decks: [{ id: 'deck-1', name: 'Тест', cards: [], createdAt: 1, updatedAt: 1 }],
  activeDeckId: 'deck-1',
};

function openEditor() {
  render(<DeckBuilder onBack={vi.fn()} />);
  // С активной колодой редактор открыт сразу; кнопка нужна только если он закрыт.
  const editButton = screen.queryByRole('button', { name: 'Редактировать' });
  if (editButton) fireEvent.click(editButton);
}

/** Текст выбранных цветов: у кнопок цвета есть aria-pressed. */
function pressedColors(): string[] {
  return screen
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent ?? '');
}

describe('DeckBuilder: выбор цвета колоды', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(EMPTY_DECK_STATE));
  });

  it('показывает кнопку каждого из шести цветов', () => {
    openEditor();

    for (const name of ['Белый', 'Синий', 'Чёрный', 'Красный', 'Зелёный', 'Бесцветный']) {
      expect(screen.getByRole('button', { name: new RegExp(name) }), `нет кнопки ${name}`).toBeTruthy();
    }
    // Ничего не выбрано — пул не ограничен.
    expect(pressedColors()).toHaveLength(0);
  });

  it('выбор цвета сужает пул доступных карт', () => {
    openEditor();

    // До выбора в пуле есть карты разных цветов.
    expect(screen.queryByText(/Яма на Дороге/)).toBeTruthy();
    expect(screen.queryByText(/Бабушка с Метро/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Белый/ }));

    // Чёрная карта ушла из пула, белая осталась.
    expect(screen.queryByText(/Яма на Дороге/)).toBeNull();
    expect(screen.queryByText(/Бабушка с Метро/)).toBeTruthy();
  });

  it('«Показать все» возвращает полный пул', () => {
    openEditor();

    fireEvent.click(screen.getByRole('button', { name: /Белый/ }));
    expect(screen.queryByText(/Яма на Дороге/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Показать все' }));
    expect(screen.queryByText(/Яма на Дороге/)).toBeTruthy();
    expect(pressedColors()).toHaveLength(0);
  });

  it('больше двух цветов не берётся: третий заменяет самый давний', () => {
    openEditor();

    fireEvent.click(screen.getByRole('button', { name: /Белый/ }));
    fireEvent.click(screen.getByRole('button', { name: /Синий/ }));
    fireEvent.click(screen.getByRole('button', { name: /Красный/ }));

    const selected = pressedColors().join(' ');
    expect(pressedColors()).toHaveLength(2);
    expect(selected).toContain('Синий');
    expect(selected).toContain('Красный');
    expect(selected).not.toContain('Белый');
  });

  it('повторное нажатие снимает выбор цвета', () => {
    openEditor();

    fireEvent.click(screen.getByRole('button', { name: /Зелёный/ }));
    expect(pressedColors()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /Зелёный/ }));
    expect(pressedColors()).toHaveLength(0);
  });
});
