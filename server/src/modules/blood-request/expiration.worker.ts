/**
 * Expiration worker — periodically transitions overdue blood requests to 'expired'.
 *
 * Design choices:
 * - Pure setInterval — no extra infrastructure (no Redis, no message queue).
 * - Runs inside the same Node process; starts after the DB is connected.
 * - Uses a single atomic MongoDB updateMany so concurrent web workers
 *   (if the app is scaled) can only run the transition once per document.
 * - Only transitions requests that are still active (searching / partiallyFulfilled).
 * - Runs every INTERVAL_MS (default 60 s). Missed ticks on restart catch up
 *   on the first run because the filter is purely time-based.
 *
 * Concurrency safety:
 * - updateMany with filter { status: $in: active, expiresAt: { $lte: now } }
 *   is document-level atomic in MongoDB — safe across multiple app replicas.
 */

import BloodRequest from "./blood-request.model";

const ACTIVE_STATUSES = ["searching", "partiallyFulfilled"] as const;

/**
 * Run one expiration sweep.
 * Returns the count of requests transitioned to 'expired'.
 */
export const runExpirationSweep = async (): Promise<number> => {
  const now = new Date();

  const result = await BloodRequest.updateMany(
    {
      status:    { $in: ACTIVE_STATUSES },
      expiresAt: { $lte: now },
    },
    {
      $set: { status: "expired" },
    },
  );

  const count = result.modifiedCount;
  if (count > 0) {
    console.log(`[ExpirationWorker] Expired ${count} blood request(s) at ${now.toISOString()}`);
  }
  return count;
};

/**
 * Starts the periodic expiration sweep.
 *
 * @param intervalMs - How often to run (default: 60 000 ms = 1 minute).
 * @returns A function that clears the interval (useful for tests / shutdown).
 */
export const startExpirationWorker = (intervalMs = 60_000): (() => void) => {
  // Run immediately on start to catch any requests that expired while server was down
  runExpirationSweep().catch((err) =>
    console.error("[ExpirationWorker] Initial sweep error:", err),
  );

  const timer = setInterval(() => {
    runExpirationSweep().catch((err) =>
      console.error("[ExpirationWorker] Sweep error:", err),
    );
  }, intervalMs);

  // Allow Node to exit even if interval is still active
  timer.unref();

  return () => clearInterval(timer);
};
