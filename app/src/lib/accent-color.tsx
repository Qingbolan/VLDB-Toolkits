
import { createContext, useContext, useEffect, useState, ReactNode } from "react"

export const ACCENT_COLORS = {
  purple: {
    name: "Purple",
    light: "oklch(0.60 0.20 285)",
    dark: "oklch(0.68 0.22 285)",
    hover: "oklch(0.56 0.22 285)",
  },
  blue: {
    name: "Blue",
    light: "oklch(0.60 0.16 230)",
    dark: "oklch(0.66 0.18 230)",
    hover: "oklch(0.56 0.18 230)",
  },
  teal: {
    name: "Teal",
    light: "oklch(0.58 0.14 190)",
    dark: "oklch(0.64 0.16 190)",
    hover: "oklch(0.54 0.16 190)",
  },
  green: {
    name: "Green",
    light: "oklch(0.62 0.15 145)",
    dark: "oklch(0.68 0.17 145)",
    hover: "oklch(0.58 0.17 145)",
  },
  orange: {
    name: "Orange",
    light: "oklch(0.68 0.16 50)",
    dark: "oklch(0.72 0.18 50)",
    hover: "oklch(0.64 0.18 50)",
  },
  red: {
    name: "Red",
    light: "oklch(0.60 0.20 25)",
    dark: "oklch(0.66 0.22 25)",
    hover: "oklch(0.56 0.22 25)",
  },
  pink: {
    name: "Pink",
    light: "oklch(0.62 0.18 350)",
    dark: "oklch(0.68 0.20 350)",
    hover: "oklch(0.58 0.20 350)",
  },
} as const

export type AccentColorKey = keyof typeof ACCENT_COLORS

interface AccentColorContextType {
  accentColor: AccentColorKey
  setAccentColor: (color: AccentColorKey) => void
}

const AccentColorContext = createContext<AccentColorContextType | undefined>(undefined)

export function AccentColorProvider({ children }: { children: ReactNode }) {
  const [accentColor, setAccentColorState] = useState<AccentColorKey>("purple")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem("accent-color") as AccentColorKey
    if (stored && ACCENT_COLORS[stored]) {
      setAccentColorState(stored)
    }
  }, [])

  useEffect(() => {
    if (!mounted) return

    const color = ACCENT_COLORS[accentColor]
    const isDark = document.documentElement.classList.contains("dark")

    document.documentElement.style.setProperty("--primary", isDark ? color.dark : color.light)
    document.documentElement.style.setProperty("--primary-hover", color.hover)
    document.documentElement.style.setProperty(
      "--primary-active",
      isDark ? `oklch(from ${color.dark} calc(l - 0.04) c h)` : `oklch(from ${color.light} calc(l - 0.04) c h)`
    )

    localStorage.setItem("accent-color", accentColor)
  }, [accentColor, mounted])

  const setAccentColor = (color: AccentColorKey) => {
    setAccentColorState(color)
  }

  return (
    <AccentColorContext.Provider value={{ accentColor, setAccentColor }}>
      {children}
    </AccentColorContext.Provider>
  )
}

export function useAccentColor() {
  const context = useContext(AccentColorContext)
  if (!context) {
    throw new Error("useAccentColor must be used within AccentColorProvider")
  }
  return context
}
