/**
 * Регистрация загрузчика для локальных проверок.
 * Вынесено отдельно от tsx-loader.mjs, потому что hooks должны исполняться
 * в отдельном потоке (module.register), иначе Node берёт формат файла нативно
 * и падает на .tsx с ERR_UNKNOWN_FILE_EXTENSION.
 *
 * Использование: node --import ./scripts/register-tsx.mjs scripts/check-*.mjs
 */
import { register } from 'node:module';

register('./tsx-loader.mjs', import.meta.url);
