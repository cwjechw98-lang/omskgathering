/**
 * Пошаговая диагностика: на каком уровне ломается связь с моделью?
 *
 * Известно: Score по рубрике не различает заведомо разные входы (разброс 0.09,
 * уверенность 0.01-0.07), причём одинаково на русском и английском. Возможные
 * причины: (а) форма запроса, (б) моё структурированное состояние, (в) Score
 * как примитив, (г) сама модель.
 *
 * Различаем их так: сначала простейшие Noul-вопросы по простой строке, где
 * правильный ответ известен заранее. Noul обязан ответить ~1.0 на очевидное
 * «да» и ~0.0 на очевидное «нет». Если и это не работает — дело не в рубрике.
 *
 * Запуск: node scripts/jev/probe-primitives.mjs
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const raw = readFileSync(join(homedir(), '.dsh', '.credentials.yaml'), 'utf8');
const KEY =
  process.env.TYPESAFE_API_KEY ?? raw.match(/^\s{2}TYPESAFE_API_KEY:\s*(.+)$/m)[1].trim();

let tokens = 0;
async function ask(state, questions, label) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, model: 'jev-latest', questions }),
    signal: AbortSignal.timeout(90_000),
  });
  const text = await res.text();
  if (!res.ok) {
    console.log(`  [${label}] HTTP ${res.status}: ${text.slice(0, 160)}`);
    return null;
  }
  const json = JSON.parse(text);
  tokens += json.usage?.input_tokens ?? 0;
  console.log(`  [${label}]`);
  for (const [id, a] of Object.entries(json.answers)) {
    const value = a.noul ?? a.choice ?? a.score;
    const conf = a.confidence !== undefined ? `, увер. ${a.confidence.toFixed(2)}` : '';
    console.log(`      ${id}: ${JSON.stringify(value)}${conf}`);
  }
  return json;
}

console.log('=== A. Noul по простой строке, ответ известен заранее ===\n');

await ask('Кот сидит на окне и спит.', {
  is_sleeping: { type: 'noul', instructions: 'Does the cat sleep?' },
  is_flying: { type: 'noul', instructions: 'Is the cat flying in the sky?' },
}, 'английский вопрос, английское состояние');

await ask('Кот сидит на окне и спит.', {
  is_sleeping: { type: 'noul', instructions: 'Кот спит?' },
  is_flying: { type: 'noul', instructions: 'Кот летит по небу?' },
}, 'русский вопрос, русское состояние');

await ask('2 + 2 = 4', {
  is_four: { type: 'noul', instructions: 'Is the statement true?' },
  is_five: { type: 'noul', instructions: 'Does 2 + 2 equal 5?' },
}, 'проверка на вырожденность');

console.log('\n=== B. Choice по простой строке ===\n');

await ask('На столе лежит спелый красный помидор.', {
  what: {
    type: 'choice',
    instructions: 'What is on the table?',
    criteria: { tomato: 'A tomato', car: 'A car', planet: 'A planet' },
  },
}, 'очевидный выбор');

console.log('\n=== C. Score с двумя уровнями вместо пяти ===\n');

await ask('На столе лежит спелый красный помидор.', {
  ripeness: {
    type: 'score',
    instructions: 'How ripe is the tomato?',
    criteria: ['Unripe, green', 'Ripe, red'],
  },
}, '2 уровня');

await ask('На столе лежит зелёный твёрдый помидор.', {
  ripeness: {
    type: 'score',
    instructions: 'How ripe is the tomato?',
    criteria: ['Unripe, green', 'Ripe, red'],
  },
}, '2 уровня, другой вход');

console.log('\n=== D. Структурированное состояние против строки ===\n');

const structured = { game: 'тест', objects: ['существо 0/1 за 5 маны', 'существо 10/10 за 2 маны'] };
await ask(structured, {
  weak: { type: 'noul', instructions: 'Is the FIRST object in `objects` a weak card for its cost?' },
  broken: { type: 'noul', instructions: 'Is the SECOND object in `objects` an extremely strong card for its cost?' },
}, 'объект с полем objects');

await ask(
  'Список карт: 1) существо 0/1 за 5 маны — очень слабое. 2) существо 10/10 за 2 маны — сломанное.',
  {
    weak: { type: 'noul', instructions: 'Is the first card weak for its cost?' },
    broken: { type: 'noul', instructions: 'Is the second card extremely strong for its cost?' },
  },
  'то же самое простой строкой'
);

console.log(`\nВходных токенов: ${tokens}, стоимость: $${((tokens / 1e6) * 0.042).toFixed(5)}`);
