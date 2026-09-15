// Задаёт вопрос про изображения через vision-модель Midscene.
// Репозиторий не трогает. Картинки показываются на странице по одной,
// сеть не используется — файлы отдаются перехватом запросов.
//
// Запуск: node scripts/ai-image-check.mjs "<вопрос>" <файл|папка> [...]
//
// Модель: MIDSCENE_MODEL_NAME / MIDSCENE_MODEL_FAMILY (по умолчанию qwen3-vl).
// Ключ читается из C:\Users\katoc\.dsh\.credentials.yaml.

import fs from 'node:fs';
import path from 'node:path';

const [question, ...targets] = process.argv.slice(2);
if (!question || targets.length === 0) {
  console.error('нужны аргументы: "<вопрос>" <файл|папка> [...]');
  process.exit(2);
}

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

process.env.MIDSCENE_MODEL_NAME ||= 'qwen/qwen3-vl-235b-a22b-instruct';
process.env.MIDSCENE_MODEL_FAMILY ||= 'qwen3-vl';
process.env.MIDSCENE_MODEL_BASE_URL ||= 'https://openrouter.ai/api/v1';
process.env.MIDSCENE_MODEL_API_KEY ||= readCredential('OPENROUTER_LIVE_API_KEY');
process.env.MIDSCENE_PREFERRED_LANGUAGE ||= 'ru';
process.env.MIDSCENE_CACHE ??= 'false';

if (!process.env.MIDSCENE_MODEL_API_KEY) {
  console.error('Не найден ключ для vision-модели.');
  process.exit(1);
}

// собираем список файлов
const files = [];
for (const t of targets) {
  if (!fs.existsSync(t)) {
    console.error('нет такого пути: ' + t);
    continue;
  }
  if (fs.statSync(t).isDirectory()) {
    for (const name of fs.readdirSync(t).sort()) {
      const full = path.join(t, name);
      if (/\.(jpe?g|png|webp)$/i.test(name) && fs.statSync(full).isFile()) files.push(full);
    }
  } else {
    files.push(t);
  }
}
if (files.length === 0) {
  console.error('не нашлось ни одной картинки');
  process.exit(1);
}

const { chromium } = await import('playwright');
const { PlaywrightAgent } = await import('@midscene/web');

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1000, height: 1400 } });
const page = await context.newPage();

let currentFile = null;
await page.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.hostname === 'img.local') {
    await route.fulfill({
      status: 200,
      contentType: /\.png$/i.test(currentFile) ? 'image/png' : 'image/jpeg',
      headers: { 'Cache-Control': 'no-store' },
      body: fs.readFileSync(currentFile),
    });
    return;
  }
  await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<html><body></body></html>' });
});

console.log('вопрос : ' + question);
console.log('модель : ' + process.env.MIDSCENE_MODEL_NAME);
console.log('картинок: ' + files.length);
console.log('');

const results = [];

for (const file of files) {
  currentFile = file;
  const ext = path.extname(file).toLowerCase();
  // Имя файла обязано быть в URL: с одинаковым адресом браузер отдаёт
  // закэшированную первую картинку и все ответы становятся одинаковыми.
  const bust = encodeURIComponent(path.basename(file)) + '-' + Date.now();
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>
       html,body{margin:0;padding:0;background:#111;}
       img{display:block;width:800px;height:auto;}
     </style></head><body><img id="pic" src="http://img.local/${bust}${ext}"></body></html>`,
    { waitUntil: 'load' }
  );
  await page.waitForTimeout(600);

  // Нужен свежий агент на каждый файл: у страницы сменился контент.
  const agent = new PlaywrightAgent(page);
  const started = Date.now();
  let answer = null;
  let error = null;
  try {
    answer = await agent.aiAsk(question);
  } catch (e) {
    error = String((e && e.message) || e);
  }
  await agent.destroy();

  const name = path.basename(file);
  results.push({ file: name, answer, error, ms: Date.now() - started });
  console.log('── ' + name);
  console.log('   ' + (error ? 'ОШИБКА: ' + error : String(answer).replace(/\s+/g, ' ').trim()));
}

await browser.close();

const out = path.resolve('ai-image-check.json');
fs.writeFileSync(out, JSON.stringify({ question, model: process.env.MIDSCENE_MODEL_NAME, results }, null, 2), 'utf8');
console.log('');
console.log('результат: ' + out);
