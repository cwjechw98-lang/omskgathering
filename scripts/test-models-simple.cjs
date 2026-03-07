/**
 * Test Image Generator - Compare Different Pollinations Models
 * 
 * Generates the same card image using 4 different models
 * 
 * Usage: node scripts/test-models-simple.cjs
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

// Detailed prompt for Bird-Omsk card
const PROMPT = `Magic The Gathering style fantasy card illustration, dark magical post-soviet Omsk, glowing mystical crow bird flying over night city in magical aura, prophetic urban cryptid, luminous omen in night sky, white mana aesthetic, cathedral glow, gold accents, solemn noble light, premium trading card art, square 1:1, highly detailed, painterly rendering, cinematic lighting, strong silhouette, no text, no card frame`;

// Models to test - using correct URL formats
const MODELS = [
  { 
    id: 'flux-2-dev', 
    name: 'FLUX.2 Dev',
    url: `https://api.airforce/flux-2-dev?prompt=${encodeURIComponent(PROMPT)}&width=${IMAGE_WIDTH}&height=${IMAGE_HEIGHT}&nologo=true`
  },
  { 
    id: 'zimage-turbo', 
    name: 'Z-Image Turbo',
    url: `https://gen.pollinations.ai/image/${encodeURIComponent(PROMPT)}?model=zimage-turbo&width=${IMAGE_WIDTH}&height=${IMAGE_HEIGHT}&nologo=true`
  },
  { 
    id: 'imagen-4', 
    name: 'Imagen 4',
    url: `https://api.airforce/imagen-4?prompt=${encodeURIComponent(PROMPT)}&width=${IMAGE_WIDTH}&height=${IMAGE_HEIGHT}&nologo=true`
  },
  { 
    id: 'grok-imagine', 
    name: 'Grok Imagine',
    url: `https://api.airforce/grok-imagine?prompt=${encodeURIComponent(PROMPT)}&width=${IMAGE_WIDTH}&height=${IMAGE_HEIGHT}&nologo=true`
  },
];

// Download image from URL
function downloadImage(url, outputPath, modelName) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    let completed = false;
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}` } : {})
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
    
    console.log(`\n[${MODELS.indexOf(model) + 1}/${MODELS.length}] ${model.name}`);
    console.log(`  Model ID: ${model.id}`);
    console.log(`  Output: ${outputFile}`);
    
    try {
      const startTime = Date.now();
      await downloadImage(model.url, outputFile, model.name);
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      // Get file size
      const stats = fs.statSync(outputFile);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`  ✅ Success! (${duration}s, ${fileSizeKB} KB / ${fileSizeMB} MB)`);
      results.push({ model: model.name, success: true, duration, size: fileSizeKB });
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

module.exports = { testAllModels };
