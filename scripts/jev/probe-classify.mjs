/**
 * Проба: умеет ли Jev классифицировать текст способности?
 *
 * Зачем. Баланс карт упирается в вопрос «оправдывает ли способность недобранные статы».
 * Арифметику статов считает код. Но чтобы код мог применить цену способности, способность
 * надо сначала отнести к типу: уничтожение, добор карт, усиление, лечение, разгон маны,
 * уклонение, чистая проза.
 *
 * Это ровно та работа, которая подходит Jev: суждение по прозе с закрытым списком ответов.
 * Проба проверяет две вещи, без которых строить пайплайн нельзя:
 *   1. различает ли он типы вообще (не сваливает ли всё в один);
 *   2. согласуется ли его разметка с ключевыми словами, которые уже проставлены в коде.
 *
 * Второе — встроенная проверка на известных ответах: карта с flying обязана попасть
 * в «уклонение», карта с deathtouch — в «уничтожение».
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Клиент берём из скилла — он переносимый и не дублируется в проекте.
const CLIENT = pathToFileURL(
  join(homedir(), '.dsh', 'skills', 'jev-decision-judge', 'scripts', 'jev.mjs'),
).href;
const { ask } = await import(CLIENT);

const cards = JSON.parse(readFileSync('reports/cards.json', 'utf8'));
const list = Array.isArray(cards) ? cards : cards.cards;

const ARCHETYPES = {
  removal: 'уничтожение или урон по чужому существу',
  draw: 'добор карт или работа с рукой и колодой',
  buff: 'усиление своих существ или себя',
  heal: 'восстановление здоровья',
  ramp: 'разгон маны, дополнительные ресурсы',
  evasion: 'уклонение: полёт, неблокируемость, защита от целей',
  none: 'только вкусовой текст, механики нет',
};

/** Ключевые слова → ожидаемый архетип. Это известные ответы для проверки. */
const KEYWORD_TO_ARCHETYPE = {
  flying: 'evasion',
  unblockable: 'evasion',
  hexproof: 'evasion',
  deathtouch: 'removal',
  first_strike: 'removal',
  lifelink: 'heal',
  vigilance: 'buff',
  haste: 'buff',
  trample: 'buff',
  defender: 'buff',
};

/** Русские названия механик: по ним видно, что текст описывает механику, а не прозу. */
const RU_MECHANICS = [
  'Полёт', 'Защитник', 'Ускорение', 'Первый удар', 'Смертельное касание',
  'Привязка к жизни', 'Бдительность', 'Натиск', 'Неблокируемый', 'Защита от',
];

function codeFacts(card) {
  const attack = card.attack ?? 0;
  const health = card.health ?? 0;
  const cost = card.cost ?? 0;
  const stats = attack + health;
  const norm = 2 * cost;
  const delta = stats - norm;
  const text = (card.description ?? '').trim();
  const explicit = RU_MECHANICS.filter((m) => text.includes(m));
  return { attack, health, cost, stats, norm, delta, text, explicit, keywords: card.keywords ?? [] };
}

const creatures = list.filter((c) => c.type === 'creature');

// Берём существа с разными ключевыми словами, чтобы проверить согласованность разметки.
const sample = creatures.slice(0, 20);

const state = [
  'Игра: коллекционная карточная игра. Ниже существа с посчитанными характеристиками.',
  '',
  ...sample.map((c) => {
    const f = codeFacts(c);
    return [
      `id: ${c.id}`,
      `  имя: ${c.name}`,
      `  цена: ${f.cost} маны, ${f.attack}/${f.health} (сумма статов ${f.stats})`,
      `  механики в коде: ${f.keywords.length ? f.keywords.join(', ') : 'нет'}`,
      `  текст: ${f.text}`,
    ].join('\n');
  }),
].join('\n');

const questions = {};
for (const c of sample) {
  // По вопросу на карту: `choice` — это ОДИН ответ на вопрос, а не словарь по объектам.
  // Пытаться разметить весь набор одним вопросом — неверная постановка, проверено.
  questions[`arch_${c.id}`] = {
    type: 'choice',
    instructions:
      `Существо «${c.name}»: ${c.description.trim()} ` +
      'К какому типу относится его текст способности? Если механики нет и текст только ' +
      'вкусовой — none. Выбирай по тексту, а не по силе карты.',
    criteria: ARCHETYPES,
  };
}

console.log('Отправляю', sample.length, 'существ, вопросов:', Object.keys(questions).length, '\n');
const res = await ask(state, questions, { model: 'jev-latest' });

console.log('модель:', res.model, '| вход:', res.inputTokens, 'ток. | цена: $' + res.costUsd.toFixed(6));
console.log('');

const answers = res.answers;

let agree = 0;
let checked = 0;
const rows = [];

for (const c of sample) {
  const f = codeFacts(c);
  const a = answers[`arch_${c.id}`] ?? {};
  const got = a.choice;
  const expected = f.keywords.map((k) => KEYWORD_TO_ARCHETYPE[k]).filter(Boolean);
  const p = a.probabilities ?? {};
  const topP = Object.entries(p).sort((x, y) => y[1] - x[1]);

  rows.push({
    id: c.id,
    name: c.name,
    cost: f.cost,
    stats: `${f.attack}/${f.health}`,
    delta: f.delta,
    keywords: f.keywords.join(',') || '—',
    got,
    conf: a.confidence,
    p: topP.length ? `${topP[0][0]} ${topP[0][1]}` : '—',
  });

  // Проверяем согласованность только там, где ожидание однозначно.
  const uniq = [...new Set(expected)];
  if (uniq.length === 1) {
    checked += 1;
    if (got === uniq[0]) agree += 1;
  }
}

console.log('id'.padEnd(26), 'цена', 'статы'.padEnd(6), 'Δ'.padStart(3), 'код'.padEnd(16), 'разметка'.padEnd(10), 'p');
console.log('─'.repeat(100));
for (const r of rows) {
  console.log(
    r.id.slice(0, 24).padEnd(26),
    String(r.cost).padStart(3),
    r.stats.padEnd(6),
    String(r.delta).padStart(3),
    r.keywords.padEnd(16),
    String(r.got).padEnd(10),
    r.p,
  );
}

console.log('');
console.log(`согласие с ключевыми словами: ${agree}/${checked}`);
const dist = {};
for (const r of rows) dist[r.got] = (dist[r.got] ?? 0) + 1;
console.log('распределение разметки:', JSON.stringify(dist));
const noneShare = (dist.none ?? 0) / rows.length;
console.log(`доля none: ${(noneShare * 100).toFixed(0)}%`);
