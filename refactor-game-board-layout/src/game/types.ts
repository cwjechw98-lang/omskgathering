export type CardColor = 'white' | 'blue' | 'black' | 'red' | 'green' | 'colorless';
export type CardType = 'creature' | 'spell' | 'land' | 'enchantment';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic';
export type Keyword = 'haste' | 'defender' | 'flying' | 'trample' | 'lifelink' | 'deathtouch' | 'vigilance' | 'first_strike' | 'hexproof' | 'unblockable';

export interface CardData {
  id: string;
  name: string;
  emoji: string;
  type: CardType;
  color: CardColor;
  cost: number;
  attack: number;
  health: number;
  description: string;
  flavor?: string;
  rarity: Rarity;
  keywords: Keyword[];
}

export interface CardInstance {
  uid: string;
  data: CardData;
  currentHealth: number;
  maxHealth: number;
  keywords: Keyword[];
  summoningSickness: boolean;
  hasAttacked: boolean;
  frozen: number;
  counters: Record<string, number>;
}

export interface PlayerState {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  hand: CardInstance[];
  deck: CardInstance[];
  field: CardInstance[];
  graveyard: CardInstance[];
  enchantments: CardInstance[];
  landsPlayed: number;
  maxLandsPerTurn: number;
}

export interface GameState {
  player1: PlayerState;
  player2: PlayerState;
  currentTurn: 'player1' | 'player2';
  turnNumber: number;
  log: string[];
  gameOver: boolean;
  winner: 'player1' | 'player2' | null;
}
