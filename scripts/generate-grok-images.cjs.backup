/**
 * Grok Imagine Image Generator for Omsk Gathering Cards
 * 
 * Generates detailed prompts and downloads images using Pollinations API
 * with grok-imagine model, based on card lore, color, keywords, and flavor text.
 * 
 * Usage: node scripts/generate-grok-images.cjs
 * 
 * Requirements:
 * - POLLINATIONS_API_KEY in .env file
 * - POLLINATIONS_IMAGE_MODEL=grok-imagine in .env
 */

const fs = require('fs');
const fsSync = require('fs');
const path = require('path');
const https = require('https');

// Load .env file
const dotenvPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(dotenvPath)) {
  const envContent = fs.readFileSync(dotenvPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const API_KEY = process.env.POLLINATIONS_API_KEY || '';
const IMAGE_MODEL = process.env.POLLINATIONS_IMAGE_MODEL || 'grok-imagine';
const IMAGE_WIDTH = 1024;  // Square format to match original 960x960 cards
const IMAGE_HEIGHT = 1024; // 1:1 aspect ratio - CSS will scale to 1.35
const TIMEOUT_MS = 90000;

// Read cards data
const cardsContent = fs.readFileSync(path.join(__dirname, '../src/data/cards.ts'), 'utf8');

// Parse cards from TypeScript file
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

// Color themes for prompts
const colorThemes = {
  white: 'holy golden light, divine radiance, celestial atmosphere, pure white and gold accents, sacred runes',
  blue: 'mystic blue energy, arcane magic, ethereal mist, deep ocean blues and silvers, magical glow',
  black: 'dark shadows, necrotic energy, gothic atmosphere, black and purple tones, dark magic',
  red: 'fierce flames, volcanic energy, intense reds and oranges, burning passion, fire effects',
  green: 'nature magic, forest energy, vibrant greens and earth tones, life force, natural power',
  colorless: 'metallic silver, stone texture, colorless crystal, neutral tones, ancient artifacts'
};

// Keyword effects
const keywordEffects = {
  haste: 'lightning bolts surrounding, speed lines, dynamic motion blur, red energy trails',
  defender: 'glowing shield barrier, defensive stance, protective magic circle, stalwart posture',
  flying: 'wings spread wide, soaring in cloudy sky, aerial perspective, wind effects',
  trample: 'ground cracking beneath, destructive force, charging forward, impact waves',
  lifelink: 'golden life energy tendrils, healing light aura, soul connection visible',
  deathtouch: 'poisonous green mist, death energy tendrils, toxic aura, skull motifs',
  vigilance: 'watchful glowing eyes, alert battle stance, golden awareness aura',
  first_strike: 'precision strike energy, focused lightning, sharp weapon glow',
  hexproof: 'magic shield runes, protective shimmering barrier, spell deflection',
  unblockable: 'ghostly transparent form, phasing effect, ethereal mist'
};

// Omsk-specific lore research
const omskLore = {
  bird_omsk: 'legendary omsk bird meme, mystical crow with glowing eyes, symbol of omsk city, magical siberian creature, dark prophetic atmosphere',
  komar_irtish: 'giant mutated mosquito from Irtysh river, industrial pollution mutation, glowing red eyes, swamp creature, oil refinery effects',
  dvornik: 'russian janitor with magical broom, early morning street cleaner, urban maintenance worker, winter city streets, mystical cleaning tool',
  student_omgtu: 'omsk state technical university student, young wizard with textbooks, engineering magic, blue academic robes, studious expression',
  coffee_machine: 'sentient coffee machine golem, computer lab cluster, steam and magic combined, school 21 programming culture, caffeinated automaton',
  babka_semechki: 'russian grandmother selling sunflower seeds, traditional babushka, market vendor, sunflower motifs, wise elder woman',
  gopnik_lubinsky: 'omsk street tough from Lubinsky district, squatting pose, tracksuit, urban subculture, tough street fighter',
  babushka_metro: 'elderly woman from omsk metro system, subway guardian, protective grandmother, underground city transport',
  shaurmaster: 'shawarma master chef, street food vendor, middle eastern cuisine, magical cooking skills, food preparation',
  zhitel_podzemki: 'underground dweller, dark basement creature, subterranean mutant, pale skin from lack of sun',
  pisiner_21: 'school 21 programmer, coding academy student, computer screen glow, typing furiously, software development',
  trolleybus_driver: 'omsk trolleybus driver, public transport operator, winter routes, electric vehicle, city transit',
  rynochny_torgovets: 'marketplace trader, bazaar vendor, goods seller, bustling market atmosphere, commerce',
  khroniker_irtysha: 'chronicler of Irtysh river, historian, ancient scrolls, river knowledge keeper, scribe',
  marshrutchik: 'marshrutka van driver, chaotic public transport, speeding vehicle, russian shared taxi',
  kot_ucheniy: 'wise scholarly cat from Omsk State University, educated feline, books and glasses, academic mascot',
  voron_kreposti: 'raven of omsk fortress, ancient castle guardian, black feathers, watchful bird, medieval architecture',
  omskiy_huligann: 'omsk hooligan, street troublemaker, urban rebel, defiant attitude, city youth culture',
  omskiy_rybolov: 'omsk fisherman, Irtysh river fishing, winter ice fishing, siberian angler, patient hunter',
  kontroler_tramvaya: 'tram ticket inspector, public transport enforcement, uniform, authority figure, city transit system',
  himik_npz: 'chemical plant worker from oil refinery, hazardous materials, protective gear, industrial chemistry',
  irtysh_vodyanoy: 'water spirit of Irtysh river, slavic mythology, aquatic entity, river guardian, wet appearance',
  tenevoy_omich: 'shadow omsk resident, dark alter ego, silhouette figure, mysterious citizen',
  bocal: 'cluster bocal leader, programming community head, authoritative figure, school 21 administrator',
  makefile_golem: 'programming construct made of code, DevOps elemental, build automation monster, technical debt manifestation',
  omskaya_vedma: 'omsk witch, siberian sorceress, magical powers, traditional slavic witchcraft, flying on broom',
  shaman_lukash: 'shaman from Levoberezhye district, spiritual leader, ritual costume, drum and chants, native beliefs',
  arkhivar_omskoi_kreposti: 'archive keeper of omsk fortress, historical records guardian, ancient documents, dusty library',
  sneg_elemental: 'snow elemental from siberian winter, ice creature, frozen form, blizzard powers, white and blue',
  sibirskiy_medved: 'siberian brown bear, massive powerful animal, taiga forest king, fierce protector, russian symbol',
  pirat_irtysha: 'irtysh river pirate, water bandit, boat raider, treasure hunter, nautical criminal',
  teplostantsiya_golem: 'thermal power station elemental, heat and steam creature, industrial energy, electricity generator',
  blackhole: 'cosmic black hole, space phenomenon, event horizon, gravitational pull, dark matter, universe mystery',
  duh_sibiri: 'spirit of siberia, vast wilderness essence, northern lights, taiga forest soul, natural power',
  mer_omska: 'mayor of omsk, city leader, official robes, governmental authority, political figure',
  cluster_lord: 'programming cluster ruler, IT community leader, technological mastery, digital domain',
  drakon_irtysha: 'dragon of Irtysh river, serpentine beast, water and fire, ancient power, mythical creature',
  chinovnik: 'russian bureaucrat, government official, paperwork master, stamp collector, administrative worker',
  rosgvardiya: 'russian national guard, law enforcement, tactical gear, security forces, official uniform'
};

// Generate detailed Grok Imagine prompt
function generateGrokPrompt(card) {
  let prompt = `Magic the Gathering style card art, `;
  
  // Add card name and specific lore
  const lore = omskLore[card.id] || '';
  if (lore) {
    prompt += `${lore}, `;
  }
  
  // Add card type
  if (card.type === 'creature') {
    prompt += `fantasy creature portrait, detailed character design, `;
  } else if (card.type === 'spell') {
    prompt += `magical spell effect, energy burst, arcane symbols, `;
  } else if (card.type === 'enchantment') {
    prompt += `mystical aura, ongoing magic effect, enchantment runes, `;
  }
  
  // Add color theme
  prompt += `${colorThemes[card.color] || 'neutral tones'}, `;
  
  // Add keyword effects
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
  const flavorLower = card.flavor.toLowerCase();
  if (flavorLower.includes('ночь') || flavorLower.includes('тёмн')) {
    prompt += 'dark night atmosphere, mysterious shadows, ';
  }
  if (flavorLower.includes('свет') || flavorLower.includes('сия')) {
    prompt += 'glowing light effects, radiance, ';
  }
  if (flavorLower.includes('маг') || flavorLower.includes('чар')) {
    prompt += 'magical energy, spell effects, ';
  }
  if (flavorLower.includes('реальн') || flavorLower.includes('омск')) {
    prompt += 'real-world omsk city elements, siberian urban landscape, ';
  }
  
  // Style modifiers for Grok Imagine
  prompt += 'highly detailed digital painting, fantasy card game art, dramatic cinematic lighting, sharp focus, 4k quality, professional illustration, artstation trending';
  
  return prompt;
}

// Build Pollinations URL
function buildPollinationsUrl(prompt) {
  const encodedPrompt = encodeURIComponent(prompt);
  const params = new URLSearchParams({
    model: IMAGE_MODEL,
    width: String(IMAGE_WIDTH),
    height: String(IMAGE_HEIGHT),
    nologo: 'true'
  });
  
  if (API_KEY) {
    params.set('key', API_KEY);
  }
  
  return `https://gen.pollinations.ai/image/${encodedPrompt}?${params.toString()}`;
}

// Download image from URL
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    let completed = false;
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: TIMEOUT_MS
    }, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }, (redirectRes) => {
          redirectRes.pipe(file);
        }).on('error', reject);
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
        reject(new Error('Request timeout'));
      }
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
  
  console.log(`🎨 Grok Imagine Image Generator`);
  console.log(`==============================`);
  console.log(`Model: ${IMAGE_MODEL}`);
  console.log(`API Key: ${API_KEY ? '✓' : '✗ (using free tier)'}`);
  console.log(`Cards to generate: ${cards.length}\n`);
  
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const outputFile = path.join(outputDir, `${card.id}.jpg`);
    
    // Skip if already generated
    if (fsSync.existsSync(outputFile)) {
      const stats = fsSync.statSync(outputFile);
      if (stats.size > 10000) { // Skip if file is substantial (>10KB)
        console.log(`[${i + 1}/${cards.length}] ${card.name} (${card.id}) - ✅ Already generated, skipping\n`);
        continue;
      }
    }
    
    const prompt = generateGrokPrompt(card);
    const imageUrl = buildPollinationsUrl(prompt);
    
    console.log(`[${i + 1}/${cards.length}] ${card.name} (${card.id})`);
    console.log(`  Color: ${card.color}, Keywords: ${card.keywords.join(', ') || 'none'}`);
    console.log(`  Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`  Output: ${outputFile}`);
    
    try {
      await downloadImage(imageUrl, outputFile);
      console.log(`  ✅ Downloaded successfully!\n`);
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }
  
  console.log('\n✅ Generation complete!');
  console.log(`Images saved to: ${outputDir}`);
}

// Run if called directly
if (require.main === module) {
  generateAllImages().catch(console.error);
}

module.exports = { parseCards, generateGrokPrompt, buildPollinationsUrl };
