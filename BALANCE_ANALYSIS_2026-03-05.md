# ⚖️ Card Balance Analysis Report

**Date:** 2026-03-05  
**Cards Analyzed:** 64 (excluding lands)

---

## 🚨 Critical Balance Issues

### Summary
| Category | Count | Percentage |
|----------|-------|------------|
| 🔴 Overpowered/Broken | 42 | **65.6%** |
| 🟡 Balanced | 5 | 7.8% |
| 🟢 Underpowered | 17 | 26.6% |

**⚠️ WARNING:** 65.6% of cards are overpowered! This indicates severe balance issues.

---

## 🔴 TOP 15 OVERPOWERED CARDS

| Rank | Card | Cost | Efficiency | Issue |
|------|------|------|------------|-------|
| 1 | **Segmentation Fault** | 1 | 7.50x | 7.5 value for 1 mana! |
| 2 | **Птица-Омич** | 1 | 5.00x | 1/1 flying + draw on enter |
| 3 | **Студент ОмГТУ** | 1 | 4.50x | 2/2 defender + scry |
| 4 | **Кофемашина Кластера** | 1 | 4.50x | 2/2 defender + heal |
| 5 | **Писинер Школы 21** | 2 | 4.50x | 2/2 + ramp + draw on death |
| 6 | **Иртышский Комар** | 1 | 4.00x | 1/1 flying + lifelink |
| 7 | **Дворник-Берсерк** | 1 | 4.00x | 1/2 haste + scaling |
| 8 | **Житель Подземки** | 2 | 3.75x | 2/2 deathtouch + deathball |
| 9 | **Бабка с Семечками** | 1 | 3.00x | 1/2 + ongoing heal |
| 10 | **Мастер Шаурмы** | 2 | 3.00x | 2/3 lifelink + heal |
| 11 | **Рыночный Торговец** | 2 | 3.00x | 2/2 + draw 1 |
| 12 | **Сводка 112** | 1 | 3.00x | 2 damage or 1 direct |
| 13 | **Makefile-Голем** | 4 | 2.88x | 4/3 haste trample + draw |
| 14 | **Бабушка с Метро** | 2 | 2.75x | 2/3 defender + tax |
| 15 | **Хроникер Иртыша** | 2 | 2.75x | 2/3 defender + scry 2 |

---

## 🟢 UNDERPOWERED CARDS (Need Buffs)

| Card | Cost | Efficiency | Issue |
|------|------|------------|-------|
| **Взрыв Бытового Газа** | 5 | 0.40x | 2 damage all for 5 mana |
| **Омская Зима** | 5 | 0.20x | Ongoing effect undervalued |
| **Сила Шавермы** | 2 | 0.00x | No stats, random target |
| **Яма на Дороге** | 2 | 0.00x | Conditional removal |
| **Пир-ревью** | 2 | 0.00x | Scry 3 for 2 mana |
| **Пробка на Ленина** | 3 | 0.00x | Skip attack for 1 turn |
| **Не Покидай Омск!** | 3 | 0.00x | Bounce + cost increase |
| **Норминетта** | 3 | 0.00x | Conditional destroy |
| **Экзамен** | 3 | 0.00x | Random discard |
| **Мороз -50°** | 5 | 0.00x | Mass freeze |
| **Божественный Свет** | 5 | 0.00x | Mass buff + heal |
| **Благоустройство** | 2 | 0.00x | Ongoing +0/+2 |
| **Мечта о Метро** | 3 | 0.00x | Extra draw per turn |
| **Дух Омска** | 4 | 0.00x | Ongoing damage + buff |
| **Заря Победы** | 3 | 0.00x | Ongoing +1/+0 |

---

## 📊 Balance by Mana Cost

| Cost | Cards | Avg Efficiency | Best | Worst |
|------|-------|----------------|------|-------|
| 1 | 8 | 4.44x | Segfault (7.50x) | Сводка 112 (3.00x) |
| 2 | 16 | 1.84x | Писинер (4.50x) | Благоустройство (0.00x) |
| 3 | 16 | 1.09x | Рыболов (2.67x) | Клятва (0.00x) |
| 4 | 10 | 1.74x | Makefile (2.88x) | Голос (0.00x) |
| 5 | 7 | 1.03x | Медведь (2.40x) | Бож. Свет (0.00x) |
| 6 | 2 | 2.21x | Дух (2.25x) | Голем (2.17x) |
| 7 | 2 | 1.57x | Лорд (1.71x) | Black Hole (1.43x) |

**Issue:** 1-mana cards are severely overpowered (4.44x average vs expected 1.0-1.5x)

---

## 🎨 Balance by Color

| Color | Cards | Avg Efficiency | OP | UP |
|-------|-------|----------------|-----|-----|
| white | 11 | 1.71x | 7 | 3 |
| blue | 15 | 1.75x | 9 | 4 |
| black | 13 | 1.91x | 8 | 5 |
| red | 12 | 1.84x | 9 | 3 |
| green | 12 | 2.00x | 8 | 2 |
| colorless | 1 | 4.50x | 1 | 0 |

**Issue:** All colors are overpowered, green worst (2.00x avg)

---

## 🔧 Recommended Nerfs

### Priority 1 (Critical - 7+ efficiency)
1. **Segmentation Fault** (1 mana)
   - Current: D6: 1→2 own damage, 2-6→3 enemy damage
   - **Nerf:** Increase cost to **3 mana** OR change to D6: 1-3→fizzle, 4-6→2 damage

### Priority 2 (Severe - 4+ efficiency)
2. **Птица-Омич** (1 mana)
   - Current: 1/1 flying + draw on enter
   - **Nerf:** Increase cost to **2 mana** OR remove flying

3. **Писинер Школы 21** (2 mana)
   - Current: 2/2 + mana ramp + draw on death
   - **Nerf:** Increase cost to **3 mana** OR remove death draw

4. **Иртышский Комар** (1 mana)
   - Current: 1/1 flying + lifelink
   - **Nerf:** Increase cost to **2 mana** OR remove one keyword

### Priority 3 (Moderate - 3+ efficiency)
5. **Дворник-Берсерк** (1 mana)
   - Current: 1/2 haste + scaling
   - **Nerf:** Reduce health to **1** OR increase cost to 2

6. **Житель Подземки** (2 mana)
   - Current: 2/2 deathtouch + 2 damage on death
   - **Nerf:** Increase cost to **3 mana** OR remove deathball

---

## 💡 Recommended Buffs

### Cards needing cost reduction:
1. **Божественный Свет** (5 mana → **4 mana**)
   - 4 heal + mass +1/+1 is fair at 4

2. **Мороз -50°** (5 mana → **4 mana**)
   - Mass freeze is strong but costly

3. **Благоустройство** (2 mana → **1 mana**)
   - Ongoing +0/+2 is weak for 2 mana

### Cards needing effect buffs:
1. **Сила Шавермы** - Add "Draw 1 card"
2. **Яма на Дороге** - Increase to ≤4 attack
3. **Пир-ревью** - Take top 2 instead of 1

---

## 📈 Target Balance

| Metric | Current | Target |
|--------|---------|--------|
| Overpowered | 65.6% | <15% |
| Balanced | 7.8% | 70-80% |
| Underpowered | 26.6% | 10-20% |
| Avg Efficiency | 1.8x | 1.0-1.2x |

---

## 🎯 Action Plan

### Phase 1: Critical Nerfs (Immediate)
- [ ] Segmentation Fault → 3 mana
- [ ] Птица-Омич → 2 mana
- [ ] Писинер → 3 mana

### Phase 2: Color Balance (Week 2)
- [ ] Review green cards (highest avg: 2.00x)
- [ ] Review blue cards (most OP: 9 cards)

### Phase 3: Underpowered Buffs (Week 3)
- [ ] Reduce costs of 5-mana spells
- [ ] Add value to 0-efficiency spells

### Phase 4: Playtesting (Week 4)
- [ ] Test with nerfed cards
- [ ] Collect winrate data
- [ ] Adjust based on feedback

---

**Report Generated:** 2026-03-05  
**Next Review:** After Phase 1 nerfs
