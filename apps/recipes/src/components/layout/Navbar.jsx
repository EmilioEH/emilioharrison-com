import React, { useState } from 'react'
import { Menu, X, MessageSquarePlus } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { Label } from '../ui/Typography'
import { openFeedbackModal } from '../../lib/feedbackStore'

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const theme = useTheme()

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/fieldnotes', label: 'Notes' },
    { path: '/shop', label: 'Shop' },
    { path: '/contact', label: 'Contact' },
  ]

  // Simple check for active link since we don't have useLocation
  // In a real Astro app, we might pass the current path as a prop
  const isActive = (path) => {
    if (typeof window === 'undefined') return false
    if (path === '/' && window.location.pathname !== '/') return false
    return window.location.pathname.startsWith(path)
  }

  return (
    <header className={`sticky top-0 z-50 ${theme.colors.card} border-b-4 border-black`}>
      <div className="relative z-10 mx-auto flex h-20 max-w-6xl items-center justify-between px-4 md:px-8">
        <a
          href="/"
          className={`cursor-pointer font-display text-2xl font-black tracking-tighter hover:${theme.colors.highlight} no-underline transition-colors ${theme.colors.text}`}
        >
          EMILIO<span className={theme.colors.highlight}>.</span>HARRISON
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={`border-b-2 ${isActive(item.path) ? 'border-black text-black' : 'border-transparent opacity-60 hover:opacity-100'} no-underline transition-all ${theme.colors.text}`}
            >
              <Label variant="eyebrow" className="cursor-pointer">
                {item.label}
              </Label>
            </a>
          ))}
          <button
            onClick={openFeedbackModal}
            className={`opacity-60 transition-opacity hover:opacity-100 ${theme.colors.text}`}
            aria-label="Send Feedback"
            title="Send Feedback"
          >
            <MessageSquarePlus size={20} />
          </button>
        </nav>
        <button
          className={`md:hidden ${theme.colors.text}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>
      {mobileMenuOpen && (
        <div
          className={`border-t-2 border-black md:hidden ${theme.colors.card} absolute w-full shadow-xl`}
        >
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block w-full border-b border-gray-100 px-8 py-4 text-left text-black no-underline`}
            >
              <Label variant="eyebrow">{item.label}</Label>
            </a>
          ))}
          <button
            onClick={() => {
              setMobileMenuOpen(false)
              openFeedbackModal()
            }}
            className="block w-full border-b border-gray-100 px-8 py-4 text-left text-black hover:bg-black/5"
          >
            <Label variant="eyebrow" className="flex items-center gap-2">
              <MessageSquarePlus size={16} /> Send Feedback
            </Label>
          </button>
        </div>
      )}
    </header>
  )
}

export default Navbar
