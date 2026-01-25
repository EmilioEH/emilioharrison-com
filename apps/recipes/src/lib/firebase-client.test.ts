import { describe, it, expect, vi } from 'vitest'

// Mock firebase modules BEFORE importing the client
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => 'mock-app'),
}))

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => 'mock-auth'),
  GoogleAuthProvider: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => 'mock-db'),
}))

describe('firebase-client', () => {
  it('initializes firebase app and auth', async () => {
    // Import the module - this triggers the top-level code
    await import('./firebase-client')

    // Check mocks
    const appModule = await import('firebase/app')
    const authModule = (await import('firebase/auth')) as unknown as {
      getAuth: typeof import('firebase/auth').getAuth
      GoogleAuthProvider: typeof import('firebase/auth').GoogleAuthProvider
    }

    expect(appModule.initializeApp).toHaveBeenCalled()
    expect(authModule.getAuth).toHaveBeenCalledWith('mock-app')
    expect(authModule.GoogleAuthProvider).toHaveBeenCalled()
  })
})
