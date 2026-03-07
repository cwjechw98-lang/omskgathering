/**
 * Quick mobile viewport verification script
 * Handles page reloads by retrying button clicks
 */
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const VIEWPORTS = [
  { name: 'mobile-375x812', width: 375, height: 812 },
  { name: 'mobile-390x844', width: 390, height: 844 },
];

async function startGame(page, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Wait for page to be loaded
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      
      // Check if we're already on the game board
      const gameGrid = await page.$('.game-grid');
      if (gameGrid) {
        console.log('  ✅ Game grid already present');
        return true;
      }
      
      // Try to click the "Против Хранителя" button
      const btn = await page.$('button:has-text("Против Хранителя")');
      if (btn) {
        await btn.click();
        console.log(`  Clicked "Против Хранителя" (attempt ${i + 1})`);
        
        // Wait for game grid to appear
        try {
          await page.waitForSelector('.game-grid', { timeout: 8000 });
          console.log('  ✅ Game grid appeared');
          return true;
        } catch {
          console.log('  ⚠️ Game grid not found after click, retrying...');
        }
      } else {
        console.log(`  Button not found (attempt ${i + 1}), waiting...`);
        await page.waitForTimeout(2000);
      }
    } catch (err) {
      console.log(`  Retry ${i + 1}: ${err.message}`);
      await page.waitForTimeout(1000);
    }
  }
  return false;
}

async function measureViewport(page, vp) {
  const results = {};
  
  // 1. Check horizontal scroll
  results.scroll = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 5,
  }));
  
  // 2. Measure all zones
  results.zones = await page.evaluate(() => {
    const selectors = [
      '.zone-topbar', '.zone-enemy-hero', '.zone-enemy-board',
      '.zone-divider', '.zone-player-board', '.zone-player-hero',
      '.zone-actionbar', '.zone-hand',
    ];
    const data = {};
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        data[sel] = {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          right: Math.round(rect.x + rect.width),
          bottom: Math.round(rect.y + rect.height),
        };
      } else {
        data[sel] = null;
      }
    }
    return data;
  });
  
  // 3. Check creature slots
  results.slots = await page.evaluate((vpWidth) => {
    const slots = Array.from(document.querySelectorAll('.creature-slot, .board-slot'));
    const overflowing = [];
    for (const s of slots) {
      const rect = s.getBoundingClientRect();
      if (rect.x + rect.width > vpWidth + 2) {
        overflowing.push({
          className: s.className.substring(0, 60),
          right: Math.round(rect.x + rect.width),
          overflow: Math.round(rect.x + rect.width - vpWidth),
        });
      }
    }
    return { total: slots.length, overflowing };
  }, vp.width);
  
  // 4. Check hand cards
  results.handCards = await page.evaluate((vpWidth) => {
    const wrappers = Array.from(document.querySelectorAll('.hand-card-wrapper'));
    const overflowing = [];
    for (const w of wrappers) {
      const rect = w.getBoundingClientRect();
      if (rect.x + rect.width > vpWidth + 10) {
        overflowing.push({
          right: Math.round(rect.x + rect.width),
          overflow: Math.round(rect.x + rect.width - vpWidth),
        });
      }
    }
    return { total: wrappers.length, overflowing };
  }, vp.width);
  
  // 5. Check touch targets (buttons)
  results.touchTargets = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const small = [];
    for (const btn of buttons) {
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && (rect.width < 36 || rect.height < 36)) {
        small.push({
          text: btn.textContent?.trim().substring(0, 30) || '(no text)',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    }
    return { totalButtons: buttons.length, smallTargets: small };
  });
  
  // 6. Check zone overlaps
  results.overlaps = [];
  const zoneKeys = Object.keys(results.zones).filter(k => results.zones[k] !== null);
  for (let i = 0; i < zoneKeys.length; i++) {
    for (let j = i + 1; j < zoneKeys.length; j++) {
      const a = results.zones[zoneKeys[i]];
      const b = results.zones[zoneKeys[j]];
      if (!a || !b) continue;
      const hOverlap = !(a.right <= b.x || b.right <= a.x);
      const vOverlap = !(a.bottom <= b.y || b.bottom <= a.y);
      if (hOverlap && vOverlap) {
        const overlapH = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
        if (overlapH > 1) {
          results.overlaps.push({
            zones: [zoneKeys[i], zoneKeys[j]],
            overlapPx: Math.round(overlapH),
          });
        }
      }
    }
  }
  
  // 7. Check board zone grid template (7 columns)
  results.boardGrid = await page.evaluate(() => {
    const board = document.querySelector('.board-zone');
    if (!board) return null;
    const style = window.getComputedStyle(board);
    return {
      gridTemplateColumns: style.gridTemplateColumns,
      width: Math.round(board.getBoundingClientRect().width),
    };
  });

  // 8. Check .game-grid max-width
  results.gameGrid = await page.evaluate(() => {
    const grid = document.querySelector('.game-grid');
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const style = window.getComputedStyle(grid);
    return {
      width: Math.round(rect.width),
      maxWidth: style.maxWidth,
      overflow: style.overflow,
    };
  });
  
  return results;
}

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  
  let totalIssues = 0;
  
  for (const vp of VIEWPORTS) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📱 ${vp.name} (${vp.width}×${vp.height})`);
    console.log('='.repeat(50));
    
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();
    
    try {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
      
      const gameStarted = await startGame(page);
      if (!gameStarted) {
        console.log('  ❌ Could not start game - skipping viewport');
        await context.close();
        continue;
      }
      
      // Give the board time to fully render
      await page.waitForTimeout(3000);
      
      // Take screenshot
      await page.screenshot({ path: `output/deep-audit/${vp.name}-verify.png`, fullPage: false });
      
      const m = await measureViewport(page, vp);
      let vpIssues = 0;
      
      // Report: horizontal scroll
      if (m.scroll.hasHorizontalOverflow) {
        console.log(`  🔴 HORIZONTAL OVERFLOW: scrollWidth=${m.scroll.scrollWidth} > clientWidth=${m.scroll.clientWidth}`);
        vpIssues++;
      } else {
        console.log(`  ✅ No horizontal overflow (scrollWidth=${m.scroll.scrollWidth}, clientWidth=${m.scroll.clientWidth})`);
      }
      
      // Report: zones
      const foundZones = Object.keys(m.zones).filter(k => m.zones[k]);
      const missingZones = Object.keys(m.zones).filter(k => !m.zones[k]);
      console.log(`  Zones found: ${foundZones.length}/8`);
      if (missingZones.length) console.log(`    Missing: ${missingZones.join(', ')}`);
      
      for (const [name, z] of Object.entries(m.zones)) {
        if (!z) continue;
        if (z.right > vp.width + 2) {
          console.log(`  🔴 ${name} overflows right: right=${z.right} > viewport=${vp.width}`);
          vpIssues++;
        }
      }
      
      // Report: creature slots
      if (m.slots.overflowing.length > 0) {
        console.log(`  🔴 ${m.slots.overflowing.length} creature slots overflow viewport`);
        for (const s of m.slots.overflowing) console.log(`    → ${s.className} right=${s.right}`);
        vpIssues += m.slots.overflowing.length;
      } else {
        console.log(`  ✅ All ${m.slots.total} creature slots within viewport`);
      }
      
      // Report: hand cards
      if (m.handCards.overflowing.length > 0) {
        console.log(`  🔴 ${m.handCards.overflowing.length} hand cards overflow viewport`);
        vpIssues += m.handCards.overflowing.length;
      } else {
        console.log(`  ✅ All ${m.handCards.total} hand cards within viewport`);
      }
      
      // Report: touch targets
      if (m.touchTargets.smallTargets.length > 0) {
        console.log(`  🟡 ${m.touchTargets.smallTargets.length} buttons below 36px touch target:`);
        for (const t of m.touchTargets.smallTargets) {
          console.log(`    → "${t.text}" ${t.width}x${t.height}px`);
        }
        vpIssues += m.touchTargets.smallTargets.length;
      } else {
        console.log(`  ✅ All ${m.touchTargets.totalButtons} buttons meet 36px touch target`);
      }
      
      // Report: overlaps
      if (m.overlaps.length > 0) {
        console.log(`  🟡 ${m.overlaps.length} zone overlaps:`);
        for (const o of m.overlaps) {
          console.log(`    → ${o.zones.join(' ↔ ')} by ${o.overlapPx}px`);
        }
        vpIssues += m.overlaps.length;
      } else {
        console.log(`  ✅ No zone overlaps`);
      }
      
      // Report: board grid
      if (m.boardGrid) {
        console.log(`  Board grid: ${m.boardGrid.gridTemplateColumns} (width=${m.boardGrid.width}px)`);
      }
      
      // Report: game-grid
      if (m.gameGrid) {
        console.log(`  Game grid: width=${m.gameGrid.width}px, maxWidth=${m.gameGrid.maxWidth}, overflow=${m.gameGrid.overflow}`);
      }
      
      console.log(`\n  Total issues for ${vp.name}: ${vpIssues}`);
      totalIssues += vpIssues;
      
    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
    } finally {
      await context.close();
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 TOTAL ISSUES ACROSS ALL VIEWPORTS: ${totalIssues}`);
  console.log('='.repeat(50));
  
  await browser.close();
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
