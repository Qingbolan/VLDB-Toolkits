# Fluent UI 官方集成指南

本项目已成功集成微软官方的 **@fluentui/react-components** v9 库，实现完整的 Fluent Design System。

## 📦 安装的依赖

```json
{
  "@fluentui/react-components": "^9.72.2",
  "@fluentui/react-icons": "^2.0.312"
}
```

**注意**：由于 Fluent UI v9 尚未完全支持 React 19，安装时使用了 `--legacy-peer-deps` 标志。

## 🎨 核心架构

### 1. FluentProvider 配置

位于 `app/layout.tsx`，为整个应用提供 Fluent UI 主题：

```tsx
import { FluentProvider } from "@fluentui/react-components"
import { lightTheme } from "@/lib/fluent-theme"

<FluentProvider theme={lightTheme}>
  {/* 你的应用 */}
</FluentProvider>
```

### 2. 自定义主题

位于 `lib/fluent-theme.ts`，使用官方 API 创建主题：

```tsx
import { createLightTheme, createDarkTheme, type BrandVariants } from "@fluentui/react-components"

const brandColors: BrandVariants = {
  10: "#060315",
  // ... 完整的色板
  160: "#FFFFFF",
}

export const lightTheme = createLightTheme(brandColors)
export const darkTheme = createDarkTheme(brandColors)
```

## 🧩 封装的组件

### Card 组件 - Acrylic 效果

位于 `components/ui/card.tsx`，基于官方 Card 组件添加 Acrylic 材质：

```tsx
import { Card as FluentCard, makeStyles } from '@fluentui/react-components'

const useAcrylicCardStyles = makeStyles({
  root: {
    backdropFilter: 'blur(30px) saturate(180%)',
    backgroundColor: 'rgba(252, 252, 253, 0.7)',
    // ... Acrylic 样式
  }
})
```

**特性**：
- ✅ 30px 模糊 + 180% 饱和度
- ✅ 噪声纹理覆盖层
- ✅ 亮度渐变增加深度
- ✅ Reveal 悬停效果

**使用方式**：
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>
    内容
  </CardContent>
</Card>
```

### RevealButton - Reveal 效果

位于 `components/ui/fluent-button.tsx`，基于官方 Button 添加交互式光晕：

```tsx
import { RevealButton } from "@/components/ui/fluent-button"

<RevealButton variant="primary">
  点击我
</RevealButton>
```

**特性**：
- ✅ 光晕跟随鼠标位置
- ✅ Fluent 动效曲线 (cubic-bezier(0.2, 0, 0, 1))
- ✅ 三种变体：default, primary, subtle
- ✅ Acrylic 背景模糊

## 🎯 使用官方组件

### Typography（排版）

```tsx
import { Title1, Title2, Body1, Caption1 } from "@fluentui/react-components"

<Title1>大标题</Title1>
<Title2>中标题</Title2>
<Body1>正文内容</Body1>
<Caption1>辅助说明</Caption1>
```

### Button（按钮）

```tsx
import { Button } from "@fluentui/react-components"

<Button appearance="primary">Primary</Button>
<Button appearance="subtle">Subtle</Button>
<Button appearance="outline">Outline</Button>
<Button appearance="transparent">Transparent</Button>
```

## 🎨 makeStyles API

Fluent UI v9 使用 `makeStyles` 来定义样式：

```tsx
import { makeStyles, shorthands } from '@fluentui/react-components'

const useStyles = makeStyles({
  root: {
    ...shorthands.padding('16px'),
    ...shorthands.borderRadius('8px'),
    backgroundColor: 'var(--colorNeutralBackground1)',

    ':hover': {
      backgroundColor: 'var(--colorNeutralBackground1Hover)',
    },
  },
})

function MyComponent() {
  const styles = useStyles()
  return <div className={styles.root}>内容</div>
}
```

## 🎨 设计令牌（Design Tokens）

Fluent UI 提供了丰富的设计令牌：

### 颜色
- `--colorBrandBackground` - 品牌色背景
- `--colorNeutralForeground1` - 主要文字颜色
- `--colorNeutralBackground1` - 主要背景色
- `--colorBrandBackgroundHover` - 品牌色悬停

### 尺寸
- `--borderRadiusMedium` - 中等圆角
- `--strokeWidthThin` - 细边框

### 动效
- `--durationNormal` - 标准时长 (167ms)
- `--curveEasyEase` - 标准曲线

## 📄 演示页面

访问以下页面查看效果：

1. **自定义 Fluent Design** - `/fluent-demo`
   - 自定义实现的 Mica/Acrylic 组件
   - 动效曲线对比
   - 设计令牌参考

2. **官方 Fluent UI** - `/fluent-official`
   - 官方组件展示
   - Reveal 效果演示
   - 集成技术栈说明

## 🔧 开发建议

### 1. 优先使用官方组件

```tsx
// ✅ 推荐
import { Button } from "@fluentui/react-components"

// ❌ 避免重复造轮子
// 自己实现按钮组件
```

### 2. 使用 makeStyles 而非 CSS

```tsx
// ✅ 推荐 - 类型安全，主题感知
const useStyles = makeStyles({
  root: {
    backgroundColor: 'var(--colorBrandBackground)',
  },
})

// ❌ 避免 - 失去类型检查和主题集成
<div className="bg-primary" />
```

### 3. 遵循 Fluent 命名规范

```tsx
// ✅ 推荐
const useCardStyles = makeStyles({ ... })

// ❌ 避免
const useMyCustomStyles = makeStyles({ ... })
```

## 🐛 已知问题

### React 19 兼容性

Fluent UI v9 官方尚未声明支持 React 19，但使用 `--legacy-peer-deps` 可以正常工作。

**解决方案**：
```bash
npm install @fluentui/react-components --legacy-peer-deps
```

### 样式优先级冲突

Fluent UI 的样式可能与 Tailwind CSS 冲突。

**解决方案**：
- 在 Fluent 组件上使用 `makeStyles`
- 在自定义组件上使用 Tailwind
- 必要时使用 `!important` 覆盖

## 📚 参考资源

- [Fluent UI 官方文档](https://react.fluentui.dev/)
- [Fluent 2 设计规范](https://fluent2.microsoft.design/)
- [makeStyles API](https://react.fluentui.dev/?path=/docs/concepts-developer-styling-makeStyles--page)
- [设计令牌参考](https://react.fluentui.dev/?path=/docs/theme-design-tokens--page)

## 🎉 总结

现在你的应用已经完全集成了微软官方的 Fluent UI v9 库，可以：

✅ 使用所有官方 Fluent UI 组件
✅ 自定义 Acrylic/Mica 材质效果
✅ 实现 Reveal 交互式光晕
✅ 使用官方设计令牌和主题系统
✅ 完全符合 Windows 11 Fluent Design 规范
