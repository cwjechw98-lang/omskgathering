/**
 * Контрольный опыт к аудиту баланса: проверяю ПРИБОР, а не карты.
 *
 * Аудит дал пять карт с вероятностями 0.70–0.78 — узкий диапазон. Это либо честный
 * результат (все пять действительно мощные), либо сжатие к «да», которое я уже ловил
 * на Score. Отличить одно от другого можно только контролем.
 *
 * Контроль: те же пять карт, те же числа, но текст способности ЗАТЁРТ. Карта с пустым
 * текстом за ту же цену обязана получить заметно меньшую вероятность. Если вероятности
 * не падают — прибор слеп, и отчёт аудита недействителен.
 *
 * Запуск: node scripts/jev/balance-control.mjs
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const CLIENT = pathToFileURL(
  join(homedir(), '.dsh', 'skills', 'jev-decision-judge', 'scripts', 'jev.mjs'),
).href;
const { ask, logOutcome } = await import(CLIENT);

const raw = JSON.parse(readFileSync('reports/cards.json', 'utf8'));
const all = Array.isArray(raw) ? raw : raw.cards;

/** Те же пять карт, что и в аудите, с их нехваткой статов. */
const CASES = [
  { id: 'mer_omska', gap: 4.5 },
  { id: 'blackhole', gap: 4.0 },
  { id: 'drakon_irtysha', gap: 2.5 },
  { id: 'pisiner_21', gap: 2.0 },
  { id: 'cluster_lord', gap: 2.0 },
];

/** Затёртый текст: механики нет, остаётся только вкусовая строка. */
const BLANK = 'Ничего особенного. Обычное существо без способностей.';

function buildState(blank) {
  const lines = [
    'Игра: коллекционная карточная игра. Кривая: существо окупает свою ману, если даёт',
    'около двух статов (атака + здоровье) за единицу маны. Ключевые слова уже учтены',
    'в расчёте отдельно. Ниже существа с посчитанными числами.',
    '',
  ];
  for (const c of CASES) {
    const card = all.find((x) => x.id === c.id);
    lines.push(
      `id: ${card.id}`,
      `  имя: ${card.name}`,
      `  цена: ${card.cost} маны, ${card.attack}/${card.health}`,
      `  ключевые слова: ${blank ? 'нет' : (card.keywords ?? []).join(', ') || 'нет'}`,
      `  нехватка статов после учёта ключевых слов: ${c.gap.toFixed(1)}`,
      `  текст способности: ${blank ? BLANK : card.description.trim()}`,
      '',
    );
  }
  return lines.join('\n');
}

function buildQuestions() {
  const q = {};
  for (const c of CASES) {
    const card = all.find((x) => x.id === c.id);
    q[`comp_${card.id}`] = {
      type: 'noul',
      instructions:
        `Существо «${card.name}» за ${card.cost} маны недобирает ${c.gap.toFixed(1)} статов. ` +
        'Оправдывает ли нехватку его текст способности? Считай, что оправдывает, если текст ' +
        'даёт существенное преимущество: уничтожение чужого существа, добор карт, ' +
        'существенное усиление, заметное лечение каждый ход или разгон маны. ' +
        'Не оправдывает, если эффект разовый и слабый, чисто вкусовой или дублирует ' +
        'ключевое слово, которое уже учтено.',
      criteria: {
        true: 'текст даёт существенное преимущество, нехватка оправдана',
        false: 'эффект слабый, разовый или вкусовой, нехватка не оправдана',
      },
    };
  }
  return q;
}

async function run(blank) {
  const res = await ask(buildState(blank), buildQuestions(), { model: 'jev-latest' });
  const out = {};
  for (const c of CASES) out[c.id] = res.answers[`comp_${c.id}`]?.noul ?? 0;
  return { out, res };
}

console.log('Опыт A: настоящие тексты');
const a = await run(false);
console.log('Опыт B: тексты затёрты\n');
const b = await run(true);

console.log('карта'.padEnd(20), 'нехватка'.padStart(8), 'A: текст'.padStart(10), 'B: пусто'.padStart(10), 'сдвиг'.padStart(8));
console.log('─'.repeat(62));

let maxA = 0;
let maxB = 0;
for (const c of CASES) {
  const card = all.find((x) => x.id === c.id);
  const pa = a.out[c.id];
  const pb = b.out[c.id];
  maxA = Math.max(maxA, pa);
  maxB = Math.max(maxB, pb);
  console.log(
    card.name.slice(0, 18).padEnd(20),
    c.gap.toFixed(1).padStart(8),
    pa.toFixed(2).padStart(10),
    pb.toFixed(2).padStart(10),
    (pb - pa).toFixed(2).padStart(8),
  );
}

const meanA = CASES.reduce((s, c) => s + a.out[c.id], 0) / CASES.length;
const meanB = CASES.reduce((s, c) => s + b.out[c.id], 0) / CASES.length;
const shift = meanA - meanB;

console.log('');
console.log(`среднее A (текст есть): ${meanA.toFixed(3)}`);
console.log(`среднее B (текста нет): ${meanB.toFixed(3)}`);
console.log(`сдвиг: ${shift.toFixed(3)}`);
console.log('');
console.log(`максимум в B: ${maxB.toFixed(2)} — ${maxB < 0.5 ? 'ни одна карта с пустым текстом не признана оправданной' : 'ВНИМАНИЕ: карта без способностей признана оправданной'}`);
console.log('');

const blind = shift < 0.15;
console.log(blind ? 'ВЕРДИКТ: прибор СЛЕП — рубрика не различает наличие способности' : 'ВЕРДИКТ: прибор РАЗЛИЧАЕТ — рубрике можно доверять');
console.log(`цена опыта: $${(a.res.costUsd + b.res.costUsd).toFixed(6)}`);

logOutcome({
  label: 'контроль прибора: аудит баланса',
  model: a.res.model,
  inputTokens: a.res.inputTokens + b.res.inputTokens,
  costUsd: Number((a.res.costUsd + b.res.costUsd).toFixed(6)),
  verdict: blind ? 'wrong' : 'ok',
  note: `настоящие тексты ${meanA.toFixed(2)} против затёртых ${meanB.toFixed(2)}, сдвиг ${shift.toFixed(2)}. ${blind ? 'рубрика слепа' : 'рубрика различает'}`,
});
