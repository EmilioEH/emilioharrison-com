import { atom } from 'nanostores'

export type DialogType = 'alert' | 'confirm'

export interface DialogOptions {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type: DialogType
  resolve: (value: boolean) => void
}

export const $dialog = atom<DialogOptions | null>(null)

/**
 * Shows a custom alert dialog
 * @param message - The message to display
 * @param title - Optional title for the dialog
 * @returns Promise that resolves when the user dismisses the alert
 */
export async function alert(message: string, title: string = 'Notice'): Promise<void> {
  return new Promise((resolve) => {
    $dialog.set({
      type: 'alert',
      message,
      title,
      confirmText: 'OK',
      resolve: () => resolve(),
    })
  })
}

/**
 * Shows a custom confirmation dialog
 * @param message - The message to display
 * @param title - Optional title for the dialog
 * @returns Promise that resolves to true if confirmed, false otherwise
 */
export async function confirm(message: string, title: string = 'Confirm'): Promise<boolean> {
  return new Promise((resolve) => {
    $dialog.set({
      type: 'confirm',
      message,
      title,
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      resolve,
    })
  })
}

export function closeDialog(result: boolean) {
  const current = $dialog.get()
  if (current) {
    current.resolve(result)
    $dialog.set(null)
  }
}
