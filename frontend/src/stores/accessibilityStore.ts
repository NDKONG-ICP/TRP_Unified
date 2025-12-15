/**
 * Accessibility Store - Manages accessibility settings for the entire ecosystem
 * Supports screen readers, high contrast, large text, reduced motion, and more
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AccessibilitySettings {
  // Visual settings
  highContrast: boolean;
  largeText: boolean;
  textScale: number; // 1.0 = 100%, 1.5 = 150%, etc.
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  dyslexiaFont: boolean;
  
  // Motion settings
  reducedMotion: boolean;
  
  // Screen reader settings
  screenReaderOptimized: boolean;
  announcePageChanges: boolean;
  
  // Audio/Visual aids
  captionsEnabled: boolean;
  voiceControlEnabled: boolean;
  
  // Navigation
  keyboardNavigation: boolean;
  enhancedFocusIndicators: boolean;
  skipLinks: boolean;
  
  // Reading aids
  lineSpacing: number; // 1.0 = normal, 1.5 = 150%, 2.0 = double
  letterSpacing: number; // 0 = normal, 1 = slight, 2 = moderate
  wordSpacing: number; // 0 = normal, 1 = slight, 2 = moderate
  
  // Text-to-speech
  textToSpeechEnabled: boolean;
  speechRate: number; // 0.5 to 2.0
  speechPitch: number; // 0.5 to 2.0
}

interface AccessibilityStore {
  settings: AccessibilitySettings;
  setHighContrast: (enabled: boolean) => void;
  setLargeText: (enabled: boolean) => void;
  setTextScale: (scale: number) => void;
  setColorBlindMode: (mode: AccessibilitySettings['colorBlindMode']) => void;
  setDyslexiaFont: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setScreenReaderOptimized: (enabled: boolean) => void;
  setCaptionsEnabled: (enabled: boolean) => void;
  setVoiceControlEnabled: (enabled: boolean) => void;
  setKeyboardNavigation: (enabled: boolean) => void;
  setEnhancedFocusIndicators: (enabled: boolean) => void;
  setLineSpacing: (spacing: number) => void;
  setLetterSpacing: (spacing: number) => void;
  setWordSpacing: (spacing: number) => void;
  setTextToSpeechEnabled: (enabled: boolean) => void;
  setSpeechRate: (rate: number) => void;
  setSpeechPitch: (pitch: number) => void;
  resetToDefaults: () => void;
  applySettings: () => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  speakText: (text: string) => void;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  largeText: false,
  textScale: 1.0,
  colorBlindMode: 'none',
  dyslexiaFont: false,
  reducedMotion: false,
  screenReaderOptimized: false,
  announcePageChanges: true,
  captionsEnabled: false,
  voiceControlEnabled: false,
  keyboardNavigation: true,
  enhancedFocusIndicators: false,
  skipLinks: true,
  lineSpacing: 1.0,
  letterSpacing: 0,
  wordSpacing: 0,
  textToSpeechEnabled: false,
  speechRate: 1.0,
  speechPitch: 1.0,
};

// Create a live region for screen reader announcements
const createLiveRegion = () => {
  if (typeof document === 'undefined') return null;
  
  let liveRegion = document.getElementById('a11y-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'a11y-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(liveRegion);
  }
  return liveRegion;
};

export const useAccessibilityStore = create<AccessibilityStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      
      setHighContrast: (enabled) => {
        set((state) => ({
          settings: { ...state.settings, highContrast: enabled }
        }));
        get().applySettings();
      },
      
      setLargeText: (enabled) => {
        set((state) => ({
          settings: { ...state.settings, largeText: enabled }
        }));
        get().applySettings();
      },
      
      setTextScale: (scale) => {
        set((state) => ({
          settings: { ...state.settings, textScale: Math.max(0.8, Math.min(2.0, scale)) }
        }));
        get().applySettings();
      },
      
      setColorBlindMode: (mode) => {
        set((state) => ({
          settings: { ...state.settings, colorBlindMode: mode }
        }));
        get().applySettings();
      },
      
      setDyslexiaFont: (enabled) => {
        set((state) => ({
          settings: { ...state.settings, dyslexiaFont: enabled }
        }));
        get().applySettings();
      },
      
      setReducedMotion: (enabled) => {
        set((state) => ({
          settings: { ...state.settings, reducedMotion: enabled }
        }));
        get().applySettings();
      },
      
      setScreenReaderOptimized: (enabled) => {
        set((state) => ({
          settings: { ...state.settings, screenReaderOptimized: enabled }
        }));
        get().applySettings();
      },
      
      setCaptionsEnabled: (enabled) => {
        set((state) => ({
          settings: { ...state.settings, captionsEnabled: enabled }
        }));
      },
      
      setVoiceControlEnabled: (enabled) => {
        set((state) => ({
          settings: { ...state.settings, voiceControlEnabled: enabled }
        }));
      },
      
      setKeyboardNavigation: (enabled) => {
        set((state) => ({
          settings: { ...state.settings, keyboardNavigation: enabled }
        }));
      },
      
      setEnhancedFocusIndicators: (enabled) => {
        set((state) => ({
          settings: { ...state.settings, enhancedFocusIndicators: enabled }
        }));
        get().applySettings();
      },
      
      setLineSpacing: (spacing) => {
        set((state) => ({
          settings: { ...state.settings, lineSpacing: spacing }
        }));
        get().applySettings();
      },
      
      setLetterSpacing: (spacing) => {
        set((state) => ({
          settings: { ...state.settings, letterSpacing: spacing }
        }));
        get().applySettings();
      },
      
      setWordSpacing: (spacing) => {
        set((state) => ({
          settings: { ...state.settings, wordSpacing: spacing }
        }));
        get().applySettings();
      },
      
      setTextToSpeechEnabled: (enabled) => {
        set((state) => ({
          settings: { ...state.settings, textToSpeechEnabled: enabled }
        }));
      },
      
      setSpeechRate: (rate) => {
        set((state) => ({
          settings: { ...state.settings, speechRate: Math.max(0.5, Math.min(2.0, rate)) }
        }));
      },
      
      setSpeechPitch: (pitch) => {
        set((state) => ({
          settings: { ...state.settings, speechPitch: Math.max(0.5, Math.min(2.0, pitch)) }
        }));
      },
      
      resetToDefaults: () => {
        set({ settings: defaultSettings });
        get().applySettings();
      },
      
      applySettings: () => {
        if (typeof document === 'undefined') return;
        
        const { settings } = get();
        const root = document.documentElement;
        
        // Apply high contrast
        root.classList.toggle('high-contrast', settings.highContrast);
        
        // Apply large text
        root.classList.toggle('large-text', settings.largeText);
        
        // Apply text scale
        root.style.setProperty('--text-scale', settings.textScale.toString());
        root.style.fontSize = `${settings.textScale * 100}%`;
        
        // Apply color blind mode
        root.setAttribute('data-color-blind-mode', settings.colorBlindMode);
        
        // Apply dyslexia font
        root.classList.toggle('dyslexia-font', settings.dyslexiaFont);
        
        // Apply reduced motion
        root.classList.toggle('reduce-motion', settings.reducedMotion);
        if (settings.reducedMotion) {
          root.style.setProperty('--animation-duration', '0.001ms');
          root.style.setProperty('--transition-duration', '0.001ms');
        } else {
          root.style.removeProperty('--animation-duration');
          root.style.removeProperty('--transition-duration');
        }
        
        // Apply enhanced focus indicators
        root.classList.toggle('enhanced-focus', settings.enhancedFocusIndicators);
        
        // Apply line spacing
        root.style.setProperty('--line-spacing', settings.lineSpacing.toString());
        
        // Apply letter spacing
        const letterSpacingValues = ['normal', '0.05em', '0.1em'];
        root.style.setProperty('--letter-spacing', letterSpacingValues[settings.letterSpacing] || 'normal');
        
        // Apply word spacing
        const wordSpacingValues = ['normal', '0.1em', '0.2em'];
        root.style.setProperty('--word-spacing', wordSpacingValues[settings.wordSpacing] || 'normal');
        
        // Screen reader optimization
        root.classList.toggle('sr-optimized', settings.screenReaderOptimized);
      },
      
      announceToScreenReader: (message, priority = 'polite') => {
        const liveRegion = createLiveRegion();
        if (liveRegion) {
          liveRegion.setAttribute('aria-live', priority);
          liveRegion.textContent = message;
          
          // Clear after announcement
          setTimeout(() => {
            liveRegion.textContent = '';
          }, 1000);
        }
      },
      
      speakText: (text) => {
        const { settings } = get();
        if (!settings.textToSpeechEnabled || typeof window === 'undefined') return;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = settings.speechRate;
        utterance.pitch = settings.speechPitch;
        
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        window.speechSynthesis.speak(utterance);
      },
    }),
    {
      name: 'raven-accessibility-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);

// Hook to initialize accessibility settings on app load
export const initializeAccessibility = () => {
  const store = useAccessibilityStore.getState();
  store.applySettings();
  
  // Check for system preferences
  if (typeof window !== 'undefined') {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion && !store.settings.reducedMotion) {
      store.setReducedMotion(true);
    }
    
    // Check for high contrast preference
    const prefersHighContrast = window.matchMedia('(prefers-contrast: more)').matches;
    if (prefersHighContrast && !store.settings.highContrast) {
      store.setHighContrast(true);
    }
  }
};

export default useAccessibilityStore;






