
import * as React from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "light" | "dark"
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light")

  React.useEffect(() => {
    // Read theme setting from localStorage
    const stored = localStorage.getItem("theme") as Theme
    if (stored && ["light", "dark", "system"].includes(stored)) {
      setThemeState(stored)
    }
  }, [])

  React.useEffect(() => {
    const root = document.documentElement

    let effectiveTheme: "light" | "dark" = "light"

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      effectiveTheme = systemTheme
    } else {
      effectiveTheme = theme
    }

    // Use View Transition API for smooth switching (if browser supports it)
    const supportsViewTransitions = 'startViewTransition' in document
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (supportsViewTransitions && !prefersReducedMotion) {
      // @ts-ignore - View Transition API types not fully supported yet
      document.startViewTransition(() => {
        root.classList.remove("light", "dark")
        root.classList.add(effectiveTheme)
        setResolvedTheme(effectiveTheme)
      })
    } else {
      // Fallback solution
      root.classList.remove("light", "dark")
      root.classList.add(effectiveTheme)
      setResolvedTheme(effectiveTheme)
    }

    // Set color-scheme property for better performance
    root.style.colorScheme = effectiveTheme

    // Save to localStorage
    localStorage.setItem("theme", theme)
  }, [theme])

  // Listen for system theme changes
  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = () => {
      if (theme === "system") {
        const systemTheme = mediaQuery.matches ? "dark" : "light"
        setResolvedTheme(systemTheme)
        document.documentElement.classList.remove("light", "dark")
        document.documentElement.classList.add(systemTheme)
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  const setTheme = React.useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}
