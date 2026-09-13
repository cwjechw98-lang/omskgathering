import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { GameState, CardInstance } from '../game/types';
import { createInitialGameState, createCardInstance, playCard } from '../game/engine';
import { createDeckFromCardIds } from '../data/cards';
import { expandDeckCardIds, getActiveDeck, loadDecksState } from '../utils/decksStorage';
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
import { cn } from '@/lib/utils';
import { CardPreview } from './game/CardPreview';
import { FieldCard, COLOR_ART } from './game/FieldCard';
import { ModalOverlay } from './ui/modal-overlay';
import { Tutorial } from './game/Tutorial';
import { PhaseIndicator } from './game/PhaseIndicator';
import { MessageFeed, useMessageFeed } from './game/MessageFeed';
import { DeckStack } from './game/DeckStack';
import { PlayerArea } from './PlayerArea';
import { useGameActions } from '@/game/hooks/useGameActions';
// Progression system
import {
  useDailyQuests,
  useAchievements,
  useXPProfile,
  useTelemetry,
  useBaselineMetrics,
  QuestPanel,
  AchievementPanel,
  ProfilePanel,
  DAILY_QUEST_META,
  ACHIEVEMENTS_META,
  PROGRESSION_CONSTS,
} from '@/features/progression';
// DevTools
import { DebugPanel, PerformanceMonitor } from '@/devtools';

interface Props {
  mode: 'ai' | 'local' | 'online';
  onBack: () => void;
}

function createInitialGameStateForActiveDeck(): GameState {
  const base = createInitialGameState();
  const decksState = loadDecksState();
  const activeDeck = getActiveDeck(decksState);
  if (!activeDeck) return base;

  const selectedCardIds = expandDeckCardIds(activeDeck);
  const selectedDeckData = createDeckFromCardIds(selectedCardIds);
  const selectedInstances = selectedDeckData.map((card) => createCardInstance(card));
  if (selectedInstances.length === 0) return base;

  const player1HandSize = Math.min(6, selectedInstances.length);
  base.player1.hand = selectedInstances.slice(0, player1HandSize);
  base.player1.deck = selectedInstances.slice(player1HandSize);

  base.log.push(`🧱 Активная колода: ${activeDeck.name}`);

  return base;
}

/* ═══ CARD CONTAINERS ═══ */
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

/* ═══ MAIN GAME BOARD ═══ */
export function GameBoard({ mode, onBack }: Props) {
  const [gs, setGs] = useState<GameState>(createInitialGameStateForActiveDeck);
  const [selectedHand, setSelectedHand] = useState<string | null>(null);
  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null);
  const [selectedAttackerSlot, setSelectedAttackerSlot] = useState<number | null>(null);
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
  const [statFloats, setStatFloats] = useState<
    Array<{ id: number; value: string; x: number; y: number; className: string }>
  >([]);
  const [screenShake, setScreenShake] = useState(false);
  const [explosionFlash, setExplosionFlash] = useState(false);
  const [dyingCards, setDyingCards] = useState<Set<string>>(new Set());
  const [cardDeathEffects, setCardDeathEffects] = useState<Map<string, 'fire' | 'poison' | 'ice'>>(new Map());
  const targetingLineState = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  // Attack notification state - shows when creatures can attack and player has mana
  const [showAttackNotification, setShowAttackNotification] = useState(false);
  const [hasPlayedNonLandCardThisTurn, setHasPlayedNonLandCardThisTurn] = useState(false);
  
  // Progression hooks
  const dailyQuestsHook = useDailyQuests();
  const achievementsHook = useAchievements();
  const xpHook = useXPProfile();
  const telemetryHook = useTelemetry();
  const baselineHook = useBaselineMetrics();
  
  const dailyQuests = dailyQuestsHook.quests;
  const achievements = achievementsHook.achievements;
  const xpProfile = xpHook.profile;
  const telemetry = telemetryHook.telemetry;
  const baselineMetrics = baselineHook.metrics;
  
  const [tutorialCompleted, setTutorialCompleted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('tutorialCompleted') === 'true';
  });
  const prevTurnRef = useRef<{ turnNumber: number; currentTurn: GameState['currentTurn'] }>({
    turnNumber: gs.turnNumber,
    currentTurn: gs.currentTurn,
  });
  const prevGameOverRef = useRef(gs.gameOver);
  const prevQuestProgressRef = useRef(dailyQuests.progress);
  const prevAchievementsUnlockedRef = useRef(achievements.unlocked);
  const emittedTutorialHintsRef = useRef<Set<string>>(new Set());
  const turnStartedAtRef = useRef<number>(Date.now());
  const aiTurnStartedAtRef = useRef<number | null>(null);
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
  const handCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { messages, addMessage, clear: clearMessages, dismiss: dismissMessage } = useMessageFeed();

  const isP1Turn = gs.currentTurn === 'player1';
  const myTurn = mode === 'ai' ? isP1Turn : true;
  const me = gs.player1;
  const enemy = gs.player2;
  const cardBackSrc = getCardBackSource();

  // Game over effects
  useEffect(() => {
    if (!prevGameOverRef.current && gs.gameOver) {
      telemetryHook.pushEvent('match_completed', {
        turnNumber: gs.turnNumber,
        playerHealth: gs.player1.health,
      });
      if (gs.player1.health > 0) {
        telemetryHook.pushEvent('match_victory', {
          turnNumber: gs.turnNumber,
          playerHealth: gs.player1.health,
        });
      }
      dailyQuestsHook.incrementQuest('complete_match');
      achievementsHook.unlock('first_match_complete');
      if (gs.player1.health > 0) {
        achievementsHook.unlock('first_victory');
      }
      baselineHook.recordMatchCompleted();
      xpHook.addXP(75); // 50 for completion + 25 for victory
    }
    prevGameOverRef.current = gs.gameOver;
  }, [gs.gameOver, gs.player1.health, gs.turnNumber, telemetryHook, dailyQuestsHook, achievementsHook, baselineHook, xpHook]);

  useEffect(() => {
    const previous = prevQuestProgressRef.current;
    for (const quest of DAILY_QUEST_META) {
      const before = previous[quest.id] ?? 0;
      const after = dailyQuests.progress[quest.id] ?? 0;
      if (before < PROGRESSION_CONSTS.DAILY_QUEST_TARGET && after >= PROGRESSION_CONSTS.DAILY_QUEST_TARGET) {
        telemetryHook.pushEvent('daily_quest_completed', {
          questId: quest.id,
          dateKey: dailyQuests.dateKey,
        });
      }
    }
    prevQuestProgressRef.current = dailyQuests.progress;
  }, [dailyQuests, telemetryHook]);

  useEffect(() => {
    const previous = prevAchievementsUnlockedRef.current;
    for (const achievement of ACHIEVEMENTS_META) {
      const wasUnlocked = previous[achievement.id];
      const isUnlocked = achievements.unlocked[achievement.id];
      if (!wasUnlocked && isUnlocked) {
        telemetryHook.pushEvent('achievement_unlocked', {
          achievementId: achievement.id,
        });
      }
    }
    prevAchievementsUnlockedRef.current = achievements.unlocked;
  }, [achievements, telemetryHook]);

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
  // Intentionally omitting addMessage, deathAnim, me.graveyard, enemy.graveyard, gs.log
  // to avoid re-running on every state change; using refs for graveyard lookup is intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    const currentHandUids = new Set(me.hand.map((c) => c.uid));
    for (const uid of handCardRefs.current.keys()) {
      if (!currentHandUids.has(uid)) {
        handCardRefs.current.delete(uid);
      }
    }
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

  useEffect(() => {
    const prev = prevTurnRef.current;
    if (prev.turnNumber !== gs.turnNumber || prev.currentTurn !== gs.currentTurn) {
      const now = Date.now();
      const previousTurnDuration = now - turnStartedAtRef.current;
      if (prev.currentTurn === 'player1' && previousTurnDuration > 0) {
        baselineHook.recordTurnEnded(previousTurnDuration);
      }
      turnStartedAtRef.current = now;
      setHasPlayedNonLandCardThisTurn(false);
      prevTurnRef.current = { turnNumber: gs.turnNumber, currentTurn: gs.currentTurn };
    }
  }, [gs.turnNumber, gs.currentTurn, baselineHook]);

  // Show attack notification when attackers available and player has mana
  const canShowAttackNotification = myTurn && !gs.gameOver && hasAttackers && me.mana > 0;
  // Show notification when conditions are met and we haven't dismissed it yet
  useEffect(() => {
    if (canShowAttackNotification) {
      // Show notification when attackers become available with mana
      setShowAttackNotification(true);
    } else {
      // Hide when conditions no longer met
      setShowAttackNotification(false);
    }
  }, [canShowAttackNotification]);

  // Hide notification when player makes an attack
  useEffect(() => {
    if (selectedAttacker) {
      setShowAttackNotification(false);
    }
  }, [selectedAttacker]);

  const phase = (() => {
    if (!myTurn || gs.gameOver) return 'done' as const;
    if (hasPlayableLand && !landPlayed) return 'land' as const;
    if (hasPlayableCard || hasPlayableLand) return 'play' as const;
    if (hasAttackers) return 'attack' as const;
    return 'done' as const;
  })();

  const tutorialVisible = gs.turnNumber <= 3 && myTurn && !gs.gameOver && !tutorialCompleted;
  const tutorialHintKey = (() => {
    if (!tutorialVisible) return null;
    if (hasPlayableLand && !landPlayed) return 'play_land';
    if (hasPlayableCard && !hasPlayedNonLandCardThisTurn) return 'play_non_land';
    if (hasAttackers && myTurn && phase === 'attack') return 'attack';
    return 'end_turn';
  })();

  useEffect(() => {
    if (!tutorialVisible || !tutorialHintKey) return;

    const emissionKey = `${gs.turnNumber}:${tutorialHintKey}`;
    if (!emittedTutorialHintsRef.current.has(emissionKey)) {
      telemetryHook.pushEvent('tutorial_hint_shown', {
        hint: tutorialHintKey,
        turnNumber: gs.turnNumber,
      });
      emittedTutorialHintsRef.current.add(emissionKey);
    }
  }, [tutorialVisible, tutorialHintKey, gs.turnNumber, telemetryHook]);

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

  const showStatChange = useCallback(
    (value: string, x: number, y: number, className: string) => {
      const id = Date.now() + Math.random();
      setStatFloats((prev) => [...prev, { id, value, x, y, className }]);
      setTimeout(() => setStatFloats((prev) => prev.filter((sf) => sf.id !== id)), 800);
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
      aiTurnStartedAtRef.current = null;
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
    aiTurnStartedAtRef.current = Date.now();
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
      const aiStartedAt = aiTurnStartedAtRef.current;
      if (aiStartedAt) {
        baselineHook.recordAiTurn(Date.now() - aiStartedAt);
        aiTurnStartedAtRef.current = null;
      }
      setAiThinking(false);
      setTimeout(() => {
        if (mountedRef.current) setAiActionStatus(null);
      }, 2500);
    }, 1200);
  }, [mode, gs, showCardNarrative, addMessage, runAIAnimations, setAiActionStatus, baselineHook]);

  useEffect(() => {
    if (mode === 'ai' && gs.currentTurn === 'player2' && !gs.gameOver) {
      const t = setTimeout(runAI, 500);
      return () => clearTimeout(t);
    }
  }, [gs.currentTurn, mode, gs.gameOver, runAI]);

  const doPlayCard = useCallback(
    (uid: string) => {
      const actionStartedAt = Date.now();
      const card = me.hand.find((c) => c.uid === uid);
      if (!card || !myTurn || gs.gameOver) return false;
      const next = playCard(gs, 'player1', uid);
      if (next !== gs) {
        telemetryHook.pushEvent(card.data.type === 'land' ? 'card_played_land' : 'card_played_non_land', {
          cardId: card.data.id,
          turnNumber: gs.turnNumber,
          mana: me.mana,
        });
        xpHook.addXP(10);
        if (card.data.type !== 'land') {
          setHasPlayedNonLandCardThisTurn(true);
        }
        dailyQuestsHook.incrementQuest(card.data.type === 'land' ? 'play_land' : 'play_non_land');
        achievementsHook.unlock(card.data.type === 'land' ? 'first_land' : 'first_spell_or_creature');
        baselineHook.recordCardPlayed(Date.now() - actionStartedAt);
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
    [gs, me.hand, myTurn, showCardNarrative, addMessage, setPlayAnim, me.mana, telemetryHook, xpHook, dailyQuestsHook, achievementsHook, baselineHook]
  );

  // Game actions (extracted to useGameActions hook)
  const {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clickHand,
    clickMyCreature,
    clickEnemyCreature,
    clickAttackHero,
    clickEndTurn,
    restart,
  } = useGameActions({
    gs,
    setGs,
    me,
    enemy,
    myTurn,
    mode,
    selectedAttacker,
    selectedHand,
    setSelectedAttacker,
    setSelectedAttackerSlot,
    setSelectedHand,
    setInspected,
    setTargetingLine,
    setDragCardUid,
    setDropZoneActive,
    dragCardUid,
    doPlayCard,
    showDamageNumber,
    showStatChange,
    setScreenShake,
    setExplosionFlash,
    setDyingCards,
    setCardDeathEffects,
    addMessage,
    triggerCombatAnims,
    setShowAttackNotification,
    clearMessages,
    cardRefsMap,
    handCardRefs,
    setPlayAnim,
    setDeathAnim,
    seenStoryEventsRef,
    emittedTutorialHintsRef,
    turnStartedAtRef,
    aiTurnStartedAtRef,
    prevFieldRef,
    prevTurnRef,
    createInitialGameState: createInitialGameStateForActiveDeck,
    setHasPlayedNonLandCardThisTurn,
    setShowTurnTransition,
    mountedRef,
  });
  const exportUnifiedDebugSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const payload = {
        meta: {
          version: 'unified-debug-hub.v0',
          exportedAt: Date.now(),
        },
        telemetry: {
          count: telemetry.events.length,
          events: telemetry.events,
        },
        baseline: {
          counters: baselineMetrics.counters,
          averages: baselineHook.averages,
          samples: {
            turnDurationsMs: baselineMetrics.recentTurnDurationsMs,
            aiTurnDurationsMs: baselineMetrics.recentAiTurnDurationsMs,
            actionLatencyMs: baselineMetrics.recentCardActionLatencyMs,
          },
        },
        progression: {
          quests: dailyQuests,
          achievements,
          xp: xpProfile,
        },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      anchor.href = url;
      anchor.download = `omsk-unified-debug-snapshot-v0-${timestamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      // no-op: export is debug-only
    }
  }, [achievements, baselineMetrics, baselineHook.averages, dailyQuests, telemetry.events, xpProfile]);

  const clearUnifiedDebugLocalData = useCallback(() => {
    telemetryHook.resetTelemetry();
    baselineHook.resetBaseline();
    dailyQuestsHook.resetQuests();
    achievementsHook.resetAchievements();
    xpHook.resetXP();
    setShowLog(false);
  }, [telemetryHook, baselineHook, dailyQuestsHook, achievementsHook, xpHook]);

  const handleTutorialSkip = useCallback(() => {
    setTutorialCompleted(true);
    telemetryHook.pushEvent('tutorial_skipped', {
      hint: tutorialHintKey,
      turnNumber: gs.turnNumber,
    });
  }, [gs.turnNumber, telemetryHook, tutorialHintKey]);

  const closeCardPreview = useCallback(
    (source: 'backdrop' | 'button', point?: { x: number; y: number }) => {
      if (
        source === 'backdrop' &&
        point &&
        selectedHand &&
        inspected?.owner === 'player1' &&
        inspected.card.uid === selectedHand
      ) {
        const handZoneEl = document.querySelector('.zone-hand') as HTMLDivElement | null;
        const handZoneRect = handZoneEl?.getBoundingClientRect();
        const tappedHandZone =
          !!handZoneRect &&
          point.x >= handZoneRect.left &&
          point.x <= handZoneRect.right &&
          point.y >= handZoneRect.top &&
          point.y <= handZoneRect.bottom;

        const selectedCardEl = handCardRefs.current.get(selectedHand);
        if (selectedCardEl) {
          const rect = selectedCardEl.getBoundingClientRect();
          const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
          const hitSlop = coarsePointer ? 56 : 28;
          const tappedSelectedCard =
            point.x >= rect.left - hitSlop &&
            point.x <= rect.right + hitSlop &&
            point.y >= rect.top - hitSlop &&
            point.y <= rect.bottom + hitSlop;

          if ((tappedSelectedCard || tappedHandZone) && doPlayCard(selectedHand)) {
            return;
          }
        } else if (tappedHandZone && doPlayCard(selectedHand)) {
            return;
        }
      }

      setInspected(null);
      setSelectedHand(null);
    },
    [doPlayCard, inspected, selectedHand]
  );

  const clickBF = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (
      target.closest(
        [
          '[data-interactive-ui="true"]',
          'button',
          '[role="button"]',
          'a',
          'input',
          'select',
          'textarea',
          '.hand-card-wrapper',
          '.creature-slot',
          '.card-preview-overlay',
          '.tutorial-hint-panel',
          '.modal-overlay',
          '.modal-overlay-content',
        ].join(',')
      )
    ) {
      return;
    }

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
            data-interactive-ui="true"
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
          <div className="flex items-start gap-2">
            <PerformanceMonitor metrics={baselineMetrics} averages={baselineHook.averages} />
            <ProfilePanel profile={xpProfile} xpPerLevel={PROGRESSION_CONSTS.XP_PER_LEVEL} />
            <QuestPanel quests={dailyQuests} meta={DAILY_QUEST_META} target={PROGRESSION_CONSTS.DAILY_QUEST_TARGET} />
            <AchievementPanel achievements={achievements} meta={ACHIEVEMENTS_META} />
            <DebugPanel
              telemetry={telemetry}
              baseline={baselineMetrics}
              quests={dailyQuests}
              achievements={achievements}
              xp={xpProfile}
              onExportSnapshot={exportUnifiedDebugSnapshot}
              onClearAll={clearUnifiedDebugLocalData}
              showLog={showLog}
              onToggleLog={() => setShowLog((prev) => !prev)}
            />
          </div>
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
            data-interactive-ui="true"
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
          label={mode === 'ai' ? 'Хранитель Омска' : 'Игрок 2'}
          heroIcon={mode === 'ai' ? '🗿' : '👤'}
          dataEnemyHero={true}
        />
        <DeckStack count={enemy.graveyard.length} type="graveyard" label={mode === 'ai' ? 'Сброс Хранителя' : 'Сброс Игрока 2'} />
      </div>

      {/* ENEMY BOARD ZONE */}
      <div className="zone-enemy-board">
        <div className="board-zone enemy">
          {Array.from({ length: 7 }, (_, i) => {
            const card = enemy.field[i];
            const laneActive = selectedAttacker !== null && !gs.gameOver && selectedAttackerSlot === i;
            return (
              <div
                key={i}
                className={`creature-slot ${card ? 'occupied' : ''} ${laneActive ? 'attack-lane' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {card && (
                  <FieldCard
                    card={card}
                    player={enemy}
                    opponent={me}
                    isTarget={laneActive}
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
                <button onClick={clickAttackHero} className="attack-hero-btn" data-interactive-ui="true">
                  💥 В героя
                </button>
                <button
                  onClick={() => {
                    setSelectedAttacker(null);
                    setSelectedAttackerSlot(null);
                  }}
                  className="cancel-btn"
                  data-interactive-ui="true"
                >
                  Отмена
                </button>
              </>
            )}
            {!gs.gameOver && myTurn && (
              <button onClick={clickEndTurn} className="end-turn-btn ready" data-interactive-ui="true">
                Конец хода ⏭️
              </button>
            )}
          </div>
          <div className="hidden sm:block">
            <PhaseIndicator gameState={gs} isMyTurn={myTurn} playerKey="player1" />
          </div>
          <div className="divider-hint">{getHint()}</div>
          {/* Attack availability notification */}
          {showAttackNotification && (
            <div className="attack-notification animate-bounce">
              <span className="text-lg">⚔️</span>
              <span>Доступны атаки! Кликните на существо с зелёной рамкой</span>
              <button
                onClick={() => setShowAttackNotification(false)}
                className="ml-2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
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
            const laneSourceActive = selectedAttacker !== null && !gs.gameOver && selectedAttackerSlot === i;
            return (
              <div
                key={i}
                className={`creature-slot ${card ? 'occupied' : ''} ${dropZoneActive ? 'drop-target' : ''} ${laneSourceActive ? 'attack-lane-source' : ''}`}
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
        <PlayerArea
          player={me}
          isCurrentPlayer={isP1Turn}
          label={mode === 'ai' ? 'Игрок' : 'Игрок 1'}
          heroIcon="👤"
        />
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
                ref={(el) => {
                  if (el) {
                    handCardRefs.current.set(card.uid, el);
                  } else {
                    handCardRefs.current.delete(card.uid);
                  }
                }}
                className={`hand-card-wrapper ${selectedHand === card.uid ? 'selected' : ''} ${newlyDrawnUids.has(card.uid) ? 'card-draw-animation' : ''}`}
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
          onClose={closeCardPreview}
        />
      )}

      {/* TUTORIAL */}
      {tutorialVisible && (
        <Tutorial
          gameState={gs}
          playerKey="player1"
          hintContext={{
            hasPlayableLand,
            hasPlayedLandThisTurn: landPlayed,
            hasPlayableNonLandCard: hasPlayableCard,
            hasPlayedNonLandCardThisTurn,
            hasAttackReadyCreature: hasAttackers,
            isAttackOpportunity: myTurn && phase === 'attack',
          }}
          onSkip={handleTutorialSkip}
        />
      )}

      {/* MESSAGE FEED */}
      <div className="z-layer-overlay relative">
        <MessageFeed messages={messages} onDismiss={dismissMessage} />
      </div>

      {/* DAMAGE NUMBERS */}
      {damageNumbers.map((dn) => (
        <div key={dn.id} className={`damage-number ${dn.type}`} style={{ left: dn.x, top: dn.y }}>
          {dn.value}
        </div>
      ))}

      {/* STAT CHANGE FLOATS */}
      {statFloats.map((sf) => (
        <div
          key={sf.id}
          className={`stat-change-float ${sf.className}`}
          style={{ left: sf.x, top: sf.y }}
        >
          {sf.value}
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
