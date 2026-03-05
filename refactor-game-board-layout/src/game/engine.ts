import { GameState, PlayerState, CardInstance, CardData } from './types';
import { ALL_CARDS } from './cards';

let uidCounter = 0;

function makeUid(): string {
  return `card_${++uidCounter}_${Date.now().toString(36)}`;
}

function createCardInstance(data: CardData): CardInstance {
  return {
    uid: makeUid(),
    data,
    currentHealth: data.health,
    maxHealth: data.health,
    keywords: [...data.keywords],
    summoningSickness: !data.keywords.includes('haste'),
    hasAttacked: false,
    frozen: 0,
    counters: {},
  };
}

function buildDeck(): CardInstance[] {
  const deckCards: CardData[] = [];
  const lands = ALL_CARDS.filter(c => c.type === 'land');
  const creatures = ALL_CARDS.filter(c => c.type === 'creature');
  const spells = ALL_CARDS.filter(c => c.type === 'spell');
  const enchantments = ALL_CARDS.filter(c => c.type === 'enchantment');

  // Add 8 lands
  for (let i = 0; i < 8; i++) {
    deckCards.push(lands[i % lands.length]);
  }
  // Add creatures (2 copies each of cheaper, 1 each of expensive)
  for (const c of creatures) {
    const copies = c.cost <= 3 ? 2 : 1;
    for (let i = 0; i < copies; i++) deckCards.push(c);
  }
  // Add 2 copies of each spell
  for (const s of spells) {
    deckCards.push(s);
    deckCards.push(s);
  }
  // Add 1 copy of each enchantment
  for (const e of enchantments) {
    deckCards.push(e);
  }

  // Shuffle
  const deck = deckCards.map(createCardInstance);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function createPlayer(): PlayerState {
  const deck = buildDeck();
  const hand = deck.splice(0, 5);
  return {
    health: 20,
    maxHealth: 20,
    mana: 1,
    maxMana: 1,
    hand,
    deck,
    field: [],
    graveyard: [],
    enchantments: [],
    landsPlayed: 0,
    maxLandsPerTurn: 1,
  };
}

export function createInitialGameState(): GameState {
  uidCounter = 0;
  return {
    player1: createPlayer(),
    player2: createPlayer(),
    currentTurn: 'player1',
    turnNumber: 1,
    log: ['⚔️ Игра началась!'],
    gameOver: false,
    winner: null,
  };
}

// @ts-ignore unused helper
function _drawCard(player: PlayerState): PlayerState {
  if (player.deck.length === 0 || player.hand.length >= 10) return player;
  const [drawn, ...rest] = player.deck;
  return { ...player, hand: [...player.hand, drawn], deck: rest };
}

export function getEffectiveAttack(card: CardInstance, owner: PlayerState, _opponent?: PlayerState): number {
  let atk = card.data.attack;
  // Check for war drums enchantment
  for (const e of owner.enchantments) {
    if (e.data.id === 'war_drums') atk += 1;
  }
  return Math.max(0, atk);
}

export function getEffectiveHealth(card: CardInstance, owner: PlayerState): number {
  let hp = card.currentHealth;
  for (const e of owner.enchantments) {
    if (e.data.id === 'shield_aura') hp += 1;
  }
  return hp;
}

export function playCard(gs: GameState, who: 'player1' | 'player2', uid: string): GameState {
  const player = { ...gs[who] };
  const cardIdx = player.hand.findIndex(c => c.uid === uid);
  if (cardIdx === -1) return gs;
  
  const card = player.hand[cardIdx];
  
  if (card.data.type === 'land') {
    if (player.landsPlayed >= player.maxLandsPerTurn) return gs;
    player.hand = player.hand.filter(c => c.uid !== uid);
    player.landsPlayed++;
    player.maxMana++;
    player.mana++;
    return {
      ...gs,
      [who]: player,
      log: [...gs.log, `🏔️ ${who === 'player1' ? 'Вы' : 'Противник'} разыграл ${card.data.emoji} ${card.data.name}`],
    };
  }
  
  if (card.data.cost > player.mana) return gs;
  player.mana -= card.data.cost;
  player.hand = player.hand.filter(c => c.uid !== uid);

  if (card.data.type === 'creature') {
    const placed = { ...card, summoningSickness: !card.keywords.includes('haste') };
    player.field = [...player.field, placed];
  } else if (card.data.type === 'enchantment') {
    player.enchantments = [...player.enchantments, card];
  } else if (card.data.type === 'spell') {
    // Heal spell
    if (card.data.id === 'heal') {
      player.health = Math.min(player.maxHealth, player.health + 4);
    }
    // Bolt — deal damage to first enemy creature
    if (card.data.id === 'bolt') {
      const oppKey = who === 'player1' ? 'player2' : 'player1';
      const opp = { ...gs[oppKey] };
      if (opp.field.length > 0) {
        const target = { ...opp.field[0] };
        target.currentHealth -= 3;
        if (target.currentHealth <= 0) {
          opp.field = opp.field.filter(c => c.uid !== target.uid);
          opp.graveyard = [...opp.graveyard, target];
        } else {
          opp.field = opp.field.map(c => c.uid === target.uid ? target : c);
        }
        return {
          ...gs,
          [who]: player,
          [oppKey]: opp,
          log: [...gs.log, `⚡ ${card.data.emoji} ${card.data.name} нанёс 3 урона ${target.data.emoji} ${target.data.name}`],
        };
      }
    }
    player.graveyard = [...player.graveyard, card];
  }

  return {
    ...gs,
    [who]: player,
    log: [...gs.log, `🃏 ${who === 'player1' ? 'Вы' : 'Противник'} разыграл ${card.data.emoji} ${card.data.name}`],
  };
}

export function attackPlayer(gs: GameState, who: 'player1' | 'player2', attackerUid: string): GameState {
  const attacker = gs[who].field.find(c => c.uid === attackerUid);
  if (!attacker || attacker.summoningSickness || attacker.hasAttacked || attacker.frozen > 0) return gs;
  if (attacker.keywords.includes('defender')) return gs;

  const oppKey = who === 'player1' ? 'player2' : 'player1';
  const opp = { ...gs[oppKey] };
  const player = { ...gs[who] };

  // Check for defenders
  const hasDefender = opp.field.some(c => c.keywords.includes('defender'));
  if (hasDefender) return gs; // Must attack defenders first

  const atk = getEffectiveAttack(attacker, player, opp);
  opp.health -= atk;

  // Lifelink
  if (attacker.keywords.includes('lifelink')) {
    player.health = Math.min(player.maxHealth, player.health + atk);
  }

  player.field = player.field.map(c => c.uid === attackerUid ? { ...c, hasAttacked: true } : c);

  const newGs: GameState = {
    ...gs,
    [who]: player,
    [oppKey]: opp,
    log: [...gs.log, `⚔️ ${attacker.data.emoji} ${attacker.data.name} атакует героя! (-${atk} HP)`],
  };

  if (opp.health <= 0) {
    return { ...newGs, gameOver: true, winner: who };
  }
  return newGs;
}

export function attackCreature(gs: GameState, who: 'player1' | 'player2', attackerUid: string, defenderUid: string): GameState {
  const player = { ...gs[who] };
  const oppKey = who === 'player1' ? 'player2' : 'player1';
  const opp = { ...gs[oppKey] };

  const attacker = player.field.find(c => c.uid === attackerUid);
  const defender = opp.field.find(c => c.uid === defenderUid);
  if (!attacker || !defender) return gs;
  if (attacker.summoningSickness || attacker.hasAttacked || attacker.frozen > 0) return gs;
  if (attacker.keywords.includes('defender')) return gs;

  const atk1 = getEffectiveAttack(attacker, player, opp);
  const atk2 = getEffectiveAttack(defender, opp, player);

  const newDefender = { ...defender, currentHealth: defender.currentHealth - atk1 };
  const newAttacker = { ...attacker, currentHealth: attacker.currentHealth - atk2, hasAttacked: true };

  // Deathtouch
  if (attacker.keywords.includes('deathtouch') && atk1 > 0) newDefender.currentHealth = 0;
  if (defender.keywords.includes('deathtouch') && atk2 > 0) newAttacker.currentHealth = 0;

  // Lifelink
  if (attacker.keywords.includes('lifelink')) {
    player.health = Math.min(player.maxHealth, player.health + atk1);
  }

  // Process deaths
  if (newDefender.currentHealth <= 0) {
    opp.field = opp.field.filter(c => c.uid !== defenderUid);
    opp.graveyard = [...opp.graveyard, newDefender];
  } else {
    opp.field = opp.field.map(c => c.uid === defenderUid ? newDefender : c);
  }

  if (newAttacker.currentHealth <= 0) {
    player.field = player.field.filter(c => c.uid !== attackerUid);
    player.graveyard = [...player.graveyard, newAttacker];
  } else {
    player.field = player.field.map(c => c.uid === attackerUid ? newAttacker : c);
  }

  return {
    ...gs,
    [who]: player,
    [oppKey]: opp,
    log: [...gs.log, `⚔️ ${attacker.data.emoji} ${attacker.data.name} vs ${defender.data.emoji} ${defender.data.name}`],
  };
}

export function endTurn(gs: GameState): GameState {
  const nextTurn = gs.currentTurn === 'player1' ? 'player2' : 'player1';
  const nextPlayer = { ...gs[nextTurn] };

  // Untap, upkeep, draw
  nextPlayer.field = nextPlayer.field.map(c => ({
    ...c,
    summoningSickness: false,
    hasAttacked: false,
    frozen: Math.max(0, c.frozen - 1),
  }));
  nextPlayer.landsPlayed = 0;
  nextPlayer.mana = nextPlayer.maxMana;

  // Draw a card
  if (nextPlayer.deck.length > 0 && nextPlayer.hand.length < 10) {
    const [drawn, ...rest] = nextPlayer.deck;
    nextPlayer.hand = [...nextPlayer.hand, drawn];
    nextPlayer.deck = rest;
  }

  const turnNumber = nextTurn === 'player1' ? gs.turnNumber + 1 : gs.turnNumber;

  return {
    ...gs,
    [nextTurn]: nextPlayer,
    currentTurn: nextTurn,
    turnNumber,
    log: [...gs.log, `──── Ход ${turnNumber}: ${nextTurn === 'player1' ? 'Игрок 1' : 'Игрок 2'} ────`],
  };
}
