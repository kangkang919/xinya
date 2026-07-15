---
kind: frontend_style
name: 心芽前端样式体系：Tailwind v4 + CSS 变量主题 + 手绘风动效
category: frontend_style
scope:
    - '**'
source_files:
    - app/globals.css
    - lib/useTheme.ts
    - postcss.config.mjs
    - app/layout.tsx
    - package.json
---

## 1. 系统与方法论

- **CSS 框架**：Tailwind CSS v4（通过 `@tailwindcss/postcss` 插件集成），采用 v4 的 `@import "tailwindcss"` 导入方式，无传统 `tailwind.config.js`。
- **设计令牌**：通过 `app/globals.css` 中的 `:root` CSS 自定义属性集中定义色板与字体，作为全局设计令牌。
- **主题机制**：基于 `lib/useTheme.ts` 客户端 Hook 实现「spring / night」两套主题，通过 `localStorage("xinya-theme")` 持久化，并以 `window.dispatchEvent(new CustomEvent('xinya-theme-change'))` 跨组件同步。
- **动画系统**：在 `globals.css` 中集中定义 `sproutGrow`、`bounceGentle`、`bookmarkPop`、`fadeIn`、`scrollUnfurl`、`leafSpread` 等关键帧，并暴露 `.animate-*` 工具类供页面复用。
- **手绘风格边框**：通过一组不规则 `border-radius` 组合（如 `255px 15px 225px 15px / 15px 225px 15px 255px`）提供 `.btn-sketch`、`.input-sketch`、`.card-sketch`、`.dialog-sketch` 四类手绘感容器。
- **移动端适配**：使用 `env(safe-area-inset-bottom, 0px)` 配合 `.pb-safe`、`.bottom-safe` 处理 iPhone 刘海/底部安全区；根布局设置 `viewportFit: 'cover'`。

## 2. 核心文件与包

| 文件 | 职责 |
|---|---|
| `app/globals.css` | Tailwind 入口、`:root` 设计令牌、全局动画、手绘边框、安全区工具类 |
| `postcss.config.mjs` | PostCSS 配置，仅启用 `@tailwindcss/postcss` |
| `lib/useTheme.ts` | 客户端主题 Hook，维护 spring/night 双主题状态与派生色值 |
| `app/layout.tsx` | 根布局，注入 PWA manifest、图标、`react-hot-toast` 主题色 |
| `package.json` | 依赖声明：`next 16.2.9`、`tailwindcss ^4`、`@tailwindcss/postcss ^4`、`lucide-react`、`react-hot-toast` |

## 3. 架构与约定

- **令牌层**：所有颜色以 `--color-*` 前缀的 CSS 变量形式集中在 `:root`，组件优先读取这些变量而非硬编码十六进制。
- **主题层**：`useTheme()` 返回 `isDark` 及派生色（`cardBg`、`cardBorder`、`titleColor`、`subColor`、`dimColor`、`inputBg`、`inputBorder`），组件应通过该 Hook 获取当前主题下的具体色值。
- **样式层**：
  - 布局与间距统一使用 Tailwind 原子类（`p-8`、`m-4`、`flex`、`text-center` 等）。
  - 品牌视觉（手绘圆角、嫩芽绿主色 `#8BC34A`、暖棕 `#795548`）通过 `globals.css` 中的自定义类与变量保障一致性。
  - 动效一律使用预定义的 `.animate-*` 类，避免在组件内重复写 `@keyframes`。
- **响应式策略**：以 Tailwind 默认断点为主，结合 `viewportFit: 'cover'` 与安全区变量适配 iOS 设备。

## 4. 开发者规范

1. **新增颜色**：先在 `:root` 中声明 `--color-*` 变量，再在组件中以 `var(--color-*)` 引用，禁止散落硬编码色值。
2. **主题切换**：需要感知明暗主题的组件必须使用 `useTheme()` Hook，不要直接读 `localStorage`。
3. **手绘风格**：卡片、按钮、输入框、对话框分别套用 `.card-sketch`、`.btn-sketch`、`.input-sketch`、`.dialog-sketch`，保持统一的“手绘”圆角语义。
4. **动效使用**：优先选用 `globals.css` 已暴露的 `.animate-sprout`、`.animate-bounce-gentle`、`.animate-bookmark-pop`、`.animate-fade-in`、`.animate-scroll-unfurl`、`.animate-leaf-spread`；如需新动效，请在同一文件中追加 `@keyframes` 与对应工具类。
5. **移动端安全区**：底部固定元素使用 `.bottom-safe`，内容区域底部留白使用 `.pb-safe`。
6. **Toast 主题**：全局 Toast 成功态主色已绑定 `#8BC34A`，新增业务提示请沿用此主色以保持品牌一致。