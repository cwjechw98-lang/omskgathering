/**
 * Финальные ворота: устойчивость правильной формы.
 *
 * Форма установлена пробами (см. README.md рядом):
 *   - состояние — простой строкой, не JSON-объектом;
 *   - арифметику считает КОД и отдаёт модели готовые числа;
 *   - модель отвечает Noul (да/нет с вероятностью), а не Score по абстрактной шкале;
 *   - решение принимает код по вероятности, а не сама модель.
 *
 * Прогоняет один и тот же набор карт трижды: прямой порядок, обратный порядок и
 * перемешанный — и проверяет, что вердикты не гуляют. Нестабильный судья хуже
 * отсутствующего: на него нельзя опереться при разборе баланса.
 *
 * Запуск: node scripts/jev/judge-stability.mjs
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const raw = readFileSync(join(homedir(), '.dsh', '.credentials.yaml'), 'utf8');
const KEY =
  process.env.TYPESAFE_API_KEY ?? raw.match(/^\s{2}TYPESAFE_API_KEY:\s*(.+)$/m)[1].trim();

let tokens = 0;
let calls = 0;
async function ask(state, questions) {
  calls += 1;
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, model: 'jev-latest', questions }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  tokens += json.usage?.input_tokens ?? 0;
  return json;
}

const cards = JSON.parse(readFileSync('reports/cards.json', 'utf8'));
const byId = new Map(cards.map((c) => [c.id, c]));
const IDS = [
  'bird_omsk', 'komar_irtish', 'dvornik', 'student_omgtu', 'coffee_machine',
  'gopnik_lubinsky', 'shaurmaster', 'zhitel_podzemki', 'marshrutchik', 'omskiy_huligann',
  'omskiy_rybolov', 'irtysh_vodyanoy', 'makefile_golem', 'bocal', 'sibirskiy_medved',
  'sneg_elemental', 'teplostantsiya_golem', 'duh_sibiri', 'blackhole', 'mer_omska',
];
const sample = IDS.map((id) => byId.get(id)).filter(Boolean);

const statDelta = (c) => (c.type === 'creature' ? (c.attack ?? 0) + (c.health ?? 0) - 2 * c.cost : 0);
const fact = (c) => (statDelta(c) <= -2 ? 1 : 0);

function buildState(list) {
  return (
    'Игра: «Омск: Собрание», ККИ в стиле Magic: the Gathering.\n' +
    'Кривая игры: существо обычно даёт около 2 суммарных статов (атака + здоровье) за единицу маны.\n' +
    'Сумма статов, норма и разница уже посчитаны для вас — считать не нужно.\n\n' +
    'Карты:\n' +
    list
      .map((c) => {
        const sum = c.type === 'creature' ? (c.attack ?? 0) + (c.health ?? 0) : 0;
        const norm = c.type === 'creature' ? 2 * c.cost : 0;
        const d = statDelta(c);
        return (
          `${c.name} (id: ${c.id}) — цена ${c.cost} маны. Сумма статов: ${sum}. ` +
          `Норма: ${norm}. Разница: ${d > 0 ? '+' : ''}${d}. Способность: ${c.description}`
        );
      })
      .join('\n')
  );
}

function buildQuestions(list) {
  const q = {};
  for (const c of list) {
    q[c.id] = {
      type: 'noul',
      instructions:
        `Разница для карты «${c.name}» отрицательная настолько, что карта не окупает свою ` +
        `ману и заметно слабее нормы (разница −2 или хуже)?`,
      criteria: {
        true: 'Разница −2 или меньше: карта заметно слабее нормы',
        false: 'Разница −1, 0 или больше: карта в пределах нормы',
      },
    };
  }
  return q;
}

function shuffle(list, seed) {
  const out = [...list];
  let s = seed;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const runs = [
  { label: 'прямой порядок', list: sample },
  { label: 'обратный порядок', list: [...sample].reverse() },
  { label: 'перемешанный (seed 42)', list: shuffle(sample, 42) },
];

const results = [];
for (const run of runs) {
  const res = await ask(buildState(run.list), buildQuestions(run.list));
  const verdicts = {};
  const probs = {};
  let hits = 0;
  for (const c of sample) {
    const a = res.answers[c.id];
    probs[c.id] = a.noul;
    verdicts[c.id] = a.noul >= 0.5 ? 1 : 0;
    if (verdicts[c.id] === fact(c)) hits += 1;
  }
  results.push({ label: run.label, verdicts, probs, hits });
  console.log(`${run.label.padEnd(24)} совпало ${hits}/20`);
}

// Согласие вердиктов между прогонами
let disagreements = 0;
let maxProbShift = 0;
let sumProbShift = 0;
for (const c of sample) {
  const v = results.map((r) => r.verdicts[c.id]);
  if (new Set(v).size > 1) {
    disagreements += 1;
    console.log(`  РАСХОЖДЕНИЕ по «${c.name}»: ${v.join(' / ')}`);
  }
  const p = results.map((r) => r.probs[c.id]);
  const shift = Math.max(...p) - Math.min(...p);
  maxProbShift = Math.max(maxProbShift, shift);
  sumProbShift += shift;
}
sumProbShift /= sample.length;

console.log(`\nРасхождений вердиктов между прогонами: ${disagreements}/20`);
console.log(`Сдвиг вероятности: средний ${sumProbShift.toFixed(3)}, максимальный ${maxProbShift.toFixed(3)}`);

const accuracy = results.reduce((s, r) => s + r.hits, 0) / (results.length * sample.length);
console.log(`Точность по всем прогонам: ${(accuracy * 100).toFixed(0)}%`);

const gate = disagreements === 0 && accuracy >= 0.95;
console.log(`\nВорота калибровки: ${gate ? 'ПРОЙДЕНЫ' : 'НЕ ПРОЙДЕНЫ'}`);
console.log(`  требуется: 0 расхождений вердиктов и точность ≥ 95%`);
console.log(`  сейчас:    ${disagreements} расхождений, точность ${(accuracy * 100).toFixed(0)}%`);
console.log(`\nЗапросов: ${calls}, входных токенов: ${tokens}, стоимость: $${((tokens / 1e6) * 0.042).toFixed(5)}`);
console.log(`Экстраполяция на все 75 карт: $${(((tokens / 3 / sample.length) * 75 / 1e6) * 0.042).toFixed(5)}`);
