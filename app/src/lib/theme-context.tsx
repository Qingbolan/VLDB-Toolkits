
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
    // 从 localStorage 读取主题设置
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

    // 使用 View Transition API 实现流畅切换（如果浏览器支持）
    const supportsViewTransitions = 'startViewTransition' in document
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (supportsViewTransitions && !prefersReducedMotion) {
      // @ts-ignore - View Transition API 还未完全支持类型
      document.startViewTransition(() => {
        root.classList.remove("light", "dark")
        root.classList.add(effectiveTheme)
        setResolvedTheme(effectiveTheme)
      })
    } else {
      // 降级方案
      root.classList.remove("light", "dark")
      root.classList.add(effectiveTheme)
      setResolvedTheme(effectiveTheme)
    }

    // 设置 color-scheme 属性提升性能
    root.style.colorScheme = effectiveTheme

    // 保存到 localStorage
    localStorage.setItem("theme", theme)
  }, [theme])

  // 监听系统主题变化
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
