/**
 * Test Image Generator - Compare Different Pollinations Models
 * 
 * Generates the same card image using 4 different models:
 * 1. FLUX.2 Dev (api.airforce)
 * 2. Z-Image Turbo
 * 3. Imagen 4 (api.airforce)
 * 4. Grok Imagine (api.airforce)
 * 
 * Usage: node scripts/test-models.cjs
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
const IMAGE_WIDTH = 1024;
const IMAGE_HEIGHT = 1024;
const TIMEOUT_MS = 120000;

// Models to test
const MODELS = [
  { id: 'flux-2-dev', name: 'FLUX.2 Dev', baseUrl: 'https://api.airforce' },
  { id: 'zimage-turbo', name: 'Z-Image Turbo', baseUrl: 'https://gen.pollinations.ai' },
  { id: 'imagen-4', name: 'Imagen 4', baseUrl: 'https://api.airforce' },
  { id: 'grok-imagine', name: 'Grok Imagine', baseUrl: 'https://api.airforce' },
];

// Detailed prompt for Bird-Omsk card
const PROMPT = `Magic: The Gathering style fantasy card illustration, dark magical post-soviet Omsk, local memes elevated into serious myth, collectible premium card art, painterly detail, cinematic atmosphere, single-character hero shot, full figure or waist-up if stronger composition, dramatic pose, clear silhouette, expressive face or iconic nonhuman form, white mana aesthetic, order, law, healing, cathedral glow, ivory stone, gold accents, solemn noble light, core visual idea: Светящаяся мистическая ворона, летящая над ночным Омском в магическом ореоле, visualize the gameplay identity clearly: Когда входит на поле — потяните 1 карту, keywords must be visible in the pose or scene language: 🕊️ Полёт, lore tone to emphasize: «В 2012 году она появилась над городом — сияющая, пророческая. С тех пор её видят в самые тёмные ночи. Ты не можешь покинуть Омск...», legendary Omsk meme-bird, not a generic raven, prophetic urban cryptid from local forum folklore, eerie sacred presence above rooftops, luminous omen in the night sky, Magic: The Gathering style fantasy card illustration, premium trading card art, square 1:1, highly detailed, painterly rendering, cinematic lighting, strong silhouette, layered atmosphere, clean focal composition, no text, no card frame, no UI`;

// Build URL for each model
function buildUrl(model, prompt) {
  const encodedPrompt = encodeURIComponent(prompt);
  const params = new URLSearchParams({
    model: model.id,
    width: String(IMAGE_WIDTH),
    height: String(IMAGE_HEIGHT),
    nologo: 'true',
  });
  
  if (API_KEY) {
    params.set('key', API_KEY);
  }
  
  return `${model.baseUrl}/image/${encodedPrompt}?${params.toString()}`;
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

// Main test function
async function testAllModels() {
  const outputDir = path.join(__dirname, '..', 'public', 'cards');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('🎨 Testing Different Pollinations Models\n');
  console.log('========================================\n');
  console.log(`Card: Птица-Омич (bird_omsk)`);
  console.log(`Models: ${MODELS.length}`);
  console.log(`Image Size: ${IMAGE_WIDTH}x${IMAGE_HEIGHT}`);
  console.log(`API Key: ${API_KEY ? '✓' : '✗ (free tier)'}`);
  console.log('');
  
  const results = [];
  
  for (const model of MODELS) {
    const outputFile = path.join(outputDir, `bird_omsk_${model.id}.jpg`);
    const imageUrl = buildUrl(model, PROMPT);
    
    console.log(`\n[${MODELS.indexOf(model) + 1}/${MODELS.length}] ${model.name}`);
    console.log(`  Model ID: ${model.id}`);
    console.log(`  Base URL: ${model.baseUrl}`);
    console.log(`  Output: ${outputFile}`);
    
    try {
      const startTime = Date.now();
      await downloadImage(imageUrl, outputFile);
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      // Get file size
      const stats = fs.statSync(outputFile);
      const fileSize = (stats.size / 1024).toFixed(2);
      
      console.log(`  ✅ Success! (${duration}s, ${fileSize} KB)`);
      results.push({ model: model.name, success: true, duration, size: fileSize });
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      results.push({ model: model.name, success: false, error: error.message });
    }
  }
  
  // Print summary
  console.log('\n\n========================================');
  console.log('📊 SUMMARY\n');
  
  console.log('| Model | Status | Time | Size |');
  console.log('|-------|--------|------|------|');
  
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    const time = result.duration || 'N/A';
    const size = result.size ? `${result.size} KB` : 'N/A';
    console.log(`| ${result.model.padEnd(15)} | ${status.padEnd(6)} | ${time.padEnd(4)} | ${size.padEnd(4)} |`);
  }
  
  console.log('\n\n✅ Test complete!');
  console.log(`Images saved to: ${outputDir}`);
  console.log('\nFiles created:');
  console.log('  - bird_omsk_flux-2-dev.jpg');
  console.log('  - bird_omsk_zimage-turbo.jpg');
  console.log('  - bird_omsk_imagen-4.jpg');
  console.log('  - bird_omsk_grok-imagine.jpg');
}

// Run if called directly
if (require.main === module) {
  testAllModels().catch(console.error);
}

module.exports = { testAllModels, buildUrl };
