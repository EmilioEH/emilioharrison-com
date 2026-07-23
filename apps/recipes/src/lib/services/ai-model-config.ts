/**
 * Single source of truth for the Gemini text model used across the AI pipeline (ai-parser.ts's
 * AI Refresh/Enhancement, grocery-core.ts's list generation). Previously duplicated as a literal
 * string in both files with a "keep these in sync" comment — that drifted silently and turned the
 * `gemini-2.5-flash` retirement into an hours-long incident instead of a one-line fix. Change the
 * model here; both callers pick it up automatically.
 */
export const GEMINI_TEXT_MODEL = 'gemini-3.1-flash-lite'
