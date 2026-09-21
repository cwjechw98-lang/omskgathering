/**
 * Проверка доступности Jev (TypeSafe System One) по всем маршрутам, которые
 * прописаны в харнессе, плюс официальный прямой эндпоинт.
 *
 * Зачем: Jev — не обычная LLM. У него своя форма запроса (state + типизированные
 * вопросы Choice/Score/Noul) и свой эндпоинт /v1/systemone. Поэтому «модель
 * подключена в харнессе» и «модель отвечает» — разные утверждения, и проверять
 * их надо запросом, а не записью в settings.yaml.
 *
 * Секреты читаются из ~/.dsh/.credentials.yaml и НИКОГДА не печатаются.
 *
 * Запуск: node scripts/jev-route-probe.mjs
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function readRefs() {
  const path = join(homedir(), '.dsh', '.credentials.yaml');
  let raw = '';
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return {};
  }
  const refs = {};
  // Формат: внутри секции refs строки вида "  KEY: value"
  for (const m of raw.matchAll(/^\s{2}([A-Z0-9_]+):\s*(.+)$/gm)) {
    refs[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return refs;
}

const refs = readRefs();

const QUESTION = {
  state: 'Карта: Студент ОмГТУ, 2 маны, 1/3, защитник. Есть более сильная карта за ту же цену?',
  model: 'jev-latest',
  questions: {
    is_ok: { type: 'noul', instructions: 'Is this state understandable?' },
  },
};

async function probe(label, url, key, body, headers = {}) {
  if (!key) return { label, status: 'нет ключа' };
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
    const text = (await res.text()).slice(0, 300);
    return { label, status: `HTTP ${res.status}`, ms: Date.now() - started, body: text };
  } catch (error) {
    return { label, status: `ошибка: ${error.message}` };
  }
}

const openaiShape = {
  model: 'jev-1.13-free',
  messages: [{ role: 'user', content: 'Say ok' }],
  max_tokens: 64,
};

const results = [];

// 1. Прямой официальный эндпоинт TypeSafe — правильная форма запроса для Jev.
results.push(
  await probe(
    'typesafe.ai/v1/systemone (прямой)',
    'https://api.typesafe.ai/v1/systemone',
    refs.TYPESAFE_API_KEY,
    QUESTION
  )
);

// 2. Прямой список моделей — заодно проверяет, валиден ли ключ вообще.
if (refs.TYPESAFE_API_KEY) {
  try {
    const res = await fetch('https://api.typesafe.ai/v1/models', {
      headers: { Authorization: `Bearer ${refs.TYPESAFE_API_KEY}` },
      signal: AbortSignal.timeout(30_000),
    });
    results.push({ label: 'typesafe.ai/v1/models', status: `HTTP ${res.status}` });
  } catch (error) {
    results.push({ label: 'typesafe.ai/v1/models', status: `ошибка: ${error.message}` });
  }
} else {
  results.push({ label: 'typesafe.ai/v1/models', status: 'нет ключа' });
}

// 3. Vercel AI Gateway — держит typesafe-ai/jev, но в OpenAI-форме.
results.push(
  await probe(
    'vercel typesafe-ai/jev',
    'https://ai-gateway.vercel.sh/v1/chat/completions',
    refs.VERCEL_API_KEY,
    { ...openaiShape, model: 'typesafe-ai/jev' }
  )
);

// 4. OpenCode — держит jev-1.13-free.
results.push(
  await probe(
    'opencode jev-1.13-free',
    'https://opencode.ai/zen/v1/chat/completions',
    refs.OPENCODE_LIVE_API_KEY,
    openaiShape
  )
);

// 5. Контроль: живая ли вообще учётка OpenCode (отличает «Jev сломан» от «доступ закрыт»).
results.push(
  await probe(
    'opencode контроль (mimo-v2.5-free)',
    'https://opencode.ai/zen/v1/chat/completions',
    refs.OPENCODE_LIVE_API_KEY,
    { ...openaiShape, model: 'mimo-v2.5-free', max_tokens: 16 }
  )
);

console.log('\nJev route probe — %s\n', new Date().toISOString());
for (const r of results) {
  console.log(`  ${r.status.padEnd(28)} ${r.label}${r.ms ? ` (${r.ms} ms)` : ''}`);
  if (r.body) console.log(`      ${r.body.replace(/\s+/g, ' ')}`);
}
console.log('');
