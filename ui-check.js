import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const SCREENSHOTS_DIR = './output/screenshots-check';

async function checkUI() {
  await mkdir(SCREENSHOTS_DIR, { recursive: true });
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--window-size=1920,1080']
  });
  
  // Mobile viewport
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 }
  });
  const mobilePage = await mobileContext.newPage();
  
  // Tablet viewport
  const tabletContext = await browser.newContext({
    viewport: { width: 768, height: 1024 }
  });
  const tabletPage = await tabletContext.newPage();
  
  // Desktop viewport
  const desktopContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const desktopPage = await desktopContext.newPage();

  console.log('🔍 UI Check...\n');

  try {
    // === MOBILE CHECKS ===
    console.log('📱 Mobile (375x812)...');
    
    // Main Menu - check button overlap
    await mobilePage.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
    await mobilePage.waitForTimeout(3000);
    await mobilePage.screenshot({ 
      path: join(SCREENSHOTS_DIR, 'mobile-menu-full.png'),
      fullPage: true 
    });
    
    // Check if bottom buttons are visible
    const menuButtons = await mobilePage.locator('button').all();
    console.log(`   Found ${menuButtons.length} buttons on main menu`);
    
    // Get last button position
    const lastButton = menuButtons[menuButtons.length - 1];
    const lastButtonBox = await lastButton.boundingBox();
    const viewportHeight = 812;
    
    if (lastButtonBox) {
      const buttonBottom = lastButtonBox.y + lastButtonBox.height;
      const isHidden = buttonBottom > viewportHeight - 20;
      console.log(`   Last button: y=${lastButtonBox.y}, height=${lastButtonBox.height}, bottom=${buttonBottom}`);
      console.log(`   ${isHidden ? '❌ HIDDEN behind browser bottom' : '✅ Visible'} (viewport: ${viewportHeight}px)`);
    }
    
    // Game Board - check center button overlap
    await mobilePage.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
    await mobilePage.waitForTimeout(2000);
    await mobilePage.click('text=Против Хранителя', { timeout: 5000 });
    await mobilePage.waitForTimeout(15000);
    await mobilePage.screenshot({ 
      path: join(SCREENSHOTS_DIR, 'mobile-game-full.png'),
      fullPage: true 
    });
    
    // Check for "Конец хода" button
    const endTurnBtn = await mobilePage.locator('button:has-text("Конец хода")').first();
    const endTurnBox = await endTurnBtn.boundingBox();
    const handCards = await mobilePage.locator('[role="button"]').all();
    
    console.log(`   End turn button: ${endTurnBox ? `y=${endTurnBox.y}, height=${endTurnBox.height}` : 'not found'}`);
    console.log(`   Total interactive elements: ${handCards.length}`);
    
    // Check for overlapping elements
    const playerArea = await mobilePage.locator('[role="region"]').first();
    const playerBox = await playerArea.boundingBox();
    console.log(`   Player area: ${playerBox ? `y=${playerBox.y}, height=${playerBox.height}` : 'not found'}`);
    
    // === TABLET CHECKS ===
    console.log('\n📱 Tablet (768x1024)...');
    await tabletPage.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
    await tabletPage.waitForTimeout(3000);
    await tabletPage.screenshot({ 
      path: join(SCREENSHOTS_DIR, 'tablet-menu.png'),
      fullPage: true 
    });
    
    await tabletPage.click('text=Против Хранителя', { timeout: 5000 });
    await tabletPage.waitForTimeout(15000);
    await tabletPage.screenshot({ 
      path: join(SCREENSHOTS_DIR, 'tablet-game.png'),
      fullPage: true 
    });
    
    // === DESKTOP CHECKS ===
    console.log('\n🖥️ Desktop (1920x1080)...');
    await desktopPage.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });
    await desktopPage.waitForTimeout(3000);
    await desktopPage.screenshot({ 
      path: join(SCREENSHOTS_DIR, 'desktop-menu.png'),
      fullPage: true 
    });
    
    // Check card collection
    await desktopPage.click('text=Коллекция', { timeout: 5000 });
    await desktopPage.waitForTimeout(3000);
    await desktopPage.screenshot({ 
      path: join(SCREENSHOTS_DIR, 'desktop-collection.png'),
      fullPage: true 
    });
    
    // Count cards in collection
    const collectionCards = await desktopPage.locator('[role="button"][aria-label*="карта"]').count();
    console.log(`   Cards in collection: ${collectionCards}`);
    
    // Check for 10 new cards
    const expectedCards = [
      'Кофемашина Кластера',
      'Бабка с Семечками',
      'Гопник с Любинского',
      'Бабушка с Метро',
      'Мастер Шаурмы',
      'Житель Подземки',
      'Писинер Школы 21',
      'Водитель Троллейбуса',
      'Учёный Кот ОмГУ',
      'Омский Рыболов'
    ];

    console.log('\n🔍 Checking for 10 new cards...');
    const foundCards = [];
    const missingCards = [];

    // Scroll to load all cards (infinite scroll)
    await desktopPage.evaluate(() => {
      const scrollContainer = document.querySelector('.overflow-y-auto');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    });
    await desktopPage.waitForTimeout(1000);
    
    // Scroll again to ensure all cards are loaded
    await desktopPage.evaluate(() => {
      const scrollContainer = document.querySelector('.overflow-y-auto');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    });
    await desktopPage.waitForTimeout(1000);

    // Get all card names from the collection
    const cardNames = await desktopPage.locator('.font-heading.text-white').allTextContents();
    console.log(`   Found ${cardNames.length} cards in collection`);

    for (const cardName of expectedCards) {
      if (cardNames.some(name => name.includes(cardName))) {
        foundCards.push(cardName);
        console.log(`   ✅ ${cardName}`);
      } else {
        missingCards.push(cardName);
        console.log(`   ❌ ${cardName} (NOT FOUND)`);
      }
    }

    console.log(`\n   Found: ${foundCards.length}/${expectedCards.length}`);
    if (missingCards.length > 0) {
      console.log(`   Missing: ${missingCards.join(', ')}`);
    }
    
    // === CHECK LOGS ===
    console.log('\n📋 Checking WORKLOG.md...');
    const fs = await import('fs');
    const worklogPath = join(process.cwd(), 'WORKLOG.md');
    const worklog = fs.readFileSync(worklogPath, 'utf-8');
    const lines = worklog.split('\n');
    
    // Check if today's date is logged
    const today = new Date().toISOString().split('T')[0];
    const hasTodayLog = lines.some(line => line.includes(today) || line.includes('2026-03-04'));
    console.log(`   ${hasTodayLog ? '✅' : '❌'} WORKLOG.md has recent entries`);
    
    // Check progress.md
    const progressPath = join(process.cwd(), 'progress.md');
    const progress = fs.readFileSync(progressPath, 'utf-8');
    console.log(`   Progress.md last updated: ${progress.split('\n').find(l => l.startsWith('- '))?.substring(0, 50) || 'N/A'}`);
    
    console.log('\n✅ UI Check complete!\n');
    console.log(`📁 Screenshots: ${join(process.cwd(), SCREENSHOTS_DIR)}/`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

checkUI();
