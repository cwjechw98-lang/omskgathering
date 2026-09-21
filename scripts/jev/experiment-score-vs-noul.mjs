/**
 * Эксперимент: почему Score провалился — примитив или моя рубрика?
 *
 * ПРЕДЫСТОРИЯ. Первая калибровка использовала Score с абстрактными уровнями
 * («недооценена», «в норме», «переоценена»). Все 20 карт получили 2.09–2.15 из 4
 * при уверенности 0.64 — сжатие к середине. Я записал вывод «Score не работает
 * для суждений» и перешёл на Noul.
 *
 * ЧТО ГОВОРИТ ДОКУМЕНТАЦИЯ (docs.typesafe.ai/primitives/score):
 *   - «Describe situations, not degrees». «Moderately severe» не даёт модели
 *     ничего, с чем сопоставить состояние.
 *   - «The model doesn't see a level's number or its neighbours» — каждый уровень
 *     оценивается отдельно против состояния, «хуже предыдущего» для модели пусто.
 *   - Если уровни только числа: score 0.55 при уверенности 0.33. Те же данные с
 *     описательными уровнями: 0.0 при уверенности 1.0.
 *
 * ГИПОТЕЗА: провалился не Score, а мои абстрактные уровни. Конкретные уровни-ситуации
 * должны разделять карты.
 *
 * КАК ПРОВЕРЯЮ. Задача одна и та же, меняется только форма вопроса. Ответ известен
 * заранее и считается кодом: разница = статы − 2×мана.
 *   A. Score, абстрактные уровни      — воспроизводит провал?
 *   B. Score, уровни-ситуации          — лечит?
 *   C. Noul (текущий рабочий вариант)  — база для сравнения
 *
 * Запуск: node scripts/jev/experiment-score-vs-noul.mjs
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CLIENT = pathToFileURL(
  join(homedir(), '.dsh', 'skills', 'jev-decision-judge', 'scripts', 'jev.mjs'),
).href;
const { ask } = await import(CLIENT);

const raw = JSON.parse(readFileSync('reports/cards.json', 'utf8'));
const all = Array.isArray(raw) ? raw : raw.cards;
const creatures = all.filter((c) => c.type === 'creature');

/** Разница = статы − норма. Считает код, это и есть известный ответ. */
const gapOf = (c) => (c.attack ?? 0) + (c.health ?? 0) - 2 * c.cost;

/** Три уровня-ситуации: каждая описывает положение, а не степень. */
const SITUATIONS = [
  'Карта сильно отстаёт от кривой: её статы на 4 и более ниже нормы, и без очень сильной способности она не окупает ману',
  'Карта немного отстаёт: статы на 2–3 ниже нормы, такое отставание обычно оплачено способностью',
  'Карта в норме или выше: статы не ниже нормы больше чем на 1',
];

/** Те же три уровня, но абстрактные — так я формулировал в первой калибровке. */
const ABSTRACT = [
  'Карта сильно недооценена',
  'Карта немного недооценена',
  'Карта сбалансирована или переоценена',
];

const state = [
  'Игра: «Омск: Собрание», ККИ в стиле Magic: the Gathering.',
  'Кривая: существо обычно даёт около 2 суммарных статов (атака + здоровье) за единицу маны.',
  'Все числа уже посчитаны — считать не нужно.',
  '',
  'Существа:',
  ...creatures.map((c, i) => {
    const stats = (c.attack ?? 0) + (c.health ?? 0);
    const g = gapOf(c);
    return (
      `${i + 1}. ${c.name} (id: ${c.id}) — цена ${c.cost} маны. ` +
      `Статы: ${c.attack ?? 0}/${c.health ?? 0} = ${stats}. Норма за эту цену: ${2 * c.cost}. ` +
      `Разница (статы минус норма): ${g > 0 ? '+' : ''}${g}. Способность: ${c.description}`
    );
  }),
].join('\n');

// ─── Три варианта формы вопроса ─────────────────────────────────────────────

function scoreQuestions(levels, tag) {
  const q = {};
  for (const c of creatures) {
    q[`${tag}_${c.id}`] = {
      type: 'score',
      instructions: `Насколько карта «${c.name}» отстаёт от кривой по статам?`,
      criteria: levels,
    };
  }
  return q;
}

function noulQuestions() {
  const q = {};
  for (const c of creatures) {
    q[`noul_${c.id}`] = {
      type: 'noul',
      instructions:
        `Разница для карты «${c.name}» отрицательная настолько, что карта не окупает свою ману ` +
        'и заметно слабее нормы (разница −2 или хуже)?',
      criteria: {
        true: 'Разница −2 или меньше: карта заметно слабее нормы',
        false: 'Разница −1, 0 или больше: карта в пределах нормы',
      },
    };
  }
  return q;
}

console.log('существ:', creatures.length);
console.log('известный ответ считает код: разница = статы − 2×мана');
console.log('');

console.log('A. Score с абстрактными уровнями...');
const a = await ask(state, scoreQuestions(ABSTRACT, 'abs'));
console.log('B. Score с уровнями-ситуациями...');
const b = await ask(state, scoreQuestions(SITUATIONS, 'sit'));
console.log('C. Noul (текущий рабочий вариант)...\n');
const c = await ask(state, noulQuestions());

// ─── Разбор ─────────────────────────────────────────────────────────────────

function spread(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max, range: max - min };
}

const absScores = creatures.map((x) => a.answers[`abs_${x.id}`]?.score ?? 0);
const absConf = creatures.map((x) => a.answers[`abs_${x.id}`]?.confidence ?? 0);
const sitScores = creatures.map((x) => b.answers[`sit_${x.id}`]?.score ?? 0);
const sitConf = creatures.map((x) => b.answers[`sit_${x.id}`]?.confidence ?? 0);

const absSpread = spread(absScores);
const sitSpread = spread(sitScores);

/** Корреляция Пирсона между ответом модели и известной разницей. */
function pearson(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i += 1) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

const gaps = creatures.map(gapOf);
// Знак: чем хуже разница, тем выше должен быть уровень «отстаёт».
const rAbs = pearson(absScores, gaps.map((g) => -g));
const rSit = pearson(sitScores, gaps.map((g) => -g));

console.log('=== разброс ответов (0..2, выше = сильнее отстаёт) ===');
console.log(`A. абстрактные уровни:  ${absSpread.min.toFixed(2)} … ${absSpread.max.toFixed(2)}  (размах ${absSpread.range.toFixed(2)})`);
console.log(`B. уровни-ситуации:     ${sitSpread.min.toFixed(2)} … ${sitSpread.max.toFixed(2)}  (размах ${sitSpread.range.toFixed(2)})`);
console.log('');
console.log('=== средняя уверенность ===');
console.log(`A. абстрактные: ${(absConf.reduce((s, v) => s + v, 0) / absConf.length).toFixed(2)}`);
console.log(`B. ситуации:    ${(sitConf.reduce((s, v) => s + v, 0) / sitConf.length).toFixed(2)}`);
console.log('');
console.log('=== связь с известным ответом (Пирсон, 1.0 = идеально) ===');
console.log(`A. абстрактные уровни:  r = ${rAbs.toFixed(3)}`);
console.log(`B. уровни-ситуации:     r = ${rSit.toFixed(3)}`);
console.log('');

// ─── Точность по порогам: уровень 0 против 1-2 и т.д. ───────────────────────

/** Насколько точно Score попадает в «сильно отстаёт» (разница ≤ −4). */
function accuracy(scores, threshold) {
  let hit = 0;
  for (let i = 0; i < creatures.length; i += 1) {
    const fact = gaps[i] <= threshold ? 1 : 0;
    const pred = scores[i] >= 1.5 ? 1 : 0;
    if (fact === pred) hit += 1;
  }
  return hit;
}

const noulHits = creatures.filter((x) => {
  const fact = gapOf(x) <= -2 ? 1 : 0;
  const pred = (c.answers[`noul_${x.id}`]?.noul ?? 0) >= 0.5 ? 1 : 0;
  return fact === pred;
}).length;

console.log('=== точность ===');
console.log(`A. Score абстрактный, порог «сильно отстаёт» (Δ≤−4): ${accuracy(absScores, -4)}/${creatures.length}`);
console.log(`B. Score ситуации,    порог «сильно отстаёт» (Δ≤−4): ${accuracy(sitScores, -4)}/${creatures.length}`);
console.log(`C. Noul,              порог «заметно слабее» (Δ≤−2): ${noulHits}/${creatures.length}`);
console.log('');

const total = a.costUsd + b.costUsd + c.costUsd;
console.log(`цена трёх прогонов: $${total.toFixed(6)}`);
console.log('');

console.log('=== карты с самой большой разницей (глазами) ===');
const sorted = [...creatures].sort((x, y) => gapOf(x) - gapOf(y));
console.log('разница  абстракт  ситуация  noul   карта');
for (const x of sorted.slice(0, 6).concat(sorted.slice(-3))) {
  const av = a.answers[`abs_${x.id}`]?.score ?? 0;
  const sv = b.answers[`sit_${x.id}`]?.score ?? 0;
  const nv = c.answers[`noul_${x.id}`]?.noul ?? 0;
  console.log(
    `${String(gapOf(x)).padStart(6)}  ${av.toFixed(2).padStart(8)}  ${sv.toFixed(2).padStart(8)}  ${nv.toFixed(2).padStart(5)}   ${x.name}`,
  );
}
console.log('');
console.log(
  sitSpread.range > absSpread.range * 1.5 && rSit > rAbs
    ? 'ВЫВОД: провалился не Score, а абстрактные уровни. Конкретные уровни-ситуации разделяют карты.'
    : 'ВЫВОД: разницы между формами нет — причина в примитиве, а не в формулировке уровней.',
);
