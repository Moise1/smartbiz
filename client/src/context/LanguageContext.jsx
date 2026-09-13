import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from '../locales/en.json';
import rw from '../locales/rw.json';

const DICTS = { en, rw };
const LanguageContext = createContext(null);

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function interpolate(value, vars) {
  if (typeof value !== 'string' || !vars) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name) => (vars[name] ?? ''));
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('lang') === 'rw' ? 'rw' : 'en';
    } catch {
      return 'en';
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang === 'rw' ? 'rw' : 'en';
  }, [lang]);

  const setLang = useCallback((next) => {
    const value = next === 'rw' ? 'rw' : 'en';
    setLangState(value);
    try {
      localStorage.setItem('lang', value);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key, vars) => {
    const fromCurrent = getByPath(DICTS[lang], key);
    const fromEn = getByPath(en, key);
    const raw = fromCurrent ?? fromEn ?? key;
    return interpolate(raw, vars);
  }, [lang]);

  const fromMap = useCallback((mapKey, english) => {
    if (!english) return english;
    const map = getByPath(DICTS[lang], mapKey);
    if (map && typeof map === 'object' && english in map) return map[english];
    return english;
  }, [lang]);

  const translateCategory = useCallback(
    (name) => fromMap('categories.names', name),
    [fromMap],
  );

  const value = useMemo(
    () => ({ lang, setLang, t, fromMap, translateCategory }),
    [lang, setLang, t, fromMap, translateCategory],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
