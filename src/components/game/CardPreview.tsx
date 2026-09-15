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
  onClose: (source: 'backdrop' | 'button', point?: { x: number; y: number }) => void;
  compact?: boolean;
}) {
  const opp = owner === 'player1' ? 'player2' : 'player1';
  const art = getCardCoverSources(card.data);
  return (
    <div
      className="card-preview-overlay fixed inset-0 z-[140] flex items-center justify-center pointer-events-auto"
      style={{
        paddingTop:
          'calc(env(safe-area-inset-top, 0px) + var(--topbar-h) + var(--herozone-h) + 8px)',
        paddingBottom:
          'calc(env(safe-area-inset-bottom, 0px) + var(--actionbar-h) + var(--handzone-h) + 8px)',
        paddingInline: 'clamp(8px, 3vw, 24px)',
      }}
      onClick={(e) => onClose('backdrop', { x: e.clientX, y: e.clientY })}
      data-interactive-ui="true"
    >
      <div
        className="card-preview-shell pointer-events-auto"
        style={{
          // Карта показывается КАРТОЙ: пропорция 2:3 — ровно как у файлов арта
          // (682x1024). Было: полоса арта высотой clamp(70px,8vw,120px) при ширине
          // 340 px, то есть 2.8:1 — object-cover срезал 76% картинки. Замер: ui-audit.
          width: compact ? 'min(90vw, 300px)' : 'clamp(210px, 24vw, 310px)',
          aspectRatio: '2 / 3',
          maxHeight:
            'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - var(--topbar-h) - var(--herozone-h) - var(--actionbar-h) - var(--handzone-h) - 16px)',
        }}
        onClick={(e) => e.stopPropagation()}
        data-interactive-ui="true"
      >
        <div className="relative h-full w-full overflow-hidden rounded-xl border border-[#c9a84c]/30 bg-[#0f0f18]/98 shadow-2xl">
          <button
            onClick={() => onClose('button')}
            className="absolute top-1 right-1 z-30 text-gray-300 hover:text-white w-7 h-7 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-sm transition"
          >
            &#10005;
          </button>

          {/* Арт — фон всей карты: пропорции совпадают, обрезки нет вообще */}
          {art.src && (
            <img
              src={art.src}
              data-fallback={art.fallback}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              onError={(e) => handleImageErrorWithFallback(e.currentTarget)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-[#0f0f18]/75 to-[#0f0f18]" />

          <div className="relative z-10 flex h-full flex-col justify-end gap-1 p-3">
            <div className="flex items-start gap-2">
              <span style={{ fontSize: 'clamp(20px, 2vw, 30px)' }} className="drop-shadow-lg">
                {card.data.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className="font-heading font-bold text-white drop-shadow-md"
                  style={{ fontSize: 'clamp(11px, 1.1vw, 15px)' }}
                >
                  {card.data.name}
                </div>
                <div
                  className="text-gray-300 drop-shadow"
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
                className="bg-blue-600 text-white font-bold rounded-full flex items-center justify-center font-heading shadow shrink-0"
                style={{
                  width: 'clamp(20px, 2vw, 28px)',
                  height: 'clamp(20px, 2vw, 28px)',
                  fontSize: 'clamp(10px, 1vw, 14px)',
                }}
              >
                {card.data.cost}
              </span>
            </div>

            {/* Текстовый блок прокручивается, если описания не влезли в карту */}
            <div className="min-h-0 overflow-y-auto" style={{ maxHeight: '52%' }}>
              {card.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {card.keywords.map((k) => (
                    <span
                      key={k}
                      className="bg-[#2a1a3a]/90 text-purple-200 px-1.5 py-0.5 rounded border border-purple-800/30"
                      style={{ fontSize: 'clamp(8px, 0.8vw, 10px)' }}
                    >
                      {KW[k]}
                    </span>
                  ))}
                </div>
              )}

              <div
                className="text-gray-200 mb-1.5 leading-snug font-body drop-shadow"
                style={{ fontSize: 'clamp(10px, 1vw, 13px)' }}
              >
                {card.data.description}
              </div>

              {card.data.flavor && (
                <div className="border-t border-[#c9a84c]/25 pt-1.5 mt-1.5">
                  <p
                    className="text-[#e0cfa0]/85 italic leading-relaxed font-body"
                    style={{ fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                  >
                    {card.data.flavor}
                  </p>
                </div>
              )}
            </div>

            {card.data.type === 'creature' && (
              <div
                className="flex gap-3 bg-black/50 rounded-lg px-3 py-1 font-heading shrink-0"
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
    </div>
  );
}
