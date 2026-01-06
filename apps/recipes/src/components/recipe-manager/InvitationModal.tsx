import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogHeader,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Stack, Inline } from '../ui/layout'
import type { PendingInvite } from '../../lib/types'

interface InvitationModalProps {
  invite: PendingInvite
  onAccept: (invite: PendingInvite) => void
  onDecline: (invite: PendingInvite) => void
}

export function InvitationModal({ invite, onAccept, onDecline }: InvitationModalProps) {
  const [loading, setLoading] = useState(false)

  const handleAction = async (action: 'accept' | 'decline') => {
    setLoading(true)
    try {
      if (action === 'accept') {
        await onAccept(invite)
      } else {
        await onDecline(invite)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Family Invitation</DialogTitle>
          <DialogDescription>You have been invited to join a family workspace.</DialogDescription>
        </DialogHeader>

        <Stack spacing="md" className="py-4">
          <div className="rounded-lg bg-secondary/10 p-4 text-center">
            <div className="text-sm text-muted-foreground">You are invited to join</div>
            <div className="text-xl font-bold text-primary">{invite.familyName}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Invited by {invite.invitedByName}
            </div>
          </div>

          <p className="px-2 text-sm text-muted-foreground">
            Joining this family will let you share recipes, meal plans, and ratings with{' '}
            {invite.invitedByName} and other members.
          </p>
        </Stack>

        <DialogFooter>
          <Inline spacing="sm" justify="end" className="w-full">
            <Button
              variant="outline"
              onClick={() => handleAction('decline')}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              Decline
            </Button>
            <Button
              onClick={() => handleAction('accept')}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              {loading ? 'Joining...' : 'Accept Invitation'}
            </Button>
          </Inline>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
