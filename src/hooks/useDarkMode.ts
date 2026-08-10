import { useEffect } from 'react'

export function useDarkMode(defaultDark = true) {
  useEffect(() => {
    const root = document.documentElement
    if (defaultDark) root.classList.add('dark')
    else root.classList.remove('dark')
  }, [defaultDark])
}


