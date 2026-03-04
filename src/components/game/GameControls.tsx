export type PhaseId = 'land' | 'play' | 'attack' | 'done';

export interface PhaseInfo {
  id: PhaseId;
  icon: string;
  label: string;
  active: boolean;
  done: boolean;
}

export function GameControls({
  phases,
  hint,
  selectedAttacker,
  dragCardUid,
  phase,
  myTurn,
  gameOver,
  isCompactUI,
}: {
  phases: PhaseInfo[];
  hint: string;
  selectedAttacker: string | null;
  dragCardUid: string | null;
  phase: PhaseId;
  myTurn: boolean;
  gameOver: boolean;
  isCompactUI: boolean;
}) {
  if (!myTurn || gameOver) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 shrink-0 bg-black/60 border-t border-[#c9a84c]/10"
      style={{ height: isCompactUI ? 'clamp(30px, 5vh, 42px)' : 'clamp(28px, 4vh, 40px)' }}
    >
      <div className="flex items-center gap-0.5 shrink-0">
        {phases.map((p, i) => (
          <div key={p.id} className="flex items-center">
            <div
              className={`px-1.5 py-0.5 rounded-full font-heading transition-all ${
                p.active
                  ? 'bg-[#c9a84c]/30 text-[#f0d68a] scale-110'
                  : p.done
                    ? 'bg-gray-800/50 text-gray-700 line-through'
                    : 'bg-gray-800/30 text-gray-700'
              }`}
              style={{ fontSize: 'clamp(10px, 1vw, 14px)' }}
            >
              {p.icon}
            </div>
            {i < phases.length - 1 && (
              <span
                className="text-gray-800 mx-0.5"
                style={{ fontSize: 'clamp(8px, 0.8vw, 10px)' }}
              >
                &#8250;
              </span>
            )}
          </div>
        ))}
      </div>
      <div
        className={`flex-1 truncate font-body ${
          selectedAttacker
            ? 'text-red-300'
            : dragCardUid
              ? 'text-green-300'
              : phase === 'land'
                ? 'text-[#f0d68a]'
                : phase === 'done'
                  ? 'text-gray-600'
                  : 'text-gray-400'
        }`}
        style={{ fontSize: 'clamp(11px, 1.1vw, 15px)' }}
      >
        {hint}
      </div>
    </div>
  );
}

export function CenterControls({
  selectedAttacker,
  myTurn,
  gameOver,
  phase,
  isCompactUI,
  onEndTurn,
  onAttackHero,
  onCancelAttacker,
}: {
  selectedAttacker: string | null;
  myTurn: boolean;
  gameOver: boolean;
  phase: PhaseId;
  isCompactUI: boolean;
  onEndTurn: () => void;
  onAttackHero: () => void;
  onCancelAttacker: () => void;
}) {
  return (
    <div className="flex items-center gap-2 shrink-0 py-1">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/30 to-transparent" />
      <div
        className={`flex items-center gap-1.5 shrink-0 ${isCompactUI ? 'flex-wrap justify-center' : ''}`}
      >
        {selectedAttacker && (
          <>
            <button
              onClick={onAttackHero}
              className={`px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg font-heading font-bold shadow-lg shadow-red-700/30 animate-pulse transition ${isCompactUI ? 'min-w-[122px]' : ''}`}
              style={{ fontSize: 'clamp(11px, 1.1vw, 15px)' }}
              title="Атаковать героя напрямую"
            >
              &#9876;&#65039; В героя
            </button>
            <button
              onClick={onCancelAttacker}
              className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition font-heading"
              style={{ fontSize: 'clamp(11px, 1.1vw, 15px)' }}
            >
              &#10005;
            </button>
          </>
        )}
        {myTurn && !gameOver && !selectedAttacker && (
          <button
            onClick={onEndTurn}
            className={`px-4 py-1.5 rounded-lg font-heading font-bold shadow-lg transition hover:scale-105 border ${
              phase === 'done'
                ? 'bg-gradient-to-r from-[#8b6914] to-[#c9a84c] hover:from-[#a07a1a] hover:to-[#d4b85a] text-white border-[#c9a84c]/50 animate-pulse shadow-[#c9a84c]/30'
                : 'bg-[#1a1a2a] hover:bg-[#2a2a3a] text-gray-400 border-gray-700/50'
            }`}
            style={{ fontSize: 'clamp(11px, 1.1vw, 15px)' }}
            title={phase === 'done' ? 'Нет действий — завершите ход' : 'Завершить ход досрочно'}
          >
            Конец хода &#9193;&#65039;
          </button>
        )}
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/30 to-transparent" />
    </div>
  );
}
