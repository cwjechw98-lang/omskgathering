import { describe, it, expect } from 'vitest';
import { runReplay, validateReplay } from '../../src/game/replayRunner';
import type { ReplayAction } from '../../src/game/replay';

describe('Replay regression tests', () => {
  it('should validate replay structure', () => {
    const validReplay: ReplayAction[] = [
      {
        type: 'PLAY_CARD',
        player: 'player1',
        cardId: 'bird_omsk',
        turn: 1,
      },
      {
        type: 'END_TURN',
        player: 'player1',
        turn: 1,
      },
    ];

    const validation = validateReplay(validReplay);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should handle invalid replay with errors', () => {
    const invalidReplay: ReplayAction[] = [
      {
        type: 'PLAY_CARD',
        player: 'player1',
        // Missing cardId
        turn: 1,
      } as any,
    ];

    const validation = validateReplay(invalidReplay);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it('should be deterministic - same replay produces same result', () => {
    const replay: ReplayAction[] = [
      {
        type: 'END_TURN',
        player: 'player1',
        turn: 1,
      },
      {
        type: 'END_TURN',
        player: 'player2',
        turn: 1,
      },
    ];

    // Run replay twice
    const result1 = runReplay(replay);
    const result2 = runReplay(replay);

    // Results should be identical (deterministic)
    expect(result1.turnNumber).toBe(result2.turnNumber);
    expect(result1.player1.health).toBe(result2.player1.health);
    expect(result2.player2.health).toBe(result2.player2.health);
    expect(result1.player1.hand.length).toBe(result2.player1.hand.length);
    expect(result1.player2.hand.length).toBe(result2.player2.hand.length);
  });

  it('should replay end turn sequence', () => {
    const replay: ReplayAction[] = [
      {
        type: 'END_TURN',
        player: 'player1',
        turn: 1,
      },
      {
        type: 'END_TURN',
        player: 'player2',
        turn: 1,
      },
      {
        type: 'END_TURN',
        player: 'player1',
        turn: 2,
      },
    ];

    const finalState = runReplay(replay);
    expect(finalState).toBeDefined();
    expect(finalState.turnNumber).toBeGreaterThanOrEqual(2);
  });

  it('should handle unknown cards gracefully', () => {
    const replay: ReplayAction[] = [
      {
        type: 'PLAY_CARD',
        player: 'player1',
        cardId: 'nonexistent_card',
        turn: 1,
      },
      {
        type: 'END_TURN',
        player: 'player1',
        turn: 1,
      },
    ];

    // Should not throw, just skip invalid actions
    const finalState = runReplay(replay);
    expect(finalState).toBeDefined();
  });

  it('should validate all action types', () => {
    const allTypes: ReplayAction[] = [
      { type: 'PLAY_CARD', player: 'player1', cardId: 'x', turn: 1 },
      { type: 'ATTACK_CREATURE', player: 'player1', sourceId: 'a', targetId: 'b', turn: 1 },
      { type: 'ATTACK_PLAYER', player: 'player1', sourceId: 'a', turn: 1 },
      { type: 'END_TURN', player: 'player1', turn: 1 },
      { type: 'DRAW_CARD', player: 'player1', turn: 1 },
      { type: 'PLAY_LAND', player: 'player1', cardId: 'x', turn: 1 },
    ];

    const validation = validateReplay(allTypes);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
