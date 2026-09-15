// Визуальный аудит игрового поля через Midscene: играет несколько раундов,
// чтобы на столе появились карты, и задаёт модели вопросы про то, что видно.
// Нужен, потому что обычные тесты проверяют состояние, а не то, что на экране.
//
// Запуск: npm run test:ai:board   (или node scripts/ai-board-audit.mjs <dist> <out> [раундов])

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [distArg, outArg, roundsArg] = process.argv.slice(2);
const distDir = distArg || path.join(repoRoot, 'dist');
const rounds = Number(roundsArg) || 4;

const CREDENTIALS = 'C:/Users/katoc/.dsh/.credentials.yaml';
function credential(name) {
  if (process.env[name]) return process.env[name];
  try {
    const text = fs.readFileSync(CREDENTIALS, 'utf8');
    const m = text.match(new RegExp('^\\s*' + name + '\\s*:\\s*(.+)$', 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  } catch {
    return '';
  }
}

process.env.MIDSCENE_MODEL_NAME ||= 'qwen/qwen3-vl-235b-a22b-instruct';
process.env.MIDSCENE_MODEL_FAMILY ||= 'qwen3-vl';
process.env.MIDSCENE_MODEL_BASE_URL ||= 'https://openrouter.ai/api/v1';
process.env.MIDSCENE_MODEL_API_KEY ||= credential('OPENROUTER_LIVE_API_KEY');
process.env.MIDSCENE_PREFERRED_LANGUAGE = 'ru';
process.env.MIDSCENE_CACHE = 'false';

if (!process.env.MIDSCENE_MODEL_API_KEY) {
  console.error('Не найден ключ для vision-модели.');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon',
};

const QUESTIONS = [
  'Опиши, что сейчас изображено на игровом поле. Что находится в верхней части экрана и что в нижней?',
  'Видно ли на поле существо противника — карточку, выложенную на стол? Если да, назови его и опиши, как выглядит картинка на этой карточке.',
  'Посмотри на карты в руке игрока внизу экрана. Видна ли на них иллюстрация? Опиши, как рисунок расположен внутри карточки: целиком или обрезан сверху или снизу.',
  'Есть ли на экране что-то визуально сломанное: наложенные друг на друга элементы, обрезанный текст, пустые серые области, картинки не на месте? Если всё аккуратно, так и скажи.',
];

const { chromium } = await import('playwright');
const { PlaywrightAgent } = await import('@midscene/web');

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();

await page.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.hostname !== '127.0.0.1') {
    await route.fulfill({ status: 204, body: '' });
    return;
  }
  let rel = decodeURIComponent(url.pathname).replace(/^\/omskgathering\//, '');
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  const file = path.join(distDir, rel);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    await route.fulfill({
      status: 200,
      contentType: MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      body: fs.readFileSync(file),
    });
  } else {
    await route.fulfill({ status: 404, body: 'not found: ' + rel });
  }
});

await page.goto('http://127.0.0.1/omskgathering/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => /Играть|Против Хранителя/i.test(x.innerText));
  if (b) b.click();
});
await page.waitForTimeout(4000);
for (let i = 0; i < 4; i++) {
  const skipped = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /пропустить|понятно|далее|закрыть|✕/i.test(x.innerText));
    if (b) { b.click(); return true; }
    return false;
  });
  if (!skipped) break;
  await page.waitForTimeout(900);
}
await page.waitForTimeout(1200);

console.log('играю ' + rounds + ' раунда, чтобы на столе появились карты...');
for (let r = 0; r < rounds; r++) {
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => /Конец хода/i.test(x.innerText));
    if (b) b.click();
  });
  await page.waitForTimeout(5000);
}

const agent = new PlaywrightAgent(page);
const results = [];

for (const q of QUESTIONS) {
  let answer = null;
  let error = null;
  try {
    answer = await agent.aiAsk(q);
  } catch (e) {
    error = String((e && e.message) || e);
  }
  console.log('');
  console.log('── ' + q);
  console.log('   ' + (error ? 'ОШИБКА: ' + error : String(answer).replace(/\s+/g, ' ').trim()));
  results.push({ question: q, answer, error });
}

await agent.destroy();
await browser.close();

const outPath = outArg || path.join(repoRoot, '.tmp-midscene', 'board-audit.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ model: process.env.MIDSCENE_MODEL_NAME, rounds, results }, null, 2), 'utf8');
console.log('');
console.log('отчёт: ' + outPath);
