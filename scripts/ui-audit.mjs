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
  { name: 'Конструктор: колода сохранена', go: /Конструктор колод/, thenDeck: true, back: /Назад/ },
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
    if (screen.thenDeck) {
      // состояние «колода собрана и сохранена» статичный скан не видит:
      // список сохранённых колод с четырьмя кнопками в строке появляется только после сохранения
      await page.fill('input[placeholder="Например: Быстрый Омск"]', 'Аудит-колода');
      for (let i = 0; i < 8; i++) {
        await page.evaluate(() => {
          const plus = Array.from(document.querySelectorAll('button')).find(
            (b) => (b.textContent || '').trim() === '+'
          );
          if (plus) plus.click();
        });
        await page.waitForTimeout(120);
      }
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find((x) =>
          /Сохранить колоду/.test(x.innerText)
        );
        if (b) b.click();
      });
      await page.waitForTimeout(800);
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

  // перед полем убираем активную колоду, оставленную конструктором:
  // saveDeck() делает сохранённую колоду активной, и аудит дальше играл колодой
  // без земель — мана 0/0, ни одна карта не разыгрывается, поле всегда пустое
  await page.evaluate(() => {
    try {
      localStorage.removeItem('omsk.decks.v1');
    } catch {
      /* приватный режим — не критично */
    }
  });

  // игровое поле — в предыдущей версии аудита его не было вовсе
  if (await clickButton(page, /Играть/.source)) {
    await page.waitForTimeout(2600);
    await clickButton(page, /Пропустить/.source); // слайдшоу -> поле
    await page.waitForTimeout(3200);

    // ─── ПОЛЕ В ДИНАМИКЕ: розыгрыш карт, ход ИИ, геометрия руки и карт ───
    // Статичный замер поля бесполезен: на старте оно пустое, а обрезка арта
    // и обрезка руки интерфейсом видны только когда карты есть.
    const boardSteps = [];
    const measureBoard = () =>
      page.evaluate(() => {
        const bx = (el) => {
          const r = el.getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) };
        };
        // сколько картинки срезает cover в этом блоке.
        // Размеры — по layout (offsetWidth/Height): карта в руке повёрнута веером,
        // и её прямоугольник всегда шире настоящего блока, что завышало обрезку.
        const cropOf = (img) => {
          if (!img || !img.naturalWidth || !img.naturalHeight) return null;
          const w = img.offsetWidth || img.getBoundingClientRect().width;
          const h = img.offsetHeight || img.getBoundingClientRect().height;
          if (!w || !h) return null;
          const box = w / h;
          const nat = img.naturalWidth / img.naturalHeight;
          if (Math.abs(box - nat) / nat <= 0.02) return 0;
          const keep = box > nat ? nat / box : box / nat;
          return Math.round((1 - keep) * 100);
        };
        const worstCrop = (cards) => {
          const vals = cards.map((c) => cropOf(c.querySelector('img'))).filter((v) => v !== null);
          return vals.length ? Math.max(...vals) : null;
        };
        const zone = document.querySelector('.hand-zone');
        const wrappers = Array.from(document.querySelectorAll('.hand-card-wrapper'));
        const inner = wrappers.map((w) => w.querySelector('.card-hand-container') || w);
        // размер карты берём по layout (offsetWidth), а не по прямоугольнику:
        // карты в руке повёрнуты веером, и bounding box у них всегда больше и «квадратнее».
        const dims = (el) => ({ w: el.offsetWidth, h: el.offsetHeight });
        const boxes = inner.map(bx);
        const sizes = inner.map(dims);
        const zoneBox = zone ? bx(zone) : null;
        const vh = window.innerHeight;
        const playerField = Array.from(document.querySelectorAll('.board-zone.player .card-in-field'));
        const enemyField = Array.from(document.querySelectorAll('.board-zone.enemy .card-in-field'));
        const hand = Array.from(document.querySelectorAll('.card-in-hand'));
        const shell = document.querySelector('.card-preview-shell');
        const shellArt = shell ? shell.querySelector('img') : null;
        const overhang = zoneBox
          ? Math.round(Math.max(0, ...boxes.map((b) => b.bottom - zoneBox.bottom)))
          : 0;
        const ratio = (n, d) => (d ? +(n / d).toFixed(3) : null);
        return {
          handCount: wrappers.length,
          handCard: sizes[0] ? `${sizes[0].w}x${sizes[0].h}` : null,
          handRatio: sizes[0] ? ratio(sizes[0].w, sizes[0].h) : null,
          handZoneBottom: zoneBox ? zoneBox.bottom : null,
          handOverhang: overhang,
          // карта вылезла ниже своей зоны (её режет overflow: hidden) или ниже экрана
          handClippedByZone: boxes.filter((b) => b.bottom > zoneBox.bottom + 1).length,
          handClippedByViewport: boxes.filter((b) => b.bottom > vh + 1).length,
          handOverflow: zone ? zone.scrollWidth - zone.clientWidth : 0,
          // сколько пикселей приходится на одну карту в веере: если меньше ширины карты,
          // карты перекрывают друг друга и видны частично
          handSpread:
            zone && sizes[0] && sizes.length > 1
              ? Math.round((zone.clientWidth - sizes[0].w) / (sizes.length - 1))
              : null,
          handVisible: zone && sizes[0] && sizes.length > 1
            ? +Math.min(1, (zone.clientWidth - sizes[0].w) / (sizes.length - 1) / sizes[0].w).toFixed(2)
            : null,
          // на сколько карта в поднятом состоянии (наведение/выбор) выходит за верх зоны
          hoverLiftClip: (() => {
            if (!zoneBox) return 0;
            const lifted = wrappers
              .map((w) => (w.matches(':hover') || w.classList.contains('selected') ? w.getBoundingClientRect() : null))
              .filter(Boolean);
            if (!lifted.length) return 0;
            return Math.round(Math.max(0, zoneBox.top - Math.min(...lifted.map((r) => r.top))));
          })(),
          fieldPlayer: playerField.length,
          fieldEnemy: enemyField.length,
          fieldCard: playerField[0] ? `${dims(playerField[0]).w}x${dims(playerField[0]).h}` : null,
          fieldRatio: playerField[0] ? ratio(dims(playerField[0]).w, dims(playerField[0]).h) : null,
          fieldArtCrop: worstCrop(playerField.length ? playerField : enemyField),
          handArtCrop: worstCrop(hand),
          preview: shell ? { box: `${bx(shell).w}x${bx(shell).h}`, art: shellArt ? `${Math.round(bx(shellArt).w)}x${Math.round(bx(shellArt).h)}` : null, artCrop: cropOf(shellArt) } : null,
          // наложения: панель обучения / превью, севшие поверх карт руки
          panelsOverHand: (() => {
            const panels = Array.from(
              document.querySelectorAll('.tutorial-hint-panel, .game-topbar, .ai-action-banner, .game-debug-drawer')
            ).map((p) => p.getBoundingClientRect());
            if (!panels.length) return 0;
            const overlap = (a, b) => {
              const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              return w > 0 && h > 0 ? w * h : 0;
            };
            return boxes.filter((b) => {
              const area = b.w * b.h;
              return panels.some((p) => overlap(b, p) > area * 0.15);
            }).length;
          })(),
          turn: (document.querySelector('header')?.innerText || '').replace(/\s+/g, ' ').slice(0, 40),
          // подсказка обучения: шаг берётся из состояния игры, поэтому её надо мерить
          // на каждом шаге, а не один раз
          tutorial: (() => {
            const p = document.querySelector('.tutorial-hint-panel');
            if (!p) return null;
            const r = bx(p);
            const textEl = p.querySelector('p');
            return {
              step: ((p.innerText || '').match(/Шаг \d+ из \d+/) || [''])[0],
              box: `${r.w}x${r.h}`,
              inside: r.top >= -2 && r.bottom <= window.innerHeight + 2 && r.left >= -2 && r.right <= window.innerWidth + 2,
              // наложение на карты руки считается по площади, порог 15%
              overlapHandCards: zoneBox
                ? boxes.filter((b) => {
                    const w = Math.min(b.right, r.right) - Math.max(b.left, r.left);
                    const h = Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top);
                    return w > 0 && h > 0 && w * h > b.w * b.h * 0.15;
                  }).length
                : 0,
              clippedText: textEl
                ? Math.max(0, textEl.scrollWidth - textEl.clientWidth, textEl.scrollHeight - textEl.clientHeight)
                : 0,
            };
          })(),
        };
      });

    const closePreview = async () => {
      await page.evaluate(() => {
        const b = document.querySelector('.card-preview-shell button');
        if (b) b.click();
      });
      await page.waitForTimeout(220);
    };
    // Ход игрока опознаётся по кнопке «Конец хода»: без этой проверки клики
    // попадали в ход Хранителя и розыгрыш молча не происходил.
    const waitMyTurn = async (timeout = 20000) => {
      const started = Date.now();
      while (Date.now() - started < timeout) {
        const ok = await page.evaluate(() =>
          Array.from(document.querySelectorAll('button')).some((b) => /Конец хода/.test(b.innerText))
        );
        if (ok) return true;
        await page.waitForTimeout(300);
      }
      return false;
    };
    const fieldCount = () =>
      page.evaluate(() => document.querySelectorAll('.board-zone.player .card-in-field').length);

    const playHandCard = async (i) => {
      // Розыгрыш устроен так: клик по карте выбирает её и открывает превью, а
      // следующий клик ПО КАРТЕ (превью закрывается и проверяет точку попадания)
      // разыгрывает. Программный .click() даёт точку (0,0) и только закрывает
      // превью, поэтому здесь настоящие клики мышью по координатам центра карты.
      if (!(await waitMyTurn())) return false;
      const before = await fieldCount();
      const center = async () =>
        page.evaluate((idx) => {
          const w = document.querySelectorAll('.hand-card-wrapper')[idx];
          const t = w && (w.querySelector('.card-hand-container') || w);
          if (!t) return null;
          const r = t.getBoundingClientRect();
          return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
        }, i);
      const c1 = await center();
      if (!c1) return false;
      await page.mouse.click(c1.x, c1.y);
      await page.waitForTimeout(400);
      const c2 = (await center()) || c1; // выбранная карта приподнимается — берём точку заново
      await page.mouse.click(c2.x, c2.y);
      await page.waitForTimeout(700);
      return (await fieldCount()) > before;
    };
    const playSomething = async () => {
      // играбельная карта помечена в разметке (cursor-grab / зелёная рамка).
      // Кликать в первую попавшуюся нельзя: там всегда земля, а земля даёт ману
      // и на поле не выходит — существ так и не появлялось.
      for (let attempt = 0; attempt < 6; attempt++) {
        const idx = await page.evaluate(() =>
          Array.from(document.querySelectorAll('.card-hand-container')).findIndex((c) =>
            /cursor-grab/.test(c.className)
          )
        );
        if (idx < 0) return false;
        if (await playHandCard(idx)) return true;
      }
      return false;
    };
    const endTurn = async () => {
      const ok = await clickButton(page, /Конец хода/.source);
      if (ok) await page.waitForTimeout(6000); // ход Хранителя
      return ok;
    };

    const snap = async (name) => {
      const m = await measureBoard();
      boardSteps.push({ name, ...m });
      if (shotsDir) {
        await page.screenshot({ path: path.join(path.resolve(shotsDir), `${vp.name}_поле_${name}.png`) });
      }
      return m;
    };

    // Замер произвольной панели: окно отладки, журнал, экран конца боя.
    // Ищем и вылезание за экран, и обрезанный внутри текст — раньше эти окна
    // не открывались в аудите ни разу.
    const measurePanel = (sel) =>
      page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const clipped = [];
        for (const child of el.querySelectorAll('*')) {
          const cs = getComputedStyle(child);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          if (child.children.length > 0) continue;
          if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none') continue;
          const t = (child.textContent || '').trim();
          if (!t) continue;
          const isClipped =
            cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.overflowY === 'hidden';
          const overX = child.scrollWidth - child.clientWidth;
          const overY = child.scrollHeight - child.clientHeight;
          if (isClipped && (overX > 1 || overY > 1)) {
            clipped.push({ text: t.slice(0, 28), overX, overY });
          }
        }
        const close = el.querySelector('.modal-overlay-close, button');
        const closeRect = close ? close.getBoundingClientRect() : null;
        return {
          box: `${Math.round(r.width)}x${Math.round(r.height)}`,
          inside:
            r.top >= -2 && r.bottom <= vh + 2 && r.left >= -2 && r.right <= vw + 2,
          overflowPx: Math.max(
            0,
            Math.round(r.right - vw),
            Math.round(-r.left),
            Math.round(r.bottom - vh),
            Math.round(-r.top)
          ),
          closeBtn: closeRect ? `${Math.round(closeRect.width)}x${Math.round(closeRect.height)}` : null,
          clipped,
          text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 90),
        };
      }, sel);

    // Диагностика розыгрыша: --diag печатает, что именно происходит при клике по карте.
    const diag = args.includes('--diag');
    if (diag) {
      const probe = await page.evaluate(() => {
        const t = document.querySelector('.card-hand-container');
        const w = t && t.closest('.hand-card-wrapper');
        if (!t) return { карта: 'не найдена' };
        const r = t.getBoundingClientRect();
        const cx = Math.round(r.left + r.width / 2);
        const cy = Math.round(r.top + r.height / 2);
        const hit = document.elementFromPoint(cx, cy);
        return {
          точка: `${cx},${cy}`,
          карта: (t.innerText || '').replace(/\s+/g, ' ').slice(0, 24),
          играбельна: /cursor-grab/.test(t.className),
          подТочкой: hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).slice(0, 60)}` : null,
          мана: (document.querySelector('.zone-player-hero')?.innerText || '').replace(/\s+/g, ' ').match(/💎\S+/)?.[0] || '?',
          подсказкаОбучения: !!document.querySelector('.tutorial-hint-panel'),
          обёртка: w ? 'есть' : 'нет',
        };
      });
      console.log(`[${vp.name}] ДИАГ до клика: ${JSON.stringify(probe)}`);
      const c = await page.evaluate(() => {
        const t = document.querySelector('.card-hand-container');
        const r = t.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      });
      await page.mouse.click(c.x, c.y);
      await page.waitForTimeout(500);
      const after1 = await page.evaluate(() => ({
        превью: document.querySelectorAll('.card-preview-overlay').length,
        выбрано: document.querySelectorAll('.hand-card-wrapper.selected').length,
      }));
      const c2 = await page.evaluate(() => {
        const t = document.querySelector('.card-hand-container');
        const r = t.getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      });
      await page.mouse.click(c2.x, c2.y);
      await page.waitForTimeout(800);
      const after2 = await page.evaluate(() => ({
        превью: document.querySelectorAll('.card-preview-overlay').length,
        рука: document.querySelectorAll('.hand-card-wrapper').length,
        поле: document.querySelectorAll('.board-zone.player .card-in-field').length,
        мана: (document.querySelector('.zone-player-hero')?.innerText || '').replace(/\s+/g, ' ').match(/💎\S+/)?.[0] || '?',
      }));
      console.log(`[${vp.name}] ДИАГ после 1-го клика: ${JSON.stringify(after1)}`);
      console.log(`[${vp.name}] ДИАГ после 2-го клика: ${JSON.stringify(after2)}`);
      await closePreview();
    }

    await snap('старт');
    // превью карты: арт-полоса наверху — отдельный источник обрезки
    await page.evaluate(() => {
      const w = document.querySelectorAll('.hand-card-wrapper')[0];
      (w && (w.querySelector('.card-hand-container') || w))?.click();
    });
    await page.waitForTimeout(500);
    await snap('превью-карты');
    await closePreview();

    // наведение: карта приподнимается и может быть срезана верхом зоны руки
    const midCard = await page.evaluate(() => {
      const w = document.querySelectorAll('.hand-card-wrapper');
      const t = w[Math.floor(w.length / 2)];
      if (!t) return null;
      const r = t.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    });
    if (midCard) {
      await page.mouse.move(midCard.x, midCard.y);
      await page.waitForTimeout(500);
      const hovered = await snap('наведение');
      console.log(
        `[${vp.name}] наведение: карта срезана сверху на ${hovered.hoverLiftClip}px (0 = не срезана)`
      );
      await page.mouse.move(5, 5);
      await page.waitForTimeout(300);
    }

    const combatResults = [];
    for (let round = 1; round <= 5; round++) {
      for (let k = 0; k < 3; k++) {
        await playSomething();
        // сразу после первой сыгранной карты подсказка переходит на следующий шаг —
        // если мерить только в конце хода, шаги 2–3 не попадают в замер вообще
        if (round === 1 && k === 0) await snap('обучение-после-первой-карты');
      }
      // Подсказка обучения меняет шаг от состояния ИМЕННО этого хода, поэтому мерить
      // её надо до завершения хода: после «Конец хода» счётчики сбрасываются и шаг
      // навсегда остаётся первым (проверено — все замеры показывали «Шаг 1 из 4»).
      if (round <= 3) await snap(`обучение-ход${round}`);
      if (combatResults.length < 2) await tryAttack(`ход${round}`);
      await endTurn();
      await snap(`ход${round}`);
      if (round === 3) {
        await clickButton(page, /Пропустить обучение/.source);
        await page.waitForTimeout(500);
      }
    }
    report.combat = report.combat || [];
    report.combat.push({ vp: vp.name, attempts: combatResults });

    // ─── стресс: большая рука. Жалоба звучала как «внизу, где много карт» ───
    for (let r = 1; r <= 4; r++) {
      await playSomething();
      await endTurn();
    }
    await snap('большая-рука');

    // ─── панели интерфейса: окно отладки и журнал боя ───
    // Ни одно из этих окон аудит до сих пор не открывал.
    const panels = {};
    await clickButton(page, /Отладка/.source);
    await page.waitForTimeout(600);
    panels.debug = await measurePanel('.game-debug-drawer');
    await clickButton(page, /Отладка/.source);
    await page.waitForTimeout(400);

    await clickButton(page, /Журнал/.source);
    await page.waitForTimeout(700);
    panels.journal = await measurePanel('.modal-overlay-content');
    panels.journalBackdrop = await measurePanel('.modal-overlay');
    if (shotsDir) {
      await page.screenshot({ path: path.join(path.resolve(shotsDir), `${vp.name}_журнал.png`) });
    }
    await page.evaluate(() => document.querySelector('.modal-overlay-close')?.click());
    await page.waitForTimeout(400);
    report.panels = report.panels || [];
    report.panels.push({ vp: vp.name, panels });
    for (const [name, p] of Object.entries(panels)) {
      if (!p) {
        console.log(`[${vp.name}] ${name}: не открылось`);
        continue;
      }
      console.log(
        `[${vp.name}] ${name}: ${p.box}${p.inside ? ' в экране' : ' ВНЕ ЭКРАНА на ' + p.overflowPx + 'px'} ` +
        `обрезанныйТекст=${p.clipped.length}${p.closeBtn ? ' кнопкаЗакрытия=' + p.closeBtn : ''}`
      );
    }

    // ─── экран победы/поражения: доводим бой до конца ───
    let gameOver = await measurePanel('.game-over-panel');
    for (let i = 0; i < 14 && !gameOver; i++) {
      const canContinue = await clickButton(page, /Конец хода/.source);
      await page.waitForTimeout(2500);
      gameOver = await measurePanel('.game-over-panel');
      if (!canContinue && !gameOver) break;
    }
    report.gameOver = report.gameOver || [];
    report.gameOver.push({ vp: vp.name, panel: gameOver });
    if (gameOver) {
      if (shotsDir) {
        await page.screenshot({ path: path.join(path.resolve(shotsDir), `${vp.name}_конец-боя.png`) });
      }
      console.log(
        `[${vp.name}] конец боя: "${gameOver.text}" ${gameOver.box}${gameOver.inside ? ' в экране' : ' ВНЕ ЭКРАНА на ' + gameOver.overflowPx + 'px'} ` +
        `обрезанныйТекст=${gameOver.clipped.length}${gameOver.clipped.length ? ' -> ' + JSON.stringify(gameOver.clipped.slice(0, 3)) : ''}`
      );
    } else {
      console.log(`[${vp.name}] конец боя: экран не появился за 14 ходов`);
    }

    // ─── бой: атакуем СРАЗУ, как только наше существо вышло на поле ───
    // Отдельная фаза «потом» не работает: к тому моменту Хранитель уже убивает
    // наших существ, поле пустое, и атаковать некому.
    async function tryAttack(label) {
      await waitMyTurn();
      const available = await page.evaluate(() =>
        Array.from(document.querySelectorAll('.board-zone.player .card-in-field')).length
      );
      if (!available) return false;
      const attackerReady = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.board-zone.player .card-in-field'));
        // может действовать — подсвечена зелёным кольцом (canAct), иначе откроется превью
        const able = cards.find((c) => /ring-green-400/.test(c.className));
        if (!able) return false;
        able.click();
        return true;
      });
      await page.waitForTimeout(600);
      const attackBtn = await page.evaluate(() => {
        const b = document.querySelector('.attack-hero-btn');
        if (!b) return null;
        const r = b.getBoundingClientRect();
        return {
          size: `${Math.round(r.width)}x${Math.round(r.height)}`,
          inside: r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth,
        };
      });
      if (attackBtn) {
        await page.evaluate(() => document.querySelector('.attack-hero-btn')?.click());
        await page.waitForTimeout(250);
      }
      const combat = await page.evaluate(() => {
        const inside = (el) => {
          const r = el.getBoundingClientRect();
          return r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth;
        };
        const zoneP = document.querySelector('.board-zone.player');
        const zoneE = document.querySelector('.board-zone.enemy');
        return {
          damageNumbers: Array.from(document.querySelectorAll('.damage-number')).map((d) => ({
            text: (d.textContent || '').trim(),
            inside: inside(d),
          })),
          fieldOverflowPlayer: zoneP ? zoneP.scrollWidth - zoneP.clientWidth : 0,
          fieldOverflowEnemy: zoneE ? zoneE.scrollWidth - zoneE.clientWidth : 0,
        };
      });
      combatResults.push({ label, attackerReady, attackBtn, combat });
      console.log(
        `[${vp.name}] бой (${label}): существо=${attackerReady ? 'выбрано' : 'не выбралось'} ` +
        `кнопка=${attackBtn ? attackBtn.size + (attackBtn.inside ? ' в экране' : ' ВНЕ ЭКРАНА') : 'не появилась'} ` +
        `урона=${combat.damageNumbers.length} вне экрана=${combat.damageNumbers.filter((d) => !d.inside).length} ` +
        `переполнениеПоля=${combat.fieldOverflowPlayer}/${combat.fieldOverflowEnemy}`
      );
      if (shotsDir) {
        await page.screenshot({ path: path.join(path.resolve(shotsDir), `${vp.name}_поле_бой.png`) });
      }
      return true;
    }

    report.boardDynamics = report.boardDynamics || [];
    report.boardDynamics.push({ vp: vp.name, steps: boardSteps });
    const last = boardSteps[boardSteps.length - 1];
    console.log(
      `[${vp.name}] поле  шагов=${boardSteps.length} полеИгрока=${last.fieldPlayer} полеИИ=${last.fieldEnemy} рука=${last.handCount} ` +
      `карта=${last.handCard}(ratio ${last.handRatio}) картаПоля=${last.fieldCard}(ratio ${last.fieldRatio}) артПоля=${last.fieldArtCrop}% артРуки=${last.handArtCrop}% ` +
      `превью=${last.preview ? last.preview.box + ' арт ' + last.preview.art + ' обрезка ' + last.preview.artCrop + '%' : 'нет'} ` +
      `рукаЗаЗоной=${boardSteps.reduce((a, s) => Math.max(a, s.handClippedByZone), 0)} свес=${boardSteps.reduce((a, s) => Math.max(a, s.handOverhang), 0)}px ` +
      `срезПриНаведении=${boardSteps.reduce((a, s) => Math.max(a, s.hoverLiftClip), 0)}px ` +
      `панельПоверхРуки=${boardSteps.reduce((a, s) => Math.max(a, s.panelsOverHand), 0)} ` +
      `рукаМакс=${boardSteps.reduce((a, s) => Math.max(a, s.handCount), 0)} видно=${boardSteps.reduce((a, s) => Math.min(a, s.handVisible ?? 1), 1)} ` +
      `скроллРуки=${boardSteps.reduce((a, s) => Math.max(a, s.handOverflow), 0)}px`
    );
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
