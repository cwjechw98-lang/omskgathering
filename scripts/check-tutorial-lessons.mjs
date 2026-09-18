/**
 * Локальная проверка логики обучения — без vitest.
 *
 * Зачем отдельный скрипт: `vitest run` под файловой песочницей не запускается
 * (esbuild падает с spawn EPERM), а логику шагов надо проверять на каждой правке.
 * Node 24 исполняет TypeScript напрямую, поэтому здесь те же сценарии, что и в
 * tests/components/tutorial-lessons.test.ts, но без тест-раннера.
 *
 * Запуск: node scripts/check-tutorial-lessons.mjs
 */
import {
  TUTORIAL_MAX_TURN,
  createInitialTutorialProgress,
  firstUnlearnedLesson,
  markTutorialLearned,
  resolveTutorialLesson,
  tutorialLessonTelemetryKey,
} from '../src/utils/tutorialProgress.ts';

const base = {
  myTurn: true,
  gameOver: false,
  turnNumber: 1,
  hasPlayableLand: false,
  hasPlayableNonLand: false,
  cheapestNonLandCost: null,
  mana: 0,
  hasAttackReadyCreature: false,
  hasCreatureOnField: false,
};

const learned = (over) => ({
  land: false,
  nonLand: false,
  attack: false,
  endTurn: false,
  ...over,
});

const progress = (over = {}) => ({ ...createInitialTutorialProgress(), ...over });

let passed = 0;
const failures = [];

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed += 1;
    return;
  }
  failures.push(`${name}\n    ожидалось: ${e}\n    получено:  ${a}`);
}

// ─── порядок уроков нерушим ───────────────────────────────────────────────────

check(
  'новичку с землёй в руке — урок 1',
  resolveTutorialLesson({ ...base, progress: progress(), hasPlayableLand: true }),
  { lesson: 1, variant: 'action' }
);

check(
  'после земли — урок 2, а не конец хода',
  resolveTutorialLesson({
    ...base,
    progress: progress({ learned: learned({ land: true }) }),
    hasPlayableNonLand: true,
    mana: 3,
  }),
  { lesson: 2, variant: 'action' }
);

check(
  'не хватает маны — урок 2 в ожидании, а не прыжок на 4',
  resolveTutorialLesson({
    ...base,
    progress: progress({ learned: learned({ land: true }) }),
    cheapestNonLandCost: 3,
    mana: 1,
  }),
  { lesson: 2, variant: 'wait', requiredMana: 3 }
);

check(
  'нет подходящей карты в руке — молчание, а не «конец хода»',
  resolveTutorialLesson({
    ...base,
    progress: progress({ learned: learned({ land: true }) }),
    hasPlayableLand: true,
  }),
  null
);

check(
  'существо на столе без права атаки — урок 3 терпеливо',
  resolveTutorialLesson({
    ...base,
    progress: progress({ learned: learned({ land: true, nonLand: true }) }),
    hasCreatureOnField: true,
    turnNumber: 2,
  }),
  { lesson: 3, variant: 'patience', reason: 'attack' }
);

check(
  'существо готово — урок 3 действием',
  resolveTutorialLesson({
    ...base,
    progress: progress({ learned: learned({ land: true, nonLand: true }) }),
    hasAttackReadyCreature: true,
    hasCreatureOnField: true,
    turnNumber: 2,
  }),
  { lesson: 3, variant: 'action' }
);

check(
  'конец хода — только когда дел нет',
  resolveTutorialLesson({
    ...base,
    progress: progress({ learned: learned({ land: true, nonLand: true, attack: true }) }),
    turnNumber: 3,
  }),
  { lesson: 4, variant: 'action' }
);

check(
  'урок 1 не пропускается, если урок 2 пройден раньше',
  resolveTutorialLesson({
    ...base,
    progress: progress({ learned: learned({ nonLand: true }) }),
    hasPlayableLand: true,
    hasAttackReadyCreature: true,
  }),
  { lesson: 1, variant: 'action' }
);

// ─── границы показа ───────────────────────────────────────────────────────────

check(
  'ход противника — подсказки нет',
  resolveTutorialLesson({ ...base, myTurn: false, progress: progress(), hasPlayableLand: true }),
  null
);

check(
  'бой окончен — подсказки нет',
  resolveTutorialLesson({ ...base, gameOver: true, progress: progress(), hasPlayableLand: true }),
  null
);

check(
  'обучение пройдено — подсказки нет',
  resolveTutorialLesson({
    ...base,
    progress: progress({ completed: true }),
    hasPlayableLand: true,
  }),
  null
);

check(
  `на ${TUTORIAL_MAX_TURN}-м ходу подсказка ещё жива`,
  resolveTutorialLesson({ ...base, progress: progress(), hasPlayableLand: true, turnNumber: TUTORIAL_MAX_TURN }),
  { lesson: 1, variant: 'action' }
);

check(
  `после ${TUTORIAL_MAX_TURN}-го хода подсказка замолкает`,
  resolveTutorialLesson({
    ...base,
    progress: progress(),
    hasPlayableLand: true,
    turnNumber: TUTORIAL_MAX_TURN + 1,
  }),
  null
);

// ─── прогресс ─────────────────────────────────────────────────────────────────

check('первый непройденный урок — 1', firstUnlearnedLesson(progress()), 1);
check(
  'после земли первый непройденный — 2',
  firstUnlearnedLesson(progress({ learned: learned({ land: true }) })),
  2
);
check(
  'всё пройдено — первого непройденного нет',
  firstUnlearnedLesson(
    progress({ learned: learned({ land: true, nonLand: true, attack: true, endTurn: true }) })
  ),
  null
);

check(
  'ключ телеметрии различает ожидание и действие',
  [
    tutorialLessonTelemetryKey({ lesson: 1, variant: 'action' }),
    tutorialLessonTelemetryKey({ lesson: 2, variant: 'action' }),
    tutorialLessonTelemetryKey({ lesson: 2, variant: 'wait', requiredMana: 3 }),
    tutorialLessonTelemetryKey({ lesson: 3, variant: 'patience', reason: 'attack' }),
    tutorialLessonTelemetryKey({ lesson: 4, variant: 'action' }),
  ],
  ['play_land', 'play_non_land', 'play_non_land_wait', 'attack_wait', 'end_turn']
);

// ─── сквозной прогон боя ──────────────────────────────────────────────────────

// Симуляция: игрок играет землю на 1-м ходу, на 2-м получает ману и карту.
const seen = [];
let p = createInitialTutorialProgress();
const record = (hint) => {
  if (hint) seen.push(`${hint.lesson}:${hint.variant}`);
};

record(
  resolveTutorialLesson({ ...base, progress: p, hasPlayableLand: true, mana: 0, turnNumber: 1 })
); // 1
p = markTutorialLearned(p, 'land');
record(
  resolveTutorialLesson({
    ...base,
    progress: p,
    cheapestNonLandCost: 3,
    mana: 1,
    hasCreatureOnField: true,
    turnNumber: 1,
  })
); // 2 wait
record(
  resolveTutorialLesson({
    ...base,
    progress: p,
    hasPlayableNonLand: true,
    mana: 3,
    hasCreatureOnField: true,
    turnNumber: 2,
  })
); // 2 action
p = markTutorialLearned(p, 'nonLand');
record(
  resolveTutorialLesson({
    ...base,
    progress: p,
    hasCreatureOnField: true,
    mana: 2,
    turnNumber: 2,
  })
); // 3 patience
record(
  resolveTutorialLesson({
    ...base,
    progress: p,
    hasAttackReadyCreature: true,
    hasCreatureOnField: true,
    turnNumber: 3,
  })
); // 3 action
p = markTutorialLearned(p, 'attack');
record(resolveTutorialLesson({ ...base, progress: p, turnNumber: 3 })); // 4
p = markTutorialLearned(p, 'endTurn');
record(resolveTutorialLesson({ ...base, progress: p, hasPlayableLand: true, turnNumber: 4 })); // null

check(
  'сквозной прогон боя: уроки идут 1→2→2→3→3→4 без пропусков',
  seen,
  ['1:action', '2:wait', '2:action', '3:patience', '3:action', '4:action']
);
check('после четвёртого урока обучение завершено', p.completed, true);

// ─── итог ─────────────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error(`\n❌ Провалено ${failures.length} из ${passed + failures.length}:\n`);
  for (const f of failures) console.error(`  • ${f}\n`);
  process.exit(1);
}

console.log(`✅ Логика обучения: ${passed}/${passed} проверок пройдено.`);
