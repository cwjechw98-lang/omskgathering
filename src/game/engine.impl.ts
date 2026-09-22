import { CardData, createDeck } from '../data/cards';
import { GameState, PlayerState, CardInstance } from './types';
import { getEffectiveAttack, getEffectiveHealth, hasKeyword } from './buffs';
import {
  MANA_NAMES,
  emptyPool,
  payMana,
  pipsFor,
  poolTotal,
  refillPool,
} from './mana';

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
    manaPool: emptyPool(),
    landsByColor: { white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 0 },
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
    lastDiceRoll: null,
    aiComment: null,
    mulliganPhase: true,
    mulliganCount: 0,
    player1Keeping: null,
    player2Keeping: null,
  };

  // Player 1 gets a proper first-turn draw (like in MTG, untap-upkeep-draw)
  drawCard(state.player1, state.log);

  state.log.push('⚔️ Битва за Омск начинается! Вы не можете покинуть Омск!');
  state.log.push('🔄 Ход 1: Ваш ход. Начните с розыгрыша ЗЕМЛИ! 🏔️');
  state.log.push('🃏 Mulligan: оставьте руку с 2-4 землями (максимум 2 муллигана)');

  return state;
}

export function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Mulligan system:
 * - Auto-keep if 2-4 lands in hand
 * - Auto-mulligan if 0-1 or 5+ lands
 * - Maximum 2 mulligans per game
 * - After 2nd mulligan: scry 1 (look at top card, can put on bottom)
 */
export function takeMulligan(state: GameState, playerKey: 'player1' | 'player2'): GameState {
  if (!state.mulliganPhase) return state;
  if (state.mulliganCount >= 2) return state;

  const newState = deepClone(state);
  const player = newState[playerKey];

  // Return hand to deck and shuffle
  for (const card of player.hand) {
    player.deck.push(card);
  }
  player.hand = [];

  // Shuffle deck
  for (let i = player.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [player.deck[i], player.deck[j]] = [player.deck[j], player.deck[i]];
  }

  // Draw new hand (5 cards)
  for (let i = 0; i < 5 && player.deck.length > 0; i++) {
    const card = player.deck.shift();
    if (card) player.hand.push(card);
  }

  newState.mulliganCount++;
  newState.log.push(
    `🃏 ${playerKey === 'player1' ? 'Вы' : 'Противник'} взяли муллиган (${newState.mulliganCount}/2)`
  );

  // Check if new hand is keepable
  const landCount = player.hand.filter((c) => c.data.type === 'land').length;
  const isKeepable = landCount >= 2 && landCount <= 4;

  if (newState.mulliganCount >= 2) {
    // After 2nd mulligan, auto-keep and scry 1
    newState.mulliganPhase = false;
    newState.log.push('🔮 После 2го муллигана: просмотрите верхнюю карту (scry 1)');
    // Simple scry: put top card on bottom if it's a land and player has 0 lands
    if (player.hand.filter((c) => c.data.type === 'land').length === 0 && player.deck.length > 0) {
      const top = player.deck.shift();
      if (top) {
        player.deck.push(top);
        newState.log.push('🔮 Scry: карта отправлена вниз колоды');
      }
    }
  } else if (isKeepable) {
    newState[playerKey === 'player1' ? 'player1Keeping' : 'player2Keeping'] = true;
    // Check if both players kept
    if (newState.player1Keeping && newState.player2Keeping) {
      newState.mulliganPhase = false;
      newState.log.push('✅ Оба игрока оставили руки. Игра начинается!');
    }
  }

  return newState;
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

// getEffectiveHealth живёт в buffs.ts — раньше здесь была вторая копия, которая
// расходилась с ней (учитывала «Клятву Метростроя», но не «Бокал»). Наружу через
// barrel уходила версия из buffs, поэтому ИИ считал здоровье по другой формуле.
// Оставлена одна реализация, как уже сделано для getEffectiveAttack и hasKeyword.

// Freeze counters are decremented at the start of owner's turn.
// To skip N full turns, store N+1.
function applyFreeze(card: CardInstance, turns: number) {
  card.frozen = Math.max(card.frozen, turns + 1);
}

function isBlocker(c: CardInstance): boolean {
  // Наш defender — это Taunt, а не MTG-защитник: по 702.3b защитник лишь не может
  // атаковать, а блокирующего выбирает защищающийся (509.1a). Шага блокирования в
  // движке нет, поэтому defender перехватывает атаки на себя.
  // Vigilance сюда не входит: в MTG это «атака не поворачивает существо» (702.20),
  // а поворот за атаку движок не моделирует.
  return hasKeyword(c, 'defender') && c.frozen <= 0 && c.currentHealth > 0;
}

function hasDefender(player: PlayerState): boolean {
  return player.field.some(isBlocker);
}

/**
 * Разыгрывает карту земли
 * @returns Новое состояние или исходное если нельзя сыграть
 */
function playLandCard(
  state: GameState,
  player: PlayerState,
  cardIndex: number,
  card: CardInstance
): GameState {
  if (player.landsPlayed >= player.maxLandsPerTurn) {
    state.log.push('❌ Уже разыграна земля в этом ходу!');
    return state;
  }

  player.hand.splice(cardIndex, 1);
  player.maxMana += 1;
  player.landsPlayed += 1;

  // Земля даёт ману СВОЕГО цвета и запоминается по цвету: из этих записей собирается
  // пул в начале каждого хода. Раньше земля давала безликую единицу маны.
  const landColor = card.data.color;
  player.landsByColor[landColor] += 1;
  player.manaPool[landColor] += 1;
  player.mana = poolTotal(player.manaPool);

  if (card.data.id === 'ploshchad_buhgoltsa' && player.maxMana === 3) {
    player.health = Math.min(player.maxHealth, player.health + 1);
    state.log.push('🗿 Площадь Бухгольца: третья земля — +1 здоровье!');
  }

  state.log.push(
    `🏔️ ${card.data.name} разыграна. Мана: ${player.mana}/${player.maxMana} (+${MANA_NAMES[landColor]})`,
  );
  return state;
}

/**
 * Разыгрывает карту существа
 * @returns Новое состояние или исходное если нельзя сыграть
 */
function playCreatureCard(
  state: GameState,
  player: PlayerState,
  opponent: PlayerState,
  cardIndex: number,
  card: CardInstance
): GameState {
  // Проверка «поле полно» стоит ЗДЕСЬ только как страховка: playCard проверяет её
  // до оплаты, поэтому мана ещё не списана и возвращать нечего. Раньше проверка была
  // после списания, и приходилось возвращать ману числом.
  if (player.field.length >= 7) {
    state.log.push('❌ Поле полно! (максимум 7 существ)');
    return state;
  }

  player.hand.splice(cardIndex, 1);
  card.summoningSickness = !hasKeyword(card, 'haste');
  card.hasAttacked = false;

  if (opponent.enchantments.some((c) => c.data.id === 'omskaya_zima')) {
    applyFreeze(card, 1);
    state.log.push(`🌨️ ${card.data.name} входит замороженным из-за Омской Зимы!`);
  }

  player.field.push(card);
  state.log.push(`🃏 ${card.data.emoji} ${card.data.name} выходит на поле!`);

  applyEntryEffects(card, player, opponent, state);

  if (player.enchantments.some((c) => c.data.id === 'holy_graph')) {
    drawCard(player, state.log);
    state.log.push('📊 Святой Граф: +1 карта за существо!');
  }

  cleanupDead(state);
  return state;
}

/**
 * Разыгрывает заклинание
 * @returns Новое состояние или исходное если нельзя сыграть
 */
function playSpellCard(
  state: GameState,
  player: PlayerState,
  opponent: PlayerState,
  cardIndex: number,
  card: CardInstance
): GameState {
  player.hand.splice(cardIndex, 1);
  applySpellEffect(card, player, opponent, state);
  player.graveyard.push(card);

  const kotCount = player.field.filter((c) => c.data.id === 'kot_ucheniy').length;
  for (let i = 0; i < kotCount; i++) {
    drawCard(player, state.log);
    state.log.push('🐱 Учёный Кот: +1 карта за заклинание!');
  }

  const arkhivarCount = player.field.filter((c) => c.data.id === 'arkhivar_omskoi_kreposti').length;
  for (let i = 0; i < arkhivarCount; i++) {
    drawCard(player, state.log);
    state.log.push('🗝️ Архивариус Крепости: +1 карта за заклинание!');
  }

  cleanupDead(state);
  return state;
}

/**
 * Разыгрывает наложение
 * @returns Новое состояние или исходное если нельзя сыграть
 */
function playEnchantmentCard(
  state: GameState,
  player: PlayerState,
  cardIndex: number,
  card: CardInstance
): GameState {
  player.hand.splice(cardIndex, 1);
  player.enchantments.push(card);
  state.log.push(`✨ ${card.data.emoji} ${card.data.name} наложено!`);
  cleanupDead(state);
  return state;
}

export function playCard(
  state: GameState,
  playerKey: 'player1' | 'player2',
  cardUid: string
): GameState {
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
    return playLandCard(newState, player, cardIndex, card);
  }

  // Проверяем поле ДО оплаты: иначе пришлось бы возвращать ману обратно в пул.
  if (card.data.type === 'creature' && player.field.length >= 7) {
    newState.log.push('❌ Поле полно! (максимум 7 существ)');
    return newState;
  }

  // Цена. Налог Бабушки с Метро удорожает заклинание на 1 ОБЩУЮ ману и не добавляет
  // цветной пипс, поэтому пипсы считаются от исходной цены карты.
  let manaCost = card.data.cost;
  const opponentHasBabushka = opponent.field.some((c) => c.data.id === 'babushka_metro');
  if (opponentHasBabushka && card.data.type === 'spell') {
    manaCost += 1;
  }

  const pips = pipsFor(card.data.color, card.data.cost);
  const paid = payMana(player.manaPool, card.data.color, manaCost, pips);
  if (!paid) {
    const need =
      pips > 0
        ? `нужно ${manaCost} маны, из них ${pips} ${MANA_NAMES[card.data.color]}`
        : `нужно ${manaCost} любой маны`;
    newState.log.push(`❌ Не хватает маны! ${need}, а есть ${player.mana}`);
    return newState;
  }
  player.manaPool = paid;
  player.mana = poolTotal(paid);

  if (card.data.type === 'creature') {
    return playCreatureCard(newState, player, opponent, cardIndex, card);
  } else if (card.data.type === 'spell') {
    // Rosgvardiya counter
    if (opponent.field.some((c) => c.data.id === 'rosgvardiya')) {
      player.hand.splice(cardIndex, 1);
      player.graveyard.push(card);
      newState.log.push(`🛡️ Росгвардия: ${card.data.name} заблокирована!`);
      cleanupDead(newState);
      return newState;
    }
    return playSpellCard(newState, player, opponent, cardIndex, card);
  } else if (card.data.type === 'enchantment') {
    return playEnchantmentCard(newState, player, cardIndex, card);
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
      state.log.push('🌻 Бабка с Семечками: +1 здоровье!');
      break;

    case 'trolleybus_driver':
      player.health = Math.min(player.maxHealth, player.health + 1);
      state.log.push('🚎 Водитель Троллейбуса: +1 здоровье!');
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
    case 'khroniker_irtysha': {
      const top = player.deck.splice(0, Math.min(2, player.deck.length));
      if (top.length > 0) {
        top.sort((a, b) => b.data.cost - a.data.cost);
        player.hand.push(top[0]);
        if (top.length > 1) player.deck.push(top[1]);
        state.log.push(`📜 Хроникер Иртыша: в руку ${top[0].data.name}.`);
      }
      break;
    }

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
    case 'shaman_lukash': {
      const ally = player.field.find((c) => c.uid !== card.uid);
      if (ally) {
        ally.buffAttack += 1;
        ally.buffHealth += 1;
        ally.currentHealth += 1;
        state.log.push(`🪶 Шаман усиливает ${ally.data.name} на +1/+1.`);
      }
      break;
    }

    case 'pirat_irtysha':
      // draw on damage is handled in attack
      break;

    case 'duh_sibiri':
      player.health = Math.min(player.maxHealth, player.health + 4);
      state.log.push('🌲 Дух Сибири: +4 здоровья!');
      break;

    case 'drakon_irtysha':
      for (const c of opponent.field) {
        c.currentHealth -= 3;
      }
      opponent.health -= 3;
      state.log.push('🐉 Дракон Иртыша: 3 урона всем врагам и герою!');
      break;

    case 'pisiner_21':
      // Мана от существа — «любая»: она не принадлежит ни одному цвету и потому платит
      // за что угодно, включая цветные пипсы. Потолок прежний: суммарно maxMana + 1.
      if (poolTotal(player.manaPool) < player.maxMana + 1) {
        player.manaPool.any += 1;
        player.mana = poolTotal(player.manaPool);
      }
      state.log.push('👨‍💻 Писинер: +1 любая мана!');
      break;

    case 'bocal':
      // Постоянный бафф здесь убран: он double-count'ился с веткой Bocal в
      // getEffectiveAttack/getEffectiveHealth. Теперь +1/+1 считает одна
      // непрерывная проверка, поэтому и старые, и новые Писинеры получают ровно
      // +1/+1, как и написано на карте.
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
        state.log.push(`🕳️ Чёрная Дыра уничтожает: ${killed.join(', ')}!`);
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
    case 'kontroler_tramvaya':
    case 'himik_npz':
    case 'arkhivar_omskoi_kreposti':
      break;
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
      state.lastDiceRoll = { sides: 6, result: roll, reason: 'Сбой памяти' };
      state.log.push(`🎲 Сбой Памяти: бросок кубика = ${roll}`);
      if (roll === 1) {
        if (player.field.length > 0) {
          const target = player.field[Math.floor(Math.random() * player.field.length)];
          target.currentHealth -= 2;
          state.log.push(`💀 Сбой Памяти бьёт СВОЕГО ${target.data.name} на 2!`);
        }
      } else {
        if (opponent.field.length > 0) {
          const target = opponent.field[Math.floor(Math.random() * opponent.field.length)];
          target.currentHealth -= 3;
          state.log.push(`💀 Сбой Памяти бьёт вражеского ${target.data.name} на 3!`);
        } else {
          opponent.health -= 3;
          state.log.push('💀 Сбой Памяти: 3 урона вражескому герою!');
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
      // Карта обещает «Потяните карту» — без этого вызова добор не происходил.
      drawCard(player, state.log);
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
        // Alternative: 2 damage to enemy hero
        opponent.health -= 2;
        state.log.push('🕳️ Яма на Дороге: 2 урона вражескому герою!');
      }
      break;
    }

    case 'peer_review': {
      const count = Math.min(3, player.deck.length);
      if (count > 0) {
        const top = player.deck.splice(0, count);
        top.sort((a, b) => b.data.cost - a.data.cost);
        // Take top 2 best cards
        player.hand.push(top[0]);
        if (top.length > 1) player.hand.push(top[1]);
        state.log.push(
          `🔍 Пир-ревью: ${top[0].data.name} и ${top.length > 1 ? top[1].data.name : 'ничего'} в руку!`
        );
        // Put rest back on top
        for (let i = 2; i < top.length; i++) {
          player.deck.unshift(top[i]);
        }
      }
      break;
    }

    case 'probka_lenina':
      // applyFreeze(c, 1) уже означает «пропустить следующий ход» (см. конвенцию
      // N+1 в applyFreeze). Второй мороз через cantAttackNextTurn в endTurn давал
      // два хода вместо одного — карта обещает один.
      for (const c of opponent.field) {
        applyFreeze(c, 1);
      }
      state.log.push('🚗 Пробка на Ленина! Все вражеские существа заморожены!');
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

    case 'nalogovaya_inspektsiya': {
      if (opponent.hand.length > 0) {
        const idx = Math.floor(Math.random() * opponent.hand.length);
        const discarded = opponent.hand.splice(idx, 1)[0];
        opponent.graveyard.push(discarded);
        state.log.push(`💀 Налоговая Инспекция: ${discarded.data.name} сброшена!`);
      } else {
        state.log.push('💀 Налоговая Инспекция: у врага нет карт.');
      }
      break;
    }

    case 'posledniy_argument': {
      for (const c of opponent.field) {
        c.currentHealth -= 3;
      }
      opponent.health -= 3;
      state.log.push('🔥 Последний Аргумент: 3 урона всем врагам и герою!');
      break;
    }

    case 'uskorennyy_rost': {
      if (player.field.length > 0) {
        const target = player.field[Math.floor(Math.random() * player.field.length)];
        target.tempBuffAttack += 2;
        // «Ускорение» — это право атаковать в ход входа, а не вторая атака.
        // Сброс hasAttacked позволял существу ударить дважды за один ход.
        target.summoningSickness = false;
        state.log.push(`🌱 Ускоренный Рост: ${target.data.name} получает +2/+0 и ускорение!`);
      } else {
        state.log.push('🌱 Ускоренный Рост: нет целей.');
      }
      break;
    }

    case 'norminette': {
      const targets = opponent.field.filter(
        (c) => getEffectiveAttack(c, opponent) <= 4 && !hasKeyword(c, 'hexproof')
      );
      if (targets.length > 0) {
        const target = targets.reduce((a, b) =>
          getEffectiveAttack(b, opponent) > getEffectiveAttack(a, opponent) ? b : a
        );
        target.currentHealth = -999;
        state.log.push(`🔴 Норминетта: ${target.data.name} уничтожен!`);
      } else {
        state.log.push('🔴 Норминетта: нет целей.');
      }
      break;
    }

    case 'exam_42': {
      const roll = rollDice(6);
      const discardCount = Math.min(3, Math.max(1, Math.floor(roll / 2)));
      state.lastDiceRoll = { sides: 6, result: roll, reason: `Экзамен: сброс ${discardCount}` };
      state.log.push(`🎲 Экзамен: кубик = ${roll}, сброс ${discardCount} карт!`);

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
    case 'tuman_nad_irtyshom': {
      const targets = [...opponent.field].filter((c) => !hasKeyword(c, 'hexproof'));
      const freezeCount = Math.min(2, targets.length);
      for (let i = 0; i < freezeCount; i++) {
        const target = targets.splice(Math.floor(Math.random() * targets.length), 1)[0];
        applyFreeze(target, 1);
        state.log.push(`🌫️ Туман: ${target.data.name} заморожен.`);
      }
      drawCard(player, state.log);
      break;
    }

    case 'svodka_112': {
      if (opponent.field.length > 0) {
        const target = [...opponent.field].sort(
          (a, b) =>
            getEffectiveAttack(b, opponent, player) - getEffectiveAttack(a, opponent, player)
        )[0];
        target.currentHealth -= 2;
        state.log.push(`🚨 Сводка 112: 2 урона ${target.data.name}.`);
        if (target.currentHealth > 0) {
          opponent.health -= 1;
          state.log.push('🚨 Сводка 112: цель выжила, герою 1 урон.');
        }
      } else {
        opponent.health -= 1;
        state.log.push('🚨 Сводка 112: целей нет, 1 урон герою.');
      }
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
      state.log.push('✝️ Божественный Свет: +4 здоровья, всем существам +1/+1!');
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
  // Эффективная атака 0 — удара не будет, но существо повернётся и проиграет анимацию.
  // Игрок увидит «пустую атаку»: лог «атакует героя на 0», а здоровье не меняется.
  if (getEffectiveAttack(attacker, player, opponent) <= 0) {
    newState.log.push(`❌ ${attacker.data.name} не может атаковать: атака 0.`);
    return state;
  }

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
      newState.log.push(`💖 Привязка к жизни: +${healed} здоровья!`);
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
  // Эффективная атака 0 — удара не будет, но существо повернётся. Отклоняем.
  if (getEffectiveAttack(attacker, player, opponent) <= 0) {
    newState.log.push(`❌ ${attacker.data.name} не может атаковать: атака 0.`);
    return state;
  }

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
  if (attacker.data.id === 'kontroler_tramvaya') {
    defender.tempBuffAttack -= 1;
    newState.log.push('🎟️ Контролер: защитник получает -1⚔ до конца хода.');
  }
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
    newState.log.push(`💖 Привязка к жизни: +${attackerDamageDealt} здоровья!`);
  }

  if (hasKeyword(defender, 'lifelink') && defenderDealtDamage && defenderDamageDealt > 0) {
    opponent.health = Math.min(opponent.maxHealth, opponent.health + defenderDamageDealt);
    newState.log.push(`💖 Привязка к жизни (защитник): +${defenderDamageDealt} здоровья!`);
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

  // Golem Sborny: draw on kill
  if (attacker.data.id === 'makefile_golem' && defender.currentHealth <= 0) {
    drawCard(player, newState.log);
    newState.log.push('⚙️ Голем Сборки: +1 карта за убийство!');
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
  for (const card of [...currentPlayer.field, ...nextPlayer.field]) {
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
  // Пул собирается заново из разыгранных земель: по одной мане своего цвета за каждую.
  // Бонус от Святого Графа — «любая» мана, как и от Писинера.
  nextPlayer.manaPool = refillPool(nextPlayer.landsByColor, bonusMana);
  nextPlayer.mana = poolTotal(nextPlayer.manaPool);
  nextPlayer.landsPlayed = 0;

  // Unfreeze and refresh creatures
  for (const card of nextPlayer.field) {
    if (card.frozen > 0) card.frozen -= 1;
    card.hasAttacked = false;
    card.summoningSickness = false;
  }

  // Draw card
  drawCard(nextPlayer, newState.log);

  // === Enchantment effects ===
  // Biblioteka OmGTU: draw if hand ≤ 2
  if (nextPlayer.enchantments.some((c) => c.data.id === 'biblioteka_omgtu')) {
    while (nextPlayer.hand.length < 3) {
      if (!drawCard(nextPlayer, newState.log)) break;
    }
    if (nextPlayer.hand.length >= 3) {
      newState.log.push('📚 Библиотека ОмГТУ: карты до 3!');
    }
  }

  // Metro: extra draw
  if (nextPlayer.enchantments.some((c) => c.data.id === 'metro_mechta')) {
    drawCard(nextPlayer, newState.log);
    newState.log.push('🚇 Мечта о Метро: +1 карта!');
  }

  // Blagoustroistvo: heal
  if (nextPlayer.enchantments.some((c) => c.data.id === 'blagoustroistvo')) {
    nextPlayer.health = Math.min(nextPlayer.maxHealth, nextPlayer.health + 1);
    newState.log.push('🌷 Благоустройство: +1 здоровье!');
  }
  if (nextPlayer.enchantments.some((c) => c.data.id === 'klyatva_metrostroya')) {
    if (nextPlayer.field.length >= 3) {
      nextPlayer.health = Math.min(nextPlayer.maxHealth, nextPlayer.health + 2);
      newState.log.push('🚇 Клятва Метростроя: +2 здоровья за стройный фронт!');
    }
  }

  // Coffee machine: heal
  const coffeeCount = nextPlayer.field.filter((c) => c.data.id === 'coffee_machine').length;
  if (coffeeCount > 0) {
    nextPlayer.health = Math.min(nextPlayer.maxHealth, nextPlayer.health + coffeeCount);
    newState.log.push(`☕ Кофемашина: +${coffeeCount} здоровья!`);
  }

  // Babka semechki: heal self and babka
  const babkaCount = nextPlayer.field.filter((c) => c.data.id === 'babka_semechki').length;
  if (babkaCount > 0) {
    nextPlayer.health = Math.min(nextPlayer.maxHealth, nextPlayer.health + babkaCount);
    for (const b of nextPlayer.field.filter((c) => c.data.id === 'babka_semechki')) {
      b.currentHealth = Math.min(b.maxHealth, b.currentHealth + 1);
    }
    newState.log.push(`🌻 Бабка с Семечками: +${babkaCount} здоровья!`);
  }

  // Duh Omska: damage opponent
  const duhOwnerKey = nextPlayerKey === 'player1' ? 'player2' : 'player1';
  const duhOwner = newState[duhOwnerKey];
  if (duhOwner.enchantments.some((c) => c.data.id === 'duh_omska')) {
    nextPlayer.health -= 1;
    newState.log.push('👻 Дух Омска: -1 здоровье!');
  }
  if (duhOwner.enchantments.some((c) => c.data.id === 'golos_telebashni')) {
    if (nextPlayer.hand.length >= 4) {
      const idx = Math.floor(Math.random() * nextPlayer.hand.length);
      const discarded = nextPlayer.hand.splice(idx, 1)[0];
      nextPlayer.graveyard.push(discarded);
      newState.log.push(`📡 Голос Телебашни: сброшена ${discarded.data.name}.`);
    }
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
        state.log.push('🌯 Мастер Шаурмы: +2 здоровья при смерти!');
      }
      if (card.data.id === 'zhitel_podzemki') {
        opponent.health -= 2;
        state.log.push('🕳️ Житель Подземки: 2 урона врагу!');
      }
      if (card.data.id === 'pisiner_21') {
        drawCard(player, state.log);
        state.log.push('👨‍💻 Писинер: +1 карта при смерти!');
      }
      if (card.data.id === 'himik_npz') {
        for (const c of [...player.field, ...opponent.field]) {
          if (c.uid !== card.uid) c.currentHealth -= 1;
        }
        state.log.push('🧪 Химик НПЗ: 1 урон всем существам при смерти!');
      }

      // Zarya Pobedy: heal on ally death
      if (player.enchantments.some((c) => c.data.id === 'zarya_pobedy')) {
        player.health = Math.min(player.maxHealth, player.health + 2);
        state.log.push('🌅 Заря Победы: +2 здоровья за павшего!');
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

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
