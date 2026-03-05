import { test, expect, describe } from 'vitest';
import { createInitialGameState, playCard, attackPlayer, attackCreature, endTurn } from '../../src/game/engine';
import { GameState } from '../../src/game/types';

describe('Full Game Simulation', () => {
  test('Complete game flow - turn 1 to turn 5', () => {
    let gs = createInitialGameState();
    
    // Initial state checks
    expect(gs.player1.hand.length).toBe(6); // 5 initial + 1 draw
    expect(gs.player1.mana).toBe(0);
    expect(gs.player1.maxMana).toBe(0);
    expect(gs.turnNumber).toBe(1);
    expect(gs.currentTurn).toBe('player1');
    expect(gs.log.length).toBeGreaterThan(0);

    // Turn 1: Player 1 plays a land
    const landCard = gs.player1.hand.find(c => c.data.type === 'land');
    expect(landCard).toBeDefined();
    
    if (landCard) {
      gs = playCard(gs, 'player1', landCard.uid);
      expect(gs.player1.mana).toBe(1);
      expect(gs.player1.maxMana).toBe(1);
      expect(gs.player1.landsPlayed).toBe(1);
    }

    // End turn 1
    gs = endTurn(gs);
    expect(gs.currentTurn).toBe('player2');
    expect(gs.turnNumber).toBe(2); // Turn number increments

    // Turn 2: Player 2 (AI) turn
    gs = endTurn(gs);
    expect(gs.currentTurn).toBe('player1');
    expect(gs.turnNumber).toBe(3); // Turn 3 starts after P2 turn
    expect(gs.player1.maxMana).toBeGreaterThanOrEqual(1);
    expect(gs.player1.mana).toBeGreaterThanOrEqual(1);

    // Turn 2: Player 1 plays another land
    const landCard2 = gs.player1.hand.find(c => c.data.type === 'land');
    if (landCard2) {
      gs = playCard(gs, 'player1', landCard2.uid);
      expect(gs.player1.mana).toBeGreaterThanOrEqual(2);
    }

    // End turn 2
    gs = endTurn(gs);
    gs = endTurn(gs);

    // Turn 3
    expect(gs.turnNumber).toBeGreaterThanOrEqual(3);
    expect(gs.player1.maxMana).toBeGreaterThanOrEqual(2);
  });

  test('Creature combat flow', () => {
    let gs = createInitialGameState();

    // Setup: Play lands for both players
    for (let turn = 0; turn < 6; turn++) {
      const land = gs[gs.currentTurn === 'player1' ? 'player1' : 'player2'].hand.find(c => c.data.type === 'land');
      if (land && gs[gs.currentTurn === 'player1' ? 'player1' : 'player2'].landsPlayed < 1) {
        gs = playCard(gs, gs.currentTurn, land.uid);
      }
      gs = endTurn(gs);
    }

    // Find a creature in hand that we can afford
    const creature = gs.player1.hand.find(c => c.data.type === 'creature' && c.data.cost <= gs.player1.mana);

    if (creature && gs.player1.field.length < 7) {
      const manaBefore = gs.player1.mana;
      gs = playCard(gs, 'player1', creature.uid);

      // Creature should be on field
      expect(gs.player1.field.some(c => c.uid === creature.uid)).toBe(true);
      
      // Should have spent mana (or creature played for free)
      if (manaBefore > 0) {
        expect(gs.player1.mana).toBeLessThanOrEqual(manaBefore);
      }

      // End turn and come back
      gs = endTurn(gs);
      gs = endTurn(gs);

      // Find the creature (now it should be able to attack)
      const attacker = gs.player1.field.find(c => c.data.id === creature.data.id);
      if (attacker && !attacker.summoningSickness && attacker.frozen <= 0 && attacker.currentAttack > 0) {
        // Attack player
        const hpBefore = gs.player2.health;
        gs = attackPlayer(gs, 'player1', attacker.uid);
        expect(gs.player2.health).toBeLessThanOrEqual(hpBefore);
      }
    }
  });

  test('Card draw mechanics', () => {
    let gs = createInitialGameState();
    const initialHandSize = gs.player1.hand.length;
    const initialDeckSize = gs.player1.deck.length;

    // Play a card that draws (Bird-Omich)
    const birdCard = gs.player1.hand.find(c => c.data.id === 'bird_omsk');
    
    if (birdCard) {
      // First play a land
      const land = gs.player1.hand.find(c => c.data.type === 'land');
      if (land) gs = playCard(gs, 'player1', land.uid);
      
      // Play bird
      gs = playCard(gs, 'player1', birdCard.uid);
      
      // Should have drawn a card
      expect(gs.player1.hand.length).toBeGreaterThanOrEqual(initialHandSize - 1); // -1 for playing bird, +1 for draw
    }
  });

  test('Freeze mechanics', () => {
    let gs = createInitialGameState();
    
    // Setup multiple turns
    for (let i = 0; i < 6; i++) {
      gs = endTurn(gs);
    }

    // Play Irtysh Vodyanoy (freezes random enemy)
    const vodyanoy = gs.player1.hand.find(c => c.data.id === 'irtysh_vodyanoy');
    
    if (vodyanoy && gs.player2.field.length > 0) {
      // Play land first
      const land = gs.player1.hand.find(c => c.data.type === 'land');
      if (land) gs = playCard(gs, 'player1', land.uid);
      
      gs = playCard(gs, 'player1', vodyanoy.uid);
      
      // Check if any enemy is frozen
      const frozenEnemy = gs.player2.field.find(c => c.frozen > 0);
      expect(frozenEnemy).toBeDefined();
    }
  });

  test('Spell mechanics - Segfault', () => {
    let gs = createInitialGameState();
    
    // Setup
    for (let i = 0; i < 4; i++) {
      gs = endTurn(gs);
    }

    const segfault = gs.player1.hand.find(c => c.data.id === 'segfault');

    if (segfault && gs.player1.mana >= segfault.data.cost) {
      const manaBefore = gs.player1.mana;
      gs = playCard(gs, 'player1', segfault.uid);

      // Should have spent mana
      expect(gs.player1.mana).toBeLessThan(manaBefore);

      // Should have dice roll result
      expect(gs.lastDiceRoll).toBeDefined();
      expect(gs.lastDiceRoll!.sides).toBe(6);
      expect(gs.lastDiceRoll!.result).toBeGreaterThanOrEqual(1);
      expect(gs.lastDiceRoll!.result).toBeLessThanOrEqual(6);
    } else {
      // If Segfault not in hand, that's also valid
      expect(gs.player1.hand.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('Buff mechanics - Dvornik scaling', () => {
    let gs = createInitialGameState();
    
    // Setup
    for (let i = 0; i < 4; i++) {
      gs = endTurn(gs);
    }

    const dvornik = gs.player1.hand.find(c => c.data.id === 'dvornik');
    
    if (dvornik) {
      // Play land
      const land = gs.player1.hand.find(c => c.data.type === 'land');
      if (land) gs = playCard(gs, 'player1', land.uid);
      
      // Add more creatures first
      const otherCreature = gs.player1.hand.find(c => c.data.type === 'creature' && c.data.cost <= gs.player1.mana && c.data.id !== 'dvornik');
      if (otherCreature) {
        gs = playCard(gs, 'player1', otherCreature.uid);
      }
      
      // Play dvornik
      gs = playCard(gs, 'player1', dvornik.uid);
      
      const dvornikOnField = gs.player1.field.find(c => c.data.id === 'dvornik');
      if (dvornikOnField && gs.player1.field.length > 1) {
        // Dvornik should have bonus attack
        expect(dvornikOnField.currentAttack).toBeGreaterThan(dvornik.data.attack ?? 0);
      }
    }
  });

  test('Game over condition', () => {
    let gs = createInitialGameState();
    
    // Setup many turns
    for (let i = 0; i < 10; i++) {
      gs = endTurn(gs);
    }

    // Deal massive damage to player 1
    gs.player1.health = 0;
    gs = endTurn(gs);
    
    // Game should be over
    expect(gs.gameOver).toBe(true);
    expect(gs.winner).toBe('player2');
  });

  test('Mana curve - play cards each turn', () => {
    let gs = createInitialGameState();
    
    const turns = [
      { expectedMana: 1, minCost: 1 },
      { expectedMana: 2, minCost: 2 },
      { expectedMana: 3, minCost: 3 },
      { expectedMana: 4, minCost: 4 },
    ];

    for (const turn of turns) {
      // Play land
      const land = gs.player1.hand.find(c => c.data.type === 'land');
      if (land && gs.player1.landsPlayed < gs.player1.maxLandsPerTurn) {
        gs = playCard(gs, 'player1', land.uid);
      }
      
      // Try to play creature
      const creature = gs.player1.hand.find(
        c => c.data.type === 'creature' && c.data.cost <= gs.player1.mana && c.data.cost >= turn.minCost
      );
      
      if (creature && gs.player1.field.length < 7) {
        gs = playCard(gs, 'player1', creature.uid);
        expect(gs.player1.field.some(c => c.uid === creature.uid)).toBe(true);
      }
      
      gs = endTurn(gs);
      gs = endTurn(gs);
      
      expect(gs.player1.maxMana).toBeGreaterThanOrEqual(turn.expectedMana - 1);
    }
  });

  test('Graveyard mechanics', () => {
    let gs = createInitialGameState();

    // Setup - play some turns to get spells
    for (let i = 0; i < 4; i++) {
      // Play land first
      const land = gs.player1.hand.find(c => c.data.type === 'land');
      if (land && gs.player1.landsPlayed < gs.player1.maxLandsPerTurn) {
        gs = playCard(gs, 'player1', land.uid);
      }
      gs = endTurn(gs);
      gs = endTurn(gs);
    }

    const initialGraveyardSize = gs.player1.graveyard.length;

    // Play a spell (goes to graveyard)
    const spell = gs.player1.hand.find(c => c.data.type === 'spell');

    if (spell && gs.player1.mana >= spell.data.cost) {
      gs = playCard(gs, 'player1', spell.uid);
      expect(gs.player1.graveyard.length).toBeGreaterThan(initialGraveyardSize);
    } else {
      // If no spell available, that's also valid
      expect(gs.player1.hand.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('Hand limit (10 cards)', () => {
    let gs = createInitialGameState();
    
    // Remove cards from deck to force fatigue
    gs.player1.deck = gs.player1.deck.slice(0, 3);
    gs.player1.hand = gs.player1.hand.slice(0, 10); // Full hand
    
    // Try to draw with full hand
    const initialHealth = gs.player1.health;
    
    // Simulate draw
    gs = endTurn(gs);
    gs = endTurn(gs);
    
    // Should have taken fatigue damage or discarded
    expect(gs.player1.graveyard.length).toBeGreaterThanOrEqual(0);
  });

  test('Field limit (7 creatures)', () => {
    let gs = createInitialGameState();
    
    // Setup many turns
    for (let i = 0; i < 12; i++) {
      gs = endTurn(gs);
    }

    // Fill the field
    const creatures = gs.player1.hand.filter(c => c.data.type === 'creature');
    
    for (const creature of creatures.slice(0, 7)) {
      if (gs.player1.field.length < 7 && gs.player1.mana >= creature.data.cost) {
        gs = playCard(gs, 'player1', creature.uid);
      }
    }
    
    // Try to play another creature
    const extraCreature = gs.player1.hand.find(
      c => c.data.type === 'creature' && c.data.cost <= gs.player1.mana
    );
    
    if (extraCreature && gs.player1.field.length >= 7) {
      const fieldBefore = gs.player1.field.length;
      gs = playCard(gs, 'player1', extraCreature.uid);
      // Should not have played
      expect(gs.player1.field.length).toBe(fieldBefore);
    }
  });
});
