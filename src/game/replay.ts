/**
 * Replay action types
 */
export type ReplayActionType =
  | 'PLAY_CARD'
  | 'ATTACK_CREATURE'
  | 'ATTACK_PLAYER'
  | 'END_TURN'
  | 'DRAW_CARD'
  | 'PLAY_LAND';

/**
 * Replay action structure
 */
export interface ReplayAction {
  type: ReplayActionType;
  player: 'player1' | 'player2';
  cardId?: string; // uid карты
  sourceId?: string; // uid атакующего
  targetId?: string; // uid цели
  turn: number; // номер хода
}

/**
 * Replay log structure
 */
export interface ReplayLog {
  actions: ReplayAction[];
  timestamp: number;
  version: string;
}

/**
 * Record a replay action
 */
export function recordAction(action: ReplayAction, log: ReplayAction[]): ReplayAction[] {
  return [...log, action];
}

/**
 * Create a new replay log
 */
export function createReplayLog(): ReplayLog {
  return {
    actions: [],
    timestamp: Date.now(),
    version: '1.0.0',
  };
}

/**
 * Serialize replay to JSON
 */
export function serializeReplay(log: ReplayLog): string {
  return JSON.stringify(log, null, 2);
}

/**
 * Deserialize replay from JSON
 */
export function deserializeReplay(json: string): ReplayLog {
  return JSON.parse(json);
}

/**
 * Get action description for logging
 */
export function getActionDescription(action: ReplayAction): string {
  switch (action.type) {
    case 'PLAY_CARD':
      return `Игрок ${action.player} разыграл карту ${action.cardId}`;
    case 'ATTACK_CREATURE':
      return `Игрок ${action.player} атаковал существо ${action.targetId} существом ${action.sourceId}`;
    case 'ATTACK_PLAYER':
      return `Игрок ${action.player} атаковал игрока существом ${action.sourceId}`;
    case 'END_TURN':
      return `Игрок ${action.player} завершил ход`;
    case 'DRAW_CARD':
      return `Игрок ${action.player} взял карту`;
    case 'PLAY_LAND':
      return `Игрок ${action.player} разыграл землю`;
    default:
      return `Неизвестное действие: ${action.type}`;
  }
}
