/**
 * Перекраска по итогам аудита scripts/jev/color-audit.mjs.
 *
 * Применяются ТОЛЬКО те правки, где сошлись два независимых основания:
 *   1) прогон «кто карта» в аудите уверенно называет другой цвет;
 *   2) в лоре есть прямой принцип, по которому так и должно быть.
 * Где модель расходится с лором — карта НЕ трогается (см. список SKIPPED).
 *
 * Принцип 1: Школа 21 — «шестая сила» в тени остальных фракций (Глава IV), значит
 *            её карты бесцветны: код и машины, не стихия.
 * Принцип 2: «Налоговая Инспекция» — закон и порядок, а это Проспект Мира (белый).
 */
import { readFileSync, writeFileSync } from 'node:fs';

const RECOLOR = {
  // ── Школа 21 и техника → бесцветный ──
  bocal: 'colorless',
  pisiner_21: 'colorless',
  cluster_lord: 'colorless',
  peer_review: 'colorless',
  debug_mode: 'colorless',
  holy_graph: 'colorless',
  segfault: 'colorless',
  blackhole: 'colorless',
  exam_42: 'colorless',
  makefile_golem: 'colorless',
  norminette: 'colorless',
  golos_telebashni: 'colorless',
  // ── Закон и порядок → белый ──
  nalogovaya_inspektsiya: 'white',
};

/**
 * Расхождения с моделью, оставленные как есть. Модель права формально, но лор
 * важнее: цвет в этой игре задаётся фракцией, а не тем, на что похожа механика.
 */
const SKIPPED = {
  omskiy_rybolov: 'модель: синий (Иртыш). Лор: «Дети Парка» прямо включают рыбаков → зелёный',
  yama_na_doroge: 'модель: красный. Механика — дешёвое уничтожение, это опора чёрного → чёрный',
  blagoustroistvo: 'модель: белый. Это усиление +0/+2, усиления живут в зелёном → зелёный',
  dvornik: 'модель: белый. «Дети Парка» включают дворников → зелёный',
  komar_irtish: 'неустойчиво: прямой и обратный порядок разошлись, суждению верить нельзя',
  bird_omsk: 'неустойчиво: разошлось; Птица-Омич — символ всего города, цвет спорен',
};

const path = 'src/data/cards.ts';
const src = readFileSync(path, 'utf8');
const lines = src.split('\n');

const applied = [];
const missing = [];

for (const [id, newColor] of Object.entries(RECOLOR)) {
  const idIdx = lines.findIndex((l) => l.includes(`id: '${id}'`));
  if (idIdx === -1) {
    missing.push(id);
    continue;
  }
  // Ближайшая строка с цветом после id и до конца карты.
  let colorIdx = -1;
  for (let i = idIdx; i < Math.min(idIdx + 12, lines.length); i++) {
    if (/^\s*color: '/.test(lines[i])) {
      colorIdx = i;
      break;
    }
  }
  if (colorIdx === -1) {
    missing.push(id);
    continue;
  }
  const before = lines[colorIdx];
  const after = before.replace(/color: '[a-z]+'/, `color: '${newColor}'`);
  if (before === after) {
    missing.push(id);
    continue;
  }
  lines[colorIdx] = after;
  applied.push(`${id}: ${before.trim()} → ${after.trim()}`);
}

if (missing.length) {
  console.error('НЕ НАЙДЕНЫ (ничего не записано):', missing.join(', '));
  process.exit(1);
}

writeFileSync(path, lines.join('\n'), 'utf8');

console.log(`Перекрашено карт: ${applied.length}`);
for (const a of applied) console.log('  ' + a);
console.log('');
console.log(`Оставлено вопреки модели: ${Object.keys(SKIPPED).length}`);
for (const [id, why] of Object.entries(SKIPPED)) console.log(`  ${id}: ${why}`);
