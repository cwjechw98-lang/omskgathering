import type { CardColor } from '../data/cards';
import type { ManaPool } from './types';

/**
 * Цветная мана.
 *
 * ЗАЧЕМ. До этого мана была одним числом, а цвет карты влиял только на анимацию:
 * любую карту платила любая земля. Цвет существовал в конструкторе колод, но не в игре.
 * Теперь земля даёт ману СВОЕГО цвета, и карта требует ману своего цвета.
 *
 * ПРАВИЛО ОПЛАТЫ (одно предложение): чтобы сыграть карту цвета X за N маны, нужно
 * минимум `pipCount(N)` маны цвета X, а остаток можно платить любой маной.
 *
 * Почему не «вся мана должна быть цвета карты». Это правило честнее к двухцветным
 * колодам и совпадает с MTG: там моно-цветная карта за 5 маны обычно стоит «3GG», то
 * есть два зелёных пипса, а не пять. При жёстком правиле колода из двух цветов не
 * смогла бы разыграть ничего дороже двух маны, потому что земель каждого цвета в ней
 * примерно половина.
 *
 * БЕСЦВЕТНАЯ МАНА — это общая мана. Площадь Бухгольца даёт бесцветную, и она платит
 * за любую карту в части «остаток». Так у бесцветной земли есть настоящая роль.
 *
 * МАНА «ЛЮБАЯ» приходит не от земель, а от существ и чар (Писинер, Святой Граф).
 * Она платит за что угодно, включая цветные пипсы.
 */

/** Ключи пула в порядке вывода. `any` — самая гибкая мана, её тратим последней. */
export const MANA_KEYS = [
  'white',
  'blue',
  'black',
  'red',
  'green',
  'colorless',
  'any',
] as const satisfies readonly (keyof ManaPool)[];

/** Цвета, у которых есть своя земля. `any` сюда не входит: земель «любого цвета» нет. */
export const LAND_COLORS = ['white', 'blue', 'black', 'red', 'green', 'colorless'] as const;

export function emptyPool(): ManaPool {
  return { white: 0, blue: 0, black: 0, red: 0, green: 0, colorless: 0, any: 0 };
}

export function poolTotal(pool: ManaPool): number {
  return MANA_KEYS.reduce((sum, key) => sum + (pool[key] ?? 0), 0);
}

/**
 * Сколько маны в цене обязано быть цвета карты.
 *
 * Дешёвые карты (до 3 маны) требуют один пипс: их можно положить в колоду «на сдачу»,
 * имея одну землю нужного цвета. Дорогие (4 и больше) требуют два: большая карта — это
 * обязательство перед цветом, а не случайная находка.
 */
export function pipCount(cost: number): number {
  return cost >= 4 ? 2 : 1;
}

/**
 * Сколько цветных пипсов у карты. У бесцветной карты их нет: Школа 21 платится
 * любой маной, и это её свойство — она гибкая, но по статам слабейшая в игре.
 */
export function pipsFor(color: CardColor, cost: number): number {
  return color === 'colorless' ? 0 : pipCount(cost);
}

/**
 * Списывает ману за карту. Возвращает НОВЫЙ пул или `null`, если маны не хватает.
 *
 * Пул не мутируется: вызывающий либо принимает новый пул, либо ничего не меняет.
 * Это важно, потому что отказ в оплате не должен портить состояние.
 *
 * `pips` передаётся отдельно от `totalCost`, потому что налог Бабушки с Метро
 * удорожает заклинание на 1 общую ману и НЕ должен добавлять цветной пипс.
 */
export function payMana(
  pool: ManaPool,
  color: CardColor,
  totalCost: number,
  pips: number = pipsFor(color, totalCost),
): ManaPool | null {
  // `emptyPool()` в основе — не украшение. Без него частичный или отсутствующий пул
  // давал `undefined` в полях, `Math.min(undefined, n)` превращался в NaN, и функция
  // возвращала пул из NaN вместо честного отказа. Это ловил property-тест.
  const next: ManaPool = { ...emptyPool(), ...pool };

  // 1. Цветные пипсы: сначала мана нужного цвета, потом «любая».
  let needPips = pips;
  const fromColor = Math.min(next[color] ?? 0, needPips);
  next[color] -= fromColor;
  needPips -= fromColor;

  if (needPips > 0) {
    const fromAny = Math.min(next.any, needPips);
    next.any -= fromAny;
    needPips -= fromAny;
  }
  if (needPips > 0) return null;

  // 2. Остаток цены — любой маной. Тратим самые полные пулы первыми: так дольше
  //    сохраняется возможность оплатить цветные пипсы следующей карты.
  let rest = totalCost - pips;
  const spendable = MANA_KEYS.filter((key) => key !== 'any').sort((a, b) => next[b] - next[a]);
  for (const key of spendable) {
    if (rest <= 0) break;
    const take = Math.min(next[key], rest);
    next[key] -= take;
    rest -= take;
  }

  // «Любая» мана — самая гибкая, поэтому идёт последней.
  if (rest > 0) {
    const take = Math.min(next.any, rest);
    next.any -= take;
    rest -= take;
  }
  if (rest > 0) return null;

  return next;
}

/** Хватает ли маны на карту. Тонкая обёртка над `payMana` — одна правда об оплате. */
export function canPay(
  pool: ManaPool,
  color: CardColor,
  totalCost: number,
  pips: number = pipsFor(color, totalCost),
): boolean {
  return payMana(pool, color, totalCost, pips) !== null;
}

/** Пул на начало хода: по одной мане за каждую разыгранную землю плюс бонус «любой». */
export function refillPool(landsByColor: Record<CardColor, number>, bonus = 0): ManaPool {
  const pool = emptyPool();
  for (const key of LAND_COLORS) {
    pool[key] = landsByColor[key] ?? 0;
  }
  pool.any = bonus;
  return pool;
}

/** Человеческое имя цвета — для сообщений в журнале боя. */
export const MANA_NAMES: Record<keyof ManaPool, string> = {
  white: 'белая',
  blue: 'синяя',
  black: 'чёрная',
  red: 'красная',
  green: 'зелёная',
  colorless: 'бесцветная',
  any: 'любая',
};

/**
 * Расшифровка пула для подсказки в интерфейсе: только непустые цвета.
 *
 * Без неё игрок видит «💎3/5» и не понимает, почему зелёная карта не играется:
 * общее число маны есть, а нужного цвета нет. Это и есть главный вопрос, который
 * возникает у человека при первом знакомстве с цветной маной.
 */
export function describePool(pool: ManaPool): string {
  const parts = MANA_KEYS.filter((key) => pool[key] > 0).map((key) => `${MANA_NAMES[key]} ${pool[key]}`);
  return parts.length > 0 ? parts.join(', ') : 'пусто';
}
