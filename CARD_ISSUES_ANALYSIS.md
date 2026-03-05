# 🔍 Card Issues Analysis & Recommendations

**Date:** 2026-03-05  
**Analysis:** Full card pool review

---

## 🚨 Cards with Similar Issues to Norminette/Siberian Gnev

### Category 1: Low Draw Probability (Rare/Mythic with 1-2 copies)

| Card | Cost | Rarity | Copies | Issue |
|------|------|--------|--------|-------|
| **Black Hole** | 4 | rare | 2 | Destroys ≤2 ATK - rarely drawn |
| **Кластер Лорд** | 7 | mythic | 1 | Too expensive + rare |
| **Дракон Иртыша** | 6 | mythic | 1 | Powerful but rarely seen |
| **Мэр Омска** | 5 | rare | 2 | Token generator - low presence |

### Category 2: Potentially Buggy/Untested Effects

| Card | Effect | Risk Level | Notes |
|------|--------|------------|-------|
| **Химик НПЗ** | 1 damage all on death | 🔴 HIGH | Death effect may not trigger |
| **Пират Иртыша** | Draw on damage | 🟡 MEDIUM | Needs attack tracking |
| **Контролер Трамвая** | -1 ATK on attack | 🟡 MEDIUM | Temporary buff expiration |
| **Архивариус** | Return from graveyard | 🟡 MEDIUM | Target selection logic |

### Category 3: Underpowered (Need Buffs)

| Card | Current | Suggested | Reason |
|------|---------|-----------|--------|
| **Яма на Дороге** | 0.00x eff | Add "or 2 to hero" | Too conditional |
| **Пир-ревью** | 0.00x eff | Take top 2 | Scry 3 for 2 mana weak |
| **Пробка на Ленина** | 0.00x eff | Also freeze | Skip attack too weak |
| **Благоустройство** | Now 1 mana | ✅ FIXED | Was 2 mana |

---

## 💡 Immediate Actions

### Priority 1: Test Death Effects
```typescript
// Test needed for:
- Химик НПЗ (death AOE)
- Житель Подземки (death damage) 
- Писинер (death draw)
- Мастер Шаурмы (death heal already tested)
```

### Priority 2: Increase Copy Count
```
Cards to increase from 2→3 copies:
- Норминетта (uncommon)
- Сибирский Гнев (common)
- Яма на Дороге (uncommon)
- Пир-ревью (uncommon)
```

### Priority 3: Bug Fixes
```
1. Химик НПЗ - verify death trigger
2. Пират Иртыша - verify draw on damage
3. Контролер Трамвая - verify -1 ATK expires
```

---

## 🃏 New Card Proposals

### Theme: Fix Underrepresented Mechanics

#### 1. Card Draw Support (Blue)
```
📚 Библиотека ОмГТУ
3 маны, enchantment
"В начале хода: если у вас ≤2 карт, потяните до 3."
Rarity: uncommon
```

#### 2. Removal Answer (White)
```
🛡️ Росгвардия
2 маны, 1/3, creature
"Защитник. Когда враг разыгрывает заклинание — 
вы можете уничтожить его."
Rarity: rare
```

#### 3. Aggro Finisher (Red)
```
🔥 Последний Аргумент
4 маны, spell
"Нанесите 3 урона всем врагам и 3 урона вражескому герою."
Rarity: uncommon
```

#### 4. Combo Enabler (Green)
```
🌱 Ускоренный Рост
1 мана, spell
"Существо получает +2/+0 и ускорение до конца хода."
Rarity: common
```

#### 5. Control Tool (Black)
```
💀 Налоговая Инспекция
3 маны, spell
"Выберите карту в руке врага. Он сбрасывает её."
Rarity: uncommon
```

---

## 📊 Deck Probability Analysis

### Current Deck Size: ~153 cards
### Opening Hand: 5-6 cards
### Cards Drawn by Turn 5: ~10-12 cards

**Probability to see specific card by turn 5:**
| Copies | Chance |
|--------|--------|
| 1 (mythic) | ~6% |
| 2 (rare/uncommon) | ~12% |
| 3 (suggested) | ~18% |
| 4 (common lands) | ~24% |

**Recommendation:** Increase key gameplay cards to 3 copies for consistency.

---

## 🎯 Action Plan

### Week 1: Testing
- [ ] Test all death effects
- [ ] Test all "on damage" triggers
- [ ] Test temporary buff expiration

### Week 2: Balance
- [ ] Increase 5 cards to 3 copies
- [ ] Buff 3 underpowered spells
- [ ] Add mulligan system

### Week 3: New Cards
- [ ] Add 5 new cards (listed above)
- [ ] Playtest new cards
- [ ] Adjust based on feedback

### Week 4: Documentation
- [ ] Card interaction wiki
- [ ] Combo guide
- [ ] Mulligan guide

---

**Status:** Analysis Complete  
**Next Step:** Begin Priority 1 testing
