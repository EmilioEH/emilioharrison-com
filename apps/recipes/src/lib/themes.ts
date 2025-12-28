export interface ThemeColors {
  bg: string
  text: string
  primary: string
  secondary: string
  accent: string
  dark: string
  border: string
  card: string
  highlight: string
  shape: string
}

export interface Theme {
  id: string
  colors: ThemeColors
  font: string
  shadow: string
  shadowHover: string
  border: string
}

export const THEMES: Record<string, Theme> = {
  default: {
    id: 'default',
    colors: {
      bg: 'bg-paper',
      text: 'text-gray-900',
      primary: 'bg-teal',
      secondary: 'bg-coral',
      accent: 'bg-mustard',
      dark: 'bg-ink',
      border: 'border-black',
      card: 'bg-white',
      highlight: 'text-teal',
      shape: 'stroke-black',
    },
    font: 'font-sans',
    shadow: 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
    shadowHover:
      'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all',
    border: 'border-2 border-black',
  },
}
