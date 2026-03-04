import { attackCreature, attackPlayer, createCardInstance, endTurn, playCard, drawCard, getEffectiveAttack } from '../../src/game/engine';
import { aiTurn } from '../../src/game/ai';
import type { CardData, Keyword } from '../../src/data/cards';
import type { CardInstance, GameState, PlayerState } from '../../src/game/types';

function makeCreature(
  id: string,
  name: string,
  attack: number,
  health: number,
  keywords: Keyword[] = []
): CardInstance {
  const data: CardData = {
    id,
    name,
    cost: 1,
    color: 'white',
    type: 'creature',
    attack,
    health,
    description: 'test',
    flavor: 'test',
    emoji: 'T',
    keywords,
    rarity: 'common',
  };
  const card = createCardInstance(data);
  card.summoningSickness = false;
  card.hasAttacked = false;
  return card;
}

function makeSpell(id: string, name: string): CardInstance {
  const data: CardData = {
    id,
    name,
    cost: 1,
    color: 'blue',
    type: 'spell',
    description: 'test',
    flavor: 'test',
    emoji: 'S',
    rarity: 'common',
  };
  return createCardInstance(data);
}

function makeEnchantment(id: string, name: string): CardInstance {
  const data: CardData = {
    id,
    name,
    cost: 1,
    color: 'white',
    type: 'enchantment',
    description: 'test',
    flavor: 'test',
    emoji: 'E',
    rarity: 'common',
  };
  return createCardInstance(data);
}

function makeLand(id: string, name: string): CardInstance {
  const data: CardData = {
    id,
    name,
    cost: 0,
    color: 'colorless',
    type: 'land',
    description: 'test',
    flavor: 'test',
    emoji: 'L',
    rarity: 'common',
  };
  return createCardInstance(data);
}

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    health: 30,
    maxHealth: 30,
    mana: 0,
    maxMana: 0,
    hand: [],
    field: [],
    deck: [],
    graveyard: [],
    enchantments: [],
    landsPlayed: 0,
    maxLandsPerTurn: 1,
    ...overrides,
  };
}

function makeState(player1: PlayerState, player2: PlayerState, currentTurn: 'player1' | 'player2' = 'player1'): GameState {
  return {
    player1,
    player2,
    currentTurn,
    turnNumber: 1,
    phase: 'main',
    gameOver: false,
    winner: null,
    log: [],
    cantAttackNextTurn: false,
    lastDiceRoll: null,
    aiComment: null,
  };
}

function expect(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function testFrozenDefenderNoRetaliationAndThaw(): void {
  const attacker = makeCreature('attacker', 'Attacker', 3, 3);
  const defender = makeCreature('defender', 'Defender', 2, 4);
  defender.frozen = 1;

  const state = makeState(
    makePlayer({ field: [attacker] }),
    makePlayer({ field: [defender] }),
    'player1'
  );
  const next = attackCreature(state, 'player1', attacker.uid, defender.uid);

  const nextAttacker = next.player1.field.find(c => c.uid === attacker.uid);
  const nextDefender = next.player2.field.find(c => c.uid === defender.uid);

  expect(Boolean(nextAttacker), 'attacker should survive');
  expect(Boolean(nextDefender), 'defender should survive with 1 hp');
  expect((nextAttacker?.currentHealth ?? -1) === 3, 'frozen defender must not deal retaliation damage');
  expect((nextDefender?.currentHealth ?? -1) === 1, 'defender should take combat damage');
  expect((nextDefender?.frozen ?? -1) === 0, 'defender should thaw after taking damage');
}

function testLifelinkHealsActualDamageOnly(): void {
  const attacker = makeCreature('lifelinker', 'Lifelinker', 5, 3, ['lifelink']);
  const defender = makeCreature('small-defender', 'Small Defender', 0, 2);

  const p1 = makePlayer({ health: 20, maxHealth: 30, field: [attacker] });
  const p2 = makePlayer({ field: [defender] });
  const state = makeState(p1, p2, 'player1');
  const next = attackCreature(state, 'player1', attacker.uid, defender.uid);

  expect(next.player1.health === 22, `lifelink should heal 2 (actual damage), got ${next.player1.health}`);
}

function testDeathtouchSetsTargetToZeroAndKills(): void {
  const attacker = makeCreature('deathtoucher', 'Deathtoucher', 1, 2, ['deathtouch']);
  const defender = makeCreature('big-target', 'Big Target', 0, 8);

  const state = makeState(
    makePlayer({ field: [attacker] }),
    makePlayer({ field: [defender] }),
    'player1'
  );
  const next = attackCreature(state, 'player1', attacker.uid, defender.uid);

  expect(next.player2.field.length === 0, 'deathtouch target should die and leave field');
  const deadCard = next.player2.graveyard.find(c => c.uid === defender.uid);
  expect(Boolean(deadCard), 'deathtouch target should move to graveyard');
  expect((deadCard?.currentHealth ?? -999) === 0, 'deathtouch should set defender hp to exactly 0');
}

function testAiReturnsAttackActions(): void {
  const aiAttacker = makeCreature('ai-attacker', 'AI Attacker', 2, 2);
  const state = makeState(
    makePlayer({ field: [] }),
    makePlayer({ field: [aiAttacker], hand: [], deck: [] }),
    'player2'
  );

  const result = aiTurn(state);
  expect(result.actions.length > 0, 'aiTurn should return at least one attack action');
  expect(result.actions[0].type === 'attack-hero', `expected first action attack-hero, got ${result.actions[0].type}`);
  expect(result.actions[0].attackerUid === aiAttacker.uid, 'ai action should reference attacker uid');
}

function testAiAttacksDefenderWhenPresent(): void {
  const aiAttacker = makeCreature('ai-attacker-vs-def', 'AI Attacker', 3, 3);
  const blocker = makeCreature('player-defender', 'Player Defender', 0, 4, ['defender']);
  const state = makeState(
    makePlayer({ field: [blocker] }),
    makePlayer({ field: [aiAttacker], hand: [], deck: [] }),
    'player2'
  );

  const result = aiTurn(state);
  expect(result.actions.length > 0, 'aiTurn should produce actions when attacker exists');
  expect(result.actions[0].type === 'attack-creature', `expected first action attack-creature, got ${result.actions[0].type}`);
  if (result.actions[0].type === 'attack-creature') {
    expect(result.actions[0].defenderUid === blocker.uid, 'ai should target mandatory defender');
    expect(result.actions[0].attackerUid === aiAttacker.uid, 'ai action should reference attacker uid');
  }
}

function testMorozFreezeSkipsExactlyOneTurn(): void {
  const moroz = makeSpell('moroz_50', 'Moroz');
  moroz.data.cost = 0;
  const enemyAttacker = makeCreature('enemy-attacker', 'Enemy Attacker', 2, 2);
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [moroz] });
  const p2 = makePlayer({ field: [enemyAttacker] });
  const start = makeState(p1, p2, 'player1');

  const afterCast = playCard(start, 'player1', moroz.uid);
  const frozenAfterCast = afterCast.player2.field[0]?.frozen ?? 0;
  expect(frozenAfterCast === 2, `moroz should set frozen=2 for 1-turn freeze, got ${frozenAfterCast}`);

  const p2Turn1 = endTurn(afterCast); // turn passes to player2, frozen decrements 2->1
  const p2Attacker1 = p2Turn1.player2.field[0];
  expect((p2Attacker1?.frozen ?? 0) === 1, 'enemy should still be frozen on first skipped turn');
  const blockedAttack = attackPlayer(p2Turn1, 'player2', p2Attacker1.uid);
  expect(blockedAttack === p2Turn1, 'frozen creature must not be able to attack on skipped turn');

  const p1Turn = endTurn(p2Turn1);
  const p2Turn2 = endTurn(p1Turn); // frozen decrements 1->0
  const p2Attacker2 = p2Turn2.player2.field[0];
  expect((p2Attacker2?.frozen ?? 0) === 0, 'enemy should thaw by second own turn');
}

function testLedyanoyVeterSkipsTwoTurns(): void {
  const veter = makeSpell('ledyanoy_veter', 'Veter');
  veter.data.cost = 0;
  const enemyAttacker = makeCreature('enemy-attacker-2', 'Enemy Attacker 2', 2, 2);
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [veter], deck: [] });
  const p2 = makePlayer({ field: [enemyAttacker] });
  const start = makeState(p1, p2, 'player1');

  const afterCast = playCard(start, 'player1', veter.uid);
  const frozenAfterCast = afterCast.player2.field[0]?.frozen ?? 0;
  expect(frozenAfterCast === 3, `ledyanoy_veter should set frozen=3 for 2-turn freeze, got ${frozenAfterCast}`);

  const p2Turn1 = endTurn(afterCast); // 3->2
  expect((p2Turn1.player2.field[0]?.frozen ?? 0) === 2, 'first enemy turn should remain frozen');
  const p1Turn = endTurn(p2Turn1);
  const p2Turn2 = endTurn(p1Turn); // 2->1
  expect((p2Turn2.player2.field[0]?.frozen ?? 0) === 1, 'second enemy turn should remain frozen');
  const p1Turn2 = endTurn(p2Turn2);
  const p2Turn3 = endTurn(p1Turn2); // 1->0
  expect((p2Turn3.player2.field[0]?.frozen ?? 0) === 0, 'enemy should thaw on third own turn');
}

function testStudentOmgtuEntryEffectLogsTopDeckCard(): void {
  const student = makeCreature('student_omgtu', 'Student', 1, 3, ['defender']);
  student.data.cost = 0;
  const knownTop = makeCreature('top-deck-card', 'Known Top', 1, 1);
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [student], deck: [knownTop] });
  const start = makeState(p1, makePlayer(), 'player1');

  const afterPlay = playCard(start, 'player1', student.uid);
  const hasLog = afterPlay.log.some((x) => x.includes('Студент ОмГТУ изучает верх колоды') && x.includes('Known Top'));
  expect(hasLog, 'student_omgtu should reveal/log top deck card on ETB');
}

function testSnegElementalFreezesOnlyWhenHit(): void {
  const attackerNoDamage = makeCreature('att-no-dmg', 'No Damage', 0, 4);
  const sneg = makeCreature('sneg_elemental', 'Sneg', 1, 6);
  const startNoDamage = makeState(
    makePlayer({ field: [attackerNoDamage] }),
    makePlayer({ field: [sneg] }),
    'player1'
  );
  const afterNoDamage = attackCreature(startNoDamage, 'player1', attackerNoDamage.uid, sneg.uid);
  const attAfterNoDamage = afterNoDamage.player1.field.find(c => c.uid === attackerNoDamage.uid);
  expect((attAfterNoDamage?.frozen ?? 0) === 0, 'sneg should not freeze attacker if no damage was dealt to elemental');

  const attackerHits = makeCreature('att-hit', 'Hit', 2, 4);
  const sneg2 = makeCreature('sneg_elemental', 'Sneg2', 1, 6);
  const startHit = makeState(
    makePlayer({ field: [attackerHits] }),
    makePlayer({ field: [sneg2] }),
    'player1'
  );
  const afterHit = attackCreature(startHit, 'player1', attackerHits.uid, sneg2.uid);
  const attAfterHit = afterHit.player1.field.find(c => c.uid === attackerHits.uid);
  expect((attAfterHit?.frozen ?? 0) >= 2, 'sneg should freeze attacker when elemental is damaged');
}

function testFirstStrikeKillsBeforeRetaliation(): void {
  const attacker = makeCreature('first-striker', 'First Striker', 3, 2, ['first_strike']);
  const defender = makeCreature('normal-def', 'Normal Defender', 2, 2);
  const state = makeState(
    makePlayer({ field: [attacker] }),
    makePlayer({ field: [defender] }),
    'player1'
  );

  const next = attackCreature(state, 'player1', attacker.uid, defender.uid);
  const survivor = next.player1.field.find(c => c.uid === attacker.uid);
  const deadDef = next.player2.graveyard.find(c => c.uid === defender.uid);

  expect(Boolean(survivor), 'first striker should survive if defender dies before retaliation');
  expect(Boolean(deadDef), 'defender should die to first strike hit');
  expect((survivor?.currentHealth ?? 0) === 2, 'first striker should take no retaliation damage');
}

function testTrampleDealsOnlyExcessToHero(): void {
  const trampler = makeCreature('trampler', 'Trampler', 6, 5, ['trample']);
  const blocker = makeCreature('blocker', 'Blocker', 0, 3);
  const state = makeState(
    makePlayer({ field: [trampler] }),
    makePlayer({ health: 30, maxHealth: 30, field: [blocker] }),
    'player1'
  );

  const next = attackCreature(state, 'player1', trampler.uid, blocker.uid);
  expect(next.player2.health === 27, `trample should deal 3 excess damage to hero, got ${30 - next.player2.health}`);
}

function testUnblockableBypassesDefenderToHitHero(): void {
  const attacker = makeCreature('unblockable-att', 'Unblockable', 3, 3, ['unblockable']);
  const defender = makeCreature('wall', 'Wall', 0, 5, ['defender']);
  const state = makeState(
    makePlayer({ field: [attacker] }),
    makePlayer({ health: 20, maxHealth: 30, field: [defender] }),
    'player1'
  );

  const next = attackPlayer(state, 'player1', attacker.uid);
  expect(next.player2.health === 17, 'unblockable attacker should damage hero through defenders');
}

function testDefenderCannotAttackHeroOrCreature(): void {
  const defenderAttacker = makeCreature('defender-attacker', 'Defender Attacker', 5, 5, ['defender']);
  const enemy = makeCreature('enemy', 'Enemy', 1, 3);
  const state = makeState(
    makePlayer({ field: [defenderAttacker] }),
    makePlayer({ health: 25, maxHealth: 30, field: [enemy] }),
    'player1'
  );

  const heroResult = attackPlayer(state, 'player1', defenderAttacker.uid);
  expect(heroResult === state, 'defender should not be able to attack hero via engine API');

  const creatureResult = attackCreature(state, 'player1', defenderAttacker.uid, enemy.uid);
  expect(creatureResult === state, 'defender should not be able to attack creatures via engine API');
}

function testVigilanceIsNotMandatoryDefender(): void {
  const attacker = makeCreature('attacker-vs-vigilance', 'Attacker', 2, 2);
  const vigilanceOnly = makeCreature('vigilance-only', 'Vigilance Only', 1, 4, ['vigilance']);
  const state = makeState(
    makePlayer({ field: [attacker] }),
    makePlayer({ health: 22, maxHealth: 30, field: [vigilanceOnly] }),
    'player1'
  );

  const next = attackPlayer(state, 'player1', attacker.uid);
  expect(next.player2.health === 20, 'vigilance must not force attacks like defender');
}

function testCannotHitFlyingWithoutFlying(): void {
  const groundAttacker = makeCreature('ground', 'Ground', 3, 3);
  const flyingDefender = makeCreature('flying-def', 'Flying Defender', 1, 2, ['flying']);
  const start = makeState(
    makePlayer({ field: [groundAttacker] }),
    makePlayer({ field: [flyingDefender] }),
    'player1'
  );

  const blocked = attackCreature(start, 'player1', groundAttacker.uid, flyingDefender.uid);
  expect(blocked === start, 'ground creature should not attack flying target');

  const flyingAttacker = makeCreature('flying-att', 'Flying Attacker', 3, 3, ['flying']);
  const start2 = makeState(
    makePlayer({ field: [flyingAttacker] }),
    makePlayer({ field: [flyingDefender] }),
    'player1'
  );
  const allowed = attackCreature(start2, 'player1', flyingAttacker.uid, flyingDefender.uid);
  expect(allowed !== start2, 'flying attacker should be able to hit flying defender');
}

// === HASTE & HEXPROOF ===

function testHasteBypassesSummoningSickness(): void {
  const hasteCreature = makeCreature('haste-guy', 'Haste Guy', 3, 3, ['haste']);
  hasteCreature.data.cost = 0;
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [hasteCreature] });
  const p2 = makePlayer({ health: 30, maxHealth: 30 });
  const state = makeState(p1, p2, 'player1');

  const afterPlay = playCard(state, 'player1', hasteCreature.uid);
  const onField = afterPlay.player1.field.find(c => c.uid === hasteCreature.uid);
  expect(Boolean(onField), 'haste creature should be on field');
  expect(onField!.summoningSickness === false, 'haste creature should NOT have summoning sickness');

  const afterAttack = attackPlayer(afterPlay, 'player1', hasteCreature.uid);
  expect(afterAttack.player2.health === 27, `haste creature should attack hero immediately, got hp=${afterAttack.player2.health}`);
}

function testSummoningSicknessBlocksAttack(): void {
  const normalCreature = makeCreature('normal', 'Normal', 3, 3);
  normalCreature.data.cost = 0;
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [normalCreature] });
  const p2 = makePlayer({ health: 30, maxHealth: 30 });
  const state = makeState(p1, p2, 'player1');

  const afterPlay = playCard(state, 'player1', normalCreature.uid);
  const onField = afterPlay.player1.field.find(c => c.uid === normalCreature.uid);
  expect(onField!.summoningSickness === true, 'normal creature should have summoning sickness');

  const afterAttack = attackPlayer(afterPlay, 'player1', normalCreature.uid);
  expect(afterAttack === afterPlay, 'creature with summoning sickness should not be able to attack');
}

function testHexproofBlocksSpellTargeting(): void {
  // Yama na doroge should skip hexproof targets
  const hexproofTarget = makeCreature('hexproof-target', 'Hexproof', 2, 4, ['hexproof']);
  const yamaSpell = makeSpell('yama_na_doroge', 'Yama');
  yamaSpell.data.cost = 0;
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [yamaSpell] });
  const p2 = makePlayer({ field: [hexproofTarget] });
  const state = makeState(p1, p2, 'player1');

  const afterCast = playCard(state, 'player1', yamaSpell.uid);
  const targetStillAlive = afterCast.player2.field.find(c => c.uid === hexproofTarget.uid);
  expect(Boolean(targetStillAlive), 'hexproof creature should survive yama_na_doroge');
  expect((targetStillAlive?.currentHealth ?? 0) === 4, 'hexproof creature should be undamaged');
}

function testHexproofDoesNotBlockCombat(): void {
  // Hexproof should NOT block direct combat attacks
  const attacker = makeCreature('att', 'Attacker', 3, 3);
  const hexproofDef = makeCreature('hex-def', 'HexDef', 1, 2, ['hexproof']);
  const state = makeState(
    makePlayer({ field: [attacker] }),
    makePlayer({ field: [hexproofDef] }),
    'player1'
  );

  const next = attackCreature(state, 'player1', attacker.uid, hexproofDef.uid);
  expect(next !== state, 'hexproof should NOT block combat attacks');
  expect(next.player2.field.length === 0, 'hexproof creature should die in combat');
}

// === ETB TRIGGERS ===

function testBirdOmskDrawsOnETB(): void {
  const bird = makeCreature('bird_omsk', 'Bird', 1, 1);
  bird.data.cost = 0;
  const deckCard = makeCreature('deck-card', 'Deck Card', 1, 1);
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [bird], deck: [deckCard] });
  const state = makeState(p1, makePlayer(), 'player1');

  const afterPlay = playCard(state, 'player1', bird.uid);
  const drewCard = afterPlay.player1.hand.some(c => c.uid === deckCard.uid);
  expect(drewCard, 'bird_omsk ETB should draw 1 card');
}

function testMarshrutchikAoEOnETB(): void {
  const marshrutchik = makeCreature('marshrutchik', 'Marshrutchik', 2, 4);
  marshrutchik.data.cost = 0;
  const ally = makeCreature('ally', 'Ally', 1, 3);
  const enemy = makeCreature('enemy', 'Enemy', 1, 3);
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [marshrutchik], field: [ally] });
  const p2 = makePlayer({ field: [enemy] });
  const state = makeState(p1, p2, 'player1');

  const afterPlay = playCard(state, 'player1', marshrutchik.uid);
  const allyAfter = afterPlay.player1.field.find(c => c.uid === ally.uid);
  const enemyAfter = afterPlay.player2.field.find(c => c.uid === enemy.uid);
  expect((allyAfter?.currentHealth ?? 0) === 2, `marshrutchik should deal 1 to ally, got ${allyAfter?.currentHealth}`);
  expect((enemyAfter?.currentHealth ?? 0) === 2, `marshrutchik should deal 1 to enemy, got ${enemyAfter?.currentHealth}`);
}

function testMerOmskSpawnsTokens(): void {
  const mer = makeCreature('mer_omska', 'Mer', 3, 5, ['vigilance']);
  mer.data.cost = 0;
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [mer] });
  const state = makeState(p1, makePlayer(), 'player1');

  const afterPlay = playCard(state, 'player1', mer.uid);
  const tokens = afterPlay.player1.field.filter(c => c.data.id === 'chinovnik');
  expect(tokens.length === 2, `mer_omska should spawn 2 chinovnik tokens, got ${tokens.length}`);
  expect(afterPlay.player1.field.length === 3, 'field should have mer + 2 tokens');
}

function testBlackholeDestroysLowAttack(): void {
  const blackhole = makeCreature('blackhole', 'Blackhole', 0, 4);
  blackhole.data.cost = 0;
  const weak1 = makeCreature('weak1', 'Weak1', 2, 3);
  const strong1 = makeCreature('strong1', 'Strong1', 4, 4);
  const weak2 = makeCreature('weak2', 'Weak2', 1, 5);
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [blackhole], field: [weak1] });
  const p2 = makePlayer({ field: [strong1, weak2] });
  const state = makeState(p1, p2, 'player1');

  const afterPlay = playCard(state, 'player1', blackhole.uid);
  // Blackhole itself has atk 0 <= 2, so it also dies
  const p1Alive = afterPlay.player1.field.map(c => c.data.id);
  const p2Alive = afterPlay.player2.field.map(c => c.data.id);
  expect(!p1Alive.includes('weak1'), 'weak1 (atk 2) should be destroyed by blackhole');
  expect(p2Alive.includes('strong1'), 'strong1 (atk 4) should survive blackhole');
  expect(!p2Alive.includes('weak2'), 'weak2 (atk 1) should be destroyed by blackhole');
}

function testDrakonIrtyshaDamagesAllEnemiesAndHero(): void {
  const drakon = makeCreature('drakon_irtysha', 'Drakon', 5, 5);
  drakon.data.cost = 0;
  const enemy1 = makeCreature('e1', 'E1', 1, 5);
  const enemy2 = makeCreature('e2', 'E2', 1, 4);
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [drakon] });
  const p2 = makePlayer({ health: 30, maxHealth: 30, field: [enemy1, enemy2] });
  const state = makeState(p1, p2, 'player1');

  const afterPlay = playCard(state, 'player1', drakon.uid);
  const e1After = afterPlay.player2.field.find(c => c.uid === enemy1.uid);
  const e2After = afterPlay.player2.field.find(c => c.uid === enemy2.uid);
  expect((e1After?.currentHealth ?? 0) === 2, `drakon should deal 3 to e1, got ${e1After?.currentHealth}`);
  expect((e2After?.currentHealth ?? 0) === 1, `drakon should deal 3 to e2, got ${e2After?.currentHealth}`);
  expect(afterPlay.player2.health === 27, `drakon should deal 3 to hero, got ${afterPlay.player2.health}`);
}

function testShaurmasterHealsOnETB(): void {
  const shaur = makeCreature('shaurmaster', 'Shaur', 2, 3);
  shaur.data.cost = 0;
  const p1 = makePlayer({ health: 20, maxHealth: 30, mana: 10, maxMana: 10, hand: [shaur] });
  const state = makeState(p1, makePlayer(), 'player1');

  const afterPlay = playCard(state, 'player1', shaur.uid);
  expect(afterPlay.player1.health === 22, `shaurmaster ETB should heal 2, got ${afterPlay.player1.health}`);
}

// === DEATH TRIGGERS ===

function testZhitelPodzemkiDealsDamageOnDeath(): void {
  const zhitel = makeCreature('zhitel_podzemki', 'Zhitel', 1, 1);
  zhitel.data.id = 'zhitel_podzemki';
  const attacker = makeCreature('attacker-z', 'Attacker', 3, 3);
  const p1 = makePlayer({ field: [attacker] });
  const p2 = makePlayer({ health: 30, maxHealth: 30, field: [zhitel] });
  const state = makeState(p1, p2, 'player1');

  const next = attackCreature(state, 'player1', attacker.uid, zhitel.uid);
  expect(next.player1.health === 28, `zhitel_podzemki death should deal 2 to opponent, got ${next.player1.health}`);
}

function testPisiner21DrawsOnDeath(): void {
  const pisiner = makeCreature('pisiner_21', 'Pisiner', 1, 1);
  pisiner.data.id = 'pisiner_21';
  const deckCard = makeCreature('p-deck', 'PDeck', 1, 1);
  const attacker = makeCreature('attacker-p', 'Attacker', 3, 3);
  const p1 = makePlayer({ field: [attacker] });
  const p2 = makePlayer({ field: [pisiner], deck: [deckCard] });
  const state = makeState(p1, p2, 'player1');

  const handBefore = state.player2.hand.length;
  const next = attackCreature(state, 'player1', attacker.uid, pisiner.uid);
  expect(next.player2.hand.length === handBefore + 1, 'pisiner_21 death should draw 1 card for owner');
}

function testShaurmasterHealsOnDeath(): void {
  const shaur = makeCreature('shaurmaster', 'Shaur', 1, 1);
  shaur.data.id = 'shaurmaster';
  const attacker = makeCreature('attacker-s', 'Attacker', 3, 3);
  const p1 = makePlayer({ field: [attacker] });
  const p2 = makePlayer({ health: 20, maxHealth: 30, field: [shaur] });
  const state = makeState(p1, p2, 'player1');

  const next = attackCreature(state, 'player1', attacker.uid, shaur.uid);
  expect(next.player2.health === 22, `shaurmaster death should heal owner 2, got ${next.player2.health}`);
}

// === ON-HIT / ON-KILL TRIGGERS ===

function testTenevoyOmichDiscardsOnHeroDamage(): void {
  const tenevoy = makeCreature('tenevoy_omich', 'Tenevoy', 2, 2);
  tenevoy.data.id = 'tenevoy_omich';
  tenevoy.summoningSickness = false;
  const enemyHandCard = makeCreature('enemy-card', 'EnemyCard', 1, 1);
  const p1 = makePlayer({ field: [tenevoy] });
  const p2 = makePlayer({ health: 30, maxHealth: 30, hand: [enemyHandCard] });
  const state = makeState(p1, p2, 'player1');

  const next = attackPlayer(state, 'player1', tenevoy.uid);
  expect(next.player2.hand.length === 0, 'tenevoy_omich should discard 1 card from enemy hand on hero damage');
  expect(next.player2.graveyard.some(c => c.uid === enemyHandCard.uid), 'discarded card should be in graveyard');
}

function testPiratIrtyshaDrawsOnHeroDamage(): void {
  const pirat = makeCreature('pirat_irtysha', 'Pirat', 2, 2);
  pirat.data.id = 'pirat_irtysha';
  pirat.summoningSickness = false;
  const deckCard = makeCreature('pirat-deck', 'PiratDeck', 1, 1);
  const p1 = makePlayer({ field: [pirat], deck: [deckCard] });
  const p2 = makePlayer({ health: 30, maxHealth: 30 });
  const state = makeState(p1, p2, 'player1');

  const handBefore = state.player1.hand.length;
  const next = attackPlayer(state, 'player1', pirat.uid);
  expect(next.player1.hand.length === handBefore + 1, 'pirat_irtysha should draw 1 card on hero damage');
}

function testMakefileGolemDrawsOnKill(): void {
  const golem = makeCreature('makefile_golem', 'Golem', 3, 3);
  golem.data.id = 'makefile_golem';
  golem.summoningSickness = false;
  const target = makeCreature('kill-target', 'Target', 0, 2);
  const deckCard = makeCreature('golem-deck', 'GolemDeck', 1, 1);
  const p1 = makePlayer({ field: [golem], deck: [deckCard] });
  const p2 = makePlayer({ field: [target] });
  const state = makeState(p1, p2, 'player1');

  const handBefore = state.player1.hand.length;
  const next = attackCreature(state, 'player1', golem.uid, target.uid);
  expect(next.player2.field.length === 0, 'target should die');
  expect(next.player1.hand.length === handBefore + 1, 'makefile_golem should draw 1 card on kill');
}

// === CORE MECHANICS ===

function testManaCostRejectsUnderfundedPlay(): void {
  const expensiveCreature = makeCreature('expensive', 'Expensive', 5, 5);
  expensiveCreature.data.cost = 5;
  const p1 = makePlayer({ mana: 3, maxMana: 3, hand: [expensiveCreature] });
  const state = makeState(p1, makePlayer(), 'player1');

  const afterPlay = playCard(state, 'player1', expensiveCreature.uid);
  expect(afterPlay === state, 'playing a card without enough mana should return unchanged state');
}

function testHandLimitBurnsOverflow(): void {
  const cards: CardInstance[] = [];
  for (let i = 0; i < 10; i++) {
    cards.push(makeCreature(`hand-${i}`, `HandCard${i}`, 1, 1));
  }
  const overflow = makeCreature('overflow', 'Overflow', 1, 1);
  const p1 = makePlayer({ hand: cards, deck: [overflow] });
  const log: string[] = [];
  drawCard(p1, log);
  expect(p1.hand.length === 10, 'hand should stay at 10');
  expect(p1.graveyard.some(c => c.uid === overflow.uid), 'overflow card should be burned to graveyard');
}

function testFieldLimitRejectsExtraCreature(): void {
  const fieldCards: CardInstance[] = [];
  for (let i = 0; i < 7; i++) {
    const c = makeCreature(`field-${i}`, `Field${i}`, 1, 1);
    c.summoningSickness = false;
    fieldCards.push(c);
  }
  const extra = makeCreature('extra', 'Extra', 2, 2);
  extra.data.cost = 0;
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [extra], field: fieldCards });
  const state = makeState(p1, makePlayer(), 'player1');

  const afterPlay = playCard(state, 'player1', extra.uid);
  expect(afterPlay === state, 'playing creature when field is full should return unchanged state');
}

function testDeckExhaustionDealsDamage(): void {
  const p1 = makePlayer({ health: 20, maxHealth: 30, deck: [] });
  const log: string[] = [];
  drawCard(p1, log);
  expect(p1.health === 18, `drawing from empty deck should deal 2 damage, got ${p1.health}`);
}

function testWinConditionOnHeroDeath(): void {
  const attacker = makeCreature('winner', 'Winner', 30, 5);
  attacker.summoningSickness = false;
  const p1 = makePlayer({ field: [attacker] });
  const p2 = makePlayer({ health: 10, maxHealth: 30 });
  const state = makeState(p1, p2, 'player1');

  const next = attackPlayer(state, 'player1', attacker.uid);
  expect(next.gameOver === true, 'game should be over when hero dies');
  expect(next.winner === 'player1', 'player1 should win when player2 hero dies');
}

function testLandPlayLimitedToOnePerTurn(): void {
  const land1 = makeCreature('land1', 'Land1', 0, 0);
  land1.data.type = 'land';
  land1.data.cost = 0;
  const land2 = makeCreature('land2', 'Land2', 0, 0);
  land2.data.type = 'land';
  land2.data.cost = 0;
  const p1 = makePlayer({ mana: 0, maxMana: 0, hand: [land1, land2] });
  const state = makeState(p1, makePlayer(), 'player1');

  const afterFirst = playCard(state, 'player1', land1.uid);
  expect(afterFirst.player1.maxMana === 1, 'first land should give +1 maxMana');

  const afterSecond = playCard(afterFirst, 'player1', land2.uid);
  expect(afterSecond === afterFirst, 'second land play should be rejected');
}

function testBabkaCanAttackWhenBuffed(): void {
  const babka = makeCreature('babka_semechki', 'Babka', 0, 3);
  babka.buffAttack = 1;
  babka.summoningSickness = false;

  const state = makeState(
    makePlayer({ field: [babka] }),
    makePlayer({ health: 20, maxHealth: 30 }),
    'player1'
  );

  const next = attackPlayer(state, 'player1', babka.uid);
  expect(next !== state, 'buffed babka should be able to attack');
  expect(next.player2.health === 19, `buffed babka should deal 1 damage, got ${next.player2.health}`);
}

function testBabkaRetaliatesWhenBuffed(): void {
  const babka = makeCreature('babka_semechki', 'Babka', 0, 3);
  babka.buffAttack = 1;
  const enemyAttacker = makeCreature('enemy-att', 'Enemy Attacker', 2, 3);
  enemyAttacker.summoningSickness = false;

  const state = makeState(
    makePlayer({ field: [babka] }),
    makePlayer({ field: [enemyAttacker] }),
    'player2'
  );

  const next = attackCreature(state, 'player2', enemyAttacker.uid, babka.uid);
  const nextEnemy = next.player2.field.find((c) => c.uid === enemyAttacker.uid);
  expect(Boolean(nextEnemy), 'enemy attacker should survive combat');
  expect((nextEnemy?.currentHealth ?? 0) === 2, 'buffed babka should deal 1 retaliation damage');
}

function testKeeperAttackReceivesRetaliationWhenDefenderNotFrozen(): void {
  const keeperAttacker = makeCreature('keeper-attacker', 'Keeper Attacker', 3, 4);
  keeperAttacker.summoningSickness = false;
  const playerDefender = makeCreature('player-defender', 'Player Defender', 2, 4);
  playerDefender.summoningSickness = false;

  const state = makeState(
    makePlayer({ field: [playerDefender] }),
    makePlayer({ field: [keeperAttacker] }),
    'player2'
  );

  const next = attackCreature(state, 'player2', keeperAttacker.uid, playerDefender.uid);
  const nextKeeper = next.player2.field.find((c) => c.uid === keeperAttacker.uid);
  const nextPlayer = next.player1.field.find((c) => c.uid === playerDefender.uid);

  expect(Boolean(nextKeeper), 'keeper attacker should remain on field');
  expect(Boolean(nextPlayer), 'player defender should remain on field');
  expect((nextKeeper?.currentHealth ?? 0) === 2, 'keeper attacker must receive retaliation damage');
  expect((nextPlayer?.currentHealth ?? 0) === 1, 'player defender should take incoming combat damage');
}

function testKeeperAttackIntoFrozenDefenderGetsNoRetaliation(): void {
  const keeperAttacker = makeCreature('keeper-attacker-2', 'Keeper Attacker 2', 3, 4);
  keeperAttacker.summoningSickness = false;
  const playerDefender = makeCreature('player-frozen-defender', 'Player Frozen Defender', 2, 4);
  playerDefender.frozen = 1;
  playerDefender.summoningSickness = false;

  const state = makeState(
    makePlayer({ field: [playerDefender] }),
    makePlayer({ field: [keeperAttacker] }),
    'player2'
  );

  const next = attackCreature(state, 'player2', keeperAttacker.uid, playerDefender.uid);
  const nextKeeper = next.player2.field.find((c) => c.uid === keeperAttacker.uid);
  const nextPlayer = next.player1.field.find((c) => c.uid === playerDefender.uid);

  expect(Boolean(nextKeeper), 'keeper attacker should remain on field');
  expect(Boolean(nextPlayer), 'frozen defender should remain on field');
  expect((nextKeeper?.currentHealth ?? 0) === 4, 'frozen defender should not retaliate');
  expect((nextPlayer?.frozen ?? -1) === 0, 'frozen defender should thaw after taking damage');
}

function testKhronikerIrtyshaTakesBestOfTopTwo(): void {
  const khroniker = makeCreature('khroniker_irtysha', 'Khroniker', 1, 4, ['defender']);
  khroniker.data.cost = 0;
  const cheap = makeCreature('cheap-top', 'Cheap Top', 1, 1);
  cheap.data.cost = 1;
  const expensive = makeCreature('exp-top', 'Exp Top', 1, 1);
  expensive.data.cost = 5;
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [khroniker], deck: [cheap, expensive] });
  const state = makeState(p1, makePlayer(), 'player1');

  const next = playCard(state, 'player1', khroniker.uid);
  expect(next.player1.hand.some((c) => c.uid === expensive.uid), 'khroniker should pick best card from top 2');
}

function testKontrolerTramvayaAppliesAttackDebuffOnHit(): void {
  const kontroler = makeCreature('kontroler_tramvaya', 'Kontroler', 2, 3, ['first_strike']);
  kontroler.summoningSickness = false;
  const defender = makeCreature('test-defender', 'Test Defender', 2, 4);
  const state = makeState(
    makePlayer({ field: [kontroler] }),
    makePlayer({ field: [defender] }),
    'player1'
  );
  const next = attackCreature(state, 'player1', kontroler.uid, defender.uid);
  const nextKontroler = next.player1.field.find((c) => c.uid === kontroler.uid);
  expect(Boolean(nextKontroler), 'kontroler should survive');
  expect((nextKontroler?.currentHealth ?? 0) === 2, 'kontroler should receive 1 retaliatory damage after debuff');
}

function testHimikNpzDeathDealsOneToAllCreatures(): void {
  const himik = makeCreature('himik_npz', 'Himik', 2, 1, ['deathtouch']);
  himik.currentAttack = 0;
  const ally = makeCreature('ally-himik', 'Ally', 1, 2);
  const enemyAttacker = makeCreature('enemy-killer', 'Enemy Killer', 2, 2);
  enemyAttacker.summoningSickness = false;
  const state = makeState(
    makePlayer({ field: [himik, ally] }),
    makePlayer({ field: [enemyAttacker] }),
    'player2'
  );
  const next = attackCreature(state, 'player2', enemyAttacker.uid, himik.uid);
  const nextAlly = next.player1.field.find((c) => c.uid === ally.uid);
  const nextEnemyAttacker = next.player2.field.find((c) => c.uid === enemyAttacker.uid);
  expect((nextAlly?.currentHealth ?? 0) === 1, 'himik death trigger should deal 1 to ally creature');
  expect((nextEnemyAttacker?.currentHealth ?? 0) === 1, 'himik death trigger should deal 1 to enemy creature');
}

function testShamanLukashBuffsOtherAllyOnEntry(): void {
  const shaman = makeCreature('shaman_lukash', 'Shaman', 3, 5, ['trample']);
  shaman.data.cost = 0;
  const ally = makeCreature('shaman-ally', 'Shaman Ally', 1, 2);
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [shaman], field: [ally] });
  const state = makeState(p1, makePlayer(), 'player1');
  const next = playCard(state, 'player1', shaman.uid);
  const nextAlly = next.player1.field.find((c) => c.uid === ally.uid);
  expect((nextAlly?.buffAttack ?? 0) === 1, 'shaman should grant +1 attack buff to another ally');
  expect((nextAlly?.currentHealth ?? 0) === 3, 'shaman should grant +1 health to another ally');
}

function testArkhivarDrawsOnSpellCast(): void {
  const arkhivar = makeCreature('arkhivar_omskoi_kreposti', 'Arkhivar', 2, 4, ['vigilance']);
  const spell = makeSpell('pivo_sibirskoe', 'Pivo');
  spell.data.cost = 0;
  const d1 = makeCreature('d1', 'D1', 1, 1);
  const d2 = makeCreature('d2', 'D2', 1, 1);
  const d3 = makeCreature('d3', 'D3', 1, 1);
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [spell], field: [arkhivar], deck: [d1, d2, d3] });
  const state = makeState(p1, makePlayer(), 'player1');
  const handBefore = state.player1.hand.length;
  const next = playCard(state, 'player1', spell.uid);
  expect(next.player1.hand.length >= handBefore + 2, 'arkhivar should add extra draw when spell is cast');
}

function testTumanNadIrtyshomFreezesUpToTwoAndDraws(): void {
  const tuman = makeSpell('tuman_nad_irtyshom', 'Tuman');
  tuman.data.cost = 0;
  const e1 = makeCreature('t1', 'T1', 1, 2);
  const e2 = makeCreature('t2', 'T2', 1, 2);
  const drawCardFromDeck = makeCreature('tuman-draw', 'Tuman Draw', 1, 1);
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [tuman], deck: [drawCardFromDeck] });
  const p2 = makePlayer({ field: [e1, e2] });
  const state = makeState(p1, p2, 'player1');
  const next = playCard(state, 'player1', tuman.uid);
  const frozenCount = next.player2.field.filter((c) => c.frozen >= 2).length;
  expect(frozenCount === 2, `tuman should freeze up to 2 targets, got ${frozenCount}`);
  expect(next.player1.hand.some((c) => c.uid === drawCardFromDeck.uid), 'tuman should draw a card');
}

function testSvodka112DealsTwoToCreatureThenOneToHeroIfSurvives(): void {
  const svodka = makeSpell('svodka_112', 'Svodka');
  svodka.data.cost = 0;
  const target = makeCreature('sv-target', 'SV Target', 2, 4);
  const p1 = makePlayer({ mana: 10, maxMana: 10, hand: [svodka] });
  const p2 = makePlayer({ health: 30, maxHealth: 30, field: [target] });
  const state = makeState(p1, p2, 'player1');
  const next = playCard(state, 'player1', svodka.uid);
  const nextTarget = next.player2.field.find((c) => c.uid === target.uid);
  expect((nextTarget?.currentHealth ?? 0) === 2, 'svodka should deal 2 damage to creature');
  expect(next.player2.health === 29, 'svodka should deal 1 hero damage if creature survives');
}

function testKlyatvaMetrostroyaHealsAtTurnStartWithThreeCreatures(): void {
  const klyatva = makeEnchantment('klyatva_metrostroya', 'Klyatva');
  const a = makeCreature('km-a', 'KM A', 1, 2);
  const b = makeCreature('km-b', 'KM B', 1, 2);
  const c = makeCreature('km-c', 'KM C', 1, 2);
  const deckCard = makeCreature('km-deck', 'KM Deck', 1, 1);
  const p1 = makePlayer({
    health: 20,
    maxHealth: 30,
    enchantments: [klyatva],
    field: [a, b, c],
    deck: [deckCard],
  });
  const state = makeState(p1, makePlayer(), 'player2');
  const next = endTurn(state);
  expect(next.player1.health === 22, 'klyatva should heal 2 at turn start with >=3 creatures');
}

function testGolosTelebashniForcesDiscardOnOpponentTurnStart(): void {
  const golos = makeEnchantment('golos_telebashni', 'Golos');
  const h1 = makeCreature('g-h1', 'G H1', 1, 1);
  const h2 = makeCreature('g-h2', 'G H2', 1, 1);
  const h3 = makeCreature('g-h3', 'G H3', 1, 1);
  const h4 = makeCreature('g-h4', 'G H4', 1, 1);
  const p1 = makePlayer({ enchantments: [golos] });
  const p2 = makePlayer({ hand: [h1, h2, h3, h4] });
  const state = makeState(p1, p2, 'player1');
  const next = endTurn(state);
  expect(next.player2.hand.length === 3, 'golos should force exactly one discard when hand >= 4');
  expect(next.player2.graveyard.length === 1, 'discarded card should move to graveyard');
}

function testPloshchadBuhgoltsaHealsOnThirdLandPlayed(): void {
  const l1 = makeLand('land1', 'Land 1');
  const l2 = makeLand('land2', 'Land 2');
  const ploshchad = makeLand('ploshchad_buhgoltsa', 'Ploshchad');
  const d1 = makeCreature('pb-d1', 'PB D1', 1, 1);
  const d2 = makeCreature('pb-d2', 'PB D2', 1, 1);
  const d3 = makeCreature('pb-d3', 'PB D3', 1, 1);
  const d4 = makeCreature('pb-d4', 'PB D4', 1, 1);
  const e1 = makeCreature('pb-e1', 'PB E1', 1, 1);
  const e2 = makeCreature('pb-e2', 'PB E2', 1, 1);
  const e3 = makeCreature('pb-e3', 'PB E3', 1, 1);
  const e4 = makeCreature('pb-e4', 'PB E4', 1, 1);
  const p1 = makePlayer({
    health: 20,
    maxHealth: 30,
    hand: [l1, l2, ploshchad],
    deck: [d1, d2, d3, d4],
  });
  const p2 = makePlayer({ deck: [e1, e2, e3, e4] });
  let state = makeState(p1, p2, 'player1');
  state = playCard(state, 'player1', l1.uid);
  state = endTurn(state);
  state = endTurn(state);
  state = playCard(state, 'player1', l2.uid);
  state = endTurn(state);
  state = endTurn(state);
  const afterThird = playCard(state, 'player1', ploshchad.uid);
  expect(afterThird.player1.maxMana === 3, 'third land should set max mana to 3');
  expect(afterThird.player1.health === 21, 'ploshchad should heal 1 when played as third land');
}

function run(): void {
  const tests: Array<{ name: string; fn: () => void }> = [
    { name: 'Frozen defender does not retaliate and thaws on hit', fn: testFrozenDefenderNoRetaliationAndThaw },
    { name: 'Lifelink heals only actual dealt damage', fn: testLifelinkHealsActualDamageOnly },
    { name: 'Deathtouch sets target HP to 0 and kills', fn: testDeathtouchSetsTargetToZeroAndKills },
    { name: 'AI turn returns attack actions list', fn: testAiReturnsAttackActions },
    { name: 'AI attacks creature when defender is present', fn: testAiAttacksDefenderWhenPresent },
    { name: 'Moroz -50 freezes for exactly one skipped enemy turn', fn: testMorozFreezeSkipsExactlyOneTurn },
    { name: 'Ledyanoy Veter freezes for exactly two skipped enemy turns', fn: testLedyanoyVeterSkipsTwoTurns },
    { name: 'Student OmGTU ETB reveals top deck card in log', fn: testStudentOmgtuEntryEffectLogsTopDeckCard },
    { name: 'Sneg Elemental freezes attacker only when damaged', fn: testSnegElementalFreezesOnlyWhenHit },
    { name: 'First strike kills before retaliation', fn: testFirstStrikeKillsBeforeRetaliation },
    { name: 'Trample deals only excess damage to hero', fn: testTrampleDealsOnlyExcessToHero },
    { name: 'Unblockable can hit hero through defender', fn: testUnblockableBypassesDefenderToHitHero },
    { name: 'Defender cannot attack hero or creature', fn: testDefenderCannotAttackHeroOrCreature },
    { name: 'Vigilance is not a mandatory defender', fn: testVigilanceIsNotMandatoryDefender },
    { name: 'Flying rules block ground attacker', fn: testCannotHitFlyingWithoutFlying },
    // Haste & Hexproof
    { name: 'Haste bypasses summoning sickness', fn: testHasteBypassesSummoningSickness },
    { name: 'Summoning sickness blocks attack', fn: testSummoningSicknessBlocksAttack },
    { name: 'Hexproof blocks spell targeting', fn: testHexproofBlocksSpellTargeting },
    { name: 'Hexproof does not block combat', fn: testHexproofDoesNotBlockCombat },
    // ETB triggers
    { name: 'Bird Omsk draws on ETB', fn: testBirdOmskDrawsOnETB },
    { name: 'Marshrutchik AoE 1 on ETB', fn: testMarshrutchikAoEOnETB },
    { name: 'Mer Omska spawns 2 tokens on ETB', fn: testMerOmskSpawnsTokens },
    { name: 'Blackhole destroys atk<=2 creatures', fn: testBlackholeDestroysLowAttack },
    { name: 'Drakon Irtysha 3 dmg all enemies+hero', fn: testDrakonIrtyshaDamagesAllEnemiesAndHero },
    { name: 'Shaurmaster heals 2 on ETB', fn: testShaurmasterHealsOnETB },
    // Death triggers
    { name: 'Zhitel Podzemki deals 2 to opponent on death', fn: testZhitelPodzemkiDealsDamageOnDeath },
    { name: 'Pisiner 21 draws on death', fn: testPisiner21DrawsOnDeath },
    { name: 'Shaurmaster heals 2 on death', fn: testShaurmasterHealsOnDeath },
    // On-hit / on-kill triggers
    { name: 'Tenevoy Omich discards on hero damage', fn: testTenevoyOmichDiscardsOnHeroDamage },
    { name: 'Pirat Irtysha draws on hero damage', fn: testPiratIrtyshaDrawsOnHeroDamage },
    { name: 'Makefile Golem draws on kill', fn: testMakefileGolemDrawsOnKill },
    // Core mechanics
    { name: 'Mana cost rejects underfunded play', fn: testManaCostRejectsUnderfundedPlay },
    { name: 'Hand limit (10) burns overflow', fn: testHandLimitBurnsOverflow },
    { name: 'Field limit (7) rejects extra creature', fn: testFieldLimitRejectsExtraCreature },
    { name: 'Deck exhaustion deals 2 damage', fn: testDeckExhaustionDealsDamage },
    { name: 'Win condition on hero death', fn: testWinConditionOnHeroDeath },
    { name: 'Land play limited to 1 per turn', fn: testLandPlayLimitedToOnePerTurn },
    { name: 'Babka can attack when buffed', fn: testBabkaCanAttackWhenBuffed },
    { name: 'Babka retaliates when buffed', fn: testBabkaRetaliatesWhenBuffed },
    { name: 'Keeper attack gets retaliation when defender is not frozen', fn: testKeeperAttackReceivesRetaliationWhenDefenderNotFrozen },
    { name: 'Keeper attack gets no retaliation when defender is frozen', fn: testKeeperAttackIntoFrozenDefenderGetsNoRetaliation },
    { name: 'Khroniker Irtysha ETB selects best of top two', fn: testKhronikerIrtyshaTakesBestOfTopTwo },
    { name: 'Kontroler Tramvaya applies -1 atk debuff on attack', fn: testKontrolerTramvayaAppliesAttackDebuffOnHit },
    { name: 'Himik NPZ death trigger deals 1 to all creatures', fn: testHimikNpzDeathDealsOneToAllCreatures },
    { name: 'Shaman Lukash ETB buffs another ally', fn: testShamanLukashBuffsOtherAllyOnEntry },
    { name: 'Arkhivar draws when a spell is cast', fn: testArkhivarDrawsOnSpellCast },
    { name: 'Tuman Nad Irtyshom freezes up to 2 and draws', fn: testTumanNadIrtyshomFreezesUpToTwoAndDraws },
    { name: 'Svodka 112 deals 2 to creature then 1 to hero if survives', fn: testSvodka112DealsTwoToCreatureThenOneToHeroIfSurvives },
    { name: 'Klyatva Metrostroya heals at turn start with 3+ creatures', fn: testKlyatvaMetrostroyaHealsAtTurnStartWithThreeCreatures },
    { name: 'Golos Telebashni forces discard at opponent turn start', fn: testGolosTelebashniForcesDiscardOnOpponentTurnStart },
    { name: 'Ploshchad Buhgoltsa heals when played as third land', fn: testPloshchadBuhgoltsaHealsOnThirdLandPlayed },
  ];

  for (const t of tests) {
    t.fn();
    console.log(`PASS: ${t.name}`);
  }
  console.log(`Combat regression: ${tests.length}/${tests.length} tests passed`);
}

run();
