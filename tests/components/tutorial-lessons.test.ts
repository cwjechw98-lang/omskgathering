import { describe, expect, it } from 'vitest';
import {
  TUTORIAL_MAX_TURN,
  createInitialTutorialProgress,
  firstUnlearnedLesson,
  markTutorialLearned,
  resolveTutorialLesson,
  tutorialLessonTelemetryKey,
  type TutorialLearned,
  type TutorialLessonInput,
  type TutorialProgress,
} from '../../src/utils/tutorialProgress';

const base: Omit<TutorialLessonInput, 'progress'> = {
  myTurn: true,
  gameOver: false,
  turnNumber: 1,
  hasPlayableLand: false,
  hasPlayableNonLand: false,
  cheapestNonLandCost: null as number | null,
  mana: 0,
  hasAttackReadyCreature: false,
  hasCreatureOnField: false,
};

const learned = (over: Partial<TutorialLearned>): TutorialLearned => ({
  land: false,
  nonLand: false,
  attack: false,
  endTurn: false,
  ...over,
});

const progress = (over: Partial<TutorialProgress> = {}): TutorialProgress => ({
  ...createInitialTutorialProgress(),
  ...over,
});

const ask = (over: Partial<TutorialLessonInput> = {}) =>
  resolveTutorialLesson({ ...base, progress: progress(), ...over });

describe('порядок уроков нерушим', () => {
  it('новичку с землёй в руке показывает урок про землю', () => {
    expect(ask({ hasPlayableLand: true })).toEqual({ lesson: 1, variant: 'action' });
  });

  it('после сыгранной земли показывает урок про существо, а не конец хода', () => {
    // именно здесь прежняя логика прыгала с 1 сразу на 4
    const r = resolveTutorialLesson({
      ...base,
      progress: progress({ learned: learned({ land: true }) }),
      hasPlayableNonLand: true,
      mana: 3,
    });
    expect(r).toEqual({ lesson: 2, variant: 'action' });
  });

  it('никогда не пропускает непройденный урок 2 ради урока 4', () => {
    // Земля сыграна, маны на карту не хватает: прежняя логика звала завершать ход.
    const r = resolveTutorialLesson({
      ...base,
      progress: progress({ learned: learned({ land: true }) }),
      cheapestNonLandCost: 3,
      mana: 1,
    });
    expect(r).toEqual({ lesson: 2, variant: 'wait', requiredMana: 3 });
  });

  it('без подходящей карты в руке молчит, а не советует конец хода', () => {
    const r = resolveTutorialLesson({
      ...base,
      progress: progress({ learned: learned({ land: true }) }),
      hasPlayableLand: true,
    });
    expect(r).toBeNull();
  });

  it('не перескакивает с урока 3 на урок 4, пока существо не атаковало', () => {
    const r = resolveTutorialLesson({
      ...base,
      progress: progress({ learned: learned({ land: true, nonLand: true }) }),
      hasCreatureOnField: true,
      turnNumber: 2,
    });
    expect(r).toEqual({ lesson: 3, variant: 'patience', reason: 'attack' });
  });

  it('показывает атаку, когда существо готово', () => {
    const r = resolveTutorialLesson({
      ...base,
      progress: progress({ learned: learned({ land: true, nonLand: true }) }),
      hasAttackReadyCreature: true,
      hasCreatureOnField: true,
      turnNumber: 2,
    });
    expect(r).toEqual({ lesson: 3, variant: 'action' });
  });

  it('конец хода — только когда других дел нет', () => {
    const r = resolveTutorialLesson({
      ...base,
      progress: progress({ learned: learned({ land: true, nonLand: true, attack: true }) }),
      turnNumber: 3,
    });
    expect(r).toEqual({ lesson: 4, variant: 'action' });
  });

  it('возвращается к уроку 1, если он не пройден, а игрок уже разыграл карту', () => {
    // Обратный случай прыжка: урок 2 пройден раньше урока 1 — порядок всё равно 1 → 2.
    const r = resolveTutorialLesson({
      ...base,
      progress: progress({ learned: learned({ nonLand: true }) }),
      hasPlayableLand: true,
      hasAttackReadyCreature: true,
    });
    expect(r).toEqual({ lesson: 1, variant: 'action' });
  });
});

describe('честные состояния урока', () => {
  it('объясняет нехватку маны и советует завершить ход', () => {
    const r = resolveTutorialLesson({
      ...base,
      progress: progress({ learned: learned({ land: true }) }),
      cheapestNonLandCost: 4,
      mana: 2,
    });
    expect(r).toEqual({ lesson: 2, variant: 'wait', requiredMana: 4 });
  });

  it('объясняет болезнь призыва, а не зовёт завершить ход наугад', () => {
    const r = resolveTutorialLesson({
      ...base,
      progress: progress({ learned: learned({ land: true, nonLand: true }) }),
      hasCreatureOnField: true,
    });
    expect(r).toEqual({ lesson: 3, variant: 'patience', reason: 'attack' });
  });

  it('во время хода противника подсказки нет', () => {
    expect(ask({ myTurn: false, hasPlayableLand: true })).toBeNull();
  });

  it('после конца боя подсказок нет', () => {
    expect(ask({ gameOver: true, hasPlayableLand: true })).toBeNull();
  });

  it('после пропуска или полного прохождения подсказок нет', () => {
    expect(ask({ progress: progress({ completed: true }), hasPlayableLand: true })).toBeNull();
  });

  it('после потолка ходов подсказка замолкает, чтобы не висеть вечно', () => {
    expect(ask({ hasPlayableLand: true, turnNumber: TUTORIAL_MAX_TURN })).not.toBeNull();
    expect(ask({ hasPlayableLand: true, turnNumber: TUTORIAL_MAX_TURN + 1 })).toBeNull();
  });

  it('не требует атаки, если атаковать некому и на столе пусто', () => {
    const r = resolveTutorialLesson({
      ...base,
      progress: progress({ learned: learned({ land: true, nonLand: true }) }),
      turnNumber: 3,
    });
    expect(r).toEqual({ lesson: 4, variant: 'action' });
  });
});

describe('ключ телеметрии', () => {
  it('различает ожидание и действие', () => {
    expect(tutorialLessonTelemetryKey({ lesson: 1, variant: 'action' })).toBe('play_land');
    expect(tutorialLessonTelemetryKey({ lesson: 2, variant: 'action' })).toBe('play_non_land');
    expect(tutorialLessonTelemetryKey({ lesson: 2, variant: 'wait', requiredMana: 3 })).toBe(
      'play_non_land_wait'
    );
    expect(tutorialLessonTelemetryKey({ lesson: 3, variant: 'action' })).toBe('attack');
    expect(
      tutorialLessonTelemetryKey({ lesson: 3, variant: 'patience', reason: 'attack' })
    ).toBe('attack_wait');
    expect(tutorialLessonTelemetryKey({ lesson: 4, variant: 'action' })).toBe('end_turn');
  });
});

describe('прогресс обучения', () => {
  it('начальный прогресс: ничего не пройдено и обучение не завершено', () => {
    expect(createInitialTutorialProgress()).toEqual({
      version: 2,
      completed: false,
      learned: { land: false, nonLand: false, attack: false, endTurn: false },
    });
  });

  it('первый непройденный урок считается по порядку', () => {
    expect(firstUnlearnedLesson(progress())).toBe(1);
    expect(firstUnlearnedLesson(progress({ learned: learned({ land: true }) }))).toBe(2);
    expect(
      firstUnlearnedLesson(progress({ learned: learned({ land: true, nonLand: true }) }))
    ).toBe(3);
    expect(
      firstUnlearnedLesson(
        progress({ learned: learned({ land: true, nonLand: true, attack: true }) })
      )
    ).toBe(4);
    expect(
      firstUnlearnedLesson(
        progress({ learned: learned({ land: true, nonLand: true, attack: true, endTurn: true }) })
      )
    ).toBeNull();
  });

  it('урок отмечается один раз и завершает обучение только на четвёртом', () => {
    let p = createInitialTutorialProgress();
    p = markTutorialLearned(p, 'land');
    p = markTutorialLearned(p, 'nonLand');
    p = markTutorialLearned(p, 'attack');
    expect(p.completed).toBe(false);
    p = markTutorialLearned(p, 'endTurn');
    expect(p.completed).toBe(true);
    // повторная отметка не создаёт новый объект и не ломает состояние
    expect(markTutorialLearned(p, 'endTurn')).toBe(p);
  });

  it('полное прохождение четырёх уроков убирает подсказки', () => {
    let p = createInitialTutorialProgress();
    for (const key of ['land', 'nonLand', 'attack', 'endTurn'] as const) {
      p = markTutorialLearned(p, key);
    }
    expect(resolveTutorialLesson({ ...base, progress: p, hasPlayableLand: true })).toBeNull();
  });
});
