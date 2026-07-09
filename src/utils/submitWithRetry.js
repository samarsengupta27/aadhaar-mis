// src/utils/submitWithRetry.js
//
// Wraps a direct Firestore write (via src/utils/eodActions.js or
// src/utils/createOperator.js) with:
//   1. Automatic retry with exponential backoff for transient failures
//      (network drop, timeout, "unavailable") — NOT for real errors like
//      validation failures or permission-denied, which retrying won't fix.
//   2. An offline queue: if the browser is offline when called, the
//      submission waits for the 'online' event instead of failing outright.
//
// This is purely a client-side robustness layer. It does not change what
// gets written — submitEod is idempotent per {centreId}_{date} (it checks
// for an existing doc before writing), so a retried call that actually
// already succeeded on an earlier attempt fails safely with a clear
// "already exists" error rather than double-submitting.

const RETRYABLE_CODES = new Set([
  'unavailable',
  'deadline-exceeded',
  'internal',
  'resource-exhausted',
  'cancelled',
  'unknown',
  'aborted',
]);

function isRetryable(error) {
  if (!navigator.onLine) return true; // definitely a connectivity issue
  return RETRYABLE_CODES.has(error?.code);
}

function waitForOnline() {
  if (navigator.onLine) return Promise.resolve();
  return new Promise((resolve) => {
    const handler = () => {
      window.removeEventListener('online', handler);
      resolve();
    };
    window.addEventListener('online', handler);
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls `fn` (a direct Firestore action, e.g. () => submitEod(payload))
 * with retry + offline-wait behaviour.
 *
 * @param {() => Promise<any>} fn - the call to attempt
 * @param {object} [options]
 * @param {number} [options.maxAttempts=4]
 * @param {(status: RetryStatus) => void} [options.onStatusChange] - called
 *   on every state transition so the UI can show "Retrying… (2/4)" etc.
 *
 * RetryStatus = { phase: 'waiting_for_network' | 'retrying' | 'failed', attempt, maxAttempts }
 */
export async function submitWithRetry(fn, options = {}) {
  const { maxAttempts = 4, onStatusChange = () => {} } = options;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    attempt += 1;

    if (!navigator.onLine) {
      onStatusChange({ phase: 'waiting_for_network', attempt, maxAttempts });
      await waitForOnline();
    }

    try {
      return await fn();
    } catch (err) {
      const retryable = isRetryable(err);
      const attemptsLeft = attempt < maxAttempts;

      if (retryable && attemptsLeft) {
        onStatusChange({ phase: 'retrying', attempt, maxAttempts });
        // Exponential backoff: 1s, 2s, 4s, 8s...
        await delay(1000 * 2 ** (attempt - 1));
        continue;
      }

      // Either a non-retryable error (validation, permission-denied,
      // already-exists) or we've exhausted attempts — surface it.
      onStatusChange({ phase: 'failed', attempt, maxAttempts });
      throw err;
    }
  }
}
