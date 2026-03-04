import { useState, useCallback, useEffect, useRef, type HTMLAttributes, type ReactNode } from 'react';
import { GameState, CardInstance } from '../game/types';
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
import { PlayerArea } from './PlayerArea';
import {
  CARD_NARRATIVES,
  STORY_EVENTS,
  DEATH_QUOTES,
  getAILoreComment,
  AI_CHARACTER,
} from '../data/lore';
import { CardPlayAnimation, CardDeathAnimation } from './effects/CardDust';
import {
  getCardBackSource,
  getCardCoverSources,
  handleImageErrorWithFallback,
} from '../utils/cardImages';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';

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
  compact = false,
}: {
  messages: GameMessage[];
  onDismiss?: (id: number) => void;
  compact?: boolean;
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
      className={`absolute z-40 pointer-events-none ${compact ? 'left-2 right-2' : 'left-3'}`}
      style={{
        top: compact ? 'clamp(52px, 6.8vh, 76px)' : 'clamp(55px, 7vh, 80px)',
        width: compact ? 'auto' : 'clamp(260px, 22vw, 380px)',
        maxHeight: compact ? 'clamp(136px, 24vh, 200px)' : 'clamp(200px, 35vh, 400px)',
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

/* ═══ FIELD CARD — Refactored with shadcn/ui Card ═══ */
function CardSlot({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'relative shrink-0 w-[var(--field-card-w)] h-[var(--field-card-h)] pointer-events-auto',
        className
      )}
      style={{ width: 'var(--field-card-w)', height: 'var(--field-card-h)' }}
    >
      {children}
    </div>
  );
}

function CardContainer({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      {...props}
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
    <Card className={cn('relative w-full h-full overflow-hidden', className)}>
      {children}
    </Card>
  );
}

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
  const isDef = card.keywords.includes('defender');
  const art = getCardCoverSources(card.data);

  return (
    <CardSlot>
      <CardContainer
      ref={cardRef}
      onClick={onClick}
      className={cn(
        'card-container card-field-container cursor-pointer',
        selected && "ring-2 ring-yellow-400 shadow-yellow-400/50 shadow-lg scale-105",
        isTarget && "ring-2 ring-red-500 shadow-red-500/40 shadow-lg animate-pulse cursor-crosshair",
        canAct && "ring-2 ring-green-400/70 shadow-green-400/30 shadow-md hover:scale-105",
        frozen && "ring-1 ring-cyan-400/50 opacity-70",
        !selected && !isTarget && !canAct && !frozen && "ring-1 ring-gray-600/40 hover:ring-gray-400/60",
        attackAnim && "card-attack-animation",
        damageAnim && "card-damage-animation"
      )}
      role="button"
      tabIndex={0}
      aria-label={`${card.data.name}: ${atk} атака, ${hp} здоровье`}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      title={`${card.data.name}\n${card.data.description}\n⚔${atk} ❤${hp}`}
    >
      <CardVisual
        className={cn(
          'card-frame card-in-field card-visual',
          card.data.rarity === 'mythic' && 'card-frame-mythic',
          card.data.rarity === 'rare' && 'card-frame-rare'
        )}
      >
      {/* Foil overlay */}
      {(card.data.rarity === 'mythic' || card.data.rarity === 'rare') && (
        <div className={`card-foil-overlay pointer-events-none z-50 ${card.data.rarity === 'mythic' ? 'opacity-50' : 'opacity-30'}`} />
      )}

      {/* Art background */}
      <div className={`absolute inset-0 ${COLOR_ART[card.data.color]}`} aria-hidden="true" />
      
      {art.src && (
        <img
          src={art.src}
          data-fallback={art.fallback}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          loading="lazy"
          onError={(e) => handleImageErrorWithFallback(e.currentTarget)}
          aria-hidden="true"
        />
      )}
      
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" aria-hidden="true" />

      <CardContent className="relative z-10 flex flex-col h-full p-[clamp(2px,0.4vw,6px)] text-white">
        {/* Top row: Emoji + Cost */}
        <div className="flex justify-between items-start">
          <Tooltip>
            <TooltipTrigger>
              <span style={{ fontSize: 'clamp(16px, 2.2vw, 32px)' }} aria-hidden="true">
                {card.data.emoji}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">{card.data.name}</TooltipContent>
          </Tooltip>
          
          <Badge 
            variant="secondary" 
            className="bg-blue-600/90 text-white font-bold font-heading shadow min-w-[24px] h-6 px-1.5 flex items-center justify-center"
            aria-label={`Цена: ${card.data.cost} маны`}
          >
            {card.data.cost}
          </Badge>
        </div>

        {/* Card name */}
        <h3
          className="font-heading text-white font-bold truncate mt-auto"
          style={{ fontSize: 'clamp(6px, 0.85vw, 11px)' }}
        >
          {card.data.name}
        </h3>

        {/* Keywords с tooltip */}
        {card.keywords.length > 0 && (
          <div className="flex flex-wrap gap-px">
            {card.keywords.slice(0, 4).map((k) => (
              <Tooltip key={k}>
                <TooltipTrigger>
                  <Badge variant="keyword" style={{ fontSize: 'clamp(7px, 0.8vw, 12px)' }}>
                    {KWS[k]}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{KW[k]}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Status icons */}
        <div className="flex items-center gap-0.5" style={{ fontSize: 'clamp(7px, 0.8vw, 11px)' }}>
          {frozen && <span title="Заморожен" aria-label="Заморожен">❄️</span>}
          {sick && <span title="Болезнь призыва" aria-label="Болезнь призыва">💤</span>}
          {attacked && !sick && <span title="Атаковал" aria-label="Атаковал">✅</span>}
          {isDef && <span title="Защитник" aria-label="Защитник">🛡️</span>}
          {canAct && (
            <span className="text-green-400 animate-pulse" title="Может атаковать" aria-label="Может атаковать">
              ⚔️
            </span>
          )}
        </div>

        {/* Stats */}
        {card.data.type === 'creature' && (
          <div className="flex justify-between items-end mt-auto">
            <Badge 
              variant="destructive"
              className="bg-red-700/90 text-white rounded px-1 font-bold font-heading"
              style={{ fontSize: 'clamp(9px, 1.1vw, 14px)' }}
              aria-label={`${atk} атака`}
            >
              {atk}⚔
            </Badge>
            <Badge 
              className={cn(
                "rounded px-1 font-bold font-heading text-white",
                hp <= card.maxHealth / 2 ? "bg-red-600/90" : "bg-green-700/90"
              )}
              style={{ fontSize: 'clamp(9px, 1.1vw, 14px)' }}
              aria-label={`${hp} здоровье из ${card.maxHealth}`}
            >
              {hp}❤
            </Badge>
          </div>
        )}
      </CardContent>

      {frozen && <div className="absolute inset-0 bg-cyan-300/15 pointer-events-none z-20" aria-hidden="true" />}
      </CardVisual>
      </CardContainer>
    </CardSlot>
  );
}

/* ═══ HAND CARD — Refactored with shadcn/ui Card ═══ */
function HandCard({
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
    <CardSlot className="w-[var(--hand-card-w)] h-[var(--hand-card-h)]">
      <CardContainer
      onClick={onClick}
      draggable={canPlay}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'card-container card-hand-container cursor-pointer rounded-lg',
        selected && "border-yellow-400 shadow-yellow-400/50 shadow-lg -translate-y-4 scale-110 z-20",
        canPlay && isLand && "border-[#c9a84c] shadow-[#c9a84c]/30 shadow-lg card-glow hover:scale-105",
        canPlay && !isLand && "border-green-500/60 shadow-green-500/15 shadow-md hover:scale-105",
        !canPlay && !selected && "border-gray-700/40 opacity-45",
        canPlay && "cursor-grab active:cursor-grabbing"
      )}
      role="button"
      tabIndex={0}
      aria-label={`${card.data.name} (${card.data.cost} маны)`}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      title={`${card.data.name} (${card.data.cost}💎)\n${card.data.description}\n${canPlay ? '👆 Двойной клик или перетащите на поле' : '❌ Не хватает маны'}`}
    >
      <CardVisual className="card-frame card-in-hand card-visual border-2">
      {/* Foil overlay */}
      {(card.data.rarity === 'mythic' || card.data.rarity === 'rare') && (
        <div className={`card-foil-overlay pointer-events-none z-50 ${card.data.rarity === 'mythic' ? 'opacity-50' : 'opacity-30'}`} />
      )}

      <div className={`absolute inset-0 ${COLOR_ART[card.data.color]}`} aria-hidden="true" />
      
      {art.src && (
        <img
          src={art.src}
          data-fallback={art.fallback}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          loading="lazy"
          draggable={false}
          onError={(e) => handleImageErrorWithFallback(e.currentTarget)}
          aria-hidden="true"
        />
      )}
      
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" aria-hidden="true" />

      <CardContent className="relative z-10 flex flex-col h-full p-[clamp(2px,0.3vw,5px)] text-white">
        {/* Top row: Emoji + Cost */}
        <div className="flex justify-between items-start">
          <span style={{ fontSize: 'clamp(14px, 1.8vw, 28px)' }} aria-hidden="true">
            {card.data.emoji}
          </span>
          <Badge
            variant={isLand ? "default" : canPlay ? "default" : "secondary"}
            className={cn(
              "rounded-full flex items-center justify-center font-bold font-heading min-w-[22px] h-[22px] px-1.5",
              isLand && "bg-[#c9a84c] text-black",
              canPlay && !isLand && "bg-blue-500 text-white",
              !canPlay && !isLand && "bg-gray-700 text-gray-400"
            )}
            style={{ fontSize: 'clamp(8px, 0.9vw, 12px)' }}
            aria-label={`Цена: ${card.data.cost} маны`}
          >
            {card.data.cost}
          </Badge>
        </div>

        {/* Card name */}
        <h3
          className="font-heading text-white font-bold leading-tight mt-auto"
          style={{ fontSize: 'clamp(5px, 0.7vw, 9px)' }}
        >
          {card.data.name}
        </h3>

        {/* Stats */}
        {card.data.type === 'creature' && (
          <div className="flex justify-between items-end mt-0.5">
            <Badge
              variant="destructive"
              className="bg-red-700/90 text-red-300 font-bold font-heading rounded px-1"
              style={{ fontSize: 'clamp(7px, 0.9vw, 11px)' }}
              aria-label={`${card.data.attack} атака`}
            >
              {card.data.attack}⚔
            </Badge>
            <Badge
              className="bg-green-700/90 text-green-300 font-bold font-heading rounded px-1"
              style={{ fontSize: 'clamp(7px, 0.9vw, 11px)' }}
              aria-label={`${card.data.health} здоровье`}
            >
              {card.data.health}❤
            </Badge>
          </div>
        )}
        
        {card.data.type === 'land' && (
          <div
            className="text-[#c9a84c] font-bold text-center"
            style={{ fontSize: 'clamp(8px, 1vw, 12px)' }}
            aria-label="Земля"
          >
            🏔️
          </div>
        )}
        
        {card.data.type === 'spell' && (
          <div className="text-blue-300 text-center" style={{ fontSize: 'clamp(8px, 1vw, 12px)' }} aria-label="Заклинание">
            ✨
          </div>
        )}
        
        {card.data.type === 'enchantment' && (
          <div
            className="text-purple-300 text-center"
            style={{ fontSize: 'clamp(8px, 1vw, 12px)' }}
            aria-label="Наложение"
          >
            🔮
          </div>
        )}
      </CardContent>

      {/* Playable indicator */}
      {canPlay && !selected && (
        <div
          className={`absolute top-1 right-1 rounded-full animate-pulse z-20 ${isLand ? 'bg-[#c9a84c]' : 'bg-green-400'}`}
          style={{ width: 'clamp(4px, 0.5vw, 8px)', height: 'clamp(4px, 0.5vw, 8px)' }}
          aria-hidden="true"
        />
      )}
      </CardVisual>
      </CardContainer>
    </CardSlot>
  );
}

/* ═══ CARD PREVIEW — compact sidebar, right side ═══ */
function CardPreview({
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
    // 👇 Поменяли bottom-2 на bottom-36 👇
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
          ✕
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
              <span>⚔️ {getEffectiveAttack(card, gs[owner], gs[opp])}</span>
              <span>
                ❤️ {getEffectiveHealth(card, gs[owner])}/{card.maxHealth}
              </span>
              {card.frozen > 0 && <span className="text-cyan-400">❄️{card.frozen}</span>}
              {card.summoningSickness && <span className="text-yellow-400">💤</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN GAME BOARD
   ═══════════════════════════════════════════════════════ */
export function GameBoard({ mode, onBack }: Props) {
  const [gs, setGs] = useState<GameState>(createInitialGameState);
  const [selectedHand, setSelectedHand] = useState<string | null>(null);
  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null);
  const [inspected, setInspected] = useState<{
    card: CardInstance;
    owner: 'player1' | 'player2';
  } | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiActionStatus, setAiActionStatus] = useState<string | null>(null);
  const [showTurnTransition, setShowTurnTransition] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const seenStoryEventsRef = useRef<Set<number>>(new Set());
  const [dragCardUid, setDragCardUid] = useState<string | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState(false);
  const [attackAnimUid, setAttackAnimUid] = useState<string | null>(null);
  const [damageAnimUid, setDamageAnimUid] = useState<string | null>(null);
  const [playAnim, setPlayAnim] = useState<{ name: string; emoji: string; color: string } | null>(
    null
  );
  const [deathAnim, setDeathAnim] = useState<{ name: string; emoji: string; color: string } | null>(
    null
  );
  const [isCompactUI, setIsCompactUI] = useState(false);
  const [damageNumbers, setDamageNumbers] = useState<
    Array<{ id: number; value: number; x: number; y: number; type: 'damage' | 'heal' | 'buff' }>
  >([]);
  const [targetingLine, setTargetingLine] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const attackAnimTimerRef = useRef<number | null>(null);
  const damageAnimTimerRef = useRef<number | null>(null);
  const aiAnimTimerRef = useRef<number | null>(null);
  const aiTurnTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const prevFieldRef = useRef<{ p1: string[]; p2: string[] }>({ p1: [], p2: [] });
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
  }, [me.field, enemy.field]); // eslint-disable-line

  useEffect(() => {
    const ev = STORY_EVENTS.find(
      (e) => e.turnTrigger === gs.turnNumber && !seenStoryEventsRef.current.has(e.turnTrigger)
    );
    if (ev) {
      addMessage('story', ev.text, ev.emoji, 5000);
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

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [gs.log.length]);

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
      attackAnimTimerRef.current = window.setTimeout(() => {
        setAttackAnimUid(null);
      }, 650);
    }
    if (defenderUid) {
      damageAnimTimerRef.current = window.setTimeout(() => {
        setDamageAnimUid(null);
      }, 250);
    }
  }, []);

  // Spawn damage number popup
  const showDamageNumber = useCallback((value: number, x: number, y: number, type: 'damage' | 'heal' | 'buff' = 'damage') => {
    const id = Date.now() + Math.random();
    setDamageNumbers(prev => [...prev, { id, value, x, y, type }]);
    setTimeout(() => {
      setDamageNumbers(prev => prev.filter(dn => dn.id !== id));
    }, 800);
  }, []);

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

      const lore = getAILoreComment(
        lastCard?.data.id || '',
        result.state.player2.health,
        result.state.player1.health,
        result.state.turnNumber
      );
      addMessage('ai', lore, AI_CHARACTER.avatarEmoji, 6000);
      setAiThinking(false);

      setTimeout(() => {
        if (mountedRef.current) setAiActionStatus(null);
      }, 2500);
    }, 1200);
  }, [mode, gs, showCardNarrative, addMessage, runAIAnimations]);

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
    [gs, me.hand, myTurn, showCardNarrative, addMessage]
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
        setInspected(null);
        setTargetingLine(null);
      } else {
        setSelectedAttacker(uid);
        setSelectedHand(null);
        setInspected(null);
        // Show targeting line from attacker
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
        // Calculate damage for visual feedback
        const atk = getEffectiveAttack(attackerCard, me, enemy);
        const defenderRef = cardRefsMap.current.get(uid);
        if (defenderRef) {
          const rect = defenderRef.getBoundingClientRect();
          showDamageNumber(atk, rect.left + rect.width / 2, rect.top + rect.height / 2, 'damage');
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
      // Calculate damage for visual feedback - target enemy hero area
      const atk = getEffectiveAttack(attackerCard, me, enemy);
      const enemyHeroElement = document.querySelector('[data-enemy-hero]');
      if (enemyHeroElement) {
        const rect = enemyHeroElement.getBoundingClientRect();
        showDamageNumber(atk, rect.left + rect.width / 2, rect.top + rect.height / 2, 'damage');
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

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const apply = () => setIsCompactUI(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  return (
    <div className="h-[100dvh] w-full bg-gradient-to-b from-[#0a0810] via-[#0c0a14] to-[#0a0810] flex flex-col overflow-hidden relative select-none">
      {playAnim && (
        <CardPlayAnimation
          cardName={playAnim.name}
          cardEmoji={playAnim.emoji}
          cardColor={playAnim.color}
          onDone={() => setPlayAnim(null)}
        />
      )}

      {deathAnim && (
        <CardDeathAnimation
          cardName={deathAnim.name}
          cardEmoji={deathAnim.emoji}
          cardColor={deathAnim.color}
          onDone={() => setDeathAnim(null)}
        />
      )}

      {!showLog && (
        <MessageFeed messages={messages} onDismiss={dismissMessage} compact={isCompactUI} />
      )}

      <div
        className="flex items-center justify-between px-3 bg-black/80 z-20 shrink-0 border-b border-[#c9a84c]/15"
        style={{ height: 'clamp(36px, 5vh, 48px)' }}
      >
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-[#f0d68a] font-heading px-2 py-1 rounded hover:bg-[#1a1508] transition"
          style={{ fontSize: 'clamp(10px, 1vw, 14px)' }}
          title="Выйти в меню"
        >
          ← Меню
        </button>
        <div className="flex items-center gap-3">
          <span
            className="text-gray-600 font-heading"
            style={{ fontSize: 'clamp(10px, 1vw, 13px)' }}
          >
            Ход {gs.turnNumber}
          </span>
          <span
            className={`font-heading font-bold px-3 py-0.5 rounded-full border ${
              isP1Turn
                ? 'text-green-300 bg-green-900/30 border-green-600/30'
                : 'text-red-300 bg-red-900/30 border-red-600/30'
            }`}
            style={{ fontSize: 'clamp(10px, 1vw, 13px)' }}
          >
            {isP1Turn ? '🟢 ВАШ ХОД' : `🔴 ${AI_CHARACTER.name}`}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowLog(!showLog)}
            className={`font-heading px-2 py-1 rounded transition flex items-center gap-1 border ${
              showLog
                ? 'bg-[#2a1a08] text-[#f0d68a] border-[#c9a84c]/40'
                : 'text-gray-500 hover:text-[#f0d68a] border-transparent hover:border-[#c9a84c]/20 hover:bg-[#1a1508]'
            }`}
            style={{ fontSize: 'clamp(10px, 1vw, 13px)' }}
            title="Журнал действий"
          >
            📜 Лог
          </button>
          <button
            onClick={restart}
            className="text-gray-500 hover:text-[#f0d68a] font-heading px-2 py-1 rounded hover:bg-[#1a1508] transition"
            style={{ fontSize: 'clamp(10px, 1vw, 13px)' }}
            title="Новая игра"
          >
            🔄
          </button>
        </div>
      </div>

      <Sheet open={showLog} onOpenChange={setShowLog}>
        <SheetContent
          side="right"
          className="bg-[#0f0f18]/98 backdrop-blur border-l-[#c9a84c]/20 w-[clamp(260px,28vw,360px)] sm:max-w-[360px] flex flex-col p-0"
        >
          <SheetHeader className="border-b border-[#c9a84c]/15 px-4 py-3">
            <SheetTitle
              className="text-[#f0d68a] font-heading font-bold flex items-center gap-2"
              style={{ fontSize: 'clamp(12px, 1.2vw, 16px)' }}
            >
              📜 Хроника
            </SheetTitle>
            <SheetDescription
              className="text-gray-500 font-body"
              style={{ fontSize: 'clamp(9px, 0.9vw, 11px)' }}
            >
              Последние {Math.min(gs.log.length, 50)} действий
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto px-3 py-2 flex-1" ref={logRef}>
            {gs.log.slice(-50).map((e, i) => (
              <div
                key={i}
                className="text-gray-400 py-1 border-b border-gray-800/30 font-body"
                style={{ fontSize: 'clamp(9px, 0.9vw, 12px)' }}
              >
                {e}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {inspected && !selectedAttacker && (
        <CardPreview
          card={inspected.card}
          owner={inspected.owner}
          gs={gs}
          compact={isCompactUI}
          onClose={() => {
            setInspected(null);
            setSelectedHand(null);
          }}
        />
      )}

      <div className="px-3 py-1 shrink-0">
        <PlayerArea
          player={enemy}
          isCurrentPlayer={!isP1Turn}
          label={mode === 'ai' ? `${AI_CHARACTER.avatarEmoji} ${AI_CHARACTER.name}` : 'Игрок 2'}
          isTop
          dataEnemyHero
        />
      </div>

      {/* Action buttons - moved below enemy player area for better mobile UX */}
      <div className="flex items-center justify-center gap-2 shrink-0 py-1 px-2">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/20 to-transparent" />
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-center">
          {selectedAttacker && (
            <>
              <button
                onClick={clickAttackHero}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg font-heading font-bold shadow-lg shadow-red-700/30 animate-pulse transition whitespace-nowrap"
                style={{ fontSize: 'clamp(10px, 2.5vw, 13px)' }}
                title="Атаковать героя напрямую"
              >
                ⚔️ В героя
              </button>
              <button
                onClick={() => setSelectedAttacker(null)}
                className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition font-heading"
                style={{ fontSize: 'clamp(10px, 2.5vw, 13px)' }}
                title="Отменить выбор"
              >
                ✕
              </button>
            </>
          )}
          {myTurn && !gs.gameOver && !selectedAttacker && (
            <button
              onClick={clickEndTurn}
              className={`px-3 py-1.5 rounded-lg font-heading font-bold shadow-lg transition hover:scale-105 border whitespace-nowrap ${
                phase === 'done'
                  ? 'bg-gradient-to-r from-[#8b6914] to-[#c9a84c] hover:from-[#a07a1a] hover:to-[#d4b85a] text-white border-[#c9a84c]/50 animate-pulse shadow-[#c9a84c]/30'
                  : 'bg-[#1a1a2a] hover:bg-[#2a2a3a] text-gray-400 border-gray-700/50'
              }`}
              style={{ fontSize: 'clamp(10px, 2.5vw, 13px)' }}
              title={phase === 'done' ? 'Нет действий — завершите ход' : 'Завершить ход досрочно'}
            >
              Конец хода ⏭️
            </button>
          )}
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/20 to-transparent" />
      </div>

      <div
        className="flex justify-center gap-0.5 px-2 shrink-0"
        style={{ height: 'clamp(18px, 2vw, 28px)' }}
      >
        {enemy.hand.map((_, i) => (
          <div
            key={i}
            className="bg-gradient-to-b from-red-900/80 to-red-950 rounded border border-red-800/30 flex items-center justify-center relative overflow-hidden"
            style={{
              width: 'clamp(12px, 1.5vw, 22px)',
              height: '100%',
              fontSize: 'clamp(4px, 0.6vw, 7px)',
            }}
          >
            {cardBackSrc && (
              <img
                src={cardBackSrc}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-90"
                loading="lazy"
                onError={(e) => handleImageErrorWithFallback(e.currentTarget)}
              />
            )}
            <span className="relative z-10">🂠</span>
          </div>
        ))}
        <span
          className="text-gray-600 ml-0.5 self-center"
          style={{ fontSize: 'clamp(7px, 0.8vw, 10px)' }}
        >
          {enemy.hand.length}
        </span>
      </div>

      {enemy.enchantments.length > 0 && (
        <div className="flex justify-center gap-1 px-2 shrink-0">
          {enemy.enchantments.map((c) => (
            <span
              key={c.uid}
              className="bg-purple-900/50 text-purple-200 rounded px-1.5 py-0.5 border border-purple-500/20 cursor-pointer hover:bg-purple-800/50 transition font-body"
              style={{ fontSize: 'clamp(8px, 0.85vw, 11px)' }}
              onClick={(e) => {
                e.stopPropagation();
                setInspected({ card: c, owner: 'player2' });
              }}
              title={`${c.data.name}: ${c.data.description}`}
            >
              {c.data.emoji} {c.data.name}
            </span>
          ))}
        </div>
      )}

      <div
        className={`flex-1 flex flex-col justify-between min-h-0 relative px-2 py-1 transition-all duration-300 ${
          dropZoneActive ? 'bg-green-900/10 ring-2 ring-green-400/30 ring-inset rounded-xl' : ''
        }`}
        onClick={clickBF}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dropZoneActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-green-500/10 border-2 border-dashed border-green-400/40 rounded-2xl px-8 py-4 backdrop-blur-sm">
              <p
                className="text-green-300 font-heading animate-pulse"
                style={{ fontSize: 'clamp(14px, 1.5vw, 20px)' }}
              >
                ↓ Отпустите карту здесь ↓
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-center items-end gap-[clamp(4px,0.5vw,10px)] min-h-[var(--field-card-h)] py-1 flex-wrap content-end">
          {enemy.field.length === 0 ? (
            <div
              className="text-gray-700 italic font-body"
              style={{ fontSize: 'clamp(10px, 1vw, 13px)' }}
            >
              Поле Хранителя пусто
            </div>
          ) : (
            enemy.field.map((card) => (
              <FieldCard
                key={card.uid}
                card={card}
                player={enemy}
                opponent={me}
                isTarget={!!selectedAttacker}
                selected={inspected?.card.uid === card.uid && !selectedAttacker}
                attackAnim={attackAnimUid === card.uid}
                damageAnim={damageAnimUid === card.uid}
                cardRef={(el) => {
                  if (el) cardRefsMap.current.set(card.uid, el);
                  else cardRefsMap.current.delete(card.uid);
                }}
                onClick={() => clickEnemyCreature(card.uid)}
              />
            ))
          )}
        </div>

        <div className="flex justify-center items-start gap-[clamp(4px,0.5vw,10px)] min-h-[var(--field-card-h)] py-1 flex-wrap content-start">
          {me.field.length === 0 ? (
            <div
              className="text-gray-600 italic font-body"
              style={{ fontSize: 'clamp(10px, 1vw, 13px)' }}
            >
              {me.hand.length > 0 ? '👇 Перетащите существ сюда' : 'Поле пусто'}
            </div>
          ) : (
            me.field.map((card) => {
              const canAct =
                myTurn &&
                !card.summoningSickness &&
                !card.hasAttacked &&
                card.frozen <= 0 &&
                !card.keywords.includes('defender') &&
                !gs.gameOver;
              return (
                <FieldCard
                  key={card.uid}
                  card={card}
                  player={me}
                  opponent={enemy}
                  selected={selectedAttacker === card.uid}
                  canAct={canAct}
                  attackAnim={attackAnimUid === card.uid}
                  damageAnim={damageAnimUid === card.uid}
                  cardRef={(el) => {
                    if (el) cardRefsMap.current.set(card.uid, el);
                    else cardRefsMap.current.delete(card.uid);
                  }}
                  onClick={() => clickMyCreature(card.uid)}
                />
              );
            })
          )}
        </div>
      </div>

      {me.enchantments.length > 0 && (
        <div className="flex justify-center gap-1 px-2 shrink-0">
          {me.enchantments.map((c) => (
            <span
              key={c.uid}
              className="bg-purple-900/50 text-purple-200 rounded px-1.5 py-0.5 border border-purple-500/20 cursor-pointer hover:bg-purple-800/50 transition font-body"
              style={{ fontSize: 'clamp(8px, 0.85vw, 11px)' }}
              onClick={(e) => {
                e.stopPropagation();
                setInspected({ card: c, owner: 'player1' });
              }}
            >
              {c.data.emoji} {c.data.name}
            </span>
          ))}
        </div>
      )}

      <div className="px-3 py-1 shrink-0">
        <PlayerArea player={me} isCurrentPlayer={isP1Turn} label="👤 Вы" />
      </div>

      {myTurn && !gs.gameOver && (
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
                    ›
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
            {getHint()}
          </div>
        </div>
      )}

      {/* ═══ ИСПРАВЛЕННЫЙ БЛОК РУКИ ═══ */}
      <div
        className="bg-black/70 px-2 shrink-0 border-t border-[#c9a84c]/10 relative z-20"
        style={{
          paddingBottom: isCompactUI ? 'max(0.375rem, env(safe-area-inset-bottom))' : undefined,
        }}
      >
        <div
          className="flex justify-center gap-[clamp(3px,0.4vw,8px)] overflow-x-auto pt-6 pb-4 px-2"
          style={{ scrollbarWidth: 'thin' }}
        >
          {me.hand.length === 0 && (
            <div
              className="text-gray-600 italic py-2 font-body"
              style={{ fontSize: 'clamp(10px, 1vw, 13px)' }}
            >
              Рука пуста
            </div>
          )}
          {me.hand.map((card) => {
            const isLand = card.data.type === 'land';
            const canPlay =
              myTurn &&
              !gs.gameOver &&
              (isLand ? me.landsPlayed < me.maxLandsPerTurn : card.data.cost <= me.mana);
            return (
              <HandCard
                key={card.uid}
                card={card}
                selected={selectedHand === card.uid}
                canPlay={canPlay}
                isLand={isLand}
                onClick={() => clickHand(card.uid)}
                onDragStart={(e) => handleDragStart(e, card.uid)}
                onDragEnd={handleDragEnd}
              />
            );
          })}
        </div>
      </div>

      {showTurnTransition && (
        <div className="turn-banner z-[10000]">
          <div className="turn-banner-text">
            {AI_CHARACTER.avatarEmoji} ХОД ХРАНИТЕЛЯ
          </div>
          <div className="turn-banner-sub">{AI_CHARACTER.title}</div>
        </div>
      )}

      {aiThinking && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50 pointer-events-none transition-opacity duration-500">
          <div
            className="bg-[#0f0f18]/95 rounded-2xl px-6 py-4 text-white flex flex-col items-center gap-2 shadow-2xl border border-[#c9a84c]/30"
            style={{ width: isCompactUI ? 'min(92vw, 360px)' : undefined }}
          >
            <div className="animate-pulse" style={{ fontSize: 'clamp(36px, 4vw, 56px)' }}>
              {AI_CHARACTER.avatarEmoji}
            </div>
            <span
              className="font-heading font-bold text-[#f0d68a]"
              style={{ fontSize: 'clamp(12px, 1.2vw, 18px)' }}
            >
              {AI_CHARACTER.name}
            </span>

            {aiActionStatus ? (
              <span
                className="text-[#f0d68a] font-body text-center animate-fade-in"
                style={{ fontSize: 'clamp(10px, 1.1vw, 15px)' }}
              >
                {aiActionStatus}
              </span>
            ) : (
              <span
                className="text-gray-500 font-body"
                style={{ fontSize: 'clamp(9px, 0.9vw, 12px)' }}
              >
                размышляет о стратегии...
              </span>
            )}

            {!aiActionStatus && (
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-[#c9a84c] rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-[#c9a84c] rounded-full animate-bounce"
                  style={{ animationDelay: '0.15s' }}
                />
                <div
                  className="w-2 h-2 bg-[#c9a84c] rounded-full animate-bounce"
                  style={{ animationDelay: '0.3s' }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={gs.gameOver ?? false}>
        <DialogContent
          showClose={false}
          className="bg-gradient-to-br from-[#1a1508] to-[#0f0f18] border-[#c9a84c]/40 text-center max-w-sm shadow-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="items-center">
            <div style={{ fontSize: 'clamp(48px, 6vw, 72px)' }} className="mb-1">
              {gs.winner === 'player1' ? '🏆' : '💀'}
            </div>
            <DialogTitle
              className="font-title text-[#f0d68a]"
              style={{ fontSize: 'clamp(24px, 3vw, 40px)' }}
            >
              {gs.winner === 'player1' ? 'Победа!' : 'Поражение!'}
            </DialogTitle>
            <DialogDescription
              className="text-gray-300 italic font-body"
              style={{ fontSize: 'clamp(11px, 1.1vw, 15px)' }}
            >
              {gs.winner === 'player1'
                ? '«Ты покорил Омск... но Омск покорил тебя.»'
                : '«Ты не смог покинуть Омск. Никто не может.»'}
            </DialogDescription>
          </DialogHeader>
          <p className="text-gray-600 font-body" style={{ fontSize: 'clamp(9px, 0.9vw, 12px)' }}>
            Ходов: {gs.turnNumber} | HP: {me.health} vs {enemy.health}
          </p>
          <DialogFooter className="flex-row justify-center gap-3 sm:justify-center">
            <Button
              onClick={restart}
              className="px-6 py-3 bg-gradient-to-r from-[#8b6914] to-[#c9a84c] hover:from-[#a07a1a] hover:to-[#d4b85a] text-white rounded-xl font-heading font-bold shadow-lg hover:scale-105 transition"
              style={{ fontSize: 'clamp(12px, 1.2vw, 16px)' }}
            >
              🔄 Реванш
            </Button>
            <Button
              variant="outline"
              onClick={onBack}
              className="px-6 py-3 bg-[#1a1a2a] hover:bg-[#2a2a3a] text-white rounded-xl font-heading font-bold shadow-lg hover:scale-105 transition border-gray-700/50"
              style={{ fontSize: 'clamp(12px, 1.2vw, 16px)' }}
            >
              📋 Меню
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Damage Numbers Overlay */}
      {damageNumbers.map((dn) => (
        <div
          key={dn.id}
          className={`damage-number ${dn.type === 'heal' ? 'heal' : dn.type === 'buff' ? 'buff' : ''}`}
          style={{
            left: dn.x,
            top: dn.y,
            position: 'fixed',
            zIndex: 10000,
          }}
        >
          {dn.type === 'heal' ? '+' : ''}{dn.value}
        </div>
      ))}

      {/* Targeting Line */}
      {targetingLine && selectedAttacker && (
        <svg
          className="pointer-events-none fixed inset-0 z-[9999]"
          style={{ width: '100vw', height: '100vh' }}
        >
          <line
            x1={targetingLine.startX}
            y1={targetingLine.startY}
            x2={targetingLine.endX}
            y2={targetingLine.endY}
            stroke="url(#targetingGradient)"
            strokeWidth="3"
            strokeDasharray="8,4"
            className="targeting-line"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(255,100,0,0.8))',
            }}
          />
          <defs>
            <linearGradient id="targetingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,100,0,0)" />
              <stop offset="50%" stopColor="rgba(255,100,0,0.9)" />
              <stop offset="100%" stopColor="rgba(255,100,0,0)" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {/* Low Health Warning */}
      {me.health <= 10 && me.health > 0 && (
        <div className="low-health-overlay" />
      )}
    </div>
  );
}
