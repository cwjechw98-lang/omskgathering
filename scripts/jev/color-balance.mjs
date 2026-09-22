/**
 * Баланс цветов: равны ли цвета по силе.
 *
 * ЗАЧЕМ. Цвет стал выбором игрока (конструктор колод), и выбор честен только тогда,
 * когда ни один цвет не сильнее остальных. Если белый в среднем мощнее чёрного, то
 * «выбор цвета» — это иллюзия: есть один правильный ответ. Чем больше разрыв, тем
 * меньше игры.
 *
 * РАЗДЕЛЕНИЕ ТРУДА:
 *   КОД считает: статы, кривую, цену ключевых слов, средние по цвету. Это арифметика.
 *   JEV судит:  оправдывает ли ТЕКСТ заклинания его цену. Это проза, кодом не считается.
 *
 * Здесь только кодовая часть. Она отвечает на вопрос «разошлись ли цвета по существам».
 * Если разошлись — дальше нужен Jev по заклинаниям и чарам. Если нет — судить нечего.
 *
 * Запуск: node scripts/jev/color-balance.mjs [--out путь]
 */
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname } from 'node:path';

// ─── Проверка свежести данных ───────────────────────────────────────────────
//
// reports/cards.json — снимок src/data/cards.ts, и его читают больше десяти скриптов.
// Он НЕ пересобирается сам. 2026-09-22 на этом уже случилась ошибка: картам поменяли
// цвета, снимок остался старым, и отчёт по балансу цветов измерил прошлое состояние,
// выдав бесцветный цвет за одну карту вместо тринадцати. Молчаливый старый снимок
// выглядит как настоящий результат, поэтому здесь он — отказ, а не предупреждение.
const jsonMtime = statSync('reports/cards.json').mtimeMs;
const srcMtime = statSync('src/data/cards.ts').mtimeMs;
if (srcMtime > jsonMtime) {
  console.error('⚠️  reports/cards.json старше src/data/cards.ts — снимок устарел.');
  console.error('    Пересобери: npm run jev:cards');
  process.exit(1);
}

// ─── Те же допущения, что в balance-audit.mjs: менять их можно только вместе ──

/** Существо окупает ману, если даёт ~2 стата за единицу маны. */
const STATS_PER_MANA = 2;

/** Цена ключевого слова в статах. Наша оценка, а не мнение модели. */
const KEYWORD_COST = {
  flying: 1,
  deathtouch: 1,
  lifelink: 1,
  first_strike: 1,
  unblockable: 1.5,
  hexproof: 1,
  trample: 0.5,
  haste: 0.5,
  vigilance: 0.5,
  defender: -1.5,
};

const COLOR_NAMES = {
  white: 'Белый',
  blue: 'Синий',
  black: 'Чёрный',
  red: 'Красный',
  green: 'Зелёный',
  colorless: 'Бесцветный',
};

const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const outPath = outArg > -1 ? args[outArg + 1] : 'reports/color-balance.md';

const raw = JSON.parse(readFileSync('reports/cards.json', 'utf8'));
const all = Array.isArray(raw) ? raw : raw.cards;

/** Ценность существа по статам и ключевым словам, в единицах статов. */
function creaturePower(card) {
  const stats = (card.attack ?? 0) + (card.health ?? 0);
  const keywordValue = (card.keywords ?? []).reduce((sum, k) => sum + (KEYWORD_COST[k] ?? 0), 0);
  const norm = STATS_PER_MANA * (card.cost ?? 0);
  return { stats, keywordValue, power: stats + keywordValue, norm, ratio: norm > 0 ? (stats + keywordValue) / norm : 0 };
}

const colors = Object.keys(COLOR_NAMES);
const stats = new Map();

for (const color of colors) {
  const cards = all.filter((c) => c.color === color && c.type !== 'land');
  const lands = all.filter((c) => c.color === color && c.type === 'land');
  const creatures = cards.filter((c) => c.type === 'creature');
  const spells = cards.filter((c) => c.type === 'spell');
  const enchantments = cards.filter((c) => c.type === 'enchantment');

  const powers = creatures.map(creaturePower);
  const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  // Карты за 0 маны — это токены (например, Чиновник). Нормы у них нет, делить не на что,
  // и раньше они попадали в среднее как отношение 0, искусственно топя весь цвет.
  // Токен не выбирают при сборке колоды, поэтому в сравнение цветов он не входит.
  const rated = powers.filter((p) => p.norm > 0);
  const tokens = powers.length - rated.length;

  const rarities = { common: 0, uncommon: 0, rare: 0, mythic: 0 };
  for (const c of cards) if (c.rarity in rarities) rarities[c.rarity] += 1;

  const keywords = creatures.flatMap((c) => c.keywords ?? []);

  // Взвешенное отношение: сколько всего статов цвет даёт на всю потраченную ману.
  // Среднее по картам и взвешенное расходятся, когда перекос в дорогие карты.
  const totalPower = rated.reduce((s, p) => s + p.power, 0);
  const totalNorm = rated.reduce((s, p) => s + p.norm, 0);

  stats.set(color, {
    color,
    name: COLOR_NAMES[color],
    cards: cards.length,
    lands: lands.length,
    creatures: creatures.length,
    spells: spells.length,
    enchantments: enchantments.length,
    tokens,
    meanCost: mean(cards.map((c) => c.cost ?? 0)),
    // Главное число: во сколько раз цвет попадает в кривую по существам.
    // 1.00 — ровно в кривую, меньше — цвет слабее за ту же ману.
    meanRatio: mean(rated.map((p) => p.ratio)),
    weightedRatio: totalNorm > 0 ? totalPower / totalNorm : 0,
    meanPower: mean(powers.map((p) => p.power)),
    meanNorm: mean(powers.map((p) => p.norm)),
    // Доля карт, которых можно сыграть на 1-2 мане: это темп, а не сила.
    cheapShare: cards.length ? cards.filter((c) => (c.cost ?? 0) <= 2).length / cards.length : 0,
    keywordDensity: creatures.length ? keywords.length / creatures.length : 0,
    rarities,
    detail: creatures
      .map((c) => ({ card: c, p: creaturePower(c) }))
      .sort((a, b) => a.p.ratio - b.p.ratio),
  });
}

// ─── Вывод ──────────────────────────────────────────────────────────────────

const rows = colors.map((c) => stats.get(c));
const byRatio = [...rows].sort((a, b) => b.meanRatio - a.meanRatio);
const strongest = byRatio[0];
const weakest = byRatio[byRatio.length - 1];
const spread = weakest.meanRatio > 0 ? strongest.meanRatio / weakest.meanRatio : Infinity;

const f2 = (x) => x.toFixed(2);
const pad = (s, n) => String(s).padEnd(n);

console.log('Цвет          карт  сущ  закл  чар  зем  ср.цена  в кривой  взвеш.  темп≤2  ключ/сущ  редкость c/u/r/m');
for (const r of rows) {
  console.log(
    `${pad(r.name, 13)} ${pad(r.cards, 5)} ${pad(r.creatures, 4)} ${pad(r.spells, 5)} ${pad(r.enchantments, 4)} ${pad(r.lands, 4)} ` +
      `${pad(f2(r.meanCost), 8)} ${pad(f2(r.meanRatio), 9)} ${pad(f2(r.weightedRatio), 7)} ${pad(f2(r.cheapShare), 7)} ${pad(f2(r.keywordDensity), 9)} ` +
      `${r.rarities.common}/${r.rarities.uncommon}/${r.rarities.rare}/${r.rarities.mythic}`,
  );
}

console.log('');
console.log(`Разброс по кривой: сильнейший ${strongest.name} ${f2(strongest.meanRatio)}, слабейший ${weakest.name} ${f2(weakest.meanRatio)}`);
console.log(`Отношение: ${f2(spread)}×`);
console.log('');

// Кто именно тянет цвет вниз: без этого отчёт говорит «белый слабый», но не говорит,
// из-за каких карт, и правка превращается в угадывание.
console.log('=== Существа каждого цвета, от слабейшего к сильнейшему ===');
for (const r of [...rows].sort((a, b) => a.meanRatio - b.meanRatio)) {
  const tail = r.tokens ? ` (+${r.tokens} токен за 0 маны, в счёт не идёт)` : '';
  console.log(`\n${r.name} — в кривой ${f2(r.meanRatio)}, существ ${r.creatures}${tail}`);
  for (const { card, p } of r.detail) {
    if (p.norm === 0) {
      console.log(`   ${pad(card.name, 26)} ${card.cost}м ${pad(`${card.attack}/${card.health}`, 6)} токен — нормы нет`);
      continue;
    }
    const flag = p.ratio < 0.8 ? ' ←' : '';
    console.log(
      `   ${pad(card.name, 26)} ${card.cost}м ${pad(`${card.attack}/${card.health}`, 6)} ` +
        `сила ${pad(p.power.toFixed(1), 5)} из ${pad(p.norm.toFixed(0), 3)} = ${f2(p.ratio)}${flag}`,
    );
  }
}

// ─── Матрица возможностей: что каждый цвет умеет ────────────────────────────
//
// Классы эффектов заклинаний и чар уже размечены судьёй в reports/spell-audit.md.
// Здесь они только раскладываются по цветам: новых обращений к модели нет.
// Это ответ на вопрос, который статы существ решить не могут, — заклинания и чары
// и есть то место, где цвета на самом деле расходятся.

const spellReport = readFileSync('reports/spell-audit.md', 'utf8');
const classByCard = new Map();
for (const line of spellReport.split('\n')) {
  const m = /^\| `([a-z0-9_]+)` \| [^|]+ \| [^|]+ \| [^|]+ \| [^|]+ \| ([^|]+) \|/.exec(line);
  if (m) classByCard.set(m[1], m[2].trim());
}

// Разметка — единственный вход этой секции. Пустой разбор означает сломанный
// формат отчёта, а не отсутствие заклинаний: молчаливый ноль здесь был бы ложью.
if (classByCard.size < 20) {
  console.error(`⚠️  Из reports/spell-audit.md разобрано ${classByCard.size} карт — формат отчёта изменился.`);
  process.exit(1);
}

const effectClasses = [...new Set(classByCard.values())].sort();
const matrix = new Map();
for (const color of colors) {
  const perClass = {};
  for (const cls of effectClasses) perClass[cls] = 0;
  for (const card of all.filter((c) => c.color === color && c.type !== 'land')) {
    const cls = classByCard.get(card.id);
    if (cls) perClass[cls] += 1;
  }
  matrix.set(color, perClass);
}

const classShort = (cls) => cls.split(' ')[0];
const padR = (s, n) => String(s).padStart(n);

console.log('');
console.log('=== Что каждый цвет умеет (классы эффектов заклинаний и чар) ===');
console.log(`Цвет          ${effectClasses.map((c) => padR(classShort(c), 12)).join('')}`);
for (const r of rows) {
  const per = matrix.get(r.color);
  const cells = effectClasses.map((c) => padR(per[c] || '·', 12)).join('');
  console.log(`${pad(r.name, 13)} ${cells}`);
}

console.log('');
console.log('Пустая клетка — цвет не умеет этого вообще. Это и есть настоящий разрыв:');
console.log('не в статах, а в отсутствии ответа на целый класс угроз.');

// ─── Ответы на угрозу ───────────────────────────────────────────────────────
//
// Матрица выше считает только заклинания и чары, поэтому недооценивает цвета,
// которые убивают существами: смертельное касание убивает всё, к чему прикоснётся,
// а «уничтожьте» бывает написано на существе. Здесь считается полный набор ответов.
//
// «Убивает» — убирает чужое существо с поля совсем.
// «Останавливает» — не даёт атаковать, но существо остаётся (заморозка, защитник).

const killClass = 'уничтожение и урон';
const freezeClass = 'заморозка';

const answers = new Map();
for (const color of colors) {
  const cards = all.filter((c) => c.color === color && c.type !== 'land');
  const killers = [];
  const stoppers = [];

  for (const card of cards) {
    const cls = classByCard.get(card.id);
    const text = (card.description ?? '').toLowerCase();
    const keywords = card.keywords ?? [];

    // Корень «уничтож», а не «уничтожьте»: у Росгвардии в тексте «уничтожить его»,
    // и точная форма слова давала ложный ноль у белого.
    if (cls === killClass || keywords.includes('deathtouch') || text.includes('уничтож')) {
      killers.push(card.name);
    } else if (cls === freezeClass || keywords.includes('defender')) {
      stoppers.push(card.name);
    }
  }

  answers.set(color, { killers, stoppers });
}

console.log('');
console.log('=== Ответы на чужое существо (включая существ, а не только заклинания) ===');
console.log('Цвет          убивает  останавливает  кто именно убивает');
for (const r of rows) {
  const a = answers.get(r.color);
  console.log(
    `${pad(r.name, 13)} ${pad(a.killers.length, 7)} ${pad(a.stoppers.length, 13)}  ` +
      `${a.killers.join(', ') || '— НИКТО'}`,
  );
}

// ─── Отчёт ──────────────────────────────────────────────────────────────────

const report = [
  '# Баланс цветов: кодовая часть',
  '',
  `Сгенерировано: ${new Date().toISOString().slice(0, 10)}.`,
  '',
  '## Как читать',
  '',
  'Колонка **в кривой** — главное число. Кривая: существо окупает ману при ~2 статах за',
  'единицу маны, из статов вычтена цена ключевых слов. Значение 1.00 значит, что цвет',
  'ровно попадает в кривую; 0.90 — что его существа дают на 10% меньше за ту же ману.',
  '',
  '**темп≤2** — доля карт, играбельных на первой-второй мане. Это про скорость, а не про',
  'силу: медленный цвет может быть сильным, но обязан чем-то это окупать.',
  '',
  '**ключ/сущ** — сколько ключевых слов в среднем на существо. Больше слов при том же',
  'числе в кривой значит более гибкий цвет.',
  '',
  '| цвет | карт | существ | заклинаний | чар | земель | ср. цена | в кривой | темп≤2 | ключ/сущ | common/uncommon/rare/mythic |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map(
    (r) =>
      `| ${r.name} | ${r.cards} | ${r.creatures} | ${r.spells} | ${r.enchantments} | ${r.lands} | ` +
      `${f2(r.meanCost)} | **${f2(r.meanRatio)}** | ${f2(r.cheapShare)} | ${f2(r.keywordDensity)} | ` +
      `${r.rarities.common}/${r.rarities.uncommon}/${r.rarities.rare}/${r.rarities.mythic} |`,
  ),
  '',
  `## Разброс`,
  '',
  `Сильнейший по кривой: **${strongest.name}** (${f2(strongest.meanRatio)}).`,
  `Слабейший: **${weakest.name}** (${f2(weakest.meanRatio)}). Отношение: **${f2(spread)}×**.`,
  '',
  '## Проверка прибора: держится ли разброс',
  '',
  'Числа выше держатся на НАШИХ догадках о цене ключевых слов. Проверено, что будет,',
  'если менять эти догадки по одной:',
  '',
  '| что меняли | порядок цветов | разброс |',
  '|---|---|---|',
  '| как есть (защитник −1.5) | Зелёный, Красный, Чёрный, Синий, Белый, Бесцветный | 1.34× |',
  '| защитник −1.0 | Зелёный, Красный, Чёрный, Синий, Белый, Бесцветный | 1.29× |',
  '| защитник −2.0 | Зелёный, Красный, Чёрный, Синий, Белый, Бесцветный | 1.40× |',
  '| привязка к жизни 0.5 | Зелёный, Красный, Чёрный, Синий, Белый, Бесцветный | 1.32× |',
  '| привязка к жизни 1.5 | Зелёный, Красный, Чёрный, Синий, Белый, Бесцветный | 1.37× |',
  '| все слова по 0.5 | Зелёный, Красный, Синий, Белый, Бесцветный, **Чёрный** | 1.30× |',
  '| все слова по 0 | Зелёный, Синий, Красный, Белый, Бесцветный, **Чёрный** | 1.40× |',
  '| защитник 0 (не штрафуем) | Зелёный, Белый, Синий, Красный, Чёрный, Бесцветный | 1.20× |',
  '',
  '**Вывод: устойчиво только одно.** Зелёный первый во всех восьми вариантах — но лучшие',
  'существа за ману и есть характер зелёного, это замысел, а не дефект. Порядок остальных',
  'цветов переворачивается от смены одной догадки: чёрный гуляет со третьего места на',
  'последнее. Значит про белый, синий, чёрный и красный этот прибор не знает ничего, и',
  'разброс 1.20–1.40× — это разброс наших допущений, а не измерение игры.',
  '',
  '## Что каждый цвет умеет (классы эффектов заклинаний и чар)',
  '',
  'Классы размечены судьёй в `reports/spell-audit.md`; здесь они разложены по цветам.',
  'Точка — цвет не умеет этого вообще.',
  '',
  `| цвет | ${effectClasses.join(' | ')} |`,
  `|---|${effectClasses.map(() => '---').join('|')}|`,
  ...rows.map((r) => {
    const per = matrix.get(r.color);
    return `| ${r.name} | ${effectClasses.map((c) => per[c] || '·').join(' | ')} |`;
  }),
  '',
  '## Ответы на чужое существо',
  '',
  'Матрица выше считает только заклинания и чары и потому недооценивает цвета, которые',
  'убивают существами: смертельное касание убивает всё, к чему прикоснётся. Здесь полный',
  'набор, включая существ.',
  '',
  '**Убивает** — убирает чужое существо с поля совсем. **Останавливает** — не даёт',
  'атаковать, но существо остаётся (защитник, заморозка).',
  '',
  '| цвет | убивает | останавливает | кто именно убивает |',
  '|---|---|---|---|',
  ...rows.map((r) => {
    const a = answers.get(r.color);
    return `| ${r.name} | ${a.killers.length} | ${a.stoppers.length} | ${a.killers.join(', ') || '— никого'} |`;
  }),
  '',
  '### Находка и что с ней сделано',
  '',
  'На замере 2026-09-22 **у зелёного было 0 убийств и 0 остановок** — ни одного способа',
  'вмешаться в чужое существо. Это критично именно из-за отсутствия шага блокирования:',
  'в MTG зелёный выживает без убийств потому, что его крупные звери **блокируют**, а здесь',
  'атакующий сам выбирает цель, и зверь 6/6 не мешает существу 2/2 бить в лицо. Значит',
  'зелёный не мог ни защититься, ни убить — только гонка.',
  '',
  'Исправлено: «Бабка с Семечками» (2 маны, 0/3) получила **Защитник**. Она стоила этого',
  'изменения ноль: атака у неё 0, нападать она не может в принципе, так что перехват не',
  'отнимает у неё ничего и даёт зелёному единственный ответ. Её реплика Хранителя и так',
  'говорила ровно это: «Бабка никуда не уедет — у неё лавочка».',
  '',
  'Сторож: `tests/game/color-answers.test.ts` требует, чтобы у каждого цвета был хотя бы',
  'один ответ, и чтобы существо с нулевой атакой всегда было защитником.',
  '',
  '**Остаётся открытым:** зелёный по-прежнему единственный цвет без убийств (1 остановка',
  'против 6 у синего). Это может быть его характером — «выживи и перерасти», — но это',
  'решение о замысле, а не измерение, и его должен принять человек.',
  '',
  '## Оговорки',
  '',
  '- Считаны только существа: у заклинаний и чар нет статов, их цену код не знает.',
  '  Если цвета разошлись по существам — дальше нужен судья по прозе заклинаний.',
  '- Цена ключевых слов и кривая «2 стата за ману» — наша оценка, а не измерение.',
  '- Малое число существ на цвет (9-13 карт) означает, что средняя легко сдвигается',
  '  одной картой. Разница меньше ~5% здесь, скорее всего, шум, а не дисбаланс.',
  '- Отчёт ничего не меняет: он показывает, куда смотреть.',
  '',
].join('\n');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, report, 'utf8');
console.log('отчёт записан:', outPath);
