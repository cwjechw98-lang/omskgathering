import { PlayerState } from '../game/types';

interface PlayerAreaProps {
  player: PlayerState;
  isCurrentPlayer: boolean;
  label: string;
  isTop?: boolean;
  dataEnemyHero?: boolean;
}

export function PlayerArea({ player, isCurrentPlayer, label, dataEnemyHero }: PlayerAreaProps) {
  const healthPercent = Math.max(0, (player.health / player.maxHealth) * 100);
  const healthColor =
    player.health > 20
      ? 'bg-green-600'
      : player.health > 10
        ? 'bg-yellow-500'
        : player.health > 5
          ? 'bg-orange-500'
          : 'bg-red-500';

  return (
    <div
      data-enemy-hero={dataEnemyHero ? 'true' : undefined}
      className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border transition-colors ${
        isCurrentPlayer
          ? 'bg-[#1a1508]/50 border-[#c9a84c]/30'
          : 'bg-[#0f0f18]/50 border-gray-800/30'
      }`}
    >
      {/* Avatar */}
      <div
        className={`rounded-full flex items-center justify-center shrink-0 border ${
          isCurrentPlayer ? 'bg-[#2a1a08] border-[#c9a84c]/50' : 'bg-[#1a1a2a] border-gray-700/50'
        }`}
        style={{
          width: 'clamp(32px, 3.5vw, 48px)',
          height: 'clamp(32px, 3.5vw, 48px)',
          fontSize: 'clamp(14px, 1.8vw, 24px)',
        }}
      >
        {label.includes('🤖') || label.includes('🗿') ? '🗿' : '👤'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="font-heading text-white font-bold"
            style={{ fontSize: 'clamp(10px, 1.1vw, 14px)' }}
          >
            {label}
          </span>
          {isCurrentPlayer && (
            <span
              className="text-[#f0d68a] animate-pulse font-heading"
              style={{ fontSize: 'clamp(8px, 0.8vw, 11px)' }}
            >
              ⚡
            </span>
          )}
        </div>

        {/* Health bar */}
        <div
          className="w-full bg-gray-800 rounded-full overflow-hidden border border-gray-700/30"
          style={{ height: 'clamp(12px, 1.4vw, 18px)' }}
          title={`Здоровье: ${player.health}/${player.maxHealth}`}
        >
          <div
            className={`h-full ${healthColor} transition-all duration-500 rounded-full flex items-center`}
            style={{ width: `${healthPercent}%`, minWidth: player.health > 0 ? '20px' : '0' }}
          >
            <span
              className="font-heading font-bold text-white drop-shadow px-1 whitespace-nowrap"
              style={{ fontSize: 'clamp(7px, 0.9vw, 11px)' }}
            >
              ❤️ {player.health}/{player.maxHealth}
            </span>
          </div>
        </div>

        {/* Mana */}
        <div className="flex items-center gap-1 mt-0.5">
          <div className="flex gap-px">
            {Array.from({ length: Math.min(player.maxMana, 12) }, (_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${i < player.mana ? 'bg-blue-500 shadow-blue-400/50 shadow-sm' : 'bg-gray-700'}`}
                style={{ width: 'clamp(6px, 0.7vw, 10px)', height: 'clamp(6px, 0.7vw, 10px)' }}
                title={i < player.mana ? 'Мана' : 'Потрачена'}
              />
            ))}
          </div>
          <span
            className="text-blue-300 font-heading font-bold"
            style={{ fontSize: 'clamp(8px, 0.9vw, 11px)' }}
          >
            💎 {player.mana}/{player.maxMana}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div
        className="flex flex-col items-end gap-0.5 text-gray-500 shrink-0 font-body"
        style={{ fontSize: 'clamp(8px, 0.8vw, 11px)' }}
      >
        <div title="В руке">🤚 {player.hand.length}</div>
        <div title="В колоде">📚 {player.deck.length}</div>
        <div title="Кладбище">💀 {player.graveyard.length}</div>
      </div>
    </div>
  );
}
