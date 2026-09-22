import type { CardColor } from '../../src/data/cards';
import { emptyPool, poolTotal } from '../../src/game/mana';
import type { PlayerState } from '../../src/game/types';

/**
 * Мана в тестах теперь ЦВЕТНАЯ, поэтому `player.mana = 10` больше не работает:
 * движок платит из `manaPool` и полностью игнорирует `mana` (это только витрина).
 * Число без пула — это «десять маны неизвестно какого цвета», и такая карта
 * не оплачивается никогда.
 *
 * Помощник кладёт ману ОДНОГО цвета — того, которым платится разыгрываемая карта,
 * и синхронизирует витрину с пулом, чтобы `mana === poolTotal(manaPool)` держалось.
 * Для смешанного пула (цвет + остаток) заполняйте `manaPool` вручную.
 */
export function giveMana(player: PlayerState, color: CardColor, amount: number): void {
  player.manaPool = { ...emptyPool(), [color]: amount };
  player.mana = poolTotal(player.manaPool);
}
