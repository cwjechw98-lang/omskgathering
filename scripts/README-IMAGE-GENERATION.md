# Генерация изображений карт через Grok Imagine

## 📋 Обзор

Этот скрипт генерирует изображения для всех карт игры "Omsk: The Gathering" используя **Grok Imagine** модель через Pollinations API.

## 🔧 Требования

1. **API ключ Pollinations** (уже есть в `.env`)
2. **Node.js** 18+
3. **Доступ в интернет**

## 🚀 Быстрый старт

### 1. Проверка настроек

Файл `.env` должен содержать:
```env
POLLINATIONS_API_KEY=sk_qExVrb9RH4xwr3DOV3GtOSngNDpxjWdf
POLLINATIONS_IMAGE_MODEL=grok-imagine
```

### 2. Запуск генерации

```bash
cd "C:\project21\omsk gatering"
node scripts/generate-grok-images.cjs
```

### 3. Результат

Изображения сохраняются в: `public/cards/{card_id}.jpg`

## 📝 Как это работает

### Процесс генерации

1. **Чтение данных карт** из `src/data/cards.ts`
2. **Генерация детального промпта** для каждой карты:
   - Учёт лора персонажа (омские мемы, реалии)
   - Цвет карты (white/blue/black/red/green/colorless)
   - Ключевые слова (haste, flying, deathtouch и т.д.)
   - Flavor text (дополнительные детали)
3. **Запрос к Pollinations API**:
   ```
   https://gen.pollinations.ai/image/{PROMPT}?model=grok-imagine&width=400&height=300&nologo=true&key={API_KEY}
   ```
4. **Сохранение изображения** в `public/cards/`

### Детальные промпты

Для каждого персонажа учитываются особенности:

**Пример: Птица-Омич**
```
legendary omsk bird meme, mystical crow with glowing eyes, 
symbol of omsk city, magical siberian creature, 
dark prophetic atmosphere, holy golden light, 
flying with wings spread, soaring in cloudy sky
```

**Пример: Гопник с Любинского**
```
omsk street tough from Lubinsky district, 
squatting pose, tracksuit, urban subculture, 
fierce flames, haste and first strike energy, 
lightning bolts, dynamic motion
```

## 🎨 Модели Pollinations

Доступные модели (указываются в `.env`):
- `grok-imagine` ⭐ **лучшая** (используется по умолчанию)
- `flux` - быстрая и качественная
- `gptimage` - альтернативная
- `zimage` - экспериментальная
- `klein` - художественная
- `imagen-4` - от Google

## 📦 Структура промпта

Каждый промпт включает:

1. **Базовый стиль**: "Magic the Gathering style card art"
2. **Лор персонажа**: Уникальные детали из омского контекста
3. **Тип карты**: creature/spell/enchantment
4. **Цветовая тема**: 
   - White → holy golden light, divine radiance
   - Blue → mystic blue energy, arcane magic
   - Black → dark shadows, necrotic energy
   - Red → fierce flames, volcanic energy
   - Green → nature magic, forest energy
   - Colorless → metallic silver, stone texture
5. **Эффекты keywords**:
   - haste → lightning bolts, speed lines
   - flying → wings spread, soaring in sky
   - deathtouch → poisonous green mist
   - и т.д.
6. **Стилевые модификаторы**: "highly detailed digital painting, 4k quality, artstation trending"

## 🔄 Перегенерация

Если нужно перегенерировать все изображения:

```bash
# 1. Очистить папку (опционально)
rm -rf public/cards/*.jpg

# 2. Запустить генерацию заново
node scripts/generate-grok-images.cjs
```

## ⚠️ Возможные проблемы

### HTTP ошибки

- **530 Error** - проблема на стороне Pollinations, подождите
- **401 Unauthorized** - проверьте API ключ в `.env`
- **429 Too Many Requests** - превышен лимит, используйте API ключ

### Таймауты

Скрипт ждёт 60 секунд на каждое изображение. Если сеть медленная:
- Увеличьте `TIMEOUT_MS` в скрипте
- Запускайте по несколько карт за раз

### Пустые файлы

Если файл 0 байт - запрос не удался. Перезапустите скрипт.

## 📊 Статистика

- **Всего карт**: 39
- **Размер изображения**: 400x300 пикселей
- **Формат**: JPG
- **Средний размер файла**: 150-200 KB
- **Время генерации**: ~2-5 секунд на карту

## 🎯 Следующие шаги

После генерации:
1. Проверьте качество изображений
2. При необходимости отредактируйте промпты в скрипте
3. Закоммитьте новые изображения в git
4. Обновите игру

## 📚 Исследование лора

Для улучшения промптов изучайте:
- Омские паблики в VK
- Местные мемы и легенды
- Реальные локации (Любинский, Школа 21, Иртыш)
- Персонажей городского фольклора

---

**Контакты**: При проблемах обращайтесь в Discord сообщества или создавайте Issue на GitHub.
