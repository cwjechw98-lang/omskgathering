# OMSK: The Gathering — Проектная Документация

## 📦 Основная Информация

**Репозиторий:** https://github.com/cwjechw98-lang/omskgathering  
**Деплой:** GitHub Pages (автоматически при пуше в `main`)  
**URL проекта:** https://cwjechw98-lang.github.io/omskgathering/

**Стек:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui

---

## 🔧 MCP и Skills — Использование

### Доступные MCP (Model Context Protocol)

| MCP | Инструменты | Назначение |
|-----|-------------|------------|
| **Web MCP** | `web.search_query`, `web.open`, `web.click`, `web.find`, `web.image_query` | Поиск в интернете, навигация по страницам, извлечение данных |
| **Local MCP** | `list_mcp_resources`, `read_mcp_resource` | Чтение ресурсов от подключенных MCP-серверов |
| **Playwright MCP** | `mcp__playwright__browser_*` | Браузерная автоматизация для UI/E2E тестов |
| **Skyvern MCP** | `mcp__skyvern__skyvern_*` | AI-автоматизация веб-сценариев |

### Доступные Skills

| Skill | Назначение | Когда использовать |
|-------|------------|-------------------|
| `frontend-testing` | Vitest + React Testing Library тесты | Создание/обновление тестов компонентов |
| `playwright-cli` | Playwright браузерная автоматизация | E2E тесты, скриншоты, smoke-проверки |
| `playwright` | Playwright для UI-проверок | Валидация визуальных регрессий |
| `imagegen` | Генерация/редактирование изображений | Создание артов карт через OpenAI Image API |
| `github` | Операции с GitHub (PR, CI, issues) | Работа с пул-реквестами, CI логами |
| `fix` | Исправление lint/format ошибок | Перед коммитом для прохождения CI |
| `hygiene` | Проверка code hygiene проекта | Специфичные для VS Code проверки |
| `security-best-practices` | Security review кода | Аудит безопасности (Python/JS/Go) |
| `doc` | Работа с .docx документами | Создание/редактирование документов |
| `pdf` | Работа с PDF файлами | Генерация/анализ PDF |
| `spreadsheet` | Работа с таблицами (.xlsx, .csv) | Анализ данных, формулы |
| `transcribe` / `speech` | Транскрибация аудио, TTS | Работа с аудио через OpenAI Audio API |
| `vercel-deploy` / `netlify-deploy` / `render-deploy` | Деплой на платформы | Альтернативные деплои (не используется) |

### Рекомендуемый набор для ежедневной работы

```
✅ frontend-testing     — тесты компонентов
✅ playwright-cli       — браузерные smoke-проверки
✅ github               — работа с PR/CI
✅ imagegen             — генерация артов карт
✅ fix / hygiene        — пре-коммит проверки
```

---

## 📁 Файлы для Чтения при Начале Сессии

### Обязательные (каждая сессия)

| Файл | Зачем читать |
|------|--------------|
| `BRIEF.md` | Контекст проекта, сессионная память, текущие цели |
| `WORKLOG.md` | История изменений, последние сделанные шаги |
| `progress.md` | Статус этапов разработки (mod.md stages) |

### Контекстные (по задаче)

| Файл | Когда читать |
|------|--------------|
| `ui-fix.md` | Исправление UI/layout проблем |
| `mod.md` | Стабилизация архитектуры UI (9 этапов) |
| `determ.md` | Deterministic replay система |
| `testmod.md` | Property-based тестирование |
| `effects_info.md` | Визуальные эффекты и z-index слои |
| `BALANCE_AUDIT_*.md` | Баланс карт и изменения |
| `MCP_AND_SKILLS.md` | Справка по доступным MCP и skills |

### Артефакты (для верификации)

| Путь | Зачем |
|------|-------|
| `output/keeper-audit/` | Отчёты Keeper-аудита (engine + UI) |
| `output/new-card-set-*/` | Сгенерированные арты карт |
| `tests/regression/` | Regression тесты механик |
| `.github/workflows/` | CI/CD конфигурации |

---

## 🔄 Рабочий Процесс (Workflow)

### 1. Начало Сессии

```markdown
1. Прочитать BRIEF.md и WORKLOG.md
2. Проверить progress.md для статуса этапов
3. Запустить memory_tail(20) через MCP Memory (если доступен)
4. Определить задачу сессии
```

### 2. Перед Выполнением Запроса

```markdown
1. Проанализировать запрос
2. Определить необходимый MCP/skill:
   - Тесты? → frontend-testing
   - Браузер? → playwright-cli
   - Картинки? → imagegen
   - GitHub? → github
   -Lint ошибки? → fix
3. Если MCP/skill не нужен → выполнять напрямую
```

### 3. Внесение Изменений

```markdown
1. Сделать изменения в коде
2. Запустить quality gates:
   - npm run lint
   - npm run test
   - npm run test:regression
   - npm run build
3. Исправить ошибки через `npm run lint:fix` или skill: fix
```

### 4. Фиксация Изменений

```markdown
1. Обновить WORKLOG.md (добавить 3-6 буллетов о сделанном)
2. Проверить статус git:
   git status
   git diff HEAD
3. Создать коммит с описанием:
   git add .
   git commit -m "<task>.md: <краткое описание>"
4. Запушить:
   git push
```

### 5. Конец Сессии

```markdown
1. Обновить WORKLOG.md с итогами сессии
2. Вызвать memory_append() (если MCP Memory доступен)
3. Запомнить контекст для следующей сессии
```

---

## 📝 Формат Коммитов

### Структура сообщения

```
<task>.md: <краткое описание изменений>

Co-Authored-By: <если использовался AI>
```

### Примеры из истории

```
ui-fix.md: Remove dead grid CSS, stabilize board-slots flex layout
determ.md: Add deterministic replay system
testmod.md: Add property-based testing with fast-check
UI Stabilization Stage 4: Board Slots
Update WORKLOG.md with Stage 4 quality gate results
```

### Префиксы по задачам

| Префикс | Когда использовать |
|---------|-------------------|
| `ui-fix.md:` | Исправления UI/layout |
| `determ.md:` | Replay система |
| `testmod.md:` | Тестирование |
| `mod.md:` | Архитектурные изменения UI |
| `Update WORKLOG.md` | Логирование сессии |
| `Update progress.md` | Обновление статуса этапов |

---

## 🚀 Деплой на GitHub Pages

### Автоматический деплой

```yaml
Триггеры:
- push в ветку main
- workflow_dispatch (ручной запуск)

Процесс:
1. GitHub Actions запускает build
2. Создается artifact в dist/
3. Деплойится на GitHub Pages

URL: https://cwjechw98-lang.github.io/omskgathering/
```

### Проверка деплоя

```bash
# После пуша проверить:
1. Actions tab на GitHub — статус workflow
2. Открыть https://cwjechw98-lang.github.io/omskgathering/
3. Проверить консоль браузера на ошибки
```

### Локальная проверка перед деплоем

```bash
npm run build
npm run preview
# или
npm run dev
```

---

## ✅ Quality Gates

### Обязательные проверки перед коммитом

```bash
# 1. Lint (0 ошибок)
npm run lint

# 2. Unit тесты
npm run test

# 3. Regression тесты (механики)
npm run test:regression

# 4. Replay тесты
npm run test:replay

# 5. Build (без ошибок)
npm run build
```

### CI проверки (GitHub Actions)

- `quality-gate.yml` — lint + test + build
- `deploy-pages.yml` — деплой на GitHub Pages

---

## 📊 Структура Проекта

```
omsk gatering/
├── src/
│   ├── components/
│   │   ├── game/          # Игровые компоненты (GameBoard, PlayerArea)
│   │   ├── ui/            # shadcn/ui примитивы
│   │   └── effects/       # Визуальные эффекты
│   ├── game/
│   │   ├── engine.ts      # Игровой движок (facade)
│   │   ├── engine.impl.ts # Реализация движка
│   │   ├── ai.ts          # AI логика
│   │   ├── cards.ts       # Каталог карт
│   │   └── types.ts       # TypeScript типы
│   ├── data/
│   │   ├── cards.ts       # Карточки (баланс, механики)
│   │   ├── localCardImages.ts  # Маппинг локальных артов
│   │   └── lore.ts        # Лор и цитаты
│   ├── utils/
│   │   └── cardImages.ts  # Резолвер артов (local → external → emoji)
│   └── index.css          # Стили (CSS Grid, анимации, z-layers)
├── tests/
│   ├── game/              # Unit тесты движка
│   ├── components/        # Component тесты
│   ├── regression/        # Regression тесты механик
│   └── property/          # Property-based тесты
├── scripts/
│   ├── cache-card-images.mjs  # Кэширование артов
│   └── audit-new-cards-matrix.mjs  # Аудит новых карт
├── output/
│   ├── keeper-audit/      # Артефакты аудита
│   └── new-card-set-*/    # Сгенерированные арты
├── .github/workflows/
│   ├── quality-gate.yml   # CI проверки
│   └── deploy-pages.yml   # Деплой
├── BRIEF.md               # Контекст проекта
├── WORKLOG.md             # Лог изменений
├── progress.md            # Статус этапов
├── MCP_AND_SKILLS.md      # Справка по MCP/Skills
└── PROJECT_WORKFLOW.md    # Этот файл
```

---

## 🎯 Текущие Цели Проекта

1. ✅ Стабилизация UI layout (CSS Grid → flex board-slots)
2. ✅ Regression покрытие механик (51 тест)
3. ✅ Property-based тестирование (5 инвариантов)
4. ✅ Deterministic replay система
5. ⏳ Адаптивность mobile/desktop
6. ⏳ UX-polish Keeper режима
7. ⏳ Интеграция новых карт (10/10 готово)

---

## 📞 Контакты и Доступы

**GitHub:** cwjechw98-lang  
**Email:** cwjechw98@gmail.com  
**Node.js версия:** 22.12+ (требуется для Vite 7.2.4)

**Переменные окружения (.env):**
```
POLLINATIONS_API_KEY=<ключ для генерации артов>
```

---

## ⚠️ Важные Заметки

1. **Node.js версия:** Локально может быть warning (20.18.1 < 20.19), но CI использует 22.12.0
2. **Деплой автоматический:** Каждый пуш в `main` триггерит деплой
3. **WORKLOG.md обязателен:** Каждое изменение должно быть залогировано
4. **Quality gates строгие:** 0 lint ошибок, все тесты должны проходить
5. **MCP Memory:** Локальный сервер в `C:\MCP GPT CODE\mcp_memory\`

---

## 🔄 Чеклист Новой Сессии

- [ ] Прочитать BRIEF.md
- [ ] Прочитать WORKLOG.md (последние записи)
- [ ] Проверить progress.md
- [ ] Запустить `git pull` для актуализации
- [ ] Определить задачу сессии
- [ ] Подобрать MCP/skill если нужно
- [ ] Выполнить задачу
- [ ] Пройти quality gates
- [ ] Обновить WORKLOG.md
- [ ] Сделать commit + push
- [ ] Проверить деплой на GitHub Pages

---

*Последнее обновление: 2026-03-05*
