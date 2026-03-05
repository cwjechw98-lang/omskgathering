# UI_REFACTOR_PLAN.md — Анализ и архитектура интерфейса

## 1. Текущая структура React-компонентов

```
App                          ← main state, game logic glue
├── SparkLayer               ← частицы атаки (fixed, z:9999)
├── .game-grid               ← CSS Grid 8 рядов
│   ├── .zone-topbar         ← nav: меню / счётчик хода / лог / рестарт
│   ├── .zone-enemy-hero     ← HeroZone (enemy) + enchantments + hand face-down
│   ├── .zone-enemy-board    ← 7 CreatureSlot × GameCard (enemy)
│   ├── .zone-divider        ← center-divider: кнопка «Конец хода» / атака
│   ├── .zone-player-board   ← 7 CreatureSlot × GameCard (player)
│   ├── .zone-player-hero    ← HeroZone (player) + enchantments
│   ├── .zone-actionbar      ← фазы хода / подсказка / mana text
│   └── .zone-hand           ← HandCard × n
│
└── Overlays (position: fixed)
    ├── .ai-feed             ← плашки сообщений ИИ (left top, z:90)
    ├── CardPreviewPanel     ← превью карты (right middle, z:100)
    ├── .log-panel           ← журнал (right, z:150)
    ├── GraveyardModal       ← модал кладбища (z:200)
    ├── .turn-banner         ← баннер смены хода (z:10000)
    ├── .ai-thinking-badge   ← «ИИ думает» (center, z:500)
    ├── DamageNumbers        ← числа урона (fixed, z:10000)
    └── .low-health-overlay  ← красное виньетирование (z:9998)
```

## 2. Рендеринг карт

### GameCard (поле):
```
.game-card                   ← color-X rarity-X, position:relative, overflow:hidden
  .card-top                  ← emoji + cost badge
  .card-art-area             ← центр: большой emoji как арт
  .card-bottom               ← name, keywords, status icons, stats
  ::after                    ← foil overlay (для rare/mythic)
```

### HandCard (рука):
```
.hand-card-wrapper           ← hover управляет transform, z-index
  .game-card                 ← аналогично, + border по canPlay
```

### CreatureSlot:
```
.creature-slot               ← фиксированный слот (--slot-w × --slot-h)
  GameCard | placeholder     ← карта или пустышка
```

## 3. Использование position:absolute

**СУЩЕСТВУЮЩЕЕ** (допустимо):
- `.card-preview-panel` — `position:fixed` ✓
- `.log-panel` — `position:fixed` ✓
- `.ai-feed` — `position:fixed` ✓
- `.turn-banner` — `position:fixed` ✓
- `.ai-thinking-badge` — `position:fixed` ✓
- `.low-health-overlay` — `position:fixed` ✓
- `.dmg-number` — `position:fixed` ✓
- `.spark` — `position:fixed` ✓

**ВНУТРИ КАРТЫ** (допустимо — внутри overflow:hidden):
- `foil ::after` — `position:absolute, inset:0` ✓
- frozen overlay — `position:absolute, inset:0` ✓
- canPlay dot — `position:absolute, top/left` ✓

**ПРОБЛЕМНЫЕ** (к исправлению):
- hint-текст в `.center-divider` — `position:absolute left/right` → переработать в flex
- phase-pills в `.center-divider` — `position:absolute left` → переработать в flex

## 4. Ответственность компонентов

| Компонент         | Ответственность                         | Связан с движком? |
|-------------------|-----------------------------------------|-------------------|
| `App`             | State, actions, AI trigger              | ✅ Да             |
| `GameCard`        | Визуал карты: арт, статы, эффекты       | ❌ Только props   |
| `HandCard`        | Обёртка карты в руке: hover, drag       | ❌ Только props   |
| `CreatureSlot`    | Слот на поле: позиция, placeholder      | ❌ Только props   |
| `HeroZone`        | HP bar, мана, колода, кладбище          | ❌ Только props   |
| `CardPreviewPanel`| Детальный превью карты                  | ❌ Только props   |
| `GraveyardModal`  | Модал списка карт кладбища              | ❌ Только props   |
| `DamageNumbers`   | Всплывающие числа урона                 | ❌ Только props   |
| `SparkLayer`      | Частицы при атаке                       | ❌ Только props   |

**Безопасно менять** (не связаны с движком):
- GameCard, HandCard, CreatureSlot, HeroZone
- CardPreviewPanel, GraveyardModal
- CSS: все классы кроме game-logic bindings

**Трогать с осторожностью** (связаны с движком через props):
- App — только JSX/layout, не логику

---

## 5. Система z-index (новая централизованная)

```
--z-background:  0    (фон поля)
--z-board:       1    (зоны поля)
--z-card-slots:  5    (слоты существ)
--z-cards:       10   (карты на поле)
--z-card-hover:  20   (карта при hover)
--z-card-effects:30   (foil, анимации карт)
--z-combat:      50   (анимации атаки, спарки)
--z-ui:          90   (ai-feed, hint)
--z-overlay:     100  (preview, log)
--z-modal:       200  (graveyard modal)
--z-banner:      500  (ai-thinking)
--z-top:         10000 (turn-banner, damage numbers)
```

---

## 6. Архитектура карты (Этап 2)

```
CardSlot      — позиционирование, фиксированный размер (CSS Grid ячейка)
  CardContainer — hover, drag, scale (transform-origin: bottom center)
    CardVisual  — overflow:hidden, artwork, frame, foil, stats
```

---

## 7. Board Slots (Этап 4)

```css
.board-zone {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: clamp(4px, 0.6vw, 10px);
}
```

Каждый `.creature-slot` — 1 ячейка grid, фиксированный размер через CSS vars.

---

## 8. Arc Hand Layout (Этап 6)

Карты расположены по дуге:
- Центральная карта: rotate(0deg), translateY(0)
- Крайние карты: rotate(±12deg), translateY(+8px)
- При hover: rotate(0deg), translateY(-24px), scale(1.18), z-index: var(--z-card-hover)

---

## 9. Что изменится

### Этапы 1-3 — Анализ + z-index:
- CSS vars для z-index
- Убрать position:absolute из center-divider flex-children

### Этап 4 — Board Slots:
- `.board-zone` → CSS grid (уже частично)
- Оставить 7 слотов всегда

### Этап 5 — Attack Lanes:
- При выборе attacker — подсвечивать column в grid
- CSS: `.creature-slot.attack-lane`

### Этап 6 — Arc Hand:
- `hand-card-wrapper` получает `--card-angle`, `--card-offset`
- inline style на каждую карту

### Этап 7 — Overlay система:
- Все эффекты через fixed overlay (уже так)
- Добавить `pointer-events: none` на поле при overlay

### Этапы 8-9 — Эффекты + UX:
- Проверить z-layers эффектов
- Кнопка «Конец хода» в zone-divider (уже так)
- Double-tap support для мобильных
