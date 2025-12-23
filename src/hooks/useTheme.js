import { useStore } from '@nanostores/react'
import { themeId } from '../lib/store'
import { THEMES } from '../lib/themes'

export const useTheme = () => {
  const currentThemeId = useStore(themeId)
  return THEMES[currentThemeId] || THEMES.default
}
