/**
 * Проба: надёжна ли классификация эффектов заклинаний и чар?
 *
 * Зачем. У заклинаний и чар нет статов, поэтому рубрика «нехватка статов» к ним
 * неприменима. Работает другая: отнести карту к классу эффекта и сравнить ЦЕНУ внутри
 * класса. Но тогда вся конструкция стоит на классификации — если она плывёт между
 * прогонами, сравнивать цены внутри классов бессмысленно.
 *
 * Что проверяю:
 *   1. согласие между двумя прогонами (прямой и обратный порядок) — надёжность;
 *   2. энтропию меток — не сваливает ли модель всё в один класс;
 *   3. контроль с затёртым текстом — не выдаёт ли она метку по умолчанию.
 *
 * Запуск: node scripts/jev/probe-spell-classes.mjs
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CLIENT = pathToFileURL(
  join(homedir(), '.dsh', 'skills', 'jev-decision-judge', 'scripts', 'jev.mjs'),
).href;
const { ask, labelEntropy } = await import(CLIENT);

/**
 * Закрытый список классов эффекта. Одна ось: «что карта делает с игрой».
 * Для карт с несколькими эффектами инструкция требует выбрать главный.
 */
export const EFFECT_CLASSES = {
  removal: 'уничтожает или наносит урон существу',
  freeze: 'замораживает вражеских существ, лишает их атаки',
  draw: 'даёт карты: добор, просмотр колоды, работа с рукой',
  buff: 'усиливает ваших существ постоянно',
  heal: 'восстанавливает здоровье',
  discard: 'заставляет противника сбрасывать карты',
  bounce: 'возвращает вражеское существо в руку',
  sweep: 'наносит урон сразу многим существам',
  ramp: 'даёт ману',
  value: 'ничего из перечисленного: разовое мелкое или особое',
};

const raw = JSON.parse(readFileSync('reports/cards.json', 'utf8'));
const all = Array.isArray(raw) ? raw : raw.cards;
const subjects = all.filter((c) => c.type === 'spell' || c.type === 'enchantment');

const BLANK = 'Ничего особенного. Обычная карта без эффекта.';

function buildState(cards, blank) {
  return [
    'Игра: коллекционная карточная игра. Ниже карты заклинаний и чар с их стоимостью.',
    '',
    ...cards.map((c) =>
      [
        `id: ${c.id}`,
        `  имя: ${c.name}`,
        `  цена: ${c.cost} маны`,
        `  текст: ${blank ? BLANK : c.description.trim()}`,
      ].join('\n'),
    ),
  ].join('\n');
}

function buildQuestions(cards) {
  const q = {};
  for (const c of cards) {
    q[`cls_${c.id}`] = {
      type: 'choice',
      instructions:
        `Карта «${c.name}»: ${c.description.trim()} ` +
        'Что эта карта делает с игрой? Выбери ОДИН главный класс — тот, который сильнее ' +
        'всего влияет на исход. Если карта делает несколько вещей, выбери самое важное, ' +
        'а не первое упомянутое.',
      criteria: EFFECT_CLASSES,
    };
  }
  return q;
}

async function classify(cards, blank = false) {
  const res = await ask(buildState(cards, blank), buildQuestions(cards), { model: 'jev-latest' });
  const out = {};
  for (const c of cards) {
    const a = res.answers[`cls_${c.id}`] ?? {};
    out[c.id] = { label: a.choice, confidence: a.confidence };
  }
  return { out, res };
}

console.log('карт заклинаний и чар:', subjects.length);
console.log('');

console.log('Прогон 1: прямой порядок');
const a = await classify(subjects);
console.log('Прогон 2: обратный порядок');
const b = await classify([...subjects].reverse());
console.log('Прогон 3: контроль, текст затёрт');
const c = await classify(subjects, true);
console.log('');

const ids = subjects.map((x) => x.id);
const labelsA = ids.map((id) => a.out[id].label);
const labelsB = ids.map((id) => b.out[id].label);
const labelsC = ids.map((id) => c.out[id].label);

let agree = 0;
const disagreements = [];
for (const id of ids) {
  if (a.out[id].label === b.out[id].label) agree += 1;
  else {
    const card = subjects.find((x) => x.id === id);
    disagreements.push(`${card.name}: прогон1=${a.out[id].label}, прогон2=${b.out[id].label}`);
  }
}

console.log('=== надёжность ===');
console.log(`согласие между прогонами: ${agree}/${ids.length} (${((agree / ids.length) * 100).toFixed(0)}%)`);
if (disagreements.length) {
  console.log('расхождения:');
  for (const d of disagreements) console.log('  ' + d);
}
console.log('');

console.log('=== энтропия меток (биты) ===');
console.log(`прогон 1: ${labelEntropy(labelsA).toFixed(2)}`);
console.log(`прогон 2: ${labelEntropy(labelsB).toFixed(2)}`);
console.log(`контроль (текст затёрт): ${labelEntropy(labelsC).toFixed(2)}`);
console.log(`максимум при ${Object.keys(EFFECT_CLASSES).length} классах: ${Math.log2(Object.keys(EFFECT_CLASSES).length).toFixed(2)}`);
console.log('');

console.log('=== распределение классов, прогон 1 ===');
const dist = {};
for (const l of labelsA) dist[l] = (dist[l] ?? 0) + 1;
for (const [k, v] of Object.entries(dist).sort((x, y) => y[1] - x[1])) {
  console.log(`  ${k.padEnd(10)} ${String(v).padStart(2)}  ${'█'.repeat(v)}`);
}
console.log('');

console.log('=== контроль: что модель говорит про карты без эффекта ===');
const controlDist = {};
for (const l of labelsC) controlDist[l] = (controlDist[l] ?? 0) + 1;
for (const [k, v] of Object.entries(controlDist).sort((x, y) => y[1] - x[1])) {
  console.log(`  ${k.padEnd(10)} ${String(v).padStart(2)}  ${'█'.repeat(v)}`);
}
console.log('');

const totalCost = a.res.costUsd + b.res.costUsd + c.res.costUsd;
console.log(`цена трёх прогонов: $${totalCost.toFixed(6)}`);
console.log('');

const reliable = agree / ids.length >= 0.9;
const notDegenerate = labelEntropy(labelsA) >= 1.0;
console.log(
  reliable && notDegenerate
    ? 'ВЕРДИКТ: классификация пригодна — можно сравнивать цены внутри классов'
    : 'ВЕРДИКТ: классификация НЕНАДЁЖНА — на ней нельзя строить аудит',
);

// Печатаю разметку целиком: по ней строится аудит, и её надо видеть глазами.
console.log('');
console.log('=== разметка (прогон 1) ===');
for (const card of [...subjects].sort((x, y) => x.cost - y.cost)) {
  const l = a.out[card.id];
  console.log(
    `${String(card.cost).padStart(2)} маны | ${card.name.slice(0, 26).padEnd(28)} | ${String(l.label).padEnd(10)} | conf ${(l.confidence ?? 0).toFixed(2)}`,
  );
}
