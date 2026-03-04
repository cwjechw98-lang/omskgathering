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

  return hp;
}
