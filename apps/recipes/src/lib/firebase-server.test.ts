import { describe, it, expect } from 'vitest'
import { FirebaseRestService } from './firebase-rest'
import { db } from './firebase-server'

describe('firebase-server db proxy', () => {
  it('exposes every public FirebaseRestService method through the proxy allowlist', () => {
    // `db` is a Proxy wrapping a lazily-constructed FirebaseRestService, gated by a hardcoded
    // allowlist of method names in firebase-server.ts. Any real method not in that list silently
    // resolves to `undefined` instead of the real implementation — calling it then throws
    // "db.<method> is not a function" (exactly what happened in production when `runQuery` was
    // added to FirebaseRestService but never added to the allowlist; unit tests didn't catch it
    // because they mock firebase-server entirely, bypassing this Proxy).
    //
    // This test reflects over the real class's prototype so a future method addition that
    // forgets to update the allowlist fails loudly here instead of in production.
    //
    // TypeScript's `private` is compile-time only — these methods still show up via reflection
    // at runtime, but they're internal helpers that were never meant to be reachable through the
    // proxy in the first place, so they're excluded here rather than added to the allowlist.
    const privateMethodNames = new Set([
      'getAccessToken',
      'fetchCollectionPage',
      'mapFirestoreDoc',
      'fromFirestoreFields',
      'fromFirestoreValue',
      'toFirestoreFields',
      'toFirestoreNumber',
      'toFirestoreValue',
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prototype = FirebaseRestService.prototype as any
    const instanceMethodNames = Object.getOwnPropertyNames(prototype).filter(
      (name) =>
        name !== 'constructor' &&
        typeof prototype[name] === 'function' &&
        !privateMethodNames.has(name),
    )

    // Sanity check: make sure reflection actually found methods, so this test can't silently
    // pass by iterating over an empty list if the prototype shape ever changes unexpectedly.
    expect(instanceMethodNames.length).toBeGreaterThan(5)

    for (const method of instanceMethodNames) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(typeof (db as any)[method], `db.${method} should be forwarded by the proxy`).toBe(
        'function',
      )
    }
  })
})
