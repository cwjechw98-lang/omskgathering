/**
 * Зонд: что происходит при попытке атаковать существо с атакой 0.
 *
 * Запуск: node scripts/probe-zero-attack.mjs
 *
 * Скрипт сам собирает regression-сборку и помечает её как CommonJS. Без этого шага
 * зонд читает устаревшие файлы: `.tmp-regression` остаётся от прошлого прогона, а
 * свежий `tsc` без пометки `"type":"commonjs"` даёт ESM, который `require` не берёт.
 * Именно на этом я потерял время — вывод зонда показывал поведение старого кода.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const OUT = '.tmp-regression';

execFileSync('npx', ['tsc', '-p', 'tsconfig.regression.json'], { stdio: 'inherit' });
writeFileSync(`${OUT}/package.json`, JSON.stringify({ type: 'commonjs' }));

const require = createRequire(import.meta.url);
const { attackPlayer, attackCreature } = require('../.tmp-regression/src/game/combat.js');
const { createCardInstance } = require('../.tmp-regression/src/game/state.js');

function makeCard(attack, health, keywords = []) {
  const card = createCardInstance({
    id: 'babka_semechki',
    name: 'Babka',
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
  });
  card.summoningSickness = false;
  card.hasAttacked = false;
  return card;
}

function makePlayer(field) {
  return {
    health: 20,
    maxHealth: 30,
    mana: 0,
    maxMana: 0,
    deck: [],
    hand: [],
    field,
    graveyard: [],
    enchantments: [],
    landsPlayed: 0,
    maxLandsPerTurn: 1,
    fatigue: 0,
  };
}

function makeState(p1, p2, currentTurn) {
  return {
    player1: p1,
    player2: p2,
    currentTurn,
    turnNumber: 1,
    phase: 'main',
    gameOver: false,
    winner: null,
    log: [],
    cantAttackNextTurn: false,
    lastDiceRoll: null,
    aiComment: null,
    mulliganPhase: false,
    mulliganCount: 0,
    player1Keeping: null,
    player2Keeping: null,
  };
}

function probe(label, fn) {
  console.log(`\n=== ${label} ===`);
  const result = fn();
  console.log('состояние изменилось:', result.changed);
  console.log('лог:', JSON.stringify(result.log));
  console.log('здоровье врага:', result.enemyHealth);
  console.log('hasAttacked:', result.attacked);
}

probe('атака героя существом 0/3 без баффа', () => {
  const babka = makeCard(0, 3);
  const state = makeState(makePlayer([babka]), makePlayer([]), 'player1');
  const next = attackPlayer(state, 'player1', babka.uid);
  return {
    changed: next !== state,
    log: next.log,
    enemyHealth: next.player2.health,
    attacked: next.player1.field[0]?.hasAttacked,
  };
});

probe('та же карта с +1 атаки', () => {
  const babka = makeCard(0, 3);
  babka.buffAttack = 1;
  const state = makeState(makePlayer([babka]), makePlayer([]), 'player1');
  const next = attackPlayer(state, 'player1', babka.uid);
  return {
    changed: next !== state,
    log: next.log,
    enemyHealth: next.player2.health,
    attacked: next.player1.field[0]?.hasAttacked,
  };
});

probe('атака существа существом 0/3', () => {
  const babka = makeCard(0, 3);
  const target = makeCard(2, 3);
  const state = makeState(makePlayer([babka]), makePlayer([target]), 'player1');
  const next = attackCreature(state, 'player1', babka.uid, target.uid);
  return {
    changed: next !== state,
    log: next.log,
    enemyHealth: next.player2.health,
    attacked: next.player1.field[0]?.hasAttacked,
  };
});
