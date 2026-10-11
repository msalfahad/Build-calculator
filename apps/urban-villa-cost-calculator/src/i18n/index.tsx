import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import en from './en.json';
import ar from './ar.json';
import type { Lang } from '../types';

type Dict = Record<string, unknown>;
const DICTS: Record<Lang, Dict> = { en, ar };

function lookup(d: Dict, key: string): string | undefined {
  let cur: unknown = d;
  for (const part of key.split('.')) {
    if (cur && typeof cur === 'object' && part in (cur as Dict)) cur = (cur as Dict)[part];
    else return undefined;
  }
  return typeof cur === 'string' ? cur : undefined;
}

export type TFn = (key: string, params?: Record<string, string | number>) => string;

export function makeT(lang: Lang): TFn {
  return (key, params) => {
    const s = lookup(DICTS[lang], key) ?? lookup(DICTS.en, key) ?? key;
    if (!params) return s;
    return s.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : `{${k}}`));
  };
}

// Western digits with thousands separators in both languages (standard for KWD figures in Kuwait and robust in PDF).
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf3 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });

export const fmtNum = (n: number | null | undefined, maxFrac = 3) =>
  n === null || n === undefined ? '—' : maxFrac === 0 ? nf0.format(n) : nf3.format(n);

interface I18nCtx {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  t: TFn;
  setLang: (l: Lang) => void;
  kwd: (n: number | null | undefined) => string;
  num: (n: number | null | undefined) => string;
}

const Ctx = createContext<I18nCtx | null>(null);
const LANG_KEY = 'urban-vcc.lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const q = new URLSearchParams(window.location.search).get('lang');
      if (q === 'ar' || q === 'en') return q;
      const s = localStorage.getItem(LANG_KEY);
      if (s === 'ar' || s === 'en') return s;
    } catch {
      /* ignore */
    }
    return 'en';
  });
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.title = lang === 'ar' ? 'حاسبة تكلفة بناء القسيمة' : 'Villa Cost Calculator';
  }, [lang, dir]);
  const value = useMemo<I18nCtx>(() => {
    const t = makeT(lang);
    return {
      lang,
      dir,
      t,
      setLang: (l) => {
        setLangState(l);
        try {
          localStorage.setItem(LANG_KEY, l);
        } catch {
          /* ignore */
        }
      },
      kwd: (n) => (n === null || n === undefined ? '—' : `${fmtNum(n, 0)} ${t('common.kwd')}`),
      num: (n) => fmtNum(n),
    };
  }, [lang, dir]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useI18n outside provider');
  return c;
}
