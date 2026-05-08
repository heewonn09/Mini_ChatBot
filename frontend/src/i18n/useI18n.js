import { useMemo } from 'react';
import { messages } from '../context/messages';
import { translations } from './translations';

function getByPath(obj, key) {
  return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

function interpolate(text, vars = {}) {
  return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export function createTranslator(language) {
  const locale = { ...(messages[language] ?? {}), ...(translations[language] ?? {}) };
  const fallbackLocale = { ...(messages.en ?? {}), ...(translations.en ?? {}) };

  return (key, vars) => {
    const value = getByPath(locale, key) ?? getByPath(fallbackLocale, key);
    if (typeof value !== 'string') return key;
    return vars ? interpolate(value, vars) : value;
  };
}

export function useI18n(language) {
  return useMemo(() => createTranslator(language), [language]);
}
