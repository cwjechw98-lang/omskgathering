import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, CardInstance, PlayerState } from './game/types';
import {
  createInitialGameState,
  playCard,
  attackPlayer,
  attackCreature,
  endTurn,
  getEffectiveAttack,
  getEffectiveHealth,
} from './game/engine';
import { aiTurn } from './game/ai';
import { cn } from './utils/cn';
import { DebugOverlay } from './DebugOverlay';
import { useEventTimeline } from './hooks/useEventTimeline';

/* ══════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════ */
const AI_NAME  = 'Хранитель Омска';
const AI_EMOJI = '🦉';
const MAX_FIELD = 7;

const KW_LABELS: Record<string, string> = {
  haste: '⚡ Ускорение', defender: '🛡️ Защитник', flying: '🕊️ Полёт',
  trample: '🦶 Растоптать', lifelink: '💖 Привязка', deathtouch: '☠️ Смерть',
  vigilance: '👁️ Бдительность', first_strike: '⚡ Первый удар',
  hexproof: '🔒 Порчеуст.', unblockable: '👻 Неблокируем.',
};
const KW_ICONS: Record<string, string> = {
  haste: '⚡', defender: '🛡️', flying: '🕊️', trample: '🦶',
  lifelink: '💖', deathtouch: '☠️', vigilance: '👁️',
  first_strike: '⚡', hexproof: '🔒', unblockable: '👻',
};

/* ══════════════════════════════════════════════════════
   ЭТАП 6 — Arc Hand helpers
   Вычисляем угол и смещение для каждой карты в руке.
   ══════════════════════════════════════════════════════ */
function getArcStyle(index: number, total: number): React.CSSProperties {
  if (total <= 1) return { '--card-angle': '0deg', '--card-offset': '0px', '--card-index': 0 } as React.CSSProperties;
  // Диапазон углов: от -MAX_DEG до +MAX_DEG
  const MAX_DEG = Math.min(12, total * 2.2);
  const MAX_OFFSET = Math.min(10, total * 1.5);
  // Нормализованная позиция [-1, 1]
  const t = total === 1 ? 0 : (index / (total - 1)) * 2 - 1;
  const angle  = t * MAX_DEG;
  // Крайние карты ниже (больший translateY), центр — выше
  const offset = Math.abs(t) * MAX_OFFSET;
  return {
    '--card-angle':  `${angle.toFixed(2)}deg`,
    '--card-offset': `${offset.toFixed(1)}px`,
    '--card-index':  index,
  } as React.CSSProperties;
}

/* ══════════════════════════════════════════════════════
   AI MESSAGE FEED — медленное, текучее появление
   Три фазы через React state + CSS transition 1.1s
   ══════════════════════════════════════════════════════ */
type AiMsg = { id: number; text: string; ts: number; ttl: number; visible: boolean };
let _msgId = 0;

function useAiFeed() {
  const [msgs, setMsgs] = useState<AiMsg[]>([]);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const push = useCallback((text: string, ttl = 6000) => {
    const id = ++_msgId;
    // 1. Добавляем с opacity=0 (visible:false)
    setMsgs(prev => [...prev.slice(-3), { id, text, ts: Date.now(), ttl, visible: false }]);

    // 2. Через 140ms → visible=true → CSS transition медленно «натекает»
    const t1 = setTimeout(() => {
      if (!mountedRef.current) return;
      setMsgs(prev => prev.map(m => m.id === id ? { ...m, visible: true } : m));
    }, 140);

    // 3. За 1.4s до конца TTL → начинаем убирать
    const t2 = setTimeout(() => {
      if (!mountedRef.current) return;
      setMsgs(prev => prev.map(m => m.id === id ? { ...m, visible: false } : m));
    }, Math.max(ttl - 1400, ttl * 0.55));

    // 4. Удаляем из DOM
    const t3 = setTimeout(() => {
      if (!mountedRef.current) return;
      setMsgs(prev => prev.filter(m => m.id !== id));
    }, ttl + 300);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const clear = useCallback(() => setMsgs([]), []);
  return { msgs, push, clear };
}

/* ══════════════════════════════════════════════════════
   SPARK EFFECT
   ══════════════════════════════════════════════════════ */
type Spark = { id: number; x: number; y: number; dx: number; dy: number; color: string };

function SparkLayer({ sparks }: { sparks: Spark[] }) {
  return (
    <>
      {sparks.map(s => (
        <div
          key={s.id}
          className="spark"
          style={{
            left: s.x, top: s.y, background: s.color,
            ['--dx' as any]: `${s.dx}px`,
            ['--dy' as any]: `${s.dy}px`,
          }}
        />
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════
   ЭТАП 2 — CARDVISUAL
   overflow:hidden — foil не выходит за рамку карты
   ══════════════════════════════════════════════════════ */
function CardVisual({
  card, owner, opponent,
  selected, isTarget, canAct, frozen,
  attackAnim, damageAnim, isNew,
}: {
  card: CardInstance;
  owner: PlayerState;
  opponent: PlayerState;
  selected?: boolean;
  isTarget?: boolean;
  canAct?: boolean;
  frozen?: boolean;
  attackAnim?: boolean;
  damageAnim?: boolean;
  isNew?: boolean;
}) {
  const atk   = getEffectiveAttack(card, owner, opponent);
  const hp    = getEffectiveHealth(card, owner);
  const halfHP = hp <= card.maxHealth / 2;
  const sick  = card.summoningSickness;

  return (
    <div
      className={cn(
        'game-card',
        `color-${card.data.color}`,
        `rarity-${card.data.rarity}`,
        canAct    && 'can-act-glow',
        selected  && 'attacker-glow',
        isTarget  && 'is-target-glow',
        frozen    && 'frozen-look',
        attackAnim && 'card-attack-anim',
        damageAnim && 'card-damage-anim',
        isNew      && 'card-entrance',
      )}
      title={`${card.data.name}\n${card.data.description}\n⚔${atk} ❤${hp}${frozen ? ' ❄️' : ''}${sick ? ' 💤' : ''}`}
    >
      {/* Верх: emoji + стоимость */}
      <div className="card-top">
        <span className="card-emoji">{card.data.emoji}</span>
        <span className="card-cost">{card.data.cost}</span>
      </div>

      {/* Арт: большой emoji */}
      <div className="card-art-area">
        <span style={{ fontSize: 'clamp(16px,2.8vw,34px)', opacity: 0.16 }}>{card.data.emoji}</span>
      </div>

      {/* Низ: имя, ключевые слова, статусы, статы */}
      <div className="card-bottom">
        <div className="card-name">{card.data.name}</div>

        {card.keywords.length > 0 && (
          <div className="card-keywords">
            {card.keywords.slice(0, 4).map(k => (
              <span key={k} title={KW_LABELS[k]} style={{ opacity: 0.85 }}>{KW_ICONS[k]}</span>
            ))}
          </div>
        )}

        <div className="card-status">
          {frozen             && <span title="Заморожен">❄️</span>}
          {sick               && <span title="Болезнь призыва">💤</span>}
          {card.hasAttacked && !sick && <span title="Атаковал" style={{ color: '#6b7280' }}>✓</span>}
          {canAct             && <span className="animate-pulse" title="Может атаковать" style={{ color: '#4ade80' }}>⚔️</span>}
        </div>

        {card.data.type === 'creature' && (
          <div className="card-stats">
            <span className="stat-atk">{atk}⚔</span>
            <span className={cn('stat-hp', halfHP ? 'wounded' : 'healthy')}>{hp}❤</span>
          </div>
        )}
        {card.data.type === 'land'        && <div style={{ textAlign:'center', fontSize:'clamp(8px,0.9vw,11px)', color:'#c9a84c' }}>🏔️ Земля</div>}
        {card.data.type === 'spell'       && <div style={{ textAlign:'center', fontSize:'clamp(8px,0.9vw,11px)', color:'#93c5fd' }}>✨ Заклинание</div>}
        {card.data.type === 'enchantment' && <div style={{ textAlign:'center', fontSize:'clamp(8px,0.9vw,11px)', color:'#c4b5fd' }}>🔮 Наложение</div>}
      </div>

      {/* Ледяной оверлей */}
      {frozen && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(103,232,249,0.09)',
          pointerEvents: 'none', borderRadius: 'inherit',
        }} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ЭТАП 2+4 — CREATURE SLOT
   CardSlot: определяет позицию (grid ячейка)
   CardContainer: hover, scale (transform)
   CardVisual: artwork, frame, foil
   ══════════════════════════════════════════════════════ */
function CreatureSlot({
  card, owner, opponent, isEnemy,
  selected, isTarget, canAct,
  attackAnim, damageAnim, isNew, isDropTarget,
  isAttackLane,
  onClick, cardRef,
}: {
  card?: CardInstance;
  owner: PlayerState;
  opponent: PlayerState;
  isEnemy?: boolean;
  selected?: boolean;
  isTarget?: boolean;
  canAct?: boolean;
  attackAnim?: boolean;
  damageAnim?: boolean;
  isNew?: boolean;
  isDropTarget?: boolean;
  isAttackLane?: boolean;
  onClick?: () => void;
  cardRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    /* CardSlot */
    <div
      className={cn(
        'creature-slot',
        card && 'occupied',
        isDropTarget && !card && 'drop-target',
        isAttackLane && 'attack-lane',
      )}
    >
      {card ? (
        /* CardContainer — только transform, z-index */
        <div
          ref={cardRef}
          onClick={onClick}
          className={cn(
            'game-card-container',
            selected  && 'attacker-selected',
            isTarget  && 'is-target',
            canAct && !selected && 'can-act',
          )}
          style={{ cursor: onClick ? 'pointer' : 'default' }}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onClick?.()}
        >
          {/* CardVisual — overflow:hidden, чистый UI */}
          <CardVisual
            card={card}
            owner={owner}
            opponent={opponent}
            selected={selected}
            isTarget={isTarget}
            canAct={canAct}
            frozen={card.frozen > 0}
            attackAnim={attackAnim}
            damageAnim={damageAnim}
            isNew={isNew}
          />
        </div>
      ) : (
        /* Пустой слот-плейсхолдер */
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: isDropTarget
            ? 'rgba(74,222,128,0.4)'
            : isEnemy ? 'rgba(255,100,100,0.04)' : 'rgba(100,180,100,0.04)',
          fontSize: isDropTarget ? 'clamp(16px,2.5vw,26px)' : 'clamp(12px,1.8vw,18px)',
          fontWeight: 700,
          transition: 'color 0.22s',
          pointerEvents: 'none',
        }}>
          {isDropTarget ? '↓' : ''}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   HERO ZONE COMPONENT
   ══════════════════════════════════════════════════════ */
function HeroZone({
  player, label, isCurrentTurn, isEnemy,
  showAttackTarget, onAttackHero, onDeckClick, onGraveyardClick,
}: {
  player: PlayerState;
  label: string;
  isCurrentTurn: boolean;
  isEnemy?: boolean;
  showAttackTarget?: boolean;
  onAttackHero?: () => void;
  onDeckClick?: () => void;
  onGraveyardClick?: () => void;
}) {
  const healthPct = Math.max(0, (player.health / player.maxHealth) * 100);
  const hpColor   = healthPct > 50 ? '#22c55e' : healthPct > 25 ? '#eab308' : '#ef4444';
  const maxPips   = Math.min(player.maxMana, 10);
  const fullPips  = Math.min(player.mana, maxPips);

  return (
    <div
      data-enemy-hero={isEnemy ? '' : undefined}
      className="hero-zone"
      style={{
        background: isCurrentTurn
          ? 'linear-gradient(90deg, rgba(201,168,76,0.06), rgba(201,168,76,0.02))'
          : 'rgba(0,0,0,0.3)',
        borderTop:    isEnemy ? '1px solid rgba(255,255,255,0.04)' : undefined,
        borderBottom: !isEnemy ? '1px solid rgba(255,255,255,0.04)' : undefined,
        cursor: showAttackTarget ? 'crosshair' : 'default',
        outline: showAttackTarget ? '2px solid rgba(239,68,68,0.45)' : undefined,
        outlineOffset: '-2px',
        transition: 'outline 0.15s, background 0.35s',
      }}
      onClick={showAttackTarget ? onAttackHero : undefined}
    >
      {/* Аватар */}
      <div className="hero-avatar" style={{
        background: isEnemy ? 'rgba(180,40,40,0.25)' : 'rgba(40,80,180,0.25)',
        border: `2px solid ${isEnemy ? 'rgba(200,60,60,0.3)' : 'rgba(60,100,220,0.3)'}`,
        boxShadow: isCurrentTurn
          ? `0 0 14px ${isEnemy ? 'rgba(200,60,60,0.28)' : 'rgba(60,100,220,0.28)'}`
          : 'none',
      }}>
        {isEnemy ? AI_EMOJI : '👤'}
      </div>

      {/* Информация */}
      <div className="hero-info">
        <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'space-between' }}>
          <span className="hero-name">{label}</span>
          {isCurrentTurn && (
            <span style={{
              fontSize: 'clamp(8px,0.85vw,11px)', fontWeight: 700,
              color: isEnemy ? '#fca5a5' : '#86efac',
              background: isEnemy ? 'rgba(185,28,28,0.2)' : 'rgba(21,128,61,0.2)',
              padding: '1px 6px', borderRadius: '999px', flexShrink: 0,
            }}>
              {isEnemy ? 'ХОД' : 'ВАШ ХОД'}
            </span>
          )}
        </div>

        {/* HP bar */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div className="hero-hp-bar-track" style={{ flex: 1 }}>
            <div className="hero-hp-bar-fill" style={{ width: `${healthPct}%`, background: hpColor }} />
          </div>
          <span className="hero-hp-text" style={{
            color: player.health <= 5 ? '#f87171' : player.health <= 10 ? '#fbbf24' : '#fff',
          }}>
            {player.health}/{player.maxHealth}
          </span>
        </div>

        {/* Мана-пипы */}
        <div className="hero-mana-pips">
          {Array.from({ length: maxPips }).map((_, i) => (
            <div key={i} className={cn('mana-pip', i < fullPips ? 'full' : 'spent')} />
          ))}
          {player.maxMana > 10 && (
            <span style={{ color: '#60a5fa', fontSize: 'clamp(8px,0.8vw,10px)', marginLeft: 2 }}>
              +{player.maxMana - 10}
            </span>
          )}
        </div>
      </div>

      {/* Колода + Кладбище */}
      <div style={{ display:'flex', gap:'clamp(4px,0.6vw,8px)', alignItems:'center', flexShrink:0 }}>
        <button
          onClick={e => { e.stopPropagation(); onDeckClick?.(); }}
          className="deck-zone"
          title={`Колода: ${player.deck.length} карт`}
          style={{ background:'none', border:'none', padding:0 }}
        >
          <span style={{ fontSize: 'clamp(12px,1.6vw,20px)' }}>🂠</span>
          <span className="deck-count">{player.deck.length}</span>
        </button>

        <button
          onClick={e => { e.stopPropagation(); onGraveyardClick?.(); }}
          className="graveyard-zone"
          title={`Кладбище: ${player.graveyard.length} карт`}
          style={{ background:'none', border:'none', padding:0 }}
        >
          <span style={{ fontSize: 'clamp(12px,1.6vw,20px)' }}>☠️</span>
          <span className="graveyard-count">{player.graveyard.length}</span>
        </button>

        {/* Атаковать героя — индикатор прямо в hero zone */}
        {showAttackTarget && (
          <div style={{
            padding: '3px 8px',
            background: 'rgba(185,28,28,0.42)',
            border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: 7, color: '#fca5a5',
            fontSize: 'clamp(9px,0.85vw,11px)', fontWeight: 700,
            cursor: 'crosshair',
            animation: 'attackBtnPulse 0.9s ease-in-out infinite',
            flexShrink: 0,
          }}>
            ⚔️ Атаковать
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CARD PREVIEW PANEL (фиксированный оверлей)
   ══════════════════════════════════════════════════════ */
function CardPreviewPanel({ card, owner, gs, onClose }: {
  card: CardInstance;
  owner: 'player1' | 'player2';
  gs: GameState;
  onClose: () => void;
}) {
  const opp = owner === 'player1' ? 'player2' : 'player1';
  const colorBg: Record<string, string> = {
    blue: '#0d1b3a', red: '#3a1010', green: '#0a2510',
    white: '#2a2010', black: '#1a0f20', colorless: '#252525',
  };
  return (
    <div className="card-preview-panel" onClick={e => e.stopPropagation()}>
      <div style={{
        background: 'rgba(7,6,15,0.97)', border: '1px solid rgba(201,168,76,0.25)',
        borderRadius: 14, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        position: 'relative',
        backdropFilter: 'blur(16px)',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 8, right: 8, zIndex: 10,
          background: 'rgba(255,255,255,0.08)', border: 'none',
          color: '#9ca3af', cursor: 'pointer', width: 24, height: 24,
          borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, transition: 'background 0.15s',
        }}>✕</button>

        <div style={{
          height: 'clamp(60px,7vw,100px)',
          background: `linear-gradient(160deg,${colorBg[card.data.color] ?? '#252525'},#0a0818)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 'clamp(30px,4vw,50px)', position: 'relative',
        }}>
          {card.data.emoji}
          <div style={{ position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent,rgba(7,6,15,0.9))' }} />
        </div>

        <div style={{ padding: '10px 14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
            <div>
              <div style={{ fontWeight:700, color:'#fff', fontSize:'clamp(12px,1.3vw,16px)' }}>
                {card.data.name}
              </div>
              <div style={{ color:'#6b7280', fontSize:'clamp(9px,0.9vw,11px)' }}>
                {card.data.type === 'creature' ? 'Существо'
                  : card.data.type === 'spell' ? 'Заклинание'
                  : card.data.type === 'enchantment' ? 'Наложение' : 'Земля'}
                {' · '}
                <span style={{ color:
                  card.data.rarity === 'mythic' ? '#fb923c'
                  : card.data.rarity === 'rare' ? '#f59e0b' : '#9ca3af' }}>
                  {card.data.rarity === 'mythic' ? '★★★'
                    : card.data.rarity === 'rare' ? '★★'
                    : card.data.rarity === 'uncommon' ? '★' : '○'}
                </span>
              </div>
            </div>
            <span style={{
              width:'clamp(22px,2.5vw,30px)', height:'clamp(22px,2.5vw,30px)',
              background:'#1d4ed8', color:'#fff', fontWeight:800,
              borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'clamp(11px,1.1vw,14px)', flexShrink:0,
            }}>{card.data.cost}</span>
          </div>

          {card.keywords.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
              {card.keywords.map(k => (
                <span key={k} style={{
                  background:'rgba(88,28,135,0.35)', color:'#d8b4fe',
                  border:'1px solid rgba(147,51,234,0.2)',
                  padding:'1px 7px', borderRadius:4, fontSize:'clamp(9px,0.9vw,11px)',
                }}>{KW_LABELS[k]}</span>
              ))}
            </div>
          )}

          <p style={{ color:'#d1d5db', fontSize:'clamp(10px,1vw,13px)', lineHeight:1.5, marginBottom:8 }}>
            {card.data.description}
          </p>

          {card.data.flavor && (
            <p style={{
              color:'rgba(201,168,76,0.5)', fontStyle:'italic',
              fontSize:'clamp(9px,0.85vw,11px)', lineHeight:1.4,
              borderTop:'1px solid rgba(201,168,76,0.1)', paddingTop:8,
            }}>{card.data.flavor}</p>
          )}

          {card.data.type === 'creature' && (
            <div style={{
              display:'flex', gap:12, marginTop:8,
              background:'rgba(0,0,0,0.4)', borderRadius:8, padding:'6px 12px',
              fontSize:'clamp(10px,1vw,13px)',
            }}>
              <span>⚔️ {getEffectiveAttack(card, gs[owner], gs[opp])}</span>
              <span>❤️ {getEffectiveHealth(card, gs[owner])}/{card.maxHealth}</span>
              {card.frozen > 0 && <span style={{ color:'#67e8f9' }}>❄️{card.frozen}</span>}
              {card.summoningSickness && <span style={{ color:'#fbbf24' }}>💤</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   GRAVEYARD MODAL
   ══════════════════════════════════════════════════════ */
function GraveyardModal({ cards, title, onClose }: {
  cards: CardInstance[];
  title: string;
  onClose: () => void;
}) {
  const empty: PlayerState = {
    health:0, maxHealth:20, mana:0, maxMana:0,
    hand:[], deck:[], field:[], graveyard:[], enchantments:[],
    landsPlayed:0, maxLandsPerTurn:1,
  };
  return (
    <div className="zone-modal-overlay" onClick={onClose}>
      <div className="zone-modal" onClick={e => e.stopPropagation()}>
        <div className="zone-modal-header">
          <span style={{ color:'#f0d68a', fontWeight:700, fontSize:'clamp(13px,1.3vw,16px)' }}>
            ☠️ {title}
          </span>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:18 }}>✕</button>
        </div>
        <div className="zone-modal-body">
          {cards.length === 0 ? (
            <p style={{ color:'#4b5563', fontStyle:'italic', fontSize:14, alignSelf:'center' }}>Пусто</p>
          ) : (
            cards.map(card => (
              <div key={card.uid} style={{ width:'var(--hand-card-w)', height:'var(--hand-card-h)' }}>
                <CardVisual card={card} owner={empty} opponent={empty} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   HAND CARD (с дуговой раскладкой)
   ══════════════════════════════════════════════════════ */
function HandCard({
  card, selected, canPlay, isLand,
  arcStyle, onClick, onDragStart, onDragEnd,
}: {
  card: CardInstance;
  selected?: boolean;
  canPlay?: boolean;
  isLand?: boolean;
  arcStyle?: React.CSSProperties;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  /* Двойной тап / двойной клик для мобильных */
  const lastTapRef = useRef(0);
  const handleClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 380) {
      // Двойной тап → разыграть
      onClick?.();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      onClick?.();
    }
  };

  return (
    <div
      className={cn(
        'hand-card-wrapper',
        selected && 'selected',
        !canPlay && 'not-playable',
      )}
      style={arcStyle}
      onClick={handleClick}
      draggable={canPlay}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* CardVisual — весь рендер карты */}
      <div
        className={cn(
          'game-card',
          `color-${card.data.color}`,
          `rarity-${card.data.rarity}`,
          selected && 'attacker-glow',
        )}
        style={{
          border: selected
            ? '2px solid rgba(250,204,21,0.8)'
            : canPlay && isLand
              ? '2px solid rgba(201,168,76,0.6)'
              : canPlay
                ? '2px solid rgba(74,222,128,0.42)'
                : undefined,
          boxShadow: canPlay && !selected
            ? isLand
              ? '0 0 10px rgba(201,168,76,0.32)'
              : '0 0 8px rgba(74,222,128,0.22)'
            : undefined,
        }}
        title={`${card.data.name}\n${card.data.description}\n${canPlay ? '👆 Двойной тап / клик' : '❌ Мало маны'}`}
      >
        <div className="card-top">
          <span className="card-emoji">{card.data.emoji}</span>
          <span className="card-cost" style={{
            background: isLand ? '#92400e' : canPlay ? '#1d4ed8' : '#374151',
            color: canPlay ? '#fff' : '#9ca3af',
          }}>{card.data.cost}</span>
        </div>

        <div className="card-art-area">
          <span style={{ fontSize:'clamp(14px,2.5vw,30px)', opacity:0.16 }}>{card.data.emoji}</span>
        </div>

        <div className="card-bottom">
          <div className="card-name">{card.data.name}</div>
          {card.data.type === 'creature' && (
            <div className="card-stats">
              <span className="stat-atk">{card.data.attack}⚔</span>
              <span className="stat-hp healthy">{card.data.health}❤</span>
            </div>
          )}
          {card.data.type === 'land'        && <div style={{ textAlign:'center', fontSize:'clamp(7px,0.85vw,10px)', color:'#c9a84c' }}>🏔️</div>}
          {card.data.type === 'spell'       && <div style={{ textAlign:'center', fontSize:'clamp(7px,0.85vw,10px)', color:'#93c5fd' }}>✨</div>}
          {card.data.type === 'enchantment' && <div style={{ textAlign:'center', fontSize:'clamp(7px,0.85vw,10px)', color:'#c4b5fd' }}>🔮</div>}
        </div>

        {/* Индикатор «можно разыграть» */}
        {canPlay && !selected && (
          <div style={{
            position: 'absolute', top: 4, left: 4,
            width: 'clamp(4px,0.5vw,7px)', height: 'clamp(4px,0.5vw,7px)',
            borderRadius: '50%',
            background: isLand ? '#d97706' : '#22c55e',
            animation: 'slotDropPulse 1.6s ease-in-out infinite',
            zIndex: 10,
          }} />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   DAMAGE NUMBERS
   ══════════════════════════════════════════════════════ */
type DmgEntry = { id: number; value: number; x: number; y: number; type: 'damage' | 'heal' };

function DamageNumbers({ entries }: { entries: DmgEntry[] }) {
  return (
    <>
      {entries.map(d => (
        <div
          key={d.id}
          className={cn('dmg-number', d.type)}
          style={{ left: d.x, top: d.y }}
        >
          {d.type === 'heal' ? '+' : '-'}{d.value}
        </div>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════════════════════════════ */
export function App() {
  const [gs, setGs]                             = useState<GameState>(createInitialGameState);
  const [selectedHand, setSelectedHand]         = useState<string | null>(null);
  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null);
  const [inspected, setInspected]               = useState<{ card: CardInstance; owner: 'player1' | 'player2' } | null>(null);
  const [aiThinking, setAiThinking]             = useState(false);
  const [showTurnBanner, setShowTurnBanner]      = useState(false);
  const [dragCardUid, setDragCardUid]           = useState<string | null>(null);
  const [dropZoneActive, setDropZoneActive]     = useState(false);
  const [attackAnimUid, setAttackAnimUid]       = useState<string | null>(null);
  const [damageAnimUid, setDamageAnimUid]       = useState<string | null>(null);
  const [showLog, setShowLog]                   = useState(false);
  const [gameStarted, setGameStarted]           = useState(false);
  const [newCardUids, setNewCardUids]           = useState<Set<string>>(new Set());
  const [graveyardModal, setGraveyardModal]     = useState<{ cards: CardInstance[]; title: string } | null>(null);
  const [dmgNumbers, setDmgNumbers]             = useState<DmgEntry[]>([]);
  const [aiActionText, setAiActionText]         = useState<string | null>(null);
  const [sparks, setSparks]                     = useState<Spark[]>([]);

  const { msgs: aiFeedMsgs, push: pushAiFeed, clear: clearAiFeed } = useAiFeed();

  const mountedRef   = useRef(true);
  const cardRefsMap  = useRef<Map<string, HTMLDivElement>>(new Map());
  const logRef       = useRef<HTMLDivElement>(null);
  const prevP1Field  = useRef<string[]>([]);
  const prevP2Field  = useRef<string[]>([]);

  /* ── Event Timeline — синхронизация анимаций ──
     Timeline гарантирует порядок: ATTACK → DAMAGE → DEATH
     Каждый обработчик возвращает Promise, следующее событие
     стартует только после завершения предыдущего.
  ── */
  const timeline = useEventTimeline({
    // Атака: запускаем anim-классы через React state
    onAttackAnim: (attackerUid, defenderUid, ms = 520) => {
      setAttackAnimUid(attackerUid);
      setTimeout(() => { if (mountedRef.current) setAttackAnimUid(null); }, ms);
      if (defenderUid) {
        // Анимация получения урона стартует на пике атаки (~40%)
        setTimeout(() => {
          setDamageAnimUid(defenderUid);
          setTimeout(() => { if (mountedRef.current) setDamageAnimUid(null); }, Math.round(ms * 0.55));
        }, Math.round(ms * 0.35));
      }
    },
    // Отдельная анимация урона (блок без контратаки)
    onDamageAnim: (uid, ms = 280) => {
      setDamageAnimUid(uid);
      setTimeout(() => { if (mountedRef.current) setDamageAnimUid(null); }, ms);
    },
    // Числа урона / лечения
    onDamageNumber: (value, x, y, type) => spawnDmg(value, x, y, type),
    // Спарки (искры) при попадании
    onSparks: (x, y, color) => spawnSparks(x, y, color),
    // Смерть карты — поле обновляется движком, здесь только доп. эффект
    onDeathAnim: (_name, _emoji, _color) => {
      // Дополнительный визуальный эффект смерти можно добавить здесь
    },
    // Плашка ИИ (медленное текучее появление)
    onAiMessage: (text, ttl) => pushAiFeed(text, ttl),
  });
  const { dispatchAITurn, dispatchPlayerAction, clearTimeline } = timeline;

  const isP1Turn = gs.currentTurn === 'player1';
  const me       = gs.player1;
  const enemy    = gs.player2;

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [gs.log.length]);

  /* ── Спарки ── */
  const spawnSparks = useCallback((x: number, y: number, color = '#fbbf24') => {
    const ns: Spark[] = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i + Math.random(),
      x, y,
      dx: (Math.random() - 0.5) * 62,
      dy: (Math.random() - 0.5) * 62,
      color: i % 3 === 0 ? '#f87171' : i % 3 === 1 ? '#fbbf24' : color,
    }));
    setSparks(prev => [...prev, ...ns]);
    setTimeout(() => setSparks(prev => prev.filter(s => !ns.some(n => n.id === s.id))), 500);
  }, []);

  /* ── Числа урона ── */
  const spawnDmg = useCallback((value: number, x: number, y: number, type: 'damage' | 'heal' = 'damage') => {
    const id = Date.now() + Math.random();
    setDmgNumbers(prev => [...prev, { id, value, x, y, type }]);
    setTimeout(() => setDmgNumbers(prev => prev.filter(d => d.id !== id)), 950);
  }, []);

  /* ── Отслеживание новых карт на поле ── */
  useEffect(() => {
    const curP1 = me.field.map(c => c.uid);
    const curP2 = enemy.field.map(c => c.uid);
    const newOnes = new Set<string>();
    curP1.filter(u => !prevP1Field.current.includes(u)).forEach(u => newOnes.add(u));
    curP2.filter(u => !prevP2Field.current.includes(u)).forEach(u => newOnes.add(u));
    if (newOnes.size > 0) {
      setNewCardUids(newOnes);
      setTimeout(() => setNewCardUids(new Set()), 480);
    }
    prevP1Field.current = curP1;
    prevP2Field.current = curP2;
  }, [me.field, enemy.field]);

  /* ── AI ход ── */
  useEffect(() => {
    if (gs.currentTurn !== 'player2' || gs.gameOver || !gameStarted) return;
    setAiThinking(true);
    setAiActionText(null);

    const timer = setTimeout(() => {
      if (!mountedRef.current) return;

      // Сохраняем поля ДО хода для определения смертей и новых карт
      const prevP2Field = gs.player2.field.map(c => ({
        uid: c.uid, name: c.data.name, emoji: c.data.emoji, color: c.data.color,
      }));
      const prevP1Field = gs.player1.field.map(c => ({
        uid: c.uid, name: c.data.name, emoji: c.data.emoji, color: c.data.color,
        health: c.currentHealth,
      }));

      const result = aiTurn(gs);
      setGs(result.state);
      setAiThinking(false);

      // ── Timeline: строго последовательные события ──

      // 1. Карты сыгранные ИИ (новые на поле)
      const newOnField = result.state.player2.field.filter(
        c => !prevP2Field.some(p => p.uid === c.uid)
      );

      const playedEvents = newOnField.map(c => ({
        cardId: c.data.id, cardUid: c.uid,
        cardName: c.data.name, cardEmoji: c.data.emoji, cardColor: c.data.color,
      }));

      // 2. Атаки ИИ из result.actions
      const attackEvents = result.actions
        .filter(a => a.type === 'attack-hero' || a.type === 'attack-creature')
        .map(a => {
          const attCard = result.state.player2.field.find(c => c.uid === a.attackerUid)
            ?? result.state.player2.graveyard.find(c => c.uid === a.attackerUid);
          const defCard = a.type === 'attack-creature' && a.defenderUid
            ? prevP1Field.find(c => c.uid === a.defenderUid)
            : undefined;
          const isHero = a.type === 'attack-hero';

          // Координаты цели
          const defRef = a.defenderUid ? cardRefsMap.current.get(a.defenderUid) : null;
          const heroEl = document.querySelector('[data-enemy-hero]') as HTMLElement | null;
          const targetEl = isHero ? heroEl : defRef ?? heroEl;
          const rect = targetEl?.getBoundingClientRect();
          const tx = rect ? rect.left + rect.width / 2 : undefined;
          const ty = rect ? rect.top + rect.height / 2 : undefined;

          // Умерло ли существо игрока после атаки
          const defDied = !isHero && a.defenderUid
            && !result.state.player1.field.some(c => c.uid === a.defenderUid);

          // Плашка ИИ
          const txt = isHero
            ? `⚔️ ${attCard?.data.name ?? '?'} атакует героя!`
            : `⚔️ ${attCard?.data.name ?? '?'} атакует ${defCard?.name ?? '?'}!`;
          setAiActionText(txt);

          return {
            attackerUid: a.attackerUid ?? '',
            attackerName: attCard?.data.name ?? '?',
            attackerEmoji: attCard?.data.emoji ?? '⚔️',
            damage: attCard?.data.attack ?? 0,
            defenderUid: a.defenderUid,
            defenderName: defCard?.name,
            defenderX: isHero ? undefined : tx,
            defenderY: isHero ? undefined : ty,
            heroX: isHero ? tx : undefined,
            heroY: isHero ? ty : undefined,
            died: defDied || false,
            defenderEmoji: defCard?.emoji,
            defenderColor: defCard?.color,
          };
        });

      // 3. Отправляем в Timeline — гарантированный порядок: play → attack → damage → death
      dispatchAITurn({
        played: playedEvents,
        attacks: attackEvents,
      });

      // Сообщение ИИ о сыгранных картах
      if (newOnField.length > 0) {
        const last = newOnField[newOnField.length - 1];
        pushAiFeed(`${AI_EMOJI} разыграл ${last.data.emoji} ${last.data.name}`, 5500);
      }

      setTimeout(() => { if (mountedRef.current) setAiActionText(null); }, 3500);
    }, 1500 + Math.random() * 500);

    return () => clearTimeout(timer);
  }, [gs.currentTurn, gs.gameOver, gameStarted]); // eslint-disable-line

  /* ── Computed ── */
  const hasPlayableLand = me.hand.some(c => c.data.type === 'land') && me.landsPlayed < me.maxLandsPerTurn;
  const hasPlayableCard = me.hand.some(c => c.data.type !== 'land' && c.data.cost <= me.mana);
  const hasAttackers    = me.field.some(c =>
    !c.summoningSickness && !c.hasAttacked && c.frozen <= 0 && !c.keywords.includes('defender'));
  const landPlayed      = me.landsPlayed > 0;

  const phase = (() => {
    if (!isP1Turn || gs.gameOver) return 'wait' as const;
    if (hasPlayableLand && !landPlayed) return 'land' as const;
    if (hasPlayableCard || hasPlayableLand) return 'play' as const;
    if (hasAttackers) return 'attack' as const;
    return 'end' as const;
  })();

  const getHint = (): string => {
    if (gs.gameOver)      return '🏁 Игра окончена!';
    if (!isP1Turn)        return `⏳ ${AI_NAME} размышляет...`;
    if (selectedAttacker) return '🎯 Выберите цель или «В героя»';
    if (dragCardUid)      return '🖱️ Перетащите карту на поле';
    if (phase === 'land')   return '🏔️ Сыграйте ЗЕМЛЮ (двойной тап)';
    if (phase === 'play')   return '🃏 Играйте карты (двойной тап / перетащите)';
    if (phase === 'attack') return '⚔️ Выберите существо → атакуйте';
    return '⏭️ Нажмите «Конец хода»';
  };

  /* ── Actions ── */
  const doPlayCard = useCallback((uid: string) => {
    const card = me.hand.find(c => c.uid === uid);
    if (!card || !isP1Turn || gs.gameOver) return false;
    const next = playCard(gs, 'player1', uid);
    if (next !== gs) {
      setGs(next);
      setSelectedHand(null);
      setInspected(null);

      // Timeline: отправляем событие розыгрыша для синхронизации анимаций
      if (card.data.type === 'land') {
        dispatchPlayerAction({
          type: 'land',
          cardName: card.data.name,
          cardEmoji: card.data.emoji,
          cardColor: card.data.color,
        });
      } else {
        dispatchPlayerAction({
          type: 'play',
          cardId: card.data.id,
          cardUid: card.uid,
          cardName: card.data.name,
          cardEmoji: card.data.emoji,
          cardColor: card.data.color,
        });
      }

      return true;
    }
    return false;
  }, [gs, me.hand, isP1Turn, dispatchPlayerAction]);

  const clickHand = (uid: string) => {
    const card = me.hand.find(c => c.uid === uid);
    if (!card) return;
    setSelectedAttacker(null);
    if (!isP1Turn || gs.gameOver) { setInspected({ card, owner: 'player1' }); return; }
    if (selectedHand === uid) { doPlayCard(uid); return; }
    setSelectedHand(uid);
    setInspected({ card, owner: 'player1' });
  };

  const clickMyCreature = (uid: string) => {
    const card = me.field.find(c => c.uid === uid);
    if (!card) return;
    if (!isP1Turn || gs.gameOver) { setInspected({ card, owner: 'player1' }); return; }
    const canAct = !card.summoningSickness && !card.hasAttacked &&
                   card.frozen <= 0 && !card.keywords.includes('defender');
    if (canAct) {
      if (selectedAttacker === uid) setSelectedAttacker(null);
      else { setSelectedAttacker(uid); setSelectedHand(null); setInspected(null); }
    } else {
      setInspected({ card, owner: 'player1' });
      setSelectedAttacker(null);
    }
  };

  const clickEnemyCreature = (uid: string) => {
    const card = enemy.field.find(c => c.uid === uid);
    if (!card) return;
    if (selectedAttacker && isP1Turn && !gs.gameOver) {
      const attackerCard = me.field.find(c => c.uid === selectedAttacker);
      if (!attackerCard) return;

      const next = attackCreature(gs, 'player1', selectedAttacker, uid);
      if (next !== gs) {
        const atk = getEffectiveAttack(attackerCard, me, enemy);
        const defRef = cardRefsMap.current.get(uid);
        const rx = defRef ? defRef.getBoundingClientRect().left + defRef.getBoundingClientRect().width / 2 : undefined;
        const ry = defRef ? defRef.getBoundingClientRect().top  + defRef.getBoundingClientRect().height / 2 : undefined;

        // Умерло ли существо после атаки
        const defDied = !next.player2.field.some(c => c.uid === uid);
        const atkDied = !next.player1.field.some(c => c.uid === selectedAttacker);
        const hasLifelink = attackerCard.keywords.includes('lifelink');

        // Timeline: ATTACK → DAMAGE → DEATH (строгий порядок)
        dispatchPlayerAction({
          type: 'attack',
          attackerUid: selectedAttacker,
          attackerName: attackerCard.data.name,
          attackerEmoji: attackerCard.data.emoji,
          damage: atk,
          defenderUid: uid,
          defenderName: card.data.name,
          defenderX: rx,
          defenderY: ry,
          died: defDied,
          defenderEmoji: card.data.emoji,
          defenderColor: card.data.color,
          healAmount: hasLifelink ? atk : undefined,
          healX: rx,
          healY: ry,
        });

        // Если атакующий тоже умер — добавляем отдельное событие смерти
        if (atkDied) {
          const atkRef = cardRefsMap.current.get(selectedAttacker);
          const ax = atkRef ? atkRef.getBoundingClientRect().left + atkRef.getBoundingClientRect().width / 2 : undefined;
          const ay = atkRef ? atkRef.getBoundingClientRect().top  + atkRef.getBoundingClientRect().height / 2 : undefined;
          if (ax && ay) spawnSparks(ax, ay, '#f87171');
        }

        setGs(next);
        setSelectedAttacker(null);
        setInspected(null);
      }
      return;
    }
    setInspected({ card, owner: 'player2' });
    setSelectedHand(null);
  };

  const clickAttackHero = () => {
    if (!isP1Turn || !selectedAttacker || gs.gameOver) return;
    const attackerCard = me.field.find(c => c.uid === selectedAttacker);
    if (!attackerCard) return;

    const next = attackPlayer(gs, 'player1', selectedAttacker);
    if (next !== gs) {
      const atk = getEffectiveAttack(attackerCard, me, enemy);
      const heroEl = document.querySelector('[data-enemy-hero]') as HTMLElement | null;
      const rect = heroEl?.getBoundingClientRect();
      const hx = rect ? rect.left + rect.width / 2 : undefined;
      const hy = rect ? rect.top  + rect.height / 2 : undefined;

      const hasLifelink = attackerCard.keywords.includes('lifelink');

      // Timeline: ATTACK → DAMAGE (hero) — гарантированный порядок
      dispatchPlayerAction({
        type: 'attack',
        attackerUid: selectedAttacker,
        attackerName: attackerCard.data.name,
        attackerEmoji: attackerCard.data.emoji,
        damage: atk,
        heroX: hx,
        heroY: hy,
        healAmount: hasLifelink ? atk : undefined,
        healX: hx,
        healY: hy,
      });

      setGs(next);
      setSelectedAttacker(null);
      setInspected(null);
    }
  };

  const clickEndTurn = () => {
    if (!isP1Turn || gs.gameOver) return;
    setGs(endTurn(gs));
    setSelectedHand(null);
    setSelectedAttacker(null);
    setInspected(null);
    setShowTurnBanner(true);
    clearAiFeed();
    setTimeout(() => { if (mountedRef.current) setShowTurnBanner(false); }, 1400);
  };

  const restart = () => {
    setGs(createInitialGameState());
    setSelectedHand(null);
    setSelectedAttacker(null);
    setInspected(null);
    setNewCardUids(new Set());
    prevP1Field.current = [];
    prevP2Field.current = [];
    cardRefsMap.current.clear();
    clearAiFeed();
    clearTimeline();   // очищаем очередь событий при рестарте
  };

  /* Drag & Drop */
  const handleDragStart = (e: React.DragEvent, uid: string) => {
    setDragCardUid(uid);
    setSelectedHand(null);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragEnd   = () => { setDragCardUid(null); setDropZoneActive(false); };
  const handleDragOver  = (e: React.DragEvent) => { if (dragCardUid) { e.preventDefault(); setDropZoneActive(true); } };
  const handleDragLeave = () => setDropZoneActive(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDropZoneActive(false);
    if (dragCardUid) { doPlayCard(dragCardUid); setDragCardUid(null); }
  };

  const clickBG = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && inspected && !selectedAttacker) {
      setInspected(null); setSelectedHand(null);
    }
  };

  /* ── Board slots renderer ── */
  const renderBoardSlots = (
    fieldCards: CardInstance[],
    fieldOwner: PlayerState,
    fieldOpponent: PlayerState,
    isEnemy: boolean,
    attackerIndex?: number,   // Этап 5 — attack lane
  ) => {
    const slots = Array.from({ length: MAX_FIELD }, (_, i) => fieldCards[i] ?? null);
    return slots.map((card, i) => {
      // Этап 5: подсвечиваем дорожку если атакующий стоит в столбце i
      const isAttackLane = !isEnemy && !!selectedAttacker && attackerIndex === i;
      const isEnemyAttackLane = isEnemy && !!selectedAttacker && attackerIndex === i;

      if (!card) {
        return (
          <CreatureSlot
            key={`empty-${isEnemy ? 'e' : 'p'}-${i}`}
            owner={fieldOwner} opponent={fieldOpponent}
            isEnemy={isEnemy}
            isDropTarget={!isEnemy && dropZoneActive}
            isAttackLane={isEnemyAttackLane}
          />
        );
      }
      const canActCard = !isEnemy && isP1Turn &&
        !card.summoningSickness && !card.hasAttacked &&
        card.frozen <= 0 && !card.keywords.includes('defender') && !gs.gameOver;
      return (
        <CreatureSlot
          key={card.uid}
          card={card}
          owner={fieldOwner}
          opponent={fieldOpponent}
          isEnemy={isEnemy}
          selected={!isEnemy && selectedAttacker === card.uid}
          isTarget={isEnemy && !!selectedAttacker}
          canAct={canActCard}
          attackAnim={attackAnimUid === card.uid}
          damageAnim={damageAnimUid === card.uid}
          isNew={newCardUids.has(card.uid)}
          isDropTarget={!isEnemy && dropZoneActive && !fieldCards[i]}
          isAttackLane={isAttackLane || isEnemyAttackLane}
          cardRef={el => {
            if (el) cardRefsMap.current.set(card.uid, el);
            else cardRefsMap.current.delete(card.uid);
          }}
          onClick={isEnemy ? () => clickEnemyCreature(card.uid) : () => clickMyCreature(card.uid)}
        />
      );
    });
  };

  // Индекс атакующего в массиве поля
  const attackerIndex = selectedAttacker
    ? me.field.findIndex(c => c.uid === selectedAttacker)
    : -1;

  /* Phase pills */
  const phases = [
    { id:'land',   icon:'🏔️', active: phase==='land',   done: landPlayed },
    { id:'play',   icon:'🃏', active: phase==='play',   done: !hasPlayableCard && landPlayed },
    { id:'attack', icon:'⚔️', active: phase==='attack', done: !hasAttackers },
    { id:'end',    icon:'⏭️', active: phase==='end',    done: false },
  ];

  /* ══════════════════════════════════════════════════════
     START SCREEN
     ══════════════════════════════════════════════════════ */
  if (!gameStarted) {
    return (
      <div style={{
        height:'100dvh', width:'100%',
        background:'radial-gradient(ellipse at 50% 60%, #110a1e, #07060f)',
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        gap:'clamp(16px,3vh,28px)', padding:24,
        userSelect:'none', overflow:'hidden',
      }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'clamp(52px,10vw,88px)', marginBottom:8 }}>🦉</div>
          <h1 style={{ color:'#f0d68a', fontWeight:800, margin:0, fontSize:'clamp(22px,5vw,42px)' }}>
            Омск: Карточная Арена
          </h1>
          <p style={{ color:'#4b5563', marginTop:6, fontSize:'clamp(12px,2vw,16px)' }}>
            Карточная игра по мотивам Magic: The Gathering
          </p>
        </div>

        <button
          onClick={() => setGameStarted(true)}
          style={{
            padding: 'clamp(10px,1.8vh,16px) clamp(24px,5vw,40px)',
            background: 'linear-gradient(135deg, #92400e, #d97706)',
            color:'#fff', fontWeight:800, border:'none', borderRadius:12,
            fontSize:'clamp(14px,2vw,20px)', cursor:'pointer',
            boxShadow:'0 8px 24px rgba(217,119,6,0.3)',
            transition:'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          ⚔️ Начать игру
        </button>

        <div style={{ color:'#374151', textAlign:'center', fontSize:'clamp(10px,1.5vw,13px)', lineHeight:2 }}>
          <p>🏔️ Разыгрывайте земли для маны</p>
          <p>🃏 Вызывайте существ на поле (двойной тап)</p>
          <p>⚔️ Атакуйте противника</p>
          <p>🏆 Снизьте его здоровье до 0!</p>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     GAME BOARD — MAIN RENDER
     ══════════════════════════════════════════════════════════════ */
  return (
    <div className="game-grid" onClick={clickBG}>

      {/* ══ 1. TOP BAR ══ */}
      <div className="zone-topbar">
        <button
          onClick={() => setGameStarted(false)}
          style={{
            background:'none', border:'none', color:'#6b7280',
            cursor:'pointer', fontSize:'clamp(10px,1.2vw,14px)',
            padding:'4px 8px', borderRadius:6, transition:'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f0d68a'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; }}
        >
          ← Меню
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:'clamp(6px,1vw,14px)' }}>
          <span style={{ color:'#374151', fontSize:'clamp(9px,1vw,12px)' }}>Ход {gs.turnNumber}</span>
          <span style={{
            fontWeight:700, fontSize:'clamp(10px,1vw,13px)',
            padding:'2px clamp(8px,1vw,12px)', borderRadius:'999px',
            color: isP1Turn ? '#86efac' : '#fca5a5',
            background: isP1Turn ? 'rgba(21,128,61,0.2)' : 'rgba(185,28,28,0.2)',
            border:`1px solid ${isP1Turn ? 'rgba(21,128,61,0.35)' : 'rgba(185,28,28,0.35)'}`,
          }}>
            {isP1Turn ? '🟢 ВАШ ХОД' : `🔴 ${AI_NAME}`}
          </span>
        </div>

        <div style={{ display:'flex', gap:4 }}>
          <button
            onClick={() => setShowLog(!showLog)}
            style={{
              background: showLog ? 'rgba(201,168,76,0.15)' : 'none',
              border:`1px solid ${showLog ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
              color: showLog ? '#f0d68a' : '#6b7280',
              cursor:'pointer', borderRadius:6, padding:'3px 8px',
              fontSize:'clamp(10px,1vw,13px)', transition:'all 0.15s',
            }}
          >
            📜 Лог
          </button>
          <button
            onClick={restart}
            style={{
              background:'none', border:'none', color:'#6b7280',
              cursor:'pointer', borderRadius:6, padding:'3px 8px',
              fontSize:'clamp(10px,1vw,13px)', transition:'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f0d68a'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#6b7280'; }}
            title="Новая игра"
          >
            🔄
          </button>
        </div>
      </div>

      {/* ══ 2. ENEMY HERO ZONE ══ */}
      <div className="zone-enemy-hero">
        <HeroZone
          player={enemy}
          label={`${AI_EMOJI} ${AI_NAME}`}
          isCurrentTurn={!isP1Turn}
          isEnemy
          showAttackTarget={!!selectedAttacker}
          onAttackHero={clickAttackHero}
          onDeckClick={() => setGraveyardModal({ cards: enemy.deck.slice(0,5), title:'Верх колоды противника' })}
          onGraveyardClick={() => setGraveyardModal({ cards: enemy.graveyard, title:'Кладбище Хранителя' })}
        />
        {/* Чары противника */}
        {enemy.enchantments.length > 0 && (
          <div style={{ display:'flex', gap:4, paddingLeft:'clamp(8px,1.5vw,16px)', paddingBottom:2 }}>
            {enemy.enchantments.map(c => (
              <span key={c.uid} className="enchant-chip"
                onClick={e => { e.stopPropagation(); setInspected({ card:c, owner:'player2' }); }}>
                {c.data.emoji} {c.data.name}
              </span>
            ))}
          </div>
        )}
        {/* Рука противника (рубашки) */}
        <div style={{ display:'flex', alignItems:'center', gap:2, paddingLeft:'clamp(8px,1.5vw,16px)', paddingBottom:4 }}>
          {enemy.hand.map((_, i) => <div key={i} className="enemy-hand-card">🂠</div>)}
          {enemy.hand.length > 0 && (
            <span style={{ color:'#4b5563', fontSize:'clamp(8px,0.85vw,11px)', marginLeft:4 }}>
              {enemy.hand.length}
            </span>
          )}
        </div>
      </div>

      {/* ══ 3. ENEMY BOARD — 7 фиксированных слотов ══ */}
      <div
        className="zone-enemy-board"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={e => e.stopPropagation()}
      >
        <div className="board-zone enemy">
          {renderBoardSlots(enemy.field, enemy, me, true, attackerIndex >= 0 ? attackerIndex : undefined)}
        </div>
        {enemy.field.length === 0 && (
          <div style={{
            position:'absolute', inset:0, display:'flex',
            alignItems:'flex-end', justifyContent:'center',
            paddingBottom:8, pointerEvents:'none',
          }}>
            <span style={{ color:'rgba(180,60,60,0.14)', fontSize:'clamp(10px,1.2vw,14px)', fontStyle:'italic' }}>
              Поле противника пусто
            </span>
          </div>
        )}
      </div>

      {/* ══ 4. ЦЕНТРАЛЬНЫЙ РАЗДЕЛИТЕЛЬ — кнопка в центре экрана ══ */}
      <div className="zone-divider">
        <div className="center-divider">

          {/* Левый блок: фазы хода */}
          {isP1Turn && !gs.gameOver && (
            <div className="divider-phases">
              {phases.map((p, idx) => (
                <div key={p.id} style={{ display:'flex', alignItems:'center' }}>
                  <span className={cn('phase-pill', p.active ? 'active' : p.done ? 'done' : 'idle')}>
                    {p.icon}
                  </span>
                  {idx < phases.length - 1 && (
                    <span style={{ color:'#1f2937', fontSize:10, margin:'0 1px' }}>›</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Центр: кнопки */}
          <div className="divider-buttons">
            {selectedAttacker ? (
              /* Режим атаки */
              <>
                <button className="attack-hero-btn" onClick={clickAttackHero}>
                  ⚔️ В героя
                </button>
                <button className="cancel-btn" onClick={() => setSelectedAttacker(null)}>
                  ✕ Отмена
                </button>
              </>
            ) : (
              /* Кнопка конца хода — ВСЕГДА в центре экрана */
              <button
                className={cn('end-turn-btn', isP1Turn && !gs.gameOver ? 'ready' : 'busy')}
                onClick={clickEndTurn}
                disabled={!isP1Turn || gs.gameOver}
                title={
                  !isP1Turn ? 'Сейчас ход противника'
                  : phase === 'end' ? 'Все действия выполнены'
                  : 'Завершить ход досрочно'
                }
              >
                {!isP1Turn
                  ? `${AI_EMOJI} Ход противника`
                  : phase === 'end'
                    ? '⏭️ Конец хода!'
                    : 'Конец хода ⏭️'
                }
              </button>
            )}
          </div>

          {/* Правый блок: подсказка */}
          {!selectedAttacker && (
            <div className="divider-hint" style={{
              color: dragCardUid ? 'rgba(134,239,172,0.75)'
                : phase === 'land' ? 'rgba(252,211,77,0.75)'
                : phase === 'end'  ? 'rgba(107,114,128,0.5)'
                : 'rgba(107,114,128,0.65)',
            }}>
              {isP1Turn && !gs.gameOver ? getHint() : ''}
            </div>
          )}
        </div>
      </div>

      {/* ══ 5. PLAYER BOARD — 7 фиксированных слотов ══ */}
      <div
        className="zone-player-board"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={e => e.stopPropagation()}
      >
        {dropZoneActive && (
          <div className="drop-overlay">
            <span style={{ color:'#4ade80', fontWeight:700, fontSize:'clamp(12px,1.4vw,17px)' }}>
              ↓ Отпустите карту здесь ↓
            </span>
          </div>
        )}
        <div className="board-zone player">
          {renderBoardSlots(me.field, me, enemy, false, attackerIndex >= 0 ? attackerIndex : undefined)}
        </div>
        {me.field.length === 0 && !dropZoneActive && (
          <div style={{
            position:'absolute', inset:0, display:'flex',
            alignItems:'flex-start', justifyContent:'center',
            paddingTop:8, pointerEvents:'none',
          }}>
            <span style={{ color:'rgba(60,140,60,0.14)', fontSize:'clamp(10px,1.2vw,14px)', fontStyle:'italic' }}>
              {me.hand.length > 0 ? '↑ Перетащите существ сюда' : 'Поле пусто'}
            </span>
          </div>
        )}
      </div>

      {/* ══ 6. PLAYER HERO ZONE ══ */}
      <div className="zone-player-hero">
        {me.enchantments.length > 0 && (
          <div style={{ display:'flex', gap:4, paddingLeft:'clamp(8px,1.5vw,16px)', paddingTop:4 }}>
            {me.enchantments.map(c => (
              <span key={c.uid} className="enchant-chip"
                onClick={e => { e.stopPropagation(); setInspected({ card:c, owner:'player1' }); }}>
                {c.data.emoji} {c.data.name}
              </span>
            ))}
          </div>
        )}
        <HeroZone
          player={me}
          label="👤 Вы"
          isCurrentTurn={isP1Turn}
          onDeckClick={() => setGraveyardModal({ cards: me.deck.slice(0,5), title:'Верх вашей колоды' })}
          onGraveyardClick={() => setGraveyardModal({ cards: me.graveyard, title:'Ваше кладбище' })}
        />
      </div>

      {/* ══ 7. ACTION BAR ══ */}
      <div className="zone-actionbar">
        <div className="action-bar">
          {!isP1Turn ? (
            <div style={{
              flex:1, textAlign:'center',
              fontSize:'clamp(10px,1.1vw,13px)',
              color: aiThinking ? '#fcd34d' : '#4b5563',
              fontStyle:'italic',
            }}>
              {aiThinking ? `⏳ ${AI_NAME} думает...` : `${AI_EMOJI} ${AI_NAME}`}
            </div>
          ) : (
            <>
              <span style={{ color:'#374151', fontSize:'clamp(9px,1vw,12px)', flexShrink:0 }}>
                Мана: {me.mana}/{me.maxMana}
              </span>
              <span style={{ color:'#1f2937' }}>·</span>
              <span style={{ color:'#374151', fontSize:'clamp(9px,1vw,12px)', flexShrink:0 }}>
                Рука: {me.hand.length}
              </span>
              <span style={{ color:'#1f2937' }}>·</span>
              <span style={{
                flex:1, fontSize:'clamp(10px,1.1vw,14px)', overflow:'hidden',
                textOverflow:'ellipsis', whiteSpace:'nowrap',
                color: selectedAttacker ? '#fca5a5' : dragCardUid ? '#86efac' : '#4b5563',
              }}>
                {getHint()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ══ 8. HAND ZONE — дуговая раскладка ══ */}
      <div className="zone-hand" style={{
        background: 'rgba(0,0,0,0.78)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div className="hand-zone">
          {me.hand.length === 0 && (
            <div style={{ color:'#374151', fontStyle:'italic', fontSize:'clamp(11px,1.2vw,14px)', alignSelf:'center' }}>
              Рука пуста
            </div>
          )}
          {me.hand.map((card, idx) => {
            const isLand = card.data.type === 'land';
            const canPlay = isP1Turn && !gs.gameOver &&
              (isLand ? me.landsPlayed < me.maxLandsPerTurn : card.data.cost <= me.mana);
            return (
              <HandCard
                key={card.uid}
                card={card}
                selected={selectedHand === card.uid}
                canPlay={canPlay}
                isLand={isLand}
                arcStyle={getArcStyle(idx, me.hand.length)}
                onClick={() => clickHand(card.uid)}
                onDragStart={e => handleDragStart(e, card.uid)}
                onDragEnd={handleDragEnd}
              />
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          OVERLAYS — все через position:fixed
          Строгие z-index: var(--z-*)
         ══════════════════════════════════════════════════ */}

      {/* AI Message Feed — медленное текучее появление */}
      <div className="ai-feed">
        {aiFeedMsgs.map(msg => (
          <div
            key={msg.id}
            className="ai-feed-item"
            style={{
              /* visible=false: opacity:0, смещён влево, blur
                 visible=true:  opacity:1, на месте, без blur
                 CSS transition 1.1s cubic-bezier(0.16,1,0.3,1) делает медленное «натекание» */
              opacity: msg.visible ? 1 : 0,
              transform: msg.visible
                ? 'translateX(0) scale(1)'
                : 'translateX(-16px) scale(0.95)',
              filter: msg.visible ? 'blur(0px)' : 'blur(3px)',
            }}
          >
            <div style={{ display:'flex', alignItems:'flex-start', gap:8 }}>
              <span style={{ fontSize:'clamp(18px,2.5vw,26px)', flexShrink:0 }}>{AI_EMOJI}</span>
              <p style={{
                color:'#e5e7eb', fontSize:'clamp(11px,1.1vw,14px)',
                margin:0, lineHeight:1.55, flex:1,
              }}>
                {msg.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Card Preview Panel */}
      {inspected && !selectedAttacker && (
        <CardPreviewPanel
          card={inspected.card}
          owner={inspected.owner}
          gs={gs}
          onClose={() => { setInspected(null); setSelectedHand(null); }}
        />
      )}

      {/* Log Panel */}
      {showLog && (
        <div className="log-panel" onClick={e => e.stopPropagation()}>
          <div style={{
            padding:'12px 16px', borderBottom:'1px solid rgba(201,168,76,0.1)',
            display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0,
          }}>
            <span style={{ color:'#f0d68a', fontWeight:700, fontSize:'clamp(12px,1.2vw,15px)' }}>📜 Хроника</span>
            <button onClick={() => setShowLog(false)}
              style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:18 }}>✕</button>
          </div>
          <div ref={logRef} style={{ flex:1, overflowY:'auto', padding:'8px 12px' }}>
            {gs.log.slice(-50).map((entry, i) => (
              <div key={i} style={{
                color:'#4b5563', padding:'4px 0',
                borderBottom:'1px solid rgba(255,255,255,0.04)',
                fontSize:'clamp(9px,0.9vw,12px)',
              }}>
                {entry}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Graveyard / Zone modal */}
      {graveyardModal && (
        <GraveyardModal
          cards={graveyardModal.cards}
          title={graveyardModal.title}
          onClose={() => setGraveyardModal(null)}
        />
      )}

      {/* Turn transition banner */}
      {showTurnBanner && (
        <div className="turn-banner">
          <div className="turn-banner-text">{AI_EMOJI} ХОД ХРАНИТЕЛЯ</div>
          <div className="turn-banner-sub">{AI_NAME}</div>
        </div>
      )}

      {/* AI thinking overlay */}
      {aiThinking && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.15)',
          zIndex:'var(--z-banner)' as any, pointerEvents:'none',
        }}>
          <div className="ai-thinking-badge">
            <div style={{ fontSize:'clamp(32px,5vw,52px)', animation:'canActFloat 1.3s ease-in-out infinite' }}>
              {AI_EMOJI}
            </div>
            <div style={{ fontWeight:700, color:'#f0d68a', fontSize:'clamp(12px,1.5vw,18px)' }}>
              {AI_NAME}
            </div>
            {aiActionText ? (
              <div style={{ color:'#fcd34d', fontSize:'clamp(10px,1.1vw,14px)', textAlign:'center', maxWidth:260 }}>
                {aiActionText}
              </div>
            ) : (
              <div style={{ color:'#4b5563', fontSize:'clamp(9px,0.95vw,12px)' }}>
                размышляет о стратегии...
              </div>
            )}
            <div className="dot-bounce">
              <span /><span /><span />
            </div>
          </div>
        </div>
      )}

      {/* Damage numbers */}
      <DamageNumbers entries={dmgNumbers} />

      {/* Sparks */}
      <SparkLayer sparks={sparks} />

      {/* Game Over */}
      {gs.gameOver && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.8)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:'var(--z-top)' as any, padding:16,
        }}>
          <div style={{
            background:'linear-gradient(160deg,#1c1208,#0a0818)',
            border:'1px solid rgba(201,168,76,0.35)',
            borderRadius:20, padding:'clamp(20px,3vw,32px)',
            textAlign:'center', maxWidth:360, width:'100%',
            boxShadow:'0 32px 80px rgba(0,0,0,0.9)',
            animation:'scaleIn 0.3s ease-out',
          }}>
            <div style={{ fontSize:'clamp(48px,8vw,72px)', marginBottom:8 }}>
              {gs.winner === 'player1' ? '🏆' : '💀'}
            </div>
            <h2 style={{ color:'#f0d68a', fontWeight:800, fontSize:'clamp(24px,4vw,38px)', margin:'0 0 8px' }}>
              {gs.winner === 'player1' ? 'Победа!' : 'Поражение!'}
            </h2>
            <p style={{ color:'#6b7280', fontStyle:'italic', fontSize:'clamp(11px,1.3vw,15px)', marginBottom:16 }}>
              {gs.winner === 'player1'
                ? '«Ты покорил Омск... но Омск покорил тебя.»'
                : '«Ты не смог покинуть Омск. Никто не может.»'}
            </p>
            <p style={{ color:'#374151', fontSize:'clamp(10px,1.1vw,13px)', marginBottom:20 }}>
              Ходов: {gs.turnNumber} | HP: {me.health} vs {enemy.health}
            </p>
            <div style={{ display:'flex', justifyContent:'center', gap:12 }}>
              <button
                onClick={restart}
                style={{
                  padding:'clamp(8px,1.2vh,14px) clamp(16px,3vw,28px)',
                  background:'linear-gradient(135deg,#92400e,#d97706)',
                  color:'#fff', fontWeight:700, border:'none', borderRadius:10,
                  cursor:'pointer', fontSize:'clamp(12px,1.3vw,16px)',
                  transition:'transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                🔄 Реванш
              </button>
              <button
                onClick={() => setGameStarted(false)}
                style={{
                  padding:'clamp(8px,1.2vh,14px) clamp(16px,3vw,28px)',
                  background:'rgba(255,255,255,0.06)',
                  color:'#d1d5db', fontWeight:700,
                  border:'1px solid rgba(255,255,255,0.1)', borderRadius:10,
                  cursor:'pointer', fontSize:'clamp(12px,1.3vw,16px)',
                  transition:'transform 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              >
                📋 Меню
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Low Health Warning */}
      {me.health <= 10 && me.health > 0 && !gs.gameOver && (
        <div className={cn('low-health-overlay', me.health <= 5 && 'critical')} />
      )}

      {/* ════════════════════════════════════════════════
          DEBUG OVERLAY
          Включается: клавиша D  или  ?debug=true в URL
          Все debug-кнопки используют существующий движок.
          pointer-events: none на info-секциях,
          pointer-events: auto на кнопках.
         ════════════════════════════════════════════════ */}
      {gameStarted && (
        <DebugOverlay
          gs={gs}
          setGs={setGs}
          selectedAttacker={selectedAttacker}
          selectedHand={selectedHand}
          phase={phase}
        />
      )}
    </div>
  );
}
