import { atom } from 'nanostores'

export const isFeedbackModalOpen = atom(false)

export const openFeedbackModal = () => isFeedbackModalOpen.set(true)
export const closeFeedbackModal = () => isFeedbackModalOpen.set(false)
