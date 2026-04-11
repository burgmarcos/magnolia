/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

import en from '../assets/locales/en-US.json';
import pt from '../assets/locales/pt-BR.json';
import es from '../assets/locales/es-LA.json';

export type Language = 'en-US' | 'pt-BR' | 'es-LA';

type Dictionary = Record<string, string>;

const dictionaries: Record<Language, Dictionary> = {
  'en-US': en,
  'pt-BR': pt,
  'es-LA': es
};

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  translate: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('magnolia-lang') as Language) || 'en-US';
  });

  useEffect(() => {
    localStorage.setItem('magnolia-lang', lang);
  }, [lang]);

  const translate = (key: string) => {
    return dictionaries[lang]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("Must be in LanguageProvider");
  return ctx;
}
