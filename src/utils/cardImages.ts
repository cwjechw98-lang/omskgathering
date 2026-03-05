import type { CardData } from '../data/cards';
import { LOCAL_CARD_BACK_IMAGE, LOCAL_CARD_IMAGES } from '../data/localCardImages';

// Vite ImportMeta extension
interface ImportMetaEnv {
  BASE_URL: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}

export function getCardCoverSources(card: Pick<CardData, 'id' | 'imageUrl'>): {
  src?: string;
  fallback?: string;
} {
  const localSrc = LOCAL_CARD_IMAGES[card.id];
  if (localSrc) {
    // Vite сам подставит /omskgathering/ на GitHub и / на локальном компе
    const finalSrc = (import.meta as unknown as ImportMeta).env.BASE_URL + localSrc.replace(/^\//, '');
    return { src: finalSrc, fallback: card.imageUrl };
  }
  return { src: card.imageUrl };
}

export function getCardBackSource(): string | undefined {
  if (!LOCAL_CARD_BACK_IMAGE) return undefined;
  return (import.meta as unknown as ImportMeta).env.BASE_URL + LOCAL_CARD_BACK_IMAGE.replace(/^\//, '');
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
