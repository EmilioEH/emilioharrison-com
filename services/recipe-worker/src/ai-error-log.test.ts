import { describe, it, expect, vi } from "vitest";
import type { Firestore } from "firebase-admin/firestore";
import { createAiErrorLogger } from "./ai-error-log";

function fakeFirestore(set: ReturnType<typeof vi.fn>) {
  return {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({ set })),
    })),
  } as unknown as Firestore;
}

describe("createAiErrorLogger", () => {
  it("writes an error_logs doc with feature, message, context, and a timestamp", async () => {
    const set = vi.fn().mockResolvedValue(undefined);
    const db = fakeFirestore(set);
    const logAiError = createAiErrorLogger(db);

    logAiError("enhancement", new Error("Gemini timed out"), {
      context: { recipeId: "r1" },
    });
    await Promise.resolve();

    expect(db.collection).toHaveBeenCalledWith("error_logs");
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: "enhancement",
        message: "Gemini timed out",
        context: { recipeId: "r1" },
        createdAt: expect.any(String),
      }),
    );
  });

  it("handles non-Error throwables", async () => {
    const set = vi.fn().mockResolvedValue(undefined);
    const db = fakeFirestore(set);
    const logAiError = createAiErrorLogger(db);

    logAiError("grocery", "plain string failure", { context: { listId: "x" } });
    await Promise.resolve();

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ message: "plain string failure" }),
    );
  });

  it("never throws even if the Firestore write itself fails synchronously", () => {
    const db = {
      collection: vi.fn(() => {
        throw new Error("boom");
      }),
    } as unknown as Firestore;
    const logAiError = createAiErrorLogger(db);

    expect(() => logAiError("enhancement", new Error("x"))).not.toThrow();
  });

  it("never throws when the write rejects asynchronously", async () => {
    const set = vi.fn().mockRejectedValue(new Error("firestore unavailable"));
    const db = fakeFirestore(set);
    const logAiError = createAiErrorLogger(db);

    expect(() => logAiError("grocery", new Error("x"))).not.toThrow();
    await Promise.resolve();
  });
});
