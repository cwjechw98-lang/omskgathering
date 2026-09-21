/**
 * Покрытие карт лором: у кого есть голос, а у кого нет.
 *
 * Зачем отдельный инструмент. «Голос карты» живёт в трёх разных таблицах lore.ts:
 * CARD_NARRATIVES (что происходит, когда карта выходит на поле), DEATH_QUOTES (что
 * происходит, когда она гибнет) и комментарии Хранителя в getAILoreComment. Карта
 * считается озвученной, только если заполнены ВСЕ ТРИ: карта с одной строкой из трёх
 * выглядит как недоделка, а не как голос.
 *
 * Запуск: node scripts/lore-coverage.mjs [--missing]
 */
import { readFileSync } from 'node:fs';

const src = readFileSync('src/data/lore.ts', 'utf8');

/** Достаёт ключи верхнего уровня из блока `export const ИМЯ ... = { ... };`. */
function keysOf(blockName) {
  const start = src.indexOf(blockName);
  if (start === -1) throw new Error(`блок ${blockName} не найден`);
  // Конец блока — закрывающая `};` на нулевом отступе после начала.
  const end = src.indexOf('\n};', start);
  const body = src.slice(start, end === -1 ? undefined : end);
  const keys = new Set();
  // Ключи вида `  some_id:` — два пробела отступа, идентификатор, двоеточие.
  for (const m of body.matchAll(/^ {2}([a-z0-9_]+):/gm)) keys.add(m[1]);
  return keys;
}

/**
 * Комментарии Хранителя лежат глубже — отступ в четыре пробела.
 *
 * Конец блока ищем по `  };` (два пробела), а не по `};`: так реплики отделяются от
 * ключей карт в таблицах выше. Разбор опирается на имя константы AI_LORE_COMMENTS —
 * если её переименовать, таблица разберётся пустой, и это поймает проверка ниже.
 */
function aiCommentKeys() {
  const start = src.indexOf('export const AI_LORE_COMMENTS');
  const end = src.indexOf('\n};', start);
  const body = src.slice(start, end === -1 ? undefined : end);
  const keys = new Set();
  for (const m of body.matchAll(/^ {4}([a-z0-9_]+):/gm)) keys.add(m[1]);
  return keys;
}

const narratives = keysOf('export const CARD_NARRATIVES');
const deaths = keysOf('export const DEATH_QUOTES');
const comments = aiCommentKeys();

// Пустая таблица означает, что разбор сломан (переименовали константу, поменяли
// отступ), а не что карты без голоса. Молчаливый ноль здесь — это ложь прибора:
// ровно так скрипт уже отчитался «0 голосов» после переименования таблицы реплик.
for (const [name, table] of [
  ['CARD_NARRATIVES', narratives],
  ['DEATH_QUOTES', deaths],
  ['AI_LORE_COMMENTS', comments],
]) {
  if (table.size === 0) {
    console.error(`⚠️  Таблица ${name} разобралась пустой — сломан разбор, а не данные.`);
    process.exit(1);
  }
}

// id карт берём из отчёта, а не из cards.ts: там они уже разобраны в структуру.
const raw = JSON.parse(readFileSync('reports/cards.json', 'utf8'));
const cards = Array.isArray(raw) ? raw : raw.cards;
const ids = cards.map((c) => c.id);

const onlyMissing = process.argv.includes('--missing');

const rows = ids.map((id) => {
  const has = {
    narrative: narratives.has(id),
    death: deaths.has(id),
    comment: comments.has(id),
  };
  const full = has.narrative && has.death && has.comment;
  const count = Number(has.narrative) + Number(has.death) + Number(has.comment);
  return { id, name: cards.find((c) => c.id === id).name, ...has, full, count };
});

const complete = rows.filter((r) => r.full);
const partial = rows.filter((r) => !r.full && r.count > 0);
const silent = rows.filter((r) => r.count === 0);

console.log(`Карт всего: ${ids.length}`);
console.log(`  полный голос (все три таблицы): ${complete.length}`);
console.log(`  частично:                       ${partial.length}`);
console.log(`  без голоса вообще:              ${silent.length}`);
console.log('');

if (onlyMissing) {
  if (partial.length) {
    console.log('— ЧАСТИЧНО (есть что-то, но не всё) —');
    for (const r of partial) {
      const have = [r.narrative && 'нарратив', r.death && 'смерть', r.comment && 'реплика']
        .filter(Boolean)
        .join(', ');
      console.log(`  ${r.name} [${r.id}] — есть: ${have}`);
    }
    console.log('');
  }
  console.log('— БЕЗ ГОЛОСА —');
  for (const r of silent) console.log(`  ${r.name} [${r.id}]`);
}

// Проверка на мусор в таблицах: ключ, которого нет среди карт, — опечатка,
// и такая строка никогда не покажется игроку.
const known = new Set(ids);
const orphans = [...new Set([...narratives, ...deaths, ...comments])].filter((k) => !known.has(k));
if (orphans.length) {
  console.log('');
  console.log('⚠️  КЛЮЧИ БЕЗ КАРТ (опечатка или карта удалена):');
  for (const o of orphans) console.log(`  ${o}`);
  process.exitCode = 1;
}
