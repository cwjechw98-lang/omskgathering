# MCP и Skills для проекта OMSK: The Gathering

## MCP (доступно в этой сессии)

### 1) Web MCP / Internet tools
- `web.search_query` — поиск в интернете
- `web.open` / `web.click` / `web.find` — чтение и навигация по страницам
- `web.image_query` — поиск изображений
- `web.finance` / `web.weather` / `web.sports` / `web.time` — специализированные запросы

### 2) Local MCP resources
- `list_mcp_resources` / `list_mcp_resource_templates` / `read_mcp_resource`
- Для чтения ресурсов от подключенных MCP-серверов (если серверы настроены)

### 3) Playwright MCP (браузерная автоматизация)
- `mcp__playwright__browser_*` (navigate, click, fill_form, snapshot, screenshot, evaluate и др.)
- Подходит для UI-проверок, smoke/E2E, поиска визуальных регрессий

### 4) Skyvern MCP (AI browser automation)
- `mcp__skyvern__skyvern_*` (navigate, act, click, extract, validate, wait, workflows)
- Подходит для полуавтоматических web-сценариев и извлечения данных

## Skills (из AGENTS.md)

Ниже — доступные skills в текущей среде.

### Наиболее полезные для этого проекта
- `develop-web-game` — основной цикл разработки web-игры + проверки
- `playwright` — браузерная автоматизация для UI/E2E
- `playwright-cli` — запуск и работа с Playwright-тестами
- `frontend-testing` (если установлен отдельно локально) — фокус на тестировании frontend
- `imagegen` — генерация/редактирование изображений (например, арт карт)
- `gh-fix-ci` / `gh-address-comments` — работа с CI и PR-комментариями через GitHub

### Остальные доступные skills
- `doc`
- `linear`
- `netlify-deploy`
- `openai-docs`
- `pdf`
- `playwright-dev`
- `render-deploy`
- `screenshot`
- `security-best-practices`
- `security-ownership-map`
- `security-threat-model`
- `sora`
- `speech`
- `spreadsheet`
- `transcribe`
- `vercel-deploy`
- `skill-creator`
- `skill-installer`

## Рекомендуемый минимальный набор для ежедневной работы по OMSK
- `develop-web-game`
- `playwright`
- `gh-fix-ci`
- `imagegen` (для новых карт)
- `openai-docs` (когда нужны актуальные API/SDK детали)

---

Файл создан автоматически на основе текущих инструкций AGENTS.md и доступных инструментов сессии.
