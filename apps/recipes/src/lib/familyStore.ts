import { atom, map } from 'nanostores'
import type { Family, User, FamilyRecipeData, PendingInvite } from './types'

// Current family workspace
export const $currentFamily = atom<Family | null>(null)

// Family members
export const $familyMembers = atom<User[]>([])

// Current user ID (for permission checks)
export const $currentUserId = atom<string | null>(null)

// Pending incoming invites (for badge count)
export const $pendingInvites = atom<PendingInvite[]>([])

// Loading states
export const $familyLoading = atom<boolean>(true)
export const $familyInitialized = atom<boolean>(false)

// Family-specific recipe data cache (recipeId -> FamilyRecipeData)
export const $recipeFamilyData = map<Record<string, FamilyRecipeData>>({})

export const familyActions = {
  setFamily: (family: Family | null) => {
    $currentFamily.set(family)
    $familyLoading.set(false)
    $familyInitialized.set(true)
  },

  setMembers: (members: User[]) => {
    $familyMembers.set(members)
  },

  setCurrentUserId: (userId: string | null) => {
    $currentUserId.set(userId)
  },

  setPendingInvites: (invites: PendingInvite[]) => {
    $pendingInvites.set(invites)
  },

  setRecipeFamilyData: (recipeId: string, data: FamilyRecipeData) => {
    const current = $recipeFamilyData.get()
    $recipeFamilyData.set({
      ...current,
      [recipeId]: data,
    })
  },

  clearRecipeFamilyData: (recipeId: string) => {
    const current = $recipeFamilyData.get()
    const updated = { ...current }
    delete updated[recipeId]
    $recipeFamilyData.set(updated)
  },

  reset: () => {
    $currentFamily.set(null)
    $familyMembers.set([])
    $currentUserId.set(null)
    $pendingInvites.set([])
    $recipeFamilyData.set({})
    $familyLoading.set(true)
    $familyInitialized.set(false)
  },
}
