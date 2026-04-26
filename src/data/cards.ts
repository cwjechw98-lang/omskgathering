export type CardColor = 'white' | 'blue' | 'black' | 'red' | 'green' | 'colorless';
export type CardType = 'creature' | 'spell' | 'enchantment' | 'land';
export type Keyword =
  | 'haste'
  | 'defender'
  | 'flying'
  | 'trample'
  | 'lifelink'
  | 'deathtouch'
  | 'vigilance'
  | 'first_strike'
  | 'hexproof'
  | 'unblockable';

export interface CardData {
  id: string;
  name: string;
  cost: number;
  color: CardColor;
  type: CardType;
  attack?: number;
  health?: number;
  description: string;
  flavor: string;
  emoji: string;
  keywords?: Keyword[];
  rarity: 'common' | 'uncommon' | 'rare' | 'mythic';
  imageUrl?: string;
}

// Helper: generate image URL from pollinations.ai
function img(prompt: string, seed: number = 1): string {
  const encoded = encodeURIComponent(
    `fantasy card game art, ${prompt}, dark fantasy style, digital painting`
  );
  return `https://image.pollinations.ai/prompt/${encoded}?width=400&height=300&seed=${seed}&nologo=true`;
}

export const ALL_CARDS: CardData[] = [
  // ===== СУЩЕСТВА (Creatures) =====

  // --- 1 мана ---
  {
    id: 'bird_omsk',
    name: 'Птица-Омич',
    cost: 2,
    color: 'white',
    type: 'creature',
    attack: 1,
    health: 1,
    description: 'Полёт. Когда входит — потяните карту.',
    flavor:
      '«В 2012 году она появилась над городом — сияющая, пророческая. С тех пор её видят в самые тёмные ночи. Ты не можешь покинуть Омск...»',
    emoji: '🐦',
    keywords: ['flying'],
    rarity: 'common',
    imageUrl: img(
      'magical glowing crow bird flying over dark russian siberian city Omsk at night, mystical aura',
      101
    ),
  },
  {
    id: 'komar_irtish',
    name: 'Иртышский Комар',
    cost: 2,
    color: 'black',
    type: 'creature',
    attack: 1,
    health: 1,
    description: 'Полёт, Привязка к жизни.',
    flavor:
      '«Иртышские комары мутировали от близости к НПЗ. Теперь они не просто кусают — они высасывают саму жизненную силу.»',
    emoji: '🦟',
    keywords: ['flying', 'lifelink'],
    rarity: 'common',
    imageUrl: img(
      'giant magical mosquito monster flying over swamp river Irtysh, glowing red eyes',
      102
    ),
  },
  {
    id: 'dvornik',
    name: 'Дворник-Берсерк',
    cost: 2,
    color: 'green',
    type: 'creature',
    attack: 1,
    health: 2,
    description: 'Ускорение. +1/+0 за каждое другое ваше существо.',
    flavor:
      '«Он вышел убирать двор в 5 утра и обнаружил, что его метла светится. С тех пор ни один листик не посмел упасть на его территории.»',
    emoji: '🧹',
    keywords: ['haste'],
    rarity: 'common',
    imageUrl: img(
      'angry muscular janitor berserker with magical broom weapon, russian winter city streets',
      103
    ),
  },
  {
    id: 'student_omgtu',
    name: 'Студент ОмГТУ',
    cost: 2,
    color: 'blue',
    type: 'creature',
    attack: 1,
    health: 3,
    description: 'Защитник. При входе — посмотрите верхнюю карту колоды.',
    flavor:
      '«Студенты ОмГТУ знают: настоящая магия — это когда сдаёшь сопромат с первого раза. Такие становятся защитниками реальности.»',
    emoji: '🎓',
    keywords: ['defender'],
    rarity: 'common',
    imageUrl: img(
      'young student wizard with magic books and graduation cap, university building, blue magic aura',
      104
    ),
  },
  {
    id: 'coffee_machine',
    name: 'Кофемашина Кластера',
    cost: 2,
    color: 'colorless',
    type: 'creature',
    attack: 0,
    health: 4,
    description: 'Защитник. В начале хода восстановите 1 здоровье.',
    flavor:
      '«В Школе 21 ходит легенда: кофемашина обрела сознание после того, как через неё прошло 100 000 чашек. Теперь она сама решает, кого лечить.»',
    emoji: '☕',
    keywords: ['defender'],
    rarity: 'common',
    imageUrl: img(
      'magical sentient coffee machine golem in computer lab cluster, steam and magic, school 42',
      105
    ),
  },
  {
    id: 'babka_semechki',
    name: 'Бабка с Семечками',
    cost: 2,
    color: 'green',
    type: 'creature',
    attack: 0,
    health: 3,
    description: 'В начале хода восстановите 1 HP себе и бабке.',
    flavor: '«Семечки, семечки! Свежие, калёные!»',
    emoji: '🌻',
    keywords: [],
    rarity: 'common',
    imageUrl: img(
      'old russian grandmother selling sunflower seeds on street bench, magical aura, dark fantasy',
      201
    ),
  },

  // --- 2 маны ---
  {
    id: 'gopnik_lubinsky',
    name: 'Гопник с Любинского',
    cost: 2,
    color: 'red',
    type: 'creature',
    attack: 2,
    health: 1,
    description: 'Ускорение, Первый удар.',
    flavor: '«Э, братан, есть чё? А если найду?»',
    emoji: '🧢',
    keywords: ['haste', 'first_strike'],
    rarity: 'common',
    imageUrl: img(
      'russian gopnik thug in squatting pose with cap, dark alley, neon streetlights, menacing',
      106
    ),
  },
  {
    id: 'babushka_metro',
    name: 'Бабушка с Метро',
    cost: 2,
    color: 'white',
    type: 'creature',
    attack: 1,
    health: 4,
    description: 'Защитник. Пока в игре, заклинания врага стоят +1 ману.',
    flavor: '«Метро в Омске? Да я с 1979 года жду!»',
    emoji: '👵',
    keywords: ['defender'],
    rarity: 'uncommon',
    imageUrl: img(
      'old grandmother guardian standing near metro station entrance that was never built, magical barrier',
      107
    ),
  },
  {
    id: 'shaurmaster',
    name: 'Мастер Шаурмы',
    cost: 2,
    color: 'green',
    type: 'creature',
    attack: 2,
    health: 3,
    description: 'Привязка к жизни. При входе — восстановите 2 здоровья.',
    flavor: '«Двойной лаваш, все соусы, побольше мяса!»',
    emoji: '🌯',
    keywords: ['lifelink'],
    rarity: 'common',
    imageUrl: img(
      'magical shawarma chef cook with glowing food, street food stall at night, healing magic',
      108
    ),
  },
  {
    id: 'zhitel_podzemki',
    name: 'Житель Подземки',
    cost: 3,
    color: 'black',
    type: 'creature',
    attack: 2,
    health: 2,
    description: 'Смертельное касание. При смерти — 2 урона вражескому герою.',
    flavor: '«Метро не построили, но мы тут живём.»',
    emoji: '🕳️',
    keywords: ['deathtouch'],
    rarity: 'uncommon',
    imageUrl: img(
      'dark underground dweller creature in abandoned metro tunnel, glowing poisonous claws',
      109
    ),
  },
  {
    id: 'pisiner_21',
    name: 'Писинер Школы 21',
    cost: 3,
    color: 'blue',
    type: 'creature',
    attack: 1,
    health: 3,
    description: 'При входе — +1 мана. При смерти — потяните карту.',
    flavor: '«Бассейн? Нет, Бассéйн!»',
    emoji: '👨‍💻',
    keywords: [],
    rarity: 'common',
    imageUrl: img(
      'young programmer wizard at computer terminal, school 42 ecole, blue code magic flowing from screen',
      110
    ),
  },
  {
    id: 'trolleybus_driver',
    name: 'Водитель Троллейбуса',
    cost: 2,
    color: 'white',
    type: 'creature',
    attack: 1,
    health: 3,
    description: 'Бдительность. При входе — восстановите 1 HP.',
    flavor: '«Троллейбус №4 — легенда Омска.»',
    emoji: '🚎',
    keywords: ['vigilance'],
    rarity: 'common',
    imageUrl: img(
      'magical trolleybus driver in russian winter, glowing trolleybus vehicle, snowy street',
      202
    ),
  },
  {
    id: 'rynochny_torgovets',
    name: 'Рыночный Торговец',
    cost: 2,
    color: 'red',
    type: 'creature',
    attack: 2,
    health: 2,
    description: 'При входе — потяните карту, затем сбросьте карту.',
    flavor: '«Налетай, подешевело! Всё по сотке!»',
    emoji: '🏪',
    keywords: [],
    rarity: 'common',
    imageUrl: img(
      'russian market trader merchant with magical goods, bazaar stall, colorful wares',
      203
    ),
  },
  {
    id: 'khroniker_irtysha',
    name: 'Хроникер Иртыша',
    cost: 2,
    color: 'blue',
    type: 'creature',
    attack: 1,
    health: 4,
    description: 'Защитник. При входе — посмотрите 2 верхние карты, одну возьмите в руку.',
    flavor: '«Река помнит всё: от крепости до последнего коммита.»',
    emoji: '📜',
    keywords: ['defender'],
    rarity: 'uncommon',
    imageUrl: img(
      'mystic river chronicler with glowing scrolls on Irtysh embankment at night, old russian architecture',
      301
    ),
  },

  // --- 3 маны ---
  {
    id: 'marshrutchik',
    name: 'Безумный Маршрутчик',
    cost: 3,
    color: 'red',
    type: 'creature',
    attack: 3,
    health: 2,
    description: 'Ускорение. При входе — 1 урон всем другим существам.',
    flavor: '«Следующая — конечная. Или нет.»',
    emoji: '🚐',
    keywords: ['haste'],
    rarity: 'uncommon',
    imageUrl: img(
      'crazy minibus driver crashing through city in magical minivan, chaos and fire',
      111
    ),
  },
  {
    id: 'kot_ucheniy',
    name: 'Учёный Кот ОмГУ',
    cost: 3,
    color: 'blue',
    type: 'creature',
    attack: 2,
    health: 3,
    description: 'Когда вы разыгрываете заклинание — потяните карту.',
    flavor: '«Мяу. В смысле — квантовая суперпозиция.»',
    emoji: '🐱',
    keywords: [],
    rarity: 'uncommon',
    imageUrl: img(
      'magical scholarly cat wizard with glasses and spell book, university library, blue magic',
      112
    ),
  },
  {
    id: 'voron_kreposti',
    name: 'Ворон Омской Крепости',
    cost: 3,
    color: 'black',
    type: 'creature',
    attack: 2,
    health: 2,
    description: 'Полёт. При входе — верните существо из сброса в руку.',
    flavor: '«Кар-р! Истории крепости не забыты...»',
    emoji: '🐦‍⬛',
    keywords: ['flying'],
    rarity: 'uncommon',
    imageUrl: img(
      'dark mystical raven crow at ancient fortress ruins, necromancy magic, raising dead',
      113
    ),
  },
  {
    id: 'omskiy_huligann',
    name: 'Омский Хулиган',
    cost: 3,
    color: 'red',
    type: 'creature',
    attack: 3,
    health: 3,
    description: 'При входе — нанесите 1 урон вражескому герою.',
    flavor: '«Пацаны не извиняются!»',
    emoji: '🤜',
    keywords: [],
    rarity: 'common',
    imageUrl: img(
      'young street fighter punk with fire fists, dark city alley, aggressive stance',
      204
    ),
  },
  {
    id: 'omskiy_rybolov',
    name: 'Омский Рыболов',
    cost: 3,
    color: 'green',
    type: 'creature',
    attack: 2,
    health: 4,
    description: 'При входе — потяните карту.',
    flavor: '«На Иртыше клюёт! Всегда клюёт!»',
    emoji: '🎣',
    keywords: [],
    rarity: 'common',
    imageUrl: img(
      'fisherman wizard at magical river Irtysh, catching glowing fish, siberian landscape',
      205
    ),
  },
  {
    id: 'kontroler_tramvaya',
    name: 'Контролер Трамвая №4',
    cost: 3,
    color: 'white',
    type: 'creature',
    attack: 2,
    health: 3,
    description: 'Первый удар. При атаке: защищающееся существо получает -1 атаки до конца хода.',
    flavor: '«Билетики предъявляем. Возражения не принимаются.»',
    emoji: '🎟️',
    keywords: ['first_strike'],
    rarity: 'uncommon',
    imageUrl: img(
      'stern tram inspector in vintage tram number 4, electric sparks and ticket punch weapon',
      302
    ),
  },
  {
    id: 'himik_npz',
    name: 'Химик НПЗ',
    cost: 3,
    color: 'black',
    type: 'creature',
    attack: 2,
    health: 2,
    description: 'Смертельное касание. При смерти — нанесите 1 урон всем существам.',
    flavor: '«Он всегда знает, что именно горит в колбе.»',
    emoji: '🧪',
    keywords: ['deathtouch'],
    rarity: 'uncommon',
    imageUrl: img(
      'ominous refinery chemist with toxic glowing vials near Omsk industrial plant, smoke and neon reflections',
      303
    ),
  },

  // --- 4 маны ---
  {
    id: 'irtysh_vodyanoy',
    name: 'Иртышский Водяной',
    cost: 4,
    color: 'blue',
    type: 'creature',
    attack: 3,
    health: 5,
    description: 'При входе — заморозьте вражеское существо на 2 хода.',
    flavor:
      '«Водяной живёт в Иртыше с незапамятных времён. Он видел, как строили Омскую крепость, как закладывали метро, как оно так и не открылось. Его терпение безгранично, а его хватка — ледяная.»',
    emoji: '🧜‍♂️',
    keywords: [],
    rarity: 'rare',
    imageUrl: img(
      'water elemental spirit rising from river Irtysh, ice and water magic, siberian river spirit',
      114
    ),
  },
  {
    id: 'tenevoy_omich',
    name: 'Теневой Омич',
    cost: 4,
    color: 'black',
    type: 'creature',
    attack: 3,
    health: 3,
    description: 'Неблокируемый. При нанесении урона — враг сбрасывает карту.',
    flavor:
      '«Говорят, Теневой Омич — это коллективное бессознательное двух миллионов жителей. Он принимает форму того, чего вы боитесь больше всего: пустых улиц в 3 часа ночи.»',
    emoji: '🌑',
    keywords: ['unblockable'],
    rarity: 'rare',
    imageUrl: img(
      'dark shadow figure walking through snowy city streets, invisible phantom assassin',
      115
    ),
  },
  {
    id: 'bocal',
    name: 'Бокал (Bocal)',
    cost: 4,
    color: 'white',
    type: 'creature',
    attack: 2,
    health: 5,
    description: 'Защитник, Порчеустойчивость. Ваши Писинеры получают +1/+1.',
    flavor:
      '«Бокал — это не человек. Это система. Тысячи камер, миллионы строк кода, бесконечные отчёты. Он знает, кто опоздал. Он знает, кто не залогинился. Он ВСЕГДА знает.»',
    emoji: '🏢',
    keywords: ['defender', 'hexproof'],
    rarity: 'rare',
    imageUrl: img(
      'magical school building guardian golem, all-seeing eye, school 42 bocal administration, protective aura',
      116
    ),
  },
  {
    id: 'makefile_golem',
    name: 'Makefile-Голем',
    cost: 4,
    color: 'red',
    type: 'creature',
    attack: 4,
    health: 3,
    description: 'Ускорение, Растоптать. При убийстве — потяните карту.',
    flavor: '«make all && make bonus && make destroy»',
    emoji: '⚙️',
    keywords: ['haste', 'trample'],
    rarity: 'rare',
    imageUrl: img(
      'mechanical golem made of gears and code, glowing red eyes, compiler construct, crushing enemies',
      117
    ),
  },
  {
    id: 'omskaya_vedma',
    name: 'Омская Ведьма',
    cost: 4,
    color: 'black',
    type: 'creature',
    attack: 3,
    health: 4,
    description: 'Полёт. При входе — нанесите 2 урона вражескому существу.',
    flavor: '«Над Иртышом ночами летает она...»',
    emoji: '🧙‍♀️',
    keywords: ['flying'],
    rarity: 'uncommon',
    imageUrl: img(
      'dark witch flying on broomstick over siberian city at night, dark magic curse',
      206
    ),
  },
  {
    id: 'shaman_lukash',
    name: 'Шаман с Левобережья',
    cost: 4,
    color: 'green',
    type: 'creature',
    attack: 3,
    health: 5,
    description: 'Растоптать. При входе — другое ваше существо получает +1/+1.',
    flavor: '«Его бубен слышен даже через метель.»',
    emoji: '🪶',
    keywords: ['trample'],
    rarity: 'rare',
    imageUrl: img(
      'siberian urban shaman with antler staff and spirit totems in snowy district, emerald aura',
      304
    ),
  },
  {
    id: 'arkhivar_omskoi_kreposti',
    name: 'Архивариус Крепости',
    cost: 4,
    color: 'blue',
    type: 'creature',
    attack: 2,
    health: 4,
    description: 'Бдительность. Когда вы разыгрываете заклинание — потяните карту.',
    flavor: '«Старые ключи открывают не двери, а эпохи.»',
    emoji: '🗝️',
    keywords: ['vigilance'],
    rarity: 'rare',
    imageUrl: img(
      'ancient fortress archivist with keyring of glowing runes, candlelit stone archives',
      305
    ),
  },

  // --- 5 маны ---
  {
    id: 'sneg_elemental',
    name: 'Снежный Элементаль',
    cost: 5,
    color: 'blue',
    type: 'creature',
    attack: 4,
    health: 6,
    description: 'Замораживает атакующее существо при получении урона.',
    flavor: '«Омская зима — 9 месяцев в году.»',
    emoji: '❄️',
    keywords: [],
    rarity: 'rare',
    imageUrl: img(
      'massive snow ice elemental monster in siberian blizzard, freezing everything around, ice magic',
      118
    ),
  },
  {
    id: 'sibirskiy_medved',
    name: 'Сибирский Медведь',
    cost: 5,
    color: 'green',
    type: 'creature',
    attack: 5,
    health: 5,
    description: 'Растоптать, Бдительность.',
    flavor: '«В Омске медведи ходят по улицам. Серьёзно.»',
    emoji: '🐻',
    keywords: ['trample', 'vigilance'],
    rarity: 'rare',
    imageUrl: img(
      'giant magical siberian bear walking through city streets, powerful nature spirit, green aura',
      119
    ),
  },
  {
    id: 'pirat_irtysha',
    name: 'Пират Иртыша',
    cost: 5,
    color: 'blue',
    type: 'creature',
    attack: 4,
    health: 4,
    description: 'Полёт. При нанесении урона — потяните карту.',
    flavor: '«На Иртыше были и пираты... говорят.»',
    emoji: '🏴‍☠️',
    keywords: ['flying'],
    rarity: 'rare',
    imageUrl: img(
      'river pirate captain on magical flying ship above river, treasure and frost',
      207
    ),
  },

  // --- 6 маны ---
  {
    id: 'teplostantsiya_golem',
    name: 'Голем ТЭЦ-5',
    cost: 6,
    color: 'red',
    type: 'creature',
    attack: 5,
    health: 6,
    description: 'При входе — 2 урона всем вражеским существам.',
    flavor: '«Самая мощная ТЭЦ... и самый страшный Голем.»',
    emoji: '🏭',
    keywords: [],
    rarity: 'rare',
    imageUrl: img(
      'massive industrial golem made of power plant pipes and fire, thermal power station monster',
      120
    ),
  },
  {
    id: 'blackhole',
    name: 'Black Hole',
    cost: 7,
    color: 'black',
    type: 'creature',
    attack: 5,
    health: 5,
    description: 'При входе — уничтожьте ВСЕ существа с атакой ≤ 2.',
    flavor: '«rm -rf / — и нет проблем.»',
    emoji: '🕳️',
    keywords: [],
    rarity: 'mythic',
    imageUrl: img(
      'black hole void consuming everything, digital destruction, code matrix collapsing',
      121
    ),
  },
  {
    id: 'duh_sibiri',
    name: 'Дух Сибири',
    cost: 6,
    color: 'green',
    type: 'creature',
    attack: 6,
    health: 6,
    description: 'Растоптать. При входе — восстановите 4 HP.',
    flavor: '«Тайга бескрайняя, и дух её — вечен.»',
    emoji: '🌲',
    keywords: ['trample'],
    rarity: 'rare',
    imageUrl: img(
      'ancient siberian forest spirit made of trees and moss, giant nature elemental, green magic',
      208
    ),
  },

  // --- 7+ маны ---
  {
    id: 'mer_omska',
    name: 'Мэр Омска',
    cost: 8,
    color: 'white',
    type: 'creature',
    attack: 4,
    health: 7,
    description:
      'Бдительность. Все ваши существа получают +1/+1. При входе — 2 токена Чиновник 1/1.',
    flavor:
      '«Каждый Мэр Омска даёт Клятву Метро. Каждый нарушает. Но сила Клятвы копится — и однажды Мэр станет настолько могущественным, что метро ДЕЙСТВИТЕЛЬНО появится. Ну, когда-нибудь.»',
    emoji: '🎩',
    keywords: ['vigilance'],
    rarity: 'mythic',
    imageUrl: img(
      'powerful mayor king in suit with magical crown, summoning bureaucrat servants, golden aura city hall',
      122
    ),
  },
  {
    id: 'cluster_lord',
    name: 'Лорд Кластера',
    cost: 7,
    color: 'blue',
    type: 'creature',
    attack: 5,
    health: 7,
    description:
      'Все ваши существа получают +1/+1. При входе — заморозьте 1 случайного врага на 1 ход.',
    flavor:
      '«Когда 300 мониторов включаются одновременно в полночь, кластер обретает коллективное сознание. Лорд Кластера — это цифровой бог, рождённый из миллионов строк студенческого кода.»',
    emoji: '🖥️',
    keywords: [],
    rarity: 'mythic',
    imageUrl: img(
      'lord of computer cluster with 300 glowing monitors, digital god, matrix cyber lord, blue power',
      123
    ),
  },
  {
    id: 'drakon_irtysha',
    name: 'Дракон Иртыша',
    cost: 9,
    color: 'red',
    type: 'creature',
    attack: 7,
    health: 7,
    description: 'Полёт, Растоптать. При входе — 3 урона всем врагам.',
    flavor:
      '«Тысячу лет назад шаман запечатал дракона подо льдом Иртыша. Печать слабеет каждую весну, когда река вскрывается. Однажды он вырвется — и небо над Омском окрасится пламенем.»',
    emoji: '🐉',
    keywords: ['flying', 'trample'],
    rarity: 'mythic',
    imageUrl: img(
      'massive dragon rising from frozen river, fire and ice, siberian dragon ancient legend',
      209
    ),
  },

  // Токен
  {
    id: 'chinovnik',
    name: 'Чиновник',
    cost: 0,
    color: 'white',
    type: 'creature',
    attack: 1,
    health: 1,
    description: 'Токен.',
    flavor: '«Приходите завтра.»',
    emoji: '👔',
    keywords: [],
    rarity: 'common',
    imageUrl: img('russian bureaucrat office worker in suit, rubber stamp magic, paperwork', 124),
  },

  // ===== ЗАКЛИНАНИЯ (Spells) =====
  {
    id: 'pivo_sibirskoe',
    name: 'Пиво «Сибирская Корона»',
    cost: 2,
    color: 'green',
    type: 'spell',
    description: 'Потяните 2 карты.',
    flavor: '«Настоящее сибирское, из Омска!»',
    emoji: '🍺',
    rarity: 'common',
    imageUrl: img(
      'magical glowing beer mug with golden light, siberian tavern, card draw magic',
      125
    ),
  },
  {
    id: 'segfault',
    name: 'Segmentation Fault',
    cost: 3,
    color: 'black',
    type: 'spell',
    description: '🎲 Бросьте D6: 1 → 2 урона своему, 2-6 → 3 урона вражескому.',
    flavor: '«Segfault (core dumped)»',
    emoji: '💀',
    rarity: 'uncommon',
    imageUrl: img(
      'digital crash error screen explosion, segmentation fault, computer skull glitch art',
      126
    ),
  },
  {
    id: 'shaverma_power',
    name: 'Сила Шавермы',
    cost: 2,
    color: 'green',
    type: 'spell',
    description:
      'Дайте случайному вашему существу +2/+2 навсегда. Восстановите 2 здоровья. Потяните карту.',
    flavor: '«Шаверма с двойным мясом — и ты непобедим!»',
    emoji: '🥙',
    rarity: 'common',
    imageUrl: img(
      'magical glowing shawarma kebab with healing power aura, street food magic, buff spell',
      127
    ),
  },
  {
    id: 'yama_na_doroge',
    name: 'Яма на Дороге',
    cost: 1,
    color: 'black',
    type: 'spell',
    description:
      'Уничтожьте случайное вражеское существо с атакой ≤ 3. Или 2 урона вражескому герою.',
    flavor: '«Ямочный ремонт? Не, не слышали.»',
    emoji: '🕳️',
    rarity: 'common',
    imageUrl: img(
      'massive pothole trap in road swallowing vehicle, dark void hole in asphalt, russian road',
      128
    ),
  },
  {
    id: 'peer_review',
    name: 'Пир-ревью',
    cost: 2,
    color: 'blue',
    type: 'spell',
    description: 'Посмотрите 3 верхние карты колоды. Возьмите в руку 2 лучшие.',
    flavor: '«Код ревью в 3 часа ночи — лучшее ревью.»',
    emoji: '🔍',
    rarity: 'common',
    imageUrl: img(
      'code review magical magnifying glass revealing secrets, screen with code, school 42 peer review',
      129
    ),
  },
  {
    id: 'probka_lenina',
    name: 'Пробка на Ленина',
    cost: 3,
    color: 'red',
    type: 'spell',
    description:
      'Заморозьте все вражеские существа на 1 ход. Они не могут атаковать в следующий ход.',
    flavor: '«8 утра. Проспект Маркса. Ад.»',
    emoji: '🚗',
    rarity: 'uncommon',
    imageUrl: img(
      'massive traffic jam on city avenue, cars frozen in magical barrier, rush hour chaos',
      130
    ),
  },
  {
    id: 'debug_mode',
    name: 'Режим Дебага',
    cost: 2,
    color: 'green',
    type: 'spell',
    description: 'Дайте случайному вашему существу +2/+2 навсегда. Потяните карту.',
    flavor: '«gdb -tui: теперь я вижу всё.»',
    emoji: '🐛',
    rarity: 'uncommon',
    imageUrl: img(
      'programmer debugging with magical green terminal screen, gdb debugger matrix code',
      131
    ),
  },
  {
    id: 'ledyanoy_veter',
    name: 'Ледяной Ветер',
    cost: 2,
    color: 'blue',
    type: 'spell',
    description: 'Заморозьте случайное вражеское существо на 2 хода. Потяните карту.',
    flavor: '«Ветер с Иртыша пробирает до костей.»',
    emoji: '🌬️',
    rarity: 'common',
    imageUrl: img('freezing icy wind blast from siberian river, ice crystals magic spell', 210),
  },
  {
    id: 'tuman_nad_irtyshom',
    name: 'Туман Над Иртышом',
    cost: 2,
    color: 'blue',
    type: 'spell',
    description: 'Заморозьте до 2 вражеских существ на 1 ход. Потяните карту.',
    flavor: '«В тумане даже фонари шепчут чужими голосами.»',
    emoji: '🌫️',
    rarity: 'uncommon',
    imageUrl: img(
      'dense magical fog over Irtysh river embankment, ghost lights, frozen silhouettes',
      306
    ),
  },
  {
    id: 'svodka_112',
    name: 'Сводка 112',
    cost: 2,
    color: 'red',
    type: 'spell',
    description: 'Нанесите 2 урона существу. Если выжило — нанесите 1 урон герою.',
    flavor: '«Оперативно. Громко. Неотвратимо.»',
    emoji: '🚨',
    rarity: 'common',
    imageUrl: img(
      'emergency dispatch center with red alarms and holographic city map of Omsk, dynamic action scene',
      307
    ),
  },
  {
    id: 'ne_pokiday_omsk',
    name: 'Не Покидай Омск!',
    cost: 3,
    color: 'black',
    type: 'spell',
    description: 'Верните сильнейшее вражеское существо в руку. Его стоимость +2.',
    flavor:
      '«Заклинание было наложено на город так давно, что стало законом физики. Поезда разворачиваются, самолёты возвращаются, дороги ведут обратно. ТЫ. НЕ. МОЖЕШЬ. ПОКИНУТЬ. ОМСК.»',
    emoji: '🚫',
    rarity: 'uncommon',
    imageUrl: img(
      'dark magical barrier around city preventing escape, trapped creature, you cannot leave Omsk',
      132
    ),
  },
  {
    id: 'omskiy_optimism',
    name: 'Омский Оптимизм',
    cost: 3,
    color: 'white',
    type: 'spell',
    description: 'Восстановите 6 здоровья. Потяните карту.',
    flavor: '«Ничего, как-нибудь всё наладится!»',
    emoji: '😊',
    rarity: 'common',
    imageUrl: img(
      'warm golden healing light over siberian city, hope and optimism, sunrise over Omsk',
      133
    ),
  },
  {
    id: 'norminette',
    name: 'Норминетта',
    cost: 3,
    color: 'red',
    type: 'spell',
    description: 'Уничтожьте сильнейшее вражеское существо с атакой ≤ 4.',
    flavor: '«Norminette: FAIL. Существо уничтожено.»',
    emoji: '🔴',
    rarity: 'uncommon',
    imageUrl: img(
      'red error terminal destroying code construct, norminette linter fail explosion, school 42',
      134
    ),
  },
  {
    id: 'exam_42',
    name: 'Экзамен (Exam Rank)',
    cost: 3,
    color: 'black',
    type: 'spell',
    description: '🎲 Бросьте D6: оба сбрасывают столько карт (мин 1, макс 3).',
    flavor: '«Exam Rank 06... Молись.»',
    emoji: '📝',
    rarity: 'rare',
    imageUrl: img(
      'terrifying exam paper with skull, school 42 exam rank, both players suffering',
      135
    ),
  },
  {
    id: 'siberian_gnev',
    name: 'Сибирский Гнев',
    cost: 3,
    color: 'red',
    type: 'spell',
    description: 'Нанесите 4 урона сильнейшему вражескому существу (или герою).',
    flavor: '«Сибирь бьёт первой!»',
    emoji: '🔥',
    rarity: 'common',
    imageUrl: img('fiery rage explosion directed at single target, siberian fury fire magic', 211),
  },
  {
    id: 'moroz_50',
    name: 'Мороз -50°',
    cost: 5,
    color: 'blue',
    type: 'spell',
    description: 'Заморозьте все вражеские существа на 1 ход.',
    flavor: '«Синоптики обещали -30. Ха-ха.»',
    emoji: '🥶',
    rarity: 'rare',
    imageUrl: img(
      'extreme cold freezing entire battlefield, -50 degrees celsius, everything frozen solid',
      136
    ),
  },
  {
    id: 'vzryv_gaza',
    name: 'Взрыв Бытового Газа',
    cost: 4,
    color: 'red',
    type: 'spell',
    description: 'Нанесите 2 урона ВСЕМ существам.',
    flavor: '«Опять эти газовые трубы...»',
    emoji: '💥',
    rarity: 'rare',
    imageUrl: img(
      'massive gas explosion destroying city block, fire everywhere, russian apartment building',
      137
    ),
  },
  {
    id: 'bozhestvenniy_svet',
    name: 'Божественный Свет',
    cost: 4,
    color: 'white',
    type: 'spell',
    description: 'Восстановите 4 HP. Все ваши существа получают +1/+1 навсегда.',
    flavor: '«Успенский собор сияет над городом.»',
    emoji: '✝️',
    rarity: 'rare',
    imageUrl: img(
      'divine golden light from cathedral dome, healing all allies, Assumption Cathedral Omsk',
      212
    ),
  },

  // ===== НАЛОЖЕНИЯ (Enchantments) =====
  {
    id: 'blagoustroistvo',
    name: 'Благоустройство',
    cost: 1,
    color: 'green',
    type: 'enchantment',
    description: 'Ваши существа получают +0/+2. +1 здоровье в начале хода.',
    flavor: '«Клумбы, плитка... и яма рядом.»',
    emoji: '🌷',
    rarity: 'uncommon',
    imageUrl: img(
      'city beautification with flowers and tiles, healing garden magic, urban garden Omsk',
      138
    ),
  },
  {
    id: 'metro_mechta',
    name: 'Мечта о Метро',
    cost: 3,
    color: 'blue',
    type: 'enchantment',
    description: 'В начале хода потяните дополнительную карту.',
    flavor: '«Строительство метро — вечная мечта омичей.»',
    emoji: '🚇',
    rarity: 'rare',
    imageUrl: img(
      'dream vision of beautiful metro station that was never built, ethereal magical subway',
      139
    ),
  },
  {
    id: 'duh_omska',
    name: 'Дух Омска',
    cost: 4,
    color: 'black',
    type: 'enchantment',
    description: 'Враг теряет 1 здоровье в начале своего хода. +1 атака вашим существам.',
    flavor: '«Омск не отпускает...»',
    emoji: '👻',
    rarity: 'rare',
    imageUrl: img(
      'ghostly spirit of city haunting enemies, dark cursed aura, you cannot leave Omsk ghost',
      140
    ),
  },
  {
    id: 'holy_graph',
    name: 'Святой Граф',
    cost: 4,
    color: 'green',
    type: 'enchantment',
    description: 'При розыгрыше существа — потяните карту. +1 мана за каждого Писинера.',
    flavor: '«Граф проектов — путь к просветлению кодера.»',
    emoji: '📊',
    rarity: 'rare',
    imageUrl: img(
      'holy project graph chart glowing with green magic, school 42 holy graph pathway',
      141
    ),
  },
  {
    id: 'omskaya_zima',
    name: 'Омская Зима',
    cost: 5,
    color: 'blue',
    type: 'enchantment',
    description: 'Вражеские существа входят замороженными. -1 атака всем врагам.',
    flavor: '«9 месяцев зимы — это не баг, это фича.»',
    emoji: '🌨️',
    rarity: 'mythic',
    imageUrl: img(
      'eternal winter enchantment over city, permanent blizzard, all enemies frozen, siberian winter',
      142
    ),
  },
  {
    id: 'zarya_pobedy',
    name: 'Заря Победы',
    cost: 3,
    color: 'white',
    type: 'enchantment',
    description: 'Ваши существа получают +1/+0. При гибели вашего существа — восстановите 2 HP.',
    flavor: '«Омск — город трудовой доблести.»',
    emoji: '🌅',
    rarity: 'uncommon',
    imageUrl: img(
      'dawn of victory golden sunrise over city, inspiring banner, glowing army buff',
      213
    ),
  },
  {
    id: 'klyatva_metrostroya',
    name: 'Клятва Метростроя',
    cost: 3,
    color: 'white',
    type: 'enchantment',
    description: 'Ваши существа получают +0/+1. В начале хода: если у вас 3+ существ, +2 HP.',
    flavor: '«Обещание, которое пережило поколения.»',
    emoji: '🚇',
    rarity: 'rare',
    imageUrl: img(
      'mythic metro construction oath carved in glowing stone under unfinished subway tunnels, sacred white-gold aura',
      308
    ),
  },
  {
    id: 'golos_telebashni',
    name: 'Голос Телебашни',
    cost: 4,
    color: 'black',
    type: 'enchantment',
    description: 'В начале хода соперник сбрасывает карту, если у него 4+ карт в руке.',
    flavor: '«Сигнал ловят все. Игнорировать не может никто.»',
    emoji: '📡',
    rarity: 'rare',
    imageUrl: img(
      'ominous soviet TV tower broadcasting dark psychic waves across night city, noir purple aura',
      309
    ),
  },

  // ===== ЗЕМЛИ (Lands) =====
  {
    id: 'prospekt_mira',
    name: 'Проспект Мира',
    cost: 0,
    color: 'white',
    type: 'land',
    description: '+1 мана.',
    flavor: '«Главная артерия города.»',
    emoji: '🏛️',
    rarity: 'common',
    imageUrl: img(
      'grand avenue prospekt mira in russian city, classical architecture, white mana land',
      143
    ),
  },
  {
    id: 'irtysh_naberezhnaya',
    name: 'Набережная Иртыша',
    cost: 0,
    color: 'blue',
    type: 'land',
    description: '+1 мана.',
    flavor: '«Великая сибирская река.»',
    emoji: '🌊',
    rarity: 'common',
    imageUrl: img(
      'beautiful river embankment Irtysh, blue water mana source, siberian river landscape',
      144
    ),
  },
  {
    id: 'podzemelye_omska',
    name: 'Омское Подземелье',
    cost: 0,
    color: 'black',
    type: 'land',
    description: '+1 мана.',
    flavor: '«Недостроенное метро...»',
    emoji: '⬛',
    rarity: 'common',
    imageUrl: img(
      'dark underground abandoned metro tunnel, black mana swamp, unfinished subway Omsk',
      145
    ),
  },
  {
    id: 'omskiy_npz',
    name: 'Омский НПЗ',
    cost: 0,
    color: 'red',
    type: 'land',
    description: '+1 мана.',
    flavor: '«Нефть, газ и огонь.»',
    emoji: '🔥',
    rarity: 'common',
    imageUrl: img(
      'oil refinery at night with fire and smoke, red mana mountain, industrial power',
      146
    ),
  },
  {
    id: 'park_30let',
    name: 'Парк 30-летия ВЛКСМ',
    cost: 0,
    color: 'green',
    type: 'land',
    description: '+1 мана.',
    flavor: '«Зелёный оазис в бетонных джунглях.»',
    emoji: '🌳',
    rarity: 'common',
    imageUrl: img(
      'beautiful green park forest in city, green mana source, nature magic grove',
      147
    ),
  },
  {
    id: 'ploshchad_buhgoltsa',
    name: 'Площадь Бухгольца',
    cost: 0,
    color: 'colorless',
    type: 'land',
    description: '+1 мана. Если это третья ваша земля за игру — восстановите 1 здоровье.',
    flavor: '«У шара свои орбиты, у города — свои законы.»',
    emoji: '🗿',
    rarity: 'common',
    imageUrl: img(
      'Buchholz square with iconic sphere monument under dramatic sky, arcane geometric lines on pavement',
      310
    ),
  },

  // ===== НОВЫЕ КАРТЫ (2026-03-05 Balance Update) =====
  {
    id: 'biblioteka_omgtu',
    name: 'Библиотека ОмГТУ',
    cost: 3,
    color: 'blue',
    type: 'enchantment',
    description: 'В начале хода: если у вас ≤2 карт, потяните до 3.',
    flavor: '«Знание — сила. Особенно когда не сдал диплом.»',
    emoji: '📚',
    rarity: 'uncommon',
    imageUrl: img(
      'magical university library with glowing books floating in air, students studying late at night',
      401
    ),
  },
  {
    id: 'rosgvardiya',
    name: 'Росгвардия',
    cost: 2,
    color: 'white',
    type: 'creature',
    attack: 1,
    health: 3,
    description: 'Защитник. Когда враг разыгрывает заклинание — вы можете уничтожить его.',
    flavor: '«Порядок в городе — порядок в игре.»',
    emoji: '🛡️',
    keywords: ['defender'],
    rarity: 'rare',
    imageUrl: img(
      'armored guard with shield and tactical gear, standing protectively, city background',
      402
    ),
  },
  {
    id: 'posledniy_argument',
    name: 'Последний Аргумент',
    cost: 4,
    color: 'red',
    type: 'spell',
    description: 'Нанесите 3 урона всем врагам и 3 урона вражескому герою.',
    flavor: '«Когда дипломатия бессильна.»',
    emoji: '🔥',
    rarity: 'uncommon',
    imageUrl: img(
      'massive fiery explosion engulfing battlefield, dramatic red and orange flames',
      403
    ),
  },
  {
    id: 'uskorennyy_rost',
    name: 'Ускоренный Рост',
    cost: 1,
    color: 'green',
    type: 'spell',
    description: 'Существо получает +2/+0 и ускорение до конца хода.',
    flavor: '«Сибирь не ждёт. Растём быстро.»',
    emoji: '🌱',
    rarity: 'common',
    imageUrl: img(
      'magical green vines rapidly growing around creature, nature acceleration spell',
      404
    ),
  },
  {
    id: 'nalogovaya_inspektsiya',
    name: 'Налоговая Инспекция',
    cost: 3,
    color: 'black',
    type: 'spell',
    description: 'Выберите карту в руке врага. Он сбрасывает её.',
    flavor: '«У вас есть неоплаченные счета... в жизни и в игре.»',
    emoji: '💀',
    rarity: 'uncommon',
    imageUrl: img(
      'dark bureaucratic office with skeletal accountant, ominous paperwork and stamps',
      405
    ),
  },
];

export function createDeck(): CardData[] {
  const deck: CardData[] = [];
  const nonLandCards = ALL_CARDS.filter((c) => c.type !== 'land' && c.id !== 'chinovnik');
  const landCards = ALL_CARDS.filter((c) => c.type === 'land');

  // Cards with 3 copies for consistency (key gameplay cards)
  const threeCopies = [
    'norminette',
    'siberian_gnev',
    'yama_na_doroge',
    'peer_review',
    'probka_lenina',
    'shaverma_power',
  ];

  for (const card of nonLandCards) {
    let copies = card.rarity === 'mythic' ? 1 : card.rarity === 'rare' ? 2 : 2;
    // Increase specific cards to 3 copies
    if (threeCopies.includes(card.id)) {
      copies = 3;
    }
    for (let i = 0; i < copies; i++) {
      deck.push({ ...card });
    }
  }

  // Calculate target land count to reach ~40% of total deck size (MTG standard)
  // Formula: Lands = (0.4 * NonLands) / 0.6  => Lands ≈ 0.67 * NonLands
  const currentCount = deck.length;
  const targetLandCount = Math.ceil(currentCount * 0.67);
  const copiesPerLand = Math.ceil(targetLandCount / landCards.length);

  for (const land of landCards) {
    for (let i = 0; i < copiesPerLand; i++) {
      deck.push({ ...land });
    }
  }

  // Guarantee 2 lands in first 5 cards (opening hand)
  // And 1 more land in cards 6-8 (first draws)
  let shuffled = shuffle(deck);
  for (let attempt = 0; attempt < 50; attempt++) {
    const landsInFirst5 = shuffled.slice(0, 5).filter((c) => c.type === 'land').length;
    const landsInFirst8 = shuffled.slice(0, 8).filter((c) => c.type === 'land').length;
    if (landsInFirst5 >= 2 && landsInFirst8 >= 3) break;
    shuffled = shuffle(deck);
  }
  // Fallback: force-swap lands into opening hand
  const landsInFirst5 = shuffled.slice(0, 5).filter((c) => c.type === 'land').length;
  if (landsInFirst5 < 2) {
    const needed = 2 - landsInFirst5;
    let swapped = 0;
    for (let i = 5; i < shuffled.length && swapped < needed; i++) {
      if (shuffled[i].type === 'land') {
        for (let j = 0; j < 5; j++) {
          if (shuffled[j].type !== 'land') {
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            swapped++;
            break;
          }
        }
      }
    }
  }
  return shuffled;
}

export function createDeckFromCardIds(cardIds: string[]): CardData[] {
  const byId = new Map(ALL_CARDS.map((card) => [card.id, card]));
  const deck = cardIds.flatMap((id) => {
    const card = byId.get(id);
    return card ? [{ ...card }] : [];
  });
  return shuffle(deck);
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
