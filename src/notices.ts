/**
 * One-time visible notices for degradation paths. A subsystem fallback that a
 * report depends on (a missing token meter, a missing system-prompt service, a
 * failing metric outlet) must be announced — but only once, because these
 * paths are evaluated on every sample.
 * @module dsh-fast/notices
 */

/** A notifier that emits one message per distinct key for the process lifetime. */
export type OnceNotifier = (key: string, message: string) => void

/**
 * Build a {@link OnceNotifier} that forwards the first message per key to the
 * sink and swallows every later one.
 * @param sink - where the first message per key goes (typically `logger.warn`).
 * @returns the notifier.
 */
export function createOnceNotifier(sink: (message: string) => void): OnceNotifier {
  const seen = new Set<string>()
  return (key, message) => {
    if (seen.has(key)) return
    seen.add(key)
    sink(message)
  }
}
