import { GameState } from './types';
import { attackCreature as attackCreatureImpl, attackPlayer as attackPlayerImpl } from './engine.impl';

export function attackPlayer(
  state: GameState,
  playerKey: 'player1' | 'player2',
  attackerUid: string
): GameState {
  return attackPlayerImpl(state, playerKey, attackerUid);
}

export function attackCreature(
  state: GameState,
  playerKey: 'player1' | 'player2',
  attackerUid: string,
  defenderUid: string
): GameState {
  return attackCreatureImpl(state, playerKey, attackerUid, defenderUid);
}
