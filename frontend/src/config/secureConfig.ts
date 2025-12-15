/**
 * Secure Configuration
 * 
 * All sensitive data is loaded from environment variables.
 * In production, these are set during build time or via backend API.
 * 
 * NEVER commit actual API keys or secrets to version control.
 */

// ============================================================================
// Environment Variables (set in .env file or CI/CD)
// ============================================================================

// API Keys - loaded from environment variables with fallbacks
// Note: In production, these should be proxied through backend canister for security
export const API_KEYS = {
  // Eleven Labs - for voice synthesis
  ELEVEN_LABS: import.meta.env.VITE_ELEVEN_LABS_API_KEY || 'REMOVED_API_KEY',
  ELEVEN_LABS_VOICE_ID: import.meta.env.VITE_ELEVEN_LABS_VOICE_ID || 'kPzsL2i3teMYv0FxEYQ6',
  
  // Hugging Face - for AI Council
  HUGGING_FACE: import.meta.env.VITE_HUGGING_FACE_API_KEY || 'REMOVED_API_KEY
  
  // Perplexity - for real-time search AI
  PERPLEXITY: import.meta.env.VITE_PERPLEXITY_API_KEY || 'REMOVED_API_KEY
};

// Check if keys are configured (for development warnings)
export const isConfigured = {
  elevenLabs: !!API_KEYS.ELEVEN_LABS && API_KEYS.ELEVEN_LABS.length > 10,
  huggingFace: !!API_KEYS.HUGGING_FACE && API_KEYS.HUGGING_FACE.startsWith('hf_'),
  perplexity: !!API_KEYS.PERPLEXITY && API_KEYS.PERPLEXITY.startsWith('pplx-'),
};

// ============================================================================
// Backend Proxy Configuration
// ============================================================================

// For production, API calls should be proxied through the backend canister
// to avoid exposing API keys in the browser
export const USE_BACKEND_PROXY = import.meta.env.PROD;

export const BACKEND_ENDPOINTS = {
  aiChat: '/api/ai/chat',
  voiceSynthesize: '/api/voice/synthesize',
  aiCouncil: '/api/ai/council',
};

// ============================================================================
// Admin Configuration
// ============================================================================

// Admin verification should be done server-side via canister calls
// Never expose full principal IDs in frontend code
export const ADMIN_CONFIG = {
  // Check admin status via backend canister call
  checkEndpoint: 'is_admin',
  // Minimum principal ID prefix to show (for UI display only)
  displayPrefixLength: 8,
};

// ============================================================================
// Feature Flags
// ============================================================================

export const FEATURES = {
  voiceEnabled: isConfigured.elevenLabs,
  aiCouncilEnabled: isConfigured.huggingFace || isConfigured.perplexity,
  debugMode: import.meta.env.DEV,
};

// ============================================================================
// Security Utilities
// ============================================================================

/**
 * Mask sensitive data for display
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars * 2) {
    return '****';
  }
  const start = data.slice(0, visibleChars);
  const end = data.slice(-visibleChars);
  return `${start}...${end}`;
}

/**
 * Mask principal ID for display
 */
export function maskPrincipal(principal: string): string {
  if (!principal || principal.length < 10) {
    return 'Unknown';
  }
  return `${principal.slice(0, 8)}...${principal.slice(-5)}`;
}

/**
 * Check if running in secure context
 */
export function isSecureContext(): boolean {
  return window.isSecureContext && location.protocol === 'https:';
}

/**
 * Warn about insecure configuration (development only)
 */
export function checkSecurityWarnings(): void {
  if (import.meta.env.DEV) {
    if (!isConfigured.elevenLabs) {
      console.warn('⚠️ Eleven Labs API key not configured. Voice features disabled.');
    }
    if (!isConfigured.huggingFace && !isConfigured.perplexity) {
      console.warn('⚠️ No AI API keys configured. AI Council features disabled.');
    }
  }
}

// Run security checks on import
checkSecurityWarnings();

export default {
  API_KEYS,
  isConfigured,
  USE_BACKEND_PROXY,
  BACKEND_ENDPOINTS,
  ADMIN_CONFIG,
  FEATURES,
  maskSensitiveData,
  maskPrincipal,
  isSecureContext,
};

