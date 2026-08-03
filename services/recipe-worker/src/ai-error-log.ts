import type { Firestore } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

/**
 * firebase-admin equivalent of apps/recipes/src/lib/services/ai-error-log.ts (Cloudflare's REST
 * client version) — same `error_logs` collection, same document shape, so the admin dashboard's
 * `GET /api/admin/error-logs` reads worker-side failures exactly like Cloudflare-side ones. The
 * worker never called the Cloudflare version at all (it can't — that module reads
 * `FIREBASE_SERVICE_ACCOUNT` via Cloudflare's request-context, which doesn't exist here), so every
 * failure the worker hit (including the AbortErrors that motivated the retry policy in
 * ai-retry.ts) was previously visible only in journald, never in the queryable log.
 */

export type AiFeature = "photo-import" | "enhancement" | "grocery";

/**
 * Records an AI-pipeline failure. Fire-and-forget and guaranteed never to throw — an observability
 * write must never break or delay the job-failure path it's observing.
 */
export function createAiErrorLogger(db: Firestore) {
  return function logAiError(
    feature: AiFeature,
    error: unknown,
    extra: { userId?: string; context?: Record<string, string> } = {},
  ): void {
    try {
      const id = randomUUID();
      const entry = {
        id,
        feature,
        message: error instanceof Error ? error.message : String(error),
        ...(extra.context ? { context: extra.context } : {}),
        ...(extra.userId ? { userId: extra.userId } : {}),
        createdAt: new Date().toISOString(),
      };

      db.collection("error_logs")
        .doc(id)
        .set(entry)
        .catch((writeError) => {
          console.error(
            "[AiErrorLog] Failed to persist error log:",
            writeError,
          );
        });
    } catch (unexpected) {
      console.error(
        "[AiErrorLog] Failed to build error log entry:",
        unexpected,
      );
    }
  };
}

export type LogAiError = ReturnType<typeof createAiErrorLogger>;
