/**
 * Две решающие проверки.
 *
 * Установлено: Score по любой шкале жмётся к середине (разброс 0.06-0.09),
 * а Noul-вопрос про "статов меньше нормы" даёт упорядоченный, но сжатый сигнал:
 * Δ=-5 → 0.71, Δ=-4 → 0.75, Δ=0 → 0.17-0.35. Похоже, модель ранжирует карты
 * верно, но (а) порог 0.5 не там, где нужно, и (б) она сама считает статы в уме.
 *
 * Проверка 1: корреляция между вероятностью Noul и фактической Δ. Если сильная —
 * сигнал есть, и его надо использовать как непрерывную величину, а не как да/нет.
 *
 * Проверка 2: главная гипотеза. Отдаём модели УЖЕ ПОСЧИТАННЫЕ числа (сумма
 * статов, бюджет, разницу) и спрашиваем только суждение. Это ровно тот принцип,
 * который TypeSafe называет "keep code in control": арифметику делает код,
 * модель выносит суждение. Если после этого совпадение резко вырастет — модель
 * годится, но только как судья, а не как калькулятор.
 *
 * Запуск: node scripts/jev/fact-vs-judgment.mjs
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const raw = readFileSync(join(homedir(), '.dsh', '.credentials.yaml'), 'utf8');
const KEY =
  process.env.TYPESAFE_API_KEY ?? raw.match(/^\s{2}TYPESAFE_API_KEY:\s*(.+)$/m)[1].trim();

let tokens = 0;
async function ask(state, questions) {
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

const delta = (c) => (c.type === 'creature' ? (c.attack ?? 0) + (c.health ?? 0) - 2 * c.cost : 0);

// ─── Проверка 1: сигнал из прошлого прогона ──────────────────────────────────

console.log('=== Проверка 1: есть ли сигнал в вероятности Noul ===\n');

const PREV = {
  bird_omsk: 0.79, komar_irtish: 0.70, dvornik: 0.46, student_omgtu: 0.24,
  coffee_machine: 0.32, gopnik_lubinsky: 0.33, shaurmaster: 0.11, zhitel_podzemki: 0.34,
  marshrutchik: 0.20, omskiy_huligann: 0.17, omskiy_rybolov: 0.35, irtysh_vodyanoy: 0.21,
  makefile_golem: 0.26, bocal: 0.42, sibirskiy_medved: 0.20, sneg_elemental: 0.21,
  teplostantsiya_golem: 0.36, duh_sibiri: 0.17, blackhole: 0.75, mer_omska: 0.71,
};

// Корреляция Пирсона между вероятностью и фактической Δ.
const xs = sample.map((c) => delta(c));
const ys = sample.map((c) => PREV[c.id]);
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const mx = mean(xs);
const my = mean(ys);
let cov = 0;
let vx = 0;
let vy = 0;
for (let i = 0; i < xs.length; i += 1) {
  cov += (xs[i] - mx) * (ys[i] - my);
  vx += (xs[i] - mx) ** 2;
  vy += (ys[i] - my) ** 2;
}
const r = cov / Math.sqrt(vx * vy);
console.log(`  корреляция Пирсона между Δ статов и вероятностью Noul: r = ${r.toFixed(3)}`);
console.log(
  `  ${Math.abs(r) >= 0.6 ? 'СИЛЬНАЯ связь — сигнал есть' : Math.abs(r) >= 0.3 ? 'слабая связь' : 'связи нет'}`
);

// ─── Проверка 2: суждение по готовым числам ─────────────────────────────────

console.log('\n=== Проверка 2: код считает, модель судит ===\n');

const state =
  'Игра: «Омск: Собрание», ККИ в стиле Magic: the Gathering.\n' +
  'Кривая игры: существо обычно даёт около 2 суммарных статов (атака + здоровье) за единицу маны.\n' +
  'Сумма статов и норма для цены уже посчитаны для вас — считать не нужно.\n\n' +
  'Карты:\n' +
  sample
    .map((c, i) => {
      const stats = c.type === 'creature' ? `${c.attack ?? 0} + ${c.health ?? 0}` : 'нет статов';
      const norm = c.type === 'creature' ? 2 * c.cost : 0;
      const d = delta(c);
      return (
        `${i + 1}. ${c.name} (id: ${c.id}) — цена ${c.cost} маны. ` +
        `Сумма статов: ${stats} = ${c.type === 'creature' ? (c.attack ?? 0) + (c.health ?? 0) : 0}. ` +
        `Норма статов за эту цену: ${norm}. ` +
        `Разница (статы минус норма): ${d > 0 ? '+' : ''}${d}. ` +
        `Способность: ${c.description}`
      );
    })
    .join('\n');

const q = {};
for (const c of sample) {
  q[c.id] = {
    type: 'noul',
    instructions:
      `Разница для карты «${c.name}» отрицательная настолько, что карта не окупает свою ману ` +
      `и заметно слабее нормы (разница −2 или хуже)?`,
    criteria: {
      true: 'Разница −2 или меньше: карта заметно слабее нормы',
      false: 'Разница −1, 0 или больше: карта в пределах нормы',
    },
  };
}

const res = await ask(state, q);
console.log('карта                  Δ  факт(Δ≤-2)  Jev   вердикт');
let hit = 0;
const rows = [];
for (const c of sample) {
  const a = res.answers[c.id];
  const fact = delta(c) <= -2 ? 1 : 0;
  const predicted = a.noul >= 0.5 ? 1 : 0;
  if (predicted === fact) hit += 1;
  rows.push({ d: delta(c), p: a.noul, fact, predicted });
  console.log(
    `  ${c.name.slice(0, 20).padEnd(22)} ${String(delta(c)).padStart(2)}  ` +
      `${String(fact).padEnd(11)} ${a.noul.toFixed(2)}  ${predicted === fact ? 'верно' : 'ОШИБКА'}`
  );
}

// Насколько хорошо вероятность разделяет два класса
const pos = rows.filter((r) => r.fact === 1).map((r) => r.p);
const neg = rows.filter((r) => r.fact === 0).map((r) => r.p);
const meanPos = pos.length ? mean(pos) : 0;
const meanNeg = neg.length ? mean(neg) : 0;

console.log(`\nСовпало: ${hit}/20`);
console.log(`Средняя вероятность для слабых (Δ≤−2): ${meanPos.toFixed(2)} (${pos.length} карт)`);
console.log(`Средняя вероятность для нормы:        ${meanNeg.toFixed(2)} (${neg.length} карт)`);
console.log(`Разделение классов: ${(meanPos - meanNeg).toFixed(2)}`);

console.log(`\nВходных токенов: ${tokens}, стоимость: $${((tokens / 1e6) * 0.042).toFixed(5)}`);
console.log('\nИтог:');
console.log(`  корреляция сигнала: r = ${r.toFixed(3)}`);
console.log(`  суждение по готовым числам: ${hit}/20 (${((hit / 20) * 100).toFixed(0)}%)`);
