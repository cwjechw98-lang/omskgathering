import type { GameState } from './types';
import type { ReplayAction } from './replay';
import {
  createInitialGameState,
  playCard,
  attackCreature,
  attackPlayer,
  endTurn,
  drawCard,
} from './engine';

/**
 * Run a replay sequence and return final game state
 */
export function runReplay(actions: ReplayAction[]): GameState {
  let state = createInitialGameState();

  for (const action of actions) {
    try {
      state = applyReplayAction(state, action);
    } catch (error) {
      // Add error context for debugging
      const errorMsg = `Error applying replay action ${action.type} at turn ${action.turn}: ${error}`;
      state.log.push(errorMsg);
      throw new Error(errorMsg);
    }
  }

  return state;
}

/**
 * Apply a single replay action to game state
 */
function applyReplayAction(state: GameState, action: ReplayAction): GameState {
  switch (action.type) {
    case 'PLAY_CARD': {
      if (!action.cardId) {
        throw new Error('PLAY_CARD requires cardId');
      }
      // Just try to play the card - it will fail if not valid
      try {
        return playCard(state, action.player, action.cardId);
      } catch {
        // Card might not exist in this replay context, skip
        return state;
      }
    }

    case 'ATTACK_CREATURE': {
      if (!action.sourceId || !action.targetId) {
        throw new Error('ATTACK_CREATURE requires sourceId and targetId');
      }
      try {
        return attackCreature(state, action.player, action.sourceId, action.targetId);
      } catch {
        return state;
      }
    }

    case 'ATTACK_PLAYER': {
      if (!action.sourceId) {
        throw new Error('ATTACK_PLAYER requires sourceId');
      }
      try {
        return attackPlayer(state, action.player, action.sourceId);
      } catch {
        return state;
      }
    }

    case 'END_TURN': {
      return endTurn(state);
    }

    case 'DRAW_CARD': {
      const next = { ...state };
      const playerKey = action.player;
      drawCard(next[playerKey], next.log);
      return next;
    }

    case 'PLAY_LAND': {
      if (!action.cardId) {
        throw new Error('PLAY_LAND requires cardId');
      }
      try {
        return playCard(state, action.player, action.cardId);
      } catch {
        return state;
      }
    }

    default:
      throw new Error(`Unknown replay action type: ${(action as ReplayAction).type}`);
  }
}

/**
 * Validate replay actions
 */
export function validateReplay(actions: ReplayAction[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];

    // Check required fields
    if (!action.type) {
      errors.push(`Action ${i}: missing type`);
    }
    if (!action.player) {
      errors.push(`Action ${i}: missing player`);
    }
    if (action.turn === undefined) {
      errors.push(`Action ${i}: missing turn`);
    }

    // Check action-specific requirements
    if (action.type === 'PLAY_CARD' && !action.cardId) {
      errors.push(`Action ${i}: PLAY_CARD requires cardId`);
    }
    if (action.type === 'ATTACK_CREATURE' && (!action.sourceId || !action.targetId)) {
      errors.push(`Action ${i}: ATTACK_CREATURE requires sourceId and targetId`);
    }
    if (action.type === 'ATTACK_PLAYER' && !action.sourceId) {
      errors.push(`Action ${i}: ATTACK_PLAYER requires sourceId`);
    }
  }

  return { valid: errors.length === 0, errors };
}
