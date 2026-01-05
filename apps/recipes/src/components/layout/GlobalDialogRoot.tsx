import React from 'react'
import { useStore } from '@nanostores/react'
import { $dialog, closeDialog } from '@/lib/dialogStore'
import { ResponsiveModal } from '@/components/ui/ResponsiveModal'
import { Button } from '@/components/ui/button'
import { AlertCircle, HelpCircle } from 'lucide-react'

export default function GlobalDialogRoot() {
  const dialog = useStore($dialog)

  if (!dialog) return null

  const { title, message, confirmText, cancelText, type } = dialog

  const footer = (
    <div className="flex w-full justify-end gap-3">
      {type === 'confirm' && (
        <Button
          variant="outline"
          onClick={() => closeDialog(false)}
          className="flex-1 sm:flex-none"
        >
          {cancelText || 'Cancel'}
        </Button>
      )}
      <Button
        onClick={() => closeDialog(true)}
        className="flex-1 bg-primary text-white hover:bg-primary/90 sm:flex-none"
      >
        {confirmText || 'OK'}
      </Button>
    </div>
  )

  return (
    <ResponsiveModal
      isOpen={!!dialog}
      onClose={() => closeDialog(false)}
      title={title}
      footer={footer}
    >
      <div className="flex items-start gap-4 py-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          {type === 'alert' ? (
            <AlertCircle className="h-6 w-6 text-primary" />
          ) : (
            <HelpCircle className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="flex-1 pt-1">
          <p className="leading-relaxed text-foreground">{message}</p>
        </div>
      </div>
    </ResponsiveModal>
  )
}
