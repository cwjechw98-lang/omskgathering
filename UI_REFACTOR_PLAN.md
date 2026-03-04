# UI_REFACTOR_PLAN

## Этап 1 — Анализ текущего UI (без изменения кода)

## 1) Текущая структура React-компонентов интерфейса

### Точка входа UI
- `src/App.tsx`
- Переключает экраны: `menu` -> `intro` -> `game`
- Игра рендерится через `GameBoard`

### Основной игровой экран
- `src/components/GameBoard.tsx`
- Сейчас это главный orchestration-компонент + внутри него есть локальные UI-подкомпоненты (`MessageFeed`, `FieldCard`, `HandCard`, `CardPreview`), часть которых дублирует вынесенные файлы из `src/components/game/*`.

### Вынесенные игровые подкомпоненты
- `src/components/game/FieldCard.tsx`
- `src/components/game/HandCard.tsx`
- `src/components/game/CardPreview.tsx`
- `src/components/game/GameControls.tsx`
- `src/components/game/MessageFeed.tsx`

### Прочие UI-компоненты
- `src/components/PlayerArea.tsx` — панель героя (HP/мана/статы)
- `src/components/MainMenu.tsx` — меню/коллекция/правила/лор
- `src/components/StoryIntro.tsx` — интро

### Эффекты
- `src/components/effects/CardDust.tsx`
- `src/components/effects/ParticleCanvas.tsx`
- `src/components/effects/Torch.tsx`

---

## 2) Как рендерятся карты сейчас

### На поле
- В `GameBoard.tsx` рендер `enemy.field.map(...)` и `me.field.map(...)`
- Карта в поле имеет:
- относительный контейнер (`relative`)
- внутренние абсолютные слои для artwork/градиентов/overlay
- hover/selection/target ring эффекты
- статусы (frozen, summoning sickness, attacked)

### В руке
- Рука рендерится как горизонтальный `flex` c `overflow-x-auto`
- Карты руки сейчас в layout-потоке (без slot/grid-системы)
- Hover/selected используют `scale`/`translate` + z-index, что может визуально ломать layout

### Превью карты
- `CardPreview` рендерится absolute-окном в углу (`absolute z-40`)

---

## 3) Где используется absolute/fixed positioning (критичные зоны)

### В `GameBoard.tsx`
- Message feed: `absolute z-40`
- Card layers: `absolute inset-0`
- Card preview: `absolute z-40`
- Turn/AI overlays: `absolute` и `fixed` с высокими `z`
- Targeting line: `fixed z-[9999]`
- Damage numbers: `position: fixed; zIndex: 10000`

### В эффектах
- `CardDust.tsx`: полноэкранные `fixed` контейнеры (`zIndex: 99999`)
- `ParticleCanvas.tsx`: canvas `absolute inset-0`
- `MainMenu.tsx`/`StoryIntro.tsx`: много `fixed` фоновых слоёв

### В стилях (`src/index.css`)
- Используются многочисленные hardcoded z-index (`50`, `80`, `100`, `150`, `200`, `1000`, `9999`, `10000`) без централизованной шкалы.

---

## 4) Какие компоненты за что отвечают

### board
- `src/components/GameBoard.tsx`

### cards
- `src/components/GameBoard.tsx` (локальные реализации)
- `src/components/game/FieldCard.tsx`
- `src/components/game/HandCard.tsx`
- `src/components/game/CardPreview.tsx`

### hand
- `src/components/GameBoard.tsx` (блок руки внизу)
- `src/components/game/HandCard.tsx`

### hero
- `src/components/PlayerArea.tsx`

### buttons / controls
- `src/components/GameBoard.tsx` (центр и конец хода)
- `src/components/game/GameControls.tsx` (вынесенный вариант)
- `src/components/ui/button.tsx`

### overlays
- `src/components/GameBoard.tsx` (game over dialog, AI thinking, targeting line, damage numbers)
- `src/components/ui/dialog.tsx`
- `src/components/ui/sheet.tsx`

### effects
- `src/components/effects/*`
- `src/index.css` (keyframes и визуальные utility классы)

---

## 5) Безопасность изменений: что можно менять / что связано с движком

### Безопасно менять (UI-only)
- Layout-контейнеры, CSS-grid/flex структуры, slot системы
- Z-index архитектуру и визуальные слои
- Поведение hover/scale/arc-hand
- Позиции кнопок/панелей/placeholder
- Визуальную подсветку attack lanes

### Связано с игровым движком (менять осторожно)
- Точки вызова:
- `playCard(...)`
- `attackPlayer(...)`
- `attackCreature(...)`
- `endTurn(...)`
- Вычисления для визуала, зависящие от engine:
- `getEffectiveAttack(...)`
- `getEffectiveHealth(...)`
- Интеракции выбора атакующего/цели

### Стратегия безопасного рефакторинга
- Оставить engine API и последовательность вызовов без изменений
- Изменять только слой рендера/контейнеров/positioning
- При каждом этапе прогонять `lint`, `test`, `test:regression`, `build`

---

## Вывод (для следующих этапов)

Ключевые источники нестабильности UI:
1. Дублированные карточные компоненты (локальные + вынесенные)
2. Отсутствие единой системы слоёв z-index
3. Рука игрока на `flex` без slot/arc-системы
4. Поле существ без фиксированной 7-slot grid-архитектуры
5. Hover масштабирование местами влияет на визуальную читаемость layout

Следующие этапы должны:
- унифицировать карточные контейнеры (CardSlot/CardContainer/CardVisual)
- ввести централизованные UI слои
- перевести поле на 7-слотовую grid-модель
- перевести руку на arc-layout
- добавить lane-подсветку для атак
