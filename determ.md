Добавить deterministic replay систему для игрового движка и тест для её проверки.

Цель: возможность воспроизводить последовательность действий игры для отладки и regression тестирования.

---

# Replay структура

Создать структуру ReplayAction.

Она должна содержать:

type
player
cardId
sourceId
targetId
turn

---

# Запись действий

Игровой движок должен записывать действия игроков в лог.

Примеры действий:

PLAY_CARD
ATTACK_CREATURE
ATTACK_PLAYER
END_TURN
DRAW_CARD

Лог действий должен сохраняться как массив ReplayAction.

---

# Replay Runner

Создать функцию:

runReplay(actions)

Она должна:

1. создать новый GameState
2. последовательно применять действия из replay
3. возвращать финальное состояние игры

---

# Replay тест

Создать тест:

tests/regression/replay-regression.test.ts

Тест должен:

1. создать короткий replay сценарий
2. запустить runReplay
3. проверить финальное состояние игры

Пример сценария:

player plays creature
creature attacks hero
hero loses hp

---

# Determinism

При повторном запуске replay результат должен быть одинаковым.

---

# Интеграция

Replay должен использовать существующие функции движка:

playCard
attackCreature
attackPlayer
endTurn

Не изменять существующую механику игры.

---

# Debugging

Если regression тест падает, должна быть возможность сохранить replay последовательность для воспроизведения бага.
