const SIMPLE_GREETING_PATTERN = /^(?:hi|hello|hey|hiya|howdy|good\s+(?:morning|afternoon|evening))(?:\s+there)?[!.?]*$/i

export function isSimpleGreeting (message: string): boolean {
  return SIMPLE_GREETING_PATTERN.test(message.trim())
}