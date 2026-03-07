/**
 * Grok Imagine Image Generator for Omsk Gathering Cards
 * 
 * This script generates detailed prompts and downloads images using Grok Imagine API
 * based on card lore, color, keywords, and flavor text.
 * 
 * Usage: node scripts/generate-grok-images.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Read cards data
const cardsContent = fs.readFileSync(path.join(__dirname, '../src/data/cards.ts'), 'utf8');

// Extract card data (simplified parsing)
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

// Generate detailed Grok Imagine prompt based on card properties
function generateGrokPrompt(card) {
  const colorThemes = {
    white: 'holy golden light, divine radiance, celestial atmosphere, pure white and gold accents',
    blue: 'mystic blue energy, arcane magic, ethereal mist, deep ocean blues and silvers',
    black: 'dark shadows, necrotic energy, gothic atmosphere, black and purple tones',
    red: 'fierce flames, volcanic energy, intense reds and oranges, burning passion',
    green: 'nature magic, forest energy, vibrant greens and earth tones, life force',
    colorless: 'metallic silver, stone texture, colorless crystal, neutral tones'
  };

  const keywordEffects = {
    haste: 'lightning bolts, speed lines, dynamic motion blur',
    defender: 'shield glow, defensive stance, protective barrier',
    flying: 'wings spread, soaring in sky, clouds below',
    trample: 'ground shaking, destructive force, charging forward',
    lifelink: 'life energy tendrils, healing light, soul connection',
    deathtouch: 'poisonous green mist, death energy, toxic aura',
    vigilance: 'watchful eyes, alert posture, glowing awareness',
    first_strike: 'precision strike, focused energy, sharp edges',
    hexproof: 'magic shield, protective runes, shimmering barrier',
    unblockable: 'ghostly transparency, phasing effect, ethereal'
  };

  const typeDescriptions = {
    creature: 'fantasy creature card, character portrait, detailed anatomy',
    spell: 'magical spell effect, energy burst, arcane symbols',
    enchantment: 'mystical aura, ongoing magic effect, enchantment runes',
    land: 'landscape view, terrain feature, natural environment'
  };

  // Build detailed prompt
  let prompt = `Magic the Gathering style card art, ${card.name}, `;
  
  // Add card type
  prompt += `${typeDescriptions[card.type] || 'fantasy card'}, `;
  
  // Add color theme
  prompt += `${colorThemes[card.color] || 'neutral tones'}, `;
  
  // Add keywords effects
  if (card.keywords.length > 0) {
    const effects = card.keywords.map(k => keywordEffects[k]).filter(e => e);
    if (effects.length > 0) {
      prompt += `${effects.join(', ')}, `;
    }
  }
  
  // Add stats if creature
  if (card.type === 'creature' && card.attack && card.health) {
    prompt += `power ${card.attack} toughness ${card.health}, `;
  }
  
  // Add flavor-inspired elements
  if (card.flavor && card.flavor.length > 20) {
    const flavorKeywords = extractFlavorKeywords(card.flavor);
    if (flavorKeywords.length > 0) {
      prompt += `${flavorKeywords.join(', ')}, `;
    }
  }
  
  // Add Omsk-specific elements
  if (card.name.toLowerCase().includes('омск') || card.name.toLowerCase().includes('ом')) {
    prompt += 'Omsk city elements, Siberian atmosphere, russian urban fantasy, ';
  }
  
  // Style modifiers
  prompt += 'highly detailed digital painting, fantasy card game art, dramatic lighting, sharp focus, 4k quality, professional illustration';
  
  return prompt;
}

// Extract visual keywords from flavor text
function extractFlavorKeywords(flavor) {
  const keywords = [];
  const flavorLower = flavor.toLowerCase();
  
  if (flavorLower.includes('ночь') || flavorLower.includes('тёмн')) keywords.push('dark night');
  if (flavorLower.includes('свет') || flavorLower.includes('сия')) keywords.push('glowing light');
  if (flavorLower.includes('огонь') || flavorLower.includes('плам')) keywords.push('fire flames');
  if (flavorLower.includes('вод') || flavorLower.includes('рек') || flavorLower.includes('омск')) keywords.push('river water');
  if (flavorLower.includes('лес') || flavorLower.includes('природ')) keywords.push('forest nature');
  if (flavorLower.includes('маг') || flavorLower.includes('чар')) keywords.push('magic spells');
  if (flavorLower.includes('студент') || flavorLower.includes('универ')) keywords.push('university student');
  if (flavorLower.includes('город') || flavorLower.includes('улиц')) keywords.push('urban city street');
  
  return keywords;
}

// Download image from URL
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// Main generation function
async function generateAllImages() {
  const cards = parseCards(cardsContent);
  const outputDir = path.join(__dirname, '../public/cards');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log(`Found ${cards.length} cards to generate\n`);
  
  // Note: Grok Imagine API endpoint would go here
  // For now, this is a template showing the structure
  
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const prompt = generateGrokPrompt(card);
    const outputFile = path.join(outputDir, `${card.id}.jpg`);
    
    console.log(`[${i + 1}/${cards.length}] ${card.name} (${card.id})`);
    console.log(`  Color: ${card.color}, Keywords: ${card.keywords.join(', ') || 'none'}`);
    console.log(`  Prompt: ${prompt.substring(0, 150)}...`);
    console.log(`  Output: ${outputFile}`);
    console.log('');
    
    // Here you would call the Grok Imagine API
    // Example (pseudo-code):
    // const imageUrl = await callGrokImagineAPI(prompt);
    // await downloadImage(imageUrl, outputFile);
  }
  
  console.log('\n✅ Prompt generation complete!');
  console.log('\nTo actually generate images, you need to:');
  console.log('1. Get Grok API access');
  console.log('2. Implement callGrokImagineAPI() function');
  console.log('3. Run the script with valid API credentials');
}

// Run if called directly
if (require.main === module) {
  generateAllImages().catch(console.error);
}

module.exports = { parseCards, generateGrokPrompt, extractFlavorKeywords };
