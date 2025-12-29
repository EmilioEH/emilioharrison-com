import { atom } from 'nanostores'

export const burgerMenuOpen = atom<boolean>(false)

export function openBurgerMenu() {
  burgerMenuOpen.set(true)
}

export function closeBurgerMenu() {
  burgerMenuOpen.set(false)
}
