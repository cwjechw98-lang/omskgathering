/**
 * useEventTimeline — React-хук для интеграции EventTimeline
 *
 * Предоставляет:
 * 1. Реактивный доступ к текущим состояниям анимаций
 * 2. Колбэки для спавна эффектов (спарки, числа урона)
 * 3. Синхронизацию с игровым движком без изменения его логики
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  gameTimeline,
  GameEvent,
  AttackEvent,
  DamageEvent,
  HealEvent,
  DeathEvent,
  PlayCardEvent,
  LandPlayedEvent,
  GameEvents,
  sleep,
} from '../game/eventTimeline';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */

export interface TimelineCallbacks {
  onAttackAnim?: (attackerUid: string, defenderUid?: string, durationMs?: number) => void;
  onDamageAnim?: (defenderUid: string, durationMs?: number) => void;
  onDamageNumber?: (value: number, x: number, y: number, type: 'damage' | 'heal') => void;
  onSparks?: (x: number, y: number, color?: string) => void;
  onDeathAnim?: (cardName: string, emoji: string, color: string) => void;
  onAiMessage?: (text: string, ttl?: number) => void;
  onPlayCardAnim?: (cardName: string, emoji: string, color: string) => void;
  onTurnBanner?: (who: 'player1' | 'player2') => void;
}

/* ══════════════════════════════════════════════════════
   HOOK
   ══════════════════════════════════════════════════════ */

export function useEventTimeline(callbacks: TimelineCallbacks) {
  const cbRef = useRef<TimelineCallbacks>(callbacks);

  useEffect(() => {
    cbRef.current = callbacks;
  });

  useEffect(() => {
    /* ── PLAY_CARD handler ── */
    const handlePlayCard = async (event: GameEvent) => {
      const ev = event as PlayCardEvent;
      if (ev.who !== 'player2') return;
      cbRef.current.onPlayCardAnim?.(ev.cardName, ev.cardEmoji, ev.cardColor);
      await sleep(ev.duration ?? 380);
    };

    /* ── LAND_PLAYED handler ── */
    const handleLandPlayed = async (event: GameEvent) => {
      const ev = event as LandPlayedEvent;
      if (ev.who === 'player2') {
        cbRef.current.onAiMessage?.(
          `${ev.cardEmoji} разыграл землю — ${ev.cardName}`,
          3500
        );
      }
      await sleep(ev.duration ?? 280);
    };

    /* ── ATTACK handler ── */
    const handleAttack = async (event: GameEvent) => {
      const ev = event as AttackEvent;
      cbRef.current.onAttackAnim?.(ev.attackerUid, ev.defenderUid, ev.duration);
      const sparkDelay = Math.round((ev.duration ?? 520) * 0.4);
      await sleep(sparkDelay);
      await sleep((ev.duration ?? 520) - sparkDelay);
    };

    /* ── DAMAGE handler ── */
    const handleDamage = async (event: GameEvent) => {
      const ev = event as DamageEvent;
      if (ev.x !== undefined && ev.y !== undefined) {
        cbRef.current.onDamageNumber?.(ev.amount, ev.x, ev.y, 'damage');
        cbRef.current.onSparks?.(ev.x, ev.y, '#f87171');
      }
      if (ev.targetUid) {
        cbRef.current.onDamageAnim?.(ev.targetUid, ev.duration);
      }
      await sleep(ev.duration ?? 280);
    };

    /* ── HEAL handler ── */
    const handleHeal = async (event: GameEvent) => {
      const ev = event as HealEvent;
      if (ev.x !== undefined && ev.y !== undefined) {
        cbRef.current.onDamageNumber?.(ev.amount, ev.x, ev.y, 'heal');
        cbRef.current.onSparks?.(ev.x, ev.y, '#4ade80');
      }
      await sleep(ev.duration ?? 280);
    };

    /* ── DEATH handler ── */
    const handleDeath = async (event: GameEvent) => {
      const ev = event as DeathEvent;
      cbRef.current.onDeathAnim?.(ev.cardName, ev.cardEmoji, ev.cardColor);
      await sleep(ev.duration ?? 400);
    };

    gameTimeline.on('PLAY_CARD',   handlePlayCard);
    gameTimeline.on('LAND_PLAYED', handleLandPlayed);
    gameTimeline.on('ATTACK',      handleAttack);
    gameTimeline.on('DAMAGE',      handleDamage);
    gameTimeline.on('HEAL',        handleHeal);
    gameTimeline.on('DEATH',       handleDeath);

    return () => {
      gameTimeline.off('PLAY_CARD',   handlePlayCard);
      gameTimeline.off('LAND_PLAYED', handleLandPlayed);
      gameTimeline.off('ATTACK',      handleAttack);
      gameTimeline.off('DAMAGE',      handleDamage);
      gameTimeline.off('HEAL',        handleHeal);
      gameTimeline.off('DEATH',       handleDeath);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── AI Turn dispatcher ── */
  const dispatchAITurn = useCallback((actions: {
    played?: Array<{
      cardId: string; cardUid: string; cardName: string;
      cardEmoji: string; cardColor: string;
    }>;
    attacks?: Array<{
      attackerUid: string; attackerName: string; attackerEmoji: string;
      damage: number; defenderUid?: string; defenderName?: string;
      defenderX?: number; defenderY?: number; heroX?: number; heroY?: number;
      died?: boolean; defenderEmoji?: string; defenderColor?: string;
    }>;
    heals?: Array<{ targetName: string; amount: number; x?: number; y?: number }>;
  }) => {
    // Розыгрыш карт ИИ
    for (const card of (actions.played ?? [])) {
      gameTimeline.enqueue(GameEvents.playCard(
        card.cardId, card.cardUid, card.cardName,
        card.cardEmoji, card.cardColor, 'player2'
      ));
    }

    // Атаки ИИ — строгий порядок: attack → damage → death
    for (const atk of (actions.attacks ?? [])) {
      const isHero = !atk.defenderUid;
      const x = isHero ? atk.heroX : atk.defenderX;
      const y = isHero ? atk.heroY : atk.defenderY;

      gameTimeline.enqueue(GameEvents.attack(
        atk.attackerUid, atk.attackerName, atk.attackerEmoji,
        atk.damage, 'player2', atk.defenderUid, atk.defenderName
      ));

      gameTimeline.enqueue(GameEvents.damage(
        isHero ? 'Герой' : (atk.defenderName ?? '?'),
        atk.damage, 'player1',
        atk.defenderUid, x, y
      ));

      // DEATH только ПОСЛЕ урона — гарантируется очередью
      if (atk.died && atk.defenderUid && atk.defenderEmoji && atk.defenderColor) {
        gameTimeline.enqueue(GameEvents.death(
          atk.defenderUid, atk.defenderName ?? '?',
          atk.defenderEmoji, atk.defenderColor, 'player1'
        ));
      }
    }

    // Лечение
    for (const heal of (actions.heals ?? [])) {
      gameTimeline.enqueue(GameEvents.heal(
        heal.targetName, heal.amount, 'player2', heal.x, heal.y
      ));
    }
  }, []);

  /* ── Player Action dispatcher ── */
  const dispatchPlayerAction = useCallback((action: {
    type: 'play' | 'attack' | 'land';
    cardName?: string; cardEmoji?: string; cardColor?: string;
    cardUid?: string; cardId?: string;
    attackerUid?: string; attackerName?: string; attackerEmoji?: string;
    damage?: number;
    defenderUid?: string; defenderName?: string;
    defenderX?: number; defenderY?: number;
    heroX?: number; heroY?: number;
    died?: boolean; defenderEmoji?: string; defenderColor?: string;
    healAmount?: number; healX?: number; healY?: number;
  }) => {
    if (action.type === 'land' && action.cardName) {
      gameTimeline.enqueue(GameEvents.landPlayed(
        action.cardName, action.cardEmoji ?? '🏔️', 'player1'
      ));
    }

    if (action.type === 'play' && action.cardName && action.cardUid && action.cardId) {
      gameTimeline.enqueue(GameEvents.playCard(
        action.cardId, action.cardUid, action.cardName,
        action.cardEmoji ?? '🃏', action.cardColor ?? 'colorless', 'player1'
      ));
    }

    if (action.type === 'attack' && action.attackerUid && action.damage !== undefined) {
      const isHero = !action.defenderUid;
      const x = isHero ? action.heroX : action.defenderX;
      const y = isHero ? action.heroY : action.defenderY;

      gameTimeline.enqueue(GameEvents.attack(
        action.attackerUid, action.attackerName ?? '?',
        action.attackerEmoji ?? '⚔️', action.damage, 'player1',
        action.defenderUid, action.defenderName
      ));

      gameTimeline.enqueue(GameEvents.damage(
        isHero ? 'Хранитель' : (action.defenderName ?? '?'),
        action.damage, 'player2',
        action.defenderUid, x, y
      ));

      if (action.died && action.defenderUid && action.defenderEmoji && action.defenderColor) {
        gameTimeline.enqueue(GameEvents.death(
          action.defenderUid, action.defenderName ?? '?',
          action.defenderEmoji, action.defenderColor, 'player2'
        ));
      }

      if (action.healAmount && action.healX !== undefined && action.healY !== undefined) {
        gameTimeline.enqueue(GameEvents.heal(
          'Вы', action.healAmount, 'player1',
          action.healX, action.healY
        ));
      }
    }
  }, []);

  return {
    dispatchAITurn,
    dispatchPlayerAction,
    clearTimeline: () => gameTimeline.clear(),
    queueSize: gameTimeline.queueSize,
    isPlaying: gameTimeline.playing,
  };
}
