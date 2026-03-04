import { CardData, createDeck } from '../data/cards';
import { GameState, PlayerState, CardInstance } from './types';

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

export function createInitialGameState(): GameState {
  const state: GameState = {
    player1: createPlayerState(),
    player2: createPlayerState(),
    currentTurn: 'player1',
    turnNumber: 1,
    phase: 'main',
    gameOver: false,
    winner: null,
    log: [],
    cantAttackNextTurn: false,
    lastDiceRoll: null,
    aiComment: null,
  };

  // Player 1 gets a proper first-turn draw (like in MTG, untap-upkeep-draw)
  drawCard(state.player1, state.log);

  state.log.push('⚔️ Битва за Омск начинается! Вы не можете покинуть Омск!');
  state.log.push('🔄 Ход 1: Ваш ход. Начните с розыгрыша ЗЕМЛИ! 🏔️');

  return state;
}

export function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function drawCard(player: PlayerState, log: string[]): boolean {
  if (player.deck.length === 0) {
    player.health -= 2;
    log.push('📚 Колода пуста! -2 здоровья!');
    return false;
  }
  const card = player.deck.shift();
  if (!card) return false;
  if (player.hand.length < 10) {
    player.hand.push(card);
    return true;
  } else {
    player.graveyard.push(card);
    log.push(`🗑️ ${card.data.name} сожжена — рука полна!`);
    return false;
  }
}

export function getEffectiveAttack(
  card: CardInstance,
  player: PlayerState,
  opponent?: PlayerState
): number {
  let atk = card.currentAttack + card.buffAttack + card.tempBuffAttack;

  // Dvornik: +1/+0 per other creature
  if (card.data.id === 'dvornik') {
    atk += player.field.filter((c) => c.uid !== card.uid).length;
  }

  // Mer Omska: +1/+1 all
  if (player.field.some((c) => c.data.id === 'mer_omska' && c.uid !== card.uid)) atk += 1;

  // Cluster Lord: +1/+1 all
  if (player.field.some((c) => c.data.id === 'cluster_lord' && c.uid !== card.uid)) atk += 1;

  // Duh Omska enchantment: +1 atk
  if (player.enchantments.some((c) => c.data.id === 'duh_omska')) atk += 1;

  // Zarya Pobedy: +1 atk
  if (player.enchantments.some((c) => c.data.id === 'zarya_pobedy')) atk += 1;

  // Bocal: +1/+1 to pisiner
  if (card.data.id === 'pisiner_21' && player.field.some((c) => c.data.id === 'bocal')) {
    atk += 1;
  }

  // Omskaya Zima: -1 atk to opponents
  if (opponent && opponent.enchantments.some((c) => c.data.id === 'omskaya_zima')) {
    atk -= 1;
  }

  return Math.max(0, atk);
}

export function getEffectiveHealth(card: CardInstance, player: PlayerState): number {
  // IMPORTANT: currentHealth already includes permanent buffs that increased maxHealth.
  // So we DO NOT add buffHealth again here (otherwise buffs double-count).
  let hp = card.currentHealth + card.tempBuffHealth;

  // Mer Omska: +1/+1 all
  if (player.field.some((c) => c.data.id === 'mer_omska' && c.uid !== card.uid)) hp += 1;

  // Cluster Lord: +1/+1 all
  if (player.field.some((c) => c.data.id === 'cluster_lord' && c.uid !== card.uid)) hp += 1;

  // Blagoustroistvo: +0/+2
  if (player.enchantments.some((c) => c.data.id === 'blagoustroistvo')) hp += 2;

  // Bocal: +1/+1 to pisiner (handled as buffHealth/maxHealth on apply, but keep this as safety)
  if (card.data.id === 'pisiner_21' && player.field.some((c) => c.data.id === 'bocal')) {
    hp += 0;
  }

  return hp;
}

function hasKeyword(card: CardInstance, kw: string): boolean {
  return card.keywords.includes(kw as CardInstance['keywords'][number]);
}

// Freeze counters are decremented at the start of owner's turn.
// To skip N full turns, store N+1.
function applyFreeze(card: CardInstance, turns: number) {
  card.frozen = Math.max(card.frozen, turns + 1);
}

function isBlocker(c: CardInstance): boolean {
  // MTG-aligned: only Defender forces attacks to be redirected.
  // Vigilance in MTG just means "doesn't tap to attack" (we don't model tap),
  // so it should NOT be treated as a mandatory defender.
  return hasKeyword(c, 'defender') && c.frozen <= 0 && c.currentHealth > 0;
}

function hasDefender(player: PlayerState): boolean {
  return player.field.some(isBlocker);
}

export function playCard(
  state: GameState,
  playerKey: 'player1' | 'player2',
  cardUid: string
): GameState {
  // Authoritative turn check (prevents out-of-turn play in any UI mode)
  if (state.gameOver) return state;
  if (state.currentTurn !== playerKey) return state;

  const newState = deepClone(state);
  const player = newState[playerKey];
  const opponent = newState[playerKey === 'player1' ? 'player2' : 'player1'];

  const cardIndex = player.hand.findIndex((c) => c.uid === cardUid);
  if (cardIndex === -1) return state;

  const card = player.hand[cardIndex];

  // Land handling
  if (card.data.type === 'land') {
    if (player.landsPlayed >= player.maxLandsPerTurn) {
      newState.log.push('❌ Уже разыграна земля в этом ходу!');
      return state;
    }
    player.hand.splice(cardIndex, 1);
    player.maxMana += 1;
    player.mana += 1;
    player.landsPlayed += 1;
    newState.log.push(`🏔️ ${card.data.name} разыграна. Мана: ${player.mana}/${player.maxMana}`);
    return newState;
  }

  // Check mana cost
  let manaCost = card.data.cost;
  const opponentHasBabushka = opponent.field.some((c) => c.data.id === 'babushka_metro');
  if (opponentHasBabushka && card.data.type === 'spell') {
    manaCost += 1;
  }

  if (player.mana < manaCost) {
    newState.log.push(`❌ Не хватает маны! Нужно ${manaCost}, есть ${player.mana}`);
    return state;
  }

  player.mana -= manaCost;
  player.hand.splice(cardIndex, 1);

  if (card.data.type === 'creature') {
    if (player.field.length >= 7) {
      newState.log.push('❌ Поле полно! (максимум 7 существ)');
      player.mana += manaCost;
      player.hand.splice(cardIndex, 0, card);
      return state;
    }

    card.summoningSickness = !hasKeyword(card, 'haste');
    card.hasAttacked = false;

    // Omskaya Zima: enter frozen
    if (opponent.enchantments.some((c) => c.data.id === 'omskaya_zima')) {
      applyFreeze(card, 1);
      newState.log.push(`🌨️ ${card.data.name} входит замороженным из-за Омской Зимы!`);
    }

    player.field.push(card);
    newState.log.push(`🃏 ${card.data.emoji} ${card.data.name} выходит на поле!`);

    applyEntryEffects(card, player, opponent, newState);

    // Holy Graph: draw on creature play
    if (player.enchantments.some((c) => c.data.id === 'holy_graph')) {
      drawCard(player, newState.log);
      newState.log.push('📊 Святой Граф: +1 карта за существо!');
    }
  } else if (card.data.type === 'spell') {
    applySpellEffect(card, player, opponent, newState);
    player.graveyard.push(card);

    // Kot ucheniy: draw on spell
    const kotCount = player.field.filter((c) => c.data.id === 'kot_ucheniy').length;
    for (let ki = 0; ki < kotCount; ki++) {
      drawCard(player, newState.log);
      newState.log.push('🐱 Учёный Кот: +1 карта за заклинание!');
    }
  } else if (card.data.type === 'enchantment') {
    player.enchantments.push(card);
    newState.log.push(`✨ ${card.data.emoji} ${card.data.name} наложено!`);
  }

  cleanupDead(newState);
  return newState;
}

function applyEntryEffects(
  card: CardInstance,
  player: PlayerState,
  opponent: PlayerState,
  state: GameState
) {
  switch (card.data.id) {
    case 'bird_omsk':
      drawCard(player, state.log);
      state.log.push('🐦 Птица-Омич: +1 карта!');
      break;

    case 'irtysh_vodyanoy':
      if (opponent.field.length > 0) {
        const target = opponent.field[Math.floor(Math.random() * opponent.field.length)];
        applyFreeze(target, 2);
        state.log.push(`🧜‍♂️ ${target.data.name} заморожен на 2 хода!`);
      }
      break;

    case 'student_omgtu': {
      const top = player.deck[0];
      if (top) {
        state.log.push(`🎓 Студент ОмГТУ изучает верх колоды: ${top.data.name}`);
      } else {
        state.log.push('🎓 Студент ОмГТУ: колода пуста.');
      }
      break;
    }

    case 'marshrutchik':
      for (const c of [...player.field, ...opponent.field]) {
        if (c.uid !== card.uid) c.currentHealth -= 1;
      }
      state.log.push('🚐 Маршрутчик: 1 урон всем другим существам!');
      break;

    case 'teplostantsiya_golem':
      for (const c of opponent.field) {
        c.currentHealth -= 2;
      }
      state.log.push('🏭 Голем ТЭЦ-5: 2 урона всем врагам!');
      break;

    case 'shaurmaster':
      player.health = Math.min(player.maxHealth, player.health + 2);
      state.log.push('🌯 Мастер Шаурмы: +2 здоровья!');
      break;

    case 'mer_omska': {
      for (let i = 0; i < 2 && player.field.length < 7; i++) {
        const chinovnik = createCardInstance({
          id: 'chinovnik',
          name: 'Чиновник',
          cost: 0,
          color: 'white',
          type: 'creature',
          attack: 1,
          health: 1,
          description: 'Токен.',
          flavor: '«Приходите завтра.»',
          emoji: '👔',
          keywords: [],
          rarity: 'common',
        });
        chinovnik.summoningSickness = true;
        player.field.push(chinovnik);
      }
      state.log.push('🎩 Мэр призывает 2 Чиновников!');
      break;
    }

    case 'voron_kreposti': {
      const creatures = player.graveyard.filter((c) => c.data.type === 'creature');
      if (creatures.length > 0) {
        const returned = creatures[creatures.length - 1];
        player.graveyard = player.graveyard.filter((c) => c.uid !== returned.uid);
        returned.currentHealth = returned.maxHealth;
        returned.currentAttack = returned.data.attack ?? 0;
        player.hand.push(returned);
        state.log.push(`🐦‍⬛ ${returned.data.name} возвращён из кладбища!`);
      }
      break;
    }

    case 'babka_semechki':
      player.health = Math.min(player.maxHealth, player.health + 1);
      state.log.push('🌻 Бабка с Семечками: +1 HP!');
      break;

    case 'trolleybus_driver':
      player.health = Math.min(player.maxHealth, player.health + 1);
      state.log.push('🚎 Водитель Троллейбуса: +1 HP!');
      break;

    case 'rynochny_torgovets':
      drawCard(player, state.log);
      if (player.hand.length > 0) {
        const idx = Math.floor(Math.random() * player.hand.length);
        const discarded = player.hand.splice(idx, 1)[0];
        player.graveyard.push(discarded);
        state.log.push(`🏪 Торговец: взял карту, сбросил ${discarded.data.name}`);
      }
      break;

    case 'omskiy_huligann':
      opponent.health -= 1;
      state.log.push('🤜 Хулиган: 1 урон вражескому герою!');
      break;

    case 'omskiy_rybolov':
      drawCard(player, state.log);
      state.log.push('🎣 Рыболов: +1 карта!');
      break;

    case 'omskaya_vedma': {
      if (opponent.field.length > 0) {
        const target = opponent.field[Math.floor(Math.random() * opponent.field.length)];
        target.currentHealth -= 2;
        state.log.push(`🧙‍♀️ Ведьма: 2 урона ${target.data.name}!`);
      }
      break;
    }

    case 'pirat_irtysha':
      // draw on damage is handled in attack
      break;

    case 'duh_sibiri':
      player.health = Math.min(player.maxHealth, player.health + 4);
      state.log.push('🌲 Дух Сибири: +4 HP!');
      break;

    case 'drakon_irtysha':
      for (const c of opponent.field) {
        c.currentHealth -= 3;
      }
      opponent.health -= 3;
      state.log.push('🐉 Дракон Иртыша: 3 урона всем врагам и герою!');
      break;

    case 'pisiner_21':
      player.mana = Math.min(player.maxMana + 1, player.mana + 1);
      state.log.push('👨‍💻 Писинер: +1 мана!');
      break;

    case 'bocal':
      for (const c of player.field) {
        if (c.data.id === 'pisiner_21') {
          c.buffAttack += 1;
          c.buffHealth += 1;
          c.currentHealth += 1;
        }
      }
      state.log.push('🏢 Бокал усиливает всех Писинеров!');
      break;

    case 'blackhole': {
      const killed: string[] = [];
      for (const c of [...opponent.field, ...player.field]) {
        if (getEffectiveAttack(c, player.field.includes(c) ? player : opponent) <= 2) {
          killed.push(c.data.name);
          c.currentHealth = -999;
        }
      }
      if (killed.length > 0) {
        state.log.push(`🕳️ Black Hole уничтожает: ${killed.join(', ')}!`);
      }
      break;
    }

    case 'cluster_lord': {
      const enemies = [...opponent.field];
      for (let i = 0; i < 1 && enemies.length > 0; i++) {
        const idx = Math.floor(Math.random() * enemies.length);
        applyFreeze(enemies[idx], 1);
        state.log.push(`🖥️ ${enemies[idx].data.name} заморожен Лордом Кластера!`);
        enemies.splice(idx, 1);
      }
      break;
    }
  }
}

function applySpellEffect(
  card: CardInstance,
  player: PlayerState,
  opponent: PlayerState,
  state: GameState
) {
  switch (card.data.id) {
    case 'pivo_sibirskoe':
      drawCard(player, state.log);
      drawCard(player, state.log);
      state.log.push('🍺 Сибирская Корона: +2 карты!');
      break;

    case 'segfault': {
      const roll = rollDice(6);
      state.lastDiceRoll = { sides: 6, result: roll, reason: 'Segfault' };
      state.log.push(`🎲 Segfault: бросок D6 = ${roll}`);
      if (roll === 1) {
        if (player.field.length > 0) {
          const target = player.field[Math.floor(Math.random() * player.field.length)];
          target.currentHealth -= 2;
          state.log.push(`💀 Segfault бьёт СВОЕГО ${target.data.name} на 2!`);
        }
      } else {
        if (opponent.field.length > 0) {
          const target = opponent.field[Math.floor(Math.random() * opponent.field.length)];
          target.currentHealth -= 3;
          state.log.push(`💀 Segfault бьёт вражеского ${target.data.name} на 3!`);
        } else {
          opponent.health -= 3;
          state.log.push('💀 Segfault: 3 урона вражескому герою!');
        }
      }
      break;
    }

    case 'shaverma_power': {
      const target =
        player.field.length > 0
          ? player.field[Math.floor(Math.random() * player.field.length)]
          : null;
      if (target) {
        target.buffAttack += 2;
        target.buffHealth += 2;
        target.currentHealth += 2;
        state.log.push(`🥙 ${target.data.name} получает +2/+2 навсегда!`);
      }
      player.health = Math.min(player.maxHealth, player.health + 2);
      state.log.push('🥙 +2 здоровья!');
      break;
    }

    case 'yama_na_doroge': {
      const targets = opponent.field.filter(
        (c) => getEffectiveAttack(c, opponent) <= 3 && !hasKeyword(c, 'hexproof')
      );
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        target.currentHealth = -999;
        state.log.push(`🕳️ ${target.data.name} провалился в яму!`);
      } else {
        state.log.push('🕳️ Нет подходящих целей.');
      }
      break;
    }

    case 'peer_review': {
      const count = Math.min(3, player.deck.length);
      if (count > 0) {
        const top = player.deck.splice(0, count);
        top.sort((a, b) => b.data.cost - a.data.cost);
        player.hand.push(top[0]);
        state.log.push(`🔍 Пир-ревью: ${top[0].data.name} в руку!`);
        for (let i = 1; i < top.length; i++) {
          player.deck.push(top[i]);
        }
      }
      break;
    }

    case 'probka_lenina':
      state.cantAttackNextTurn = true;
      state.log.push('🚗 Пробка на Ленина! Враги не атакуют в следующий ход!');
      break;

    case 'debug_mode': {
      if (player.field.length > 0) {
        const target = player.field[Math.floor(Math.random() * player.field.length)];
        target.buffAttack += 2;
        target.buffHealth += 2;
        target.currentHealth += 2;
        state.log.push(`🐛 ${target.data.name}: +2/+2 навсегда!`);
      }
      drawCard(player, state.log);
      break;
    }

    case 'ne_pokiday_omsk': {
      const targets = opponent.field.filter((c) => !hasKeyword(c, 'hexproof'));
      if (targets.length > 0) {
        // Return strongest creature
        const sorted = targets.sort(
          (a, b) => getEffectiveAttack(b, opponent) - getEffectiveAttack(a, opponent)
        );
        const target = sorted[0];
        opponent.field = opponent.field.filter((c) => c.uid !== target.uid);
        target.currentHealth = target.maxHealth;
        target.data = { ...target.data, cost: target.data.cost + 2 };
        opponent.hand.push(target);
        state.log.push(`🚫 ${target.data.name} возвращён! Стоимость +2.`);
      }
      break;
    }

    case 'omskiy_optimism':
      player.health = Math.min(player.maxHealth, player.health + 6);
      drawCard(player, state.log);
      state.log.push('😊 Омский Оптимизм: +6 здоровья, +1 карта!');
      break;

    case 'norminette': {
      const targets = opponent.field.filter(
        (c) => getEffectiveAttack(c, opponent) <= 4 && !hasKeyword(c, 'hexproof')
      );
      if (targets.length > 0) {
        const target = targets.reduce((a, b) =>
          getEffectiveAttack(b, opponent) > getEffectiveAttack(a, opponent) ? b : a
        );
        target.currentHealth = -999;
        state.log.push(`🔴 Norminette FAIL: ${target.data.name} уничтожен!`);
      } else {
        state.log.push('🔴 Norminette: нет целей.');
      }
      break;
    }

    case 'exam_42': {
      const roll = rollDice(6);
      const discardCount = Math.min(3, Math.max(1, Math.floor(roll / 2)));
      state.lastDiceRoll = { sides: 6, result: roll, reason: `Экзамен: сброс ${discardCount}` };
      state.log.push(`🎲 Экзамен: D6 = ${roll}, сброс ${discardCount} карт!`);

      for (let i = 0; i < discardCount && opponent.hand.length > 0; i++) {
        const idx = Math.floor(Math.random() * opponent.hand.length);
        const d = opponent.hand.splice(idx, 1)[0];
        opponent.graveyard.push(d);
      }
      for (let i = 0; i < discardCount && player.hand.length > 0; i++) {
        const idx = Math.floor(Math.random() * player.hand.length);
        const d = player.hand.splice(idx, 1)[0];
        player.graveyard.push(d);
      }
      break;
    }

    case 'moroz_50':
      for (const c of opponent.field) {
        applyFreeze(c, 1);
      }
      state.log.push('🥶 Мороз -50°: все враги заморожены!');
      break;

    case 'vzryv_gaza':
      for (const c of [...player.field, ...opponent.field]) {
        c.currentHealth -= 2;
      }
      state.log.push('💥 Взрыв газа: 2 урона ВСЕМ существам!');
      break;

    case 'ledyanoy_veter': {
      const targets = opponent.field.filter((c) => !hasKeyword(c, 'hexproof'));
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        applyFreeze(target, 2);
        state.log.push(`🌬️ Ледяной Ветер: ${target.data.name} заморожен на 2 хода!`);
      }
      drawCard(player, state.log);
      break;
    }

    case 'siberian_gnev': {
      if (opponent.field.length > 0) {
        const sorted = [...opponent.field].sort(
          (a, b) => getEffectiveAttack(b, opponent) - getEffectiveAttack(a, opponent)
        );
        sorted[0].currentHealth -= 4;
        state.log.push(`🔥 Сибирский Гнев: 4 урона ${sorted[0].data.name}!`);
      } else {
        opponent.health -= 4;
        state.log.push('🔥 Сибирский Гнев: 4 урона герою!');
      }
      break;
    }

    case 'bozhestvenniy_svet':
      player.health = Math.min(player.maxHealth, player.health + 4);
      for (const c of player.field) {
        c.buffAttack += 1;
        c.buffHealth += 1;
        c.currentHealth += 1;
      }
      state.log.push('✝️ Божественный Свет: +4 HP, всем существам +1/+1!');
      break;
  }
}

export function attackPlayer(
  state: GameState,
  playerKey: 'player1' | 'player2',
  attackerUid: string
): GameState {
  // Authoritative turn check
  if (state.gameOver) return state;
  if (state.currentTurn !== playerKey) return state;

  const newState = deepClone(state);
  const player = newState[playerKey];
  const opponentKey = playerKey === 'player1' ? 'player2' : 'player1';
  const opponent = newState[opponentKey];

  const attacker = player.field.find((c) => c.uid === attackerUid);
  if (!attacker) return state;
  if (hasKeyword(attacker, 'defender')) return state;
  if (attacker.summoningSickness || attacker.hasAttacked || attacker.frozen > 0) return state;

  // Check for defenders (unless unblockable or flying and no flying defenders)
  if (!hasKeyword(attacker, 'unblockable') && hasDefender(opponent)) {
    const defenders = opponent.field.filter(isBlocker);
    if (defenders.length > 0) {
      // Can only attack defenders with flying if attacker has flying
      if (hasKeyword(attacker, 'flying')) {
        const flyingDefenders = defenders.filter((c) => hasKeyword(c, 'flying'));
        if (flyingDefenders.length > 0) {
          newState.log.push('❌ Сначала нужно пробить защитников с полётом!');
          return state;
        }
        // Can fly over ground defenders
      } else {
        newState.log.push('❌ Сначала нужно уничтожить защитников! 🛡️');
        return state;
      }
    }
  }

  const damage = getEffectiveAttack(attacker, player, opponent);
  const opponentHealthBefore = opponent.health;
  opponent.health -= damage;

  attacker.hasAttacked = true;

  newState.log.push(`⚔️ ${attacker.data.emoji} ${attacker.data.name} атакует героя на ${damage}!`);

  // Lifelink
  if (hasKeyword(attacker, 'lifelink')) {
    const healed = Math.max(0, Math.min(damage, opponentHealthBefore));
    if (healed > 0) {
      player.health = Math.min(player.maxHealth, player.health + healed);
      newState.log.push(`💖 Привязка к жизни: +${healed} HP!`);
    }
  }

  // Tenevoy discard
  if (attacker.data.id === 'tenevoy_omich' && opponent.hand.length > 0) {
    const d = opponent.hand.splice(Math.floor(Math.random() * opponent.hand.length), 1)[0];
    opponent.graveyard.push(d);
    newState.log.push(`🌑 Враг сбрасывает ${d.data.name}!`);
  }

  // Pirat Irtysha: draw on damage to player
  if (attacker.data.id === 'pirat_irtysha') {
    drawCard(player, newState.log);
    newState.log.push('🏴‍☠️ Пират Иртыша: +1 карта!');
  }

  cleanupDead(newState);
  checkWinCondition(newState);
  return newState;
}

export function attackCreature(
  state: GameState,
  playerKey: 'player1' | 'player2',
  attackerUid: string,
  defenderUid: string
): GameState {
  // Authoritative turn check
  if (state.gameOver) return state;
  if (state.currentTurn !== playerKey) return state;

  const newState = deepClone(state);
  const player = newState[playerKey];
  const opponentKey = playerKey === 'player1' ? 'player2' : 'player1';
  const opponent = newState[opponentKey];

  const attacker = player.field.find((c) => c.uid === attackerUid);
  const defender = opponent.field.find((c) => c.uid === defenderUid);
  if (!attacker || !defender) return state;
  if (hasKeyword(attacker, 'defender')) return state;
  if (attacker.summoningSickness || attacker.hasAttacked || attacker.frozen > 0) return state;

  // Flying check
  if (hasKeyword(defender, 'flying') && !hasKeyword(attacker, 'flying')) {
    newState.log.push('❌ Нельзя атаковать летающее существо без полёта!');
    return state;
  }

  // Defender check
  if (!hasKeyword(attacker, 'unblockable') && !isBlocker(defender) && hasDefender(opponent)) {
    // If the attacker is flying, they are only stopped by flying defenders
    const flyingDefenders = opponent.field.filter((c) => isBlocker(c) && hasKeyword(c, 'flying'));
    if (hasKeyword(attacker, 'flying')) {
      if (flyingDefenders.length > 0) {
        newState.log.push('❌ Сначала нужно уничтожить защитников с полётом!');
        return state;
      }
    } else {
      newState.log.push('❌ Сначала нужно уничтожить защитников! 🛡️');
      return state;
    }
  }

  const atkDamage = getEffectiveAttack(attacker, player, opponent);
  const defenderFrozen = defender.frozen > 0;
  const defDamage = defenderFrozen ? 0 : getEffectiveAttack(defender, opponent, player);
  const defHealthBefore = getEffectiveHealth(defender, opponent);
  const atkHealthBefore = getEffectiveHealth(attacker, player);

  let attackerDealtDamage = false;
  let defenderDealtDamage = false;
  let attackerDamageDealt = 0;
  let defenderDamageDealt = 0;

  // First Strike
  if (hasKeyword(attacker, 'first_strike') && !hasKeyword(defender, 'first_strike')) {
    defender.currentHealth -= atkDamage;
    attackerDealtDamage = true;
    attackerDamageDealt = Math.min(atkDamage, defHealthBefore);
    if (defender.currentHealth > 0) {
      if (defDamage > 0) {
        attacker.currentHealth -= defDamage;
        defenderDealtDamage = true;
        defenderDamageDealt = Math.min(defDamage, atkHealthBefore);
      }
    }
    newState.log.push(`⚡ Первый удар! ${attacker.data.name} бьёт на ${atkDamage} первым!`);
  } else if (hasKeyword(defender, 'first_strike') && !hasKeyword(attacker, 'first_strike')) {
    if (defDamage > 0) {
      attacker.currentHealth -= defDamage;
      defenderDealtDamage = true;
      defenderDamageDealt = Math.min(defDamage, atkHealthBefore);
    }
    if (attacker.currentHealth > 0) {
      defender.currentHealth -= atkDamage;
      attackerDealtDamage = true;
      attackerDamageDealt = Math.min(atkDamage, defHealthBefore);
    }
    newState.log.push(`⚡ ${defender.data.name} наносит первый удар на ${defDamage}!`);
  } else {
    defender.currentHealth -= atkDamage;
    attacker.currentHealth -= defDamage;
    attackerDealtDamage = true;
    attackerDamageDealt = Math.min(atkDamage, defHealthBefore);
    if (defDamage > 0) {
      defenderDealtDamage = true;
      defenderDamageDealt = Math.min(defDamage, atkHealthBefore);
    }
  }

  attacker.hasAttacked = true;

  newState.log.push(
    `⚔️ ${attacker.data.name} (${atkDamage}⚔) vs ${defender.data.name} (${defDamage}⚔)`
  );

  // Deathtouch
  if (hasKeyword(attacker, 'deathtouch') && attackerDealtDamage && atkDamage > 0) {
    defender.currentHealth = 0;
    newState.log.push(`☠️ Смертельное касание уничтожает ${defender.data.name}!`);
  }
  if (hasKeyword(defender, 'deathtouch') && defenderDealtDamage && defDamage > 0) {
    attacker.currentHealth = 0;
    newState.log.push(`☠️ Смертельное касание уничтожает ${attacker.data.name}!`);
  }

  // Trample: excess damage to player
  if (hasKeyword(attacker, 'trample') && defender.currentHealth <= 0 && attackerDealtDamage) {
    // Use defender HP BEFORE combat to avoid massive excess when deathtouch sets hp to -999.
    // Simplified trample: excess = atk - defenderEffectiveHPBefore.
    const excess = atkDamage - defHealthBefore;
    if (excess > 0) {
      opponent.health -= excess;
      newState.log.push(`🦶 Растоптать: ${excess} урона герою!`);
    }
  }

  // Lifelink
  if (hasKeyword(attacker, 'lifelink') && attackerDealtDamage && attackerDamageDealt > 0) {
    player.health = Math.min(player.maxHealth, player.health + attackerDamageDealt);
    newState.log.push(`💖 Привязка к жизни: +${attackerDamageDealt} HP!`);
  }

  if (hasKeyword(defender, 'lifelink') && defenderDealtDamage && defenderDamageDealt > 0) {
    opponent.health = Math.min(opponent.maxHealth, opponent.health + defenderDamageDealt);
    newState.log.push(`💖 Привязка к жизни (защитник): +${defenderDamageDealt} HP!`);
  }

  // Sneg elemental freezes attacker
  if (
    defender.data.id === 'sneg_elemental' &&
    attacker.currentHealth > 0 &&
    attackerDamageDealt > 0
  ) {
    applyFreeze(attacker, 1);
    newState.log.push(`❄️ ${attacker.data.name} заморожен Элементалем!`);
  }

  // Frozen defenders do not retaliate; a hit breaks ice.
  if (defenderFrozen && attackerDamageDealt > 0) {
    defender.frozen = 0;
    newState.log.push(`❄️ ${defender.data.name} оттаял от удара!`);
  }

  // Makefile-Golem: draw on kill
  if (attacker.data.id === 'makefile_golem' && defender.currentHealth <= 0) {
    drawCard(player, newState.log);
    newState.log.push('⚙️ Makefile-Голем: +1 карта за убийство!');
  }

  cleanupDead(newState);
  checkWinCondition(newState);
  return newState;
}

export function endTurn(state: GameState): GameState {
  const newState = deepClone(state);
  const currentPlayerKey = newState.currentTurn;
  const nextPlayerKey = currentPlayerKey === 'player1' ? 'player2' : 'player1';
  const currentPlayer = newState[currentPlayerKey];
  const nextPlayer = newState[nextPlayerKey];

  // Clear temp buffs
  for (const card of currentPlayer.field) {
    card.tempBuffAttack = 0;
    card.tempBuffHealth = 0;
  }

  // === Start next turn ===
  newState.currentTurn = nextPlayerKey;
  newState.turnNumber += 1;
  newState.lastDiceRoll = null;
  newState.aiComment = null;

  // Refresh mana
  // Holy Graph: +1 mana per pisiner
  let bonusMana = 0;
  if (nextPlayer.enchantments.some((c) => c.data.id === 'holy_graph')) {
    bonusMana = nextPlayer.field.filter((c) => c.data.id === 'pisiner_21').length;
  }
  nextPlayer.mana = nextPlayer.maxMana + bonusMana;
  nextPlayer.landsPlayed = 0;

  // Unfreeze and refresh creatures
  for (const card of nextPlayer.field) {
    if (card.frozen > 0) card.frozen -= 1;
    card.hasAttacked = false;
    card.summoningSickness = false;
  }

  // Probka effect
  if (newState.cantAttackNextTurn) {
    for (const card of nextPlayer.field) {
      applyFreeze(card, 1);
    }
    newState.cantAttackNextTurn = false;
    newState.log.push('🚗 Пробка: все существа заморожены на 1 ход!');
  }

  // Draw card
  drawCard(nextPlayer, newState.log);

  // === Enchantment effects ===
  // Metro: extra draw
  if (nextPlayer.enchantments.some((c) => c.data.id === 'metro_mechta')) {
    drawCard(nextPlayer, newState.log);
    newState.log.push('🚇 Мечта о Метро: +1 карта!');
  }

  // Blagoustroistvo: heal
  if (nextPlayer.enchantments.some((c) => c.data.id === 'blagoustroistvo')) {
    nextPlayer.health = Math.min(nextPlayer.maxHealth, nextPlayer.health + 1);
    newState.log.push('🌷 Благоустройство: +1 HP!');
  }

  // Coffee machine: heal
  const coffeeCount = nextPlayer.field.filter((c) => c.data.id === 'coffee_machine').length;
  if (coffeeCount > 0) {
    nextPlayer.health = Math.min(nextPlayer.maxHealth, nextPlayer.health + coffeeCount);
    newState.log.push(`☕ Кофемашина: +${coffeeCount} HP!`);
  }

  // Babka semechki: heal self and babka
  const babkaCount = nextPlayer.field.filter((c) => c.data.id === 'babka_semechki').length;
  if (babkaCount > 0) {
    nextPlayer.health = Math.min(nextPlayer.maxHealth, nextPlayer.health + babkaCount);
    for (const b of nextPlayer.field.filter((c) => c.data.id === 'babka_semechki')) {
      b.currentHealth = Math.min(b.maxHealth, b.currentHealth + 1);
    }
    newState.log.push(`🌻 Бабка с Семечками: +${babkaCount} HP!`);
  }

  // Duh Omska: damage opponent
  const duhOwnerKey = nextPlayerKey === 'player1' ? 'player2' : 'player1';
  const duhOwner = newState[duhOwnerKey];
  if (duhOwner.enchantments.some((c) => c.data.id === 'duh_omska')) {
    nextPlayer.health -= 1;
    newState.log.push('👻 Дух Омска: -1 HP!');
  }

  newState.log.push(
    `🔄 Ход ${newState.turnNumber}: ${nextPlayerKey === 'player1' ? 'Игрок' : 'ИИ Омска'}`
  );

  cleanupDead(newState);
  checkWinCondition(newState);
  return newState;
}

function cleanupDead(state: GameState) {
  for (const key of ['player1', 'player2'] as const) {
    const player = state[key];
    const opponentKey = key === 'player1' ? 'player2' : 'player1';
    const opponent = state[opponentKey];
    const dead = player.field.filter((c) => c.currentHealth <= 0);

    for (const card of dead) {
      // Death triggers
      if (card.data.id === 'shaurmaster') {
        player.health = Math.min(player.maxHealth, player.health + 2);
        state.log.push('🌯 Мастер Шаурмы: +2 HP при смерти!');
      }
      if (card.data.id === 'zhitel_podzemki') {
        opponent.health -= 2;
        state.log.push('🕳️ Житель Подземки: 2 урона врагу!');
      }
      if (card.data.id === 'pisiner_21') {
        drawCard(player, state.log);
        state.log.push('👨‍💻 Писинер: +1 карта при смерти!');
      }

      // Zarya Pobedy: heal on ally death
      if (player.enchantments.some((c) => c.data.id === 'zarya_pobedy')) {
        player.health = Math.min(player.maxHealth, player.health + 2);
        state.log.push('🌅 Заря Победы: +2 HP за павшего!');
      }

      player.graveyard.push(card);
      state.log.push(`💀 ${card.data.emoji} ${card.data.name} погибает!`);
    }

    player.field = player.field.filter((c) => c.currentHealth > 0);
  }
}

function checkWinCondition(state: GameState) {
  if (state.player1.health <= 0 && state.player2.health <= 0) {
    state.gameOver = true;
    state.winner = null;
    state.log.push('💀 Ничья! Оба героя пали!');
  } else if (state.player1.health <= 0) {
    state.gameOver = true;
    state.winner = 'player2';
    state.log.push('🏆 ИИ Омска побеждает!');
  } else if (state.player2.health <= 0) {
    state.gameOver = true;
    state.winner = 'player1';
    state.log.push('🏆 Вы побеждаете!');
  }
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
