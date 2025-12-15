/**
 * Language Context
 * 
 * Provides a context that triggers re-renders when language changes.
 * This ensures all components update properly when switching languages.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { languages } from '../i18n';

interface LanguageContextType {
  currentLanguage: string;
  currentLocale: typeof languages[0];
  isRTL: boolean;
  changeLanguage: (langCode: string) => Promise<void>;
  availableLanguages: typeof languages;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');
  const [renderKey, setRenderKey] = useState(0);

  const currentLocale = languages.find(lang => lang.code === currentLanguage) || languages[0];
  const isRTL = currentLocale.rtl || false;

  // Update document direction
  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [isRTL, currentLanguage]);

  // Listen for language changes from i18n
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng);
      setRenderKey(prev => prev + 1); // Force re-render
    };

    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  const changeLanguage = useCallback(async (langCode: string) => {
    try {
      await i18n.changeLanguage(langCode);
      setCurrentLanguage(langCode);
      localStorage.setItem('i18nextLng', langCode);
      // Force a re-render of the entire app
      setRenderKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  }, [i18n]);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        currentLocale,
        isRTL,
        changeLanguage,
        availableLanguages: languages,
      }}
    >
      {/* Key forces re-render when language changes */}
      <div key={renderKey}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;




