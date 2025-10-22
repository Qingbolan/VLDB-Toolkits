# VLDB-Toolkits - AI Observatory Platform

VLDB-Toolkits is an AI-powered observatory that tracks how generative engines surface and rank information. It measures visibility, bias, and ranking shifts across major AI platforms.

## 技术栈

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite 7
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4 + Fluent Design System
- **UI Components**:
  - Radix UI
  - Ant Design
  - Fluent UI
- **Desktop**: Tauri 2 (跨平台桌面应用)
- **Charts**: Recharts
- **Animation**: Framer Motion, GSAP

## 项目特色

- 🎨 **Fluent Design System** - 采用 Windows 11 风格的现代化设计
- 🌈 **亚克力材质** - 支持毛玻璃效果和动态背景
- 🌓 **深色模式** - 完整的主题切换支持
- 🌍 **国际化** - 中英文双语支持
- 📊 **数据可视化** - 丰富的图表展示
- 🚀 **高性能** - Vite 构建，快速开发体验
- 💻 **桌面应用** - 使用 Tauri 打包为原生应用

## 颜色主题

项目默认使用紫色作为主色调（Primary Color）：
- Primary: `oklch(0.60 0.20 285)` - 现代紫色
- 支持通过 CSS 变量自定义主题颜色

## 开发环境设置

### 前置要求

- Node.js 18+
- npm 或 pnpm
- Rust (用于 Tauri 打包)

### 安装依赖

```bash
npm install
```

### 开发模式

#### Web 开发
```bash
npm run dev
```
访问 http://localhost:3000

#### Tauri 桌面开发
```bash
# 确保已安装 Rust
# macOS/Linux:
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 启动 Tauri 开发模式
npm run tauri:dev
```

### 构建

#### Web 构建
```bash
npm run build
```

#### Tauri 打包
```bash
# 构建桌面应用（会自动构建 Web 部分）
npm run tauri:build
```

打包完成后，应用程序将在 `src-tauri/target/release/bundle/` 目录中：
- macOS: `.dmg` 和 `.app`
- Windows: `.msi` 和 `.exe`
- Linux: `.deb`, `.AppImage` 等

## 项目结构

```
VLDB-Toolkits/
├── src/
│   ├── App.tsx                 # 主应用组件和路由配置
│   ├── main.tsx               # 应用入口
│   ├── components/            # UI 组件
│   │   ├── app-sidebar.tsx   # 侧边栏导航
│   │   ├── breadcrumb.tsx    # 面包屑导航
│   │   ├── ui/               # 通用 UI 组件
│   │   └── ...
│   ├── pages/                 # 页面组件
│   │   ├── HomePage.tsx      # 品牌可见度
│   │   ├── CitationsPage.tsx # AI 引用分析
│   │   ├── SentimentPage.tsx # 品牌情感分析
│   │   └── ...
│   ├── lib/                   # 工具函数和配置
│   │   ├── i18n.tsx          # 国际化
│   │   ├── theme-context.tsx # 主题管理
│   │   └── ...
│   ├── hooks/                 # 自定义 Hooks
│   ├── store/                 # 状态管理
│   └── styles/
│       └── globals.css        # 全局样式（Tailwind + Fluent）
├── src-tauri/                 # Tauri 配置和 Rust 代码
│   ├── src/
│   │   └── main.rs           # Rust 入口
│   ├── tauri.conf.json       # Tauri 配置
│   ├── Cargo.toml            # Rust 依赖
│   └── icons/                # 应用图标
├── public/                    # 静态资源
├── index.html                 # HTML 入口
├── vite.config.ts            # Vite 配置
├── postcss.config.js         # PostCSS 配置
└── package.json              # 项目配置

```

## 主要功能页面

1. **品牌可见度** (`/`) - 实时品牌曝光跟踪和提及频率分析
2. **产品可见度** (`/products`) - 产品在 AI 平台的排名追踪
3. **AI 引用分析** (`/citations`) - 引用来源和可信度分析
4. **品牌情感** (`/sentiment`) - 情感分析和关键词云
5. **AI 建议** (`/optimize`) - 优化建议和策略
6. **优化结果** (`/results`) - 实施效果追踪
7. **品牌管理** (`/manage`) - 品牌信息管理

## 自定义配置

### 修改主题颜色

编辑 `src/styles/globals.css` 中的 CSS 变量：

```css
:root {
  --primary: oklch(0.60 0.20 285); /* 紫色 */
  /* 修改色相值(285)来改变颜色 */
}
```

### 添加新页面

1. 在 `src/pages/` 创建新页面组件
2. 在 `src/App.tsx` 中添加路由
3. 在 `src/components/app-sidebar.tsx` 中添加导航项

## 性能优化

- ✅ 代码分割 (按供应商和功能)
- ✅ 懒加载路由
- ✅ 图片优化
- ✅ CSS 优化 (Tailwind CSS v4)
- ✅ Tree Shaking
- ✅ 生产构建压缩

## 浏览器支持

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## 许可证

© 2025 EASYNET Inc.

## 贡献

欢迎提交 Issues 和 Pull Requests！
