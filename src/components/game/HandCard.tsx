import React from 'react';
import { CardInstance } from '../../game/types';
import { getCardCoverSources, handleImageErrorWithFallback } from '../../utils/cardImages';
import { COLOR_ART } from './FieldCard';

export function HandCard({
  card,
  selected,
  canPlay,
  isLand,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  card: CardInstance;
  selected?: boolean;
  canPlay?: boolean;
  isLand?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  const borderCls = selected
    ? 'border-yellow-400 shadow-yellow-400/50 shadow-lg -translate-y-4 scale-110'
    : canPlay && isLand
      ? 'border-[#c9a84c] shadow-[#c9a84c]/30 shadow-lg card-glow'
      : canPlay
        ? 'border-green-500/60 shadow-green-500/15 shadow-md'
        : 'border-gray-700/40 opacity-45';
  const art = getCardCoverSources(card.data);

  return (
    <div
      onClick={onClick}
      draggable={canPlay}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`card-frame card-in-hand relative border-2 overflow-hidden cursor-pointer transition-all duration-200 shrink-0 rounded-lg ${borderCls} ${canPlay ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{ width: 'var(--hand-card-w)', height: 'var(--hand-card-h)' }}
      title={`${card.data.name} (${card.data.cost}💎)\n${card.data.description}\n${canPlay ? '👆 Двойной клик или перетащите на поле' : '❌ Не хватает маны'}`}
    >
      <div className={`absolute inset-0 ${COLOR_ART[card.data.color]}`} />
      {art.src && (
        <img
          src={art.src}
          data-fallback={art.fallback}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          loading="lazy"
          draggable={false}
          onError={(e) => handleImageErrorWithFallback(e.currentTarget)}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" />

      <div className="relative z-10 flex flex-col h-full p-[clamp(2px,0.3vw,5px)]">
        <div className="flex justify-between items-start">
          <span style={{ fontSize: 'clamp(0.9rem, 1.55vw, 2.2rem)' }}>{card.data.emoji}</span>
          <span
            className={`rounded-full flex items-center justify-center font-bold font-heading ${
              isLand
                ? 'bg-[#c9a84c] text-black'
                : canPlay
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-400'
            }`}
            style={{
              width: 'clamp(1rem, 1.25vw, 1.8rem)',
              height: 'clamp(1rem, 1.25vw, 1.8rem)',
              fontSize: 'clamp(0.5rem, 0.68vw, 0.94rem)',
            }}
          >
            {card.data.cost}
          </span>
        </div>

        <div
          className="font-heading text-white font-bold leading-tight mt-auto"
          style={{ fontSize: 'clamp(0.46rem, 0.52vw, 0.84rem)' }}
        >
          {card.data.name}
        </div>

        {card.data.type === 'creature' && (
          <div className="flex justify-between items-end mt-0.5">
            <span
              className="text-red-300 font-bold font-heading"
              style={{ fontSize: 'clamp(0.5rem, 0.62vw, 0.9rem)' }}
            >
              {card.data.attack}&#9876;
            </span>
            <span
              className="text-green-300 font-bold font-heading"
              style={{ fontSize: 'clamp(0.5rem, 0.62vw, 0.9rem)' }}
            >
              {card.data.health}&#10084;
            </span>
          </div>
        )}
        {card.data.type === 'land' && (
          <div
            className="text-[#c9a84c] font-bold text-center"
            style={{ fontSize: 'clamp(0.54rem, 0.7vw, 0.96rem)' }}
          >
            &#127956;&#65039;
          </div>
        )}
        {card.data.type === 'spell' && (
          <div
            className="text-blue-300 text-center"
            style={{ fontSize: 'clamp(0.54rem, 0.7vw, 0.96rem)' }}
          >
            &#10024;
          </div>
        )}
        {card.data.type === 'enchantment' && (
          <div
            className="text-purple-300 text-center"
            style={{ fontSize: 'clamp(0.54rem, 0.7vw, 0.96rem)' }}
          >
            &#128302;
          </div>
        )}
      </div>

      {canPlay && !selected && (
        <div
          className={`absolute top-1 right-1 rounded-full animate-pulse z-20 ${isLand ? 'bg-[#c9a84c]' : 'bg-green-400'}`}
          style={{ width: 'clamp(4px, 0.5vw, 8px)', height: 'clamp(4px, 0.5vw, 8px)' }}
        />
      )}
    </div>
  );
}
