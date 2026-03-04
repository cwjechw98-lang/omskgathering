import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GameBoard } from '../../src/components/GameBoard';

describe('GameBoard smoke', () => {
  it('renders main game UI in ai mode', () => {
    render(<GameBoard mode="ai" onBack={vi.fn()} />);
    expect(screen.getByText('👤 Вы')).toBeInTheDocument();
    expect(screen.getByText('Конец хода ⏭️')).toBeInTheDocument();
  });

  it('unmounts without throwing', () => {
    const { unmount } = render(<GameBoard mode="ai" onBack={vi.fn()} />);
    expect(() => unmount()).not.toThrow();
  });
});
