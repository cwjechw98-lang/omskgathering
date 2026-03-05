/**
 * EVENT TIMELINE — Система синхронизации игровых событий
 *
 * Цель: устранить гонки событий и стабилизировать порядок эффектов.
 *
 * Архитектура:
 * ┌────────────────────────────────────────────────────────────────┐
 * │  GameEvent (typed payload)                                     │
 * │     ↓                                                          │
 * │  EventTimeline.enqueue()   → pushes to internal queue         │
 * │     ↓                                                          │
 * │  EventTimeline.flush()     → processes queue sequentially     │
 * │     ↓ (await each)                                             │
 * │  EventHandler              → returns Promise<void>            │
 * │     ↓                                                          │
 * │  React state updates       → UI updates after each event      │
 * └────────────────────────────────────────────────────────────────┘
 *
 * Порядок событий гарантирован: следующее событие
 * НЕ начинается до завершения предыдущего Promise.
 *
 * Игровая механика НЕ изменяется — Timeline только синхронизирует UI.
 */

/* ═══════════════════════════════════════════════════════════════════
   EVENT TYPES
   ═══════════════════════════════════════════════════════════════════ */

export type GameEventType =
  | 'PLAY_CARD'
  | 'DRAW_CARD'
  | 'ATTACK'
  | 'DAMAGE'
  | 'HEAL'
  | 'DEATH'
  | 'TRIGGER_EFFECT'
  | 'TURN_START'
  | 'TURN_END'
  | 'LAND_PLAYED'
  | 'SYSTEM';

export interface BaseGameEvent {
  id: number;
  type: GameEventType;
  /** Временная метка создания (Date.now()) */
  ts: number;
  /** Необязательная задержка перед исполнением (мс) */
  delay?: number;
  /** Продолжительность анимации события (мс) */
  duration?: number;
}

export interface PlayCardEvent extends BaseGameEvent {
  type: 'PLAY_CARD';
  cardId: string;
  cardUid: string;
  cardName: string;
  cardEmoji: string;
  cardColor: string;
  who: 'player1' | 'player2';
}

export interface DrawCardEvent extends BaseGameEvent {
  type: 'DRAW_CARD';
  cardName: string;
  cardEmoji: string;
  who: 'player1' | 'player2';
}

export interface AttackEvent extends BaseGameEvent {
  type: 'ATTACK';
  attackerUid: string;
  attackerName: string;
  attackerEmoji: string;
  defenderUid?: string;   // undefined → атака героя
  defenderName?: string;
  targetType: 'creature' | 'hero';
  damage: number;
  who: 'player1' | 'player2';
}

export interface DamageEvent extends BaseGameEvent {
  type: 'DAMAGE';
  targetUid?: string;     // undefined → герой
  targetName: string;
  amount: number;
  /** Координаты для спавна числа урона */
  x?: number;
  y?: number;
  who: 'player1' | 'player2';  // кто получает урон
}

export interface HealEvent extends BaseGameEvent {
  type: 'HEAL';
  targetName: string;
  amount: number;
  x?: number;
  y?: number;
  who: 'player1' | 'player2';
}

export interface DeathEvent extends BaseGameEvent {
  type: 'DEATH';
  cardUid: string;
  cardName: string;
  cardEmoji: string;
  cardColor: string;
  who: 'player1' | 'player2';
}

export interface TriggerEffectEvent extends BaseGameEvent {
  type: 'TRIGGER_EFFECT';
  effectName: string;
  description: string;
  who: 'player1' | 'player2';
}

export interface TurnStartEvent extends BaseGameEvent {
  type: 'TURN_START';
  who: 'player1' | 'player2';
  turnNumber: number;
}

export interface TurnEndEvent extends BaseGameEvent {
  type: 'TURN_END';
  who: 'player1' | 'player2';
  turnNumber: number;
}

export interface LandPlayedEvent extends BaseGameEvent {
  type: 'LAND_PLAYED';
  cardName: string;
  cardEmoji: string;
  who: 'player1' | 'player2';
}

export interface SystemEvent extends BaseGameEvent {
  type: 'SYSTEM';
  message: string;
}

export type GameEvent =
  | PlayCardEvent
  | DrawCardEvent
  | AttackEvent
  | DamageEvent
  | HealEvent
  | DeathEvent
  | TriggerEffectEvent
  | TurnStartEvent
  | TurnEndEvent
  | LandPlayedEvent
  | SystemEvent;

/* ═══════════════════════════════════════════════════════════════════
   EVENT HANDLER TYPE
   Каждый обработчик получает событие и возвращает Promise<void>.
   Timeline ждёт завершения Promise перед следующим событием.
   ═══════════════════════════════════════════════════════════════════ */

export type EventHandler = (event: GameEvent) => Promise<void>;

/* ═══════════════════════════════════════════════════════════════════
   TIMELINE CLASS
   ═══════════════════════════════════════════════════════════════════ */

let _eventIdCounter = 0;

export class EventTimeline {
  private queue: GameEvent[] = [];
  private isPlaying = false;
  private handlers: Map<GameEventType, EventHandler[]> = new Map();
  private globalHandlers: EventHandler[] = [];

  /** Подписаться на конкретный тип события */
  on<T extends GameEvent>(type: T['type'], handler: (event: T) => Promise<void>): void {
    const existing = this.handlers.get(type) ?? [];
    this.handlers.set(type, [...existing, handler as EventHandler]);
  }

  /** Глобальный обработчик — вызывается для ЛЮБОГО события */
  onAny(handler: EventHandler): void {
    this.globalHandlers = [...this.globalHandlers, handler];
  }

  /** Снять обработчик */
  off(type: GameEventType, handler: EventHandler): void {
    const existing = this.handlers.get(type) ?? [];
    this.handlers.set(type, existing.filter(h => h !== handler));
  }

  /** Очистить все обработчики */
  offAll(): void {
    this.handlers.clear();
    this.globalHandlers = [];
  }

  /**
   * Добавить событие в очередь.
   * Если timeline не играет — автоматически запускает flush().
   */
  enqueue(event: Omit<GameEvent, 'id' | 'ts'>): void {
    const fullEvent: GameEvent = {
      ...event,
      id: ++_eventIdCounter,
      ts: Date.now(),
    } as GameEvent;

    this.queue.push(fullEvent);

    // Автоматически запускаем processing если не запущен
    if (!this.isPlaying) {
      this.flush();
    }
  }

  /**
   * Добавить несколько событий как «батч» — они будут обработаны по порядку.
   */
  enqueueBatch(events: Omit<GameEvent, 'id' | 'ts'>[]): void {
    events.forEach(e => {
      this.queue.push({
        ...e,
        id: ++_eventIdCounter,
        ts: Date.now(),
      } as GameEvent);
    });

    if (!this.isPlaying) {
      this.flush();
    }
  }

  /**
   * Обработать очередь последовательно.
   * Каждое событие ждёт завершения предыдущего.
   *
   * Порядок для каждого события:
   * 1. Опциональная задержка (event.delay)
   * 2. Вызов всех globalHandlers (параллельно)
   * 3. Вызов type-specific handlers (параллельно внутри типа)
   * 4. Опциональная пауза после анимации (event.duration)
   */
  private async flush(): Promise<void> {
    if (this.isPlaying) return;
    this.isPlaying = true;

    while (this.queue.length > 0) {
      const event = this.queue.shift()!;

      try {
        // 1. Предварительная задержка
        if (event.delay && event.delay > 0) {
          await sleep(event.delay);
        }

        // 2. Глобальные обработчики (все параллельно)
        if (this.globalHandlers.length > 0) {
          await Promise.all(this.globalHandlers.map(h => safeCall(h, event)));
        }

        // 3. Type-specific обработчики (параллельно внутри типа)
        const typeHandlers = this.handlers.get(event.type) ?? [];
        if (typeHandlers.length > 0) {
          await Promise.all(typeHandlers.map(h => safeCall(h, event)));
        }

        // 4. Пауза после анимации (если duration задан и нет handlers)
        const totalHandlers = this.globalHandlers.length + typeHandlers.length;
        if (event.duration && event.duration > 0 && totalHandlers === 0) {
          await sleep(event.duration);
        }

      } catch (err) {
        // Ошибки в handler не должны ломать всю очередь
        console.warn('[EventTimeline] Error in handler for', event.type, err);
      }
    }

    this.isPlaying = false;
  }

  /** Очистить очередь (например, при рестарте игры) */
  clear(): void {
    this.queue = [];
    this.isPlaying = false;
  }

  /** Текущий размер очереди */
  get queueSize(): number {
    return this.queue.length;
  }

  /** Идёт ли сейчас воспроизведение */
  get playing(): boolean {
    return this.isPlaying;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

/** Ждать N миллисекунд */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Безопасный вызов handler — перехватывает ошибки */
async function safeCall(handler: EventHandler, event: GameEvent): Promise<void> {
  try {
    await handler(event);
  } catch (err) {
    console.warn('[EventTimeline] safeCall error:', err);
  }
}

/** Хелпер: Promise который резолвится через N мс (для анимаций) */
export function animationDelay(ms: number): Promise<void> {
  return sleep(ms);
}

/* ═══════════════════════════════════════════════════════════════════
   SINGLETON TIMELINE
   Одна очередь на всё приложение.
   ═══════════════════════════════════════════════════════════════════ */

export const gameTimeline = new EventTimeline();

/* ═══════════════════════════════════════════════════════════════════
   FACTORY FUNCTIONS — удобные хелперы для создания событий
   ═══════════════════════════════════════════════════════════════════ */

export const GameEvents = {
  playCard: (
    cardId: string, cardUid: string, cardName: string,
    cardEmoji: string, cardColor: string, who: 'player1' | 'player2',
    delay = 0
  ): Omit<PlayCardEvent, 'id' | 'ts'> => ({
    type: 'PLAY_CARD', cardId, cardUid, cardName, cardEmoji, cardColor, who,
    delay, duration: 380,
  }),

  drawCard: (
    cardName: string, cardEmoji: string, who: 'player1' | 'player2',
    delay = 0
  ): Omit<DrawCardEvent, 'id' | 'ts'> => ({
    type: 'DRAW_CARD', cardName, cardEmoji, who,
    delay, duration: 200,
  }),

  attack: (
    attackerUid: string, attackerName: string, attackerEmoji: string,
    damage: number, who: 'player1' | 'player2',
    defenderUid?: string, defenderName?: string,
    delay = 0
  ): Omit<AttackEvent, 'id' | 'ts'> => ({
    type: 'ATTACK',
    attackerUid, attackerName, attackerEmoji,
    defenderUid, defenderName,
    targetType: defenderUid ? 'creature' : 'hero',
    damage, who,
    delay, duration: 520,
  }),

  damage: (
    targetName: string, amount: number, who: 'player1' | 'player2',
    targetUid?: string, x?: number, y?: number, delay = 80
  ): Omit<DamageEvent, 'id' | 'ts'> => ({
    type: 'DAMAGE', targetName, amount, who, targetUid, x, y,
    delay, duration: 280,
  }),

  heal: (
    targetName: string, amount: number, who: 'player1' | 'player2',
    x?: number, y?: number, delay = 0
  ): Omit<HealEvent, 'id' | 'ts'> => ({
    type: 'HEAL', targetName, amount, who, x, y,
    delay, duration: 280,
  }),

  death: (
    cardUid: string, cardName: string, cardEmoji: string,
    cardColor: string, who: 'player1' | 'player2',
    delay = 150
  ): Omit<DeathEvent, 'id' | 'ts'> => ({
    type: 'DEATH', cardUid, cardName, cardEmoji, cardColor, who,
    delay, duration: 400,
  }),

  triggerEffect: (
    effectName: string, description: string, who: 'player1' | 'player2',
    delay = 0
  ): Omit<TriggerEffectEvent, 'id' | 'ts'> => ({
    type: 'TRIGGER_EFFECT', effectName, description, who,
    delay, duration: 300,
  }),

  turnStart: (who: 'player1' | 'player2', turnNumber: number): Omit<TurnStartEvent, 'id' | 'ts'> => ({
    type: 'TURN_START', who, turnNumber, duration: 1400,
  }),

  turnEnd: (who: 'player1' | 'player2', turnNumber: number): Omit<TurnEndEvent, 'id' | 'ts'> => ({
    type: 'TURN_END', who, turnNumber, duration: 200,
  }),

  landPlayed: (
    cardName: string, cardEmoji: string, who: 'player1' | 'player2',
    delay = 0
  ): Omit<LandPlayedEvent, 'id' | 'ts'> => ({
    type: 'LAND_PLAYED', cardName, cardEmoji, who,
    delay, duration: 280,
  }),

  system: (message: string, delay = 0): Omit<SystemEvent, 'id' | 'ts'> => ({
    type: 'SYSTEM', message, delay, duration: 0,
  }),
};
