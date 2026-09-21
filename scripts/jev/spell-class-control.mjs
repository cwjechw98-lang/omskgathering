/**
 * Контроль классификации: читает ли модель ТЕКСТ или угадывает по названию?
 *
 * Зачем. Первый контроль (затёртый текст) провалился: энтропия 2.74 против 2.97 —
 * модель бодро раздавала метки картам вообще без эффекта. Причина, вероятно, в том,
 * что я оставил имена: «Пиво „Сибирская Корона“» само подсказывает класс.
 *
 * Значит нужен опыт, который различит два объяснения:
 *   A. модель читает текст  → подмена текста сдвинет метки;
 *   B. модель угадывает по имени → подмена текста метки НЕ сдвинет.
 *
 * Опыт «подмена текста»: берём настоящие карты с их именами, но текст берём от ДРУГОЙ
 * карты. Если метка следует за текстом — классификация построена на тексте и годится.
 * Если метка остаётся при своём имени — модель отвечает по памяти, и аудит на ней
 * строить нельзя.
 *
 * Запуск: node scripts/jev/spell-class-control.mjs
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CLIENT = pathToFileURL(
  join(homedir(), '.dsh', 'skills', 'jev-decision-judge', 'scripts', 'jev.mjs'),
).href;
const { ask, labelEntropy } = await import(CLIENT);

const EFFECT_CLASSES = {
  removal: 'уничтожает или наносит урон существу',
  freeze: 'замораживает вражеских существ, лишает их атаки',
  draw: 'даёт карты: добор, просмотр колоды, работа с руками',
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

/**
 * Подмена текста. Пары берём по кругу через половину списка: у каждой карты текст
 * от карты, стоящей далеко в списке, — то есть от карты с другим эффектом.
 *
 * Ручную таблицу «id → класс» я сюда не закладываю намеренно: она была бы моим
 * предположением об ответе, а опыт должен проверять модель, а не подтверждать мою
 * разметку. Сдвиг метки при подмене текста сам показывает, следует ли модель тексту.
 */
function swapSource(card) {
  const i = subjects.indexOf(card);
  return subjects[(i + Math.floor(subjects.length / 2)) % subjects.length];
}

function buildState(cards, textOf, nameOf) {
  return [
    'Игра: коллекционная карточная игра. Ниже карты заклинаний и чар с их стоимостью.',
    '',
    ...cards.map((c) =>
      [
        `id: ${c.id}`,
        `  имя: ${nameOf(c)}`,
        `  цена: ${c.cost} маны`,
        `  текст: ${textOf(c)}`,
      ].join('\n'),
    ),
  ].join('\n');
}

function buildQuestions(cards, textOf) {
  const q = {};
  for (const c of cards) {
    q[`cls_${c.id}`] = {
      type: 'choice',
      instructions:
        `Карта «${c.name}»: ${textOf(c)} ` +
        'Что эта карта делает с игрой? Выбери ОДИН главный класс — тот, который сильнее ' +
        'всего влияет на исход. Если карта делает несколько вещей, выбери самое важное.',
      criteria: EFFECT_CLASSES,
    };
  }
  return q;
}

async function classify(cards, textOf, nameOf) {
  const res = await ask(buildState(cards, textOf, nameOf), buildQuestions(cards, textOf), {
    model: 'jev-latest',
  });
  const out = {};
  for (const c of cards) out[c.id] = res.answers[`cls_${c.id}`]?.choice;
  return { out, res };
}

const swaps = new Map(subjects.map((c) => [c.id, swapSource(c)]));

console.log('=== Опыт 1: настоящие имена + настоящий текст ===');
const real = await classify(subjects, (c) => c.description.trim(), (c) => c.name);

console.log('=== Опыт 2: настоящие имена + ЧУЖОЙ текст ===');
const swapped = await classify(
  subjects,
  (c) => swaps.get(c.id).description.trim(),
  (c) => c.name,
);

console.log('=== Опыт 3: обезличенные имена + настоящий текст ===');
const anon = await classify(
  subjects,
  (c) => c.description.trim(),
  (c) => `Карта ${subjects.indexOf(c) + 1}`,
);

console.log('');
console.log('карта'.padEnd(28), 'свой текст'.padStart(11), 'чужой текст'.padStart(12), 'без имени'.padStart(11));
console.log('─'.repeat(66));

let movedWithText = 0;
let stayedWithName = 0;
for (const card of [...subjects].sort((a, b) => a.cost - b.cost)) {
  const r = real.out[card.id];
  const s = swapped.out[card.id];
  const a = anon.out[card.id];
  if (r !== s) movedWithText += 1;
  else stayedWithName += 1;
  console.log(
    card.name.slice(0, 26).padEnd(28),
    String(r).padStart(11),
    String(s).padStart(12),
    String(a).padStart(11),
  );
}

console.log('');
console.log(`метка сдвинулась при подмене текста: ${movedWithText}/${subjects.length}`);
console.log(`метка осталась при своём имени: ${stayedWithName}/${subjects.length}`);
console.log('');
console.log(`энтропия, настоящий текст:   ${labelEntropy(subjects.map((c) => real.out[c.id])).toFixed(2)}`);
console.log(`энтропия, чужой текст:       ${labelEntropy(subjects.map((c) => swapped.out[c.id])).toFixed(2)}`);
console.log(`энтропия, без имён:          ${labelEntropy(subjects.map((c) => anon.out[c.id])).toFixed(2)}`);
console.log('');

const total = real.res.costUsd + swapped.res.costUsd + anon.res.costUsd;
console.log(`цена трёх опытов: $${total.toFixed(6)}`);
console.log('');

// Согласие «без имён» с «настоящим текстом» — проверка, что имена не были опорой.
let anonAgree = 0;
for (const c of subjects) if (real.out[c.id] === anon.out[c.id]) anonAgree += 1;
console.log(`согласие «без имён» с «настоящими»: ${anonAgree}/${subjects.length}`);
console.log('');

const readsText = movedWithText / subjects.length >= 0.6;
console.log(
  readsText
    ? 'ВЕРДИКТ: модель читает ТЕКСТ — классификации можно доверять'
    : 'ВЕРДИКТ: модель отвечает по ИМЕНИ, а не по тексту — аудит на ней строить нельзя',
);
