import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const conceptsPath = path.join(root, 'output/new-card-set-2026-03-04/new_cards_concepts.json');
const cardsPath = path.join(root, 'src/data/cards.ts');
const localImagesPath = path.join(root, 'src/data/localCardImages.ts');
const enginePath = path.join(root, 'src/game/engine.impl.ts');
const aiPath = path.join(root, 'src/game/ai.ts');
const regressionPath = path.join(root, 'tests/regression/combat-regression.ts');
const publicCardsDir = path.join(root, 'public/cards');
const outDir = path.join(root, 'output/keeper-audit/new-cards-matrix');

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

if (!exists(conceptsPath)) {
  console.error(`Missing concepts file: ${conceptsPath}`);
  process.exit(1);
}

const concepts = JSON.parse(readUtf8(conceptsPath));
const cardsTs = exists(cardsPath) ? readUtf8(cardsPath) : '';
const localImagesTs = exists(localImagesPath) ? readUtf8(localImagesPath) : '';
const engineTs = exists(enginePath) ? readUtf8(enginePath) : '';
const aiTs = exists(aiPath) ? readUtf8(aiPath) : '';
const regressionTs = exists(regressionPath) ? readUtf8(regressionPath) : '';

const publicFiles = new Set(exists(publicCardsDir) ? fs.readdirSync(publicCardsDir) : []);

const rows = concepts.map((card) => {
  const id = card.id;
  const filename = `${id}.jpg`;
  const inCards = cardsTs.includes(`id: '${id}'`);
  const inLocalMap = localImagesTs.includes(`${id}: '/cards/${id}.jpg'`);
  const inPublicCards = publicFiles.has(filename);
  const hasEngineHook = engineTs.includes(`case '${id}'`) || engineTs.includes(`'${id}'`);
  const inAiRules = aiTs.includes(`${id}:`) || aiTs.includes(`'${id}'`);
  const inRegression = regressionTs.includes(id);
  const ready = inCards && inLocalMap && inPublicCards;
  return {
    id,
    name: card.name,
    type: card.type,
    inCards,
    inLocalMap,
    inPublicCards,
    hasEngineHook,
    inAiRules,
    inRegression,
    ready,
  };
});

fs.mkdirSync(outDir, { recursive: true });
const jsonPath = path.join(outDir, 'new-cards-matrix.json');
const mdPath = path.join(outDir, 'new-cards-matrix.md');
fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2));

const headers = [
  'id',
  'type',
  'cards.ts',
  'localMap',
  'public/cards',
  'engine-hook',
  'ai',
  'regression',
  'ready',
];
const asYesNo = (v) => (v ? 'YES' : 'NO');
const lines = [];
lines.push('# New Cards Matrix Audit');
lines.push('');
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push('');
lines.push(`| ${headers.join(' | ')} |`);
lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
for (const row of rows) {
  lines.push(
    `| ${row.id} | ${row.type} | ${asYesNo(row.inCards)} | ${asYesNo(row.inLocalMap)} | ${asYesNo(
      row.inPublicCards
    )} | ${asYesNo(row.hasEngineHook)} | ${asYesNo(row.inAiRules)} | ${asYesNo(
      row.inRegression
    )} | ${asYesNo(row.ready)} |`
  );
}
lines.push('');
lines.push(`Ready-to-run cards: ${rows.filter((r) => r.ready).length}/${rows.length}`);

fs.writeFileSync(mdPath, lines.join('\n'));

console.log(mdPath);
console.log(jsonPath);
