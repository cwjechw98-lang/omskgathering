import { ALL_CARDS, CardData } from './src/data/cards';

// Balance analysis constants
const STAT_VALUES = {
  attack: 1,
  health: 1,
  cardDraw: 2,
  lifeGain: 0.5,
  directDamage: 1,
  freeze: 1,
  manaRamp: 3,
};

interface CardScore {
  card: CardData;
  cost: number;
  rawStats: number;
  abilityValue: number;
  totalValue: number;
  efficiency: number;
  verdict: 'underpowered' | 'balanced' | 'overpowered' | 'broken';
}

function calculateCardValue(card: CardData): { rawStats: number; abilityValue: number } {
  let rawStats = 0;
  let abilityValue = 0;

  // Base stats for creatures
  if (card.type === 'creature') {
    rawStats += (card.attack ?? 0) * STAT_VALUES.attack;
    rawStats += (card.health ?? 0) * STAT_VALUES.health;
    
    // Keyword values
    if (card.keywords?.includes('flying')) abilityValue += 1;
    if (card.keywords?.includes('haste')) abilityValue += 1;
    if (card.keywords?.includes('defender')) abilityValue += 0.5;
    if (card.keywords?.includes('trample')) abilityValue += 1.5;
    if (card.keywords?.includes('lifelink')) abilityValue += 1;
    if (card.keywords?.includes('deathtouch')) abilityValue += 1.5;
    if (card.keywords?.includes('vigilance')) abilityValue += 0.5;
    if (card.keywords?.includes('first_strike')) abilityValue += 1;
    if (card.keywords?.includes('hexproof')) abilityValue += 2;
    if (card.keywords?.includes('unblockable')) abilityValue += 1.5;
  }

  // Ability values based on description
  const desc = card.description.toLowerCase();
  
  if (desc.includes('потяните карту') || desc.includes('+1 карта')) {
    const matches = desc.match(/(\d+)\s*карт/);
    const count = matches ? parseInt(matches[1]) : 1;
    abilityValue += count * STAT_VALUES.cardDraw;
  }
  
  if (desc.includes('+1 hp') || desc.includes('+1 здоровья')) {
    abilityValue += STAT_VALUES.lifeGain;
  }
  if (desc.includes('+2 здоровья')) {
    abilityValue += 2 * STAT_VALUES.lifeGain;
  }
  if (desc.includes('+4 hp') || desc.includes('+4 здоровья')) {
    abilityValue += 4 * STAT_VALUES.lifeGain;
  }
  if (desc.includes('+6 здоровья')) {
    abilityValue += 6 * STAT_VALUES.lifeGain;
  }
  
  if (desc.includes('1 урон')) {
    abilityValue += STAT_VALUES.directDamage;
  }
  if (desc.includes('2 урона')) {
    abilityValue += 2 * STAT_VALUES.directDamage;
  }
  if (desc.includes('3 урона')) {
    abilityValue += 3 * STAT_VALUES.directDamage;
  }
  if (desc.includes('4 урона')) {
    abilityValue += 4 * STAT_VALUES.directDamage;
  }
  
  if (desc.includes('заморожен') || desc.includes('freeze')) {
    abilityValue += STAT_VALUES.freeze;
  }
  
  if (desc.includes('+1 мана')) {
    abilityValue += STAT_VALUES.manaRamp;
  }

  // Special cases
  if (card.id === 'mer_omska') {
    abilityValue += 3; // Creates 2 1/1 tokens
  }
  if (card.id === 'pivo_sibirskoe') {
    abilityValue += 4; // Draw 2 cards
  }
  if (card.id === 'segfault') {
    abilityValue += 2.5; // Random but powerful
  }

  return { rawStats, abilityValue };
}

function getVerdict(efficiency: number): CardScore['verdict'] {
  if (efficiency < 0.6) return 'underpowered';
  if (efficiency < 0.9) return 'balanced';
  if (efficiency < 1.3) return 'balanced';
  if (efficiency < 1.6) return 'overpowered';
  return 'broken';
}

function analyzeBalance() {
  const scores: CardScore[] = [];

  for (const card of ALL_CARDS) {
    if (card.type === 'land') continue; // Skip lands
    
    const { rawStats, abilityValue } = calculateCardValue(card);
    const totalValue = rawStats + abilityValue;
    const efficiency = card.cost > 0 ? totalValue / card.cost : totalValue;
    
    scores.push({
      card,
      cost: card.cost,
      rawStats,
      abilityValue,
      totalValue,
      efficiency,
      verdict: getVerdict(efficiency),
    });
  }

  // Sort by efficiency
  scores.sort((a, b) => b.efficiency - a.efficiency);

  console.log('═══════════════════════════════════════════════════════');
  console.log('           CARD BALANCE ANALYSIS REPORT');
  console.log('═══════════════════════════════════════════════════════\n');

  // Overpowered cards
  const overpowered = scores.filter(s => s.verdict === 'overpowered' || s.verdict === 'broken');
  console.log(`🔴 OVERPOWERED/BROKEN (${overpowered.length} cards):`);
  console.log('───────────────────────────────────────────────────────');
  for (const s of overpowered.slice(0, 15)) {
    console.log(`  ${s.card.name} (${s.card.cost} mana)`);
    console.log(`     Stats: ${s.rawStats} | Ability: ${s.abilityValue} | Total: ${s.totalValue.toFixed(1)} | Efficiency: ${s.efficiency.toFixed(2)}x`);
    console.log(`     ${s.card.description}`);
  }
  console.log();

  // Underpowered cards
  const underpowered = scores.filter(s => s.verdict === 'underpowered');
  console.log(`🟢 UNDERPOWERED (${underpowered.length} cards):`);
  console.log('───────────────────────────────────────────────────────');
  for (const s of underpowered.slice(0, 15)) {
    console.log(`  ${s.card.name} (${s.card.cost} mana)`);
    console.log(`     Stats: ${s.rawStats} | Ability: ${s.abilityValue} | Total: ${s.totalValue.toFixed(1)} | Efficiency: ${s.efficiency.toFixed(2)}x`);
    console.log(`     ${s.card.description}`);
  }
  console.log();

  // By mana cost
  console.log('📊 BALANCE BY MANA COST:');
  console.log('───────────────────────────────────────────────────────');
  for (let cost = 1; cost <= 7; cost++) {
    const costCards = scores.filter(s => s.cost === cost);
    if (costCards.length === 0) continue;
    
    const avgEfficiency = costCards.reduce((sum, s) => sum + s.efficiency, 0) / costCards.length;
    const best = costCards[0];
    const worst = costCards[costCards.length - 1];
    
    console.log(`\n  ${cost} MANA (${costCards.length} cards, avg: ${avgEfficiency.toFixed(2)}x):`);
    console.log(`     Best: ${best.card.name} (${best.efficiency.toFixed(2)}x)`);
    console.log(`     Worst: ${worst.card.name} (${worst.efficiency.toFixed(2)}x)`);
  }

  // Color balance
  console.log('\n\n🎨 BALANCE BY COLOR:');
  console.log('───────────────────────────────────────────────────────');
  const colors = ['white', 'blue', 'black', 'red', 'green', 'colorless'];
  for (const color of colors) {
    const colorCards = scores.filter(s => s.card.color === color);
    if (colorCards.length === 0) continue;
    
    const avgEfficiency = colorCards.reduce((sum, s) => sum + s.efficiency, 0) / colorCards.length;
    const opCount = colorCards.filter(s => s.verdict === 'overpowered' || s.verdict === 'broken').length;
    const upCount = colorCards.filter(s => s.verdict === 'underpowered').length;
    
    console.log(`  ${color.padEnd(12)}: ${colorCards.length} cards, avg: ${avgEfficiency.toFixed(2)}x, OP: ${opCount}, UP: ${upCount}`);
  }

  // Summary
  console.log('\n\n📋 SUMMARY:');
  console.log('═══════════════════════════════════════════════════════');
  const balanced = scores.filter(s => s.verdict === 'balanced');
  console.log(`  Total cards analyzed: ${scores.length}`);
  console.log(`  🔴 Overpowered/Broken: ${overpowered.length} (${(overpowered.length / scores.length * 100).toFixed(1)}%)`);
  console.log(`  🟡 Balanced: ${balanced.length} (${(balanced.length / scores.length * 100).toFixed(1)}%)`);
  console.log(`  🟢 Underpowered: ${underpowered.length} (${(underpowered.length / scores.length * 100).toFixed(1)}%)`);
  console.log('═══════════════════════════════════════════════════════');

  return { overpowered, underpowered, balanced, scores };
}

// Run analysis
analyzeBalance();
