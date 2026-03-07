/**
 * Force regenerate ALL cards using FLUX.2 Dev model
 * Overwrites existing images
 * 
 * Usage: node scripts/force-regenerate-flux2.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env
const dotenvPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(dotenvPath)) {
  const envContent = fs.readFileSync(dotenvPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
  });
}

const API_KEY = process.env.POLLINATIONS_API_KEY || '';
const MODEL = 'flux-2-dev'; // Force FLUX.2 Dev
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'cards');
const CARDS_PATH = path.join(__dirname, '..', 'src', 'data', 'cards.ts');

const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1024;
const TIMEOUT_MS = 120000;

// Parse cards from TypeScript
function parseCards(content) {
  const cards = [];
  const cardRegex = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*cost:\s*(\d+),\s*color:\s*'([^']+)',\s*type:\s*'([^']+)',\s*(?:attack:\s*(\d+),\s*health:\s*(\d+),\s*)?description:\s*'([^']+)',\s*flavor:\s*'([^']+)',\s*emoji:\s*'([^']+)',\s*keywords:\s*\[([^\]]*)\]/g;
  
  let match;
  while ((match = cardRegex.exec(content)) !== null) {
    cards.push({
      id: match[1],
      name: match[2],
      cost: match[3],
      color: match[4],
      type: match[5],
      attack: match[6],
      health: match[7],
      description: match[8],
      flavor: match[9].replace(/\\'/g, "'"),
      emoji: match[10],
      keywords: match[11].split(',').map(k => k.trim().replace(/'/g, '')).filter(k => k)
    });
  }
  return cards;
}

// Generate prompt from card data
function generatePrompt(card) {
  const colorThemes = {
    white: 'holy golden light, divine radiance, celestial atmosphere, pure white and gold accents, sacred runes',
    blue: 'mystic blue energy, arcane magic, ethereal mist, deep ocean blues and silvers, magical glow',
    black: 'dark shadows, necrotic energy, gothic atmosphere, black and purple tones, dark magic',
    red: 'fierce flames, volcanic energy, intense reds and oranges, burning passion, fire effects',
    green: 'nature magic, forest energy, vibrant greens and earth tones, life force, natural power',
    colorless: 'metallic silver, stone texture, colorless crystal, neutral tones, ancient artifacts'
  };

  const keywordEffects = {
    haste: 'lightning bolts, speed lines, dynamic motion',
    defender: 'glowing shield, defensive stance, protective barrier',
    flying: 'wings spread, soaring in sky, clouds below',
    trample: 'ground cracking, destructive force, charging',
    lifelink: 'golden life energy, healing light',
    deathtouch: 'poisonous green mist, death energy',
    vigilance: 'watchful eyes, alert stance, golden aura',
    first_strike: 'precision strike, focused lightning',
    hexproof: 'magic shield runes, protective barrier',
    unblockable: 'ghostly transparent, phasing effect'
  };

  let prompt = `Magic The Gathering style card art, ${card.name}, fantasy creature portrait, detailed character design, ${colorThemes[card.color]}, `;
  
  if (card.keywords.length > 0) {
    const effects = card.keywords.map(k => keywordEffects[k]).filter(e => e);
    if (effects.length > 0) prompt += `${effects.join(', ')}, `;
  }
  
  if (card.type === 'creature' && card.attack && card.health) {
    prompt += `power ${card.attack} toughness ${card.health}, `;
  }
  
  prompt += 'highly detailed digital painting, fantasy card game art, dramatic cinematic lighting, sharp focus, 4k quality, professional illustration, artstation trending, square 1024x1024, no text, no card frame';
  
  return prompt;
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
  const cardsContent = fs.readFileSync(CARDS_PATH, 'utf8');
  const cards = parseCards(cardsContent);
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  console.log(`🔄 FORCE Regenerate ALL Cards with FLUX.2 Dev\n`);
  console.log('============================================\n');
  console.log(`Model: ${MODEL}`);
  console.log(`Cards: ${cards.length}`);
  console.log(`Size: ${IMAGE_WIDTH}x${IMAGE_HEIGHT}`);
  console.log(`API Key: ${API_KEY ? '✓' : '✗'}`);
  console.log('');
  
  let success = 0, failed = 0;
  
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const outputFile = path.join(OUTPUT_DIR, `${card.id}.jpg`);
    const prompt = generatePrompt(card);
    
    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${MODEL}&width=${IMAGE_WIDTH}&height=${IMAGE_HEIGHT}&nologo=true${API_KEY ? `&key=${API_KEY}` : ''}`;
    
    console.log(`[${i + 1}/${cards.length}] ${card.name} (${card.id})`);
    
    try {
      const start = Date.now();
      await downloadImage(url, outputFile);
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      
      const stats = fs.statSync(outputFile);
      const sizeKB = (stats.size / 1024).toFixed(1);
      
      console.log(`  ✅ ${duration}s, ${sizeKB} KB\n`);
      success++;
      
    } catch (error) {
      console.log(`  ❌ ${error.message}\n`);
      failed++;
    }
    
    if ((i + 1) % 5 === 0) {
      console.log(`  ⏸️ Pausing... (${success}/${failed})\n`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  console.log('\n============================================');
  console.log(`✅ COMPLETE! Success: ${success}/${cards.length}, Failed: ${failed}`);
  console.log(`Images saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
