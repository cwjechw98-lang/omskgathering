# 🧪 Тестирование Моделей Pollinations

## 📋 Обзор

Этот документ описывает как тестировать разные модели генерации изображений через Pollinations API.

## 🎯 Доступные Модели

### Через Pollinations.gen (работают стабильно):
- ✅ `flux` - быстрая и качественная (по умолчанию)
- ✅ `flux-2-dev` - улучшенная версия Flux
- ✅ `gptimage` - от OpenAI
- ✅ `zimage` - альтернативная модель
- ✅ `klein` - художественная
- ✅ `klein-large` - большая версия
- ✅ `imagen-4` - от Google
- ✅ `grok-imagine` - от xAI (Grok)

### Через api.airforce (требуют API ключа):
- ⚠️ `flux-2-dev` (api.airforce endpoint)
- ⚠️ `imagen-4` (api.airforce endpoint)
- ⚠️ `grok-imagine` (api.airforce endpoint)

## 🚀 Быстрый Тест

### 1. Обновите .env файл

```env
POLLINATIONS_API_KEY=sk_qExVrb9RH4xwr3DOV3GtOSngNDpxjWdf
POLLINATIONS_IMAGE_MODEL=flux
```

### 2. Запустите генерацию одной карты

```bash
cd "C:\project21\omsk gatering"
node scripts/generate-grok-images.cjs
```

Скрипт автоматически пропускает уже сгенерированные карты.

### 3. Сравните результаты

Изображения сохраняются в: `public/cards/`

## 📊 Сравнение Моделей

| Модель | Качество | Скорость | Стиль | Рекомендация |
|--------|----------|----------|-------|--------------|
| `flux` | ⭐⭐⭐⭐ | Быстро | Реалистичный | ✅ По умолчанию |
| `flux-2-dev` | ⭐⭐⭐⭐⭐ | Средне | Детальный | ✅ Для важных карт |
| `grok-imagine` | ⭐⭐⭐⭐⭐ | Средне | Художественный | ✅ Для легенд |
| `imagen-4` | ⭐⭐⭐⭐ | Быстро | Чистый | ✅ Для существ |
| `gptimage` | ⭐⭐⭐ | Быстро | Мягкий | ⚠️ Для фонов |
| `zimage` | ⭐⭐⭐ | Очень быстро | Яркий | ⚠️ Для тестов |
| `klein` | ⭐⭐⭐⭐ | Медленно | Арт-хаус | ⚠️ Для уникальных |

## 🔧 Ручное Тестирование

### Генерация через curl

```bash
# Flux (базовая)
curl -o public/cards/test_flux.jpg \
  "https://gen.pollinations.ai/image/magical%20bird?model=flux&width=1024&height=1024&nologo=true"

# Grok Imagine
curl -o public/cards/test_grok.jpg \
  "https://gen.pollinations.ai/image/magical%20bird?model=grok-imagine&width=1024&height=1024&nologo=true"

# Imagen 4
curl -o public/cards/test_imagen.jpg \
  "https://gen.pollinations.ai/image/magical%20bird?model=imagen-4&width=1024&height=1024&nologo=true"
```

### Генерация через Node.js

```javascript
const https = require('https');
const fs = require('fs');

const models = ['flux', 'flux-2-dev', 'grok-imagine', 'imagen-4'];
const prompt = encodeURIComponent('magical glowing crow bird over night city');

for (const model of models) {
  const url = `https://gen.pollinations.ai/image/${prompt}?model=${model}&width=1024&height=1024&nologo=true`;
  const output = `public/cards/test_${model}.jpg`;
  
  https.get(url, (response) => {
    const file = fs.createWriteStream(output);
    response.pipe(file);
    console.log(`Generated: ${output}`);
  });
}
```

## 📝 Промпт для Тестирования

Используйте этот промпт для сравнения моделей:

```
Magic The Gathering style fantasy card illustration, 
dark magical post-soviet Omsk, 
glowing mystical crow bird flying over night city in magical aura, 
prophetic urban cryptid, luminous omen in night sky, 
white mana aesthetic, cathedral glow, gold accents, 
solemn noble light, premium trading card art, 
square 1:1, highly detailed, painterly rendering, 
cinematic lighting, strong silhouette, 
no text, no card frame
```

## ⚠️ Проблемы и Решения

### HTTP 400 Bad Request
- **Причина**: Слишком длинный промпт или неверный формат
- **Решение**: Сократите промпт до 500 символов

### HTTP 401 Unauthorized
- **Причина**: Неверный API ключ
- **Решение**: Проверьте .env файл

### HTTP 429 Too Many Requests
- **Причина**: Превышен лимит запросов
- **Решение**: Подождите 1 минуту или используйте API ключ

### HTTP 530 Origin Error
- **Причина**: Проблема на стороне Pollinations
- **Решение**: Подождите 5-10 минут

### Пустые файлы (0 KB)
- **Причина**: Таймаут или ошибка API
- **Решение**: Увеличьте timeout до 120 секунд

## 📊 Результаты Тестов

### Тест от 2026-03-07

**Карта**: Птица-Омич (bird_omsk)  
**Промпт**: Детальный с лором (1200 символов)  
**Размер**: 1024x1024

| Модель | Файл | Размер | Качество | Вердикт |
|--------|------|--------|----------|---------|
| `flux` | bird_omsk.jpg | 151 KB | ⭐⭐⭐⭐ | ✅ Основное |
| `grok-imagine` | bird_omsk_grok.jpg | TBD | TBD | TBD |
| `flux-2-dev` | bird_omsk_flux2.jpg | TBD | TBD | TBD |
| `imagen-4` | bird_omsk_imagen.jpg | TBD | TBD | TBD |

## 🎯 Рекомендации

### Для каких карт какие модели использовать:

1. **Легендарные существа** (Мэр, Дракон, Медведь):
   - ✅ `grok-imagine` - художественный стиль
   - ✅ `flux-2-dev` - максимальная детализация

2. **Обычные существа** (Студент, Дворник, Бабка):
   - ✅ `flux` - быстро и качественно
   - ✅ `imagen-4` - чистый стиль

3. **Заклинания и эффекты**:
   - ✅ `flux` - универсально
   - ✅ `zimage` - яркие эффекты

4. **Земли и локации**:
   - ✅ `klein` - художественный вид
   - ✅ `flux` - реалистично

## 📚 Дополнительные Ресурсы

- [Pollinations Documentation](https://pollinations.ai/docs)
- [GitHub Repository](https://github.com/pollinations/pollinations)
- [Model Comparison Guide](https://pollinations.ai/models)

---

**Контакты**: При проблемах обращайтесь в Discord сообщества или создавайте Issue на GitHub.

*OMSK: THE GATHERING © MMXXVI*
