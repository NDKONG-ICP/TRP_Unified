/**
 * Accessibility Menu Component
 * Provides comprehensive accessibility controls for users with disabilities
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Accessibility, 
  Eye, 
  Type, 
  Volume2, 
  Keyboard, 
  Sun, 
  Moon,
  ChevronDown,
  X,
  Minus,
  Plus
} from 'lucide-react';
import { useAccessibilityStore } from '../../stores/accessibilityStore';

export default function AccessibilityMenu() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const {
    settings,
    setHighContrast,
    setLargeText,
    setTextScale,
    setColorBlindMode,
    setDyslexiaFont,
    setReducedMotion,
    setScreenReaderOptimized,
    setCaptionsEnabled,
    setEnhancedFocusIndicators,
    setTextToSpeechEnabled,
    setLineSpacing,
    resetToDefaults,
  } = useAccessibilityStore();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
    }
  };

  const ToggleSwitch = ({ 
    enabled, 
    onChange, 
    label 
  }: { 
    enabled: boolean; 
    onChange: (enabled: boolean) => void; 
    label: string;
  }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        enabled ? 'bg-gold-600' : 'bg-gray-600'
      }`}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 border border-gold-600/30 hover:border-gold-500/50 transition-all duration-200 text-gold-100"
        aria-label={t('common.accessibility')}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Accessibility className="w-4 h-4 text-gold-400" aria-hidden="true" />
        <span className="hidden sm:inline text-sm">{t('common.accessibility')}</span>
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
            className="absolute right-0 mt-2 w-80 rounded-xl bg-gray-900/95 backdrop-blur-xl border border-gold-600/30 shadow-2xl shadow-black/50 z-50 overflow-hidden"
            role="dialog"
            aria-label={t('accessibility.title')}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gold-600/20">
              <h3 className="text-lg font-semibold text-gold-400 flex items-center gap-2">
                <Accessibility className="w-5 h-5" aria-hidden="true" />
                {t('accessibility.title')}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-800 transition-colors"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto p-4 space-y-4">
              {/* Visual Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gold-300 flex items-center gap-2">
                  <Eye className="w-4 h-4" aria-hidden="true" />
                  Visual
                </h4>
                
                {/* High Contrast */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{t('accessibility.highContrast')}</span>
                  <ToggleSwitch
                    enabled={settings.highContrast}
                    onChange={setHighContrast}
                    label={t('accessibility.highContrast')}
                  />
                </div>

                {/* Large Text */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{t('accessibility.largeText')}</span>
                  <ToggleSwitch
                    enabled={settings.largeText}
                    onChange={setLargeText}
                    label={t('accessibility.largeText')}
                  />
                </div>

                {/* Text Scale */}
                <div className="space-y-2">
                  <span className="text-sm text-gray-300">Text Size: {Math.round(settings.textScale * 100)}%</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTextScale(settings.textScale - 0.1)}
                      className="p-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                      aria-label="Decrease text size"
                    >
                      <Minus className="w-4 h-4 text-gold-400" />
                    </button>
                    <input
                      type="range"
                      min="0.8"
                      max="2.0"
                      step="0.1"
                      value={settings.textScale}
                      onChange={(e) => setTextScale(parseFloat(e.target.value))}
                      className="flex-1 h-2 rounded-lg appearance-none bg-gray-700 accent-gold-500"
                      aria-label="Text scale"
                    />
                    <button
                      onClick={() => setTextScale(settings.textScale + 0.1)}
                      className="p-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                      aria-label="Increase text size"
                    >
                      <Plus className="w-4 h-4 text-gold-400" />
                    </button>
                  </div>
                </div>

                {/* Color Blind Mode */}
                <div className="space-y-2">
                  <span className="text-sm text-gray-300">{t('accessibility.colorBlind')}</span>
                  <select
                    value={settings.colorBlindMode}
                    onChange={(e) => setColorBlindMode(e.target.value as typeof settings.colorBlindMode)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
                    aria-label={t('accessibility.colorBlind')}
                  >
                    <option value="none">None</option>
                    <option value="protanopia">Protanopia (Red-Blind)</option>
                    <option value="deuteranopia">Deuteranopia (Green-Blind)</option>
                    <option value="tritanopia">Tritanopia (Blue-Blind)</option>
                  </select>
                </div>

                {/* Dyslexia Font */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{t('accessibility.dyslexiaFont')}</span>
                  <ToggleSwitch
                    enabled={settings.dyslexiaFont}
                    onChange={setDyslexiaFont}
                    label={t('accessibility.dyslexiaFont')}
                  />
                </div>
              </div>

              {/* Motion Section */}
              <div className="space-y-3 pt-3 border-t border-gray-800">
                <h4 className="text-sm font-medium text-gold-300 flex items-center gap-2">
                  <Sun className="w-4 h-4" aria-hidden="true" />
                  Motion
                </h4>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{t('accessibility.reducedMotion')}</span>
                  <ToggleSwitch
                    enabled={settings.reducedMotion}
                    onChange={setReducedMotion}
                    label={t('accessibility.reducedMotion')}
                  />
                </div>
              </div>

              {/* Audio Section */}
              <div className="space-y-3 pt-3 border-t border-gray-800">
                <h4 className="text-sm font-medium text-gold-300 flex items-center gap-2">
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                  Audio & Speech
                </h4>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{t('accessibility.captions')}</span>
                  <ToggleSwitch
                    enabled={settings.captionsEnabled}
                    onChange={setCaptionsEnabled}
                    label={t('accessibility.captions')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Text-to-Speech</span>
                  <ToggleSwitch
                    enabled={settings.textToSpeechEnabled}
                    onChange={setTextToSpeechEnabled}
                    label="Text-to-Speech"
                  />
                </div>
              </div>

              {/* Navigation Section */}
              <div className="space-y-3 pt-3 border-t border-gray-800">
                <h4 className="text-sm font-medium text-gold-300 flex items-center gap-2">
                  <Keyboard className="w-4 h-4" aria-hidden="true" />
                  Navigation
                </h4>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{t('accessibility.screenReader')}</span>
                  <ToggleSwitch
                    enabled={settings.screenReaderOptimized}
                    onChange={setScreenReaderOptimized}
                    label={t('accessibility.screenReader')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{t('accessibility.focusIndicators')}</span>
                  <ToggleSwitch
                    enabled={settings.enhancedFocusIndicators}
                    onChange={setEnhancedFocusIndicators}
                    label={t('accessibility.focusIndicators')}
                  />
                </div>

                {/* Line Spacing */}
                <div className="space-y-2">
                  <span className="text-sm text-gray-300">Line Spacing: {settings.lineSpacing.toFixed(1)}x</span>
                  <input
                    type="range"
                    min="1.0"
                    max="2.0"
                    step="0.1"
                    value={settings.lineSpacing}
                    onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none bg-gray-700 accent-gold-500"
                    aria-label="Line spacing"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gold-600/20">
              <button
                onClick={resetToDefaults}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                Reset to Defaults
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}






