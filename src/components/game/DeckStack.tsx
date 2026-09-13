// ═══════════════════════════════════════════
// DECK STACK COMPONENT
// ═══════════════════════════════════════════
// Отображение колоды и кладбища с tooltip

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface DeckStackProps {
  count: number;
  type: 'deck' | 'graveyard';
  cardBackSrc?: string;
  label: string;
}

/**
 * Компонент отображения колоды или кладбища
 */
export function DeckStack({ count, type, cardBackSrc, label }: DeckStackProps) {
  const isDeck = type === 'deck';

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className={isDeck ? 'deck-zone' : 'graveyard-zone'}>
          {isDeck && cardBackSrc ? (
            <img
              src={cardBackSrc}
              alt="Колода"
              className="w-full h-full object-cover rounded-[5px] opacity-80"
              draggable={false}
            />
          ) : (
            <span style={{ fontSize: 'clamp(14px, 1.8vw, 22px)' }}>
              {isDeck ? '🂠' : '💀'}
            </span>
          )}
          <span className={isDeck ? 'deck-count' : 'graveyard-count'}>{count}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        {label}: {count}
      </TooltipContent>
    </Tooltip>
  );
}
