/**
 * Проверка самого инструмента: различает ли Jev заведомо разные состояния?
 *
 * Калибровка на реальных картах дала подозрительный результат: все 20 карт
 * получили 2.09-2.15 при уверенности 0.64, то есть модель не различала карты.
 * Прежде чем переписывать рубрику (то есть винить объект измерения), проверяем
 * измерительный прибор на заведомо различимых входах: если он не отличает
 * пустое поле от 10/10, рубрика ни при чём.
 *
 * Второй тест: английская рубрика против ЭТАЛОНА, а не только против русской.
 * В первом прогоне сравнивался русский с английским (язык против языка), и это
 * не отвечало на вопрос, понимает ли модель карты хоть на одном языке.
 *
 * Запуск: node scripts/jev/discriminate.mjs
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const raw = readFileSync(join(homedir(), '.dsh', '.credentials.yaml'), 'utf8');
const KEY =
  process.env.TYPESAFE_API_KEY ?? raw.match(/^\s{2}TYPESAFE_API_KEY:\s*(.+)$/m)[1].trim();

let tokensIn = 0;
async function ask(state, questions) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, model: 'jev-latest', questions }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  tokensIn += json.usage?.input_tokens ?? 0;
  return json;
}

const RU = [
  'Явно слабая: за эту цену почти всегда есть карта заметно сильнее',
  'Слабее среднего: статов или эффекта не хватает для своей цены',
  'Ровно по цене: ни выигрыша, ни провала, нормальный выбор',
  'Сильнее среднего: берут почти всегда, когда есть мана',
  'Сломанная: выигрывает партию сама, ответа нет',
];
const EN = [
  'Clearly weak: for this cost there is almost always a noticeably stronger card',
  'Below average: stats or effect fall short for its cost',
  'Exactly on curve: neither a bargain nor a trap, a normal pick',
  'Above average: picked almost whenever the mana is available',
  'Broken: wins the game by itself, no answer exists',
];

// ─── Тест 1: заведомо различимые входы ──────────────────────────────────────

console.log('=== Тест 1: различает ли прибор заведомо разные входы ===\n');

const extremes = [
  { id: 'empty', text: 'Пустое поле. У игрока нет ни одного существа, руки нет, маны нет.', truth: 0 },
  { id: 'weak', text: 'На столе существо 0/1 без способностей, стоит 5 маны.', truth: 0 },
  { id: 'fair', text: 'На столе существо 3/3 без способностей, стоит 3 маны.', truth: 2 },
  { id: 'strong', text: 'На столе существо 6/6 с пробиванием, стоит 4 маны.', truth: 4 },
  { id: 'broken', text: 'На столе существо 10/10 с пробиванием и бдительностью, стоит 2 маны.', truth: 4 },
];

const state1 = {
  game: 'Омск: Собрание — ККИ в стиле Magic: the Gathering',
  curve: 'Ожидаемая кривая: существо стоит примерно 2 суммарных стата за единицу маны',
  objects: extremes.map((e) => e.text),
};

const q1 = {};
for (const e of extremes) {
  q1[e.id] = { type: 'score', instructions: 'Насколько это сильно за свою цену?', criteria: RU };
}

const r1 = await ask(state1, q1);
console.log('объект   эталон   Jev    увер.');
for (const e of extremes) {
  const a = r1.answers[e.id];
  console.log(`  ${e.id.padEnd(8)} ${String(e.truth).padEnd(8)} ${a.score.toFixed(2).padEnd(7)} ${a.confidence.toFixed(2)}`);
}
const scores1 = extremes.map((e) => r1.answers[e.id].score);
const spread1 = Math.max(...scores1) - Math.min(...scores1);
console.log(`\nРазброс ответов: ${spread1.toFixed(2)} уровня (нужно ≥ 2.0, иначе прибор слеп)`);

// ─── Тест 2: английская рубрика против ЭТАЛОНА ──────────────────────────────

console.log('\n=== Тест 2: английская рубрика против эталона ===\n');

const cards = JSON.parse(readFileSync('reports/cards.json', 'utf8'));
const byId = new Map(cards.map((c) => [c.id, c]));

function expectedPower(card) {
  if (card.type !== 'creature') return card.cost <= 3 ? 2 : 3;
  const delta = (card.attack ?? 0) + (card.health ?? 0) - 2 * card.cost;
  if (delta <= -3) return 0;
  if (delta <= -1) return 1;
  if (delta === 0) return 2;
  if (delta <= 2) return 3;
  return 4;
}

const ids = [
  'bird_omsk', 'komar_irtish', 'dvornik', 'student_omgtu', 'coffee_machine',
  'gopnik_lubinsky', 'shaurmaster', 'zhitel_podzemki', 'marshrutchik', 'omskiy_huligann',
  'omskiy_rybolov', 'irtysh_vodyanoy', 'makefile_golem', 'bocal', 'sibirskiy_medved',
  'sneg_elemental', 'teplostantsiya_golem', 'duh_sibiri', 'blackhole', 'mer_omska',
];
const sample = ids.map((id) => byId.get(id)).filter(Boolean);

const cardLine = (c) => {
  const stats = c.type === 'creature' ? `, ${c.attack}/${c.health}` : '';
  const kw = c.keywords?.length ? `, keywords: ${c.keywords.join(', ')}` : '';
  return `${c.name} (id: ${c.id}) — ${c.cost} mana, ${c.type}${stats}${kw}. Ability: ${c.description}`;
};

const state2 = {
  game: 'Omsk: The Gathering — a collectible card game in the style of Magic: the Gathering',
  curve: 'Expected curve: a creature costs about 2 total stats (attack + health) per point of mana',
  note: 'A card spends its budget on stats or on ability text; strong text with weak stats is normal',
  cards_to_evaluate: sample.map(cardLine),
};

const q2 = {};
for (const c of sample) {
  q2[c.id] = {
    type: 'score',
    instructions: 'How strong is this card for its mana cost in this game?',
    criteria: EN,
  };
}

const r2 = await ask(state2, q2);
console.log('карта                  эталон  Jev-EN  увер.');
let exactEn = 0;
let nearEn = 0;
let sumEn = 0;
for (const c of sample) {
  const a = r2.answers[c.id];
  const truth = expectedPower(c);
  const diff = Math.abs(a.score - truth);
  if (diff < 0.5) exactEn += 1;
  if (diff < 1.0) nearEn += 1;
  sumEn += diff;
  console.log(
    `  ${c.name.slice(0, 20).padEnd(22)} ${String(truth).padEnd(8)} ${a.score
      .toFixed(2)
      .padEnd(8)} ${a.confidence.toFixed(2)}`
  );
}
const scores2 = sample.map((c) => r2.answers[c.id].score);
const spread2 = Math.max(...scores2) - Math.min(...scores2);

console.log(`\nАнглийский: точно ${exactEn}/20, близко ${nearEn}/20, среднее расхождение ${(sumEn / 20).toFixed(2)}`);
console.log(`Разброс ответов: ${spread2.toFixed(2)} уровня`);

console.log(`\nВходных токенов: ${tokensIn}, стоимость: $${((tokensIn / 1e6) * 0.042).toFixed(5)}`);
console.log('\nВывод:');
console.log(`  прибор ${spread1 >= 2 ? 'РАЗЛИЧАЕТ' : 'НЕ РАЗЛИЧАЕТ'} заведомо разные входы (разброс ${spread1.toFixed(2)})`);
console.log(`  английская рубрика ${nearEn / 20 >= 0.85 ? 'СОВПАЛА' : 'НЕ СОВПАЛА'} с эталоном (${nearEn}/20)`);
