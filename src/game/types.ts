import { CardData, Keyword } from '../data/cards';

export interface CardInstance {
  uid: string;
  data: CardData;
  currentAttack: number;
  currentHealth: number;
  maxHealth: number;
  canAttack: boolean;
  frozen: number;
  hasAttacked: boolean;
  summoningSickness: boolean;
  buffAttack: number;
  buffHealth: number;
  tempBuffAttack: number;
  tempBuffHealth: number;
  keywords: Keyword[];
}

export interface PlayerState {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  hand: CardInstance[];
  field: CardInstance[];
  deck: CardInstance[];
  graveyard: CardInstance[];
  enchantments: CardInstance[];
  landsPlayed: number;
  maxLandsPerTurn: number;
}

export interface DiceRoll {
  sides: number;
  result: number;
  reason: string;
}

export interface GameState {
  player1: PlayerState;
  player2: PlayerState;
  currentTurn: 'player1' | 'player2';
  turnNumber: number;
  phase: 'main' | 'combat' | 'main2' | 'end';
  gameOver: boolean;
  winner: 'player1' | 'player2' | null;
  log: string[];
  selectedCard: string | null;
  attackingCards: string[];
  blockingAssignments: Record<string, string>;
  cantAttackNextTurn: boolean;
  lastDiceRoll: DiceRoll | null;
  aiComment: string | null;
}

export type GameAction =
  | { type: 'PLAY_CARD'; cardUid: string }
  | { type: 'ATTACK_PLAYER'; cardUid: string }
  | { type: 'ATTACK_CREATURE'; attackerUid: string; defenderUid: string }
  | { type: 'END_TURN' }
  | { type: 'SELECT_CARD'; cardUid: string | null }
  | { type: 'DRAW_CARD' };
