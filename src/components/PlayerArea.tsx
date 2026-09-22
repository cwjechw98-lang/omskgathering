// ═══════════════════════════════════════════
// PLAYER AREA COMPONENT
// ═══════════════════════════════════════════
// Отображение панели игрока (HP, мана, защитники, счетчики)

import { cn } from '@/lib/utils';
import { Card as UICard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PlayerState } from '@/game/types';
import { describePool } from '@/game/mana';

interface PlayerAreaProps {
  player: PlayerState;
  isCurrentPlayer: boolean;
  label: string;
  heroIcon: string;
  dataEnemyHero?: boolean;
}

/**
 * Компонент панели игрока
 */
export function PlayerArea({
  player,
  isCurrentPlayer,
  label,
  heroIcon,
  dataEnemyHero,
}: PlayerAreaProps) {
  const healthPercent = Math.max(0, (player.health / player.maxHealth) * 100);
  const getHealthVariant = () => {
    const hpPercent = (player.health / player.maxHealth) * 100;
    if (hpPercent > 60) return 'success';
    if (hpPercent > 30) return 'warning';
    return 'danger';
  };
  const healthVariant = getHealthVariant();

  // Count active defender cards on field
  const defenderCount = player.field.filter(
    (c) => c.keywords.includes('defender') && c.frozen <= 0 && c.currentHealth > 0
  ).length;

  return (
    <UICard
      data-slot="card"
      data-enemy-hero={dataEnemyHero ? 'true' : undefined}
      className={cn(
        'game-player-area flex flex-row items-center gap-3 p-3 border transition-all shrink-0 w-full max-w-full min-w-0 overflow-hidden',
        isCurrentPlayer
          ? 'bg-[#1a1508]/50 border-[#c9a84c]/30 shadow-lg shadow-[#c9a84c]/10'
          : 'bg-[#0f0f18]/50 border-gray-800/30'
      )}
      role="region"
      aria-label={label}
    >
      {/* Row 1: Avatar + Name + Counters */}
      <div className="flex items-center gap-1.5 w-full">
        <div
          className={cn(
            'rounded-full flex items-center justify-center shrink-0 border',
            isCurrentPlayer ? 'bg-[#2a1a08] border-[#c9a84c]/50' : 'bg-[#1a1a2a] border-gray-700/50'
          )}
          style={{
            width: 'clamp(24px, 2.5vw, 36px)',
            height: 'clamp(24px, 2.5vw, 36px)',
            fontSize: 'clamp(11px, 1.3vw, 18px)',
          }}
        >
          {heroIcon}
        </div>
        <span
          className="font-heading text-white font-bold truncate"
          style={{ fontSize: 'clamp(9px, 1vw, 13px)' }}
        >
          {label}
        </span>
        {isCurrentPlayer && (
          <Badge
            variant="secondary"
            className="animate-pulse bg-[#f0d68a]/20 text-[#f0d68a] border-transparent text-[9px] h-4 px-1"
          >
            ⚡
          </Badge>
        )}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          <Tooltip>
            <TooltipTrigger>
              <Badge
                variant="outline"
                className="gap-0.5 text-[9px] h-4 px-1 min-w-0"
                aria-label={`Рука: ${player.hand.length}`}
              >
                <span>🤚</span>
                <span className="text-[8px] text-gray-400">Р</span>
                <span>{player.hand.length}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">Рука: {player.hand.length}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <Badge
                variant="outline"
                className="gap-0.5 text-[9px] h-4 px-1 min-w-0"
                aria-label={`Колода: ${player.deck.length}`}
              >
                <span>📚</span>
                <span className="text-[8px] text-gray-400">К</span>
                <span>{player.deck.length}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">Колода: {player.deck.length}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <Badge
                variant="outline"
                className="gap-0.5 text-[9px] h-4 px-1 min-w-0"
                aria-label={`Кладбище: ${player.graveyard.length}`}
              >
                <span>💀</span>
                <span className="text-[8px] text-gray-400">С</span>
                <span>{player.graveyard.length}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">Кладбище: {player.graveyard.length}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Row 2: HP bar + Mana + Defenders */}
      <div className="flex flex-col gap-1 w-full">
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1 min-w-0">
            <Progress
              value={healthPercent}
              className={cn(
                'h-3 transition-all duration-500',
                healthVariant === 'success' && 'progress-success',
                healthVariant === 'warning' && 'progress-warning',
                healthVariant === 'danger' && 'progress-danger'
              )}
            />
            <span
              className="absolute inset-0 flex items-center justify-center font-heading font-bold text-white drop-shadow"
              style={{ fontSize: 'clamp(8px, 0.8vw, 10px)' }}
            >
              ❤️ {player.health}/{player.maxHealth}
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-0.5 shrink-0">
                <div className="flex gap-px">
                  {Array.from({ length: Math.min(player.maxMana, 12) }, (_, i) => (
                    <Badge
                      key={i}
                      variant={i < player.mana ? 'mana-available' : 'mana-spent'}
                      className="w-2 h-2 rounded-full p-0 min-w-0"
                    />
                  ))}
                </div>
                <span
                  className="text-blue-300 font-heading font-bold"
                  style={{ fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                >
                  💎{player.mana}/{player.maxMana}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>
                Мана: {player.mana} / {player.maxMana}
              </p>
              {/* Без расшифровки игрок видит «3/5» и не понимает, почему зелёная карта
                  не играется: общее число есть, а нужного цвета нет. */}
              <p className="text-xs opacity-80">Есть: {describePool(player.manaPool)}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Defender count row */}
        <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 font-heading">
          <span>🛡️</span>
          <span>Защитники: {defenderCount}</span>
        </div>
      </div>
    </UICard>
  );
}
