import { CardInstance, GameState } from '../../game/types';
import { getEffectiveAttack, getEffectiveHealth } from '../../game/engine';
import { getCardCoverSources, handleImageErrorWithFallback } from '../../utils/cardImages';
import { COLOR_ART } from './FieldCard';

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

export function CardPreview({
  card,
  owner,
  gs,
  onClose,
  compact = false,
}: {
  card: CardInstance;
  owner: 'player1' | 'player2';
  gs: GameState;
  onClose: () => void;
  compact?: boolean;
}) {
  const opp = owner === 'player1' ? 'player2' : 'player1';
  const art = getCardCoverSources(card.data);
  return (
    <div
      className={`absolute z-40 ${compact ? 'left-2 right-2 bottom-100' : 'top-12 right-2'}`}
      style={{ width: compact ? 'auto' : 'clamp(200px, 17vw, 280px)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-[#0f0f18]/98 backdrop-blur-sm rounded-xl shadow-2xl border border-[#c9a84c]/30 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-1 right-1 z-20 text-gray-400 hover:text-white w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-700 text-sm transition"
        >
          &#10005;
        </button>

        <div
          className={`relative overflow-hidden ${COLOR_ART[card.data.color]}`}
          style={{ height: 'clamp(70px, 8vw, 120px)' }}
        >
          {art.src && (
            <img
              src={art.src}
              data-fallback={art.fallback}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => handleImageErrorWithFallback(e.currentTarget)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0f0f18]/98" />
          <div
            className="absolute bottom-1 left-1/2 -translate-x-1/2"
            style={{ fontSize: 'clamp(28px, 3vw, 42px)' }}
          >
            {card.data.emoji}
          </div>
        </div>

        <div className="p-3 -mt-2 relative z-10">
          <div className="flex items-start gap-2 mb-1.5">
            <div className="flex-1 min-w-0">
              <div
                className="font-heading font-bold text-white"
                style={{ fontSize: 'clamp(11px, 1.1vw, 15px)' }}
              >
                {card.data.name}
              </div>
              <div
                className="text-gray-400 font-body"
                style={{ fontSize: 'clamp(8px, 0.8vw, 11px)' }}
              >
                {card.data.type === 'creature'
                  ? 'Существо'
                  : card.data.type === 'spell'
                    ? 'Заклинание'
                    : card.data.type === 'enchantment'
                      ? 'Наложение'
                      : 'Земля'}
                {' · '}
                <span
                  className={
                    card.data.rarity === 'mythic'
                      ? 'text-orange-400'
                      : card.data.rarity === 'rare'
                        ? 'text-[#f0d68a]'
                        : ''
                  }
                >
                  {card.data.rarity === 'mythic'
                    ? '★★★'
                    : card.data.rarity === 'rare'
                      ? '★★'
                      : card.data.rarity === 'uncommon'
                        ? '★'
                        : '○'}
                </span>
              </div>
            </div>
            <span
              className="bg-blue-600 text-white font-bold rounded-full flex items-center justify-center font-heading shadow"
              style={{
                width: 'clamp(20px, 2vw, 28px)',
                height: 'clamp(20px, 2vw, 28px)',
                fontSize: 'clamp(10px, 1vw, 14px)',
              }}
            >
              {card.data.cost}
            </span>
          </div>

          {card.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5">
              {card.keywords.map((k) => (
                <span
                  key={k}
                  className="bg-[#2a1a3a] text-purple-200 px-1.5 py-0.5 rounded border border-purple-800/30"
                  style={{ fontSize: 'clamp(8px, 0.8vw, 10px)' }}
                >
                  {KW[k]}
                </span>
              ))}
            </div>
          )}

          <div
            className="text-gray-300 mb-1.5 leading-snug font-body"
            style={{ fontSize: 'clamp(10px, 1vw, 13px)' }}
          >
            {card.data.description}
          </div>

          {card.data.flavor && (
            <div className="border-t border-[#c9a84c]/15 pt-1.5 mt-1.5">
              <p
                className="text-[#c9a84c]/60 italic leading-relaxed font-body"
                style={{ fontSize: 'clamp(8px, 0.8vw, 11px)' }}
              >
                {card.data.flavor}
              </p>
            </div>
          )}

          {card.data.type === 'creature' && (
            <div
              className="flex gap-3 mt-1.5 bg-black/40 rounded-lg px-3 py-1 font-heading"
              style={{ fontSize: 'clamp(10px, 1vw, 13px)' }}
            >
              <span>&#9876;&#65039; {getEffectiveAttack(card, gs[owner], gs[opp])}</span>
              <span>
                &#10084;&#65039; {getEffectiveHealth(card, gs[owner])}/{card.maxHealth}
              </span>
              {card.frozen > 0 && (
                <span className="text-cyan-400">&#10052;&#65039;{card.frozen}</span>
              )}
              {card.summoningSickness && <span className="text-yellow-400">&#128164;</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
