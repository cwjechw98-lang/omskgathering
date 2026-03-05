import { PlayerState } from '../game/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PlayerAreaProps {
  player: PlayerState;
  isCurrentPlayer: boolean;
  label: string;
  isTop?: boolean;
  dataEnemyHero?: boolean;
}

export function PlayerArea({ player, isCurrentPlayer, label, dataEnemyHero }: PlayerAreaProps) {
  const healthPercent = Math.max(0, (player.health / player.maxHealth) * 100);

  // Determine health bar color based on HP percentage
  const getHealthVariant = () => {
    const hpPercent = (player.health / player.maxHealth) * 100;
    if (hpPercent > 60) return 'success';
    if (hpPercent > 30) return 'warning';
    return 'danger';
  };

  const healthVariant = getHealthVariant();

  return (
    <Card
      data-enemy-hero={dataEnemyHero ? 'true' : undefined}
      className={cn(
        'flex items-center gap-3 p-3 border transition-all shrink-0',
        isCurrentPlayer
          ? 'bg-[#1a1508]/50 border-[#c9a84c]/30 shadow-lg shadow-[#c9a84c]/10'
          : 'bg-[#0f0f18]/50 border-gray-800/30'
      )}
      role="region"
      aria-label={label}
    >
      {/* Avatar */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={cn(
            'rounded-full flex items-center justify-center shrink-0 border',
            isCurrentPlayer ? 'bg-[#2a1a08] border-[#c9a84c]/50' : 'bg-[#1a1a2a] border-gray-700/50'
          )}
          style={{
            width: 'clamp(32px, 3.5vw, 48px)',
            height: 'clamp(32px, 3.5vw, 48px)',
            fontSize: 'clamp(14px, 1.8vw, 24px)',
          }}
          aria-hidden="true"
        >
          {label.includes('🤖') || label.includes('🗿') ? '🗿' : '👤'}
        </div>
        {/* Player label under avatar */}
        <span
          className="font-heading text-gray-400 text-[9px] truncate max-w-[80px]"
          style={{ fontSize: 'clamp(8px, 0.8vw, 10px)' }}
        >
          {label.includes('Хранитель') ? 'Хранитель' : label.includes('Вы') ? 'Вы' : label}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <span
            className="font-heading text-white font-bold"
            style={{ fontSize: 'clamp(11px, 1.1vw, 14px)' }}
          >
            {label}
          </span>
          {isCurrentPlayer && (
            <Badge
              variant="secondary"
              className="animate-pulse bg-[#f0d68a]/20 text-[#f0d68a] border-transparent text-[10px] h-5 px-1.5"
            >
              ⚡ Ход
            </Badge>
          )}
        </div>

        {/* Health Bar — accessible Progress component */}
        <div className="relative">
          <Progress
            value={healthPercent}
            className={cn(
              'h-4 transition-all duration-500',
              healthVariant === 'success' && 'progress-success',
              healthVariant === 'warning' && 'progress-warning',
              healthVariant === 'danger' && 'progress-danger'
            )}
            aria-label={`Здоровье: ${player.health} из ${player.maxHealth}`}
            aria-valuemin={0}
            aria-valuemax={player.maxHealth}
            aria-valuenow={player.health}
          />
          {/* Health text overlay */}
          <span
            className="absolute inset-0 flex items-center justify-center font-heading font-bold text-white drop-shadow text-[10px]"
            style={{ fontSize: 'clamp(9px, 0.9vw, 11px)' }}
            aria-hidden="true"
          >
            ❤️ {player.health}/{player.maxHealth}
          </span>
        </div>

        {/* Mana — Badges with tooltip */}
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1">
              <div className="flex gap-px">
                {Array.from({ length: Math.min(player.maxMana, 12) }, (_, i) => (
                  <Badge
                    key={i}
                    variant={i < player.mana ? 'mana-available' : 'mana-spent'}
                    className="w-3 h-3 rounded-full p-0 min-w-0"
                    aria-label={i < player.mana ? 'Доступно' : 'Потрачено'}
                  />
                ))}
              </div>
              <span
                className="text-blue-300 font-heading font-bold"
                style={{ fontSize: 'clamp(9px, 0.9vw, 12px)' }}
              >
                💎 {player.mana}/{player.maxMana}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>
              Мана: {player.mana} / {player.maxMana}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Stats — accessible Badges with tooltips */}
      <div className="flex flex-col items-end gap-1" role="list" aria-label="Статистика игрока">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1.5 text-xs min-w-[60px] h-6">
              <span aria-hidden="true">🤚</span>
              <span>{player.hand.length}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top">Карт в руке</TooltipContent>
        </Tooltip>

        {/* Deck with card back visualization */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <div className="relative w-5 h-7 rounded border border-gray-600 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                <span className="text-[8px]">🂠</span>
                {player.deck.length > 0 && (
                  <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[8px] rounded-full px-1 min-w-[16px] text-center">
                    {player.deck.length}
                  </span>
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">Карт в колоде: {player.deck.length}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1.5 text-xs min-w-[60px] h-6">
              <span aria-hidden="true">💀</span>
              <span>{player.graveyard.length}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top">Карт на кладбище</TooltipContent>
        </Tooltip>
      </div>
    </Card>
  );
}
