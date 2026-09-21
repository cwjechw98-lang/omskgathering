import { CardInstance, PlayerState } from './types';

export function hasKeyword(card: CardInstance, kw: string): boolean {
  return card.keywords.includes(kw as CardInstance['keywords'][number]);
}

export function applyFreeze(card: CardInstance, turns: number): void {
  card.frozen = Math.max(card.frozen, turns + 1);
}

export function getEffectiveAttack(
  card: CardInstance,
  player: PlayerState,
  opponent?: PlayerState
): number {
  let atk = card.currentAttack + card.buffAttack + card.tempBuffAttack;

  // Dvornik: +1/+0 per other creature
  if (card.data.id === 'dvornik') {
    atk += player.field.filter((c) => c.uid !== card.uid).length;
  }

  // Mer Omska: +1/+1 all
  if (player.field.some((c) => c.data.id === 'mer_omska' && c.uid !== card.uid)) atk += 1;

  // Cluster Lord: +1/+1 all
  if (player.field.some((c) => c.data.id === 'cluster_lord' && c.uid !== card.uid)) atk += 1;

  // Duh Omska enchantment: +1 atk
  if (player.enchantments.some((c) => c.data.id === 'duh_omska')) atk += 1;

  // Zarya Pobedy: +1 atk
  if (player.enchantments.some((c) => c.data.id === 'zarya_pobedy')) atk += 1;

  // Bocal: +1/+1 to pisiner
  if (card.data.id === 'pisiner_21' && player.field.some((c) => c.data.id === 'bocal')) {
    atk += 1;
  }

  // Omskaya Zima: -1 atk to opponents
  if (opponent && opponent.enchantments.some((c) => c.data.id === 'omskaya_zima')) {
    atk -= 1;
  }

  return Math.max(0, atk);
}

export function getEffectiveHealth(card: CardInstance, player: PlayerState): number {
  // IMPORTANT: currentHealth already includes permanent buffs that increased maxHealth.
  // So we DO NOT add buffHealth again here (otherwise buffs double-count).
  let hp = card.currentHealth + card.tempBuffHealth;

  // Mer Omska: +1/+1 all
  if (player.field.some((c) => c.data.id === 'mer_omska' && c.uid !== card.uid)) hp += 1;

  // Cluster Lord: +1/+1 all
  if (player.field.some((c) => c.data.id === 'cluster_lord' && c.uid !== card.uid)) hp += 1;

  // Blagoustroistvo: +0/+2
  if (player.enchantments.some((c) => c.data.id === 'blagoustroistvo')) hp += 2;

  // Klyatva Metrostroya: +0/+1
  // Эту ветку учитывала только копия в engine.impl.ts, а через barrel наружу
  // (и в ai.ts) уходила эта версия — ИИ занижал здоровье своих существ на 1.
  if (player.enchantments.some((c) => c.data.id === 'klyatva_metrostroya')) hp += 1;

  // Bocal: +1/+1 Писинерам — симметрично ветке в getEffectiveAttack.
  // Раньше здесь стояло hp += 0, и карта давала +1/+0 вместо заявленного +1/+1.
  if (card.data.id === 'pisiner_21' && player.field.some((c) => c.data.id === 'bocal')) hp += 1;

  return hp;
}

/**
 * Может ли существо атаковать прямо сейчас.
 *
 * Смотрит на ЭФФЕКТИВНУЮ атаку, а не на базовую: у существа с базовой атакой 0 аура
 * или бафф может поднять её выше нуля, и тогда оно обязано мочь атаковать (см.
 * `testBabkaCanAttackWhenBuffed`). Запрет по базовой атаке сломал бы этот случай.
 *
 * Существо с эффективной атакой 0 атаковать не может: урона не будет, но оно
 * повернётся, проиграет анимацию удара и потратит ход — игрок увидит «пустую атаку».
 *
 * Раньше это условие было скопировано в шести местах и всюду без проверки атаки,
 * поэтому «Бабка с Семечками» (0/3 без Защитника) была кликабельна как атакующий.
 * Теперь условие одно на весь проект.
 */
export function canCreatureAttack(
  card: CardInstance,
  player: PlayerState,
  opponent?: PlayerState
): boolean {
  return (
    !card.summoningSickness &&
    !card.hasAttacked &&
    card.frozen <= 0 &&
    !hasKeyword(card, 'defender') &&
    getEffectiveAttack(card, player, opponent) > 0
  );
}
