import { CardInstance, GameState } from '../../game/types';
import { getEffectiveAttack, getEffectiveHealth } from '../../game/engine';
import { getCardCoverSources, handleImageErrorWithFallback } from '../../utils/cardImages';

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

export const COLOR_ART: Record<string, string> = {
  white: 'card-art-white',
  blue: 'card-art-blue',
  black: 'card-art-black',
  red: 'card-art-red',
  green: 'card-art-green',
  colorless: 'card-art-colorless',
};

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
}) {
  const atk = getEffectiveAttack(card, player, opponent);
  const hp = getEffectiveHealth(card, player);
  const frozen = card.frozen > 0;
  const sick = card.summoningSickness;
  const attacked = card.hasAttacked;
  const isDef = card.keywords.includes('defender');
  const art = getCardCoverSources(card.data);

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
    <div
      ref={cardRef}
      onClick={onClick}
      className={`card-frame card-in-field relative overflow-hidden transition-all duration-200 ${borderCls} ${attackAnim ? 'card-attack-animation' : ''} ${damageAnim ? 'card-damage-animation' : ''}`}
      style={{ width: 'var(--field-card-w)', height: 'var(--field-card-h)' }}
      title={`${card.data.name}\n${card.data.description}\n⚔${atk} ❤${hp}`}
    >
      <div className={`absolute inset-0 ${COLOR_ART[card.data.color]}`} />
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />

      <div className="relative z-10 flex flex-col h-full p-[clamp(2px,0.4vw,6px)]">
        <div className="flex justify-between items-start">
          <span style={{ fontSize: 'clamp(16px, 2.2vw, 32px)' }}>{card.data.emoji}</span>
          <span
            className="bg-blue-600/90 text-white rounded-full flex items-center justify-center font-bold font-heading shadow"
            style={{
              width: 'clamp(14px, 1.8vw, 24px)',
              height: 'clamp(14px, 1.8vw, 24px)',
              fontSize: 'clamp(8px, 1vw, 13px)',
            }}
          >
            {card.data.cost}
          </span>
        </div>

        <div
          className="font-heading text-white font-bold truncate mt-auto"
          style={{ fontSize: 'clamp(6px, 0.85vw, 11px)' }}
        >
          {card.data.name}
        </div>

        {card.keywords.length > 0 && (
          <div className="flex flex-wrap gap-px">
            {card.keywords.slice(0, 4).map((k) => (
              <span key={k} title={KW[k]} style={{ fontSize: 'clamp(7px, 0.8vw, 12px)' }}>
                {KWS[k]}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-0.5" style={{ fontSize: 'clamp(7px, 0.8vw, 11px)' }}>
          {frozen && <span title="Заморожен">&#10052;&#65039;</span>}
          {sick && <span title="Болезнь призыва">&#128164;</span>}
          {attacked && !sick && <span title="Атаковал">&#9989;</span>}
          {isDef && <span title="Защитник">&#128737;&#65039;</span>}
          {canAct && (
            <span className="text-green-400 animate-pulse" title="Может атаковать">
              &#9876;&#65039;
            </span>
          )}
        </div>

        {card.data.type === 'creature' && (
          <div className="flex justify-between items-end mt-auto">
            <span
              className="bg-red-700/90 text-white rounded px-1 font-bold font-heading"
              style={{ fontSize: 'clamp(10px, 1.2vw, 14px)' }}
            >
              {atk}&#9876;
            </span>
            <span
              className={`rounded px-1 font-bold font-heading text-white ${hp <= card.maxHealth / 2 ? 'bg-red-600/90' : 'bg-green-700/90'}`}
              style={{ fontSize: 'clamp(10px, 1.2vw, 14px)' }}
            >
              {hp}&#10084;
            </span>
          </div>
        )}
      </div>

      {frozen && <div className="absolute inset-0 bg-cyan-300/15 pointer-events-none z-20" />}
    </div>
  );
}
