import type { CardData } from '../data/cards';
import { LOCAL_CARD_BACK_IMAGE, LOCAL_CARD_IMAGES } from '../data/localCardImages';

export function getCardCoverSources(card: Pick<CardData, 'id' | 'imageUrl'>): { src?: string; fallback?: string } {
  const localSrc = LOCAL_CARD_IMAGES[card.id];
  if (localSrc) {
    return { src: localSrc, fallback: card.imageUrl };
  }
  return { src: card.imageUrl };
}

export function getCardBackSource(): string | undefined {
  return LOCAL_CARD_BACK_IMAGE || undefined;
}

export function handleImageErrorWithFallback(img: HTMLImageElement): void {
  const fallback = img.dataset.fallback;
  if (fallback && fallback.length > 0) {
    img.removeAttribute('data-fallback');
    img.src = fallback;
    return;
  }
  img.style.display = 'none';
}
