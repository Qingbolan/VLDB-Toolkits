import { Link, useLocation } from "react-router-dom"
import { GlobeIcon } from "@/components/icons"
import { FileText, Users, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export function AppSidebar() {
  const location = useLocation()
  const pathname = location.pathname
  const { locale, setLocale, t } = useI18n()

  const navigation = [
    {
      name: t("nav.import"),
      href: "/",
      icon: Upload,
    },
    {
      name: t("nav.papers"),
      href: "/papers",
      icon: FileText,
    },
    {
      name: t("nav.authors"),
      href: "/authors",
      icon: Users,
    },
  ]

  const toggleLocale = () => {
    setLocale(locale === "en" ? "zh" : "en")
  }

  return (
    <div
      className="flex h-full w-full flex-col border-r relative overflow-hidden"
      style={{
        backgroundColor: 'var(--colorNeutralBackground2)',
        borderColor: 'var(--colorNeutralStroke2)',
      }}
    >
      {/* Content */}
      <div className="relative z-10 flex h-full w-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="relative h-10 w-10 flex-shrink-0">
          <img
            src="/logo.png"
            alt="VLDB-Toolkits Logo"
            className="h-full w-full object-contain"
          />
        </div>
        <span className="text-lg font-semibold">VLDB-Toolkits</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto overscroll-y-contain">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium fluent-transition",
                isActive
                  ? "bg-primary/10 text-primary fluent-shadow-xs"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="border-t border-sidebar-border p-4">
        <ThemeToggle />
      </div>

      {/* Language Toggle */}
      <div className="border-t border-sidebar-border p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLocale}
          className="w-full justify-start gap-2"
        >
          <GlobeIcon className="h-4 w-4" />
          <span>{locale === "en" ? "中文" : "English"}</span>
        </Button>
      </div>
      </div>
    </div>
  )
}
