import { GameState, PlayerState } from './types';
import {
  createInitialGameState as createInitialGameStateImpl,
  drawCard as drawCardImpl,
  playCard as playCardImpl,
} from './engine.impl';

export function createInitialGameState(): GameState {
  return createInitialGameStateImpl();
}

export function playCard(
  state: GameState,
  playerKey: 'player1' | 'player2',
  cardUid: string
): GameState {
  return playCardImpl(state, playerKey, cardUid);
}

export function drawCard(player: PlayerState, log: string[]): boolean {
  return drawCardImpl(player, log);
}
