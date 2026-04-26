import { useState } from 'react';
import { GameState } from '../../game/types';

const TUTORIAL_STORAGE_KEY = 'tutorialCompleted';

interface TutorialStep {
  id: number;
  emoji: string;
  title: string;
  description: string;
  spotlight: 'hand' | 'player-board' | 'end-turn' | null;
}

const STEPS: TutorialStep[] = [
  {
    id: 1,
    emoji: '🏔️',
    title: 'Сыграйте ЗЕМЛЮ',
    description:
      'Перетащите карту Земли из руки на поле или дважды кликните по ней. Земля даёт ману для игры других карт.',
    spotlight: 'hand',
  },
  {
    id: 2,
    emoji: '⚔️',
    title: 'Сыграйте СУЩЕСТВО или ЗАКЛИНАНИЕ',
    description:
      'Используйте ману для разыгрывания карт из руки. Перетащите карту на поле или дважды кликните по ней.',
    spotlight: 'hand',
  },
  {
    id: 3,
    emoji: '💥',
    title: 'АТАКУЙТЕ противника',
    description:
      'Кликните по существу с зелёной рамкой (⚔️), затем выберите цель — вражеское существо или кнопку «В героя».',
    spotlight: 'player-board',
  },
  {
    id: 4,
    emoji: '⏭️',
    title: 'Нажмите КОНЕЦ ХОДА',
    description:
      'Завершите свой ход нажатием кнопки «Конец хода». Вы получите ману и карту в начале следующего хода.',
    spotlight: 'end-turn',
  },
];

interface TutorialProps {
  gameState: GameState;
  playerKey: 'player1' | 'player2';
  onSkip: () => void;
}

function getActiveStep(gameState: GameState, playerKey: 'player1' | 'player2'): number {
  const me = gameState[playerKey];
  const hasLands =
    me.hand.some((c) => c.data.type === 'land') && me.landsPlayed < me.maxLandsPerTurn;
  const hasPlayable = me.hand.some((c) => c.data.type !== 'land' && c.data.cost <= me.mana);
  const hasAttackers = me.field.some(
    (c) =>
      !c.summoningSickness && !c.hasAttacked && c.frozen <= 0 && !c.keywords.includes('defender')
  );

  if (hasLands && me.landsPlayed === 0) return 1;
  if (hasPlayable || me.mana > 0) return 2;
  if (hasAttackers) return 3;
  return 4;
}

export function Tutorial({ gameState, playerKey, onSkip }: TutorialProps) {
  const [completed] = useState(() => localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true');
  const [dismissed, setDismissed] = useState(false);

  if (completed || dismissed) return null;

  const stepIndex = getActiveStep(gameState, playerKey) - 1;
  const currentStep = STEPS[Math.min(stepIndex, STEPS.length - 1)];

  const handleSkip = () => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setDismissed(true);
    onSkip();
  };

  const spotlightClass = (() => {
    switch (currentStep.spotlight) {
      case 'hand':
        return 'tutorial-spotlight-hand';
      case 'player-board':
        return 'tutorial-spotlight-board';
      case 'end-turn':
        return 'tutorial-spotlight-endturn';
      default:
        return '';
    }
  })();

  return (
    <>
      {/* Dark overlay */}
      <div
        className={`tutorial-overlay fixed inset-0 z-[86] pointer-events-none ${spotlightClass}`}
        aria-hidden="true"
      />

      {/* Hint card */}
      <div
        className="tutorial-hint-panel fixed bottom-[clamp(120px,18vh,200px)] left-1/2 -translate-x-1/2 z-[95] pointer-events-auto"
        style={{ width: 'clamp(280px, 60vw, 420px)' }}
      >
        <div
          className="rounded-2xl border border-[#c9a84c]/50 shadow-2xl shadow-black/60 p-4"
          style={{ background: '#1a1a24', color: '#c9a84c' }}
        >
          {/* Step indicators */}
          <div className="flex gap-1.5 mb-3">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  s.id <= currentStep.id ? 'bg-[#c9a84c]' : 'bg-[#c9a84c]/20'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="flex items-start gap-3">
            <span className="text-3xl shrink-0">{currentStep.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#c9a84c] text-sm mb-1">
                Шаг {currentStep.id} из {STEPS.length}: {currentStep.title}
              </p>
              <p className="text-gray-300 text-xs leading-relaxed">{currentStep.description}</p>
            </div>
          </div>

          {/* Skip button */}
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSkip}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded"
            >
              Пропустить обучение ×
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
