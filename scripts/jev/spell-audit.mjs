/**
 * Аудит баланса заклинаний и чар: продолжение направления Б.
 *
 * ПОЧЕМУ ДРУГАЯ РУБРИКА. У существ баланс считался по статам: 2 стата за ману.
 * У заклинаний статов нет, поэтому работает другая логика:
 *   КОД группирует карты по классу эффекта и сравнивает ЦЕНУ внутри класса.
 *   JEV отвечает на один вопрос: к какому классу относится эффект карты.
 *
 * ЧТО ЗНАЧИТ НАХОДКА. Если две карты делают одно и то же, а стоят по-разному —
 * дорогая слабее за свою цену. Это измеримо и не требует мнения о «силе эффекта».
 *
 * ПОЧЕМУ ЭТОЙ КЛАССИФИКАЦИИ МОЖНО ВЕРИТЬ (проверено, см. spell-class-control.mjs):
 *   - согласие между прямым и обратным порядком: 29/30 (97%);
 *   - подмена текста сдвигает метку в 24 случаях из 30 — модель читает ТЕКСТ,
 *     а не угадывает по названию;
 *   - обезличивание имён не меняет разметку (30/30) — название не опора.
 *
 * Запуск: node scripts/jev/spell-audit.mjs [--out путь]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const CLIENT = pathToFileURL(
  join(homedir(), '.dsh', 'skills', 'jev-decision-judge', 'scripts', 'jev.mjs'),
).href;
const { ask, logOutcome } = await import(CLIENT);

/** Классы эффекта — закрытый список, одна ось: что карта делает с игрой. */
const EFFECT_CLASSES = {
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

/** Русские подписи классов для отчёта. */
const CLASS_RU = {
  removal: 'уничтожение и урон',
  freeze: 'заморозка',
  draw: 'добор карт',
  buff: 'усиление',
  heal: 'лечение',
  discard: 'сброс карт',
  bounce: 'возврат в руку',
  sweep: 'массовый урон',
  ramp: 'разгон маны',
  value: 'прочее',
};

/**
 * Порог находки: насколько дороже нормы своего класса должна быть карта.
 * Сравнивается не сырая цена, а цена за вычетом ценности лишних эффектов:
 * карта, которая делает три вещи, законно стоит дороже той, что делает одну.
 * Без этой поправки все находки оказывались ровно на пороге — признак того,
 * что рубрика сравнивает несравнимое.
 */
const OVERPRICE_THRESHOLD = 2;

/** Сколько маны «стоит» каждый эффект сверх первого. Наша оценка, не мнение модели. */
const EXTRA_EFFECT_VALUE = 1.5;

const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const outPath = outArg > -1 ? args[outArg + 1] : 'reports/spell-audit.md';

const raw = JSON.parse(readFileSync('reports/cards.json', 'utf8'));
const all = Array.isArray(raw) ? raw : raw.cards;
const subjects = all.filter((c) => c.type === 'spell' || c.type === 'enchantment');

/** Заклинания и чары: разовый эффект против постоянного. */
const KIND = { spell: 'разовое', enchantment: 'постоянное' };

// ─── Запрос: один вопрос на карту ───────────────────────────────────────────

const state = [
  'Игра: коллекционная карточная игра. Ниже карты заклинаний и чар с их стоимостью.',
  '',
  ...subjects.map((c) =>
    [
      `id: ${c.id}`,
      `  имя: ${c.name}`,
      `  цена: ${c.cost} маны`,
      `  текст: ${c.description.trim()}`,
    ].join('\n'),
  ),
].join('\n');

const questions = {};
for (const c of subjects) {
  questions[`cls_${c.id}`] = {
    type: 'choice',
    instructions:
      `Карта «${c.name}»: ${c.description.trim()} ` +
      'Что эта карта делает с игрой? Выбери ОДИН главный класс — тот, который сильнее ' +
      'всего влияет на исход. Если карта делает несколько вещей, выбери самое важное, ' +
      'а не первое упомянутое.',
    criteria: EFFECT_CLASSES,
  };
  // Второй вопрос, отдельная ось: сколько у карты значимых эффектов. Без него
  // сравнение цен внутри класса штрафует карты, которые просто делают больше.
  questions[`eff_${c.id}`] = {
    type: 'choice',
    instructions:
      `Карта «${c.name}»: ${c.description.trim()} ` +
      'Сколько у этой карты РАЗНЫХ значимых эффектов? Считай только то, что реально ' +
      'влияет на игру. Разные части одного эффекта (например «+2/+2 и ускорение» или ' +
      '«заморозить всех и они не атакуют») — это один эффект.',
    criteria: {
      one: 'один эффект',
      two: 'два разных эффекта',
      three: 'три или больше разных эффектов',
    },
  };
}

console.log('Карт заклинаний и чар:', subjects.length);
console.log('Прогон 1: прямой порядок...');
const res = await ask(state, questions, { model: 'jev-latest' });

// Второй прогон в обратном порядке: поправка на число эффектов теперь определяет
// результат, поэтому её устойчивость надо измерить, а не предполагать.
console.log('Прогон 2: обратный порядок...\n');
const res2 = await ask(
  [
    'Игра: коллекционная карточная игра. Ниже карты заклинаний и чар с их стоимостью.',
    '',
    ...[...subjects].reverse().map((c) =>
      [
        `id: ${c.id}`,
        `  имя: ${c.name}`,
        `  цена: ${c.cost} маны`,
        `  текст: ${c.description.trim()}`,
      ].join('\n'),
    ),
  ].join('\n'),
  questions,
  { model: 'jev-latest' },
);

const totalCost = res.costUsd + res2.costUsd;
console.log('модель:', res.model, '| вход:', res.inputTokens + res2.inputTokens, 'ток. | цена: $' + totalCost.toFixed(6));
console.log('');

// ─── Классификация ──────────────────────────────────────────────────────────

const EFFECT_COUNT = { one: 1, two: 2, three: 3 };

/** Разметка одного прогона: класс, число эффектов и уверенности. */
function readRun(run, card) {
  const a = run.answers[`cls_${card.id}`] ?? {};
  const e = run.answers[`eff_${card.id}`] ?? {};
  return {
    cls: a.choice ?? 'value',
    confidence: a.confidence ?? 0,
    effects: EFFECT_COUNT[e.choice] ?? 1,
    effectsConfidence: e.confidence ?? 0,
  };
}

const cards = subjects.map((c) => {
  const r1 = readRun(res, c);
  const r2 = readRun(res2, c);
  return {
    id: c.id,
    name: c.name,
    cost: c.cost ?? 0,
    type: c.type,
    kind: KIND[c.type] ?? c.type,
    text: c.description.trim(),
    cls: r1.cls,
    confidence: r1.confidence,
    effects: r1.effects,
    effectsConfidence: r1.effectsConfidence,
    // Устойчивость: совпали ли класс и число эффектов между прогонами.
    stableClass: r1.cls === r2.cls,
    stableEffects: r1.effects === r2.effects,
    altClass: r2.cls,
    altEffects: r2.effects,
    // Цена с поправкой на число эффектов: лишние эффекты стоят маны законно.
    adjusted: (c.cost ?? 0) - (r1.effects - 1) * EXTRA_EFFECT_VALUE,
  };
});

const classAgree = cards.filter((c) => c.stableClass).length;
const effectAgree = cards.filter((c) => c.stableEffects).length;
const unstable = cards.filter((c) => !c.stableClass || !c.stableEffects);

console.log('=== устойчивость между прогонами ===');
console.log(`класс эффекта совпал: ${classAgree}/${cards.length}`);
console.log(`число эффектов совпало: ${effectAgree}/${cards.length}`);
if (unstable.length) {
  console.log('нестабильные карты (в отчёте помечены):');
  for (const c of unstable) {
    console.log(
      `  ${c.name}: класс ${c.cls}→${c.altClass}, эффектов ${c.effects}→${c.altEffects}`,
    );
  }
}
console.log('');

// ─── Арифметика: норма по классу и переплата — считает КОД ───────────────────

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const groups = new Map();
for (const c of cards) {
  const arr = groups.get(c.cls) ?? [];
  arr.push(c);
  groups.set(c.cls, arr);
}

for (const [, arr] of groups) {
  // Норма считается по ЦЕНЕ С ПОПРАВКОЙ: иначе класс из одних многоэффектных карт
  // завышал бы норму, а класс из простых — занижал.
  const med = median(arr.map((c) => c.adjusted));
  for (const c of arr) {
    c.classMedian = med;
    c.overpay = c.adjusted - med;
    // Находка: карта дороже нормы своего класса на порог или больше,
    // причём с учётом того, сколько эффектов она даёт.
    c.finding = c.overpay >= OVERPRICE_THRESHOLD;
  }
}

const findings = cards.filter((c) => c.finding).sort((a, b) => b.overpay - a.overpay);

/**
 * Проверка, не зависящая от модели вообще: одинаковый эффект за разную цену.
 * Сравниваются нормализованные тексты. Это самый крепкий класс находок — здесь
 * нечего оспаривать, потому что две карты делают ровно одно и то же, а стоят по-разному.
 */
const normalize = (t) =>
  t
    .toLowerCase()
    .replace(/[«»"".,!?;:—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const byText = new Map();
for (const c of cards) {
  const key = normalize(c.text);
  const arr = byText.get(key) ?? [];
  arr.push(c);
  byText.set(key, arr);
}

const duplicates = [];
for (const [, arr] of byText) {
  if (arr.length < 2) continue;
  const costs = [...new Set(arr.map((c) => c.cost))];
  if (costs.length > 1) duplicates.push({ cards: arr, costs: costs.sort((a, b) => a - b) });
}

/**
 * Вложенность: текст одной карты целиком содержится в тексте другой.
 * Ловит случай «одна карта делает всё то же плюс ещё одно, но стоит дешевле» —
 * это крепче простого совпадения, потому что сравнивать силу эффектов не нужно.
 */
const subsets = [];
for (const a of cards) {
  for (const b of cards) {
    if (a === b) continue;
    const na = normalize(a.text);
    const nb = normalize(b.text);
    if (na.length >= 15 && nb.length > na.length && nb.includes(na) && b.cost <= a.cost) {
      subsets.push({ weaker: a, stronger: b, extra: nb.replace(na, '').trim() });
    }
  }
}

console.log('=== одинаковый текст, разная цена (без модели) ===');
if (!duplicates.length) console.log('  не найдено');
for (const d of duplicates) {
  const names = d.cards.map((c) => `${c.name} (${c.cost})`).join(' vs ');
  console.log(`  ${names} — разница ${d.costs[d.costs.length - 1] - d.costs[0]} маны`);
  console.log(`    текст: ${d.cards[0].text}`);
}
console.log('');
console.log('=== вложенный эффект: делает больше, а стоит не дороже (без модели) ===');
if (!subsets.length) console.log('  не найдено');
for (const s of subsets) {
  console.log(
    `  «${s.weaker.name}» (${s.weaker.cost}) целиком входит в «${s.stronger.name}» (${s.stronger.cost}), ` +
      `при этом вторая ДЕШЕВЛЕ или равна. Лишнее у второй: ${s.extra || '—'}`,
  );
}
console.log('');

// ─── Вывод в консоль ────────────────────────────────────────────────────────

console.log('Классы эффектов:');
for (const [cls, arr] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
  const med = arr[0].classMedian;
  const costs = arr.map((c) => `${c.cost}${c.effects > 1 ? `(${c.effects}эф)` : ''}`).join(', ');
  console.log(`  ${CLASS_RU[cls].padEnd(20)} n=${String(arr.length).padStart(2)}  норма ${med.toFixed(1)}  цены: ${costs}`);
}
console.log('');

console.log(`НАХОДКИ — дороже нормы своего класса на ${OVERPRICE_THRESHOLD}+ маны (с учётом числа эффектов):`, findings.length);
for (const c of findings) {
  console.log(
    `  ${c.name} (${c.kind}, ${c.cost} маны, эффектов ${c.effects} → с поправкой ${c.adjusted.toFixed(1)}, норма ${c.classMedian.toFixed(1)}, переплата ${c.overpay.toFixed(1)})`,
  );
}
console.log('');

const multiEffect = cards.filter((c) => c.effects > 1);
console.log(`Карт с двумя и более эффектами: ${multiEffect.length} из ${cards.length}`);
for (const c of multiEffect.sort((a, b) => b.cost - a.cost)) {
  console.log(`  ${c.name} (${c.cost} маны, эффектов ${c.effects})`);
}
console.log('');

// ─── Отчёт ──────────────────────────────────────────────────────────────────

const classTable = [...groups]
  .sort((a, b) => b[1].length - a[1].length)
  .map(([cls, arr]) => {
    const costs = arr
      .map((c) => `${c.cost}${c.effects > 1 ? ` (${c.effects} эф.)` : ''}`)
      .join(', ');
    return `| ${CLASS_RU[cls]} | ${arr.length} | ${arr[0].classMedian.toFixed(1)} | ${costs} |`;
  });

const findingRows = findings.map(
  (c) =>
    `| \`${c.id}\` | ${c.name} | ${c.kind} | ${c.cost} | ${c.effects} | ${c.adjusted.toFixed(1)} | ${CLASS_RU[c.cls]} | ${c.classMedian.toFixed(1)} | **+${c.overpay.toFixed(1)}** | ${c.text} |`,
);

const report = [
  '# Аудит баланса заклинаний и чар (Jev)',
  '',
  `Сгенерировано: ${new Date().toISOString().slice(0, 10)}. Модель: ${res.model}.`,
  `Стоимость прогона: $${totalCost.toFixed(6)} (${res.inputTokens + res2.inputTokens} входных токенов, два прогона).`,
  '',
  '## Как читать',
  '',
  'У заклинаний и чар нет статов, поэтому рубрика другая. **Модель отвечает на два',
  'вопроса: к какому классу относится главный эффект карты и сколько у неё значимых',
  'эффектов.** Дальше арифметику делает код.',
  '',
  `Ключевая поправка: карта, которая делает несколько вещей, законно стоит дороже.`,
  `Каждый эффект сверх первого оценён в ${EXTRA_EFFECT_VALUE} маны (наша оценка, не мнение`,
  'модели), и сравнение идёт по цене **с поправкой**. Без неё сравнение штрафовало бы',
  'просто более богатые карты — первая версия отчёта дала четыре находки ровно на',
  'пороге, что и было признаком несравнимого сравнения.',
  '',
  '**Решение о правке баланса принимает человек — отчёт ничего не меняет.**',
  '',
  '## Почему этой разметке можно верить',
  '',
  'Проверено отдельными опытами:',
  '',
  '| Проверка | Результат |',
  '|---|---|',
  `| Согласие класса между прямым и обратным порядком | ${classAgree}/${cards.length} |`,
  `| Согласие числа эффектов между прогонами | ${effectAgree}/${cards.length} |`,
  '| Подмена текста сдвигает метку | 24/30 — модель читает **текст**, а не название |',
  '| Обезличивание имён не меняет разметку | 30/30 — название не опора |',
  '| Энтропия разметки | 2.84 бита при максимуме 3.32 — не сваливает всё в один класс |',
  '',
  '## Классы эффектов и цены внутри них',
  '',
  '| Класс | Карт | Норма (с поправкой) | Цены |',
  '|---|---|---|---|',
  ...classTable,
  '',
  `## Находки: ${findings.length}`,
  '',
  `Карты дороже нормы своего класса на ${OVERPRICE_THRESHOLD} и более маны — уже с учётом`,
  'того, сколько эффектов они дают.',
  '',
  '| id | имя | вид | мана | эффектов | с поправкой | класс | норма | переплата | текст |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...findingRows,
  '',
  '## Проверка без модели: вложенные эффекты',
  '',
  'Отдельная проверка, которая **не зависит от разметки вообще** — сравнение текстов.',
  'Если текст одной карты целиком содержится в тексте другой, а вторая при этом стоит',
  'не дороже, то более дорогая карта делает строго меньше. Здесь нечего оспаривать.',
  '',
  subsets.length
    ? [
        '| дороже и слабее | цена | дешевле и сильнее | цена | лишний эффект у дешёвой |',
        '|---|---|---|---|---|',
        ...subsets.map(
          (s) =>
            `| ${s.weaker.name} | ${s.weaker.cost} | ${s.stronger.name} | ${s.stronger.cost} | ${s.extra || '—'} |`,
        ),
      ].join('\n')
    : 'Не найдено.',
  '',
  duplicates.length
    ? [
        'Полные совпадения текста при разной цене:',
        '',
        ...duplicates.map((d) => `- ${d.cards.map((c) => `${c.name} (${c.cost})`).join(' vs ')}`),
      ].join('\n')
    : 'Полных совпадений текста при разной цене нет.',
  '',
  '## Полная разметка',
  '',
  'Колонка «устойчиво» — совпала ли разметка между прямым и обратным прогоном.',
  'Карты с «нет» надо смотреть глазами: их цена с поправкой могла посчитаться неверно.',
  '',
  '| id | имя | вид | мана | эффектов | класс | уверенность | устойчиво | текст |',
  '|---|---|---|---|---|---|---|---|---|',
  ...cards
    .slice()
    .sort((a, b) => a.cost - b.cost)
    .map(
      (c) =>
        `| \`${c.id}\` | ${c.name} | ${c.kind} | ${c.cost} | ${c.effects} | ${CLASS_RU[c.cls]} | ${c.confidence.toFixed(2)} | ${c.stableClass && c.stableEffects ? 'да' : '**нет**'} | ${c.text} |`,
    ),
  '',
  '## Оговорки',
  '',
  '- **Норма класса — не приговор.** Внутри класса эффекты разной силы: «заморозить',
  '  одного» и «заморозить всех» попадут в один класс. Переплата означает «посмотреть',
  '  глазами», а не «сломано».',
  `- **Оценка эффекта в ${EXTRA_EFFECT_VALUE} маны — наша, а не измерение.** Она задаёт, кого`,
  '  показать, а не что считать сломанным.',
  '- **Разовые и постоянные эффекты в одном классе.** Чары действуют каждый ход, поэтому',
  '  законно стоят дороже заклинания с похожим текстом. Вид карты указан в таблице.',
  '- **Классы с малой выборкой ничего не доказывают:** там, где карт 1–2, норма — это цена',
  '  самой карты, и переплаты быть не может по построению.',
  '- **Разметку даёт модель, и она может ошибиться.** Надёжность измерена и приведена',
  '  выше; карты с пометкой «устойчиво: нет» требуют ручной проверки.',
  '- **Находки зависят от числа эффектов**, а его определяет модель. Ошибка в счёте',
  '  эффектов сдвигает цену с поправкой на 1.5 маны — то есть может создать или убрать',
  '  находку. Поэтому устойчивость числа эффектов измерена отдельно.',
  '- **Земли в аудит не входят:** у всех шести цена 0 и эффект «+1 мана».',
  '',
].join('\n');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, report, 'utf8');
console.log('отчёт записан:', outPath);

// ─── Опыт в журнал скилла ───────────────────────────────────────────────────

logOutcome({
  label: 'аудит заклинаний и чар (направление Б, часть 2)',
  model: res.model,
  inputTokens: res.inputTokens + res2.inputTokens,
  costUsd: Number(totalCost.toFixed(6)),
  verdict: 'unclear',
  note:
    `карт ${subjects.length}, классов ${groups.size}, находок ${findings.length}. ` +
    `Устойчивость: класс ${classAgree}/${cards.length}, число эффектов ${effectAgree}/${cards.length}. ` +
    'Вердикт требует проверки человеком.',
});
