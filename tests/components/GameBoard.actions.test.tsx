import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameBoard } from '../../src/components/GameBoard';
import { TooltipProvider } from '../../src/components/ui/tooltip';

function renderBoard() {
  return render(
    <TooltipProvider>
      <GameBoard mode="local" onBack={vi.fn()} />
    </TooltipProvider>
  );
}

/**
 * Regression coverage for the handlers extracted from GameBoard into
 * `src/game/hooks/useGameActions.ts`. These tests exercise the real board so a
 * broken wiring between GameBoard and the hook fails loudly instead of silently
 * leaving the board non-interactive.
 */
describe('GameBoard game actions (useGameActions hook wiring)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('advances the turn when the end-turn button is clicked', () => {
    renderBoard();

    expect(screen.getByText(/Ход 1/)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Конец хода/));

    expect(screen.getByText(/Ход 2/)).toBeInTheDocument();
    expect(screen.queryByText(/Ход 1/)).not.toBeInTheDocument();
  });

  it('keeps the board interactive after several turns', () => {
    renderBoard();

    fireEvent.click(screen.getByText(/Конец хода/));
    fireEvent.click(screen.getByText(/Конец хода/));

    expect(screen.getByText(/Ход 3/)).toBeInTheDocument();
  });
});
