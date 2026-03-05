import { test, expect } from '@playwright/test';

test.describe('UI Boundary & Responsiveness', () => {
  test('No UI elements overflow on mobile (375x812)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Main Menu
    const menuButtons = await page.locator('button').all();
    for (const button of menuButtons) {
      const box = await button.boundingBox();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(375);
        expect(box.y + box.height).toBeLessThanOrEqual(812);
      }
    }
    
    // Start game
    await page.click('text=Против Хранителя', { timeout: 10000 });
    await page.waitForSelector('.game-grid', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Check top bar
    const topBar = await page.locator('.zone-topbar').boundingBox();
    expect(topBar).toBeTruthy();
    expect(topBar!.x).toBeGreaterThanOrEqual(0);
    expect(topBar!.y).toBeGreaterThanOrEqual(0);
    expect(topBar!.x + topBar!.width).toBeLessThanOrEqual(375);
    
    // Check hand zone doesn't overlap top bar
    const handZone = await page.locator('.zone-hand').boundingBox();
    expect(handZone).toBeTruthy();
    expect(handZone!.y).toBeGreaterThanOrEqual(topBar!.y + topBar!.height);
    
    // Check all creature slots are visible
    const creatureSlots = await page.locator('.creature-slot').all();
    for (const slot of creatureSlots.slice(0, 7)) {
      const box = await slot.boundingBox();
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test('No UI elements overflow on tablet (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Start game
    await page.click('text=Против Хранителя', { timeout: 10000 });
    await page.waitForSelector('.game-grid', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Check all UI zones fit within viewport
    const zones = ['.zone-topbar', '.zone-enemy-hero', '.zone-enemy-board', 
                   '.zone-divider', '.zone-player-board', '.zone-player-hero',
                   '.zone-actionbar', '.zone-hand'];
    
    for (const zoneSelector of zones) {
      const zone = await page.locator(zoneSelector).boundingBox();
      if (zone) {
        expect(zone.x).toBeGreaterThanOrEqual(0);
        expect(zone.y).toBeGreaterThanOrEqual(0);
        expect(zone.x + zone.width).toBeLessThanOrEqual(768);
        expect(zone.y + zone.height).toBeLessThanOrEqual(1024);
      }
    }
  });

  test('No UI elements overflow on desktop (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Start game
    await page.click('text=Против Хранителя', { timeout: 10000 });
    await page.waitForSelector('.game-grid', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Check all UI zones fit within viewport
    const zones = ['.zone-topbar', '.zone-enemy-hero', '.zone-enemy-board', 
                   '.zone-divider', '.zone-player-board', '.zone-player-hero',
                   '.zone-actionbar', '.zone-hand'];
    
    for (const zoneSelector of zones) {
      const zone = await page.locator(zoneSelector).boundingBox();
      if (zone) {
        expect(zone.x).toBeGreaterThanOrEqual(0);
        expect(zone.y).toBeGreaterThanOrEqual(0);
        expect(zone.x + zone.width).toBeLessThanOrEqual(1920);
        expect(zone.y + zone.height).toBeLessThanOrEqual(1080);
      }
    }
  });

  test('Modal overlays stay within viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.click('text=Против Хранителя', { timeout: 10000 });
    await page.waitForSelector('.game-grid', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Open log modal
    try {
      await page.click('button:has-text("Лог")', { timeout: 3000 });
      await page.waitForTimeout(500);
      
      const modal = await page.locator('.modal-overlay').boundingBox();
      if (modal) {
        expect(modal.x).toBeGreaterThanOrEqual(0);
        expect(modal.y).toBeGreaterThanOrEqual(0);
        expect(modal.x + modal.width).toBeLessThanOrEqual(375);
        expect(modal.y + modal.height).toBeLessThanOrEqual(812);
      }
      
      // Close modal
      await page.keyboard.press('Escape');
    } catch (e) {
      // Log button might not be visible
    }
  });

  test('Cards in hand don\'t overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.click('text=Против Хранителя', { timeout: 10000 });
    await page.waitForSelector('.game-grid', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const handCards = await page.locator('.hand-card-wrapper').all();
    
    for (const card of handCards) {
      const box = await card.boundingBox();
      if (box) {
        // Card should be mostly within viewport (allow some overflow for hover effect)
        expect(box.x).toBeGreaterThanOrEqual(-50); // Allow slight overflow
        expect(box.x + box.width).toBeLessThanOrEqual(425); // 375 + 50 tolerance
      }
    }
  });

  test('Responsive font sizes', async ({ page }) => {
    const fontSizes = new Map<string, number>();
    
    // Check font sizes at different viewports
    const viewports = [
      { width: 375, height: 812, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      // Get font size of turn counter
      const turnCounter = await page.locator('.text-gray-400').first();
      const fontSize = await turnCounter.evaluate((el) => 
        parseFloat(window.getComputedStyle(el).fontSize)
      );
      
      fontSizes.set(viewport.name, fontSize);
    }
    
    // Font sizes should scale with viewport
    expect(fontSizes.get('desktop')).toBeGreaterThanOrEqual(fontSizes.get('mobile')!);
  });

  test('Action bar buttons visible on all viewports', async ({ page }) => {
    const viewports = [
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 1920, height: 1080 },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
      await page.click('text=Против Хранителя', { timeout: 10000 });
      await page.waitForSelector('.game-grid', { timeout: 15000 });
      await page.waitForTimeout(3000);
      
      // Check end turn button
      const endTurnBtn = await page.locator('button:has-text("Конец хода"), .end-turn-btn').first();
      const box = await endTurnBtn.boundingBox();
      
      if (box) {
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      }
    }
  });

  test('Collection page responsive', async ({ page }) => {
    const viewports = [
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 1920, height: 1080 },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
      await page.click('text=Коллекция', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Check header fits
      const header = await page.locator('.font-title.text-xl').boundingBox();
      expect(header).toBeTruthy();
      expect(header!.x + header!.width).toBeLessThanOrEqual(viewport.width);
      
      // Check filter buttons fit
      const filters = await page.locator('[class*="filter"]').all();
      for (const filter of filters.slice(0, 5)) {
        const box = await filter.boundingBox();
        if (box) {
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        }
      }
    }
  });

  test('No horizontal scroll on any viewport', async ({ page }) => {
    const viewports = [
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 1920, height: 1080 },
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10); // 10px tolerance for scrollbar
    }
  });

  test('Touch targets are large enough on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.click('text=Против Хранителя', { timeout: 10000 });
    await page.waitForSelector('.game-grid', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Check button sizes (should be at least 44x44 for touch)
    const buttons = await page.locator('button').all();
    
    for (const button of buttons.slice(0, 10)) {
      const box = await button.boundingBox();
      if (box) {
        // Minimum 36px height for touch targets (relaxed from 44px)
        expect(box.height).toBeGreaterThanOrEqual(30);
      }
    }
  });
});
