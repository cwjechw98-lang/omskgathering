import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import net from 'node:net';

let baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5173/omskgathering/';
const outDir = path.resolve('output', 'ui-smoke');
const viewports = [
  { name: 'desktop-1366', width: 1366, height: 768 },
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'mobile-375', width: 375, height: 812 },
];

async function waitForUrl(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Dev server is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`Dev server did not respond at ${url}`);
}

async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findFreePort(startPort) {
  for (let port = startPort; port < startPort + 50; port += 1) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(`No free smoke-test port found near ${startPort}`);
}

async function withServer(fn) {
  if (process.env.SMOKE_BASE_URL) return fn();

  const port = await findFreePort(Number(process.env.SMOKE_PORT || 5173));
  baseUrl = `http://127.0.0.1:${port}/omskgathering/`;
  const viteBin = path.resolve('node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitForUrl(baseUrl);
    return await fn();
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n${output}`);
  } finally {
    child.kill();
  }
}

async function gotoMenu(page) {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByText('Против Хранителя', { exact: true }).waitFor({ state: 'visible', timeout: 10000 });
}

async function assertNoDocumentHorizontalScroll(page, viewportName) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    zoneWidths: Array.from(document.querySelectorAll('[class^="zone-"]')).map((element) => {
      const rect = element.getBoundingClientRect();
      return { className: element.className, width: rect.width };
    }),
  }));

  const maxWidth = Math.max(metrics.scrollWidth, metrics.bodyScrollWidth);
  if (maxWidth > metrics.innerWidth + 1) {
    throw new Error(`${viewportName}: horizontal document scroll ${maxWidth} > ${metrics.innerWidth}`);
  }

  const wideZone = metrics.zoneWidths.find((zone) => zone.width > metrics.innerWidth + 1);
  if (wideZone) {
    throw new Error(`${viewportName}: zone ${wideZone.className} is wider than viewport`);
  }

  return metrics;
}

async function skipIntro(page) {
  await page.getByText('Против Хранителя', { exact: true }).click({ timeout: 10000 });
  await page.getByText('Пропустить', { exact: false }).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('Пропустить', { exact: false }).click({ timeout: 10000 });
  await page.locator('.game-grid').waitFor({ state: 'visible', timeout: 10000 });
}

async function runGameBoardSmoke(browser, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleErrors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await gotoMenu(page);
  await skipIntro(page);

  const firstLand = page.locator('.card-hand-container[data-card-type="land"]').first();
  const endTurnButton = page.getByRole('button', { name: /Конец хода/ });
  const endTurnEnabledBeforeClick = await endTurnButton.isEnabled({ timeout: 10000 });
  await firstLand.dblclick({ timeout: 10000 });
  await page.locator('.card-field-container').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await endTurnButton.click({ timeout: 10000 });

  const metrics = await page.evaluate(() => {
    const slots = document.querySelectorAll('.creature-slot').length;
    const handCards = document.querySelectorAll('.card-hand-container').length;
    const activeHero = document.querySelector('.zone-player-hero [role="region"]');
    const enemyHero = document.querySelector('.zone-enemy-hero [role="region"]');
    const images = Array.from(document.images).map((image) => ({
      src: image.getAttribute('src'),
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    }));

    return {
      slots,
      handCards,
      activeHeroText: activeHero?.textContent || '',
      enemyHeroText: enemyHero?.textContent || '',
      brokenImages: images.filter((image) => image.complete && (image.naturalWidth === 0 || image.naturalHeight === 0)),
    };
  });
  const scrollMetrics = await assertNoDocumentHorizontalScroll(page, viewport.name);
  await page.screenshot({ path: path.join(outDir, `${viewport.name}-game.png`), fullPage: true });

  if (metrics.slots !== 14) throw new Error(`${viewport.name}: expected 14 slots, got ${metrics.slots}`);
  if (metrics.handCards < 1) throw new Error(`${viewport.name}: hand is empty or not visible`);
  if (!endTurnEnabledBeforeClick) throw new Error(`${viewport.name}: end turn button is disabled on own turn`);
  if (!metrics.activeHeroText.includes('30/30')) throw new Error(`${viewport.name}: active hero stats are not visible`);
  if (!metrics.enemyHeroText.includes('30/30')) throw new Error(`${viewport.name}: enemy hero stats are not visible`);
  if (metrics.brokenImages.length > 0) throw new Error(`${viewport.name}: broken images detected`);
  if (consoleErrors.length > 0) throw new Error(`${viewport.name}: console errors: ${consoleErrors.join('; ')}`);
  if (pageErrors.length > 0) throw new Error(`${viewport.name}: page errors: ${pageErrors.join('; ')}`);

  await context.close();
  return { viewport: viewport.name, metrics, scrollMetrics };
}

async function runMenuSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  await gotoMenu(page);

  await page.getByText('Коллекция', { exact: true }).click({ timeout: 10000 });
  await page.getByRole('heading', { name: /Коллекция/ }).waitFor({ state: 'visible', timeout: 10000 });
  const visibleCards = await page.locator('.card-frame').count();
  if (visibleCards < 8) throw new Error(`collection rendered too few cards: ${visibleCards}`);
  await page.screenshot({ path: path.join(outDir, 'collection.png'), fullPage: true });

  await page.getByText('← Назад', { exact: true }).click({ timeout: 10000 });
  await page.getByText('Правила Игры', { exact: true }).click({ timeout: 10000 });
  await page.getByText('Правила игры', { exact: false }).waitFor({ state: 'visible', timeout: 10000 }).catch(async () => {
    await page.getByText('Типы карт', { exact: false }).waitFor({ state: 'visible', timeout: 10000 });
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByText('Легенда Омска', { exact: true }).click({ timeout: 10000 });
  await page.getByRole('heading', { name: /Легенда Омска/ }).waitFor({ state: 'visible', timeout: 10000 });

  await context.close();
  return { visibleCards };
}

await mkdir(outDir, { recursive: true });

const report = await withServer(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const menu = await runMenuSmoke(browser);
    const boards = [];
    for (const viewport of viewports) {
      boards.push(await runGameBoardSmoke(browser, viewport));
    }
    return { ok: true, menu, boards };
  } finally {
    await browser.close();
  }
});

await writeFile(path.join(outDir, 'ui-smoke-report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
