/**
 * Language Selector Component
 * Provides a dropdown to switch between 10 supported languages
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

export default function LanguageSelector() {
  const { t } = useTranslation();
  const { currentLanguage, currentLocale, changeLanguage, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Enter' || event.key === ' ') {
      setIsOpen(!isOpen);
    }
  };

  const handleLanguageChange = async (langCode: string) => {
    await changeLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 border border-gold-600/30 hover:border-gold-500/50 transition-all duration-200 text-gold-100"
        aria-label={t('common.language')}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4 text-gold-400" aria-hidden="true" />
        <span className="text-sm font-medium">{currentLocale.flag}</span>
        <span className="hidden sm:inline text-sm">{currentLocale.nativeName}</span>
        <ChevronDown 
          className={`w-4 h-4 text-gold-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-gold-600/30 shadow-2xl shadow-black/50 z-50 overflow-hidden"
            role="listbox"
            aria-label={t('common.language')}
          >
            <div className="p-2 border-b border-gold-600/20">
              <p className="text-xs text-gold-400 font-medium px-2">
                {t('common.language')}
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {availableLanguages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gold-600/10 transition-colors duration-150 ${
                    currentLanguage === lang.code ? 'bg-gold-600/20' : ''
                  }`}
                  role="option"
                  aria-selected={currentLanguage === lang.code}
                >
                  <span className="text-lg" aria-hidden="true">{lang.flag}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gold-100">{lang.nativeName}</p>
                    <p className="text-xs text-gray-400">{lang.name}</p>
                  </div>
                  {currentLanguage === lang.code && (
                    <Check className="w-4 h-4 text-gold-400" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



