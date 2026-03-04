# 🎨 OMSK: The Gathering — Визуальные эффекты

**Дата:** 2026-03-04  
**Файл:** `effects_info.md`

---

## 📋 Обзор

На игровом поле реализовано **~30 визуальных эффектов** с использованием CSS keyframes, React state и Canvas для частиц.

---

## 1️⃣ Анимации карт

| Эффект | CSS класс | Длительность | Описание |
|--------|-----------|--------------|----------|
| **Розыгрыш карты** | `card-play-animation` | 0.4с | Карта летит из руки на поле с overshoot (увеличение 105% → 100%) |
| **Смерть карты** | `card-death-animation` | 0.5с | Карта растворяется с частицами, гравитация вниз |
| **Атака** | `card-attack-animation` | 0.65с | Замах (←15px) + удар (→80px) + возврат (0.35с) |
| **Получение урона** | `card-damage-animation` | 0.15с | Тряска (±8px) + красная вспышка |
| **Добор карты** | `card-draw-animation` | 0.35с | Карта прилетает сверху справа (100px, -50px) |
| **Сброс карты** | `card-discard-animation` | 0.3с | Улетает влево вниз (-200px, 50px) с вращением |

**Файл:** `src/index.css`

```css
@keyframes cardPlayToField {
  0% { transform: translateY(100px) scale(0.8) rotate(-5deg); opacity: 0; }
  70% { transform: translateY(-10px) scale(1.05) rotate(1deg); opacity: 1; }
  100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 1; }
}
```

---

## 2️⃣ Эффекты на картах

| Эффект | Где | Описание |
|--------|-----|----------|
| **Голографическая фольга** | Mythic/Rare карты | Радужный градиент `linear-gradient(135deg, rgba(255,0,150,0.4)...)` с анимацией `holoShift` (4с) |
| **Свечение карты** | При наведении | `box-shadow: 0 0 20px rgba(201,168,76,0.6)` с `glowPulse` (2с) |
| **Заморозка** | Frozen карты | Голубой overlay `bg-cyan-300/15` на весь размер карты |
| **Индикатор доступности** | Можно атаковать | Зелёная пульсирующая точка ⚔️ `animate-pulse` |
| **Статусы** | Иконки | ❄️ заморожен, 💤 болезнь призыва, ✅ атаковал, 🛡️ защитник |

**Файл:** `src/components/GameBoard.tsx`

```tsx
{(card.data.rarity === 'mythic' || card.data.rarity === 'rare') && (
  <div className={`card-foil-overlay pointer-events-none z-50 ${card.data.rarity === 'mythic' ? 'opacity-50' : 'opacity-30'}`} />
)}
```

---

## 3️⃣ Боевые эффекты

| Эффект | Компонент | Длительность | Описание |
|--------|-----------|--------------|----------|
| **Числа урона** | `damage-number` | 0.8с | Всплывающие `-3`, `+2`, `+❤` с анимацией `damageFloat` |
| **Линия прицеливания** | SVG `targeting-line` | 0.5с | Пунктирная линия `stroke-dasharray="8,4"` от атакующего к цели |
| **Тряска экрана** | `combat-shake` | 0.3с | Короткая вибрация `translateX(±4px)` при получении урона |

**Файл:** `src/index.css`

```css
@keyframes damageFloat {
  0% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
  20% { transform: translateY(-10px) scale(1.2) rotate(-5deg); }
  100% { opacity: 0; transform: translateY(-50px) scale(0.8) rotate(5deg); }
}
```

**Файл:** `src/components/GameBoard.tsx`

```tsx
// Spawn damage number popup
const showDamageNumber = useCallback((value: number, x: number, y: number, type: 'damage' | 'heal' | 'buff' = 'damage') => {
  const id = Date.now() + Math.random();
  setDamageNumbers(prev => [...prev, { id, value, x, y, type }]);
  setTimeout(() => {
    setDamageNumbers(prev => prev.filter(dn => dn.id !== id));
  }, 800);
}, []);
```

---

## 4️⃣ Эффекты интерфейса

| Эффект | CSS класс | Длительность | Описание |
|--------|-----------|--------------|----------|
| **Предупреждение низкого HP** | `low-health-overlay` | 1с (pulse) | Красная виньетка `radial-gradient(ellipse at center, transparent 30%, rgba(255,0,0,0.4) 100%)` при HP ≤ 10 |
| **Баннер хода** | `turn-banner` | 1.8с | Выезжающая плашка "ХОД ХРАНИТЕЛЯ" с `turnBannerSlide` |
| **Рябь на кнопках** | `btn-ripple` | 0.6с | Расходящиеся круги `radial-gradient(circle, rgba(255,255,255,0.6)...)` при клике |
| **Мана-частицы** | `mana-drain-particle` | 0.4с | Синие частицы `bg-blue-500` при потере маны |
| **Дуга добора** | `draw-arc-trail` | 0.35с | Синяя дуга `border: 2px solid rgba(59,130,246,0.6)` при доборе карты |

**Файл:** `src/index.css`

```css
@keyframes turnBannerSlide {
  0% { transform: translateX(-100%) scale(0.8); opacity: 0; }
  20% { transform: translateX(0) scale(1); opacity: 1; }
  80% { transform: translateX(0) scale(1); opacity: 1; }
  100% { transform: translateX(100%) scale(0.8); opacity: 0; }
}

@keyframes rippleExpand {
  0% { transform: scale(0); opacity: 0.6; }
  100% { transform: scale(4); opacity: 0; }
}
```

---

## 5️⃣ Фоновые эффекты

| Эффект | Компонент | Описание |
|--------|-----------|----------|
| **Частицы (эмберы)** | `ParticleCanvas` | Оранжевые искры снизу вверх с drift и flicker |
| **Огни ТЭЦ** | `fire-light` | Пульсирующее свечение `box-shadow` по краям экрана |
| **Плавающие объекты** | `drift-slow` | 🐦❄️🏭👻🐉🧙‍♀️ на фоне с анимацией `driftSlow` (15с) |

**Файл:** `src/components/effects/ParticleCanvas.tsx`

```tsx
// Embers rise from bottom, drift, flicker
const createParticle = (): Particle => ({
  x: Math.random() * W(),
  y: H() + 10,
  vx: (Math.random() - 0.5) * 0.8,
  vy: -(0.5 + Math.random() * 1.5),
  size: 1 + Math.random() * 3,
  alpha: 0.6 + Math.random() * 0.4,
  color: '#ff6600',
  // ...
});
```

---

## 6️⃣ Анимации состояний

| Состояние | CSS класс | Длительность | Описание |
|-----------|-----------|--------------|----------|
| **Победа** | `victory-overlay` | 2с | Золотая вспышка `rgba(255,215,0,0.4)` |
| **Поражение** | `defeat-overlay` | 2с | Красная вспышка `rgba(100,0,0,0.5)` |
| **Ход ИИ** | — | — | Анимация "размышляет..." с прыгающими точками `animate-bounce` |
| **Переход хода** | `turn-transition-animation` | 1.2с | Плавное затемнение с `ease-out` |

**Файл:** `src/index.css`

```css
@keyframes victoryFlash {
  0% { opacity: 0; background: rgba(255,215,0,0); }
  10% { opacity: 1; background: rgba(255,215,0,0.4); }
  100% { opacity: 0; background: rgba(255,215,0,0); }
}
```

---

## 7️⃣ Tooltip эффекты

| Элемент | Tooltip | Описание |
|---------|---------|----------|
| **Ключевые слова** | Hover на ⚡🛡️🕊️ | Полное описание: "⚡ Ускорение", "🛡️ Защитник" |
| **Эмодзи карты** | Hover на 🐦 | Название карты: "Птица-Омич" |
| **Мана-кристаллы** | Hover на 💎 | "Мана: 5/6" |
| **Статистика** | Hover на 🤚📚💀 | "Карт в руке", "Карт в колоде", "Карт на кладбище" |

**Файл:** `src/index.css`

```css
.keyword-tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-4px);
  background: rgba(10,10,15,0.95);
  border: 1px solid rgba(201,168,76,0.4);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.keyword-tooltip:hover::after {
  opacity: 1;
  transform: translateX(-50%) translateY(-8px);
}
```

---

## 8️⃣ Адаптивные эффекты

| Breakpoint | Изменения |
|------------|-----------|
| **Mobile (<768px)** | Уменьшены частицы (density: 24), скрыты факелы (`hidden sm:block`), уменьшены rune (40px), логотип (text-5xl) |
| **Tablet (768-1024px)** | Средний размер карт, частицы (density: 12-22) |
| **Desktop (>1024px)** | Полные эффекты, частицы (density: 40-60), факелы видны |

**Файл:** `src/components/MainMenu.tsx`

```tsx
<ParticleCanvas
  type="embers"
  density={liteFx ? 24 : 40}
  className="fixed inset-0"
  interactive={false}
/>

<div className="relative -mr-4 mt-8 hidden sm:block">
  <Torch side="left" />
</div>
```

---

## 📊 ИТОГО

| Категория | Количество эффектов |
|-----------|---------------------|
| Анимации карт | 6 |
| Эффекты на картах | 5 |
| Боевые эффекты | 3 |
| Эффекты интерфейса | 5 |
| Фоновые эффекты | 3 |
| Анимации состояний | 4 |
| Tooltip | 4 типа |
| **ВСЕГО** | **~30** |

---

## 🛠️ Технологии

| Технология | Использование |
|------------|---------------|
| **CSS @keyframes** | 25+ анимаций |
| **React useState/useCallback** | Динамические эффекты (damage numbers, targeting line) |
| **Canvas API** | ParticleCanvas (эмберы, снег, магия) |
| **SVG** | Targeting line (градиентная пунктирная линия) |
| **Tailwind CSS** | Утилитарные классы + custom CSS |

---

## 📁 Файлы с эффектами

| Файл | Эффекты |
|------|---------|
| `src/index.css` | ~400 строк CSS анимаций |
| `src/components/GameBoard.tsx` | Damage numbers, targeting line, low-health overlay |
| `src/components/effects/ParticleCanvas.tsx` | Частицы (эмберы, снег, магия, дым) |
| `src/components/effects/Torch.tsx` | Огонь факелов (Canvas) |
| `src/components/effects/CardDust.tsx` | CardPlayAnimation, CardDeathAnimation |
| `src/components/ui/button.tsx` | Button ripple effect |

---

*Документ создан: 2026-03-04*
