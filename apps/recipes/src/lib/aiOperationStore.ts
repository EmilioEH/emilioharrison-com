import { atom } from 'nanostores'

export type AiOperationStatus = 'idle' | 'fallback' | 'processing' | 'complete' | 'error'

export interface AiOperation {
  id: string
  feature: 'parse-recipe' | 'grocery-list' | 'recipe-enhancement' | 'cost-estimate'
  status: AiOperationStatus
  progress: number
  cancelable: boolean
  error?: string
  message?: string
}

interface AiOperationState {
  operations: AiOperation[]
}

export const aiOperationStore = atom<AiOperationState>({
  operations: [],
})

/** Add or update an AI operation */
export function startAiOperation(operation: Omit<AiOperation, 'status' | 'progress'>) {
  const current = aiOperationStore.get()
  const newOp: AiOperation = {
    ...operation,
    status: 'processing',
    progress: 0,
  }

  // Remove existing operation with same ID
  const filtered = current.operations.filter((op) => op.id !== operation.id)

  aiOperationStore.set({
    operations: [...filtered, newOp],
  })
}

/** Update an existing operation's progress */
export function updateAiOperation(id: string, updates: Partial<AiOperation>) {
  const current = aiOperationStore.get()
  const operations = current.operations.map((op) => (op.id === id ? { ...op, ...updates } : op))
  aiOperationStore.set({ operations })
}

/** Remove a completed or cancelled operation */
export function removeAiOperation(id: string) {
  const current = aiOperationStore.get()
  aiOperationStore.set({
    operations: current.operations.filter((op) => op.id !== id),
  })
}

/** Cancel all active operations */
export function cancelAllOperations() {
  const current = aiOperationStore.get()
  aiOperationStore.set({
    operations: current.operations.filter((op) => !op.cancelable),
  })
}

/** Get active operations count */
export function getActiveOperationsCount(): number {
  return aiOperationStore.get().operations.filter((op) => op.status === 'processing').length
}
