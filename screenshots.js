import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const SCREENSHOTS_DIR = './output/screenshots';
const BASE_URL = 'http://localhost:4173';

async function captureScreenshots() {
  await mkdir(SCREENSHOTS_DIR, { recursive: true });
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--window-size=1920,1080']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('📸 Capturing screenshots...\n');

  try {
    // 1. Main Menu
    console.log('1️⃣ Main Menu...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '01-main-menu.png'),
      fullPage: true 
    });
    console.log('   ✓ Saved: 01-main-menu.png');

    // Click "Против Хранителя" button
    await page.click('text=Против Хранителя', { timeout: 5000 });
    await page.waitForTimeout(2000);
    
    // 2. Story Intro
    console.log('2️⃣ Story Intro...');
    await page.waitForTimeout(5000);
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '02-story-intro.png'),
      fullPage: true 
    });
    console.log('   ✓ Saved: 02-story-intro.png');

    // 3. Game Board - wait for story to complete
    console.log('3️⃣ Game Board...');
    await page.waitForTimeout(15000);
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '03-game-board.png'),
      fullPage: true 
    });
    console.log('   ✓ Saved: 03-game-board.png');

    // 4. Card Collection
    console.log('4️⃣ Card Collection...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.click('text=Коллекция', { timeout: 5000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '04-card-collection.png'),
      fullPage: true 
    });
    console.log('   ✓ Saved: 04-card-collection.png');

    // 5. Rules Screen
    console.log('5️⃣ Rules Screen...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.click('text=Правила', { timeout: 5000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '05-rules-screen.png'),
      fullPage: true 
    });
    console.log('   ✓ Saved: 05-rules-screen.png');

    // 6. Lore Screen
    console.log('6️⃣ Lore Screen...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.click('text=Легенда', { timeout: 5000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '06-lore-screen.png'),
      fullPage: true 
    });
    console.log('   ✓ Saved: 06-lore-screen.png');

    // 7. Mobile View - Main Menu
    console.log('7️⃣ Mobile View - Main Menu (375px)...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '07-mobile-menu.png'),
      fullPage: true 
    });
    console.log('   ✓ Saved: 07-mobile-menu.png');

    // 8. Mobile View - Game Board
    console.log('8️⃣ Mobile View - Game Board...');
    await page.click('text=Против Хранителя', { timeout: 5000 });
    await page.waitForTimeout(15000);
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '08-mobile-game.png'),
      fullPage: true 
    });
    console.log('   ✓ Saved: 08-mobile-game.png');

    // 9. Tablet View
    console.log('9️⃣ Tablet View - Game Board (768px)...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.click('text=Против Хранителя', { timeout: 5000 });
    await page.waitForTimeout(15000);
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '09-tablet-game.png'),
      fullPage: true 
    });
    console.log('   ✓ Saved: 09-tablet-game.png');

    // 10. Desktop 1366x768
    console.log('🔟 Desktop 1366x768 - Game Board...');
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.click('text=Против Хранителя', { timeout: 5000 });
    await page.waitForTimeout(15000);
    await page.screenshot({ 
      path: join(SCREENSHOTS_DIR, '10-desktop-1366-game.png'),
      fullPage: true 
    });
    console.log('   ✓ Saved: 10-desktop-1366-game.png');

    console.log('\n✅ All screenshots captured!\n');
    console.log(`📁 Output: ${join(process.cwd(), SCREENSHOTS_DIR)}/`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
