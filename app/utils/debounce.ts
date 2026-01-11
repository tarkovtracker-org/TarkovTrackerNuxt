/**
 * Debounce Utility
 *
 * Creates debounced versions of functions that delay execution until after
 * a specified wait time has elapsed since the last call.
 */
/**
 * Creates a debounced version of a function that delays execution until after
 * `wait` milliseconds have elapsed since the last call.
 *
 * Returns a Promise that resolves with the function's result when it eventually executes.
 * Only the last call's promise will resolve with the actual result; earlier calls are
 * rejected with a "superseded" error.
 *
 * @param func - The function to debounce
 * @param wait - Milliseconds to wait before executing
 * @returns Debounced function with cancel method
 *
 * @remarks
 * `debounced.cancel()` only clears the pending timeout and rejects the pending promise via
 * `pendingReject`. It does not stop an async `func` that has already started executing.
 * If you need true abort behavior for in-flight work, pass an `AbortController` signal into
 * `func` and cancel it there instead.
 *
 * @example
 * ```ts
 * const debouncedSearch = debounce(searchApi, 300);
 * await debouncedSearch('query'); // Only executes after 300ms of inactivity
 * debouncedSearch.cancel(); // Cancel pending execution
 * ```
 */
export function debounce<Args extends unknown[], R>(
  func: (...args: Args) => R | Promise<R>,
  wait: number
): ((...args: Args) => Promise<R>) & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pendingResolve: ((value: R) => void) | null = null;
  let pendingReject: ((reason?: unknown) => void) | null = null;
  const debounced = (...args: Args): Promise<R> => {
    // Clear any existing timeout
    if (timeout) {
      clearTimeout(timeout);
    }
    // Return a new promise for this call
    return new Promise<R>((resolve, reject) => {
      if (pendingReject) {
        pendingReject(new Error('Debounced: superseded'));
      }
      // Store the resolve/reject for the latest call
      pendingResolve = resolve;
      pendingReject = reject;
      timeout = setTimeout(async () => {
        // Capture handlers for this invocation before awaiting func.
        // This prevents a race condition where a new call reassigns the shared
        // pendingResolve/pendingReject while func is still running, which would
        // cause this invocation to resolve/reject the wrong promise.
        const localResolve = pendingResolve;
        const localReject = pendingReject;
        // Clear shared state immediately since we've captured what we need.
        // This ensures new calls won't try to reject an already-executing invocation.
        timeout = null;
        pendingResolve = null;
        pendingReject = null;
        try {
          const result = await func(...args);
          if (localResolve) {
            localResolve(result);
          }
        } catch (error) {
          if (localReject) {
            localReject(error);
          }
        }
      }, wait);
    });
  };
  /**
   * Cancels any pending execution.
   *
   * Note: This only clears the scheduled timeout and rejects the pending promise.
   * It does not abort an async `func` that has already started; use an AbortController
   * pattern inside `func` if you need cancellable work.
   */
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    // Reject pending promise on cancel
    if (pendingReject) {
      pendingReject(new Error('Debounced function was cancelled'));
    }
    pendingResolve = null;
    pendingReject = null;
  };
  return debounced;
}
export function isDebounceRejection(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === 'Debounced: superseded' ||
      error.message === 'Debounced function was cancelled')
  );
}
