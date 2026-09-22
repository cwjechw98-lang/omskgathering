import { CardColor, CardData, Keyword } from '../data/cards';

/**
 * Мана по цветам. `any` — не от земель, а от существ и чар (Писинер, Святой Граф):
 * она платит за что угодно, включая цветные пипсы.
 */
export interface ManaPool {
  white: number;
  blue: number;
  black: number;
  red: number;
  green: number;
  colorless: number;
  any: number;
}

export interface CardInstance {
  uid: string;
  data: CardData;
  currentAttack: number;
  currentHealth: number;
  maxHealth: number;
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
  /**
   * Всего доступной маны сейчас — сумма пула. Оставлено числом, потому что так его
   * читает интерфейс и дешёвые проверки. Менять его можно только вместе с `manaPool`,
   * иначе два источника правды разойдутся.
   */
  mana: number;
  /** Из чего именно состоит доступная мана. Оплата считается только по нему. */
  manaPool: ManaPool;
  /** Разыгранные земли по цветам: из них собирается пул в начале хода. */
  landsByColor: Record<CardColor, number>;
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
  lastDiceRoll: DiceRoll | null;
  aiComment: string | null;
  // Mulligan state
  mulliganPhase: boolean;
  mulliganCount: number;
  player1Keeping: boolean | null;
  player2Keeping: boolean | null;
}
