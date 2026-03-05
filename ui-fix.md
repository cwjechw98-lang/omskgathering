Исправить нестабильность layout игрового поля.

После предыдущих изменений CSS Grid игрового интерфейса начал ломаться на разных ширинах экрана:

* enemy-board и player-board смещаются
* некоторые зоны исчезают
* появляется большое пустое пространство
* grid перестраивает высоту строк

Это происходит потому что grid использует auto sizing и строки растягиваются контентом.

Нужно стабилизировать layout.

---

# Требуется

Зафиксировать геометрию grid и запретить строкам расширяться.

---

# Изменения в index.css

Найти .game-grid.

Заменить grid-template-rows на minmax.

Было:

grid-template-rows:
var(--topbar-h)
var(--hero-h)
var(--board-h)
var(--divider-h)
var(--board-h)
var(--hero-h)
var(--actionbar-h)
var(--hand-h);

Сделать:

grid-template-rows:
minmax(0,var(--topbar-h))
minmax(0,var(--hero-h))
minmax(0,var(--board-h))
minmax(0,var(--divider-h))
minmax(0,var(--board-h))
minmax(0,var(--hero-h))
minmax(0,var(--actionbar-h))
minmax(0,var(--hand-h));

---

# Добавить защиту grid элементов

.game-grid > * {
min-height:0;
}

---

# Зафиксировать board зоны

.enemy-board,
.player-board{
height:var(--board-h);
overflow:hidden;
}

---

# Зафиксировать hero зоны

.hero-zone{
height:var(--hero-h);
}

---

# Важно

НЕ менять:

* App.tsx
* структуру компонентов
* game-grid layout
* renderBoardSlots

Изменения должны касаться только CSS.

---

# Результат

Layout игрового поля станет стабильным:

* enemy-board и player-board всегда на своих местах
* grid перестанет растягиваться
* исчезнут пустые зоны
* интерфейс будет одинаково работать на 14" и больших экранах
