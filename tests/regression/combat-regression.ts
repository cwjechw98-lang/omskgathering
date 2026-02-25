import { attackCreature, attackPlayer, createCardInstance, endTurn, playCard } from '../../src/game/engine';
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
  ];

  for (const t of tests) {
    t.fn();
    console.log(`PASS: ${t.name}`);
  }
  console.log(`Combat regression: ${tests.length}/${tests.length} tests passed`);
}

run();
