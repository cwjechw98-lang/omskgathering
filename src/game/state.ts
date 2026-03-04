import { CardData, createDeck } from '../data/cards';
import { CardInstance, PlayerState } from './types';

let uidCounter = 0;
export function generateUid(): string {
  return `card_${Date.now()}_${uidCounter++}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createCardInstance(data: CardData): CardInstance {
  return {
    uid: generateUid(),
    data: { ...data },
    currentAttack: data.attack ?? 0,
    currentHealth: data.health ?? 0,
    maxHealth: data.health ?? 0,
    frozen: 0,
    hasAttacked: false,
    summoningSickness: true,
    buffAttack: 0,
    buffHealth: 0,
    tempBuffAttack: 0,
    tempBuffHealth: 0,
    keywords: [...(data.keywords || [])],
  };
}

export function createPlayerState(): PlayerState {
  const deckData = createDeck();
  const deck = deckData.map(createCardInstance);
  const hand = deck.splice(0, 5);

  return {
    health: 30,
    maxHealth: 30,
    mana: 0,
    maxMana: 0,
    hand,
    field: [],
    deck,
    graveyard: [],
    enchantments: [],
    landsPlayed: 0,
    maxLandsPerTurn: 1,
  };
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}
