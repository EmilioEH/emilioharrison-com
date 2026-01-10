export type InviteType = 'activation-code' | 'family-invite'

interface ShareInviteData {
  type: InviteType
  code?: string
  familyName?: string
  inviterName?: string
  invitedEmail?: string
  appUrl?: string
}

/**
 * Build the share message text based on the invite type
 */
export function buildInviteText(data: ShareInviteData): string {
  const appUrl = data.appUrl || window.location.origin + '/protected/recipes'

  if (data.type === 'activation-code' && data.code) {
    return `Join the Recipe App!

Use this activation code to create your account:
${data.code}

Sign in at: ${appUrl}`
  }

  if (data.type === 'family-invite' && data.familyName && data.inviterName && data.invitedEmail) {
    return `You're invited to join ${data.familyName}!

${data.inviterName} wants you to join their family recipe collection.

Sign in with your Gmail account (${data.invitedEmail}) at:
${appUrl}

You'll automatically be added to the family once you log in.`
  }

  return ''
}

/**
 * Share invite using Web Share API or clipboard fallback
 */
export async function shareInvite(
  data: ShareInviteData,
): Promise<{ success: boolean; method: 'share' | 'clipboard' }> {
  const text = buildInviteText(data)
  const title = data.type === 'activation-code' ? 'Join the Recipe App' : `Join ${data.familyName}`

  if (!text) {
    return { success: false, method: 'clipboard' }
  }

  // Try Web Share API first
  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text,
        url: data.appUrl, // Some apps use this field specifically
      })
      return { success: true, method: 'share' }
    } catch (err) {
      // User cancelled or share failed, try clipboard
      if ((err as Error).name === 'AbortError') {
        return { success: false, method: 'share' }
      }
    }
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(text)
    return { success: true, method: 'clipboard' }
  } catch {
    return { success: false, method: 'clipboard' }
  }
}
