import { useState } from 'react';
import {
  TUTORIAL_MAX_TURN,
  type TutorialLearned,
  type TutorialLessonHint,
} from '../../utils/tutorialProgress';

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

/**
 * Подсказка не пропускает невыполнимый урок молча: у неё есть два «честных»
 * состояния вместо действия — не хватает маны и условия пока нет вовсе.
 * Номер шага при этом не меняется, поэтому прогресс не скачет.
 */
const WAIT_TITLE = 'Маны пока мало';
const WAIT_EMOJI = '💎';

const PATIENCE_ATTACK_TITLE = 'Существо ещё не готово';
const PATIENCE_ATTACK_EMOJI = '😴';

function waitDescription(mana: number, requiredMana: number | null | undefined): string {
  const need = requiredMana ?? mana + 1;
  const missing = Math.max(1, need - mana);
  return `Самая дешёвая карта в руке стоит ${need}, а у вас ${mana} маны. Не хватает ${missing}. Нажмите «Конец хода» — новая земля добавит ману, и карта станет играбельной.`;
}

const PATIENCE_ATTACK_DESCRIPTION =
  'Существо выходит на поле с болезнью призыва: в тот же ход оно не атакует. Нажмите «Конец хода» — в начале следующего хода оно получит зелёную рамку (⚔️), и вы сможете им атаковать.';

interface TutorialProps {
  hint: TutorialLessonHint;
  /** Что игрок уже освоил — заполненность полосок показывает именно это. */
  learned: TutorialLearned;
  mana: number;
  /** Цена самой дешёвой не-земли в руке; null — таких карт нет. */
  requiredMana: number | null;
  onSkip: () => void;
}

export function Tutorial({ hint, learned, mana, requiredMana, onSkip }: TutorialProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const step = STEPS[hint.lesson - 1] ?? STEPS[STEPS.length - 1];
  const isWait = hint.variant === 'wait';
  const isPatience = hint.variant === 'patience';

  const title = isWait
    ? WAIT_TITLE
    : isPatience
      ? PATIENCE_ATTACK_TITLE
      : step.title;
  const emoji = isWait ? WAIT_EMOJI : isPatience ? PATIENCE_ATTACK_EMOJI : step.emoji;
  const description = isWait
    ? waitDescription(mana, requiredMana)
    : isPatience
      ? PATIENCE_ATTACK_DESCRIPTION
      : step.description;

  const handleSkip = () => {
    setDismissed(true);
    onSkip();
  };

  const spotlightClass = (() => {
    switch (step.spotlight) {
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
      {/* Панель привязана к высоте зоны руки, а не к «красивому» отступу: прежний
          bottom: clamp(120px,18vh,200px) при зоне руки ~199 px садился прямо на карты
          и закрывал их (проверка зрением + замер в scripts/ui-audit.mjs). */}
      <div
        className="tutorial-hint-panel fixed bottom-[calc(var(--handzone-h)+8px)] left-1/2 -translate-x-1/2 z-[180] pointer-events-auto"
        style={{ width: 'clamp(280px, 60vw, 420px)' }}
      >
        <div
          className="rounded-2xl border border-[#c9a84c]/50 shadow-2xl shadow-black/60 p-4"
          style={{ background: '#1a1a24', color: '#c9a84c' }}
        >
          {/* Полоски показывают освоенное, а не номер текущего шага: раньше они
              заполнялись по позиции и обещали прогресс, которого не было. */}
          <div className="flex gap-1.5 mb-3">
            {STEPS.map((s) => {
              const done =
                (s.id === 1 && learned.land) ||
                (s.id === 2 && learned.nonLand) ||
                (s.id === 3 && learned.attack) ||
                (s.id === 4 && learned.endTurn);
              return (
                <div
                  key={s.id}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    done ? 'bg-[#c9a84c]' : s.id === hint.lesson ? 'bg-[#c9a84c]/50' : 'bg-[#c9a84c]/20'
                  }`}
                  title={done ? `${s.title} — освоено` : s.title}
                />
              );
            })}
          </div>

          {/* Content */}
          <div className="flex items-start gap-3">
            <span className="text-3xl shrink-0">{emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#c9a84c] text-sm mb-1">
                Шаг {step.id} из {STEPS.length}: {title}
              </p>
              <p className="text-gray-300 text-xs leading-relaxed">{description}</p>
              <p className="text-gray-500 text-[10px] mt-2">
                Обучение идёт, пока есть непройденные шаги — не дольше {TUTORIAL_MAX_TURN}-го хода.
              </p>
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
