/**
 * Generate test images using different models via Pollinations
 * Uses correct URL format for each model
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.POLLINATIONS_API_KEY || '';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'cards');

// Detailed prompt for Bird-Omsk
const PROMPT = `Magic The Gathering style fantasy card illustration, dark magical post-soviet Omsk, glowing mystical crow bird flying over night city in magical aura, prophetic urban cryptid, luminous omen in night sky, white mana aesthetic, cathedral glow, gold accents, solemn noble light, premium trading card art, square 1024x1024, highly detailed, painterly rendering, cinematic lighting, strong silhouette, no text, no card frame`;

// Models configuration - all use gen.pollinations.ai with model parameter
const MODELS = [
  { id: 'flux', name: 'FLUX (Base)' },
  { id: 'flux-2-dev', name: 'FLUX.2 Dev' },
  { id: 'grok-imagine', name: 'Grok Imagine' },
  { id: 'imagen-4', name: 'Imagen 4' },
];

function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}` } : {})
      },
      timeout: 90000
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 308) {
        // Follow redirect
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
  // Ensure output dir exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  console.log('🎨 Generating Test Images - All Models\n');
  console.log('======================================\n');
  console.log(`Card: Птица-Омич (bird_omsk)`);
  console.log(`Prompt length: ${PROMPT.length} characters`);
  console.log(`API Key: ${API_KEY ? '✓' : '✗'}`);
  console.log('');
  
  const results = [];
  
  for (const model of MODELS) {
    const outputFile = path.join(OUTPUT_DIR, `test_bird_${model.id.replace(/\./g, '_')}.jpg`);
    
    // Use gen.pollinations.ai format: /image/{prompt}?model={id}&width={w}&height={h}
    const encodedPrompt = encodeURIComponent(PROMPT);
    const url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${model.id}&width=1024&height=1024&nologo=true${API_KEY ? `&key=${API_KEY}` : ''}`;
    
    console.log(`\n[${MODELS.indexOf(model) + 1}/${MODELS.length}] ${model.name} (${model.id})`);
    console.log(`  Output: ${path.basename(outputFile)}`);
    
    try {
      const start = Date.now();
      await downloadImage(url, outputFile);
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      
      const stats = fs.statSync(outputFile);
      const sizeKB = (stats.size / 1024).toFixed(1);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`  ✅ SUCCESS! (${duration}s, ${sizeKB} KB / ${sizeMB} MB)`);
      results.push({ model: model.name, success: true, duration, size: sizeKB });
      
    } catch (error) {
      console.log(`  ❌ FAILED: ${error.message}`);
      results.push({ model: model.name, success: false, error: error.message });
    }
  }
  
  // Summary
  console.log('\n\n======================================');
  console.log('📊 RESULTS SUMMARY\n');
  
  console.log('Model            | Status | Time  | Size    ');
  console.log('-----------------|--------|-------|---------');
  
  for (const r of results) {
    const status = r.success ? '✅ OK  ' : '❌ FAIL';
    const time = r.duration ? `${r.duration}s`.padStart(5) : 'N/A  ';
    const size = r.size ? `${r.size} KB`.padStart(7) : 'N/A';
    console.log(`${r.model.padEnd(16)} | ${status} | ${time} | ${size}`);
  }
  
  console.log('\n\n✅ All tests complete!');
  console.log(`Files saved to: ${OUTPUT_DIR}`);
  
  // List created files
  console.log('\nGenerated files:');
  for (const model of MODELS) {
    const filename = `test_bird_${model.id.replace(/\./g, '_')}.jpg`;
    const filepath = path.join(OUTPUT_DIR, filename);
    if (fs.existsSync(filepath)) {
      const stats = fs.statSync(filepath);
      console.log(`  ✓ ${filename} (${(stats.size/1024).toFixed(1)} KB)`);
    } else {
      console.log(`  ✗ ${filename} (failed)`);
    }
  }
}

main().catch(console.error);
