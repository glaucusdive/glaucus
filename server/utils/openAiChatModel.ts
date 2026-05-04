/**
 * OpenAI Chat Completions (GPT-5.5) for NLU, search drafting, narration, and booking assistant.
 * Request bodies: use `max_completion_tokens` (not `max_tokens`). Omit `temperature` — only the default (1) is supported for this model.
 * @see https://platform.openai.com/docs/models
 */
export const OPENAI_CHAT_MODEL = 'gpt-5.5'

export const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions'
