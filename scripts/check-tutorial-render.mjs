/**
 * Локальная проверка отрисовки панели обучения — без vitest и без сборщика.
 *
 * Node 24 исполняет TSX напрямую (type stripping + jsx: react-jsx из tsconfig.json),
 * а панель подсказки — чистая функция от props: ни состояния игры, ни хуков, кроме
 * useState, который умеет работать через react-dom/server. Поэтому её можно отрисовать
 * в строку и проверить, что игрок увидит нужный шаг, нужный текст и честную причину.
 *
 * Запуск: node scripts/check-tutorial-render.mjs
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Tutorial } from '../src/components/game/Tutorial.tsx';
import { createInitialTutorialProgress } from '../src/utils/tutorialProgress.ts';

const noLearned = createInitialTutorialProgress().learned;

let passed = 0;
const failures = [];

function render(hint, learned = noLearned, mana = 1, requiredMana = null) {
  // createElement, а не прямой вызов: Tutorial использует useState, и хуки
  // работают только внутри настоящего рендера React.
  return renderToStaticMarkup(
    createElement(Tutorial, { hint, learned, mana, requiredMana, onSkip: () => {} })
  );
}

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    return;
  }
  failures.push(`${name}${detail ? `\n    ${detail}` : ''}`);
}

// ─── урок 1 ───────────────────────────────────────────────────────────────────

const land = render({ lesson: 1, variant: 'action' }, noLearned, 0, null);
check('урок про землю: номер шага', land.includes('Шаг 1 из 4'), land.slice(0, 200));
check('урок про землю: заголовок', land.includes('Сыграйте ЗЕМЛЮ'));
check('урок про землю: подсветка зоны руки', land.includes('tutorial-spotlight-hand'));

// ─── урок 2: ожидание маны ────────────────────────────────────────────────────

const wait = render({ lesson: 2, variant: 'wait', requiredMana: 3 }, { ...noLearned, land: true }, 1, 3);
check('ожидание: номер шага не меняется', wait.includes('Шаг 2 из 4'), wait.slice(0, 200));
check('ожидание: заголовок про ману', wait.includes('Маны пока мало'));
check('ожидание: объяснение нехватки', wait.includes('стоит 3, а у вас 1 маны'));
check('ожидание: сказано, чего не хватает', wait.includes('Не хватает 2'));

// ─── урок 2: действие ─────────────────────────────────────────────────────────

const play = render({ lesson: 2, variant: 'action' }, { ...noLearned, land: true }, 3, null);
check('действие: номер шага', play.includes('Шаг 2 из 4'));
check('действие: заголовок про существо', play.includes('Сыграйте СУЩЕСТВО или ЗАКЛИНАНИЕ'));
check('действие: полоска пройденного шага закрашена', play.includes('bg-[#c9a84c]'));

// ─── урок 3: терпение ─────────────────────────────────────────────────────────

const patience = render(
  { lesson: 3, variant: 'patience', reason: 'attack' },
  { ...noLearned, land: true, nonLand: true },
  2,
  null
);
check('терпение: номер шага', patience.includes('Шаг 3 из 4'));
check('терпение: заголовок про готовность', patience.includes('Существо ещё не готово'));
check('терпение: причина названа прямо', patience.includes('болезнью призыва'));
check('терпение: подсветка поля', patience.includes('tutorial-spotlight-board'));

// ─── урок 4 ───────────────────────────────────────────────────────────────────

const endTurn = render(
  { lesson: 4, variant: 'action' },
  { ...noLearned, land: true, nonLand: true, attack: true },
  3,
  null
);
check('конец хода: номер шага', endTurn.includes('Шаг 4 из 4'));
check('конец хода: подсветка кнопки', endTurn.includes('tutorial-spotlight-endturn'));

// ─── общее ────────────────────────────────────────────────────────────────────

check('в панели есть кнопка пропуска', land.includes('Пропустить обучение'));
check('в панели назван потолок обучения', land.includes('8-го хода'));

// ─── итог ─────────────────────────────────────────────────────────────────────

if (failures.length > 0) {
  console.error(`\n❌ Провалено ${failures.length} из ${passed + failures.length}:\n`);
  for (const f of failures) console.error(`  • ${f}\n`);
  process.exit(1);
}

console.log(`✅ Отрисовка панели обучения: ${passed}/${passed} проверок пройдено.`);
