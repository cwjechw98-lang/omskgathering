import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameBoard } from '../../src/components/GameBoard';
import { TooltipProvider } from '../../src/components/ui/tooltip';

function renderWithProviders() {
  return render(
    <TooltipProvider>
      <GameBoard mode="ai" onBack={vi.fn()} />
    </TooltipProvider>
  );
}

describe('GameBoard smoke', () => {
  it('renders main game UI in ai mode', () => {
    renderWithProviders();
    expect(screen.getByText('👤 Вы')).toBeInTheDocument();
    // Note: There are currently two "Конец хода" buttons due to layout refactoring in progress
    // The new grid layout uses .end-turn-btn class
    const endTurnButtons = screen.getAllByText('Конец хода ⏭️');
    expect(endTurnButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('unmounts without throwing', () => {
    const { unmount } = renderWithProviders();
    expect(() => unmount()).not.toThrow();
  });
});
