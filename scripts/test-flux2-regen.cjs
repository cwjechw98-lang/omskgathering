/**
 * Test regeneration of first 10 cards with FLUX.2 Dev
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
const TEST_COUNT = 10;

function parseCardsCovers(content) {
  const cards = [];
  const cardRegex = /### (.+?)\n[\s\S]*?- Промпт: `(.+?)`/g;
  
  let match;
  while ((match = cardRegex.exec(content)) !== null) {
    const cardName = match[1].trim();
    const prompt = match[2];
    
    const cardId = cardName
      .toLowerCase()
      .replace(/[^\w\sа-яё]/g, '')
      .replace(/\s+/g, '_')
      .replace(/ё/g, 'e');
    
    cards.push({ name: cardName, id: cardId, prompt: prompt.trim() });
  }
  
  return cards;
}

function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}` } : {})
      },
      timeout: TIMEOUT_MS
    }, (response) => {
      if ([301, 302, 308].includes(response.statusCode)) {
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
        resolve();
      });
    });
    
    req.on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      fs.unlink(outputPath, () => {});
      reject(new Error('Timeout'));
    });
  });
}

async function main() {
  const content = fs.readFileSync(CARDSCOVERS_PATH, 'utf8');
  const cards = parseCardsCovers(content);
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  console.log(`🎨 Testing FLUX.2 Dev - First ${TEST_COUNT} Cards\n`);
  console.log('===============================================\n');
  
  for (let i = 0; i < TEST_COUNT && i < cards.length; i++) {
    const card = cards[i];
    const outputFile = path.join(OUTPUT_DIR, `${card.id}.jpg`);
    
    const encodedPrompt = encodeURIComponent(card.prompt);
    const url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${MODEL}&width=${IMAGE_WIDTH}&height=${IMAGE_HEIGHT}&nologo=true${API_KEY ? `&key=${API_KEY}` : ''}`;
    
    console.log(`\n[${i + 1}/${TEST_COUNT}] ${card.name}`);
    console.log(`  ID: ${card.id}`);
    
    try {
      const start = Date.now();
      await downloadImage(url, outputFile);
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      
      const stats = fs.statSync(outputFile);
      const sizeKB = (stats.size / 1024).toFixed(1);
      
      console.log(`  ✅ SUCCESS! (${duration}s, ${sizeKB} KB)`);
      
    } catch (error) {
      console.log(`  ❌ FAILED: ${error.message}`);
    }
  }
  
  console.log('\n\n✅ Test complete! Check public/cards/ folder\n');
}

main().catch(console.error);
