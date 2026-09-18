/**
 * ESM-загрузчик для локальных проверок: компилирует .tsx/.ts через сам `typescript`,
 * минуя esbuild.
 *
 * Зачем: `vitest` и `vite build` под файловой песочницей падают с spawn EPERM —
 * esbuild не может поднять дочерний процесс. Node 24 сам снимает типы с .ts, но JSX
 * не умеет вовсе (ERR_UNKNOWN_FILE_EXTENSION для .tsx). Этот загрузчик закрывает
 * ровно эту дыру: `ts.transpileModule` с `jsx: react-jsx` и подменой расширения на .js.
 *
 * Использование: node --import ./scripts/tsx-loader.mjs scripts/check-*.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const COMPILED = /\.(ts|tsx|mts)$/;

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith('.') && !specifier.startsWith('/')) return nextResolve(specifier, context);
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    // Исходники пишут импорты без расширения (как их ждёт Vite) — добавляем его сами.
    if (error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    for (const ext of ['.tsx', '.ts']) {
      try {
        return await nextResolve(`${specifier}${ext}`, context);
      } catch {
        // пробуем следующее расширение
      }
    }
    throw error;
  }
}

export async function load(url, context, nextLoad) {
  if (!COMPILED.test(new URL(url).pathname)) return nextLoad(url, context);

  const source = readFileSync(fileURLToPath(url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      verbatimModuleSyntax: false,
      isolatedModules: true,
    },
    fileName: fileURLToPath(url),
  });

  return { format: 'module', source: outputText, shortCircuit: true };
}
