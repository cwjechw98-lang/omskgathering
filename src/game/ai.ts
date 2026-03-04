import { GameState, CardInstance, PlayerState } from './types';
import {
  playCard,
  attackPlayer,
  attackCreature,
  endTurn,
  getEffectiveAttack,
  getEffectiveHealth,
} from './engine';

// ====== AI COMMENTS ======
const COMMENTS: Record<string, { high: string[]; mid: string[]; low: string[] }> = {
  bird_omsk: {
    high: ['🐦 Лети, птичка! Ты не покинешь Омск!', '🐦 Крылья Омска не остановить!'],
    mid: ['🐦 Птица, помоги...', '🐦 Лети, разведай обстановку...'],
    low: ['🐦 Вынеси меня из ада...', '🐦 Последний полёт...'],
  },
  gopnik_lubinsky: {
    high: ['🧢 Э, БРАТАН! Разберёмся!', '🧢 НУ ВСЁ, ТЫ ПОПАЛ!'],
    mid: ['🧢 Есть чё? А ЕСЛИ НАЙДУ?!'],
    low: ['🧢 Братан, тут жёстко...', '🧢 Пацаны, помогите...'],
  },
  babushka_metro: {
    high: ['👵 Попробуй пройди мимо бабушки!'],
    mid: ['👵 Бабушка на страже!'],
    low: ['👵 Ох, тяжко... но не пропущу!'],
  },
  marshrutchik: {
    high: ['🚐 СЛЕДУЮЩАЯ ОСТАНОВКА — ТВОЁ ЛИЦО!', '🚐 За проезд передаём!'],
    mid: ['🚐 Пристегнитесь! Едем!'],
    low: ['🚐 Конечная... наверное...'],
  },
  teplostantsiya_golem: {
    high: ['🏭 ГОРИТЕ ВСЕ! ТЭЦ-5 НА ПОЛНУЮ!'],
    mid: ['🏭 ТЭЦ включается!'],
    low: ['🏭 Последний козырь... давай, ТЭЦ!'],
  },
  mer_omska: {
    high: ['🎩 Я — МЭР! Будет ПОРЯДОК в городе!'],
    mid: ['🎩 Чиновники, ко мне! Авось поможете...'],
    low: ['🎩 Обещаю метро... если выживу...'],
  },
  drakon_irtysha: {
    high: ['🐉 ДРАКОН ВОССТАЛ!!! ГОРИТЕ ВСЕ!!!'],
    mid: ['🐉 Огонь из Иртыша!'],
    low: ['🐉 ДРАКОН! СПАСИ МЕНЯ!'],
  },
  pisiner_21: {
    high: ['👨‍💻 git push --force! Принимай коммит!'],
    mid: ['👨‍💻 Компилируется... подождите...'],
    low: ['👨‍💻 Stack overflow в реальной жизни...'],
  },
  cluster_lord: {
    high: ['🖥️ sudo rm -rf /твоя_жизнь!'],
    mid: ['🖥️ Кластер активирован!'],
    low: ['🖥️ Kernel panic! Help!'],
  },
  dvornik: {
    high: ['🧹 ПОДМЕТУ ТЕБЯ С ПОЛЯ!'],
    mid: ['🧹 Метла наготове!'],
    low: ['🧹 Подмету свои слёзы...'],
  },
  sibirskiy_medved: {
    high: ['🐻 МЕДВЕДЬ ИДЁТ! БОЙСЯ!'],
    mid: ['🐻 Мишка в деле.'],
    low: ['🐻 Мишка, помоги медвежонку...'],
  },
  shaurmaster: {
    high: ['🌯 ДВОЙНАЯ ШАУРМА С СОУСОМ!'],
    mid: ['🌯 Подлечимся шаурмой...'],
    low: ['🌯 Последняя шаурма...'],
  },
  sneg_elemental: {
    high: ['❄️ ВЕЧНАЯ МЕРЗЛОТА НАСТУПАЕТ!'],
    mid: ['❄️ Холодает...'],
    low: ['❄️ Даже лёд тает от этих ран...'],
  },
  vzryv_gaza: {
    high: ['💥 БАБАХ!!! ВСЁ ГОРИТ!!!'],
    mid: ['💥 Больно будет ВСЕМ...'],
    low: ['💥 Забираю всех с собой!'],
  },
  moroz_50: {
    high: ['🥶 МИНУС ПЯТЬДЕСЯТ! Замёрзните все!'],
    mid: ['🥶 Подморозим ситуацию...'],
    low: ['🥶 Замри... пожалуйста... дай время...'],
  },
  norminette: {
    high: ['🔴 NORMINETTE FAIL! Удалён из проекта!'],
    mid: ['🔴 Проверочка...'],
    low: ['🔴 Хоть Norminette поможет...'],
  },
  ne_pokiday_omsk: {
    high: ['🚫 НЕ ПОКИДАЙ ОМСК!!! Ха-ха!'],
    mid: ['🚫 Ты никуда не уйдёшь!'],
    low: ['🚫 Отчаянный манёвр!'],
  },
  makefile_golem: {
    high: ['⚙️ make destroy && make victory!'],
    mid: ['⚙️ Компиляция...'],
    low: ['⚙️ make help...'],
  },
  blackhole: {
    high: ['🕳️ rm -rf /* УНИЧТОЖИТЬ ВСЁ!!!'],
    mid: ['🕳️ Чёрная дыра поглощает...'],
    low: ['🕳️ Пусть дыра всё решит...'],
  },
  omskaya_vedma: {
    high: ['🧙‍♀️ Ведьма проклинает тебя!'],
    mid: ['🧙‍♀️ Тёмные чары...'],
    low: ['🧙‍♀️ Последнее проклятие...'],
  },
  pirat_irtysha: {
    high: ['🏴‍☠️ АБОРДАЖ!!!'],
    mid: ['🏴‍☠️ Пираты Иртыша в деле!'],
    low: ['🏴‍☠️ Корабль тонет...'],
  },
  kontroler_tramvaya: {
    high: ['🎟️ БИЛЕТИКИ! Сейчас проверим всех!'],
    mid: ['🎟️ Контроль на линии.'],
    low: ['🎟️ Хоть порядок наведу...'],
  },
  himik_npz: {
    high: ['🧪 Формула боли готова!'],
    mid: ['🧪 Реактор стабилен... пока что.'],
    low: ['🧪 Всё равно бахнет...'],
  },
  khroniker_irtysha: {
    high: ['📜 Иртыш подскажет лучший ход!'],
    mid: ['📜 Сверимся с хрониками...'],
    low: ['📜 Хоть летопись не подведи...'],
  },
  arkhivar_omskoi_kreposti: {
    high: ['🗝️ Архивы открыты, знание за нами!'],
    mid: ['🗝️ Ищу подходящую запись...'],
    low: ['🗝️ Ключи ещё могут спасти...'],
  },
  shaman_lukash: {
    high: ['🪶 Духи Левобережья, ведите в бой!'],
    mid: ['🪶 Тотемы пробуждаются.'],
    low: ['🪶 Последний обряд...'],
  },
  bocal: {
    high: ['🏢 Бокал всё контролирует!'],
    mid: ['🏢 Бокал наблюдает...'],
    low: ['🏢 Бокал... помоги...'],
  },
  duh_sibiri: {
    high: ['🌲 ДУХ СИБИРИ ПРОБУДИЛСЯ!'],
    mid: ['🌲 Тайга зовёт...'],
    low: ['🌲 Сибирь, дай силы...'],
  },
  _default: {
    high: ['Мощь Омска не остановить! ⚔️', 'За Омск! За победу!'],
    mid: ['Посмотрим, кто сильнее...', 'Продолжаем бой!'],
    low: ['Помогите... 😰', 'Нужно что-то придумать...'],
  },
};

function getComment(cardId: string, hp: number, maxHp: number): string {
  const c = COMMENTS[cardId] || COMMENTS['_default'];
  const r = hp / maxHp;
  const pool = r > 0.6 ? c.high : r > 0.3 ? c.mid : c.low;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ====== HELPERS ======
function kw(card: CardInstance, keyword: string): boolean {
  return card.keywords.includes(keyword as CardInstance['keywords'][number]);
}

function canCreatureAttack(c: CardInstance): boolean {
  return !c.summoningSickness && !c.hasAttacked && c.frozen <= 0 && !kw(c, 'defender');
}

// Only 'defender' is a mandatory blocker in MTG rules.
// Vigilance allows attacking without tapping but does NOT force enemies to attack it.
function getPlayerDefenders(p: PlayerState): CardInstance[] {
  return p.field.filter((c) => kw(c, 'defender') && c.frozen <= 0 && c.currentHealth > 0);
}

// ====== MAIN AI TURN ======
export type AIAttackAction =
  | { type: 'attack-hero'; attackerUid: string }
  | { type: 'attack-creature'; attackerUid: string; defenderUid: string };

export function aiTurn(state: GameState): {
  state: GameState;
  comment: string | null;
  actions: AIAttackAction[];
} {
  let gs = JSON.parse(JSON.stringify(state)) as GameState;
  let lastComment: string | null = null;
  const actions: AIAttackAction[] = [];

  // ========== PHASE 1: PLAY A LAND ==========
  const landInHand = gs.player2.hand.find((c) => c.data.type === 'land');
  const preferredLand = gs.player2.hand.find((c) => c.data.id === 'ploshchad_buhgoltsa');
  if ((preferredLand || landInHand) && gs.player2.landsPlayed < gs.player2.maxLandsPerTurn) {
    const landToPlay = preferredLand || landInHand;
    if (landToPlay) {
      const next = playCard(gs, 'player2', landToPlay.uid);
      if (next !== gs) gs = next;
    }
  }

  // ========== PHASE 2: PLAY CARDS (priority-based) ==========
  let played = true;
  let safety = 0;
  while (played && safety < 20) {
    safety++;
    played = false;

    const ai = gs.player2;
    const enemy = gs.player1;

    // Get all playable cards and score them
    const playable = ai.hand
      .filter((c) => c.data.type !== 'land' && c.data.cost <= ai.mana)
      .map((c) => ({ card: c, score: scoreCardToPlay(c, ai, enemy) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    if (playable.length === 0) break;

    const best = playable[0];

    // Don't play creatures if field is full
    if (best.card.data.type === 'creature' && ai.field.length >= 7) {
      // Try next card that isn't a creature
      const nonCreature = playable.find((x) => x.card.data.type !== 'creature');
      if (!nonCreature) break;
      const next = playCard(gs, 'player2', nonCreature.card.uid);
      if (next !== gs) {
        gs = next;
        played = true;
        lastComment = getComment(nonCreature.card.data.id, gs.player2.health, gs.player2.maxHealth);
      }
      continue;
    }

    const prev = gs;
    const next = playCard(gs, 'player2', best.card.uid);
    if (next !== prev) {
      gs = next;
      played = true;
      lastComment = getComment(best.card.data.id, gs.player2.health, gs.player2.maxHealth);
    }
  }

  // ========== PHASE 3: ATTACK ==========
  // Recalculate attackers from current state
  let attackers = gs.player2.field.filter(canCreatureAttack);

  // Check for lethal: can we kill the player this turn?
  const defenders = getPlayerDefenders(gs.player1);
  const canBypassDefenders = (c: CardInstance) =>
    kw(c, 'unblockable') || (kw(c, 'flying') && !defenders.some((d) => kw(d, 'flying')));

  const bypassDamage = attackers
    .filter(canBypassDefenders)
    .reduce((s, c) => s + getEffectiveAttack(c, gs.player2, gs.player1), 0);

  const isLethal =
    defenders.length === 0 &&
    attackers.reduce((s, c) => s + getEffectiveAttack(c, gs.player2, gs.player1), 0) >=
      gs.player1.health;

  const isLethalWithBypass = bypassDamage >= gs.player1.health;

  // Execute attacks one by one
  for (let i = 0; i < 20; i++) {
    // Refresh attacker list each iteration (creatures may have died)
    attackers = gs.player2.field.filter(canCreatureAttack);
    if (attackers.length === 0) break;

    const att = attackers[0]; // Take first available attacker
    const atkPow = getEffectiveAttack(att, gs.player2, gs.player1);
    const atkHp = getEffectiveHealth(att, gs.player2);

    // Refresh defenders
    const currentDefenders = getPlayerDefenders(gs.player1);

    // === STRATEGY: can we bypass defenders? ===
    const canBypass = canBypassDefenders(att);

    // Go for lethal!
    if (isLethal || isLethalWithBypass) {
      if (canBypass || currentDefenders.length === 0) {
        const next = attackPlayer(gs, 'player2', att.uid);
        if (next !== gs) {
          gs = next;
          actions.push({ type: 'attack-hero', attackerUid: att.uid });
          if (!lastComment) lastComment = '⚔️ ЗА ОМСК!!! ФИНАЛЬНАЯ АТАКА!!!';
        }
        if (gs.gameOver) break;
        continue;
      }
    }

    // === Can bypass defenders → attack face ===
    if (canBypass && currentDefenders.length > 0) {
      const next = attackPlayer(gs, 'player2', att.uid);
      if (next !== gs) {
        gs = next;
        actions.push({ type: 'attack-hero', attackerUid: att.uid });
        if (!lastComment)
          lastComment = getComment(att.data.id, gs.player2.health, gs.player2.maxHealth);
      }
      if (gs.gameOver) break;
      continue;
    }

    // === Must attack defenders first ===
    if (currentDefenders.length > 0) {
      const target = findBestTarget(att, atkPow, atkHp, currentDefenders, gs.player2, gs.player1);
      if (target) {
        const next = attackCreature(gs, 'player2', att.uid, target.uid);
        if (next !== gs) {
          gs = next;
          actions.push({ type: 'attack-creature', attackerUid: att.uid, defenderUid: target.uid });
          if (!lastComment)
            lastComment = getComment(att.data.id, gs.player2.health, gs.player2.maxHealth);
        }
      } else {
        // No good target, skip this attacker (mark as attacked to prevent infinite loop)
        att.hasAttacked = true;
      }
      if (gs.gameOver) break;
      continue;
    }

    // === No defenders: evaluate trade vs face ===
    const enemyCreatures = gs.player1.field.filter((c) => c.currentHealth > 0);
    const trade = findBestTrade(att, atkPow, atkHp, enemyCreatures, gs.player2, gs.player1);

    if (trade && trade.score > 25) {
      // Good trade available — take it
      const next = attackCreature(gs, 'player2', att.uid, trade.uid);
      if (next !== gs) {
        gs = next;
        actions.push({ type: 'attack-creature', attackerUid: att.uid, defenderUid: trade.uid });
        if (!lastComment)
          lastComment = getComment(att.data.id, gs.player2.health, gs.player2.maxHealth);
      }
    } else {
      // Go face!
      const next = attackPlayer(gs, 'player2', att.uid);
      if (next !== gs) {
        gs = next;
        actions.push({ type: 'attack-hero', attackerUid: att.uid });
        if (!lastComment)
          lastComment = getComment(att.data.id, gs.player2.health, gs.player2.maxHealth);
      }
    }

    if (gs.gameOver) break;
  }

  // ========== PHASE 4: END TURN ==========
  gs = endTurn(gs);
  return { state: gs, comment: lastComment, actions };
}

// ========== CARD SCORING ==========
function scoreCardToPlay(card: CardInstance, ai: PlayerState, enemy: PlayerState): number {
  const enemyThreat = enemy.field.reduce(
    (s, c) => s + (c.currentAttack || 0) * 1.5 + (c.currentHealth || 0) * 0.5,
    0
  );
  const aiFieldStrength = ai.field.reduce(
    (s, c) => s + (c.currentAttack || 0) + (c.currentHealth || 0) * 0.5,
    0
  );
  const aiHealthRatio = ai.health / ai.maxHealth;

  if (card.data.type === 'creature') {
    let s = 10 + (card.data.attack || 0) * 3 + (card.data.health || 0) * 1.5;

    // Keyword bonuses
    if (card.keywords.includes('haste')) s += 12; // Can attack immediately!
    if (
      (card.keywords.includes('defender') || card.keywords.includes('vigilance')) &&
      enemyThreat > 4
    )
      s += 15;
    if (
      (card.keywords.includes('defender') || card.keywords.includes('vigilance')) &&
      aiHealthRatio < 0.5
    )
      s += 20;
    if (card.keywords.includes('flying')) s += 5;
    if (card.keywords.includes('deathtouch')) s += 8;
    if (card.keywords.includes('lifelink') && aiHealthRatio < 0.7) s += 10;
    if (card.keywords.includes('trample')) s += 4;

    // Mana efficiency: prefer cards that use most of our mana
    s += Math.min(card.data.cost, 5) * 2;

    // If we have no field presence, creatures are extra important
    if (ai.field.length === 0) s += 15;
    if (card.data.id === 'khroniker_irtysha') s += ai.deck.length >= 2 ? 8 : 2;
    if (card.data.id === 'arkhivar_omskoi_kreposti')
      s += ai.hand.some((h) => h.data.type === 'spell') ? 10 : 3;

    return s;
  }

  if (card.data.type === 'spell') {
    // Removal spells — high priority when enemy has threats
    if (['norminette', 'yama_na_doroge', 'siberian_gnev'].includes(card.data.id)) {
      if (enemy.field.length === 0) return -10; // No targets
      return 40 + enemyThreat;
    }

    if (card.data.id === 'vzryv_gaza') {
      const enemyCount = enemy.field.length;
      const myCount = ai.field.length;
      if (enemyCount >= 3 && myCount <= 1) return 70; // Great board clear
      if (enemyCount >= 2 && enemyCount > myCount) return 40;
      return -5; // Don't kill our own stuff
    }

    if (card.data.id === 'moroz_50') {
      return enemy.field.length >= 2 ? 45 : enemy.field.length === 1 ? 15 : -5;
    }

    if (card.data.id === 'ne_pokiday_omsk') {
      if (enemy.field.length === 0) return -10;
      const strongest = enemy.field.reduce((a, b) =>
        (b.currentAttack || 0) > (a.currentAttack || 0) ? b : a
      );
      return 25 + (strongest.currentAttack || 0) * 5;
    }

    if (card.data.id === 'omskiy_optimism' || card.data.id === 'bozhestvenniy_svet') {
      if (aiHealthRatio < 0.5) return 50;
      if (aiHealthRatio < 0.7) return 30;
      return 10;
    }

    if (card.data.id === 'shaverma_power' || card.data.id === 'debug_mode') {
      return ai.field.length > 0 ? 30 : -5;
    }

    if (card.data.id === 'probka_lenina') {
      return enemy.field.length >= 2 ? 35 : 10;
    }

    if (card.data.id === 'pivo_sibirskoe') return 20; // Card draw always decent
    if (card.data.id === 'peer_review') return 18;
    if (card.data.id === 'ledyanoy_veter') return enemy.field.length > 0 ? 22 : -5;
    if (card.data.id === 'tuman_nad_irtyshom')
      return enemy.field.length >= 2 ? 34 : enemy.field.length === 1 ? 18 : -5;
    if (card.data.id === 'svodka_112') return enemy.field.length > 0 ? 28 : 6;
    if (card.data.id === 'segfault') return enemy.field.length > 0 ? 15 : -5;
    if (card.data.id === 'exam_42') return enemy.hand.length >= 4 ? 20 : 5;

    return 15; // Default spell score
  }

  if (card.data.type === 'enchantment') {
    if (card.data.id === 'metro_mechta') return 40; // Extra draw is always great
    if (card.data.id === 'duh_omska') return 35;
    if (card.data.id === 'omskaya_zima') return enemy.field.length >= 1 ? 45 : 30;
    if (card.data.id === 'blagoustroistvo') return aiFieldStrength > 5 ? 35 : 20;
    if (card.data.id === 'holy_graph') return 30;
    if (card.data.id === 'klyatva_metrostroya') return ai.field.length >= 2 ? 32 : 18;
    if (card.data.id === 'golos_telebashni') return enemy.hand.length >= 4 ? 34 : 16;
    if (card.data.id === 'zarya_pobedy') return ai.field.length >= 2 ? 30 : 15;
    return 20;
  }

  return 0;
}

// ========== FIND BEST TARGET (for mandatory defender attacks) ==========
function findBestTarget(
  att: CardInstance,
  atkPow: number,
  atkHp: number,
  targets: CardInstance[],
  aiPlayer: PlayerState,
  enemyPlayer: PlayerState
): CardInstance | null {
  let best: CardInstance | null = null;
  let bestScore = -999;

  for (const t of targets) {
    // Can't attack flying without flying
    if (kw(t, 'flying') && !kw(att, 'flying')) continue;

    const tHp = getEffectiveHealth(t, enemyPlayer);
    const tAtk = getEffectiveAttack(t, enemyPlayer, aiPlayer);
    const canKill = atkPow >= tHp || kw(att, 'deathtouch');
    const willSurvive = tAtk < atkHp || (kw(att, 'first_strike') && canKill);

    let score = 0;
    if (canKill && willSurvive)
      score = 100 + (t.data.cost || 0) * 5; // Best: kill and survive
    else if (canKill)
      score = 50 + (t.data.cost || 0) * 3; // OK: kill but die
    else if (willSurvive)
      score = 30; // Chip damage, survive
    else score = 10; // Bad trade but must attack defenders

    // Prioritize high-attack targets
    score += tAtk * 2;

    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }

  // Always return something for defenders (must attack them)
  return best || targets[0] || null;
}

// ========== FIND BEST VOLUNTARY TRADE ==========
function findBestTrade(
  att: CardInstance,
  atkPow: number,
  atkHp: number,
  enemies: CardInstance[],
  aiPlayer: PlayerState,
  enemyPlayer: PlayerState
): { uid: string; score: number } | null {
  let best: { uid: string; score: number } | null = null;

  for (const e of enemies) {
    // Can't attack flying without flying
    if (kw(e, 'flying') && !kw(att, 'flying')) continue;

    const eHp = getEffectiveHealth(e, enemyPlayer);
    const eAtk = getEffectiveAttack(e, enemyPlayer, aiPlayer);
    const canKill = atkPow >= eHp || kw(att, 'deathtouch');
    const willSurvive = eAtk < atkHp || (kw(att, 'first_strike') && canKill);

    let score = 0;

    // Scoring trades
    if (canKill && willSurvive) {
      score = 60 + (e.data.cost || 0) * 5 + eAtk * 3; // Great trade
    } else if (canKill && !willSurvive) {
      // Worth it if target is more valuable
      const valueDiff = (e.data.cost || 0) - (att.data.cost || 0);
      score = 20 + valueDiff * 5 + eAtk * 2;
    }

    // Priority bonuses for dangerous targets
    if (eAtk >= 5 && canKill) score += 30; // Kill big threats
    if (kw(e, 'lifelink') && canKill) score += 25;
    if (kw(e, 'deathtouch') && canKill && willSurvive) score += 20;
    if (kw(e, 'unblockable') && canKill) score += 35; // MUST kill unblockable

    if (!best || score > best.score) {
      best = { uid: e.uid, score };
    }
  }

  return best;
}
