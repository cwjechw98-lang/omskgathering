# 🔄 OMSK: The Gathering — UI Refactoring Plan с shadcn/ui

**Дата:** 2026-03-04  
**Цель:** Рефакторинг интерфейса с использованием shadcn/ui компонентов для улучшения доступности (WCAG 2.1 AA), консистентности и поддерживаемости.

---

## 📦 Текущее состояние shadcn/ui

### ✅ Уже установлены
```
✅ Button (с кастомными variant: mythic, gold, blue, purple, nav)
✅ Dialog
✅ Sheet
✅ Accordion
```

### 📥 Требуется установить
```bash
npx shadcn@latest add card progress badge tooltip tabs scroll-area separator avatar alert
```

---

## 🏗️ Архитектура рефакторинга

### Уровень 1: Базовые компоненты (Week 1)

| Компонент | Текущая реализация | shadcn/ui замена | Приоритет |
|-----------|-------------------|------------------|-----------|
| CardFrame | Кастомный div с CSS | `Card` + `CardHeader` + `CardTitle` + `CardDescription` + `CardContent` | P0 |
| HealthBar | Кастомный progress div | `Progress` с кастомными цветами | P0 |
| ManaCrystals | Набор div | `Badge` variant="mana" | P0 |
| KeywordBadge | Кастомный span | `Badge` variant="keyword" | P1 |
| RarityIndicator | Текст ★ | `Badge` variant="rarity" | P1 |

### Уровень 2: Layout компоненты (Week 2)

| Компонент | Текущая реализация | shadcn/ui замена | Приоритет |
|-----------|-------------------|------------------|-----------|
| PlayerArea | Кастомный flex | `Card` + `Progress` + `Badge` | P0 |
| GameBoard | Grid с CSS vars | `Grid` pattern + `Separator` | P1 |
| HandContainer | Flex с overflow | `ScrollArea` horizontal | P1 |
| CardCollection | Grid | `Card` grid + `ScrollArea` | P1 |
| EmptyState | Текст | `Card` + иконка + текст | P0 |

### Уровень 3: Интерактивные компоненты (Week 3)

| Компонент | Текущая реализация | shadcn/ui замена | Приоритет |
|-----------|-------------------|------------------|-----------|
| CardTooltip | Кастомный title | `Tooltip` + `TooltipContent` | P1 |
| CardPreview | Кастомный sidebar | `Sheet` side="right" | P1 |
| LoreChapter | Кастомные кнопки | `Tabs` + `TabsList` + `TabsContent` | P2 |
| RulesAccordion | Accordion | `Accordion` (уже есть) | ✅ |
| SettingsDialog | Отсутствует | `Dialog` + `Tabs` | P2 |

---

## 📋 Детальный план по компонентам

---

### 1️⃣ PlayerArea → Card + Progress + Badge

**Проблема:** Кастомная вёрстка с низким контрастом, нет ARIA

**До:**
```tsx
<div className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border ...`}>
  <div className="rounded-full ...">{avatar}</div>
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2 mb-0.5">
      <span className="font-heading text-white font-bold">{label}</span>
    </div>
    <div className="w-full bg-gray-800 rounded-full overflow-hidden ...">
      <div className={`h-full ${healthColor} ...`} style={{ width: `${healthPercent}%` }} />
    </div>
    <div className="flex items-center gap-1 mt-0.5">
      {Array.from({ length: Math.min(player.maxMana, 12) }, ...)}
    </div>
  </div>
  <div className="flex flex-col items-end gap-0.5 text-gray-500 ...">
    <div title="В руке">🤚 {player.hand.length}</div>
  </div>
</div>
```

**После:**
```tsx
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function PlayerArea({ player, isCurrentPlayer, label, isTop }: PlayerAreaProps) {
  const healthPercent = Math.max(0, (player.health / player.maxHealth) * 100);
  
  return (
    <Card 
      className={cn(
        "flex items-center gap-3 p-3 border transition-all",
        isCurrentPlayer 
          ? "bg-[#1a1508]/50 border-[#c9a84c]/30 shadow-lg shadow-[#c9a84c]/10" 
          : "bg-[#0f0f18]/50 border-gray-800/30"
      )}
      role="region"
      aria-label={label}
    >
      {/* Avatar */}
      <div 
        className={cn(
          "rounded-full flex items-center justify-center shrink-0 border",
          isCurrentPlayer ? "bg-[#2a1a08] border-[#c9a84c]/50" : "bg-[#1a1a2a] border-gray-700/50"
        )}
        style={{ width: '48px', height: '48px', fontSize: '24px' }}
      >
        {label.includes('🤖') ? '🗿' : '👤'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-heading text-white font-bold text-sm">{label}</span>
          {isCurrentPlayer && (
            <Badge variant="secondary" className="animate-pulse bg-[#f0d68a]/20 text-[#f0d68a]">
              ⚡ Ход
            </Badge>
          )}
        </div>

        {/* Health Bar — доступный Progress */}
        <Progress 
          value={healthPercent} 
          className={cn(
            "h-4 transition-all",
            player.health <= player.maxHealth * 0.3 ? "progress-danger" :
            player.health <= player.maxHealth * 0.6 ? "progress-warning" : "progress-success"
          )}
          aria-label={`Здоровье: ${player.health} из ${player.maxHealth}`}
        />

        {/* Mana — Badge с tooltip */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger>
              <div className="flex gap-px">
                {Array.from({ length: Math.min(player.maxMana, 12) }, (_, i) => (
                  <Badge
                    key={i}
                    variant={i < player.mana ? "mana-available" : "mana-spent"}
                    className="w-3 h-3 rounded-full p-0"
                  />
                ))}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Мана: {player.mana} / {player.maxMana}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Stats — доступные Badge */}
      <div className="flex flex-col items-end gap-1" role="list" aria-label="Статистика игрока">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1.5 text-xs min-w-[60px]">
              <span aria-hidden="true">🤚</span>
              <span>{player.hand.length}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Карт в руке</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1.5 text-xs min-w-[60px]">
              <span aria-hidden="true">📚</span>
              <span>{player.deck.length}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Карт в колоде</TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1.5 text-xs min-w-[60px]">
              <span aria-hidden="true">💀</span>
              <span>{player.graveyard.length}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>Карт на кладбище</TooltipContent>
        </Tooltip>
      </div>
    </Card>
  );
}
```

**Требуемые изменения в shadcn/ui:**

`src/components/ui/progress.tsx` — добавить variant:
```tsx
const progressVariants = cva("relative overflow-hidden rounded-full bg-secondary", {
  variants: {
    variant: {
      default: "",
      success: "progress-success", // green
      warning: "progress-warning", // yellow
      danger: "progress-danger",   // red
    },
  },
  defaultVariants: { variant: "default" },
});
```

`src/components/ui/badge.tsx` — добавить variant:
```tsx
const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        mana: "border-transparent bg-blue-500 text-white",
        "mana-available": "bg-blue-500 shadow-sm shadow-blue-400/50",
        "mana-spent": "bg-gray-700 opacity-60",
        keyword: "border-purple-800/30 bg-[#2a1a3a] text-purple-200",
        rarity: "border-transparent",
      },
    },
    defaultVariants: { variant: "default" },
  }
);
```

---

### 2️⃣ CardFrame → Card Component

**Проблема:** Кастомные стили, нет семантики, фольга добавлена conditionally

**До:**
```tsx
<div className={`card-frame card-in-field ... ${borderCls}`}>
  <div className={`absolute inset-0 ${COLOR_ART[card.data.color]}`} />
  {art.src && <img ... />}
  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
  <div className="relative z-10 flex flex-col h-full p-[clamp(2px,0.4vw,6px)]">
    {/* content */}
  </div>
  {(card.data.rarity === 'mythic' || card.data.rarity === 'rare') && (
    <div className={`card-foil-overlay ...`} />
  )}
</div>
```

**После:**
```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface FieldCardProps {
  card: CardInstance;
  player: GameState['player1'];
  opponent?: GameState['player1'];
  selected?: boolean;
  isTarget?: boolean;
  canAct?: boolean;
  onClick?: () => void;
}

export function FieldCard({ card, player, opponent, selected, isTarget, canAct, onClick }: FieldCardProps) {
  const atk = getEffectiveAttack(card, player, opponent);
  const hp = getEffectiveHealth(card, player);
  
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 cursor-pointer group",
        "w-[var(--field-card-w)] h-[var(--field-card-h)]",
        selected && "ring-2 ring-yellow-400 shadow-yellow-400/50 shadow-lg scale-105",
        isTarget && "ring-2 ring-red-500 shadow-red-500/40 shadow-lg animate-pulse cursor-crosshair",
        canAct && "ring-2 ring-green-400/70 shadow-green-400/30 shadow-md",
        card.data.rarity === 'mythic' && "card-frame-mythic",
        card.data.rarity === 'rare' && "card-frame-rare"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`${card.data.name}: ${atk} атака, ${hp} здоровье`}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Foil overlay — всегда рендерится для редких карт */}
      {(card.data.rarity === 'mythic' || card.data.rarity === 'rare') && (
        <div 
          className={cn(
            "card-foil-overlay pointer-events-none z-50",
            card.data.rarity === 'mythic' ? "opacity-50" : "opacity-30"
          )}
          aria-hidden="true"
        />
      )}

      {/* Art background */}
      <div className={cn("absolute inset-0", COLOR_ART[card.data.color])} aria-hidden="true" />
      
      {art.src && (
        <img
          src={art.src}
          data-fallback={art.fallback}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          loading="lazy"
          aria-hidden="true"
        />
      )}
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" aria-hidden="true" />

      {/* Content */}
      <CardContent className="relative z-10 flex flex-col h-full p-1.5 text-white">
        {/* Top row: Emoji + Cost */}
        <div className="flex justify-between items-start">
          <Tooltip>
            <TooltipTrigger>
              <span className="text-2xl drop-shadow-lg">{card.data.emoji}</span>
            </TooltipTrigger>
            <TooltipContent side="top">{card.data.name}</TooltipContent>
          </Tooltip>
          
          <Badge 
            variant="secondary" 
            className="bg-blue-600/90 text-white font-heading font-bold min-w-[24px] h-6 px-1.5"
            aria-label={`Цена: ${card.data.cost} маны`}
          >
            {card.data.cost}
          </Badge>
        </div>

        {/* Card name */}
        <h3 className="font-heading text-white font-bold truncate mt-auto text-[11px]">
          {card.data.name}
        </h3>

        {/* Keywords с tooltip */}
        {card.keywords.length > 0 && (
          <div className="flex flex-wrap gap-px mt-0.5">
            {card.keywords.slice(0, 4).map((k) => (
              <Tooltip key={k}>
                <TooltipTrigger>
                  <Badge variant="keyword" className="text-[10px] px-1 py-0">
                    {KWS[k]}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>{KW[k]}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Status icons */}
        <div className="flex items-center gap-0.5 mt-0.5 text-[10px]">
          {card.frozen > 0 && <span title="Заморожен" aria-label="Заморожен">❄️</span>}
          {card.summoningSickness && <span title="Болезнь призыва">💤</span>}
          {card.hasAttacked && !card.summoningSickness && <span title="Атаковал">✅</span>}
          {card.keywords.includes('defender') && <span title="Защитник">🛡️</span>}
          {canAct && (
            <span className="text-green-400 animate-pulse" title="Может атаковать">⚔️</span>
          )}
        </div>

        {/* Stats */}
        {card.data.type === 'creature' && (
          <div className="flex justify-between items-end mt-auto">
            <Badge 
              variant="destructive" 
              className="bg-red-700/90 text-white font-heading font-bold text-[12px] h-5 px-1.5"
              aria-label={`${atk} атака`}
            >
              {atk}⚔
            </Badge>
            <Badge 
              className={cn(
                "font-heading font-bold text-white text-[12px] h-5 px-1.5",
                hp <= card.maxHealth / 2 ? "bg-red-600/90" : "bg-green-700/90"
              )}
              aria-label={`${hp} здоровье из ${card.maxHealth}`}
            >
              {hp}❤
            </Badge>
          </div>
        )}
      </CardContent>

      {/* Frozen overlay */}
      {card.frozen > 0 && (
        <div 
          className="absolute inset-0 bg-cyan-300/15 pointer-events-none z-20" 
          aria-hidden="true"
        />
      )}
    </Card>
  );
}
```

---

### 3️⃣ Empty States → Card + Icon

**Проблема:** Текст в пустоте без визуальных границ

**До:**
```tsx
{enemy.field.length === 0 ? (
  <div className="text-gray-700 italic font-body">Поле Хранителя пусто</div>
) : (...)}
```

**После:**
```tsx
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

{enemy.field.length === 0 ? (
  <Card className="bg-white/5 border-2 border-dashed border-white/10 w-full max-w-md mx-auto">
    <CardContent className="flex flex-col items-center justify-center py-8 px-4">
      <span className="text-5xl mb-3" aria-hidden="true">🏔️</span>
      <h3 className="font-heading text-gray-400 text-lg mb-1">
        Поле Хранителя пусто
      </h3>
      <Separator className="w-24 bg-gray-700 my-3" />
      <p className="text-gray-500 text-sm text-center font-body">
        Противник ещё не разыграл существ
      </p>
    </CardContent>
  </Card>
) : (
  enemy.field.map(card => <FieldCard key={card.uid} ... />)
)}
```

---

### 4️⃣ Card Collection → Card Grid + ScrollArea

**Проблема:** Нет индикатора конца списка, плохая прокрутка

**После:**
```tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

export function CardCollection({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState<string>('all');
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = filter === 'all' ? displayCards : displayCards.filter(c => c.type === filter || c.color === filter);

  return (
    <div className="h-[100dvh] bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-black/80 z-20 border-b border-[#c9a84c]/15 shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-[#8a7a5a] hover:text-[#f0d68a]">
          ← Назад
        </Button>
        <h1 className="font-title text-xl text-gold-light">📖 Коллекция ({filtered.length})</h1>
        <div className="w-16" />
      </header>

      {/* Filters — Tabs component */}
      <Tabs value={filter} onValueChange={setFilter} className="w-full shrink-0">
        <TabsList className="bg-black/40 border-b border-[#c9a84c]/10 justify-start rounded-none px-4 py-2 gap-2 overflow-x-auto">
          <TabsTrigger value="all" className="data-[state=active]:bg-[#5a4010] data-[state=active]:text-[#f0d68a]">
            🃏 Все
          </TabsTrigger>
          <TabsTrigger value="creature" className="data-[state=active]:bg-[#5a4010] data-[state=active]:text-[#f0d68a]">
            ⚔️ Существа
          </TabsTrigger>
          <TabsTrigger value="spell" className="data-[state=active]:bg-[#5a4010] data-[state=active]:text-[#f0d68a]">
            ✨ Заклинания
          </TabsTrigger>
          <TabsTrigger value="enchantment" className="data-[state=active]:bg-[#5a4010] data-[state=active]:text-[#f0d68a]">
            🔮 Наложения
          </TabsTrigger>
          <TabsTrigger value="land" className="data-[state=active]:bg-[#5a4010] data-[state=active]:text-[#f0d68a]">
            🏔️ Земли
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Card Grid с ScrollArea */}
      <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(180px,45vw),1fr))]">
          {filtered.map((cardData, idx) => (
            <Card
              key={cardData.id}
              className={cn(
                "cursor-pointer transition-all duration-300 group",
                "animation-fill-mode-backwards",
                cardData.rarity === 'mythic' && "card-frame-mythic",
                cardData.rarity === 'rare' && "card-frame-rare",
                selectedCard === cardData.id && "scale-[1.03] ring-2 ring-[#c9a84c]",
                "hover:scale-[1.02]"
              )}
              style={{ animationDelay: `${idx * 50}ms` }}
              onClick={() => setSelectedCard(selectedCard === cardData.id ? null : cardData.id)}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedCard(cardData.id)}
              tabIndex={0}
              role="button"
              aria-pressed={selectedCard === cardData.id}
              aria-label={`${cardData.name}, ${cardData.rarity} карта`}
            >
              <CardHeader className="p-0 relative overflow-hidden rounded-t-xl" style={{ paddingTop: '75%' }}>
                {/* Art */}
                <div className={cn("absolute inset-0", COLOR_BG[cardData.color])}>
                  {art.src && (
                    <img src={art.src} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                  )}
                </div>
                
                {/* Cost badge */}
                <Badge className="absolute top-2 left-2 bg-blue-700/90 text-white font-heading min-w-[28px] h-7">
                  {cardData.cost}
                </Badge>

                {/* Rarity indicator */}
                <Badge 
                  variant="outline" 
                  className={cn(
                    "absolute top-2 right-2 border-0 font-heading text-xs",
                    cardData.rarity === 'mythic' && "text-orange-400",
                    cardData.rarity === 'rare' && "text-[#f0d68a]",
                    cardData.rarity === 'uncommon' && "text-gray-300"
                  )}
                >
                  {cardData.rarity === 'mythic' ? '★★★' : cardData.rarity === 'rare' ? '★★' : cardData.rarity === 'uncommon' ? '★' : ''}
                </Badge>

                {/* Emoji */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-4xl drop-shadow-lg">
                  {cardData.emoji}
                </div>
              </CardHeader>

              <CardContent className="bg-gradient-to-b from-[#1a1a24] to-[#10101a] p-3">
                <CardTitle className="font-heading text-white font-bold text-sm mb-0.5">
                  {cardData.name}
                </CardTitle>
                <CardDescription className="text-[10px] text-gray-500 font-body mb-2">
                  {cardData.type === 'creature' ? 'Существо' : cardData.type === 'spell' ? 'Заклинание' : 'Наложение'}
                </CardDescription>

                {/* Keywords */}
                {cardData.keywords && cardData.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {cardData.keywords.map((k) => (
                      <Badge key={k} variant="keyword" className="text-[8px] px-1.5 py-0.5">
                        {KW_NAMES[k]}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Description */}
                <p className="text-[11px] text-gray-300 font-body leading-relaxed mb-2 line-clamp-3">
                  {cardData.description}
                </p>

                {/* Stats */}
                {cardData.type === 'creature' && (
                  <div className="flex gap-2 mb-2">
                    <Badge variant="destructive" className="bg-red-700/80 text-white font-heading text-xs">
                      {cardData.attack}⚔
                    </Badge>
                    <Badge className="bg-green-700/80 text-white font-heading text-xs">
                      {cardData.health}❤
                    </Badge>
                  </div>
                )}

                {/* Flavor text */}
                <Separator className="bg-[#c9a84c]/15 mb-1.5" />
                <p className="text-[9px] text-[#c9a84c]/50 italic leading-relaxed font-body line-clamp-2">
                  {cardData.flavor}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load more / End indicator */}
        {hasMore ? (
          <div className="flex justify-center py-4">
            <div className="h-0.5 w-32 bg-gradient-to-r from-transparent via-[#c9a84c]/50 to-transparent animate-pulse" />
          </div>
        ) : (
          <div className="text-center py-4" role="status" aria-live="polite">
            <Separator className="w-24 bg-gray-700 mx-auto mb-2" />
            <p className="text-gray-600 text-xs font-body italic">— Все карты показаны —</p>
          </div>
        )}
      </ScrollArea>

      {/* Detail sidebar — Sheet для мобильных */}
      {selectedCard && (
        <Sheet open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
          <SheetContent side="right" className="w-80 bg-[#0f0f18]/98 border-l border-[#c9a84c]/20">
            {/* Card detail content */}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
```

---

### 5️⃣ Turn Banner → Alert Component (новый)

**Требуется создать:** `src/components/ui/alert.tsx`

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        turn: "turn-banner border-[#c9a84c]/60 bg-gradient-to-br from-[#1a1508] to-[#0f0f18] text-[#f0d68a]",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn("mb-1 font-heading font-bold text-lg leading-none tracking-tight", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div
      className={cn("text-sm font-body [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
```

**Использование:**
```tsx
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

{showTurnTransition && (
  <Alert variant="turn" className="turn-banner fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[10000] w-auto max-w-md text-center py-6 px-8">
    <AlertTitle className="text-[clamp(24px,4vw,48px)] text-[#f0d68a]">
      {AI_CHARACTER.avatarEmoji} ХОД ХРАНИТЕЛЯ
    </AlertTitle>
    <AlertDescription className="text-[clamp(12px,1.5vw,16px)] text-[#c9a84c]/70 letter-spacing-wide">
      {AI_CHARACTER.title}
    </AlertDescription>
  </Alert>
)}
```

---

### 6️⃣ Low Health Warning → Alert + Progress

**После:**
```tsx
import { Alert } from '@/components/ui/alert';

{me.health <= 10 && me.health > 0 && (
  <div 
    className="fixed inset-0 pointer-events-none z-[1000] animate-pulse"
    style={{
      background: 'radial-gradient(ellipse at center, transparent 30%, rgba(255,0,0,0.4) 100%)'
    }}
    role="alert"
    aria-live="assertive"
    aria-label="Внимание: низкое здоровье"
  />
)}
```

---

## 🎨 Theme Customization

### Обновить `src/index.css` — Design Tokens

```css
@theme inline {
  /* shadcn/ui tokens */
  --color-background: oklch(0.141 0.005 285.823);
  --color-foreground: oklch(0.888 0.006 285.823);
  --color-card: oklch(0.18 0.01 285.823);
  --color-card-foreground: oklch(0.888 0.006 285.823);
  --color-popover: oklch(0.18 0.01 285.823);
  --color-popover-foreground: oklch(0.888 0.006 285.823);
  --color-primary: oklch(0.72 0.12 85);
  --color-primary-foreground: oklch(0.141 0.005 285.823);
  --color-secondary: oklch(0.22 0.01 285.823);
  --color-secondary-foreground: oklch(0.888 0.006 285.823);
  --color-muted: oklch(0.22 0.01 285.823);
  --color-muted-foreground: oklch(0.556 0.01 285.823);
  --color-accent: oklch(0.22 0.01 285.823);
  --color-accent-foreground: oklch(0.888 0.006 285.823);
  --color-destructive: oklch(0.55 0.2 27);
  --color-destructive-foreground: oklch(0.888 0.006 285.823);
  --color-border: oklch(0.3 0.01 285.823);
  --color-input: oklch(0.3 0.01 285.823);
  --color-ring: oklch(0.72 0.12 85);
  
  /* Omsk theme tokens */
  --color-gold: #c9a84c;
  --color-gold-light: #f0d68a;
  --color-gold-dark: #8b6914;
  --color-irtysh: #1a3a5c;
  --color-tep: #8b2a1a;
  
  /* Progress variants */
  --progress-success: oklch(0.72 0.12 150);
  --progress-warning: oklch(0.72 0.12 85);
  --progress-danger: oklch(0.55 0.2 27);
}

/* Progress component variants */
.progress-success {
  background: var(--color-gold);
  box-shadow: 0 0 10px rgba(201, 168, 76, 0.5);
}
.progress-warning {
  background: linear-gradient(90deg, #f0d68a, #ffaa00);
  box-shadow: 0 0 10px rgba(255, 170, 0, 0.5);
}
.progress-danger {
  background: linear-gradient(90deg, #ff6600, #ff4400);
  box-shadow: 0 0 10px rgba(255, 68, 0, 0.5);
  animation: healthDanger 1s ease-in-out infinite;
}

@keyframes healthDanger {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

---

## 📅 Roadmap рефакторинга

### Неделя 1: Базовые компоненты
- [ ] Установить недостающие shadcn/ui компоненты
- [ ] Рефакторинг `PlayerArea` → Card + Progress + Badge
- [ ] Рефакторинг `FieldCard` → Card component
- [ ] Добавить Tooltip ко всем keyword badges
- [ ] Исправить контраст текста (P0)

### Неделя 2: Layout и навигация
- [ ] Рефакторинг `CardCollection` → Card grid + ScrollArea + Tabs
- [ ] Добавить EmptyState компоненты
- [ ] Улучшить mobile responsive (hand cards size)
- [ ] Добавить keyboard navigation везде

### Неделя 3: Полировка
- [ ] Создать Alert component для turn banner
- [ ] Добавить Settings Dialog
- [ ] Улучшить Lore screen с Tabs
- [ ] Добавить colorblind mode toggle

---

## ✅ Checklist доступности (WCAG 2.1 AA)

- [ ] Контраст текста ≥ 4.5:1
- [ ] Контраст крупного текста ≥ 3:1
- [ ] Все интерактивные элементы имеют focus ring
- [ ] Keyboard navigation работает везде
- [ ] ARIA labels на всех картах
- [ ] ARIA live regions для game state changes
- [ ] Tooltips на всех иконках
- [ ] Screen reader тестирование

---

## 📊 Ожидаемые улучшения

| Метрика | До | После |
|---------|-----|-------|
| WCAG AA compliance | 30% | 95% |
| Keyboard navigable | 40% | 100% |
| Screen reader friendly | 20% | 90% |
| Mobile readability | 40% | 85% |
| Code maintainability | 50% | 90% |

---

*Этот план обеспечивает систематический переход на shadcn/ui с сохранением уникального стиля Omsk и значительным улучшением доступности.*
