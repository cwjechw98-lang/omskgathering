import { CardInstance, GameState } from '../../game/types';
import { getEffectiveAttack, getEffectiveHealth } from '../../game/engine';
import { getCardCoverSources, handleImageErrorWithFallback } from '../../utils/cardImages';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const KW: Record<string, string> = {
  haste: '⚡ Ускорение',
  defender: '🛡️ Защитник',
  flying: '🕊️ Полёт',
  trample: '🦶 Растоптать',
  lifelink: '💖 Привязка к жизни',
  deathtouch: '☠️ Смерт. касание',
  vigilance: '👁️ Бдительность',
  first_strike: '⚡ Первый удар',
  hexproof: '🔒 Порчеустойчивость',
  unblockable: '👻 Неблокируемый',
};
const KWS: Record<string, string> = {
  haste: '⚡',
  defender: '🛡️',
  flying: '🕊️',
  trample: '🦶',
  lifelink: '💖',
  deathtouch: '☠️',
  vigilance: '👁️',
  first_strike: '⚡',
  hexproof: '🔒',
  unblockable: '👻',
};

// eslint-disable-next-line react-refresh/only-export-components
export const COLOR_ART: Record<string, string> = {
  white: 'card-art-white',
  blue: 'card-art-blue',
  black: 'card-art-black',
  red: 'card-art-red',
  green: 'card-art-green',
  colorless: 'card-art-colorless',
};

/**
 * FieldCard — карта на игровом поле
 *
 * Dark Industrial Omsk Style:
 * - Тёмный бетон фон (slate-900/95)
 * - Акценты ржавчины (orange-700) и неона (cyan-400, green-400)
 * - Glassmorphism для плашек статов
 * - Градиенты индустриальные
 */
export function FieldCard({
  card,
  player,
  opponent,
  selected,
  isTarget,
  canAct,
  attackAnim,
  damageAnim,
  onClick,
  cardRef,
  deathEffect,
}: {
  card: CardInstance;
  player: GameState['player1'];
  opponent?: GameState['player1'];
  selected?: boolean;
  isTarget?: boolean;
  canAct?: boolean;
  attackAnim?: boolean;
  damageAnim?: boolean;
  onClick?: () => void;
  cardRef?: (el: HTMLDivElement | null) => void;
  deathEffect?: 'fire' | 'poison' | 'ice';
}) {
  const atk = getEffectiveAttack(card, player, opponent);
  const hp = getEffectiveHealth(card, player);
  const frozen = card.frozen > 0;
  const sick = card.summoningSickness;
  const attacked = card.hasAttacked;
  const isDef = card.keywords.includes('defender');
  const art = getCardCoverSources(card.data);

  // Border classes for different states
  const borderCls = selected
    ? 'ring-2 ring-yellow-400 shadow-yellow-400/50 shadow-lg scale-105'
    : isTarget
      ? 'ring-2 ring-red-500 shadow-red-500/40 shadow-lg animate-pulse cursor-crosshair'
      : canAct
        ? 'ring-2 ring-green-400/70 shadow-green-400/30 shadow-md cursor-pointer'
        : frozen
          ? 'ring-1 ring-cyan-400/50 opacity-70 cursor-pointer'
          : 'ring-1 ring-gray-600/40 hover:ring-gray-400/60 cursor-pointer';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
    <div
      ref={cardRef}
      onClick={onClick}
      className={`card-frame card-in-field field-card-mobile relative overflow-hidden transition-all duration-200 ${borderCls} ${attackAnim ? 'card-attack-animation' : ''} ${damageAnim ? 'card-damage-animation' : ''} ${deathEffect === 'fire' ? 'effect-fire-death' : ''} ${deathEffect === 'poison' ? 'effect-poison-death' : ''} ${deathEffect === 'ice' ? 'effect-frozen' : ''} ${frozen ? 'effect-frozen' : ''}`}
      style={{ width: 'var(--field-card-w)', height: 'var(--field-card-h)' }}
    >
      {/* Base color layer */}
      <div className={`absolute inset-0 ${COLOR_ART[card.data.color]}`} />

      {/* Card art with lazy loading */}
      {art.src && (
        <img
          src={art.src}
          data-fallback={art.fallback}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          loading="lazy"
          onError={(e) => handleImageErrorWithFallback(e.currentTarget)}
        />
      )}

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/90" />

      {/* Industrial concrete texture overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMWUyOTNiIi8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMzMzQxNTUiLz4KPC9zdmc+')] opacity-20" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col h-full p-[clamp(2px,0.4vw,6px)]">
        {/* Top row: Emoji + Cost */}
        <div className="flex justify-between items-start">
          {/* Card emoji */}
          <span
            className="text-white drop-shadow-lg"
            style={{ fontSize: 'clamp(16px, 2.2vw, 32px)' }}
          >
            {card.data.emoji}
          </span>

          {/* Mana cost badge - glassmorphism style */}
          <Badge
            variant="secondary"
            className="bg-blue-700/80 backdrop-blur-sm text-white font-bold font-heading shadow-lg border border-blue-500/30"
            style={{
              width: 'clamp(14px, 1.8vw, 24px)',
              height: 'clamp(14px, 1.8vw, 24px)',
              fontSize: 'clamp(8px, 1vw, 13px)',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {card.data.cost}
          </Badge>
        </div>

        {/* Card name */}
        <div
          className="field-card-name font-heading text-white font-bold truncate mt-auto drop-shadow-md"
          style={{ fontSize: 'clamp(6px, 0.85vw, 11px)' }}
        >
          {card.data.name}
        </div>

        {/* Keywords */}
        {card.keywords.length > 0 && (
          <div className="field-card-keywords flex flex-wrap gap-0.5 mt-0.5">
            {card.keywords.slice(0, 4).map((k) => (
              <Badge
                key={k}
                variant="outline"
                className="field-card-keyword bg-slate-800/60 backdrop-blur-sm border-slate-600/40 text-gray-300"
                style={{ fontSize: 'clamp(7px, 0.8vw, 12px)', padding: '1px 3px' }}
                title={KW[k]}
              >
                {KWS[k]}
              </Badge>
            ))}
          </div>
        )}

        {/* Status icons */}
          <div
            className="field-card-status flex items-center gap-0.5 mt-0.5"
            style={{ fontSize: 'clamp(7px, 0.8vw, 11px)' }}
          >
          {frozen && (
            <span
              className="text-cyan-400 drop-shadow-[0_0_3px_rgba(34,211,238,0.8)]"
              title="Заморожен"
            >
              ❄️
            </span>
          )}
          {sick && (
            <span className="text-amber-400" title="Болезнь призыва">
              💤
            </span>
          )}
          {attacked && !sick && (
            <span className="text-gray-500" title="Атаковал">
              ✅
            </span>
          )}
          {isDef && (
            <span className="text-slate-400" title="Защитник">
              🛡️
            </span>
          )}
          {canAct && (
            <span
              className="text-green-400 animate-pulse drop-shadow-[0_0_3px_rgba(74,222,127,0.8)]"
              title="Может атаковать"
            >
              ⚔️
            </span>
          )}
        </div>

        {/* Stats - glassmorphism badges */}
        {card.data.type === 'creature' && (
          <div className="field-card-stats flex justify-between items-end mt-auto gap-1">
            {/* Attack stat - rust/orange accent */}
            <Badge
              className="field-card-stat-badge bg-gradient-to-br from-red-900/80 to-orange-800/60 backdrop-blur-sm text-white font-bold font-heading border border-red-700/40 shadow-lg"
              style={{ fontSize: 'clamp(10px, 1.2vw, 14px)', padding: '2px 6px' }}
            >
              {atk}⚔
            </Badge>

            {/* Health stat - neon green/cyan accent */}
            <Badge
              className={`field-card-stat-badge backdrop-blur-sm font-bold font-heading border shadow-lg ${
                hp <= card.maxHealth / 2
                  ? 'bg-gradient-to-br from-red-700/80 to-orange-700/60 border-red-600/40 animate-pulse'
                  : 'bg-gradient-to-br from-green-800/80 to-cyan-700/60 border-green-600/40'
              }`}
              style={{ fontSize: 'clamp(10px, 1.2vw, 14px)', padding: '2px 6px' }}
            >
              {hp}❤
            </Badge>
          </div>
        )}
      </div>

      {/* Frozen overlay - ice effect */}
      {frozen && (
        <>
          <div
            className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-500/10 pointer-events-none z-20"
            style={{ backdropFilter: 'blur(2px)' }}
          />
          {/* Ice particles rising from card */}
          <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
            <div className="ice-particle" style={{ left: '20%', bottom: '10%', animationDelay: '0ms' }} />
            <div className="ice-particle" style={{ left: '50%', bottom: '20%', animationDelay: '200ms' }} />
            <div className="ice-particle" style={{ left: '80%', bottom: '15%', animationDelay: '400ms' }} />
            <div className="ice-particle" style={{ left: '35%', bottom: '30%', animationDelay: '600ms' }} />
            <div className="ice-particle" style={{ left: '65%', bottom: '25%', animationDelay: '800ms' }} />
          </div>
        </>
      )}

      {/* Fire death sparks */}
      {deathEffect === 'fire' && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          <div className="fire-spark" style={{ left: '30%', top: '40%' }} />
          <div className="fire-spark" style={{ left: '50%', top: '50%' }} />
          <div className="fire-spark" style={{ left: '70%', top: '35%' }} />
          <div className="fire-spark" style={{ left: '40%', top: '60%' }} />
          <div className="fire-spark" style={{ left: '60%', top: '45%' }} />
        </div>
      )}

      {/* Poison death bubbles */}
      {deathEffect === 'poison' && (
        <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
          <div className="poison-bubble" style={{ left: '25%', top: '30%', animationDelay: '0ms' }} />
          <div className="poison-bubble" style={{ left: '55%', top: '45%', animationDelay: '150ms' }} />
          <div className="poison-bubble" style={{ left: '75%', top: '35%', animationDelay: '300ms' }} />
          <div className="poison-bubble" style={{ left: '40%', top: '55%', animationDelay: '450ms' }} />
          <div className="poison-bubble" style={{ left: '65%', top: '50%', animationDelay: '600ms' }} />
        </div>
      )}
    </div>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="max-w-[220px] p-3 bg-[#1a1a24] border border-[#c9a84c]/40 text-left"
        style={{ zIndex: 999 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{card.data.emoji}</span>
          <div>
            <p className="font-bold text-[#c9a84c] text-sm">{card.data.name}</p>
            <p className="text-gray-400 text-xs">Стоимость: {card.data.cost} ☁️</p>
          </div>
        </div>
        {card.data.description && (
          <p className="text-gray-300 text-xs mb-2 leading-relaxed border-t border-gray-700 pt-2">
            {card.data.description}
          </p>
        )}
        {card.keywords.length > 0 && (
          <div className="flex flex-col gap-0.5 border-t border-gray-700 pt-2">
            {card.keywords.map((k) => (
              <span key={k} className="text-xs text-cyan-300">{KW[k] ?? k}</span>
            ))}
          </div>
        )}
        {card.data.type === 'creature' && (
          <div className="flex gap-2 mt-2 border-t border-gray-700 pt-2">
            <span className="text-xs text-orange-400">⚔️ {atk}</span>
            <span className={`text-xs ${hp <= card.maxHealth / 2 ? 'text-red-400' : 'text-green-400'}`}>❤️ {hp}/{card.maxHealth}</span>
          </div>
        )}
        {frozen && <p className="text-xs text-cyan-300 mt-1">❄️ Заморожен</p>}
        {sick && <p className="text-xs text-amber-300 mt-1">💤 Болезнь призыва</p>}
      </TooltipContent>
    </Tooltip>
  );
}
