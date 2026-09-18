import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { PhaseIndicator } from '../../src/components/game/PhaseIndicator';
import { Tutorial } from '../../src/components/game/Tutorial';
import { createInitialTutorialProgress } from '../../src/utils/tutorialProgress';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeMockGameState(overrides?: Partial<any>): any {
  return {
    currentPlayer: 'player1',
    turnNumber: 1,
    gameOver: false,
    player1: {
      health: 30,
      maxHealth: 30,
      mana: 3,
      maxMana: 3,
      hand: [],
      field: [],
      deck: [],
      graveyard: [],
      enchantments: [],
      landsPlayed: 0,
      maxLandsPerTurn: 1,
    },
    player2: {
      health: 30,
      maxHealth: 30,
      mana: 3,
      maxMana: 3,
      hand: [],
      field: [],
      deck: [],
      graveyard: [],
      enchantments: [],
      landsPlayed: 0,
      maxLandsPerTurn: 1,
    },
    log: [],
    ...overrides,
  };
}

// Компонент-«бомба» для тестирования ErrorBoundary
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test explosion');
  return <div>все хорошо</div>;
}

// ─── ErrorBoundary ─────────────────────────────────────────────────────────────

describe('ErrorBoundary', () => {
  it('рендерит children без ошибок', () => {
    render(
      <ErrorBoundary>
        <div>дочерний элемент</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('дочерний элемент')).toBeTruthy();
  });

  it('показывает fallback-UI при ошибке', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Произошла ошибка')).toBeTruthy();
    spy.mockRestore();
  });

  it('показывает кастомный fallbackTitle', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary fallbackTitle="Кастомная ошибка">
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Кастомная ошибка')).toBeTruthy();
    spy.mockRestore();
  });

  it('кнопка «Перезагрузить» видна при ошибке', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText('Перезагрузить')).toBeTruthy();
    spy.mockRestore();
  });
});

// ─── PhaseIndicator ────────────────────────────────────────────────────────────

describe('PhaseIndicator', () => {
  it('рендерит 4 фазы', () => {
    const gs = makeMockGameState();
    render(<PhaseIndicator gameState={gs} isMyTurn playerKey="player1" />);
    expect(screen.getByText('Земля')).toBeTruthy();
    expect(screen.getByText('Основная')).toBeTruthy();
    expect(screen.getByText('Бой')).toBeTruthy();
    expect(screen.getByText('Конец')).toBeTruthy();
  });

  it('показывает фазу «done» когда isMyTurn=false', () => {
    const gs = makeMockGameState();
    const { container } = render(
      <PhaseIndicator gameState={gs} isMyTurn={false} playerKey="player1" />
    );
    // При isMyTurn=false активна фаза 'done' — последний элемент получает класс с font-bold
    const items = container.querySelectorAll('[class*="font-bold"]');
    // Ищем элемент с текстом «Конец» с подсветкой
    const doneEl = Array.from(container.querySelectorAll('div')).find(
      (el) => el.textContent?.includes('Конец') && el.className.includes('font-bold')
    );
    expect(doneEl).toBeTruthy();
  });

  it('подсвечивает активную фазу', () => {
    const gs = makeMockGameState();
    // mana=3 > 0, нет земель в руке => фаза 'play'
    const { container } = render(
      <PhaseIndicator gameState={gs} isMyTurn playerKey="player1" />
    );
    const activeEl = Array.from(container.querySelectorAll('div')).find(
      (el) => el.textContent?.includes('Основная') && el.className.includes('font-bold')
    );
    expect(activeEl).toBeTruthy();
  });
});

// ─── Tutorial ─────────────────────────────────────────────────────────────────

const noLearned = createInitialTutorialProgress().learned;

describe('Tutorial', () => {
  beforeEach(() => localStorage.clear());

  it('показывает урок про землю и номер шага', () => {
    render(
      <Tutorial
        hint={{ lesson: 1, variant: 'action' }}
        learned={noLearned}
        mana={1}
        requiredMana={null}
        onSkip={() => {}}
      />
    );
    expect(screen.getByText(/Шаг 1 из 4/)).toBeTruthy();
    expect(screen.getByText(/Сыграйте ЗЕМЛЮ/)).toBeTruthy();
  });

  it('в состоянии ожидания объясняет нехватку маны, но номер шага не меняет', () => {
    render(
      <Tutorial
        hint={{ lesson: 2, variant: 'wait', requiredMana: 3 }}
        learned={{ ...noLearned, land: true }}
        mana={1}
        requiredMana={3}
        onSkip={() => {}}
      />
    );
    expect(screen.getByText(/Шаг 2 из 4/)).toBeTruthy();
    expect(screen.getByText(/Маны пока мало/)).toBeTruthy();
    expect(screen.getByText(/стоит 3, а у вас 1 маны/)).toBeTruthy();
  });

  it('в состоянии терпения объясняет болезнь призыва', () => {
    render(
      <Tutorial
        hint={{ lesson: 3, variant: 'patience', reason: 'attack' }}
        learned={{ ...noLearned, land: true, nonLand: true }}
        mana={3}
        requiredMana={null}
        onSkip={() => {}}
      />
    );
    expect(screen.getByText(/Шаг 3 из 4/)).toBeTruthy();
    expect(screen.getByText(/болезнью призыва/)).toBeTruthy();
  });

  it('кнопка «Пропустить» вызывает onSkip и прячет панель', () => {
    const onSkip = vi.fn();
    render(
      <Tutorial
        hint={{ lesson: 4, variant: 'action' }}
        learned={{ ...noLearned, land: true, nonLand: true, attack: true }}
        mana={3}
        requiredMana={null}
        onSkip={onSkip}
      />
    );
    fireEvent.click(screen.getByText(/Пропустить/));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Шаг 4 из 4/)).toBeNull();
  });
});
