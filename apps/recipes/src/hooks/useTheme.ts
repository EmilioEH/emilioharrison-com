import { useStore } from '@nanostores/react'
import { themeId } from '../lib/store'
import { THEMES, type Theme } from '../lib/themes'

export const useTheme = (): Theme => {
  const currentThemeId = useStore(themeId)
  return THEMES[currentThemeId] || THEMES.default
}
