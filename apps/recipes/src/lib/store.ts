import { atom } from 'nanostores'

export const themeId = atom<string>('default')

// Initialize from localStorage if available
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('theme')
  if (saved) {
    themeId.set(saved)
  }

  themeId.subscribe((value) => {
    localStorage.setItem('theme', value)
  })
}
