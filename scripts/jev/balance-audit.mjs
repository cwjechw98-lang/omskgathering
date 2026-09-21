/**
 * Аудит баланса карт: направление Б технического задания.
 *
 * РАЗДЕЛЕНИЕ ТРУДА (нарушение любого пункта = неверная постановка задачи):
 *   КОД считает: сумму статов, норму по кривой, разницу, цену ключевых слов, итог.
 *   JEV судит:  оправдывает ли ТЕКСТ способности недобранные статы. Это суждение по
 *               прозе, которое кодом не выражается — способности открытые, а не список.
 *
 * ПРО ДВЕ ОСИ (урок пробы probe-classify.mjs):
 *   У карты может быть И ключевое слово, И отдельная способность. Требовать один ярлык
 *   на такую карту — неверная рубрика: модель выберет вторичный эффект. Поэтому здесь
 *   ключевое слово оценивает код, а текст — модель, и это два разных слагаемых.
 *
 * ЧТО СЧИТАЕТСЯ НАХОДКОЙ:
 *   карта недобирает статы, ключевые слова этого не объясняют, и текст способности тоже
 *   не оправдывает — значит карта слабая за свою цену.
 *
 * Запуск: node scripts/jev/balance-audit.mjs [--limit N] [--out путь]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const CLIENT = pathToFileURL(
  join(homedir(), '.dsh', 'skills', 'jev-decision-judge', 'scripts', 'jev.mjs'),
).href;
const { ask, logOutcome } = await import(CLIENT);

// ─── Эталон кривой: считается кодом, не моделью ─────────────────────────────

/** Бюджет статов: существо окупает свою ману, если даёт ~2 стата за единицу маны. */
const STATS_PER_MANA = 2;

/**
 * Цена ключевого слова в статах. Это НАША оценка, а не мнение модели: она вынесена
 * в код именно для того, чтобы модель её не пересчитывала.
 * Знак минус — механика ограничивает существо (защитник не атакует).
 */
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

/** Порог находки: насколько карта должна недобирать, чтобы попасть в отчёт. */
const DEFICIT_THRESHOLD = 2;

/** Порог вероятности, по которому код решает, что модель сказала «да». */
const NOUL_THRESHOLD = 0.5;

// ─── Данные ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const limitArg = args.indexOf('--limit');
const limit = limitArg > -1 ? Number(args[limitArg + 1]) : 0;
const outArg = args.indexOf('--out');
const outPath = outArg > -1 ? args[outArg + 1] : 'reports/balance-audit.md';

const raw = JSON.parse(readFileSync('reports/cards.json', 'utf8'));
const all = Array.isArray(raw) ? raw : raw.cards;
const creatures = all.filter((c) => c.type === 'creature');

/** Признаки: всё, что можно посчитать, считается здесь. */
function facts(card) {
  const attack = card.attack ?? 0;
  const health = card.health ?? 0;
  const cost = card.cost ?? 0;
  const stats = attack + health;
  const norm = STATS_PER_MANA * cost;
  const keywords = card.keywords ?? [];
  const keywordValue = keywords.reduce((sum, k) => sum + (KEYWORD_COST[k] ?? 0), 0);
  const text = (card.description ?? '').trim();

  return {
    attack,
    health,
    cost,
    stats,
    norm,
    keywords,
    keywordValue,
    text,
    // Сколько карта недобирает ПОСЛЕ учёта ключевых слов. Это и есть предмет суждения.
    gap: norm - stats - keywordValue,
  };
}

const scored = creatures.map((c) => ({ card: c, f: facts(c) }));

/**
 * Средние статы по каждому уровню маны. Нужны, чтобы поймать карту, слабую
 * ОТНОСИТЕЛЬНО равных: абсолютный порог такую пропускает.
 */
const byCost = new Map();
for (const s of scored) {
  const arr = byCost.get(s.f.cost) ?? [];
  arr.push(s.f.stats + s.f.keywordValue);
  byCost.set(s.f.cost, arr);
}
const avgAtCost = new Map();
for (const [cost, arr] of byCost) {
  avgAtCost.set(cost, arr.reduce((a, b) => a + b, 0) / arr.length);
}
for (const s of scored) {
  s.f.peerAvg = avgAtCost.get(s.f.cost) ?? 0;
  s.f.peerGap = s.f.peerAvg - (s.f.stats + s.f.keywordValue);
}

// ─── Кого спрашиваем ────────────────────────────────────────────────────────

/**
 * Модель нужна там, где остаётся суждение по прозе: карта недобирает статы
 * по абсолютной кривой ИЛИ заметно отстаёт от карт той же цены, и у неё есть текст,
 * который код посчитать не может.
 */
const needsJudgment = (s) =>
  (s.f.gap >= DEFICIT_THRESHOLD || s.f.peerGap >= DEFICIT_THRESHOLD) && s.f.text.length > 0;

const toJudge = scored.filter(needsJudgment);
const fineByCode = scored.filter((s) => !needsJudgment(s));

const judged = limit > 0 ? toJudge.slice(0, limit) : toJudge;

console.log('Существа:', creatures.length);
console.log('  требуют суждения по тексту:', toJudge.length);
console.log('  в норме по коду:', fineByCode.length);
console.log('  спрашиваю модель про:', judged.length);
console.log('');

// ─── Запрос ─────────────────────────────────────────────────────────────────

const state = [
  'Игра: коллекционная карточная игра. Кривая: существо окупает свою ману, если даёт',
  'около двух статов (атака + здоровье) за единицу маны. Ключевые слова уже учтены',
  'в расчёте отдельно. Ниже существа с посчитанными числами.',
  '',
  ...judged.map(({ card, f }) =>
    [
      `id: ${card.id}`,
      `  имя: ${card.name}`,
      `  цена: ${f.cost} маны, ${f.attack}/${f.health}`,
      `  ключевые слова: ${f.keywords.join(', ') || 'нет'}`,
      `  нехватка статов после учёта ключевых слов: ${f.gap.toFixed(1)}`,
      `  отставание от карт той же цены: ${f.peerGap.toFixed(1)} (средние статы на этой цене ${f.peerAvg.toFixed(1)})`,
      `  текст способности: ${f.text}`,
    ].join('\n'),
  ),
].join('\n');

const questions = {};
for (const { card, f } of judged) {
  questions[`comp_${card.id}`] = {
    type: 'noul',
    instructions:
      `Существо «${card.name}» за ${f.cost} маны недобирает ${f.gap.toFixed(1)} статов ` +
      `относительно кривой и отстаёт на ${f.peerGap.toFixed(1)} от карт той же цены. ` +
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

console.log('Отправляю', judged.length, 'карт одним запросом...\n');
const res = await ask(state, questions, { model: 'jev-latest' });

console.log('модель:', res.model, '| вход:', res.inputTokens, 'ток. | цена: $' + res.costUsd.toFixed(6));
console.log('');

// ─── Решение принимает КОД, не модель ───────────────────────────────────────

const results = judged.map(({ card, f }) => {
  const a = res.answers[`comp_${card.id}`] ?? {};
  const p = a.noul ?? 0;
  const justified = p >= NOUL_THRESHOLD;
  return {
    id: card.id,
    name: card.name,
    cost: f.cost,
    stats: `${f.attack}/${f.health}`,
    keywords: f.keywords.join(', ') || '—',
    gap: f.gap,
    peerGap: f.peerGap,
    probability: p,
    justified,
    // Находка: карта слабая за цену и текст её не спасает.
    finding: !justified,
    text: f.text,
  };
});

const findings = results.filter((r) => r.finding).sort((a, b) => b.gap - a.gap);
const ok = results.filter((r) => !r.finding).sort((a, b) => b.gap - a.gap);

const line = (r) =>
  `| \`${r.id}\` | ${r.name} | ${r.cost} | ${r.stats} | −${r.gap.toFixed(1)} | −${r.peerGap.toFixed(1)} | ${r.keywords} | ${r.probability.toFixed(2)} |`;

console.log('НАХОДКИ — недобирают статы, и текст не оправдывает:', findings.length);
for (const r of findings) console.log(`  ${r.name} (${r.cost} маны, ${r.stats}, нехватка ${r.gap.toFixed(1)}, p=${r.probability.toFixed(2)})`);
console.log('');
console.log('ОПРАВДАНЫ текстом:', ok.length);
for (const r of ok) console.log(`  ${r.name} (нехватка ${r.gap.toFixed(1)}, p=${r.probability.toFixed(2)})`);

// ─── Отчёт ──────────────────────────────────────────────────────────────────

const report = [
  '# Аудит баланса карт (Jev)',
  '',
  `Сгенерировано: ${new Date().toISOString().slice(0, 10)}. Модель: ${res.model}.`,
  `Стоимость прогона: $${res.costUsd.toFixed(6)} (${res.inputTokens} входных токенов).`,
  '',
  '## Как читать',
  '',
  'Арифметику считает код: существо окупает ману при ~2 статах за единицу. Из нехватки',
  'вычтена цена ключевых слов. Дополнительно считается отставание от карт **той же цены** —',
  'абсолютный порог не ловит карту, слабую относительно равных.',
  '',
  'Модель отвечает только на один вопрос: оправдывает ли нехватку текст способности.',
  '**Решение о правке баланса принимает человек — отчёт ничего не меняет.**',
  '',
  `В отчёт попадают карты с нехваткой или отставанием от ${DEFICIT_THRESHOLD} статов.`,
  '',
  '**Прибор проверен контролем:** те же карты с затёртым текстом получили вероятность',
  '0.05 против 0.73 с настоящим текстом (сдвиг 0.68, `scripts/jev/balance-control.mjs`).',
  'Рубрика различает наличие способности, а не отвечает «да» по умолчанию.',
  '',
  `## Находки: ${findings.length}`,
  '',
  'Карты слабее своей цены, и способность этого не объясняет.',
  '',
  '| id | имя | мана | статы | нехватка | отставание от равных | ключевые слова | p(оправдано) |',
  '|---|---|---|---|---|---|---|---|',
  ...findings.map(line),
  '',
  `## Оправданы текстом: ${ok.length}`,
  '',
  'Недобирают статы, но способность это компенсирует — трогать не нужно.',
  '',
  '| id | имя | мана | статы | нехватка | отставание от равных | ключевые слова | p(оправдано) |',
  '|---|---|---|---|---|---|---|---|',
  ...ok.map(line),
  '',
  '## Не спрашивали у модели',
  '',
  `- **${fineByCode.length}** карт в норме по коду: и нехватка, и отставание от равных`,
  `  меньше ${DEFICIT_THRESHOLD} статов.`,
  '',
  '## Оговорки',
  '',
  '- Цена ключевых слов в статах (`KEYWORD_COST`) — наша оценка, а не мнение модели.',
  '  Если она неверна, неверен и отбор карт для суждения.',
  '- Кривая «2 стата за ману» — тоже наша оценка, а не измерение. Она задаёт, кого',
  '  вообще спросить, а не что считать сломанным.',
  '- Нехватка статов — не приговор: карта может быть слабой по статам и сильной по',
  '  темпу. Отчёт указывает, куда смотреть, а не что править.',
  '- В отчёт попадают только существа: у заклинаний, чар и земель нет статов, для них',
  '  нужна отдельная рубрика.',
  '',
].join('\n');

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, report, 'utf8');
console.log('');
console.log('отчёт записан:', outPath);

// ─── Опыт в журнал скилла ───────────────────────────────────────────────────

logOutcome({
  label: 'аудит баланса карт (направление Б)',
  model: res.model,
  inputTokens: res.inputTokens,
  costUsd: Number(res.costUsd.toFixed(6)),
  verdict: 'unclear',
  note:
    `существ ${creatures.length}, спросили ${judged.length}, находок ${findings.length}. ` +
    'Рубрика: одна ось на вопрос (текст поверх ключевого слова). Вердикт требует проверки человеком.',
});
