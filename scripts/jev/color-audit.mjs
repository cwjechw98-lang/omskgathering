/**
 * Аудит разметки цветов: соответствует ли цвет карты её содержанию.
 *
 * ПОЧЕМУ ЭТО НЕ «ПУСТЬ МОДЕЛЬ РАЗЛОЖИТ КАРТЫ ПО ЦВЕТАМ». Цвета уже заданы лором:
 * пять Источников Маны — это пять реальных мест Омска, и у каждого прописан смысл,
 * фракция и лидер (src/data/lore.ts, Глава I). КОД берёт эту разметку как данность
 * и сравнивает с ней суждение модели. Модель не решает, каким будет цвет, — она
 * отвечает на один узкий вопрос про одну карту.
 *
 * ТРИ НЕЗАВИСИМЫХ СИГНАЛА, и расхождение между ними — главное:
 *   назначенный — что стоит в cards.ts сейчас;
 *   ЛОР    — к какому цвету карта относится по имени, флейвору и фракции;
 *   МЕХАНИКА — к какому цвету она относится по одному действию (имя и флейвор стёрты).
 * Читается так:
 *   лор = механика = назначенный → карта на своём месте;
 *   лор = механика ≠ назначенный → оба сигнала просят другой цвет → ПЕРЕКРАСИТЬ;
 *   лор ≠ механика               → имя тянет в одну сторону, действие в другую →
 *                                  РЕШАЕТ ЧЕЛОВЕК (иначе карта врёт игроку).
 * Третий случай и есть находка: «Химик НПЗ» назван по красному Источнику, а делает
 * чёрное дело — яд и смерть.
 *
 * ПОЧЕМУ ДВЕ РУБРИКИ, А НЕ ОДНА. Скилл требует одну ось на вопрос. «Кто карта» и
 * «что она делает» — разные оси, поэтому это два прогона, а не один вопрос с двумя
 * условиями. Первая версия смешала их в одном вопросе и дала предсказанный провал:
 * уверенность ниже порога у всех 69 карт сразу.
 *
 * Устойчивость: прогон лора идёт дважды, в прямом и обратном порядке. Согласие
 * порядка — обязательное условие, без него узкие вероятности ничего не значат.
 *
 * Запуск: node scripts/jev/color-audit.mjs [--out путь]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const CLIENT = pathToFileURL(
  join(homedir(), '.dsh', 'skills', 'jev-decision-judge', 'scripts', 'jev.mjs'),
).href;
const { ask, logOutcome } = await import(CLIENT);

/** Шесть цветов: кто они по лору — место силы, фракция, характер. */
const COLORS_LORE = {
  white: 'Проспект Мира: порядок, закон, чиновники, стража, служба и традиция',
  blue: 'Набережная Иртыша: знание, учёба, архивы, река, лёд, туман, хитрость',
  black: 'Омское Подземелье: смерть, тьма, подземелье, амбиции, жертва, тлен',
  red: 'Омский НПЗ: хаос, огонь, улица, скорость, ярость, техника, взрыв',
  green: 'Парк 30-летия: природа, звери, тайга, рост, плодородие, сила земли',
  colorless: 'Школа 21: код, программы, машины, искусственный разум, артефакты',
};

/**
 * Шесть цветов: что в них принято ДЕЛАТЬ. Формулировки строго функциональные —
 * только действия, без характера и фракции.
 */
const COLORS_MECH = {
  white: 'лечит, защищает своих, даёт защитников и бдительность, усиливает отряд, наказывает атакующих',
  blue: 'тянет карты, замораживает, возвращает в руку, мешает врагу действовать, работает с колодой',
  black: 'уничтожает существ, ворует здоровье, заставляет жертвовать, поднимает из кладбища, ослабляет',
  red: 'наносит прямой урон, даёт ускорение и первый удар, разрушает всё без разбора, бьёт по герою',
  green: 'ставит крупных существ, усиливает статы, даёт ману, лечит, даёт пробивание и рост',
  colorless: 'машины, артефакты и код: нейтральные эффекты, не привязанные к стихии или фракции',
};

const COLOR_RU = {
  white: 'белый',
  blue: 'синий',
  black: 'чёрный',
  red: 'красный',
  green: 'зелёный',
  colorless: 'бесцветный',
};

/** Порог уверенности: ниже него суждение не считается опорой для решения. */
const MIN_CONFIDENCE = 0.5;

const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const outPath = outArg > -1 ? args[outArg + 1] : 'reports/color-audit.md';

const raw = JSON.parse(readFileSync('reports/cards.json', 'utf8'));
const all = Array.isArray(raw) ? raw : raw.cards;
// Земли исключены: у земли цвет задан её Источником по определению, судить нечего.
const subjects = all.filter((c) => c.type !== 'land');

function preamble(defs, intro) {
  return [
    intro,
    ...Object.entries(defs).map(([k, v]) => `  ${k} (${COLOR_RU[k]}): ${v}`),
    '',
    'Ниже карты. Для каждой определи, к какому ОДНОМУ цвету она относится.',
  ].join('\n');
}

const PREAMBLE_LORE = preamble(
  COLORS_LORE,
  'Игра: коллекционная карточная игра про магический Омск. В ней шесть цветов,',
);

const PREAMBLE_MECH = preamble(
  COLORS_MECH,
  'Игра: коллекционная карточная игра. В ней шесть цветов, и каждый цвет — это набор',
);

/** Полное описание карты — прогон лора. */
function full(c) {
  const lines = [`id: ${c.id}`, `  имя: ${c.name}`, `  цена: ${c.cost} маны`, `  тип: ${c.type}`];
  if (c.type === 'creature') lines.push(`  статы: ${c.attack}/${c.health}`);
  if (c.keywords?.length) lines.push(`  способности: ${c.keywords.join(', ')}`);
  lines.push(`  текст: ${c.description.trim()}`);
  if (c.flavor?.trim()) lines.push(`  флейвор: ${c.flavor.trim()}`);
  return lines.join('\n');
}

/** Только механика: имя стёрто, флейвор убран — прогон механики. */
function mechanicsOnly(c) {
  const lines = [`id: ${c.id}`, '  имя: (скрыто)', `  цена: ${c.cost} маны`, `  тип: ${c.type}`];
  if (c.type === 'creature') lines.push(`  статы: ${c.attack}/${c.health}`);
  if (c.keywords?.length) lines.push(`  способности: ${c.keywords.join(', ')}`);
  lines.push(`  текст: ${c.description.trim()}`);
  return lines.join('\n');
}

/**
 * Один вопрос на карту: одна ось — цвет.
 *
 * ТЕКСТ КАРТЫ ВКЛАДЫВАЕТСЯ В САМ ВОПРОС, и это не стилистика. Ключ вопроса модели
 * не отправляется, поэтому 69 вопросов с одинаковым текстом для неё неразличимы —
 * первая версия дала ровно это: «белый» для всех карт в одном прогоне и «синий» для
 * всех в другом. Карта должна быть внутри вопроса, как в spell-audit.mjs.
 */
function buildQuestions(axis) {
  const q = {};
  const byLore = axis === 'lore';
  for (const c of subjects) {
    const facts = [];
    facts.push(`тип: ${c.type}`, `цена: ${c.cost} маны`);
    if (c.type === 'creature') facts.push(`статы: ${c.attack}/${c.health}`);
    if (c.keywords?.length) facts.push(`способности: ${c.keywords.join(', ')}`);
    facts.push(`текст: ${c.description.trim()}`);

    const subject = byLore
      ? `Карта «${c.name}»${c.flavor?.trim() ? `. Флейвор: ${c.flavor.trim()}` : ''}. ${facts.join('. ')}.`
      : `Неизвестная карта. ${facts.join('. ')}.`;

    q[`color_${c.id}`] = {
      type: 'choice',
      instructions: byLore
        ? `${subject} К какому ОДНОМУ цвету эта карта относится по тому, КТО она? ` +
          'Суди по имени, флейвору и тому, к какому месту силы и фракции она принадлежит. ' +
          'Статы и текст способности здесь не главное.'
        : `${subject} В каком ОДНОМ цвете такая карта была бы уместна по тому, ЧТО она ` +
          'ДЕЛАЕТ? Суди только по действию карты. Имени нет, ориентироваться на него нельзя.',
      criteria: byLore ? COLORS_LORE : COLORS_MECH,
    };
  }
  return q;
}

console.log('Карт (без земель):', subjects.length);
console.log('Прогон ЛОР 1: полная карта, прямой порядок...');
const lore1 = await ask(
  [PREAMBLE_LORE, '', ...subjects.map(full)].join('\n'),
  buildQuestions('lore'),
  { model: 'jev-latest' },
);

console.log('Прогон ЛОР 2: полная карта, обратный порядок (устойчивость)...');
const lore2 = await ask(
  [PREAMBLE_LORE, '', ...[...subjects].reverse().map(full)].join('\n'),
  buildQuestions('lore'),
  { model: 'jev-latest' },
);

console.log('Прогон МЕХАНИКА: без имени и флейвора...\n');
const mech = await ask(
  [PREAMBLE_MECH, '', ...subjects.map(mechanicsOnly)].join('\n'),
  buildQuestions('mech'),
  { model: 'jev-latest' },
);

const totalCost = lore1.costUsd + lore2.costUsd + mech.costUsd;
const totalTokens = lore1.inputTokens + lore2.inputTokens + mech.inputTokens;
console.log(
  `модель: ${lore1.model} | вход: ${totalTokens} ток. | цена: $${totalCost.toFixed(6)}\n`,
);

/** Чтение одного прогона по одной карте. */
function read(run, c) {
  const a = run.answers[`color_${c.id}`] ?? {};
  return { color: a.choice ?? null, confidence: a.confidence ?? 0 };
}

// ─── Разбор: три сигнала, описанные в шапке ────────────────────────────────

const rows = subjects.map((c) => {
  const l1 = read(lore1, c);
  const l2 = read(lore2, c);
  const m = read(mech, c);
  const assigned = c.color;

  // Устойчивость: прямой и обратный порядок должны дать одну метку.
  const stable = l1.color !== null && l1.color === l2.color;
  const confident = l1.confidence >= MIN_CONFIDENCE && m.confidence >= MIN_CONFIDENCE;

  let verdict;
  if (!stable) verdict = 'неустойчиво';
  else if (!confident) verdict = 'неуверенно';
  else if (l1.color === assigned && m.color === assigned) verdict = 'на месте';
  else if (l1.color === m.color && l1.color !== assigned) verdict = 'перекрасить';
  else verdict = 'решает человек';

  return {
    id: c.id,
    name: c.name,
    type: c.type,
    cost: c.cost ?? 0,
    assigned,
    lore: l1.color,
    mech: m.color,
    loreConfidence: l1.confidence,
    mechConfidence: m.confidence,
    stable,
    verdict,
  };
});

const ORDER = ['перекрасить', 'решает человек', 'неуверенно', 'неустойчиво', 'на месте'];
const byVerdict = Object.fromEntries(ORDER.map((v) => [v, rows.filter((r) => r.verdict === v)]));

console.log('─── ИТОГ ───');
for (const v of ORDER) console.log(`${v.padEnd(16)} ${byVerdict[v].length}`);
console.log('');
for (const v of ['перекрасить', 'решает человек']) {
  if (!byVerdict[v].length) continue;
  console.log(`─── ${v.toUpperCase()} ───`);
  for (const r of byVerdict[v]) {
    console.log(
      `  ${r.name} [${r.type}] назначен ${COLOR_RU[r.assigned]} → лор: ${COLOR_RU[r.lore]} ` +
        `(${r.loreConfidence.toFixed(2)}), механика: ${COLOR_RU[r.mech]} (${r.mechConfidence.toFixed(2)})`,
    );
  }
  console.log('');
}

// ─── Отчёт ─────────────────────────────────────────────────────────────────

const md = [];
md.push('# Аудит разметки цветов (Jev)\n');
md.push(
  'Цвета заданы лором (Глава I: пять Источников Маны + Школа 21 как «шестая сила»). ' +
    'Модель не назначает цвета — она судит по одной оси за прогон. ' +
    'ЛОР: кто карта (имя, флейвор, фракция). МЕХАНИКА: что карта делает (имя и флейвор стёрты).\n',
);
md.push(
  `Модель: \`${lore1.model}\` | вход: ${totalTokens} ток. | цена: $${totalCost.toFixed(6)} | ` +
    `порог уверенности: ${MIN_CONFIDENCE}\n`,
);
md.push('## Сводка\n');
md.push('| Вердикт | Карт |\n|---|---|');
for (const v of ORDER) md.push(`| ${v} | ${byVerdict[v].length} |`);
md.push('');

for (const v of ORDER) {
  if (v === 'на месте' || !byVerdict[v].length) continue;
  md.push(`## ${v} (${byVerdict[v].length})\n`);
  md.push('| Карта | Тип | Цена | Назначен | Лор | Механика | Уверенность |');
  md.push('|---|---|---|---|---|---|---|');
  for (const r of byVerdict[v]) {
    md.push(
      `| ${r.name} \`${r.id}\` | ${r.type} | ${r.cost} | ${COLOR_RU[r.assigned]} | ` +
        `${COLOR_RU[r.lore]} | ${COLOR_RU[r.mech]} | ${r.loreConfidence.toFixed(2)} / ` +
        `${r.mechConfidence.toFixed(2)} |`,
    );
  }
  md.push('');
}

md.push('## Все карты\n');
md.push('| Карта | Назначен | Лор | Механика | Устойчиво | Вердикт |');
md.push('|---|---|---|---|---|---|');
for (const r of rows) {
  md.push(
    `| ${r.name} | ${COLOR_RU[r.assigned]} | ${COLOR_RU[r.lore]} | ${COLOR_RU[r.mech]} | ` +
      `${r.stable ? 'да' : 'НЕТ'} | ${r.verdict} |`,
  );
}
md.push('');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, md.join('\n'), 'utf8');
console.log('Отчёт:', outPath);

// Журнал: исход записывается всегда, самооценка модели — никогда.
logOutcome({
  label: 'color-audit',
  verdict: byVerdict['неустойчиво'].length === 0 ? 'ok' : 'unclear',
  model: lore1.model,
  inputTokens: totalTokens,
  costUsd: totalCost,
  note:
    `перекрасить ${byVerdict['перекрасить'].length}, решает человек ` +
    `${byVerdict['решает человек'].length}, на месте ${byVerdict['на месте'].length}, ` +
    `неуверенно ${byVerdict['неуверенно'].length}, неустойчиво ${byVerdict['неустойчиво'].length}`,
});
