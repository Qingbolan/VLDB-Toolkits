import { Link, useLocation } from "react-router-dom"
import { Breadcrumb } from "antd"
import { useI18n } from "@/lib/i18n"
import { useBrandStore } from "@/store"
import type { BreadcrumbItemType } from "antd/es/breadcrumb/Breadcrumb"

export function BreadcrumbNav() {
  const location = useLocation()
  const pathname = location.pathname
  const { t } = useI18n()
  const brandInfo = useBrandStore((state) => state.brandInfo)

  // Use brand name, or fallback to VLDB-Toolkits if not available
  const brandName = brandInfo?.name || "VLDB-Toolkits"

  // Route name mapping
  const routeNames: Record<string, string> = {
    "/": t("nav.brandVisibility"),
    "/products": t("nav.productVisibility"),
    "/citations": t("nav.citations"),
    "/sentiment": t("nav.sentiment"),
    "/pr-risk": t("nav.prRisk"),
    "/optimize": t("nav.suggestions"),
    "/results": t("nav.results"),
    "/manage": t("nav.manage"),
  }

  // Generate breadcrumb items
  const pathSegments = pathname.split("/").filter(Boolean)

  const items: BreadcrumbItemType[] = []

  // Add brand name (instead of Home)
  if (pathname === "/") {
    items.push({
      title: brandName,
    })
  } else {
    items.push({
      title: <Link to="/">{brandName}</Link>,
    })

    // Add path segments
    let currentPath = ""
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const isLast = index === pathSegments.length - 1
      const name = routeNames[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1)

      items.push({
        title: isLast ? name : <Link to={currentPath}>{name}</Link>,
      })
    })
  }

  return (
    <Breadcrumb
      items={items}
      separator="/"
      style={{
        fontSize: '14px',
        color: '#888',
      }}
      className="[&_*]:!text-[#888] [&_a]:hover:!text-[#555]"
    />
  )
}
