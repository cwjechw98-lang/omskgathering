/**
 * Deep UI Audit Script — captures screenshots & measures zone boundaries
 * across all 8 target viewports for the Omsk Gatering game board.
 *
 * Run:  npx playwright test tests/ui/deep-audit.mjs   (NO — this is a standalone script)
 *   OR: node tests/ui/deep-audit.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const SCREENSHOTS_DIR = './output/deep-audit';
const BASE_URL = 'http://localhost:5173';

const VIEWPORTS = [
  { name: 'desktop-1920x1080', width: 1920, height: 1080, category: 'Desktop' },
  { name: 'desktop-1440x900',  width: 1440, height: 900,  category: 'Desktop' },
  { name: 'desktop-1366x768',  width: 1366, height: 768,  category: 'Desktop' },
  { name: 'tablet-768x1024',   width: 768,  height: 1024, category: 'Tablet'  },
  { name: 'tablet-1024x768',   width: 1024, height: 768,  category: 'Tablet'  },
  { name: 'mobile-375x812',    width: 375,  height: 812,  category: 'Mobile'  },
  { name: 'mobile-390x844',    width: 390,  height: 844,  category: 'Mobile'  },
  { name: 'mobile-414x896',    width: 414,  height: 896,  category: 'Mobile'  },
];

const ZONE_SELECTORS = [
  '.zone-topbar',
  '.zone-enemy-hero',
  '.zone-enemy-board',
  '.zone-divider',
  '.zone-player-board',
  '.zone-player-hero',
  '.zone-actionbar',
  '.zone-hand',
];

async function measureZones(page) {
  return page.evaluate((selectors) => {
    const results = {};
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        results[sel] = {
          x: Math.round(rect.x * 100) / 100,
          y: Math.round(rect.y * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
          right: Math.round((rect.x + rect.width) * 100) / 100,
          bottom: Math.round((rect.y + rect.height) * 100) / 100,
          overflow: style.overflow,
          zIndex: style.zIndex,
          position: style.position,
        };
      } else {
        results[sel] = null;
      }
    }
    return results;
  }, ZONE_SELECTORS);
}

async function checkOverlaps(zones) {
  const issues = [];
  const zoneNames = Object.keys(zones).filter(k => zones[k] !== null);

  for (let i = 0; i < zoneNames.length; i++) {
    for (let j = i + 1; j < zoneNames.length; j++) {
      const a = zones[zoneNames[i]];
      const b = zones[zoneNames[j]];
      if (!a || !b) continue;

      // Check vertical overlap (zones in same column — full width)
      const hOverlap = !(a.right <= b.x || b.right <= a.x);
      const vOverlap = !(a.bottom <= b.y || b.bottom <= a.y);

      if (hOverlap && vOverlap) {
        const overlapH = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
        const overlapW = Math.min(a.right, b.right) - Math.max(a.x, b.x);
        if (overlapH > 1 && overlapW > 1) { // >1px tolerance
          issues.push({
            type: 'zone-overlap',
            severity: overlapH > 10 ? 'HIGH' : 'LOW',
            zones: [zoneNames[i], zoneNames[j]],
            overlapPx: { width: Math.round(overlapW), height: Math.round(overlapH) },
            details: `${zoneNames[i]} (bottom=${a.bottom}) overlaps ${zoneNames[j]} (top=${b.y}) by ${Math.round(overlapH)}px vertically`,
          });
        }
      }
    }
  }
  return issues;
}

async function checkBoundaryOverflow(zones, viewportWidth, viewportHeight) {
  const issues = [];
  for (const [name, zone] of Object.entries(zones)) {
    if (!zone) continue;
    if (zone.right > viewportWidth + 2) {
      issues.push({
        type: 'horizontal-overflow',
        severity: 'HIGH',
        zone: name,
        details: `${name} extends ${Math.round(zone.right - viewportWidth)}px beyond right edge (right=${zone.right}, viewport=${viewportWidth})`,
      });
    }
    if (zone.bottom > viewportHeight + 2) {
      issues.push({
        type: 'vertical-overflow',
        severity: zone.bottom - viewportHeight > 20 ? 'HIGH' : 'MEDIUM',
        zone: name,
        details: `${name} extends ${Math.round(zone.bottom - viewportHeight)}px below viewport (bottom=${zone.bottom}, viewport=${viewportHeight})`,
      });
    }
    if (zone.x < -2) {
      issues.push({
        type: 'left-overflow',
        severity: 'MEDIUM',
        zone: name,
        details: `${name} extends ${Math.round(Math.abs(zone.x))}px beyond left edge (x=${zone.x})`,
      });
    }
    if (zone.y < -2) {
      issues.push({
        type: 'top-overflow',
        severity: 'LOW',
        zone: name,
        details: `${name} extends ${Math.round(Math.abs(zone.y))}px above viewport (y=${zone.y})`,
      });
    }
    if (zone.height <= 0) {
      issues.push({
        type: 'zero-height',
        severity: 'HIGH',
        zone: name,
        details: `${name} has zero or negative height (${zone.height}px)`,
      });
    }
  }
  return issues;
}

async function checkHorizontalScroll(page, viewportWidth) {
  const scrollData = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  const issues = [];
  if (scrollData.scrollWidth > scrollData.clientWidth + 5) {
    issues.push({
      type: 'page-horizontal-scroll',
      severity: 'HIGH',
      details: `Page has horizontal scroll: scrollWidth=${scrollData.scrollWidth}, clientWidth=${scrollData.clientWidth}, overflow=${scrollData.scrollWidth - scrollData.clientWidth}px`,
    });
  }
  return issues;
}

async function checkTouchTargets(page) {
  const issues = [];
  const buttonData = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.map(btn => {
      const rect = btn.getBoundingClientRect();
      return {
        text: btn.textContent?.trim().substring(0, 30) || '(no text)',
        className: btn.className.substring(0, 60),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        visible: rect.width > 0 && rect.height > 0,
      };
    });
  });

  for (const btn of buttonData) {
    if (!btn.visible) continue;
    if (btn.height < 30 || btn.width < 30) {
      issues.push({
        type: 'small-touch-target',
        severity: btn.height < 20 ? 'HIGH' : 'MEDIUM',
        details: `Button "${btn.text}" is only ${btn.width}x${btn.height}px (min recommended: 44x44)`,
        element: btn,
      });
    }
  }
  return issues;
}

async function checkCreatureSlots(page, viewportWidth) {
  const issues = [];
  const slotData = await page.evaluate(() => {
    const slots = Array.from(document.querySelectorAll('.creature-slot, .board-slot'));
    return slots.map((s, i) => {
      const rect = s.getBoundingClientRect();
      return {
        index: i,
        className: s.className.substring(0, 80),
        x: Math.round(rect.x * 10) / 10,
        y: Math.round(rect.y * 10) / 10,
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
        right: Math.round((rect.x + rect.width) * 10) / 10,
      };
    });
  });

  // Check if slots overflow viewport
  for (const slot of slotData) {
    if (slot.right > viewportWidth + 2) {
      issues.push({
        type: 'slot-overflow',
        severity: 'HIGH',
        details: `Creature slot #${slot.index} extends beyond viewport (right=${slot.right}, viewport=${viewportWidth})`,
        element: slot,
      });
    }
  }

  // Check for slot overlaps within same row
  // Group by approximate Y position (same row = within 10px)
  const rows = {};
  for (const slot of slotData) {
    const rowKey = Math.round(slot.y / 20) * 20;
    if (!rows[rowKey]) rows[rowKey] = [];
    rows[rowKey].push(slot);
  }

  for (const [rowY, rowSlots] of Object.entries(rows)) {
    rowSlots.sort((a, b) => a.x - b.x);
    for (let i = 0; i < rowSlots.length - 1; i++) {
      const curr = rowSlots[i];
      const next = rowSlots[i + 1];
      if (curr.right > next.x + 2) {
        issues.push({
          type: 'slot-overlap',
          severity: 'MEDIUM',
          details: `Slot #${curr.index} (right=${curr.right}) overlaps slot #${next.index} (x=${next.x}) by ${Math.round(curr.right - next.x)}px`,
        });
      }
    }
  }

  return issues;
}

async function checkHandCards(page, viewportWidth, viewportHeight) {
  const issues = [];
  const cardData = await page.evaluate(() => {
    const wrappers = Array.from(document.querySelectorAll('.hand-card-wrapper'));
    const handZone = document.querySelector('.zone-hand');
    const playerHero = document.querySelector('.zone-player-hero');
    return {
      cards: wrappers.map((w, i) => {
        const rect = w.getBoundingClientRect();
        return {
          index: i,
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          right: Math.round(rect.x + rect.width),
          bottom: Math.round(rect.y + rect.height),
          zIndex: window.getComputedStyle(w).zIndex,
        };
      }),
      handZone: handZone ? (() => {
        const r = handZone.getBoundingClientRect();
        return { y: Math.round(r.y), bottom: Math.round(r.y + r.height), height: Math.round(r.height) };
      })() : null,
      playerHero: playerHero ? (() => {
        const r = playerHero.getBoundingClientRect();
        return { y: Math.round(r.y), bottom: Math.round(r.y + r.height) };
      })() : null,
    };
  });

  // Check if hand cards overflow viewport
  for (const card of cardData.cards) {
    if (card.right > viewportWidth + 10) {
      issues.push({
        type: 'hand-card-overflow-right',
        severity: 'HIGH',
        details: `Hand card #${card.index} extends ${card.right - viewportWidth}px beyond right edge`,
      });
    }
    if (card.bottom > viewportHeight + 10) {
      issues.push({
        type: 'hand-card-below-viewport',
        severity: 'MEDIUM',
        details: `Hand card #${card.index} extends ${card.bottom - viewportHeight}px below viewport`,
      });
    }
  }

  // Check if hand overlaps player hero zone
  if (cardData.handZone && cardData.playerHero) {
    if (cardData.handZone.y < cardData.playerHero.bottom - 2) {
      issues.push({
        type: 'hand-overlaps-hero',
        severity: 'HIGH',
        details: `Hand zone (top=${cardData.handZone.y}) overlaps player hero zone (bottom=${cardData.playerHero.bottom}) by ${cardData.playerHero.bottom - cardData.handZone.y}px`,
      });
    }
  }

  return issues;
}

async function checkTextTruncation(page) {
  const issues = [];
  const truncated = await page.evaluate(() => {
    const results = [];
    // Check elements that might have text truncation
    const selectors = [
      '.zone-topbar *',
      '.hero-zone-row *',
      '.center-divider *',
      '.action-bar *',
      '.divider-hint',
    ];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (el.scrollWidth > el.clientWidth + 2 && el.textContent?.trim()) {
          const rect = el.getBoundingClientRect();
          results.push({
            text: el.textContent.trim().substring(0, 40),
            className: el.className?.substring(0, 50) || '',
            tag: el.tagName,
            scrollWidth: el.scrollWidth,
            clientWidth: el.clientWidth,
            overflow: window.getComputedStyle(el).overflow,
            textOverflow: window.getComputedStyle(el).textOverflow,
          });
        }
      }
    }
    return results;
  });

  for (const t of truncated) {
    issues.push({
      type: 'text-truncation',
      severity: 'LOW',
      details: `Text "${t.text}" is truncated in <${t.tag} class="${t.className}"> (scrollW=${t.scrollWidth}, clientW=${t.clientWidth})`,
    });
  }
  return issues;
}

async function checkZIndexStacking(page) {
  const issues = [];
  const zData = await page.evaluate(() => {
    const zones = {
      '.zone-topbar': null,
      '.zone-enemy-hero': null,
      '.zone-enemy-board': null,
      '.zone-divider': null,
      '.zone-player-board': null,
      '.zone-player-hero': null,
      '.zone-actionbar': null,
      '.zone-hand': null,
    };
    for (const sel of Object.keys(zones)) {
      const el = document.querySelector(sel);
      if (el) {
        const s = window.getComputedStyle(el);
        zones[sel] = {
          zIndex: s.zIndex,
          position: s.position,
          overflow: s.overflow,
        };
      }
    }
    return zones;
  });

  // Expected stacking order (bottom to top):
  // board(10) < divider(15->30) < card-slots(20) < cards(30) < ui(60) < hero(65) < hand(85)
  const expectedOrder = [
    ['.zone-enemy-board', 10],
    ['.zone-player-board', 10],
    ['.zone-divider', 30],
    ['.zone-topbar', 60],
    ['.zone-actionbar', 60],
    ['.zone-enemy-hero', 65],
    ['.zone-player-hero', 65],
    ['.zone-hand', 85],
  ];

  // Check that hand z-index is above hero
  const handZ = parseInt(zData['.zone-hand']?.zIndex) || 0;
  const heroZ = parseInt(zData['.zone-player-hero']?.zIndex) || 0;
  if (handZ <= heroZ && handZ > 0 && heroZ > 0) {
    issues.push({
      type: 'z-index-conflict',
      severity: 'HIGH',
      details: `Hand zone z-index (${handZ}) is not above player hero z-index (${heroZ}) — cards may be hidden behind hero`,
    });
  }

  // Check divider is above boards
  const dividerZ = parseInt(zData['.zone-divider']?.zIndex) || 0;
  const boardZ = parseInt(zData['.zone-player-board']?.zIndex) || 0;
  if (dividerZ <= boardZ && dividerZ > 0) {
    issues.push({
      type: 'z-index-conflict',
      severity: 'MEDIUM',
      details: `Divider z-index (${dividerZ}) is not above board z-index (${boardZ}) — end-turn button may be hidden`,
    });
  }

  return { issues, zData };
}

// ============================================================================
// MAIN AUDIT
// ============================================================================
async function runAudit() {
  await mkdir(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const report = { viewports: {}, summary: { total: 0, high: 0, medium: 0, low: 0 } };

  for (const vp of VIEWPORTS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📐 ${vp.category}: ${vp.name} (${vp.width}×${vp.height})`);
    console.log('='.repeat(60));

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    try {
      // Navigate to main menu
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Screenshot: main menu
      await page.screenshot({
        path: join(SCREENSHOTS_DIR, `${vp.name}-menu.png`),
        fullPage: false,
      });

      // Start AI game
      console.log('  Starting AI game...');
      try {
        await page.click('text=Против Хранителя', { timeout: 8000 });
      } catch {
        // Try alternate button text
        try {
          await page.click('button >> nth=0', { timeout: 3000 });
        } catch {
          console.log('  ⚠️ Could not find Start button');
        }
      }

      // Wait for game board to render
      try {
        await page.waitForSelector('.game-grid', { timeout: 20000 });
      } catch {
        console.log('  ⚠️ game-grid not found after 20s, taking screenshot anyway');
      }
      await page.waitForTimeout(5000);

      // Screenshot: game board (viewport only)
      await page.screenshot({
        path: join(SCREENSHOTS_DIR, `${vp.name}-board.png`),
        fullPage: false,
      });

      // Screenshot: full page
      await page.screenshot({
        path: join(SCREENSHOTS_DIR, `${vp.name}-board-full.png`),
        fullPage: true,
      });

      // ── Measure zones ──
      console.log('  Measuring zones...');
      const zones = await measureZones(page);

      // ── Run all checks ──
      const allIssues = [];

      const overlapIssues = await checkOverlaps(zones);
      allIssues.push(...overlapIssues);

      const boundaryIssues = await checkBoundaryOverflow(zones, vp.width, vp.height);
      allIssues.push(...boundaryIssues);

      const scrollIssues = await checkHorizontalScroll(page, vp.width);
      allIssues.push(...scrollIssues);

      if (vp.category === 'Mobile') {
        const touchIssues = await checkTouchTargets(page);
        allIssues.push(...touchIssues);
      }

      const slotIssues = await checkCreatureSlots(page, vp.width);
      allIssues.push(...slotIssues);

      const handIssues = await checkHandCards(page, vp.width, vp.height);
      allIssues.push(...handIssues);

      const textIssues = await checkTextTruncation(page);
      allIssues.push(...textIssues);

      const { issues: zIssues, zData } = await checkZIndexStacking(page);
      allIssues.push(...zIssues);

      // Print zones
      console.log('\n  Zone measurements:');
      for (const [name, data] of Object.entries(zones)) {
        if (data) {
          console.log(`    ${name}: y=${data.y} h=${data.height} bottom=${data.bottom} z=${data.zIndex}`);
        } else {
          console.log(`    ${name}: NOT FOUND`);
        }
      }

      // Print issues
      if (allIssues.length > 0) {
        console.log(`\n  🐛 Found ${allIssues.length} issues:`);
        for (const issue of allIssues) {
          const icon = issue.severity === 'HIGH' ? '🔴' : issue.severity === 'MEDIUM' ? '🟡' : '🟢';
          console.log(`    ${icon} [${issue.severity}] ${issue.type}: ${issue.details}`);
        }
      } else {
        console.log('\n  ✅ No issues found');
      }

      // Store in report
      report.viewports[vp.name] = {
        viewport: { width: vp.width, height: vp.height, category: vp.category },
        zones,
        zIndexData: zData,
        issues: allIssues,
        issueCount: allIssues.length,
      };

      // Update summary
      for (const issue of allIssues) {
        report.summary.total++;
        if (issue.severity === 'HIGH') report.summary.high++;
        else if (issue.severity === 'MEDIUM') report.summary.medium++;
        else report.summary.low++;
      }

    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      report.viewports[vp.name] = { error: error.message };
    } finally {
      await context.close();
    }
  }

  // ── Write JSON report ──
  const reportPath = join(SCREENSHOTS_DIR, 'audit-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total issues: ${report.summary.total}`);
  console.log(`  🔴 HIGH:   ${report.summary.high}`);
  console.log(`  🟡 MEDIUM: ${report.summary.medium}`);
  console.log(`  🟢 LOW:    ${report.summary.low}`);
  console.log(`\n📁 Screenshots: ${join(process.cwd(), SCREENSHOTS_DIR)}/`);
  console.log(`📋 Report:      ${join(process.cwd(), reportPath)}`);

  await browser.close();
  return report;
}

runAudit().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
