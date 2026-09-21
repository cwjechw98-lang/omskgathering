/**
 * Выгрузка карт из src/data/cards.ts в чистый JSON для аудита.
 *
 * Через парсер TypeScript, а не регулярками: карты содержат вложенные объекты,
 * массивы ключевых слов и многострочные тексты способностей — регулярка на этом
 * врёт. Результат детерминирован: тот же файл → тот же JSON.
 *
 * Запуск: node scripts/jev/extract-cards.mjs [--out reports/cards.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';

const SRC = 'src/data/cards.ts';

/** Находит первый массив объектов в файле — это и есть список карт. */
function findCardArray(sourceFile) {
  let found = null;
  const visit = (node) => {
    if (found) return;
    if (ts.isArrayLiteralExpression(node) && node.elements.length > 5) {
      const allObjects = node.elements.every((e) => ts.isObjectLiteralExpression(e));
      if (allObjects) {
        found = node;
        return;
      }
    }
    node.forEachChild(visit);
  };
  sourceFile.forEachChild(visit);
  return found;
}

/** Разворачивает значение в простой JS-тип; сложное оставляет текстом. */
function literalValue(node, sf) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((e) => literalValue(e, sf));
  if (ts.isObjectLiteralExpression(node)) {
    const out = {};
    for (const p of node.properties) {
      if (!ts.isPropertyAssignment(p)) continue;
      out[p.name.getText(sf).replace(/['"]/g, '')] = literalValue(p.initializer, sf);
    }
    return out;
  }
  return node.getText(sf);
}

const text = readFileSync(SRC, 'utf8');
const sf = ts.createSourceFile(SRC, text, ts.ScriptTarget.Latest, true);
const arrayNode = findCardArray(sf);
if (!arrayNode) {
  console.error('Не найден массив карт в', SRC);
  process.exit(1);
}

const cards = [];
for (const element of arrayNode.elements) {
  const card = {};
  for (const prop of element.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const key = prop.name.getText(sf).replace(/['"]/g, '');
    card[key] = literalValue(prop.initializer, sf);
  }
  cards.push(card);
}

const ids = new Set();
for (const c of cards) {
  if (!c.id) console.warn('карта без id:', JSON.stringify(c).slice(0, 80));
  if (ids.has(c.id)) console.warn('дубликат id:', c.id);
  ids.add(c.id);
}

const outIndex = process.argv.indexOf('--out');
const outPath = outIndex > -1 ? process.argv[outIndex + 1] : 'reports/cards.json';
mkdirSync(dirname(resolve(outPath)), { recursive: true });
writeFileSync(resolve(outPath), JSON.stringify(cards, null, 2) + '\n', 'utf8');

const byType = {};
for (const c of cards) byType[c.type] = (byType[c.type] ?? 0) + 1;
console.log(`карт: ${cards.length}`);
console.log('по типам:', JSON.stringify(byType));
console.log('с текстом способности:', cards.filter((c) => c.ability || c.description).length);
console.log('записано:', outPath);
