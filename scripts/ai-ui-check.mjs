// AI-проверка интерфейса через Midscene: модель смотрит на скриншоты и
// выполняет шаги на естественном языке. Дополняет обычные смоук-тесты там,
// где важно именно то, что видно на экране.
//
// Запуск: npm run test:ai
// Нужен vision-модель. Ключ читается из C:\Users\katoc\.dsh\.credentials.yaml.
//
// Переопределить модель: MIDSCENE_MODEL_NAME, MIDSCENE_MODEL_FAMILY,
// MIDSCENE_MODEL_BASE_URL.
//
// Сборка отдаётся браузеру перехватом запросов, без сетевого сервера.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(repoRoot, 'dist');
const runDir = process.env.MIDSCENE_RUN_DIR || path.join(repoRoot, '.tmp-midscene');

// ── конфигурация модели ────────────────────────────────────────────────────
const CREDENTIALS = 'C:/Users/katoc/.dsh/.credentials.yaml';

function readCredential(name) {
  if (process.env[name]) return process.env[name];
  try {
    const text = fs.readFileSync(CREDENTIALS, 'utf8');
    const m = text.match(new RegExp('^\\s*' + name + '\\s*:\\s*(.+)$', 'm'));
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
  } catch {
    return '';
  }
}

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('Нет сборки. Сначала: npm run build');
  process.exit(1);
}

process.env.MIDSCENE_MODEL_NAME ||= 'qwen/qwen3-vl-235b-a22b-instruct';
process.env.MIDSCENE_MODEL_FAMILY ||= 'qwen3-vl';
process.env.MIDSCENE_MODEL_BASE_URL ||= 'https://openrouter.ai/api/v1';
process.env.MIDSCENE_MODEL_API_KEY ||= readCredential('OPENROUTER_LIVE_API_KEY');
process.env.MIDSCENE_PREFERRED_LANGUAGE ||= 'ru';
process.env.MIDSCENE_RUN_DIR = runDir;
process.env.MIDSCENE_CACHE ??= 'true';

if (!process.env.MIDSCENE_MODEL_API_KEY) {
  console.error('Не найден ключ для vision-модели (OPENROUTER_LIVE_API_KEY).');
  process.exit(1);
}

// Конфиг читается при создании агента, поэтому импорт динамический.
const { chromium } = await import('playwright');
const { PlaywrightAgent } = await import('@midscene/web');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
};

fs.mkdirSync(runDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await context.newPage();

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
    await route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found: ' + rel });
  }
});

await page.goto('http://127.0.0.1/omskgathering/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

const agent = new PlaywrightAgent(page);

const steps = [];
async function step(title, fn) {
  const started = Date.now();
  try {
    const result = await fn();
    steps.push({ title, ok: true, ms: Date.now() - started, result });
    console.log(`  OK   ${title}  (${Date.now() - started} мс)`);
    return result;
  } catch (error) {
    steps.push({ title, ok: false, ms: Date.now() - started, error: String(error && error.message) });
    console.log(`  FAIL ${title}  -> ${error && error.message}`);
    return null;
  }
}

console.log('AI-проверка интерфейса');
console.log('модель: ' + process.env.MIDSCENE_MODEL_NAME + ' (' + process.env.MIDSCENE_MODEL_FAMILY + ')');
console.log('');

await step('видно главное меню', () =>
  agent.aiAssert('На экране главное меню карточной игры: есть название игры и крупные пункты меню')
);

const menu = await step('что написано в меню', () =>
  agent.aiAsk('Перечисли названия пунктов меню, которые видишь на экране. Только список, без пояснений.')
);
if (menu) console.log('       меню: ' + String(menu).replace(/\s+/g, ' ').slice(0, 300));

await step('переход в Коллекцию', () => agent.aiTap('пункт меню с названием Коллекция'));
await page.waitForTimeout(2000);
await step('коллекция открылась', () =>
  agent.aiAssert('Открыт экран архива карт: видно сетку карточек с иллюстрациями и подписями')
);

const broken = await page.evaluate(() => {
  const imgs = Array.from(document.querySelectorAll('img'));
  return imgs.filter((i) => i.complete && i.naturalWidth === 0).length;
});
console.log(`  ${broken === 0 ? 'OK  ' : 'FAIL'} битых картинок на экране: ${broken}`);
steps.push({ title: 'битых картинок нет', ok: broken === 0, result: broken });

await step('в карточке видно существо', () =>
  agent.aiAssert('На экране видны карточки, у некоторых есть характеристики: атака и здоровье')
);

await step('возврат в меню', () => agent.aiTap('кнопка Назад'));
await page.waitForTimeout(1500);
await step('переход в Конструктор колод', () => agent.aiTap('пункт меню Конструктор колод'));
await page.waitForTimeout(2000);
await step('конструктор открылся', () =>
  agent.aiAssert('Открыт конструктор колод: есть поле для имени колоды и список доступных карт')
);

await agent.destroy();
await browser.close();

const failed = steps.filter((s) => !s.ok);
const report = {
  model: process.env.MIDSCENE_MODEL_NAME,
  family: process.env.MIDSCENE_MODEL_FAMILY,
  ranAt: new Date().toISOString(),
  steps,
  failed: failed.length,
};
fs.writeFileSync(path.join(runDir, 'ai-check-summary.json'), JSON.stringify(report, null, 2), 'utf8');

console.log('');
console.log(`шагов: ${steps.length}, провалено: ${failed.length}`);
console.log('отчёт: ' + path.join(runDir, 'ai-check-summary.json') + '  (и HTML-отчёт Midscene рядом)');
process.exitCode = failed.length ? 1 : 0;
