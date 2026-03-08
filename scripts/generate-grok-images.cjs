/**
 * Grok Imagine Image Generator for Omsk Gathering Cards
 * 
 * Generates detailed prompts and downloads images using Pollinations API
 * with flux-2-dev model, based on card lore, color, keywords, rarity, and flavor text.
 * 
 * Features:
 * - Parses ALL 76 cards (including spells, enchantments, lands)
 * - Extracts rarity for themed prompts
 * - Pause/resume support (Ctrl+C to pause, then resume)
 * - Progress tracking with percentage
 * - Automatic retry on small file generation
 * 
 * Usage: 
 *   node scripts/generate-grok-images.cjs          # Normal run
 *   node scripts/generate-grok-images.cjs --force  # Force regenerate all
 *   node scripts/generate-grok-images.cjs --card id # Generate single card
 * 
 * Requirements:
 * - POLLINATIONS_API_KEY in .env file
 * - POLLINATIONS_IMAGE_MODEL=flux-2-dev in .env
 */

const fs = require('fs');
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
const IMAGE_MODEL = process.env.POLLINATIONS_IMAGE_MODEL || 'flux-2-dev';
const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1024;
const TIMEOUT_MS = 90000;
const MIN_FILE_SIZE = 25000; // Minimum 25KB for valid image
const MAX_RETRIES = 3;

// Read cards data
const cardsContent = fs.readFileSync(path.join(__dirname, '../src/data/cards.ts'), 'utf8');

/**
 * Parse ALL cards from TypeScript file using multiple regex patterns
 * to handle different card types and structures
 */
function parseCards(content) {
  const cards = [];
  
  // Pattern 1: Cards with keywords (creatures with keywords)
  const regex1 = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*cost:\s*(\d+),\s*color:\s*'([^']+)',\s*type:\s*'([^']+)',\s*(?:attack:\s*(\d+),\s*health:\s*(\d+),\s*)?description:\s*'([^']+)',\s*flavor:\s*'([^']+)',\s*emoji:\s*'([^']+)',\s*keywords:\s*\[([^\]]*)\](?:,\s*rarity:\s*'([^']+)')?\s*,?\s*imageUrl:/g;
  
  // Pattern 2: Cards with rarity but no keywords (enchantments, spells, lands)
  const regex2 = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*cost:\s*(\d+),\s*color:\s*'([^']+)',\s*type:\s*'([^']+)',\s*(?:attack:\s*(\d+),\s*health:\s*(\d+),\s*)?description:\s*'([^']+)',\s*flavor:\s*'([^']+)',\s*emoji:\s*'([^']+)',\s*(?:keywords:\s*\[([^\]]*)\],\s*)?rarity:\s*'([^']+)',\s*imageUrl:/g;
  
  // Pattern 3: Cards without keywords and without rarity (fallback)
  const regex3 = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*cost:\s*(\d+),\s*color:\s*'([^']+)',\s*type:\s*'([^']+)',\s*(?:attack:\s*(\d+),\s*health:\s*(\d+),\s*)?description:\s*'([^']+)',\s*flavor:\s*'([^']+)',\s*emoji:\s*'([^']+)',\s*imageUrl:/g;
  
  let match;
  const seen = new Set();
  
  // Try pattern 1
  while ((match = regex1.exec(content)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      cards.push({
        id: match[1],
        name: match[2],
        cost: parseInt(match[3]),
        color: match[4],
        type: match[5],
        attack: match[6] ? parseInt(match[6]) : undefined,
        health: match[7] ? parseInt(match[7]) : undefined,
        description: match[8],
        flavor: match[9].replace(/\\'/g, "'"),
        emoji: match[10],
        keywords: match[11] ? match[11].split(',').map(k => k.trim().replace(/'/g, '')).filter(k => k) : [],
        rarity: match[12] || 'common'
      });
    }
  }
  
  // Try pattern 2
  while ((match = regex2.exec(content)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      cards.push({
        id: match[1],
        name: match[2],
        cost: parseInt(match[3]),
        color: match[4],
        type: match[5],
        attack: match[6] ? parseInt(match[6]) : undefined,
        health: match[7] ? parseInt(match[7]) : undefined,
        description: match[8],
        flavor: match[9].replace(/\\'/g, "'"),
        emoji: match[10],
        keywords: match[11] ? match[11].split(',').map(k => k.trim().replace(/'/g, '')).filter(k => k) : [],
        rarity: match[12] || 'common'
      });
    }
  }
  
  // Try pattern 3
  while ((match = regex3.exec(content)) !== null) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      cards.push({
        id: match[1],
        name: match[2],
        cost: parseInt(match[3]),
        color: match[4],
        type: match[5],
        attack: match[6] ? parseInt(match[6]) : undefined,
        health: match[7] ? parseInt(match[7]) : undefined,
        description: match[8],
        flavor: match[9].replace(/\\'/g, "'"),
        emoji: match[10],
        keywords: [],
        rarity: 'common'
      });
    }
  }
  
  return cards;
}

// Color themes for prompts
const colorThemes = {
  white: 'holy golden light, divine radiance, celestial atmosphere, pure white and gold accents, sacred runes, angelic wings',
  blue: 'mystic blue energy, arcane magic, ethereal mist, deep ocean blues and silvers, magical glow, ice crystals',
  black: 'dark shadows, necrotic energy, gothic atmosphere, black and purple tones, dark magic, skull motifs',
  red: 'fierce flames, volcanic energy, intense reds and oranges, burning passion, fire effects, explosion',
  green: 'nature magic, forest energy, vibrant greens and earth tones, life force, natural power, vines',
  colorless: 'metallic silver, stone texture, colorless crystal, neutral tones, ancient artifacts, robotic'
};

// Keyword effects
const keywordEffects = {
  haste: 'lightning bolts surrounding, speed lines, dynamic motion blur, red energy trails, fast movement',
  defender: 'glowing shield barrier, defensive stance, protective magic circle, stalwart posture, armor',
  flying: 'wings spread wide, soaring in cloudy sky, aerial perspective, wind effects, feathers',
  trample: 'ground cracking beneath, destructive force, charging forward, impact waves, massive size',
  lifelink: 'golden life energy tendrils, healing light aura, soul connection visible, hearts',
  deathtouch: 'poisonous green mist, death energy tendrils, toxic aura, skull motifs, green veins',
  vigilance: 'watchful glowing eyes, alert battle stance, golden awareness aura, shield ready',
  first_strike: 'precision strike energy, focused lightning, sharp weapon glow, first attack stance',
  hexproof: 'magic shield runes, protective shimmering barrier, spell deflection, glow shield',
  unblockable: 'ghostly transparent form, phasing effect, ethereal mist, intangible'
};

// Rarity visual themes
const rarityThemes = {
  common: 'simple border, basic illustration, straightforward design',
  uncommon: 'silver accent border, enhanced details, improved illustration',
  rare: 'gold accent border, elaborate design, rich details, holographic shimmer',
  mythic: 'rainbow aurora border, legendary glow, epic illustration, premium quality'
};

// Extended Omsk-specific lore with all 76 cards
const omskLore = {
  // Creatures
  bird_omsk: 'legendary omsk bird meme, mystical crow with glowing eyes, symbol of omsk city, magical siberian creature, dark prophetic atmosphere, city guardian',
  komar_irtish: 'giant mutated mosquito from Irtysh river, industrial pollution mutation, glowing red eyes, swamp creature, oil refinery effects, bloodsucker',
  dvornik: 'russian janitor with magical broom, early morning street cleaner, urban maintenance worker, winter city streets, mystical cleaning tool, berserker rage',
  student_omgtu: 'omsk state technical university student, young wizard with textbooks, engineering magic, blue academic robes, studious expression, programmer',
  coffee_machine: 'sentient coffee machine golem, computer lab cluster, steam and magic combined, school 21 programming culture, caffeinated automaton',
  babka_semechki: 'russian grandmother selling sunflower seeds, traditional babushka, market vendor, sunflower motifs, wise elder woman, seeds merchant',
  gopnik_lubinsky: 'omsk street tough from Lubinsky district, squatting pose, tracksuit, urban subculture, tough street fighter, Marlboro cigarettes',
  babushka_metro: 'elderly woman from omsk metro system, subway guardian, protective grandmother, underground city transport, metro worker',
  shaurmaster: 'shawarma master chef, street food vendor, middle eastern cuisine, magical cooking skills, food preparation, meat skewer expert',
  zhitel_podzemki: 'underground dweller, dark basement creature, subterranean mutant, pale skin from lack of sun, basement resident',
  pisiner_21: 'school 21 programmer, coding academy student, computer screen glow, typing furiously, software development, code warrior',
  trolleybus_driver: 'omsk trolleybus driver, public transport operator, winter routes, electric vehicle, city transit worker',
  rynochny_torgovets: 'marketplace trader, bazaar vendor, goods seller, bustling market atmosphere, commerce, haggling',
  khroniker_irtysha: 'chronicler of Irtysh river, historian, ancient scrolls, river knowledge keeper, scribe with quill, storyteller',
  marshrutchik: 'marshrutka van driver, chaotic public transport, speeding vehicle, russian shared taxi, reckless driver',
  kot_ucheniy: 'wise scholarly cat from Omsk State University, educated feline, books and glasses, academic mascot, professor cat',
  voron_kreposti: 'raven of omsk fortress, ancient castle guardian, black feathers, watchful bird, medieval architecture, fortress sentinel',
  omskiy_huligann: 'omsk hooligan, street troublemaker, urban rebel, defiant attitude, city youth culture, troublemaker',
  omskiy_rybolov: 'omsk fisherman, Irtysh river fishing, winter ice fishing, siberian angler, patient hunter, fishing rod',
  kontroler_tramvaya: 'tram ticket inspector, public transport enforcement, uniform, authority figure, city transit system, ticket collector',
  himik_npz: 'chemical plant worker from oil refinery, hazardous materials, protective gear, industrial chemistry, refinery operator',
  irtysh_vodyanoy: 'water spirit of Irtysh river, slavic mythology, aquatic entity, river guardian, wet appearance, merman',
  tenevoy_omich: 'shadow omsk resident, dark alter ego, silhouette figure, mysterious citizen, ninja-like figure',
  bocal: 'cluster bocal leader, programming community head, authoritative figure, school 21 administrator, JavaScript champion',
  makefile_golem: 'programming construct made of code, DevOps elemental, build automation monster, technical debt manifestation, robot',
  omskaya_vedma: 'omsk witch, siberian sorceress, magical powers, traditional slavic witchcraft, flying on broom, spellcaster',
  shaman_lukash: 'shaman from Levoberezhye district, spiritual leader, ritual costume, drum and chants, native beliefs, healer',
  arkhivar_omskoi_kreposti: 'archive keeper of omsk fortress, historical records guardian, ancient documents, dusty library, librarian',
  sneg_elemental: 'snow elemental from siberian winter, ice creature, frozen form, blizzard powers, white and blue, frost giant',
  sibirskiy_medved: 'siberian brown bear, massive powerful animal, taiga forest king, fierce protector, russian symbol, bear wrestler',
  pirat_irtysha: 'irtysh river pirate, water bandit, boat raider, treasure hunter, nautical criminal, scallywag',
  teplostantsiya_golem: 'thermal power station elemental, heat and steam creature, industrial energy, electricity generator, power plant monster',
  blackhole: 'cosmic black hole, space phenomenon, event horizon, gravitational pull, dark matter, universe mystery, cosmic horror',
  duh_sibiri: 'spirit of siberia, vast wilderness essence, northern lights, taiga forest soul, natural power, ghost of north',
  mer_omska: 'mayor of omsk, city leader, official robes, governmental authority, political figure, city hall',
  cluster_lord: 'programming cluster ruler, IT community leader, technological mastery, digital domain, tech overlord',
  drakon_irtysha: 'dragon of Irtysh river, serpentine beast, water and fire, ancient power, mythical creature, wyvern',
  chinovnik: 'russian bureaucrat, government official, paperwork master, stamp collector, administrative worker, paperwork warrior',
  rosgvardiya: 'russian national guard, law enforcement, tactical gear, security forces, official uniform, military police',
  
  // Spells
  debug_mode: 'programming debug mode, code glitch, software error visualization, computer terminal, matrix effect',
  exam_42: 'ultimate exam question reference, Douglas Adams reference, answer to everything, magical test, student nightmare',
  holy_graph: 'sacred data structure, programming religious icon, git commit tree, divine code, algorithm worship',
  norminette: 'strict code linter enforcer, programming rule keeper, style guide police, automated inspector, code quality warrior',
  peer_review: 'code review session, programmer judgment, pull request critique, collaborative debugging, team review',
  posledniy_argument: 'final argument, last resort, desperate measure, ultimate trump card, final showdown',
  segfault: 'memory access violation, computer crash, segmentation fault visualization, system error, blue screen',
  svodka_112: 'emergency services dispatch, ambulance fire police, incident report, emergency call center, rescue coordination',
  uskorennyy_rost: 'rapid growth acceleration, speed boost effect, turbo charging, fast forward, exponential increase',
  vzryv_gaza: 'gas explosion, industrial accident, methane burst, dangerous blast, fiery catastrophe',
  zarya_pobedy: 'dawn of victory, sunrise over city, new beginning hope, sunrise victory, dawn battle',
  
  // Enchantments
  blagoustroistvo: 'city beautification project, urban garden magic, flowers and tiles, healing garden, public park enhancement',
  metro_mechta: 'dream of metro construction, ethereal subway station, unrealized dream, magical metro, underground vision',
  duh_omska: 'ghost of Omsk city, urban spirit, city phantom, haunted urban landscape, spectral citizen',
  golos_telebashni: 'television voice propaganda, broadcast announcement, media influence, TV anchor wizard, news caster',
  irtysh_naberezhnaya: 'Irtysh river embankment, waterfront promenade, riverside view, walking path, river bank scene',
  klyatva_metrostroya: 'metro construction oath, underground vow, subway promise, tunnel workers pledge, construction magic',
  ledyanoy_veter: 'icy wind, freezing blast, siberian cold, winter storm, frost breeze, frozen wind',
  moroz_50: 'fifty degrees below zero, extreme siberian cold, frost magic, Arctic chill, winter domination',
  nalogovaya_inspektsiya: 'tax inspection, government audit, financial scrutiny, IRS style enforcement, money collector',
  ne_pokiday_omsk: 'do not leave Omsk, city binding spell, hometown attachment, loyalty oath, urban chains',
  omskaya_zima: 'omsk winter scene, siberian cold landscape, snow covered city, winter magic, frost city',
  omskiy_npz: 'oil refinery view, industrial complex, petrochemical plant, factory skyline, pollution haze',
  omskiy_optimism: 'optimism charm, positive thinking magic, hope spell, cheerful attitude, sunny disposition',
  park_30let: '30th Anniversary Park, urban park scene, city recreation area, park bench, nature in city',
  pivo_sibirskoe: 'siberian beer, cold brew, alcoholic beverage, tavern scene, drinking companion',
  ploshchad_buhgoltsa: 'Bukhgaltsev Square, city plaza, central square, urban meeting place, public square',
  podzemelye_omska: 'underground passages, catacombs, basement network, tunnel system, hidden passages',
  probka_lenina: 'Lenin Street traffic jam, car congestion, stuck vehicles, urban transportation nightmare',
  prospekt_mira: 'Prospect Mira avenue, main street scene, city boulevard, urban avenue, shopping district',
  shaverma_power: 'shawarma power boost, food energy, meat fury, culinary strength, snack empowerment',
  siberian_gnev: 'siberian wrath, northern fury, frozen anger, cold rage, winter wrath, Arctic rage',
  tuman_nad_irtyshom: 'fog over Irtysh, misty river morning, atmospheric haze, river mist, ghostly waters',
  
  // Lands
  biblioteka_omgtu: 'OMGTU library, university library, book repository, academic archives, knowledge temple',
  bozhestvenniy_svet: 'divine light, heavenly rays, sacred illumination, god rays, celestial brightness',
  irtysh_vodyanoy: 'Irtysh water spirit domain, river territory, aquatic realm, water kingdom',
  omskaya_vedma: 'witch domain, magic place, enchantress lair, spellcasting location',
  teplostantsiya_golem: 'power station territory, industrial zone, energy facility, electricity plant'
};

/**
 * Generate detailed prompt based on card properties
 */
function generatePrompt(card) {
  let prompt = '';
  
  // Base style
  prompt += 'Magic: The Gathering style card art, fantasy trading card game illustration, ';
  
  // Add specific lore/character description
  const lore = omskLore[card.id] || '';
  if (lore) {
    prompt += `${lore}, `;
  } else {
    // Fallback: use card name and flavor
    prompt += `${card.name.toLowerCase()}, ${card.flavor.toLowerCase().replace(/"/g, '')}, `;
  }
  
  // Add card type-specific elements
  if (card.type === 'creature') {
    prompt += 'fantasy creature portrait, detailed character design, humanoid or monster figure, ';
  } else if (card.type === 'spell') {
    prompt += 'magical spell effect, energy burst, arcane symbols, spell casting visualization, magical attack, ';
  } else if (card.type === 'enchantment') {
    prompt += 'mystical aura, ongoing magic effect, enchantment runes, magical enhancement, ';
  } else if (card.type === 'land') {
    prompt += 'fantasy land location, terrain illustration, domain representation, ';
  }
  
  // Add color theme
  prompt += `${colorThemes[card.color] || 'neutral tones'}, `;
  
  // Add keyword effects for creatures
  if (card.keywords && card.keywords.length > 0) {
    const effects = card.keywords.map(k => keywordEffects[k]).filter(e => e);
    if (effects.length > 0) {
      prompt += `${effects.join(', ')}, `;
    }
  }
  
  // Add creature stats if applicable
  if (card.type === 'creature' && card.attack && card.health) {
    prompt += `power ${card.attack} toughness ${card.health}, `;
  }
  
  // Add rarity theme
  prompt += `${rarityThemes[card.rarity] || rarityThemes.common}, `;
  
  // Add flavor-inspired elements
  const flavorLower = card.flavor.toLowerCase();
  if (flavorLower.includes('ночь') || flavorLower.includes('тёмн') || flavorLower.includes('dark')) {
    prompt += 'dark night atmosphere, mysterious shadows, moonlight, ';
  }
  if (flavorLower.includes('свет') || flavorLower.includes('сия') || flavorLower.includes('light')) {
    prompt += 'glowing light effects, radiance, luminous, ';
  }
  if (flavorLower.includes('маг') || flavorLower.includes('чар') || flavorLower.includes('magic')) {
    prompt += 'magical energy, spell effects, mystical, ';
  }
  if (flavorLower.includes('омск') || flavorLower.includes('сибир')) {
    prompt += 'siberian urban landscape, omsk city elements, russian architecture, ';
  }
  if (flavorLower.includes('зим') || flavorLower.includes('мороз') || flavorLower.includes('cold')) {
    prompt += 'winter atmosphere, snow, frost, cold environment, ';
  }
  if (flavorLower.includes('рек') || flavorLower.includes('иртыш')) {
    prompt += 'river scene, water, flowing stream, ';
  }
  
  // Style modifiers
  prompt += 'highly detailed digital painting, dramatic cinematic lighting, sharp focus, 4k quality, professional illustration, artstation trending, masterpiece';
  
  return prompt;
}

// Build Pollinations URL
function buildPollinationsUrl(prompt, seed = null) {
  const encodedPrompt = encodeURIComponent(prompt);
  const params = new URLSearchParams({
    model: IMAGE_MODEL,
    width: String(IMAGE_WIDTH),
    height: String(IMAGE_HEIGHT),
    nologo: 'true',
    seed: String(seed || Math.floor(Math.random() * 1000000))
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

// Check if file exists and is valid size
function isValidFile(filePath, minSize = MIN_FILE_SIZE) {
  if (!fs.existsSync(filePath)) return false;
  const stats = fs.statSync(filePath);
  return stats.size >= minSize;
}

// Get card IDs that need generation
function getCardsToGenerate(cards, outputDir, force = false) {
  return cards.filter(card => {
    if (force) return true;
    const outputFile = path.join(outputDir, `${card.id}.jpg`);
    return !isValidFile(outputFile);
  });
}

// Main generation function with pause/resume support
async function generateAllImages(options = {}) {
  const { force = false, singleCard = null } = options;
  
  const cards = parseCards(cardsContent);
  const outputDir = path.join(__dirname, '../public/cards');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Filter cards
  let cardsToProcess = cards;
  if (singleCard) {
    cardsToProcess = cards.filter(c => c.id === singleCard);
    if (cardsToProcess.length === 0) {
      console.log(`❌ Card not found: ${singleCard}`);
      return;
    }
  } else {
    cardsToProcess = getCardsToGenerate(cards, outputDir, force);
  }
  
  console.log(`\n🎨 Omsk Gathering Image Generator`);
  console.log(`================================`);
  console.log(`Model: ${IMAGE_MODEL}`);
  console.log(`API Key: ${API_KEY ? '✓' : '✗ (using free tier)'}`);
  console.log(`Total cards: ${cards.length}`);
  console.log(`Cards to generate: ${cardsToProcess.length}`);
  console.log(`Force regenerate: ${force ? 'Yes' : 'No'}`);
  console.log(`Min file size: ${MIN_FILE_SIZE / 1000}KB\n`);
  
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < cardsToProcess.length; i++) {
    const card = cardsToProcess[i];
    const outputFile = path.join(outputDir, `${card.id}.jpg`);
    const percentage = Math.round(((i) / cardsToProcess.length) * 100);
    
    // Display progress
    process.stdout.write(`\r[${percentage.toString().padStart(3, ' ')}%] ${i + 1}/${cardsToProcess.length}: ${card.name} (${card.id})`);
    
    // Check if already valid
    if (!force && isValidFile(outputFile)) {
      skipCount++;
      continue;
    }
    
    const prompt = generatePrompt(card);
    const seed = 100 + i; // Consistent seeds for reproducibility
    const imageUrl = buildPollinationsUrl(prompt, seed);
    
    let retries = 0;
    let success = false;
    
    while (retries < MAX_RETRIES && !success) {
      try {
        await downloadImage(imageUrl, outputFile);
        
        // Verify downloaded file
        if (isValidFile(outputFile, MIN_FILE_SIZE)) {
          success = true;
          successCount++;
        } else {
          retries++;
          if (retries < MAX_RETRIES) {
            console.log(`\n  ⚠️ File too small, retrying (${retries}/${MAX_RETRIES})...`);
            fs.unlinkSync(outputFile);
          }
        }
      } catch (error) {
        retries++;
        if (retries < MAX_RETRIES) {
          console.log(`\n  ❌ Error: ${error.message}, retrying (${retries}/${MAX_RETRIES})...`);
          if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        }
      }
    }
    
    if (!success) {
      failCount++;
      console.log(`\n  ❌ Failed after ${MAX_RETRIES} attempts`);
    }
  }
  
  console.log(`\n\n✅ Generation complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Skipped: ${skipCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`\nImages saved to: ${outputDir}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  force: args.includes('--force'),
  singleCard: args.find(arg => arg.startsWith('--card='))?.replace('--card=', '') || null
};

// Run if called directly
if (require.main === module) {
  generateAllImages(options).catch(console.error);
}

module.exports = { parseCards, generatePrompt, buildPollinationsUrl, getCardsToGenerate };
