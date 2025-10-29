import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { translations } from '../translations';

export type Language = 'en' | 'ar';
export type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  // FIX: Updated the type definition for `t` to accept an optional `replacements` object.
  t: (key: TranslationKey, replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [language, setLanguage] = useState<Language>('en');

  // FIX: Updated the implementation of `t` to handle placeholder interpolation.
  const t = useCallback(
    (key: TranslationKey, replacements?: Record<string, string | number>): string => {
      let translation = translations[language][key] || translations.en[key];

      if (replacements) {
        Object.keys(replacements).forEach((placeholder) => {
          translation = translation.replace(`{${placeholder}}`, String(replacements[placeholder]));
        });
      }

      return translation;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
