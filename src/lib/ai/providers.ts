import { google, createGoogleGenerativeAI } from '@ai-sdk/google'

// ─── AI PROVIDER ABSTRACTION ───────────────────────────────────────────────────
// Configured with Google Gemini Flash & Pro tiers, supporting runtime local API keys

export type ModelTier = 'fast' | 'balanced' | 'powerful'

/**
 * Returns the Google AI provider using the current runtime key if set
 */
export function getGoogleProvider(apiKey?: string) {
  const key = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY
  if (key) {
    return createGoogleGenerativeAI({ apiKey: key })
  }
  return google
}

/**
 * Get the appropriate Gemini model based on task complexity tier.
 * - 'fast' / 'balanced': Ultra-fast Gemini Flash (gemini-3.6-flash)
 * - 'powerful': High-reasoning Gemini Pro (gemini-3.1-pro-preview / gemini-3.6-flash)
 */
export function getModel(tier: ModelTier = 'fast', customApiKey?: string) {
  const provider = getGoogleProvider(customApiKey)

  switch (tier) {
    case 'powerful':
      return provider('gemini-3.1-pro-preview')
    case 'fast':
    case 'balanced':
    default:
      return provider('gemini-3.6-flash')
  }
}

// Export default models for convenience
export const defaultModel = getModel('fast')
export const fastModel = getModel('fast')
export const powerfulModel = getModel('powerful')
