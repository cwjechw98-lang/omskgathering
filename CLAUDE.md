# CLAUDE.md — Руководство для новой сессии

## Быстрый старт сессии

1. **Прочитай WORKLOG.md** — последние записи покажут где остановились
2. **Прочитай этот файл** — правила проекта и подводные камни
3. **Проверь remote**: `git remote -v` → должен быть `https://github.com/cwjechw98-lang/omskgathering.git`
4. **Проверь статус**: `git status` — рабочее дерево должно быть чистым
5. **Проверь качество**: `npm run lint` (0 errors) → `npm run test` → `npm run build`

## Правила коммитов и деплоя

### Перед КАЖДЫМ коммитом обязательно:
```bash
npm run lint          # ДОЛЖЕН быть 0 errors (warnings допустимы)
npm run test          # ВСЕ тесты зелёные
npm run build         # Сборка проходит
```

### Коммит и пуш:
- Пушим в `main` → автоматически запускаются GitHub Actions:
  - `quality-gate.yml` — lint + test + regression + build
  - `deploy-pages.yml` — деплой на GitHub Pages
- **Сайт**: https://cwjechw98-lang.github.io/omskgathering/
- После пуша проверь Actions: https://github.com/cwjechw98-lang/omskgathering/actions

### Частые причины падения CI:
- **Неиспользуемые импорты** — ESLint `no-unused-vars` = error. Убрал компонент из рендера → убери импорт
- **`powershell` в скриптах** — CI на Ubuntu. Используй `node -e` для кроссплатформенных команд
- **Отсутствие BASE_URL** — на GitHub Pages base = `/omskgathering/`. Для путей к ассетам: `${import.meta.env.BASE_URL}cards/file.jpg`

## Работа с изображениями

### Принцип: НИКОГДА не грузить картинки из внешних API в рантайме

Пайплайн:
1. Генерируем через Pollinations API (`gen.pollinations.ai`)
2. Сохраняем в `public/cards/` (или `public/experiments/` для экспериментов)
3. Привязываем через локальные пути с `import.meta.env.BASE_URL`

### Генерация карточных изображений:
```bash
# Через скрипт (массовая генерация карт из cards.ts):
npm run cache:card-images

# Вручную (одна картинка):
curl -o public/cards/CARD_ID.jpg \
  -H "Authorization: Bearer $API_KEY" \
  "https://gen.pollinations.ai/image/PROMPT?width=400&height=300&nologo=true&model=flux"
```

### API ключ:
- Файл `.env` (НЕ коммитится, в `.gitignore`)
- `POLLINATIONS_API_KEY=...`
- `POLLINATIONS_IMAGE_MODEL=flux`

### Доступные модели генерации (бесплатные):
`flux`, `gptimage`, `zimage`, `klein`, `klein-large`, `imagen-4`, `flux-2-dev`, `grok-imagine`

### Платные модели:
`kontext`, `nanobanana`, `nanobanana-2`, `nanobanana-pro`, `seedream5`, `gptimage-large`

## Структура проекта

```
src/
  components/
    MainMenu.tsx        — главное меню + LoreScreen, CardCollection, Rules, Experiments
    GameBoard.tsx       — игровое поле (бой)
    StoryIntro.tsx      — слайдшоу перед битвой
    game/               — компоненты игровых элементов (FieldCard, HandCard, etc.)
    effects/            — визуальные эффекты (ParticleCanvas, Torch)
    ui/                 — shadcn/ui компоненты
  data/
    cards.ts            — все карты (id, stats, imageUrl, keywords)
    lore.ts             — лор, INTRO_SEQUENCE, нарративы
    localCardImages.ts  — маппинг card_id → /cards/file.jpg
  game/
    engine.ts           — barrel export движка
    engine.impl.ts      — реализация механик
    ai.ts               — AI противника (Хранитель)
    types.ts            — типы GameState, Card, etc.
  utils/
    cardImages.ts       — резолвер изображений (local → fallback)
public/
  cards/                — ВСЕ изображения карт и лора (jpg)
  experiments/          — изображения для экспериментов
tests/
  components/           — smoke тесты UI
  game/                 — unit тесты движка
  regression/           — regression тесты механик
  property/             — property-based тесты
```

## Экраны MainMenu

Переключение через `useState<'menu' | 'cards' | 'rules' | 'lore' | 'experiments'>`.
Каждый экран — функция с props `{ onBack: () => void }`.
Добавление нового экрана:
1. Добавь значение в union type
2. Добавь `if (screen === 'xxx') return <Xxx onBack={...} />`
3. Добавь кнопку в меню
4. Создай компонент в том же файле или отдельном

## Записи в WORKLOG.md

После каждой значимой работы добавляй запись:
- Дата и заголовок
- Что сделано (конкретные файлы и изменения)
- Quality gates результаты
- Номер коммита

## Стратегия выполнения задач

### Принцип: ВСЕГДА анализируй задачу перед началом работы
1. **Оцени задачу** — определи тип (генерация контента, код, тесты, UI, деплой, исследование)
2. **Проверь доступные MCP серверы и skills** — подключи те, что релевантны задаче
3. **Используй мульти-агентное исполнение** — параллельные агенты ускоряют работу

### MCP серверы (подключены):
| Сервер | Что делает | Когда использовать |
|--------|-----------|-------------------|
| **Skillsmith** | Поиск, установка, сравнение skills | Новый тип задачи → ищи подходящий skill |

### Skills (установлены, активируй через `/skill-name`):
| Skill | Когда использовать |
|-------|-------------------|
| `develop-web-game` | Разработка игровых компонентов (React + Vite + TS) |
| `best-practices` | Аудит безопасности, качества кода |
| `create-pr` | Создание PR на GitHub |
| `github` | Работа с issues, CI, code review через `gh` CLI |
| `browser-use` | Тестирование в браузере, скриншоты |
| `frontend-testing` | Написание Vitest + RTL тестов |
| `fix` | Lint/format ошибки перед коммитом |

### Мульти-агентное исполнение:
- **Параллельные агенты** — запускай через `Task` tool одновременно, когда подзадачи независимы
- **Примеры параллелизации:**
  - Генерация изображений + написание кода карт + написание тестов → 3 агента
  - Аудит CSS + аудит z-index + поиск мёртвого кода → 3 агента
  - Lint + test + build проверки → параллельно
- **Типы агентов:**
  - `Explore` — быстрый поиск по кодовой базе
  - `Plan` — проектирование архитектуры перед реализацией
  - `general-purpose` — сложные многошаговые задачи
  - `best-practices-specialist` — аудит безопасности и качества
- **Правило:** если задача разбивается на 2+ независимые части → ВСЕГДА запускай параллельно

### Перед началом любой задачи:
1. Прочитай описание задачи целиком
2. Определи, какие MCP/skills помогут
3. Разбей на параллельные подзадачи где возможно
4. Запусти агентов и собери результаты
5. Проверь quality gates перед коммитом

## Особенности

- **Node версия**: CI использует 22.12.0. Локально может быть старше — предупреждение Vite допустимо
- **Tailwind v4**: используется `@tailwindcss/vite` плагин, не PostCSS
- **React 19**: актуальная версия
- **Vite base path**: `base: "/omskgathering/"` в `vite.config.ts` — не менять
- **Эпилог лора**: текст в одну строку (без `\n`) — это намеренно (коммит 59850d7)
