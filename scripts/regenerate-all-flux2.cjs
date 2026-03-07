/**
 * Regenerate ALL card images using FLUX.2 Dev model
 * Reads prompts from CARDSCOVERS.md and generates images
 * 
 * Usage: node scripts/regenerate-all-flux2.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.POLLINATIONS_API_KEY || '';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'cards');
const CARDSCOVERS_PATH = path.join(__dirname, '..', 'CARDSCOVERS.md');

const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1024;
const TIMEOUT_MS = 120000;
const MODEL = 'flux-2-dev';

// Parse prompts from CARDSCOVERS.md
function parseCardsCovers(content) {
  const cards = [];
  const cardRegex = /### (.+?)\n[\s\S]*?- Промпт: `(.+?)`/g;
  
  let match;
  while ((match = cardRegex.exec(content)) !== null) {
    const cardName = match[1].trim();
    const prompt = match[2];
    
    // Extract card ID from name (convert to snake_case)
    const cardId = cardName
      .toLowerCase()
      .replace(/[^\w\sа-яё]/g, '')
      .replace(/\s+/g, '_')
      .replace(/ё/g, 'e');
    
    cards.push({
      name: cardName,
      id: cardId,
      prompt: prompt.trim()
    });
  }
  
  return cards;
}

// Download image from URL
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    let completed = false;
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}` } : {})
      },
      timeout: TIMEOUT_MS
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 308) {
        https.get(response.headers.location, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }, (redirectRes) => {
          redirectRes.pipe(file);
        }).on('error', reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        completed = true;
        resolve();
      });
    });
    
    req.on('error', (err) => {
      if (!completed) {
        fs.unlink(outputPath, () => {});
        reject(err);
      }
    });
    
    req.on('timeout', () => {
      req.destroy();
      if (!completed) {
        fs.unlink(outputPath, () => {});
        reject(new Error('Timeout'));
      }
    });
  });
}

// Main regeneration function
async function regenerateAll() {
  // Read CARDSCOVERS.md
  if (!fs.existsSync(CARDSCOVERS_PATH)) {
    console.error('❌ CARDSCOVERS.md not found!');
    return;
  }
  
  const content = fs.readFileSync(CARDSCOVERS_PATH, 'utf8');
  const cards = parseCardsCovers(content);
  
  // Ensure output dir exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  console.log('🎨 Regenerating All Cards with FLUX.2 Dev\n');
  console.log('=========================================\n');
  console.log(`Model: ${MODEL}`);
  console.log(`Cards to generate: ${cards.length}`);
  console.log(`Image Size: ${IMAGE_WIDTH}x${IMAGE_HEIGHT}`);
  console.log(`API Key: ${API_KEY ? '✓' : '✗'}`);
  console.log('');
  
  const results = {
    success: 0,
    failed: 0,
    skipped: 0
  };
  
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const outputFile = path.join(OUTPUT_DIR, `${card.id}.jpg`);
    
    // Check if already exists and is substantial
    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      if (stats.size > 50000) { // Skip if > 50KB
        console.log(`[${i + 1}/${cards.length}] ${card.name} - ⏭️ Already exists, skipping`);
        results.skipped++;
        continue;
      }
    }
    
    // Build URL
    const encodedPrompt = encodeURIComponent(card.prompt);
    const url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${MODEL}&width=${IMAGE_WIDTH}&height=${IMAGE_HEIGHT}&nologo=true${API_KEY ? `&key=${API_KEY}` : ''}`;
    
    console.log(`\n[${i + 1}/${cards.length}] ${card.name} (${card.id})`);
    
    try {
      const start = Date.now();
      await downloadImage(url, outputFile);
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      
      const stats = fs.statSync(outputFile);
      const sizeKB = (stats.size / 1024).toFixed(1);
      
      console.log(`  ✅ SUCCESS! (${duration}s, ${sizeKB} KB)`);
      results.success++;
      
    } catch (error) {
      console.log(`  ❌ FAILED: ${error.message}`);
      results.failed++;
    }
    
    // Small delay to avoid rate limiting
    if ((i + 1) % 10 === 0) {
      console.log('  ⏸️ Pausing for 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log('\n\n=========================================');
  console.log('📊 REGENERATION COMPLETE\n');
  
  console.log(`Total cards: ${cards.length}`);
  console.log(`✅ Success: ${results.success}`);
  console.log(`⏭️ Skipped: ${results.skipped}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  console.log(`\nImages saved to: ${OUTPUT_DIR}`);
  console.log(`\nModel used: ${MODEL}`);
}

// Run if called directly
if (require.main === module) {
  regenerateAll().catch(console.error);
}

module.exports = { regenerateAll, parseCardsCovers };
