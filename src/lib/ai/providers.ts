import { google } from '@ai-sdk/google'

// ─── AI PROVIDER ABSTRACTION ───────────────────────────────────────────────────
// Centralizes all AI model configuration. Swap providers here without touching agents.

export type ModelTier = 'fast' | 'balanced' | 'powerful'

/**
 * Get the appropriate Gemini model based on task complexity tier.
 */
export function getModel(tier: ModelTier = 'balanced') {
  switch (tier) {
    case 'fast':
      return google('gemini-3.6-flash')
    case 'powerful':
      return google('gemini-3.6-flash')
    case 'balanced':
    default:
      return google('gemini-3.6-flash')
  }
}

// Export the default model for convenience
export const defaultModel = getModel('balanced')
export const fastModel = getModel('fast')
export const powerfulModel = getModel('powerful')
