import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { GameState, CardInstance, PlayerState } from '../game/types';
import {
  createInitialGameState,
  playCard,
  attackPlayer,
  attackCreature,
  endTurn,
  getEffectiveAttack,
  getEffectiveHealth,
} from '../game/engine';
import { aiTurn } from '../game/ai';
import {
  CARD_NARRATIVES,
  STORY_EVENTS,
  DEATH_QUOTES,
  getAILoreComment,
  AI_CHARACTER,
} from '../data/lore';
import {
  getCardCoverSources,
  getCardBackSource,
  handleImageErrorWithFallback,
} from '../utils/cardImages';
import { Card as UICard, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { CardPreview } from './game/CardPreview';
import { ModalOverlay } from './ui/modal-overlay';

interface Props {
  mode: 'ai' | 'local' | 'online';
  onBack: () => void;
}

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
const COLOR_ART: Record<string, string> = {
  white: 'card-art-white',
  blue: 'card-art-blue',
  black: 'card-art-black',
  red: 'card-art-red',
  green: 'card-art-green',
  colorless: 'card-art-colorless',
};

type ElementType = 'fire' | 'ice' | 'poison' | 'explosion' | 'neutral';
function getCardElement(card: CardInstance): ElementType {
  const id = card.data.id;
  if (id.includes('vzryv') || id.includes('bomb') || id.includes('posledniy_argument'))
    return 'explosion';
  if (card.data.color === 'red') return 'fire';
  if (card.data.color === 'blue' || card.data.keywords?.includes('hexproof')) return 'ice';
  if (card.data.color === 'black' || card.data.keywords?.includes('deathtouch')) return 'poison';
  return 'neutral';
}

/* ═══════════════════════════════════════════
   UNIFIED MESSAGE SYSTEM
   ═══════════════════════════════════════════ */
type GameMessage = {
  id: number;
  type: 'ai' | 'narrative' | 'death' | 'action' | 'story' | 'system';
  text: string;
  emoji: string;
  createdAt: number;
  duration: number;
};

let msgIdCounter = 0;

function useMessageFeed() {
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const addMessage = useCallback(
    (type: GameMessage['type'], text: string, emoji: string, duration = 5000) => {
      const id = ++msgIdCounter;
      const msg: GameMessage = { id, type, text, emoji, createdAt: Date.now(), duration };
      setMessages((prev) => [...prev.slice(-5), msg]);
    },
    []
  );

  useEffect(() => {
    if (messages.length === 0) return;
    const interval = setInterval(() => {
      if (!mountedRef.current) return;
      const now = Date.now();
      setMessages((prev) => prev.filter((m) => now - m.createdAt < m.duration));
    }, 200);
    return () => clearInterval(interval);
  }, [messages.length]);

  const clear = useCallback(() => setMessages([]), []);
  const dismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { messages, addMessage, clear, dismiss };
}

function MessageFeed({
  messages,
  onDismiss,
}: {
  messages: GameMessage[];
  onDismiss?: (id: number) => void;
}) {
  const feedRef = useRef<HTMLDivElement>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (messages.length === 0) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, [messages.length]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div
      className="absolute z-layer-ui pointer-events-none left-3"
      style={{
        top: 'clamp(55px, 7vh, 80px)',
        width: 'clamp(260px, 22vw, 380px)',
        maxHeight: 'clamp(200px, 35vh, 400px)',
      }}
    >
      <div
        ref={feedRef}
        className="flex flex-col gap-2 overflow-y-auto pr-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {messages.map((msg) => {
          const age = nowMs - msg.createdAt;
          const fadeStart = msg.duration * 0.6;
          const opacity =
            age > fadeStart ? Math.max(0, 1 - (age - fadeStart) / (msg.duration * 0.4)) : 1;
          const isAI = msg.type === 'ai';

          return (
            <div
              key={msg.id}
              className={`rounded-xl shadow-2xl pointer-events-auto transition-all duration-500 ${
                isAI
                  ? 'bg-gradient-to-r from-[#1a1508]/95 via-[#12101a]/95 to-[#1a1508]/95 border border-[#c9a84c]/40'
                  : msg.type === 'death'
                    ? 'bg-gradient-to-r from-[#1a0808]/95 to-[#12101a]/95 border border-red-500/30'
                    : msg.type === 'story'
                      ? 'bg-gradient-to-r from-[#081a18]/95 to-[#12101a]/95 border border-cyan-500/20'
                      : msg.type === 'action'
                        ? 'bg-[#12101a]/90 border border-[#c9a84c]/20'
                        : 'bg-[#12101a]/90 border border-gray-700/30'
              }`}
              style={{
                opacity,
                transform: `translateX(${opacity < 0.5 ? -20 * (1 - opacity * 2) : 0}px)`,
                padding: 'clamp(8px, 1vw, 14px)',
              }}
            >
              {isAI && (
                <div className="flex items-start gap-2">
                  <div className="shrink-0 flex flex-col items-center">
                    <span style={{ fontSize: 'clamp(24px, 2.5vw, 36px)' }}>
                      {AI_CHARACTER.avatarEmoji}
                    </span>
                    <span
                      className="text-[#c9a84c] font-heading font-bold mt-0.5"
                      style={{ fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                    >
                      {AI_CHARACTER.name}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-gray-200 font-body leading-relaxed italic"
                      style={{ fontSize: 'clamp(12px, 1.15vw, 16px)' }}
                    >
                      «{msg.text}»
                    </p>
                  </div>
                </div>
              )}
              {!isAI && (
                <div className="flex items-start gap-2">
                  <span style={{ fontSize: 'clamp(16px, 1.8vw, 24px)' }}>{msg.emoji}</span>
                  <p
                    className={`font-body leading-relaxed flex-1 ${
                      msg.type === 'death'
                        ? 'text-red-300 italic'
                        : msg.type === 'story'
                          ? 'text-cyan-200 italic'
                          : msg.type === 'action'
                            ? 'text-[#f0d68a]'
                            : 'text-gray-300'
                    }`}
                    style={{ fontSize: 'clamp(11px, 1.1vw, 15px)' }}
                  >
                    {msg.text}
                  </p>
                </div>
              )}
              {onDismiss && (
                <button
                  onClick={() => onDismiss(msg.id)}
                  className="absolute top-1 right-1 text-gray-600 hover:text-white text-xs w-4 h-4 flex items-center justify-center rounded-full hover:bg-gray-700/50 transition pointer-events-auto"
                  title="Закрыть"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══ PLAYER AREA (inline) ═══ */
function PlayerArea({
  player,
  isCurrentPlayer,
  label,
  dataEnemyHero,
}: {
  player: PlayerState;
  isCurrentPlayer: boolean;
  label: string;
  dataEnemyHero?: boolean;
}) {
  const healthPercent = Math.max(0, (player.health / player.maxHealth) * 100);
  const getHealthVariant = () => {
    const hpPercent = (player.health / player.maxHealth) * 100;
    if (hpPercent > 60) return 'success';
    if (hpPercent > 30) return 'warning';
    return 'danger';
  };
  const healthVariant = getHealthVariant();

  return (
    <UICard
      data-enemy-hero={dataEnemyHero ? 'true' : undefined}
      className={cn(
        'flex flex-col gap-0.5 p-1.5 border transition-all shrink-0',
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
          {label.includes('🗿') ? '🗿' : '👤'}
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
              <Badge variant="outline" className="gap-0.5 text-[9px] h-4 px-1 min-w-0">
                <span>🤚</span>
                <span>{player.hand.length}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">Рука: {player.hand.length}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="gap-0.5 text-[9px] h-4 px-1 min-w-0">
                <span>📚</span>
                <span>{player.deck.length}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">Колода: {player.deck.length}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="gap-0.5 text-[9px] h-4 px-1 min-w-0">
                <span>💀</span>
                <span>{player.graveyard.length}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">Кладбище: {player.graveyard.length}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Row 2: HP bar + Mana */}
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
            <p>Мана: {player.mana} / {player.maxMana}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </UICard>
  );
}

/* ═══ CARD CONTAINERS ═══ */
function CardSlot({
  className,
  children,
  style,
}: {
  className?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: 'var(--field-card-w)', height: 'var(--field-card-h)', ...style }}
    >
      {children}
    </div>
  );
}

function CardContainer({
  className,
  children,
  ref,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; ref?: (el: HTMLDivElement | null) => void }) {
  return (
    <div
      {...props}
      ref={ref}
      className={cn(
        'relative w-full h-full transition-transform duration-200 ease-out transform-gpu origin-bottom',
        className
      )}
    >
      {children}
    </div>
  );
}

function CardVisual({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <UICard className={cn('relative w-full h-full overflow-hidden', className)}>{children}</UICard>
  );
}

/* ═══ FIELD CARD ═══ */
function FieldCard({
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
  const art = getCardCoverSources(card.data);

  return (
    <CardSlot>
      <CardContainer
        ref={cardRef}
        onClick={onClick}
        className={cn(
          'card-container card-field-container cursor-pointer',
          selected && 'ring-2 ring-yellow-400 shadow-yellow-400/50 shadow-lg scale-105',
          isTarget &&
            'ring-2 ring-red-500 shadow-red-500/40 shadow-lg animate-pulse cursor-crosshair',
          canAct && 'ring-2 ring-green-400/70 shadow-green-400/30 shadow-md hover:scale-105',
          frozen && 'ring-1 ring-cyan-400/50 opacity-70',
          !selected &&
            !isTarget &&
            !canAct &&
            !frozen &&
            'ring-1 ring-gray-600/40 hover:ring-gray-400/60',
          attackAnim && 'card-attack-animation',
          damageAnim && 'card-damage-animation'
        )}
        role="button"
        tabIndex={0}
        aria-label={`${card.data.name}: ${atk} атака, ${hp} здоровье${card.keywords.length > 0 ? ', ' + card.keywords.map(k => KW[k]).join(', ') : ''}`}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
        title={`${card.data.name}
${card.data.description}
⚔${atk} ❤${hp}${frozen ? '\n❄️ Заморожен' : ''}${sick ? '\n💤 Болезнь призыва' : ''}${card.keywords.length > 0 ? '\n' + card.keywords.map(k => KW[k]).join(', ') : ''}`}
      >
        <CardVisual
          className={cn(
            'card-frame card-in-field card-visual',
            card.data.rarity === 'mythic' && 'card-frame-mythic',
            card.data.rarity === 'rare' && 'card-frame-rare'
          )}
        >
          {(card.data.rarity === 'mythic' || card.data.rarity === 'rare') && (
            <div
              className={`card-foil-overlay pointer-events-none z-layer-card-effects ${card.data.rarity === 'mythic' ? 'opacity-50' : 'opacity-30'}`}
            />
          )}
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
          <CardContent className="relative z-layer-cards flex flex-col h-full p-[clamp(2px,0.4vw,6px)] text-white">
            <div className="flex justify-between items-start">
              <Tooltip>
                <TooltipTrigger>
                  <span style={{ fontSize: 'clamp(16px, 2.2vw, 32px)' }}>{card.data.emoji}</span>
                </TooltipTrigger>
                <TooltipContent side="top">{card.data.name}</TooltipContent>
              </Tooltip>
              <Badge
                variant="secondary"
                className="bg-blue-600/90 text-white font-bold font-heading shadow min-w-[24px] h-6 px-1.5 flex items-center justify-center"
              >
                {card.data.cost}
              </Badge>
            </div>
            <h3
              className="font-heading text-white font-bold truncate mt-auto"
              style={{ fontSize: 'clamp(6px, 0.85vw, 11px)' }}
            >
              {card.data.name}
            </h3>
            {card.keywords.length > 0 && (
              <div className="flex flex-wrap gap-0.5" style={{ marginTop: '2px' }}>
                {card.keywords.slice(0, 5).map((k) => (
                  <Tooltip key={k}>
                    <TooltipTrigger>
                      <Badge 
                        variant="keyword" 
                        className="shadow-sm"
                        style={{ 
                          fontSize: 'clamp(8px, 0.9vw, 13px)',
                          padding: '1px 3px',
                          minWidth: '18px'
                        }}
                      >
                        {KWS[k]}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">{KW[k]}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
            <div
              className="flex items-center gap-1"
              style={{ fontSize: 'clamp(8px, 0.9vw, 12px)' }}
            >
              {frozen && (
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-cyan-400 animate-pulse" title="Заморожен">❄️</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Заморожен</TooltipContent>
                </Tooltip>
              )}
              {sick && (
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-gray-400" title="Болезнь призыва">💤</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Болезнь призыва</TooltipContent>
                </Tooltip>
              )}
              {attacked && !sick && (
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-green-600" title="Атаковал">✅</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Атаковал</TooltipContent>
                </Tooltip>
              )}
              {/* Defender is shown in keywords, don't duplicate */}
              {canAct && (
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-green-400 animate-pulse" title="Может атаковать">
                      ⚔️
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Может атаковать</TooltipContent>
                </Tooltip>
              )}
            </div>
            {card.data.type === 'creature' && (
              <div className="absolute bottom-0 left-0 right-0 flex justify-between items-end px-0.5 pb-0.5 pointer-events-none">
                <Badge
                  variant="destructive"
                  className="bg-red-700/95 text-white rounded px-1 py-0 font-bold font-heading shadow-md leading-tight"
                  style={{ fontSize: 'clamp(10px, 1.2vw, 14px)' }}
                >
                  {atk}⚔
                </Badge>
                <Badge
                  className={cn(
                    'rounded px-1 py-0 font-bold font-heading text-white shadow-md leading-tight',
                    hp <= card.maxHealth / 2 ? 'bg-red-600/95' : 'bg-green-700/95'
                  )}
                  style={{ fontSize: 'clamp(10px, 1.2vw, 14px)' }}
                >
                  {hp}❤
                </Badge>
              </div>
            )}
          </CardContent>
          {frozen && (
            <div className="absolute inset-0 bg-cyan-300/15 pointer-events-none z-layer-card-effects" />
          )}
        </CardVisual>
      </CardContainer>
    </CardSlot>
  );
}

/* ═══ HAND CARD ═══ */
function HandCardComponent({
  card,
  selected,
  canPlay,
  isLand,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  card: CardInstance;
  selected?: boolean;
  canPlay?: boolean;
  isLand?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  const art = getCardCoverSources(card.data);

  return (
    <CardContainer
      onClick={onClick}
      draggable={canPlay}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'card-container card-hand-container cursor-pointer rounded-lg',
        selected &&
          'border-yellow-400 shadow-yellow-400/50 shadow-lg -translate-y-4 scale-110 z-layer-hover',
        canPlay &&
          isLand &&
          'border-[#c9a84c] shadow-[#c9a84c]/30 shadow-lg card-glow hover:scale-105',
        canPlay && !isLand && 'border-green-500/60 shadow-green-500/15 shadow-md hover:scale-105',
        !canPlay && !selected && 'border-gray-700/40 opacity-45',
        canPlay && 'cursor-grab active:cursor-grabbing'
      )}
      style={{ width: 'var(--hand-card-w)', height: 'var(--hand-card-h)' }}
      role="button"
      tabIndex={0}
      aria-label={`${card.data.name} (${card.data.cost} маны)`}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <CardVisual className="card-frame card-in-hand card-visual border-2">
        {(card.data.rarity === 'mythic' || card.data.rarity === 'rare') && (
          <div
            className={`card-foil-overlay pointer-events-none z-layer-card-effects ${card.data.rarity === 'mythic' ? 'opacity-50' : 'opacity-30'}`}
          />
        )}
        <div className={`absolute inset-0 ${COLOR_ART[card.data.color]}`} />
        {art.src && (
          <img
            src={art.src}
            data-fallback={art.fallback}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            loading="lazy"
            draggable={false}
            onError={(e) => handleImageErrorWithFallback(e.currentTarget)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />
        <CardContent className="relative z-layer-cards flex flex-col h-full p-[clamp(2px,0.3vw,5px)] text-white">
          <div className="flex justify-between items-start">
            <span style={{ fontSize: 'clamp(14px, 1.8vw, 28px)' }}>{card.data.emoji}</span>
            <Badge
              variant={isLand ? 'default' : canPlay ? 'default' : 'secondary'}
              className={cn(
                'rounded-full flex items-center justify-center font-bold font-heading min-w-[22px] h-[22px] px-1.5',
                isLand && 'bg-[#c9a84c] text-black',
                canPlay && !isLand && 'bg-blue-500 text-white',
                !canPlay && !isLand && 'bg-gray-700 text-gray-400'
              )}
              style={{ fontSize: 'clamp(8px, 0.9vw, 12px)' }}
            >
              {card.data.cost}
            </Badge>
          </div>
          <h3
            className="font-heading text-white font-bold leading-tight mt-auto"
            style={{ fontSize: 'clamp(5px, 0.7vw, 9px)' }}
          >
            {card.data.name}
          </h3>
          {card.data.type === 'creature' && (
            <div className="flex justify-between items-end mt-0.5">
              <Badge
                variant="destructive"
                className="bg-red-700/90 text-red-300 font-bold font-heading rounded px-1 py-0 leading-tight"
                style={{ fontSize: 'clamp(9px, 1vw, 12px)' }}
              >
                {card.data.attack}⚔
              </Badge>
              <Badge
                className="bg-green-700/90 text-green-300 font-bold font-heading rounded px-1 py-0 leading-tight"
                style={{ fontSize: 'clamp(9px, 1vw, 12px)' }}
              >
                {card.data.health}❤
              </Badge>
            </div>
          )}
          {card.data.type === 'land' && (
            <div
              className="text-[#c9a84c] font-bold text-center"
              style={{ fontSize: 'clamp(8px, 1vw, 12px)' }}
            >
              🏔️
            </div>
          )}
          {card.data.type === 'spell' && (
            <div
              className="text-blue-300 text-center"
              style={{ fontSize: 'clamp(8px, 1vw, 12px)' }}
            >
              ✨
            </div>
          )}
          {card.data.type === 'enchantment' && (
            <div
              className="text-purple-300 text-center"
              style={{ fontSize: 'clamp(8px, 1vw, 12px)' }}
            >
              🔮
            </div>
          )}
        </CardContent>
        {canPlay && !selected && (
          <div
            className={`absolute top-1 right-1 rounded-full animate-pulse z-layer-card-effects ${isLand ? 'bg-[#c9a84c]' : 'bg-green-400'}`}
            style={{ width: 'clamp(4px, 0.5vw, 8px)', height: 'clamp(4px, 0.5vw, 8px)' }}
          />
        )}
      </CardVisual>
    </CardContainer>
  );
}

/* ═══ DECK STACK ═══ */
function DeckStack({
  count,
  type,
  cardBackSrc,
  label,
}: {
  count: number;
  type: 'deck' | 'graveyard';
  cardBackSrc?: string;
  label: string;
}) {
  const isDeck = type === 'deck';
  return (
    <Tooltip>
      <TooltipTrigger>
        <div className={isDeck ? 'deck-zone' : 'graveyard-zone'}>
          {isDeck && cardBackSrc ? (
            <img
              src={cardBackSrc}
              alt="Колода"
              className="w-full h-full object-cover rounded-[5px] opacity-80"
              draggable={false}
            />
          ) : (
            <span style={{ fontSize: 'clamp(14px, 1.8vw, 22px)' }}>
              {isDeck ? '🂠' : '💀'}
            </span>
          )}
          <span className={isDeck ? 'deck-count' : 'graveyard-count'}>{count}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        {label}: {count}
      </TooltipContent>
    </Tooltip>
  );
}

/* ═══ MAIN GAME BOARD ═══ */
export function GameBoard({ mode, onBack }: Props) {
  const [gs, setGs] = useState<GameState>(createInitialGameState);
  const [selectedHand, setSelectedHand] = useState<string | null>(null);
  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null);
  const selectedAttackerSlotState = useState<number | null>(null);
  const setSelectedAttackerSlot = selectedAttackerSlotState[1];
  const [inspected, setInspected] = useState<{
    card: CardInstance;
    owner: 'player1' | 'player2';
  } | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const aiActionStatusState = useState<string | null>(null);
  const setAiActionStatus = aiActionStatusState[1];
  const [showTurnTransition, setShowTurnTransition] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const seenStoryEventsRef = useRef<Set<number>>(new Set());
  const [dragCardUid, setDragCardUid] = useState<string | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState(false);
  const [attackAnimUid, setAttackAnimUid] = useState<string | null>(null);
  const [damageAnimUid, setDamageAnimUid] = useState<string | null>(null);
  const playAnimState = useState<{ name: string; emoji: string; color: string } | null>(null);
  const setPlayAnim = playAnimState[1];
  const [deathAnim, setDeathAnim] = useState<{ name: string; emoji: string; color: string } | null>(null);
  const [damageNumbers, setDamageNumbers] = useState<
    Array<{ id: number; value: number; x: number; y: number; type: 'damage' | 'heal' | 'buff' }>
  >([]);
  const [screenShake, setScreenShake] = useState(false);
  const [explosionFlash, setExplosionFlash] = useState(false);
  const [dyingCards, setDyingCards] = useState<Set<string>>(new Set());
  const [cardDeathEffects, setCardDeathEffects] = useState<Map<string, 'fire' | 'poison' | 'ice'>>(new Map());
  const targetingLineState = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const setTargetingLine = targetingLineState[1];
  const attackAnimTimerRef = useRef<number | null>(null);
  const damageAnimTimerRef = useRef<number | null>(null);
  const aiAnimTimerRef = useRef<number | null>(null);
  const aiTurnTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const prevFieldRef = useRef<{ p1: string[]; p2: string[] }>({ p1: [], p2: [] });
  const prevHandRef = useRef<string[]>([]);
  const [newlyDrawnUids, setNewlyDrawnUids] = useState<Set<string>>(new Set());
  const [newlyPlayedUids, setNewlyPlayedUids] = useState<Set<string>>(new Set());
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  const { messages, addMessage, clear: clearMessages, dismiss: dismissMessage } = useMessageFeed();

  const isP1Turn = gs.currentTurn === 'player1';
  const myTurn = mode === 'ai' ? isP1Turn : true;
  const me = gs.player1;
  const enemy = gs.player2;
  const cardBackSrc = getCardBackSource();

  useEffect(() => {
    const currentP1 = me.field.map((c) => c.uid);
    const currentP2 = enemy.field.map((c) => c.uid);
    const prev = prevFieldRef.current;
    if (prev.p1.length > 0 || prev.p2.length > 0) {
      const diedP1 = prev.p1.filter((uid) => !currentP1.includes(uid));
      const diedP2 = prev.p2.filter((uid) => !currentP2.includes(uid));
      const allDied = [...diedP1, ...diedP2];
      if (allDied.length > 0) {
        const allGraveCards = [...me.graveyard, ...enemy.graveyard];
        const deadCard = allGraveCards.find((c) => allDied.includes(c.uid));
        if (deadCard && !deathAnim) {
          setDeathAnim({
            name: deadCard.data.name,
            emoji: deadCard.data.emoji,
            color: deadCard.data.color,
          });
        }
        const recent = gs.log.slice(-5).join(' ');
        for (const [cardId, quote] of Object.entries(DEATH_QUOTES)) {
          if (recent.includes(cardId) || recent.toLowerCase().includes(cardId.replace(/_/g, ' '))) {
            addMessage('death', quote, '💀', 5000);
            break;
          }
        }
      }
    }
    prevFieldRef.current = { p1: currentP1, p2: currentP2 };
  }, [me.field, enemy.field]);

  // Clear death effects after animation completes
  useEffect(() => {
    if (dyingCards.size > 0) {
      const timer = setTimeout(() => {
        setDyingCards(new Set());
        setCardDeathEffects(new Map());
      }, 700); // Match fire/poison animation duration
      return () => clearTimeout(timer);
    }
  }, [dyingCards]);

  /* ── Draw animation: detect new cards in hand ── */
  useEffect(() => {
    const currentUids = me.hand.map((c) => c.uid);
    const prevUids = prevHandRef.current;
    if (prevUids.length > 0) {
      const drawn = currentUids.filter((uid) => !prevUids.includes(uid));
      if (drawn.length > 0) {
        setNewlyDrawnUids(new Set(drawn));
        const t = setTimeout(() => setNewlyDrawnUids(new Set()), 400);
        return () => clearTimeout(t);
      }
    }
    prevHandRef.current = currentUids;
  }, [me.hand]);

  /* ── Play animation: detect new cards on field ── */
  useEffect(() => {
    const currentP1 = me.field.map((c) => c.uid);
    const prev = prevFieldRef.current.p1;
    if (prev.length > 0) {
      const played = currentP1.filter((uid) => !prev.includes(uid));
      if (played.length > 0) {
        setNewlyPlayedUids(new Set(played));
        const t = setTimeout(() => setNewlyPlayedUids(new Set()), 450);
        return () => clearTimeout(t);
      }
    }
  }, [me.field]);

  useEffect(() => {
    const ev = STORY_EVENTS.find(
      (e) => e.turnTrigger === gs.turnNumber && !seenStoryEventsRef.current.has(e.turnTrigger)
    );
    if (ev) {
      addMessage('story', ev.text, ev.emoji);
      seenStoryEventsRef.current.add(ev.turnTrigger);
    }
  }, [gs.turnNumber, addMessage]);

  const hasPlayableLand =
    me.hand.some((c) => c.data.type === 'land') && me.landsPlayed < me.maxLandsPerTurn;
  const hasPlayableCard = me.hand.some((c) => c.data.type !== 'land' && c.data.cost <= me.mana);
  const hasAttackers = me.field.some(
    (c) =>
      !c.summoningSickness && !c.hasAttacked && c.frozen <= 0 && !c.keywords.includes('defender')
  );
  const landPlayed = me.landsPlayed > 0;

  const phase = (() => {
    if (!myTurn || gs.gameOver) return 'done' as const;
    if (hasPlayableLand && !landPlayed) return 'land' as const;
    if (hasPlayableCard || hasPlayableLand) return 'play' as const;
    if (hasAttackers) return 'attack' as const;
    return 'done' as const;
  })();

  const showCardNarrative = useCallback(
    (cardId: string) => {
      const n = CARD_NARRATIVES[cardId];
      if (n) addMessage('narrative', n, '📖', 5000);
    },
    [addMessage]
  );

  const getHint = (): string => {
    if (gs.gameOver) return '🏁 Игра окончена!';
    if (!myTurn) return `⏳ ${AI_CHARACTER.name} размышляет...`;
    if (selectedAttacker) return '🎯 Выберите ЦЕЛЬ: вражеское существо или «В героя»';
    if (dragCardUid) return '🖱️ Перетащите карту на ПОЛЕ чтобы разыграть';
    if (gs.turnNumber <= 2 && !landPlayed && hasPlayableLand)
      return '🏔️ ШАГ 1: Перетащите ЗЕМЛЮ на поле (или двойной клик)';
    if (gs.turnNumber <= 2 && landPlayed && hasPlayableCard)
      return '🃏 ШАГ 2: Перетащите существо на поле';
    if (gs.turnNumber <= 2 && !hasPlayableCard && hasAttackers)
      return '⚔️ ШАГ 3: Кликните существо с зелёной рамкой → атакуйте';
    if (gs.turnNumber <= 2 && !hasPlayableCard && !hasAttackers) return '⏭️ Нажмите «Конец хода»';
    if (hasPlayableLand && !landPlayed)
      return '🏔️ Разыграйте ЗЕМЛЮ (перетащите на поле или двойной клик)';
    if (hasPlayableCard && hasAttackers) return '🃏 Играйте карту или ⚔️ атакуйте';
    if (hasPlayableCard) return '🃏 Перетащите карту на поле или двойной клик';
    if (hasAttackers) return '⚔️ Выберите существо для атаки (зелёная рамка)';
    return '⏭️ Нажмите «Конец хода»';
  };

  const triggerCombatAnims = useCallback((attackerUid?: string, defenderUid?: string) => {
    if (attackAnimTimerRef.current) {
      window.clearTimeout(attackAnimTimerRef.current);
      attackAnimTimerRef.current = null;
    }
    if (damageAnimTimerRef.current) {
      window.clearTimeout(damageAnimTimerRef.current);
      damageAnimTimerRef.current = null;
    }
    if (attackerUid) setAttackAnimUid(attackerUid);
    if (defenderUid) setDamageAnimUid(defenderUid);
    if (attackerUid) {
      attackAnimTimerRef.current = window.setTimeout(() => setAttackAnimUid(null), 650);
    }
    if (defenderUid) {
      damageAnimTimerRef.current = window.setTimeout(() => setDamageAnimUid(null), 250);
    }
  }, []);

  const showDamageNumber = useCallback(
    (value: number, x: number, y: number, type: 'damage' | 'heal' | 'buff' = 'damage') => {
      const id = Date.now() + Math.random();
      setDamageNumbers((prev) => [...prev, { id, value, x, y, type }]);
      setTimeout(() => setDamageNumbers((prev) => prev.filter((dn) => dn.id !== id)), 800);
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (attackAnimTimerRef.current) window.clearTimeout(attackAnimTimerRef.current);
      if (damageAnimTimerRef.current) window.clearTimeout(damageAnimTimerRef.current);
      if (aiAnimTimerRef.current) window.clearTimeout(aiAnimTimerRef.current);
      if (aiTurnTimerRef.current) window.clearTimeout(aiTurnTimerRef.current);
    };
  }, []);

  const runAIAnimations = useCallback(
    (
      actions: {
        type: 'attack-hero' | 'attack-creature';
        attackerUid: string;
        defenderUid?: string;
      }[]
    ) => {
      if (!actions || actions.length === 0) return;
      if (aiAnimTimerRef.current) {
        window.clearTimeout(aiAnimTimerRef.current);
        aiAnimTimerRef.current = null;
      }
      let idx = 0;
      const step = () => {
        const act = actions[idx];
        if (!act) return;
        triggerCombatAnims(
          act.attackerUid,
          act.type === 'attack-creature' ? act.defenderUid : undefined
        );
        idx += 1;
        if (idx < actions.length) {
          aiAnimTimerRef.current = window.setTimeout(step, 750);
        }
      };
      step();
    },
    [triggerCombatAnims]
  );

  const runAI = useCallback(() => {
    if (mode !== 'ai' || gs.currentTurn !== 'player2' || gs.gameOver) return;
    if (aiTurnTimerRef.current) {
      window.clearTimeout(aiTurnTimerRef.current);
      aiTurnTimerRef.current = null;
    }
    setAiThinking(true);
    setAiActionStatus(null);
    aiTurnTimerRef.current = window.setTimeout(() => {
      aiTurnTimerRef.current = null;
      if (!mountedRef.current) return;
      const result = aiTurn(gs);
      setGs(result.state);
      if (result.actions && result.actions.length > 0) {
        const atkInfo = result.actions.find(
          (a) => a.type === 'attack-hero' || a.type === 'attack-creature'
        );
        if (atkInfo) {
          const attacker = result.state.player2.field.find((c) => c.uid === atkInfo.attackerUid);
          if (attacker)
            setAiActionStatus(
              atkInfo.type === 'attack-hero'
                ? `⚔️ ${attacker.data.emoji} ${attacker.data.name} атакует героя!`
                : `⚔️ ${attacker.data.emoji} ${attacker.data.name} атакует!`
            );
        }
        runAIAnimations(result.actions);
      }
      const lastCard = result.state.player2.field[result.state.player2.field.length - 1];
      if (lastCard && (!result.actions || result.actions.length === 0)) {
        setAiActionStatus(`✨ Сыграно: ${lastCard.data.emoji} ${lastCard.data.name}`);
      }
      if (lastCard) showCardNarrative(lastCard.data.id);
      const lore = getAILoreComment(lastCard?.data.id || '');
      addMessage('ai', lore, AI_CHARACTER.avatarEmoji);
      setAiThinking(false);
      setTimeout(() => {
        if (mountedRef.current) setAiActionStatus(null);
      }, 2500);
    }, 1200);
  }, [mode, gs, showCardNarrative, addMessage, runAIAnimations, setAiActionStatus]);

  useEffect(() => {
    if (mode === 'ai' && gs.currentTurn === 'player2' && !gs.gameOver) {
      const t = setTimeout(runAI, 500);
      return () => clearTimeout(t);
    }
  }, [gs.currentTurn, mode, gs.gameOver, runAI]);

  const doPlayCard = useCallback(
    (uid: string) => {
      const card = me.hand.find((c) => c.uid === uid);
      if (!card || !myTurn || gs.gameOver) return false;
      const next = playCard(gs, 'player1', uid);
      if (next !== gs) {
        setPlayAnim({ name: card.data.name, emoji: card.data.emoji, color: card.data.color });
        setGs(next);
        setSelectedHand(null);
        setInspected(null);
        addMessage('action', `Разыграно: ${card.data.emoji} ${card.data.name}`, '🃏', 5000);
        showCardNarrative(card.data.id);
        return true;
      }
      return false;
    },
    [gs, me.hand, myTurn, showCardNarrative, addMessage, setPlayAnim]
  );

  const handleDragStart = (e: React.DragEvent, uid: string) => {
    setDragCardUid(uid);
    setSelectedHand(null);
    setInspected(null);
    e.dataTransfer.effectAllowed = 'move';
    const el = e.currentTarget as HTMLDivElement;
    e.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2);
  };
  const handleDragEnd = () => {
    setDragCardUid(null);
    setDropZoneActive(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    if (!dragCardUid) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropZoneActive(true);
  };
  const handleDragLeave = () => {
    setDropZoneActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDropZoneActive(false);
    if (dragCardUid) {
      doPlayCard(dragCardUid);
      setDragCardUid(null);
    }
  };

  const clickHand = (uid: string) => {
    const card = me.hand.find((c) => c.uid === uid);
    if (!card) return;
    setSelectedAttacker(null);
    if (!myTurn || gs.gameOver) {
      setInspected({ card, owner: 'player1' });
      return;
    }
    if (selectedHand === uid) {
      doPlayCard(uid);
      return;
    }
    setSelectedHand(uid);
    setInspected({ card, owner: 'player1' });
  };

  const clickMyCreature = (uid: string) => {
    const card = me.field.find((c) => c.uid === uid);
    if (!card) return;
    const slotIndex = me.field.indexOf(card);
    if (!myTurn || gs.gameOver) {
      setInspected({ card, owner: 'player1' });
      return;
    }
    const canAct =
      !card.summoningSickness &&
      !card.hasAttacked &&
      card.frozen <= 0 &&
      !card.keywords.includes('defender');
    if (canAct) {
      if (selectedAttacker === uid) {
        setSelectedAttacker(null);
        setSelectedAttackerSlot(null);
        setInspected(null);
        setTargetingLine(null);
      } else {
        setSelectedAttacker(uid);
        setSelectedAttackerSlot(slotIndex);
        setSelectedHand(null);
        setInspected(null);
        const attackerRef = cardRefsMap.current.get(uid);
        if (attackerRef) {
          const rect = attackerRef.getBoundingClientRect();
          setTargetingLine({
            startX: rect.left + rect.width / 2,
            startY: rect.top + rect.height / 2,
            endX: rect.left + rect.width / 2,
            endY: rect.top + rect.height / 2,
          });
        }
      }
    } else {
      setInspected({ card, owner: 'player1' });
      setSelectedAttacker(null);
      setSelectedAttackerSlot(null);
      setTargetingLine(null);
    }
  };

  const clickEnemyCreature = (uid: string) => {
    const card = enemy.field.find((c) => c.uid === uid);
    if (!card) return;
    if (selectedAttacker && myTurn && !gs.gameOver) {
      const attackerCard = me.field.find((c) => c.uid === selectedAttacker);
      if (!attackerCard) return;
      const next = attackCreature(gs, 'player1', selectedAttacker, uid);
      if (next !== gs) {
        const atk = getEffectiveAttack(attackerCard, me, enemy);
        const defenderRef = cardRefsMap.current.get(uid);
        if (defenderRef) {
          const rect = defenderRef.getBoundingClientRect();
          showDamageNumber(atk, rect.left + rect.width / 2, rect.top + rect.height / 2, 'damage');
        }
        // Trigger elemental effects
        const attackerElement = getCardElement(attackerCard);
        if (attackerElement === 'explosion') {
          setScreenShake(true);
          setExplosionFlash(true);
          setTimeout(() => {
            setScreenShake(false);
            setExplosionFlash(false);
          }, 400);
        }
        // Check if defender will die and set death effect
        const defenderHealth = card.health;
        const attackerAttack = getEffectiveAttack(attackerCard, me, enemy);
        if (attackerAttack >= defenderHealth) {
          setDyingCards((prev) => new Set(prev).add(card.uid));
          if (attackerElement === 'fire' || attackerElement === 'explosion') {
            setCardDeathEffects((prev) => new Map(prev).set(card.uid, 'fire'));
          } else if (attackerElement === 'poison') {
            setCardDeathEffects((prev) => new Map(prev).set(card.uid, 'poison'));
          } else if (attackerElement === 'ice') {
            setCardDeathEffects((prev) => new Map(prev).set(card.uid, 'ice'));
          }
        }
        setGs(next);
        addMessage(
          'action',
          `${attackerCard?.data.emoji || '⚔️'} ${attackerCard?.data.name || '?'} → ${card.data.emoji} ${card.data.name}`,
          '⚔️',
          5000
        );
        triggerCombatAnims(selectedAttacker, uid);
        setSelectedAttacker(null);
        setSelectedAttackerSlot(null);
        setInspected(null);
        setTargetingLine(null);
      }
      return;
    }
    setInspected({ card, owner: 'player2' });
    setSelectedHand(null);
  };

  const clickAttackHero = () => {
    if (!myTurn || !selectedAttacker || gs.gameOver) return;
    const attackerCard = me.field.find((c) => c.uid === selectedAttacker);
    if (!attackerCard) return;
    const next = attackPlayer(gs, 'player1', selectedAttacker);
    if (next !== gs) {
      const atk = getEffectiveAttack(attackerCard, me, enemy);
      const enemyHeroElement = document.querySelector('[data-enemy-hero]');
      if (enemyHeroElement) {
        const rect = enemyHeroElement.getBoundingClientRect();
        showDamageNumber(atk, rect.left + rect.width / 2, rect.top + rect.height / 2, 'damage');
      }
      // Trigger elemental effects
      const attackerElement = getCardElement(attackerCard);
      if (attackerElement === 'explosion') {
        setScreenShake(true);
        setExplosionFlash(true);
        setTimeout(() => {
          setScreenShake(false);
          setExplosionFlash(false);
        }, 400);
      }
      setGs(next);
      addMessage(
        'action',
        `${attackerCard?.data.emoji || '⚔️'} ${attackerCard?.data.name || '?'} наносит удар Хранителю!`,
        '💥',
        5000
      );
      triggerCombatAnims(selectedAttacker, undefined);
      setSelectedAttacker(null);
      setSelectedAttackerSlot(null);
      setInspected(null);
      setTargetingLine(null);
    }
  };

  const clickEndTurn = () => {
    if (!myTurn || gs.gameOver) return;
    setGs((prev) => {
      const nextGs = endTurn(prev);
      if (mode === 'ai' && nextGs.currentTurn === 'player2') {
        setShowTurnTransition(true);
        setTimeout(() => {
          if (mountedRef.current) setShowTurnTransition(false);
        }, 1200);
      }
      return nextGs;
    });
    setSelectedHand(null);
    setSelectedAttacker(null);
    setInspected(null);
  };

  const restart = () => {
    setGs(createInitialGameState());
    setSelectedHand(null);
    setSelectedAttacker(null);
    setInspected(null);
    setPlayAnim(null);
    setDeathAnim(null);
    setDyingCards(new Set());
    setCardDeathEffects(new Map());
    seenStoryEventsRef.current = new Set();
    prevFieldRef.current = { p1: [], p2: [] };
    cardRefsMap.current.clear();
    clearMessages();
  };

  const clickBF = () => {
    if (inspected && !selectedAttacker) {
      setInspected(null);
      setSelectedHand(null);
    }
  };

  const phases = [
    { id: 'land', icon: '🏔️', label: 'Земля', active: phase === 'land', done: landPlayed },
    {
      id: 'play',
      icon: '🃏',
      label: 'Карты',
      active: phase === 'play',
      done: !hasPlayableCard && landPlayed,
    },
    { id: 'attack', icon: '⚔️', label: 'Атака', active: phase === 'attack', done: !hasAttackers },
    { id: 'done', icon: '⏭️', label: 'Конец', active: phase === 'done', done: false },
  ];

  return (
    <div className={`game-grid ${screenShake ? 'effect-screen-shake' : ''}`} onClick={clickBF}>
      {explosionFlash && <div className="explosion-flash" />}
      {/* TOP BAR */}
      <div className="zone-topbar">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition text-sm px-2 py-1"
          >
            ← Назад
          </button>
          <span
            className="text-[#c9a84c] font-heading font-bold"
            style={{ fontSize: 'clamp(14px, 1.5vw, 18px)' }}
          >
            OMSK: The Gathering
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400" style={{ fontSize: 'clamp(10px, 1vw, 13px)' }}>
            Ход {gs.turnNumber}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowLog(true);
            }}
            className="text-gray-400 hover:text-[#f0d68a] transition text-sm px-2 py-1"
            title="Журнал действий"
            style={{ pointerEvents: 'auto', zIndex: 999 }}
          >
            📜 Лог
          </button>
          {aiThinking && (
            <span
              className="text-cyan-400 animate-pulse"
              style={{ fontSize: 'clamp(10px, 1vw, 13px)' }}
            >
              🤖 Думает...
            </span>
          )}
        </div>
      </div>

      {/* ENEMY HERO ZONE */}
      <div className="zone-enemy-hero hero-zone-row" data-enemy-hero="true">
        <DeckStack count={enemy.deck.length} type="deck" cardBackSrc={cardBackSrc} label={mode === 'ai' ? 'Колода Хранителя' : 'Колода Игрока 2'} />
        <PlayerArea
          player={enemy}
          isCurrentPlayer={!isP1Turn}
          label={mode === 'ai' ? '🗿 Хранитель Омска' : '👤 Игрок 2'}
          dataEnemyHero={true}
        />
        <DeckStack count={enemy.graveyard.length} type="graveyard" label={mode === 'ai' ? 'Сброс Хранителя' : 'Сброс Игрока 2'} />
      </div>

      {/* ENEMY BOARD ZONE */}
      <div className="zone-enemy-board">
        <div className="board-zone enemy">
          {Array.from({ length: 7 }, (_, i) => {
            const card = enemy.field[i];
            return (
              <div
                key={i}
                className={`creature-slot ${card ? 'occupied' : ''} ${selectedAttacker && !gs.gameOver ? 'attack-lane' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {card && (
                  <FieldCard
                    card={card}
                    player={enemy}
                    opponent={me}
                    isTarget={selectedAttacker !== null}
                    canAct={false}
                    attackAnim={attackAnimUid === card.uid}
                    damageAnim={damageAnimUid === card.uid}
                    deathEffect={cardDeathEffects.get(card.uid)}
                    onClick={() => clickEnemyCreature(card.uid)}
                    cardRef={(el) => {
                      if (el) cardRefsMap.current.set(card.uid, el);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CENTER DIVIDER */}
      <div className="zone-divider">
        <div className="center-divider">
          <div className="divider-buttons">
            {selectedAttacker && !gs.gameOver && myTurn && (
              <>
                <button onClick={clickAttackHero} className="attack-hero-btn">
                  💥 В героя
                </button>
                <button
                  onClick={() => {
                    setSelectedAttacker(null);
                    setSelectedAttackerSlot(null);
                  }}
                  className="cancel-btn"
                >
                  Отмена
                </button>
              </>
            )}
            {!gs.gameOver && myTurn && (
              <button onClick={clickEndTurn} className="end-turn-btn ready">
                Конец хода ⏭️
              </button>
            )}
          </div>
          <div className="divider-hint">{getHint()}</div>
        </div>
      </div>

      {/* PLAYER BOARD ZONE */}
      <div className="zone-player-board">
        <div className={`board-zone player ${dropZoneActive ? 'drop-target' : ''}`}>
          {Array.from({ length: 7 }, (_, i) => {
            const card = me.field[i];
            const canAct =
              card &&
              !card.summoningSickness &&
              !card.hasAttacked &&
              card.frozen <= 0 &&
              !card.keywords.includes('defender');
            return (
              <div
                key={i}
                className={`creature-slot ${card ? 'occupied' : ''} ${dropZoneActive ? 'drop-target' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {card && (
                  <div className={newlyPlayedUids.has(card.uid) ? 'card-play-animation' : ''}>
                    <FieldCard
                      card={card}
                      player={me}
                      opponent={enemy}
                      selected={selectedAttacker === card.uid}
                      isTarget={false}
                      canAct={canAct && myTurn}
                      attackAnim={attackAnimUid === card.uid}
                      damageAnim={damageAnimUid === card.uid}
                      deathEffect={cardDeathEffects.get(card.uid)}
                      onClick={() => clickMyCreature(card.uid)}
                      cardRef={(el) => {
                        if (el) cardRefsMap.current.set(card.uid, el);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PLAYER HERO ZONE */}
      <div className="zone-player-hero hero-zone-row">
        <DeckStack count={me.deck.length} type="deck" cardBackSrc={cardBackSrc} label="Твоя колода" />
        <PlayerArea player={me} isCurrentPlayer={isP1Turn} label={mode === 'ai' ? '👤 Игрок' : '👤 Игрок 1'} />
        <DeckStack count={me.graveyard.length} type="graveyard" label="Твой сброс" />
      </div>

      {/* ACTION BAR */}
      <div className="zone-actionbar">
        <div className="action-bar">
          {phases.map((p) => (
            <span
              key={p.id}
              className={`phase-pill ${p.active ? 'active' : p.done ? 'done' : 'idle'}`}
            >
              {p.icon} {p.label}
            </span>
          ))}
        </div>
      </div>

      {/* HAND ZONE */}
      <div
        className="zone-hand"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="hand-zone">
          {me.hand.map((card, idx) => {
            const canPlay =
              myTurn &&
              !gs.gameOver &&
              (card.data.type === 'land'
                ? me.landsPlayed < me.maxLandsPerTurn
                : card.data.cost <= me.mana);
            return (
              <div
                key={card.uid}
                className={`hand-card-wrapper ${newlyDrawnUids.has(card.uid) ? 'card-draw-animation' : ''}`}
                style={
                  {
                    '--card-angle': `${(idx - (me.hand.length - 1) / 2) * 3}deg`,
                    '--card-offset': `${Math.abs(idx - (me.hand.length - 1) / 2) * 2}px`,
                    '--card-index': idx,
                  } as React.CSSProperties
                }
              >
                <HandCardComponent
                  card={card}
                  selected={selectedHand === card.uid}
                  canPlay={canPlay}
                  isLand={card.data.type === 'land'}
                  onClick={() => clickHand(card.uid)}
                  onDragStart={(e) => handleDragStart(e, card.uid)}
                  onDragEnd={handleDragEnd}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* CARD PREVIEW */}
      {inspected && !selectedAttacker && (
        <CardPreview
          card={inspected.card}
          owner={inspected.owner}
          gs={gs}
          onClose={() => {
            setInspected(null);
            setSelectedHand(null);
          }}
        />
      )}

      {/* MESSAGE FEED */}
      <MessageFeed messages={messages} onDismiss={dismissMessage} />

      {/* DAMAGE NUMBERS */}
      {damageNumbers.map((dn) => (
        <div key={dn.id} className={`damage-number ${dn.type}`} style={{ left: dn.x, top: dn.y }}>
          {dn.value}
        </div>
      ))}

      {/* TURN TRANSITION */}
      {showTurnTransition && (
        <div className="turn-banner">
          <span className="turn-banner-text">ХОД ХРАНИТЕЛЯ</span>
          <span className="turn-banner-sub">Подготовьтесь к бою</span>
        </div>
      )}

      {/* ACTION LOG */}
      <ModalOverlay
        open={showLog}
        onClose={() => {
          setShowLog(false);
        }}
        title="📜 Журнал действий"
        closeOnBackdrop={true}
      >
        <div
          className="flex flex-col gap-1 overflow-y-auto"
          style={{ maxHeight: 'clamp(200px, 50vh, 400px)', position: 'relative', zIndex: 100 }}
        >
          {gs.log.length === 0 && (
            <p className="text-gray-500 italic text-center py-4">Журнал пуст</p>
          )}
          {gs.log.map((entry, i) => (
            <div
              key={i}
              className="text-gray-300 font-body border-b border-gray-800/30 py-1.5 px-1"
              style={{ fontSize: 'clamp(11px, 1.1vw, 14px)' }}
            >
              <span className="text-gray-500 mr-2" style={{ fontSize: 'clamp(9px, 0.9vw, 11px)' }}>
                {i + 1}.
              </span>
              {entry}
            </div>
          ))}
        </div>
      </ModalOverlay>

      {/* GAME OVER */}
      {gs.gameOver && (
        <div className="modal-overlay">
          <div className="modal-overlay-content text-center">
            <h2 className="font-title text-2xl text-[#c9a84c] mb-4">
              {me.health <= 0 ? '💀 Поражение' : '🏆 Победа!'}
            </h2>
            <p className="text-gray-300 mb-6">{me.health <= 0 ? 'Омск пал...' : 'Омск спасен!'}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={restart}
                className="px-6 py-2 rounded-lg bg-[#c9a84c] text-black font-bold"
              >
                Играть снова
              </button>
              <button onClick={onBack} className="px-6 py-2 rounded-lg border border-gray-600">
                В меню
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
