import { GameState } from '../../game/types';

interface PhaseIndicatorProps {
  gameState: GameState;
  isMyTurn: boolean;
  playerKey: 'player1' | 'player2';
}

const PHASES = [
  { id: 'land', emoji: '🏔️', label: 'Земля' },
  { id: 'play', emoji: '⚔️', label: 'Основная' },
  { id: 'attack', emoji: '💥', label: 'Бой' },
  { id: 'done', emoji: '⏭️', label: 'Конец' },
] as const;

type PhaseId = (typeof PHASES)[number]['id'];

function detectPhase(
  gameState: GameState,
  isMyTurn: boolean,
  playerKey: 'player1' | 'player2'
): PhaseId {
  if (!isMyTurn || gameState.gameOver) return 'done';
  const me = gameState[playerKey];
  const hasLands =
    me.hand.some((c) => c.data.type === 'land') && me.landsPlayed < me.maxLandsPerTurn;
  const hasPlayable = me.hand.some((c) => c.data.type !== 'land' && c.data.cost <= me.mana);
  const hasAttackers = me.field.some(
    (c) =>
      !c.summoningSickness && !c.hasAttacked && c.frozen <= 0 && !c.keywords.includes('defender')
  );

  if (hasLands && me.landsPlayed === 0) return 'land';
  if (hasPlayable || me.mana > 0) return 'play';
  if (hasAttackers) return 'attack';
  return 'done';
}

export function PhaseIndicator({ gameState, isMyTurn, playerKey }: PhaseIndicatorProps) {
  const currentPhase = detectPhase(gameState, isMyTurn, playerKey);
  const currentIdx = PHASES.findIndex((p) => p.id === currentPhase);

  return (
    <div
      className="flex items-center gap-1 justify-center"
      style={{ fontSize: 'clamp(9px, 1vw, 12px)' }}
    >
      {PHASES.map((phase, idx) => {
        const isActive = phase.id === currentPhase;
        const isPast = idx < currentIdx;
        return (
          <div
            key={phase.id}
            className={`flex items-center gap-0.5 px-1 py-0.5 rounded transition-all duration-300 ${
              isActive
                ? 'text-[#c9a84c] font-bold border-b border-[#c9a84c]'
                : isPast
                  ? 'text-gray-600 line-through'
                  : 'text-gray-500'
            }`}
          >
            <span>{phase.emoji}</span>
            <span className="hidden sm:inline">{phase.label}</span>
          </div>
        );
      })}
    </div>
  );
}
