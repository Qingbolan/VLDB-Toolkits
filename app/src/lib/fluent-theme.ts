
import {
  createLightTheme,
  createDarkTheme,
  type BrandVariants,
  type Theme,
} from "@fluentui/react-components"

// 定义品牌色调色板（基于我们的主色调）
const brandColors: BrandVariants = {
  10: "#060315",
  20: "#15103F",
  30: "#24185C",
  40: "#331F78",
  50: "#422694",
  60: "#5432A8", // 我们的主色 primary
  70: "#6F49C5",
  80: "#8A64D9",
  90: "#A57FED",
  100: "#C09BFF",
  110: "#D4B7FF",
  120: "#E8D3FF",
  130: "#F3E7FF",
  140: "#F9F3FF",
  150: "#FCFAFF",
  160: "#FFFFFF",
}

// 创建亮色主题
export const lightTheme: Theme = {
  ...createLightTheme(brandColors),
}

// 创建暗色主题
export const darkTheme: Theme = {
  ...createDarkTheme(brandColors),
}

// 添加 Acrylic 和 Mica 自定义 tokens
export const acrylicTokens = {
  backdropFilter: "blur(30px) saturate(180%)",
  backgroundColor: "rgba(255, 255, 255, 0.7)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
}

export const micaTokens = {
  backdropFilter: "blur(80px) saturate(120%)",
  backgroundColor: "rgba(248, 248, 250, 0.92)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
}

// Reveal 效果 tokens
export const revealTokens = {
  transitionDuration: "167ms",
  transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
  hoverBorderColor: "rgba(255, 255, 255, 0.3)",
  hoverShadow: "0 8px 16px 0 rgba(0, 0, 0, 0.14)",
}
