/**
 * Pure display/durable-boundary sanitization. Any free-form string that can
 * reach a session event or a model-facing report (session identity, working
 * directory, labels) passes through these functions first, so control
 * characters never enter the log and no string exceeds its budget. These are
 * pure functions of their inputs.
 * @module dsh-fast/sanitize
 */

/** C0 control characters plus DEL, replaced before any output. */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/gu

/** Ellipsis appended when a string is truncated. */
const ELLIPSIS = '…'

/** Remove control characters from a string. */
export function stripControl(value: string): string {
  return value.replace(CONTROL_CHARS, '')
}

/**
 * Truncate a string to `maxChars`, appending an ellipsis when it is cut.
 * @param value - the string to bound.
 * @param maxChars - non-negative budget; 0 yields the empty string.
 * @returns the bounded string.
 */
export function truncate(value: string, maxChars: number): string {
  if (!Number.isSafeInteger(maxChars) || maxChars < 0) {
    throw new TypeError(`maxChars must be a non-negative safe integer, got ${String(maxChars)}`)
  }
  if (value.length <= maxChars) return value
  if (maxChars === 0) return ''
  return value.slice(0, maxChars) + ELLIPSIS
}

/**
 * Sanitize a free-form label: strip control characters, then bound length.
 * @param value - the label (e.g. a session id).
 * @param maxChars - non-negative budget.
 * @returns the sanitized label.
 */
export function sanitizeText(value: string, maxChars: number): string {
  return truncate(stripControl(value), maxChars)
}

/**
 * Sanitize a path or filename, preserving its tail (basename) when truncating
 * so the most diagnostic part survives. Control characters are stripped first.
 * @param value - the path or filename.
 * @param maxChars - non-negative budget.
 * @returns the sanitized path.
 */
export function sanitizePath(value: string, maxChars: number): string {
  const clean = stripControl(value)
  if (clean.length <= maxChars) return clean
  if (maxChars <= 1) return ELLIPSIS
  const head = Math.ceil(maxChars / 2)
  const tail = Math.floor(maxChars / 2)
  return clean.slice(0, head) + ELLIPSIS + clean.slice(-tail)
}
