/**
 * Прогресс обучения в бою.
 *
 * Раньше подсказка выбирала шаг из того, что доступно ПРЯМО СЕЙЧАС, и жила только
 * первые три хода. Из-за этого она прыгала с «сыграйте землю» сразу на «конец хода»:
 * существо обычно не по карману на первом ходу, а атаковать существо не может до
 * следующего своего хода — то есть уроки 2 и 3 игрок не видел вообще.
 *
 * Здесь урок — это ЦЕЛЬ, а не «что доступно». Подсказка всегда показывает ПЕРВЫЙ
 * непройденный урок и держится его, пока он не пройден. Прыжок через урок
 * становится невозможен по построению.
 *
 * Урок считается пройденным, когда игрок выполнил действие, и это помнится между
 * ходами. Если урок пока выполнить нельзя, подсказка не пропускает его молча, а
 * честно объясняет причину одним из двух состояний:
 *   - 'wait'     — не хватает маны на карту, которая уже в руке;
 *   - 'patience' — условий пока нет вовсе (нет подходящей карты, существо только
 *                  что вышло и ещё не может атаковать).
 */

export type TutorialLesson = 1 | 2 | 3 | 4;

/** Действие выполнимо сейчас. */
export type TutorialActionVariant = 'action';
/** Выполнимо, но не хватает маны. */
export type TutorialWaitVariant = 'wait';
/** Пока невыполнимо, и это не вина игрока. */
export type TutorialPatienceVariant = 'patience';

export type TutorialVariant =
  | TutorialActionVariant
  | TutorialWaitVariant
  | TutorialPatienceVariant;

/** Точная причина состояния 'patience' — по ней подсказка выбирает текст. */
export type TutorialPatienceReason = 'creatures' | 'attack';

export type TutorialLearnedKey = 'land' | 'nonLand' | 'attack' | 'endTurn';

export type TutorialLearned = Record<TutorialLearnedKey, boolean>;

export type TutorialProgress = {
  version: 2;
  completed: boolean;
  learned: TutorialLearned;
};

export type TutorialLessonHint = {
  lesson: TutorialLesson;
  variant: TutorialVariant;
  /** Заполнено только у 'wait': цена самой дешёвой не-земли в руке. */
  requiredMana?: number | null;
  /** Заполнено только у 'patience'. */
  reason?: TutorialPatienceReason;
};

/** Урок → ключ освоения. Один и тот же порядок используется везде. */
export const LESSON_LEARNED_KEY: Record<TutorialLesson, TutorialLearnedKey> = {
  1: 'land',
  2: 'nonLand',
  3: 'attack',
  4: 'endTurn',
};

export const TUTORIAL_PROGRESS_KEY = 'omsk.tutorial.v2';
/** Прежний ключ: там лежала просто строка «true» после пропуска обучения. */
export const LEGACY_TUTORIAL_COMPLETED_KEY = 'tutorialCompleted';

/**
 * Потолок обучения. Раньше подсказка умирала на третьем ходу, и уроки 2–3 игрок
 * физически не успевал увидеть. Здесь это только страховка от бесконечной подсказки,
 * а решает всё прогресс: пока есть непройденный урок — обучение идёт.
 */
export const TUTORIAL_MAX_TURN = 8;

export function createInitialTutorialProgress(): TutorialProgress {
  return {
    version: 2,
    completed: false,
    learned: { land: false, nonLand: false, attack: false, endTurn: false },
  };
}

function normalizeLearned(value: unknown): TutorialLearned {
  const source = (value ?? {}) as Partial<Record<TutorialLearnedKey, unknown>>;
  return {
    land: source.land === true,
    nonLand: source.nonLand === true,
    attack: source.attack === true,
    endTurn: source.endTurn === true,
  };
}

export function normalizeTutorialProgress(value: unknown): TutorialProgress | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { version?: unknown; completed?: unknown; learned?: unknown };
  // Незнакомую версию отвергаем: формат мог поменяться, а гадать о смысле полей нельзя.
  if (candidate.version !== undefined && candidate.version !== 2) return null;
  return {
    version: 2,
    completed: candidate.completed === true,
    learned: normalizeLearned(candidate.learned),
  };
}

export function loadTutorialProgress(): TutorialProgress {
  if (typeof window === 'undefined') return createInitialTutorialProgress();
  try {
    const raw = window.localStorage.getItem(TUTORIAL_PROGRESS_KEY);
    if (raw) {
      const parsed = normalizeTutorialProgress(JSON.parse(raw));
      if (parsed) return parsed;
    }
    // Миграция: игрок уже проходил или пропускал обучение в прежней сборке —
    // без этого ему показали бы подсказки заново.
    if (window.localStorage.getItem(LEGACY_TUTORIAL_COMPLETED_KEY) === 'true') {
      return { ...createInitialTutorialProgress(), completed: true };
    }
  } catch {
    // Приватный режим или битый JSON — обучение просто начнётся сначала.
  }
  return createInitialTutorialProgress();
}

export function saveTutorialProgress(progress: TutorialProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TUTORIAL_PROGRESS_KEY, JSON.stringify(progress));
    if (progress.completed) {
      // Держим прежний ключ в согласии: его читают старые сборки и тесты.
      window.localStorage.setItem(LEGACY_TUTORIAL_COMPLETED_KEY, 'true');
    }
  } catch {
    // no-op: localStorage может быть недоступен
  }
}

export function markTutorialLearned(
  progress: TutorialProgress,
  key: TutorialLearnedKey
): TutorialProgress {
  if (progress.completed || progress.learned[key]) return progress;
  const learned = { ...progress.learned, [key]: true };
  const completed = learned.land && learned.nonLand && learned.attack && learned.endTurn;
  return { ...progress, learned, completed };
}

/** Первый непройденный урок по порядку. null — пройдены все. */
export function firstUnlearnedLesson(progress: TutorialProgress): TutorialLesson | null {
  const order: TutorialLesson[] = [1, 2, 3, 4];
  for (const lesson of order) {
    if (!progress.learned[LESSON_LEARNED_KEY[lesson]]) return lesson;
  }
  return null;
}

export type TutorialLessonInput = {
  progress: TutorialProgress;
  myTurn: boolean;
  gameOver: boolean;
  turnNumber: number;
  hasPlayableLand: boolean;
  hasPlayableNonLand: boolean;
  /** Самая дешёвая не-земля в руке; null — таких карт нет. */
  cheapestNonLandCost: number | null;
  mana: number;
  hasAttackReadyCreature: boolean;
  /** Есть ли на столе существо, которое ждёт своего часа (болезнь призыва). */
  hasCreatureOnField: boolean;
};

/**
 * Первый непройденный урок и то, в каком он сейчас состоянии.
 * null — подсказку показывать не нужно вообще.
 *
 * Порядок уроков нерушим: 1 (земля) → 2 (существо/заклинание) → 3 (атака) →
 * 4 (конец хода). Урок 4 показывается только тогда, когда других дел нет.
 */
export function resolveTutorialLesson(input: TutorialLessonInput): TutorialLessonHint | null {
  const { progress } = input;
  if (progress.completed || input.gameOver || !input.myTurn) return null;
  if (input.turnNumber > TUTORIAL_MAX_TURN) return null;

  const lesson = firstUnlearnedLesson(progress);
  if (lesson === null) return null;

  switch (lesson) {
    case 1: {
      // Земля есть в руке и лимит земель не исчерпан — можно играть.
      if (input.hasPlayableLand) return { lesson: 1, variant: 'action' };
      // Земли нет или лимит исчерпан: звать «сыграйте землю» бессмысленно,
      // а «конец хода» здесь — враньё, потому что это урок 4.
      return null;
    }
    case 2: {
      if (input.hasPlayableNonLand) return { lesson: 2, variant: 'action' };
      if (input.cheapestNonLandCost !== null && input.cheapestNonLandCost > input.mana) {
        return {
          lesson: 2,
          variant: 'wait',
          requiredMana: input.cheapestNonLandCost,
        };
      }
      // Подходящей карты в руке нет вовсе — ждём раздачи, ничего не советуя наугад.
      return null;
    }
    case 3: {
      if (input.hasAttackReadyCreature) return { lesson: 3, variant: 'action' };
      // Существо уже на столе, но атаковать не может: болезнь призыва или оно
      // уже ходило. Это и есть честная причина, а не «нажмите конец хода».
      if (input.hasCreatureOnField) {
        return { lesson: 3, variant: 'patience', reason: 'attack' };
      }
      return null;
    }
    default: {
      // Урок 4 — только когда действительно нечего делать: ни земли, ни карты,
      // ни атакующего. Любая возможность вернуть игрока к более раннему уроку
      // уже обработана выше, поэтому здесь призыв завершить ход честен.
      return { lesson: 4, variant: 'action' };
    }
  }
}

/** Ключ подсказки для телеметрии — имена оставлены прежними. */
export function tutorialLessonTelemetryKey(hint: TutorialLessonHint): string {
  switch (hint.lesson) {
    case 1:
      return 'play_land';
    case 2:
      return hint.variant === 'wait' ? 'play_non_land_wait' : 'play_non_land';
    case 3:
      return hint.variant === 'patience' ? 'attack_wait' : 'attack';
    default:
      return 'end_turn';
  }
}
