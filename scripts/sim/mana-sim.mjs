/**
 * Прогонщик партий: ИИ против ИИ, много партий, статистика по мане.
 *
 * ЗАЧЕМ ЭТО НУЖНО.
 * Шаг 5 поменял цену каждой карты в игре: теперь её платят маной своего цвета,
 * а не любой. Тесты (149 штук) проверяют, что механика работает, но они не
 * отвечают на вопрос «осталась ли игра играбельной». Этот скрипт отвечает числом.
 *
 * ГЛАВНАЯ МЕТРИКА — МЁРТВЫЙ ХОД: ход, в котором у игрока на руке были карты,
 * кроме земель, но он не разыграл ни одной. Это и есть «не повезло с землями»,
 * главная болезнь цветной маны. В MTG её доля обычно 10-15%; заметно больше
 * означает, что правило пипсов слишком строгое.
 *
 * ПРИБОР ОБЯЗАН БЫТЬ ПРОВЕРЕН, а не принят на веру. Поэтому кроме настоящей
 * колоды прогоняются ещё две:
 *   - «плохая база»: те же карты, но все земли белые. Зелёные карты платить
 *     нечем, и доля мёртвых ходов ОБЯЗАНА взлететь. Если не взлетела — метрика
 *     не работает, и все остальные числа ничего не стоят.
 *   - «одноцветная»: цвет не стоит ничего (все земли подходят ко всем картам).
 *     Это ориентир «как было бы без цветных требований».
 *
 * ВАЖНО ПРО ПОДМЕНУ СТОРОН. `aiTurn` в движке жёстко играет за ВТОРОГО игрока
 * и сам завершает ход. Чтобы обе стороны играли одним и тем же ИИ (иначе сила
 * сторон разная и замер нечестный), на ход первого игрока стороны меняются
 * местами, а после хода возвращаются. Прибор проверяет это сам: если после хода
 * очередь не переключилась, скрипт падает громко, а не считает мусор.
 *
 * Запуск:
 *   node --import ./scripts/register-tsx.mjs scripts/sim/mana-sim.mjs [партий-на-пару]
 */

import { createInitialGameState, createCardInstance, drawCard } from '../../src/game/engine.ts';
import { aiTurn } from '../../src/game/ai.ts';
import { ALL_CARDS, createDeck } from '../../src/data/cards.ts';

// ====== ВОСПРОИЗВОДИМОСТЬ ======

/**
 * Детерминированный генератор. Без него прогон нельзя повторить, а значит нельзя
 * и перепроверить: два запуска дали бы разные числа, и спор «это эффект или шум»
 * неразрешим. Патчим Math.random целиком — так воспроизводимым становится весь
 * движок, и трогать его код не нужно.
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = Number(process.env.SIM_SEED ?? 20260922);
Math.random = mulberry32(SEED);

// ====== КОЛОДЫ ======

const LAND = (color) => ALL_CARDS.find((c) => c.type === 'land' && c.color === color);

/**
 * Колода заданных цветов. `landOverride` подменяет ВСЕ земли одной картой, сохраняя
 * их места в колоде: так сохраняется раздача стартовой руки (она гарантирует земли
 * в первых картах), и меняется ровно одно — чем платить.
 */
function deckFrom(colors, landOverride) {
  const data = createDeck(colors);
  const patched = landOverride ? data.map((c) => (c.type === 'land' ? landOverride : c)) : data;
  return patched.map(createCardInstance);
}

function makeState(colors1, colors2, land1, land2) {
  const state = createInitialGameState();
  state.mulliganPhase = false;
  state.log = [];

  const d2 = deckFrom(colors2, land2);
  state.player2.hand = d2.splice(0, 5);
  state.player2.deck = d2;

  const d1 = deckFrom(colors1, land1);
  state.player1.hand = d1.splice(0, 5);
  state.player1.deck = d1;
  // У первого игрока добор в начале партии — как в createInitialGameState.
  drawCard(state.player1, state.log);

  state.log = [];
  return state;
}

// ====== ХОД ======

/**
 * Ход игрока `who` тем же ИИ, что играет за противника в настоящей игре.
 * См. «ВАЖНО ПРО ПОДМЕНУ СТОРОН» в шапке файла.
 */
function aiTurnFor(state, who) {
  if (who === 'player2') {
    const r = aiTurn(state);
    return { state: r.state, actions: r.actions };
  }

  const swapped = {
    ...state,
    player1: state.player2,
    player2: state.player1,
    currentTurn: 'player2',
  };
  const r = aiTurn(swapped);
  const after = r.state;

  return {
    state: {
      ...after,
      player1: after.player2,
      player2: after.player1,
      // В перевёрнутом мире «player1» — это настоящий второй игрок.
      currentTurn: after.currentTurn === 'player1' ? 'player2' : 'player1',
      // И победителя тоже надо перевернуть. Без этой строки движок объявляет победу
      // в перевёрнутом мире, а метка остаётся как есть — и первый игрок, выиграв
      // все партии подряд, записывался как проигравший все подряд. Именно так
      // и выглядел сломанный прибор: 0 побед из 6 при 11 атаках против 8.
      winner:
        after.winner === 'player1' ? 'player2' : after.winner === 'player2' ? 'player1' : after.winner,
    },
    actions: r.actions,
  };
}

// ====== ПАРТИЯ ======

function playGame(colors1, colors2, land1, land2, maxTurns = 150) {
  let gs = makeState(colors1, colors2, land1, land2);

  const stats = {
    turns: 0,
    dead: { player1: 0, player2: 0 },
    turnsWithHand: { player1: 0, player2: 0 },
    cards: { player1: 0, player2: 0 },
    lands: { player1: 0, player2: 0 },
    attacks: { player1: 0, player2: 0 },
  };

  while (!gs.gameOver && stats.turns < maxTurns) {
    const who = gs.currentTurn;
    const handNonLand = gs[who].hand.filter((c) => c.data.type !== 'land').length;

    const result = aiTurnFor(gs, who);
    gs = result.state;
    stats.turns += 1;

    if (gs.currentTurn === who) {
      // Прибор соврал бы тихо: очередь осталась у того же игрока, и цикл
      // прокрутил бы один и тот же ход 150 раз, дав «правдоподобные» числа.
      throw new Error(`Ход не переключился: ${who} отходил, а очередь осталась его`);
    }

    const played = result.actions.filter((a) => a.type === 'play-card');
    const spells = played.filter((a) => a.cardType !== 'land');
    const lands = played.filter((a) => a.cardType === 'land');

    stats.cards[who] += spells.length;
    stats.lands[who] += lands.length;
    stats.attacks[who] += result.actions.filter((a) => a.type !== 'play-card').length;

    if (handNonLand > 0) {
      stats.turnsWithHand[who] += 1;
      if (spells.length === 0) stats.dead[who] += 1;
    }
  }

  return {
    ...stats,
    gameOver: gs.gameOver,
    winner: gs.winner,
    unfinished: !gs.gameOver,
    health: { player1: gs.player1.health, player2: gs.player2.health },
  };
}

// ====== СВОДКА ======

function sum(games) {
  const total = {
    games: games.length,
    turns: 0,
    dead: 0,
    turnsWithHand: 0,
    cards: 0,
    attacks: 0,
    p1Wins: 0,
    p2Wins: 0,
    draws: 0,
    unfinished: 0,
  };
  for (const g of games) {
    total.turns += g.turns;
    total.dead += g.dead.player1 + g.dead.player2;
    total.turnsWithHand += g.turnsWithHand.player1 + g.turnsWithHand.player2;
    total.cards += g.cards.player1 + g.cards.player2;
    total.attacks += g.attacks.player1 + g.attacks.player2;
    if (g.winner === 'player1') total.p1Wins += 1;
    else if (g.winner === 'player2') total.p2Wins += 1;
    else total.draws += 1;
    if (g.unfinished) total.unfinished += 1;
  }
  total.deadRate = total.turnsWithHand ? total.dead / total.turnsWithHand : 0;
  total.avgTurns = total.turns / total.games;
  total.cardsPerGame = total.cards / total.games;
  total.unfinishedRate = total.unfinished / total.games;
  return total;
}

function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function runMirror(label, colors, land, n) {
  const games = [];
  for (let i = 0; i < n; i++) games.push(playGame(colors, colors, land, land));
  const s = sum(games);

  // По сторонам ОТДЕЛЬНО: если подмена сторон сломана, первый игрок будет играть
  // меньше карт и получать больше мёртвых ходов, а суммарные числа это скроют.
  let c1 = 0;
  let c2 = 0;
  let l1 = 0;
  let l2 = 0;
  let d1 = 0;
  let d2 = 0;
  let t1 = 0;
  let t2 = 0;
  let a1 = 0;
  let a2 = 0;
  let hp1 = 0;
  let hp2 = 0;
  for (const g of games) {
    c1 += g.cards.player1;
    c2 += g.cards.player2;
    l1 += g.lands.player1;
    l2 += g.lands.player2;
    d1 += g.dead.player1;
    d2 += g.dead.player2;
    t1 += g.turnsWithHand.player1;
    t2 += g.turnsWithHand.player2;
    a1 += g.attacks.player1;
    a2 += g.attacks.player2;
    hp1 += g.health.player1;
    hp2 += g.health.player2;
  }

  console.log(
    `  ${label.padEnd(34)} мёртвых ходов ${pct(s.deadRate).padStart(6)}  ` +
      `партия ${s.avgTurns.toFixed(1).padStart(5)} ходов  ` +
      `победы 1:${s.p1Wins} 2:${s.p2Wins}`
  );
  console.log(
    `  ${''.padEnd(34)}   первый: карт ${(c1 / n).toFixed(1)} земель ${(l1 / n).toFixed(1)} ` +
      `атак ${(a1 / n).toFixed(1)} мёртвых ${d1}/${t1} здоровье ${(hp1 / n).toFixed(1)}   ` +
      `второй: карт ${(c2 / n).toFixed(1)} земель ${(l2 / n).toFixed(1)} ` +
      `атак ${(a2 / n).toFixed(1)} мёртвых ${d2}/${t2} здоровье ${(hp2 / n).toFixed(1)}`
  );
  return s;
}

// ====== ЗАПУСК ======

const N = Number(process.argv[2] ?? 60);

console.log(`Прогонщик партий: ${N} партий на пару, зерно ${SEED}\n`);

console.log('=== 1. Проверка прибора и играбельность (зеркальные пары) ===');
console.log('    Зеркальная пара: обе стороны играют одну и ту же колоду, поэтому');
console.log('    победы первого игрока обязаны быть около 50%, а мёртвые ходы у сторон —');
console.log('    одинаковыми. Если это не так, подмена сторон сломана и числам верить нельзя.\n');

const whiteGreen = ['white', 'green'];
const normal = runMirror('нормальная база (7 белых + 7 зелёных)', whiteGreen, null, N);
const badBase = runMirror('ПЛОХАЯ база (все 14 земель белые)', whiteGreen, LAND('white'), N);
const colorlessBase = runMirror('все земли бесцветные', whiteGreen, LAND('colorless'), N);
const monoGreen = runMirror('одноцветная зелёная (цвет бесплатен)', ['green'], null, N);
const monoWhite = runMirror('одноцветная белая (цвет бесплатен)', ['white'], null, N);

console.log('\n  Проверка метрики:');
if (badBase.deadRate > normal.deadRate + 0.15) {
  console.log(
    `  ✅ метрика ловит проблему с мана-базой: ${pct(normal.deadRate)} → ${pct(badBase.deadRate)}`
  );
} else {
  console.log(
    `  ❌ метрика НЕ ловит заведомо плохую базу: ${pct(normal.deadRate)} → ${pct(badBase.deadRate)}.`
  );
  console.log('     Числам ниже верить нельзя — сначала чинить прибор.');
  process.exitCode = 1;
}

console.log('\n=== 2. Сила цвета: круговой турнир одноцветных колод ===');
console.log('    Здесь цвет не стоит ничего (все земли подходят ко всем картам),');
console.log('    поэтому разница показывает силу САМИХ КАРТ, а не маны.\n');

const COLORS = ['white', 'blue', 'black', 'red', 'green', 'colorless'];
const wins = Object.fromEntries(COLORS.map((c) => [c, 0]));

// Прежде чем сравнивать цвета, надо посмотреть, ЧТО в их колодах. `createDeck`
// берёт по одной копии каждой карты цвета, а остаток до 26 карт добирает копиями
// САМОЙ ДЕШЁВОЙ. Значит у цвета с меньшим числом карт больше повторов одной карты —
// и разрыв в победах может объясняться не силой цвета, а этим правилом добора.
console.log('  Состав колод по правилу createDeck:');
for (const c of COLORS) {
  const deck = createDeck([c]);
  const counts = new Map();
  for (const card of deck) counts.set(card.name, (counts.get(card.name) ?? 0) + 1);
  const dupes = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => `${n}× ${name}`);
  console.log(
    `    ${c.padEnd(10)} всего ${deck.length}, разных ${counts.size}, повторы: ${dupes.join('; ') || 'нет'}`
  );
}
console.log('');
const played = Object.fromEntries(COLORS.map((c) => [c, 0]));

for (let i = 0; i < COLORS.length; i++) {
  for (let j = i + 1; j < COLORS.length; j++) {
    const a = COLORS[i];
    const b = COLORS[j];
    for (let k = 0; k < N; k++) {
      // Стороны меняются через партию: первый ход — преимущество, и оно не должно
      // достаться одному цвету.
      const swap = k % 2 === 1;
      const g = swap ? playGame([b], [a], null, null) : playGame([a], [b], null, null);
      const winner = swap ? (g.winner === 'player1' ? b : g.winner === 'player2' ? a : null)
                          : (g.winner === 'player1' ? a : g.winner === 'player2' ? b : null);
      played[a] += 1;
      played[b] += 1;
      if (winner) wins[winner] += 1;
    }
  }
}

const ranking = COLORS.map((c) => ({
  color: c,
  winRate: wins[c] / played[c],
  games: played[c],
}))
  // Стандартная ошибка доли: без неё разницу в 3% легко принять за открытие.
  .map((r) => ({ ...r, se: Math.sqrt((r.winRate * (1 - r.winRate)) / r.games) }))
  .sort((a, b) => b.winRate - a.winRate);

for (const r of ranking) {
  console.log(
    `  ${r.color.padEnd(10)} победы ${pct(r.winRate).padStart(6)} ± ${pct(r.se)}  (${r.games} партий)`
  );
}
const spread = ranking[0].winRate - ranking[ranking.length - 1].winRate;
const spreadSe = Math.sqrt(ranking[0].se ** 2 + ranking[ranking.length - 1].se ** 2);
console.log(
  `\n  Разрыв между первым и последним: ${pct(spread)} ± ${pct(spreadSe)}. ` +
    (spread > 2 * spreadSe
      ? 'Разрыв больше двух ошибок — это, похоже, настоящая разница.'
      : 'Разрыв в пределах двух ошибок — по этим данным цвета равны.')
);

console.log('\n=== 3. Итог ===');
console.log(`  Мёртвых ходов в настоящей колоде: ${pct(normal.deadRate)}`);
console.log(`  Ориентир MTG: 10-15%. Больше — правило пипсов слишком строгое.`);
