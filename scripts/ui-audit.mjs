// Измеримый аудит интерфейса без обращения к моделям: ищет обрезку картинок,
// вылезающий текст, выход элементов за экран и битые изображения.
// Сборка отдаётся браузеру перехватом запросов, сетевого сервера нет.
//
// Запуск: npm run audit:ui   (или node scripts/ui-audit.mjs [--json <файл>] [--shots <папка>])
//
// ВАЖНО про ложные срабатывания (проверено на практике):
//  - `line-clamp-N` штатно режет текст многоточием: scrollHeight больше clientHeight — это
//    замысел, а не дефект, поэтому такие элементы из проверки текста исключены;
//  - декоративные слои с отрицательными отступами (`inset-x-[-10%]`) вылезают за экран
//    намеренно и обрезаются родителем с overflow:hidden — они попадают в `bleed`,
//    а не в дефекты. Дефектом считается только то, что реально тянет страницу по горизонтали
//    либо режет интерактивный элемент.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(repoRoot, 'dist');

const args = process.argv.slice(2);
const jsonFlag = args.indexOf('--json');
const jsonOut = jsonFlag >= 0 ? args[jsonFlag + 1] : null;
const shotsFlag = args.indexOf('--shots');
const shotsDir = shotsFlag >= 0 ? args[shotsFlag + 1] : null;

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('Нет сборки. Сначала: npm run build');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ico': 'image/x-icon',
};

const VIEWPORTS = [
  { name: '1600x900', width: 1600, height: 900 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '390x844', width: 390, height: 844 },
];

// Каждый экран: имя и как до него добраться
const SCREENS = [
  { name: 'меню', go: null },
  { name: 'Коллекция', go: /Коллекция/, back: /Назад/ },
  { name: 'Коллекция: карта открыта', go: /Коллекция/, thenCard: true, back: /Назад/ },
  { name: 'Конструктор колод', go: /Конструктор колод/, back: /Назад/ },
  { name: 'Правила', go: /^📋 Правила|Правила/, back: /Назад/ },
  { name: 'Легенда', go: /Легенда/, back: /Назад/ },
];

const { chromium } = await import('playwright');

const clickButton = async (page, reSrc, { exact = false } = {}) =>
  page.evaluate(
    ({ reSrc: src, exact: ex }) => {
      const re = new RegExp(src);
      const b = Array.from(document.querySelectorAll('button')).find((x) => {
        const t = x.innerText.replace(/\s+/g, ' ').trim();
        return ex ? re.source === t : re.test(t);
      });
      if (b) { b.click(); return true; }
      return false;
    },
    { reSrc, exact }
  );

const browser = await chromium.launch();
const report = { viewports: [], screens: [] };

if (shotsDir) fs.mkdirSync(path.resolve(shotsDir), { recursive: true });

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e.message).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') { await route.fulfill({ status: 204, body: '' }); return; }
    let rel = decodeURIComponent(url.pathname).replace(/^\/omskgathering\//, '');
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    const file = path.join(distDir, rel);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      await route.fulfill({ status: 200, contentType: MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(file) });
    } else {
      await route.fulfill({ status: 404, body: 'not found: ' + rel });
    }
  });

  await page.goto('http://127.0.0.1/omskgathering/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);

  for (const screen of SCREENS) {
    if (screen.go) {
      const ok = await clickButton(page, screen.go.source);
      if (!ok) { report.screens.push({ vp: vp.name, screen: screen.name, error: 'кнопка не найдена' }); continue; }
      await page.waitForTimeout(1600);
    }
    if (screen.thenCard) {
      // панель подробностей карты появляется только по клику — иначе она не измеряется вовсе
      await page.evaluate(() => {
        const tile = document.querySelector('.card-frame');
        if (tile) tile.click();
      });
      await page.waitForTimeout(1100);
    }

    const defects = await page.evaluate((vpName) => {
      const out = {
        imageCrops: [], clippedText: [], offscreen: [], bleed: [], broken: [],
        tinyTap: [], interactiveClipped: [], hScroll: 0, backdrops: [],
      };
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const label = (el) => {
        const cls = typeof el.className === 'string' ? el.className.split(/\s+/).slice(0, 3).join('.') : '';
        const txt = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30);
        return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${txt ? ` "${txt}"` : ''}`;
      };
      // ближайший родитель, который обрезает содержимое
      const clipper = (el) => {
        let p = el.parentElement;
        while (p && p !== document.body) {
          const cs = getComputedStyle(p);
          if (['hidden', 'clip', 'auto', 'scroll'].includes(cs.overflowX) || ['hidden', 'clip'].includes(cs.overflowY)) return p;
          p = p.parentElement;
        }
        return null;
      };

      out.hScroll = Math.max(0, document.documentElement.scrollWidth - vw);

      // 1. битые картинки и сильная обрезка при object-fit: cover
      for (const img of Array.from(document.querySelectorAll('img'))) {
        const r = img.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (img.complete && img.naturalWidth === 0) {
          out.broken.push({ el: label(img), src: (img.getAttribute('src') || '').slice(0, 90) });
          continue;
        }
        const cs = getComputedStyle(img);
        if (cs.objectFit !== 'cover') continue;
        if (!img.naturalWidth || !img.naturalHeight) continue;
        // фоновая картинка на весь экран — замысел, а не дефект: её обрезка неизбежна
        if (r.width * r.height > 0.5 * vw * vh) {
          out.backdrops.push({ el: label(img), natural: `${img.naturalWidth}x${img.naturalHeight}`, box: `${Math.round(r.width)}x${Math.round(r.height)}` });
          continue;
        }
        const boxRatio = r.width / r.height;
        const natRatio = img.naturalWidth / img.naturalHeight;
        const rel = Math.abs(boxRatio - natRatio) / natRatio;
        if (rel > 0.25) {
          const keep = boxRatio > natRatio ? natRatio / boxRatio : boxRatio / natRatio;
          out.imageCrops.push({
            el: label(img),
            natural: `${img.naturalWidth}x${img.naturalHeight}`,
            box: `${Math.round(r.width)}x${Math.round(r.height)}`,
            cropped: Math.round((1 - keep) * 100) + '%',
            flipped: boxRatio > 1 !== natRatio > 1,
          });
        }
      }

      // 2. текст, который не влезает в свой блок (line-clamp — замысел, не дефект)
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (el.children.length > 0) continue;
        if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') continue;
        const t = (el.textContent || '').trim();
        if (!t) continue;
        const overflowX = el.scrollWidth - el.clientWidth;
        const overflowY = el.scrollHeight - el.clientHeight;
        const clipped = cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.overflowY === 'hidden' || cs.textOverflow === 'ellipsis';
        if (clipped && (overflowX > 1 || overflowY > 1)) {
          out.clippedText.push({ el: label(el), overX: overflowX, overY: overflowY, text: t.slice(0, 45) });
        }
      }

      // 3. за экраном: дефект только если тянет страницу или режет интерактив
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const outside = r.right > vw + 2 || r.left < -2;
        if (!outside) continue;
        const clip = clipper(el);
        if (clip) {
          out.bleed.push({ el: label(el), left: Math.round(r.left), right: Math.round(r.right), vw, clippedBy: label(clip) });
        } else if (out.hScroll > 2) {
          out.offscreen.push({ el: label(el), left: Math.round(r.left), right: Math.round(r.right), vw });
        }
        if (['BUTTON', 'A', 'INPUT'].includes(el.tagName) && clip) {
          const cr = clip.getBoundingClientRect();
          if (r.left < cr.left - 1 || r.right > cr.right + 1 || r.top < cr.top - 1 || r.bottom > cr.bottom + 1) {
            out.interactiveClipped.push({ el: label(el), clip: label(clip), box: `${Math.round(r.width)}x${Math.round(r.height)}` });
          }
        }
      }

      // 4. слишком мелкие цели для касания (только мобильный)
      if (vpName.startsWith('390')) {
        for (const el of Array.from(document.querySelectorAll('button'))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.height < 28 || r.width < 28) {
            out.tinyTap.push({ el: label(el), w: Math.round(r.width), h: Math.round(r.height) });
          }
        }
      }

      return out;
    }, vp.name);

    // размер плиток коллекции: пропорция карты меняет плотность сетки, это надо видеть числом
    const tiles = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.card-frame')).slice(0, 3).map((t) => {
        const r = t.getBoundingClientRect();
        return `${Math.round(r.width)}x${Math.round(r.height)}`;
      })
    );

    if (shotsDir) {
      const shot = path.join(path.resolve(shotsDir), `${vp.name}_${screen.name.replace(/[^\wа-яА-Я]+/g, '-')}.png`);
      await page.screenshot({ path: shot });
    }

    const counts = {
      crop: defects.imageCrops.length,
      clipped: defects.clippedText.length,
      offscreen: defects.offscreen.length,
      bleed: defects.bleed.length,
      broken: defects.broken.length,
      tiny: defects.tinyTap.length,
      cutInteractive: defects.interactiveClipped.length,
      hScroll: defects.hScroll,
    };
    report.screens.push({ vp: vp.name, screen: screen.name, counts, defects, tiles });
    const tileNote = tiles.length ? ` плитка=${tiles[0]}` : '';
    console.log(
      `[${vp.name}] ${screen.name.padEnd(20)} обрезка=${counts.crop} текст=${counts.clipped} ` +
      `заЭкраном=${counts.offscreen} вылет(замысел)=${counts.bleed} битых=${counts.broken} ` +
      `мелких=${counts.tiny} резИнтерактива=${counts.cutInteractive} горСкролл=${counts.hScroll}${tileNote}`
    );

    if (screen.back) {
      await clickButton(page, screen.back.source);
      await page.waitForTimeout(1200);
    }
  }

  // игровое поле — в предыдущей версии аудита его не было вовсе
  if (await clickButton(page, /Играть/.source)) {
    await page.waitForTimeout(2600);
    await clickButton(page, /Пропустить/.source); // слайдшоу -> поле
    await page.waitForTimeout(3200);
    const board = await page.evaluate(() => {
      const q = (s) => document.querySelectorAll(s).length;
      return {
        cardFrames: q('.card-frame'),
        handCards: q('[class*="hand-card"], .hand-card-arc, .hand-card'),
        boardSlots: q('.board-slot'),
        text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 120),
      };
    });
    report.board = { vp: vp.name, ...board };
    console.log(`[${vp.name}] поле              card-frame=${board.cardFrames} элементов руки=${board.handCards} слотов=${board.boardSlots}`);
    if (shotsDir) {
      await page.screenshot({ path: path.join(path.resolve(shotsDir), `${vp.name}_поле.png`) });
    }
  } else {
    console.log(`[${vp.name}] поле — кнопка «Играть» не найдена`);
  }

  report.viewports.push({ vp: vp.name, consoleErrors: consoleErrors.slice(0, 10) });
  if (consoleErrors.length) console.log(`[${vp.name}] ошибок консоли: ${consoleErrors.length}`);
  await context.close();
}

await browser.close();

// сводка
console.log('');
console.log('=== СВОДКА ===');
const totals = report.screens.reduce(
  (a, s) => {
    if (!s.counts) return a;
    a.crop += s.counts.crop; a.clipped += s.counts.clipped; a.offscreen += s.counts.offscreen;
    a.bleed += s.counts.bleed; a.broken += s.counts.broken; a.tiny += s.counts.tiny;
    a.cutInteractive += s.counts.cutInteractive;
    a.hScroll = Math.max(a.hScroll, s.counts.hScroll);
    return a;
  },
  { crop: 0, clipped: 0, offscreen: 0, bleed: 0, broken: 0, tiny: 0, cutInteractive: 0, hScroll: 0 }
);
console.log(JSON.stringify(totals));

if (jsonOut) {
  fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true });
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2), 'utf8');
  console.log('подробный отчёт: ' + jsonOut);
}
