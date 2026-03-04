import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  attackCreature,
  attackPlayer,
  createCardInstance,
  drawCard,
  endTurn,
  playCard,
} from '../../src/game/engine';
import type { CardData, Keyword } from '../../src/data/cards';
import type { CardInstance, GameState, PlayerState } from '../../src/game/types';

const PROPERTY_RUNS = 500;

const keywordPool: Keyword[] = [
  'haste',
  'defender',
  'flying',
  'trample',
  'lifelink',
  'deathtouch',
  'vigilance',
  'first_strike',
  'hexproof',
  'unblockable',
];

const keywordArb = fc.constantFrom<Keyword>(...keywordPool);
const keywordsArb = fc.uniqueArray(keywordArb, { maxLength: 4 });

let seq = 0;

function makeCreature(
  attack: number,
  health: number,
  keywords: Keyword[] = [],
  suffix = 'creature'
): CardInstance {
  seq += 1;
  const data: CardData = {
    id: `prop_${suffix}_${seq}`,
    name: `Property Creature ${seq}`,
    cost: 1,
    color: 'white',
    type: 'creature',
    attack,
    health,
    description: 'property test creature',
    flavor: 'property test creature',
    emoji: '🧪',
    keywords,
    rarity: 'common',
  };
  const card = createCardInstance(data);
  card.summoningSickness = false;
  card.hasAttacked = false;
  return card;
}

function makeState(
  player1: PlayerState,
  player2: PlayerState,
  currentTurn: 'player1' | 'player2' = 'player1'
): GameState {
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

function fieldCreaturesFromState(state: GameState): CardInstance[] {
  return [...state.player1.field, ...state.player2.field].filter(
    (c) => c.data.type === 'creature'
  );
}

describe('Game engine property invariants', () => {
  it('HP существ никогда не может быть меньше 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 12 }),
        fc.integer({ min: 1, max: 12 }),
        keywordsArb,
        keywordsArb,
        (attackerAttack, defenderHealth, attackerKeywords, defenderKeywords) => {
          const attacker = makeCreature(attackerAttack, 12, attackerKeywords, 'attacker');
          const defender = makeCreature(6, defenderHealth, defenderKeywords, 'defender');
          const state = makeState(
            makePlayer({ field: [attacker] }),
            makePlayer({ field: [defender] }),
            'player1'
          );

          const next = attackCreature(state, 'player1', attacker.uid, defender.uid);
          const activeCreatures = fieldCreaturesFromState(next);
          expect(activeCreatures.every((c) => c.currentHealth >= 0)).toBe(true);
        }
      ),
      { numRuns: PROPERTY_RUNS }
    );
  });

  it('Существа с HP = 0 должны удаляться с поля', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 12 }),
        keywordsArb,
        (defenderHealth, attackerBonusAttack, defenderKeywords) => {
          const attacker = makeCreature(
            defenderHealth + attackerBonusAttack,
            8,
            ['haste'],
            'killer'
          );
          const defender = makeCreature(2, defenderHealth, defenderKeywords, 'target');
          const state = makeState(
            makePlayer({ field: [attacker] }),
            makePlayer({ field: [defender] }),
            'player1'
          );

          const next = attackCreature(state, 'player1', attacker.uid, defender.uid);
          const anyZeroOrLessOnField = [...next.player1.field, ...next.player2.field].some(
            (c) => c.currentHealth <= 0
          );

          expect(anyZeroOrLessOnField).toBe(false);
        }
      ),
      { numRuns: PROPERTY_RUNS }
    );
  });

  it('Существо не может атаковать более одного раза за ход', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 8 }), fc.integer({ min: 2, max: 20 }), (attack, hp) => {
        const attacker = makeCreature(attack, hp, ['haste'], 'single-attack');
        const state = makeState(
          makePlayer({ field: [attacker] }),
          makePlayer({ health: 200, maxHealth: 200 }),
          'player1'
        );

        const afterFirstAttack = attackPlayer(state, 'player1', attacker.uid);
        const afterSecondAttack = attackPlayer(afterFirstAttack, 'player1', attacker.uid);

        expect(afterSecondAttack).toEqual(afterFirstAttack);
      }),
      { numRuns: PROPERTY_RUNS }
    );
  });

  it('Размер колоды не может быть отрицательным', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 25 }),
        fc.integer({ min: 0, max: 60 }),
        keywordsArb,
        (initialDeckSize, drawAttempts, generatedKeywords) => {
          const deck = Array.from({ length: initialDeckSize }, (_, i) =>
            makeCreature(1, 1, generatedKeywords, `deck_${i}`)
          );
          const player = makePlayer({ deck });
          const log: string[] = [];

          for (let i = 0; i < drawAttempts; i += 1) {
            drawCard(player, log);
          }

          expect(player.deck.length).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: PROPERTY_RUNS }
    );
  });

  it('Mana игрока не может быть отрицательной', () => {
    const actionArb = fc.array(fc.constantFrom<'play' | 'end'>('play', 'end'), {
      minLength: 1,
      maxLength: 40,
    });

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.array(
          fc.record({
            cost: fc.integer({ min: 0, max: 10 }),
            attack: fc.integer({ min: 0, max: 6 }),
            health: fc.integer({ min: 1, max: 8 }),
            keywords: keywordsArb,
          }),
          { minLength: 0, maxLength: 12 }
        ),
        actionArb,
        (startMana, cardSpecs, actions) => {
          const hand = cardSpecs.map((spec, idx) => {
            const card = makeCreature(spec.attack, spec.health, spec.keywords, `hand_${idx}`);
            card.data.cost = spec.cost;
            return card;
          });

          let state = makeState(
            makePlayer({ mana: startMana, maxMana: Math.max(startMana, 1), hand }),
            makePlayer({ mana: startMana, maxMana: Math.max(startMana, 1) }),
            'player1'
          );

          for (const action of actions) {
            if (action === 'play' && state.player1.hand.length > 0) {
              state = playCard(state, 'player1', state.player1.hand[0].uid);
            } else {
              state = endTurn(state);
              state = endTurn(state);
            }

            expect(state.player1.mana).toBeGreaterThanOrEqual(0);
            expect(state.player2.mana).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: PROPERTY_RUNS }
    );
  });
});
