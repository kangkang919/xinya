# UI设计规范

<cite>
**本文引用的文件列表**
- [globals.css](file://app/globals.css)
- [useTheme.ts](file://lib/useTheme.ts)
- [layout.tsx（主布局）](file://app/(main)/layout.tsx)
- [showcase/page.tsx（视觉样板页）](file://app/showcase/page.tsx)
- [leaf/page.tsx（枝叶页）](file://app/(main)/leaf/page.tsx)
- [root/page.tsx（根系页）](file://app/(main)/root/page.tsx)
- [postcss.config.mjs](file://postcss.config.mjs)
- [心芽小程序设计框架v2.0.md](file://doc/心芽小程序设计框架v2.0.md)
- [暗色系修改经验总结.md](file://doc/暗色系修改经验总结.md)
</cite>

## 目录
1. [引言](#引言)
2. [项目结构](#项目结构)
3. [核心组件与样式约定](#核心组件与样式约定)
4. [架构总览](#架构总览)
5. [详细规范说明](#详细规范说明)
6. [依赖关系分析](#依赖关系分析)
7. [性能与可访问性建议](#性能与可访问性建议)
8. [故障排查指南](#故障排查指南)
9. [结论](#结论)
10. [附录：主题色板与使用清单](#附录主题色板与使用清单)

## 引言
本规范面向“心芽”项目的UI设计与前端实现，统一色彩、字体、间距、布局网格、组件样式、主题系统与图标规范，确保多端一致体验。文档同时给出代码级映射与可视化图示，便于研发与设计协同落地。

## 项目结构
本项目采用 Next.js App Router 组织页面与布局，样式基于 Tailwind CSS + 全局CSS变量；主题系统通过客户端 Hook 与布局层状态管理，配合本地存储持久化。

```mermaid
graph TB
A["应用入口<br/>app/layout.tsx"] --> B["主布局<br/>app/(main)/layout.tsx"]
B --> C["页面集合<br/>app/(main)/*"]
B --> D["认证布局<br/>app/(auth)/layout.tsx"]
B --> E["展示样板页<br/>app/showcase/page.tsx"]
F["全局样式<br/>app/globals.css"] --> B
G["主题Hook<br/>lib/useTheme.ts"] --> C
H["Tailwind配置<br/>postcss.config.mjs"] --> F
```

图表来源
- [layout.tsx（主布局）](file://app/(main)/layout.tsx#L1-L81)
- [globals.css:1-79](file://app/globals.css#L1-L79)
- [useTheme.ts:1-30](file://lib/useTheme.ts#L1-L30)
- [postcss.config.mjs:1-7](file://postcss.config.mjs#L1-L7)

章节来源
- [layout.tsx（主布局）](file://app/(main)/layout.tsx#L1-L81)
- [globals.css:1-79](file://app/globals.css#L1-L79)
- [useTheme.ts:1-30](file://lib/useTheme.ts#L1-L30)
- [postcss.config.mjs:1-7](file://postcss.config.mjs#L1-L7)

## 核心组件与样式约定
- 按钮
  - 主操作：渐变填充（嫩绿到浅绿），手绘圆角，阴影，白字。
  - 次要操作：描边为主，悬停填充强调色。
  - 危险操作：红色系填充或描边，用于删除等破坏性操作。
- 卡片
  - 白色背景+手绘风格边框，轻阴影，hover增强阴影。
  - 标题、摘要、标签、时间、心情图标组合。
- 标签气泡
  - 小/中/大三级尺寸，圆角胶囊，绿色系背景与边框，数量标注。
- 搜索栏与筛选
  - 输入框带手绘圆角，聚焦时高亮主色；筛选为胶囊按钮组。
- 弹窗
  - 遮罩+手绘圆角对话框，确认/取消双按钮。
- 底部导航
  - 四Tab（萌芽/枝叶/年轮/根系），中央悬浮新增按钮，安全区域适配。

章节来源
- [showcase/page.tsx（视觉样板页）:330-346](file://app/showcase/page.tsx#L330-L346)
- [showcase/page.tsx（视觉样板页）:392-419](file://app/showcase/page.tsx#L392-L419)
- [showcase/page.tsx（视觉样板页）:201-223](file://app/showcase/page.tsx#L201-L223)
- [showcase/page.tsx（视觉样板页）:229-264](file://app/showcase/page.tsx#L229-L264)
- [globals.css:70-78](file://app/globals.css#L70-L78)

## 架构总览
主题系统由“布局层状态 + 客户端Hook + 本地存储 + 全局CSS变量”共同构成。布局负责首屏背景与导航样式，Hook提供卡片、输入等衍生色值，全局CSS定义品牌色与基础排版。

```mermaid
sequenceDiagram
participant U as "用户"
participant L as "主布局<br/>app/(main)/layout.tsx"
participant H as "主题Hook<br/>lib/useTheme.ts"
participant S as "本地存储<br/>localStorage"
participant C as "页面组件"
U->>L : 打开页面
L->>S : 读取 xinya-theme
S-->>L : 返回主题键
L->>L : 设置背景/导航色
U->>C : 点击切换主题
C->>H : 调用 setTheme()
H->>S : 写入 xinya-theme
H-->>L : 触发 window 事件
L->>L : 重新计算并渲染新主题
```

图表来源
- [layout.tsx（主布局）](file://app/(main)/layout.tsx#L30-L81)
- [useTheme.ts:4-29](file://lib/useTheme.ts#L4-L29)

章节来源
- [layout.tsx（主布局）](file://app/(main)/layout.tsx#L1-L81)
- [useTheme.ts:1-30](file://lib/useTheme.ts#L1-L30)

## 详细规范说明

### 一、色彩体系
- 主色调
  - 嫩绿色系：#8BC34A（主绿）、#AED581（浅绿）。用于主按钮、活跃态、强调信息。
- 底色
  - 暖白底色：#FAFAF5。默认页面背景。
- 辅助色
  - 大地棕：#795548。用于标签、强调文案。
  - 天空蓝：#42A5F5。用于图表数据、链接等中性强调。
- 文本与分割线
  - 正文黑：#333333；辅助灰：#666666；淡色字：#999999；分割线：#E8E8E3。
- 使用建议
  - 主色用于关键交互与品牌识别；辅助色用于次级信息与数据可视化；文本层级遵循深→浅的对比度梯度。

章节来源
- [globals.css:3-13](file://app/globals.css#L3-L13)
- [showcase/page.tsx（视觉样板页）:299-314](file://app/showcase/page.tsx#L299-L314)
- [心芽小程序设计框架v2.0.md:193-201](file://doc/心芽小程序设计框架v2.0.md#L193-L201)

### 二、字体规范
- 默认字体
  - 微软雅黑（Microsoft YaHei），作为全站点默认字体族，保证中文清晰可读。
- 字号与行高
  - 标题：text-xl / text-base（加粗/半粗）
  - 正文：text-sm
  - 辅助信息：text-xs
  - 行高以自然阅读舒适为准，避免过密。
- 字体家族优先级
  - 在浏览器回退链中包含 PingFang SC 与 sans-serif，提升跨平台一致性。

章节来源
- [globals.css:17-22](file://app/globals.css#L17-L22)
- [showcase/page.tsx（视觉样板页）:317-327](file://app/showcase/page.tsx#L317-L327)
- [心芽小程序设计框架v2.0.md:50-62](file://doc/心芽小程序设计框架v2.0.md#L50-L62)

### 三、间距标准与布局网格
- 间距单位
  - 以 Tailwind 的 spacing 为基础，结合 px-4、py-4、gap-2 等常用类名形成统一节奏。
- 网格与容器
  - 移动端优先，内容区最大宽度限制，居中显示；列表采用单列流式布局。
- 安全区域
  - 底部固定导航需考虑系统 Safe Area，使用 env(safe-area-inset-bottom)。

章节来源
- [globals.css:76-78](file://app/globals.css#L76-L78)
- [showcase/page.tsx（视觉样板页）:297-315](file://app/showcase/page.tsx#L297-L315)

### 四、组件样式约定
- 手绘风格边框
  - 按钮、输入、卡片、对话框分别定义不规则圆角，营造有机手绘感。
- 动效
  - 嫩芽生长、轻柔弹跳、收藏弹跳、淡入上移、卷轴展开、叶片展开等微动画，用于加载、反馈与过渡。
- 卡片与标签
  - 卡片：白底+手绘边框+轻阴影；标签：绿色系胶囊，分级尺寸与计数。
- 搜索与筛选
  - 输入框手绘圆角，聚焦主色高亮；筛选为胶囊按钮组，选中态使用主色。

章节来源
- [globals.css:24-74](file://app/globals.css#L24-L74)
- [showcase/page.tsx（视觉样板页）:330-346](file://app/showcase/page.tsx#L330-L346)
- [showcase/page.tsx（视觉样板页）:392-419](file://app/showcase/page.tsx#L392-L419)

### 五、背景主题系统（5套）
- 主题定义
  - 春日萌芽（默认）：浅绿暖白
  - 夏日繁茂：深绿色系
  - 秋日暖阳：橙黄暖色调
  - 冬日静谧：灰白极简
  - 夜间模式：深色护眼
- 实现要点
  - 布局层维护当前主题键与背景色，支持从URL参数初始化并持久化至 localStorage。
  - 客户端Hook根据 isDark 派生卡片、输入等衍生色值，供各页面复用。
  - 展示样板页内置4套主题预览（含夜间模式的语义说明），便于快速验证整体效果。
- 注意事项
  - 避免SSR hydration不匹配导致的主题闪烁；所有主题逻辑应在客户端 useEffect 中执行。

```mermaid
flowchart TD
Start(["进入页面"]) --> ReadStorage["读取 localStorage 主题键"]
ReadStorage --> ApplyBg["设置页面背景/导航色"]
ApplyBg --> UserAction{"用户切换主题?"}
UserAction --> |是| UpdateStorage["更新 localStorage 主题键"]
UpdateStorage --> DispatchEvent["派发 window 主题变更事件"]
DispatchEvent --> Reapply["布局层重新计算并渲染"]
UserAction --> |否| End(["结束"])
Reapply --> End
```

图表来源
- [layout.tsx（主布局）](file://app/(main)/layout.tsx#L30-L81)
- [useTheme.ts:4-29](file://lib/useTheme.ts#L4-L29)
- [showcase/page.tsx（视觉样板页）:279-287](file://app/showcase/page.tsx#L279-L287)

章节来源
- [layout.tsx（主布局）](file://app/(main)/layout.tsx#L1-L81)
- [useTheme.ts:1-30](file://lib/useTheme.ts#L1-L30)
- [showcase/page.tsx（视觉样板页）:279-287](file://app/showcase/page.tsx#L279-L287)
- [心芽小程序设计框架v2.0.md:203-211](file://doc/心芽小程序设计框架v2.0.md#L203-L211)

### 六、响应式设计断点与适配策略
- 断点定义
  - 手机：<768px，单列流式布局
  - 桌面：>1024px，三栏布局（参考产品规范）
- 适配策略
  - 移动端优先，使用 Tailwind 响应式前缀控制不同断点的布局与字号。
  - 底部导航增加安全区域适配，避免被系统手势遮挡。
  - 列表与卡片在小屏下保持紧凑间距与大触控热区。

章节来源
- [心芽小程序设计框架v2.0.md:236-237](file://doc/心芽小程序设计框架v2.0.md#L236-L237)
- [globals.css:76-78](file://app/globals.css#L76-L78)

### 七、图标规范与视觉元素统一标准
- 图标库
  - 统一使用 Lucide Icons，线条风格、线宽一致，确保视觉统一。
- 图标使用
  - 导航Tab、心情标记、功能按钮等均采用同一系列图标；激活态使用主色，非激活态使用中性灰。
- 插画与动效
  - 手绘风嫩芽/叶子/年轮/根须等自然形态，配合轻量动效，传达温暖有机的品牌气质。

章节来源
- [showcase/page.tsx（视觉样板页）:4-9](file://app/showcase/page.tsx#L4-L9)
- [showcase/page.tsx（视觉样板页）:229-264](file://app/showcase/page.tsx#L229-L264)
- [心芽小程序设计框架v2.0.md:213-218](file://doc/心芽小程序设计框架v2.0.md#L213-L218)

## 依赖关系分析
- 样式与主题
  - globals.css 定义品牌色与基础动画、手绘边框；Tailwind 提供原子类与响应式能力。
  - 主布局与 useTheme 协作完成主题切换与持久化。
- 页面与组件
  - 枝叶页、根系页等直接使用 useTheme 提供的色值，保证卡片、输入等在不同主题下的可读性与一致性。

```mermaid
graph LR
CSS["全局样式<br/>globals.css"] --> Layout["主布局<br/>layout.tsx"]
CSS --> Showcase["样板页<br/>showcase/page.tsx"]
Theme["主题Hook<br/>useTheme.ts"] --> Leaf["枝叶页<br/>leaf/page.tsx"]
Theme --> Root["根系页<br/>root/page.tsx"]
PostCSS["PostCSS/Tailwind<br/>postcss.config.mjs"] --> CSS
```

图表来源
- [globals.css:1-79](file://app/globals.css#L1-L79)
- [layout.tsx（主布局）](file://app/(main)/layout.tsx#L1-L81)
- [useTheme.ts:1-30](file://lib/useTheme.ts#L1-L30)
- [leaf/page.tsx（枝叶页）](file://app/(main)/leaf/page.tsx#L212-L237)
- [root/page.tsx（根系页）](file://app/(main)/root/page.tsx#L462-L516)
- [postcss.config.mjs:1-7](file://postcss.config.mjs#L1-L7)

章节来源
- [leaf/page.tsx（枝叶页）](file://app/(main)/leaf/page.tsx#L212-L237)
- [root/page.tsx（根系页）](file://app/(main)/root/page.tsx#L462-L516)

## 性能与可访问性建议
- 主题切换
  - 使用 transition 平滑过渡背景与边框颜色，减少视觉跳跃。
  - 将主题初始化逻辑置于客户端 useEffect，避免 SSR hydration 不一致。
- 动效
  - 控制动画时长与频率，避免过度动画影响性能与可访问性。
- 可访问性
  - 确保文本与背景的对比度满足 WCAG 要求；为交互元素提供足够的触控热区。

[本节为通用建议，无需具体文件引用]

## 故障排查指南
- 主题刷新失效（SSR hydration 问题）
  - 现象：切换暗色后刷新，背景恢复亮色但子组件仍暗色。
  - 根因：SSR 阶段初始值与客户端 localStorage 不一致导致 hydration mismatch。
  - 解决：在布局层使用纯客户端 useEffect 读取 localStorage 并设置主题；必要时在 head 内联脚本提前设置背景色消除闪烁。
- 主题未同步
  - 检查是否派发 window 主题变更事件，并确保布局层监听该事件。
- 颜色不一致
  - 核对全局CSS变量与 useTheme 返回值在各页面的使用位置，避免硬编码覆盖。

章节来源
- [暗色系修改经验总结.md:1-178](file://doc/暗色系修改经验总结.md#L1-L178)
- [layout.tsx（主布局）](file://app/(main)/layout.tsx#L30-L81)
- [useTheme.ts:4-29](file://lib/useTheme.ts#L4-L29)

## 结论
本规范围绕“心芽”的品牌气质与产品定位，明确了色彩、字体、间距、组件、主题与图标的统一标准，并通过代码级映射与图示帮助团队高效落地。建议在后续迭代中持续完善主题扩展与组件库沉淀，确保多端一致的视觉体验。

[本节为总结性内容，无需具体文件引用]

## 附录：主题色板与使用清单
- 春日萌芽（默认）
  - 背景：暖白 #FAFAF5；强调：嫩绿 #8BC34A/#AED581；文本：#333/#666/#999；分割线：#E8E8E3
- 夏日繁茂
  - 背景：深绿；强调：更深的绿色；文本：浅色以保证对比度
- 秋日暖阳
  - 背景：暖米白；强调：橙色；文本：深棕/深灰
- 冬日静谧
  - 背景：冷白；强调：蓝灰；文本：冷灰
- 夜间模式
  - 背景：深色；卡片/输入/边框按 isDark 派生；文本：浅灰/白

章节来源
- [globals.css:3-13](file://app/globals.css#L3-L13)
- [useTheme.ts:19-28](file://lib/useTheme.ts#L19-L28)
- [showcase/page.tsx（视觉样板页）:279-287](file://app/showcase/page.tsx#L279-L287)
- [心芽小程序设计框架v2.0.md:203-211](file://doc/心芽小程序设计框架v2.0.md#L203-L211)