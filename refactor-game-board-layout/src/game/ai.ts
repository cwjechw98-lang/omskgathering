import { GameState } from './types';
import { playCard, attackPlayer, attackCreature, endTurn } from './engine';

export interface AIAction {
  type: 'play' | 'attack-hero' | 'attack-creature';
  attackerUid?: string;
  defenderUid?: string;
}

export function aiTurn(gs: GameState): { state: GameState; actions: AIAction[] } {
  let state = { ...gs };
  const actions: AIAction[] = [];
  const who = 'player2' as const;

  // Play lands first
  for (const card of state[who].hand) {
    if (card.data.type === 'land' && state[who].landsPlayed < state[who].maxLandsPerTurn) {
      const next = playCard(state, who, card.uid);
      if (next !== state) {
        state = next;
        actions.push({ type: 'play' });
        break;
      }
    }
  }

  // Play creatures/spells (cheapest to most expensive that we can afford)
  const playable = [...state[who].hand]
    .filter(c => c.data.type !== 'land' && c.data.cost <= state[who].mana)
    .sort((a, b) => b.data.cost - a.data.cost);

  for (const card of playable) {
    if (card.data.cost <= state[who].mana) {
      const next = playCard(state, who, card.uid);
      if (next !== state) {
        state = next;
        actions.push({ type: 'play' });
      }
    }
  }

  // Attack with all available creatures
  for (const card of state[who].field) {
    if (card.summoningSickness || card.hasAttacked || card.frozen > 0 || card.keywords.includes('defender')) continue;

    // Check if there are defenders on enemy side
    const enemyDefenders = state.player1.field.filter(c => c.keywords.includes('defender'));
    
    if (enemyDefenders.length > 0) {
      // Must attack a defender
      const target = enemyDefenders[0];
      const next = attackCreature(state, who, card.uid, target.uid);
      if (next !== state) {
        state = next;
        actions.push({ type: 'attack-creature', attackerUid: card.uid, defenderUid: target.uid });
      }
    } else if (state.player1.field.length > 0 && Math.random() > 0.4) {
      // Sometimes attack creatures
      const target = state.player1.field[Math.floor(Math.random() * state.player1.field.length)];
      const next = attackCreature(state, who, card.uid, target.uid);
      if (next !== state) {
        state = next;
        actions.push({ type: 'attack-creature', attackerUid: card.uid, defenderUid: target.uid });
      }
    } else {
      // Attack player
      const next = attackPlayer(state, who, card.uid);
      if (next !== state) {
        state = next;
        actions.push({ type: 'attack-hero', attackerUid: card.uid });
      }
    }
  }

  // End turn
  state = endTurn(state);

  return { state, actions };
}
