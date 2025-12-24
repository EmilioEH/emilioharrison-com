import { themeId } from './store'
import { THEMES } from './themes'

// Initialize theme subscription
export function initTheme() {
  const wrapper = document.getElementById('theme-wrapper')
  const bgLayer = document.createElement('div')
  bgLayer.className = 'fixed inset-0 pointer-events-none opacity-10 z-0'
  bgLayer.style.backgroundImage =
    'linear-gradient(#4db8ff 1px, transparent 1px), linear-gradient(90deg, #4db8ff 1px, transparent 1px)'
  bgLayer.style.backgroundSize = '40px 40px'

  // Subscribe to theme changes
  themeId.subscribe((id) => {
    const theme = THEMES[id]
    if (wrapper) {
      wrapper.className = `min-h-screen ${theme.colors.bg} ${theme.colors.text} ${theme.font} transition-colors duration-500 overflow-hidden relative`
    }
  })
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  initTheme()
}
