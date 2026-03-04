import { GameState } from './types';
import { endTurn as endTurnImpl } from './engine.impl';

export function endTurn(state: GameState): GameState {
  return endTurnImpl(state);
}
