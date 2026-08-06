import { ru, TranslationKey } from './ru';

export type { TranslationKey };
export { ru };

export type TranslationParams = Record<string, string | number>;

const PLACEHOLDER = /\{(\w+)\}/g;

/** Возвращает строку интерфейса по ключу словаря, подставляя `{параметры}`. */
export function t(key: TranslationKey, params?: TranslationParams): string {
  const template: string = ru[key];
  if (!params) return template;
  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/**
 * Машиночитаемый код превращается во фразу тем же словарём.
 * Неизвестный код не должен утечь на экран — отдаём общий текст.
 */
export function tErrorCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const key = `error.code.${code}` as TranslationKey;
  return key in ru ? ru[key] : null;
}
