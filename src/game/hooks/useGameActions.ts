// ═══════════════════════════════════════════
// GAME ACTIONS HOOK
// ═══════════════════════════════════════════
// Обработчики игровых действий (клики, атаки, ходы)

import { useCallback } from 'react';
import type { GameState, CardInstance, PlayerState } from '../types';
import { attackPlayer, attackCreature, endTurn, getEffectiveAttack } from '../engine';
import type { GameMessageType } from '@/components/game/MessageFeed';

type CardAnim = { name: string; emoji: string; color: string } | null;

interface UseGameActionsProps {
  gs: GameState;
  setGs: React.Dispatch<React.SetStateAction<GameState>>;
  me: PlayerState;
  enemy: PlayerState;
  myTurn: boolean;
  mode: 'ai' | 'local' | 'online';
  selectedAttacker: string | null;
  selectedHand: string | null;
  setSelectedAttacker: (uid: string | null) => void;
  setSelectedAttackerSlot: (slot: number | null) => void;
  setSelectedHand: (uid: string | null) => void;
  setInspected: React.Dispatch<
    React.SetStateAction<{ card: CardInstance; owner: 'player1' | 'player2' } | null>
  >;
  setTargetingLine: React.Dispatch<
    React.SetStateAction<{ startX: number; startY: number; endX: number; endY: number } | null>
  >;
  setDragCardUid: (uid: string | null) => void;
  setDropZoneActive: (active: boolean) => void;
  dragCardUid: string | null;
  doPlayCard: (uid: string) => boolean;
  showDamageNumber: (value: number, x: number, y: number, type?: 'damage' | 'heal' | 'buff') => void;
  showStatChange: (value: string, x: number, y: number, className: string) => void;
  setScreenShake: (shake: boolean) => void;
  setExplosionFlash: (flash: boolean) => void;
  setDyingCards: React.Dispatch<React.SetStateAction<Set<string>>>;
  setCardDeathEffects: React.Dispatch<
    React.SetStateAction<Map<string, 'fire' | 'poison' | 'ice'>>
  >;
  addMessage: (type: GameMessageType, text: string, emoji: string, duration?: number) => void;
  triggerCombatAnims: (attackerUid?: string, defenderUid?: string) => void;
  setShowAttackNotification: (show: boolean) => void;
  clearMessages: () => void;
  cardRefsMap: React.MutableRefObject<Map<string, HTMLDivElement>>;
  handCardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  setPlayAnim: React.Dispatch<React.SetStateAction<CardAnim>>;
  setDeathAnim: React.Dispatch<React.SetStateAction<CardAnim>>;
  seenStoryEventsRef: React.MutableRefObject<Set<number>>;
  emittedTutorialHintsRef: React.MutableRefObject<Set<string>>;
  turnStartedAtRef: React.MutableRefObject<number>;
  aiTurnStartedAtRef: React.MutableRefObject<number | null>;
  prevFieldRef: React.MutableRefObject<{ p1: string[]; p2: string[] }>;
  prevTurnRef: React.MutableRefObject<{
    turnNumber: number;
    currentTurn: GameState['currentTurn'];
  }>;
  createInitialGameState: () => GameState;
  setHasPlayedNonLandCardThisTurn: (value: boolean) => void;
  setShowTurnTransition: (show: boolean) => void;
  mountedRef: React.MutableRefObject<boolean>;
}

interface UseGameActionsReturn {
  handleDragStart: (e: React.DragEvent, uid: string) => void;
  handleDragEnd: () => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => void;
  clickHand: (uid: string) => void;
  clickMyCreature: (uid: string) => void;
  clickEnemyCreature: (uid: string) => void;
  clickAttackHero: () => void;
  clickEndTurn: () => void;
  restart: () => void;
}

function getCardElement(card: CardInstance): 'fire' | 'ice' | 'poison' | 'explosion' | 'neutral' {
  const id = card.data.id;
  if (id.includes('vzryv') || id.includes('bomb') || id.includes('posledniy_argument'))
    return 'explosion';
  if (card.data.color === 'red') return 'fire';
  if (card.data.color === 'blue' || card.data.keywords?.includes('hexproof')) return 'ice';
  if (card.data.color === 'black' || card.data.keywords?.includes('deathtouch')) return 'poison';
  return 'neutral';
}

/**
 * Хук для обработки игровых действий
 */
export function useGameActions(props: UseGameActionsProps): UseGameActionsReturn {
  const {
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
    createInitialGameState,
    setHasPlayedNonLandCardThisTurn,
    setShowTurnTransition,
    mountedRef,
  } = props;

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, uid: string) => {
      setDragCardUid(uid);
      setSelectedHand(null);
      setInspected(null);
      e.dataTransfer.effectAllowed = 'move';
      const el = e.currentTarget as HTMLDivElement;
      e.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2);
    },
    [setDragCardUid, setSelectedHand, setInspected]
  );

  const handleDragEnd = useCallback(() => {
    setDragCardUid(null);
    setDropZoneActive(false);
  }, [setDragCardUid, setDropZoneActive]);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!dragCardUid) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropZoneActive(true);
    },
    [dragCardUid, setDropZoneActive]
  );

  const handleDragLeave = useCallback(() => {
    setDropZoneActive(false);
  }, [setDropZoneActive]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDropZoneActive(false);
      if (dragCardUid) {
        doPlayCard(dragCardUid);
        setDragCardUid(null);
      }
    },
    [setDropZoneActive, dragCardUid, doPlayCard, setDragCardUid]
  );

  // Click handlers
  const clickHand = useCallback(
    (uid: string) => {
      const card = me.hand.find((c) => c.uid === uid);
      if (!card) return;
      setSelectedAttacker(null);
      setSelectedAttackerSlot(null);
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
    },
    [me.hand, myTurn, gs.gameOver, selectedHand, doPlayCard, setSelectedAttacker, setSelectedAttackerSlot, setInspected, setSelectedHand]
  );

  const clickMyCreature = useCallback(
    (uid: string) => {
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
    },
    [
      me.field,
      myTurn,
      gs.gameOver,
      selectedAttacker,
      setSelectedAttacker,
      setSelectedAttackerSlot,
      setSelectedHand,
      setInspected,
      setTargetingLine,
      cardRefsMap,
    ]
  );

  const clickEnemyCreature = useCallback(
    (uid: string) => {
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
            showStatChange(
              `-${atk}`,
              rect.left + rect.width / 2 + 20,
              rect.top + rect.height / 2,
              'health-loss'
            );
          }
          const attackerElement = getCardElement(attackerCard);
          if (attackerElement === 'explosion') {
            setScreenShake(true);
            setExplosionFlash(true);
            setTimeout(() => {
              setScreenShake(false);
              setExplosionFlash(false);
            }, 400);
          }
          const defenderHealth = card.currentHealth;
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
    },
    [
      enemy.field,
      selectedAttacker,
      myTurn,
      gs.gameOver,
      me.field,
      gs,
      me,
      enemy,
      attackCreature,
      getEffectiveAttack,
      cardRefsMap,
      showDamageNumber,
      showStatChange,
      setScreenShake,
      setExplosionFlash,
      setDyingCards,
      setCardDeathEffects,
      setGs,
      addMessage,
      triggerCombatAnims,
      setSelectedAttacker,
      setSelectedAttackerSlot,
      setInspected,
      setTargetingLine,
      setSelectedHand,
    ]
  );

  const clickAttackHero = useCallback(() => {
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
  }, [
    myTurn,
    selectedAttacker,
    gs.gameOver,
    me.field,
    gs,
    attackPlayer,
    getEffectiveAttack,
    me,
    enemy,
    showDamageNumber,
    setScreenShake,
    setExplosionFlash,
    setGs,
    addMessage,
    triggerCombatAnims,
    setSelectedAttacker,
    setSelectedAttackerSlot,
    setInspected,
    setTargetingLine,
  ]);

  const clickEndTurn = useCallback(() => {
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
    setSelectedAttackerSlot(null);
    setInspected(null);
    setShowAttackNotification(false);
  }, [
    myTurn,
    gs.gameOver,
    mode,
    setGs,
    setShowTurnTransition,
    mountedRef,
    setSelectedHand,
    setSelectedAttacker,
    setSelectedAttackerSlot,
    setInspected,
    setShowAttackNotification,
  ]);

  const restart = useCallback(() => {
    const initialState = createInitialGameState();
    setGs(initialState);
    setHasPlayedNonLandCardThisTurn(false);
    prevTurnRef.current = {
      turnNumber: initialState.turnNumber,
      currentTurn: initialState.currentTurn,
    };
    setSelectedHand(null);
    setSelectedAttacker(null);
    setSelectedAttackerSlot(null);
    setInspected(null);
    setPlayAnim(null);
    setDeathAnim(null);
    setDyingCards(new Set<string>());
    setCardDeathEffects(new Map<string, 'fire' | 'poison' | 'ice'>());
    seenStoryEventsRef.current = new Set();
    prevFieldRef.current = { p1: [], p2: [] };
    cardRefsMap.current.clear();
    handCardRefs.current.clear();
    clearMessages();
    emittedTutorialHintsRef.current = new Set();
    turnStartedAtRef.current = Date.now();
    aiTurnStartedAtRef.current = null;
  }, [
    setGs,
    createInitialGameState,
    setHasPlayedNonLandCardThisTurn,
    prevTurnRef,
    setSelectedHand,
    setSelectedAttacker,
    setSelectedAttackerSlot,
    setInspected,
    setPlayAnim,
    setDeathAnim,
    setDyingCards,
    setCardDeathEffects,
    seenStoryEventsRef,
    prevFieldRef,
    cardRefsMap,
    handCardRefs,
    clearMessages,
    emittedTutorialHintsRef,
    turnStartedAtRef,
    aiTurnStartedAtRef,
  ]);

  return {
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
  };
}
