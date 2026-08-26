
# 心芽复习追踪 + 知识关联 方案计划书

---

## 一、功能总览

本次迭代新增两个功能模块，归属于现有四页面架构：

| 模块 | 解决的问题 | 涉及页面 |
|------|-----------|---------|
| **F13: 复习追踪** | 全量复习不重复、不遗漏 | 萌芽页、枝叶页、心得详情页 |
| **F14: 知识关联** | 心得间关系标注、联想跳转、AI 推荐、图谱可视化 | 心得详情页、根系页 |

---

## 二、F13 复习追踪

### 2.1 方案选择：「已读标记 + 筛选」模式

选择理由：实现成本最低，与现有架构完全兼容，新增心得天然标记为"未复习"，标签变动不影响复习状态。

### 2.2 数据变更

**Entry 表新增字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `reviewedAt` | `DateTime?` | 最近一次复习时间，null 表示从未复习 |

**判断逻辑：**
- `reviewedAt == null` → 未复习
- `reviewedAt != null` 且 `updatedAt > reviewedAt` → 内容有更新，需重新复习
- `reviewedAt != null` 且 `updatedAt <= reviewedAt` → 已复习且无变更

### 2.3 API 变更

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/entries/[id]/review` | 标记当前心得为"已复习"（设置 reviewedAt = now） |
| GET | `/api/entries?reviewStatus=unreviewed` | 新增 reviewStatus 筛选参数，支持 `unreviewed`（未复习）/ `needsReview`（需重新复习） |

### 2.4 前端交互

**萌芽页（sprout）：**
- 搜索栏区域新增一个筛选开关：「未复习」toggle 按钮
- 开启后只显示未复习 / 需重新复习的心得
- 心得卡片右上角显示复习状态小标记（绿色圆点 = 已复习，灰色 = 未复习）

**心得详情页（view）：**
- 进入详情页时自动调用 POST `/api/entries/[id]/review` 标记为已复习
- 底部操作栏新增一个状态提示：「已复习 ✓」或「未复习」

**枝叶页（leaf）：**
- 每个标签分组标题旁显示进度：`已复习 3/8`
- 点击可筛选该标签下未复习的心得

### 2.5 涉及文件

| 文件 | 变更内容 |
|------|---------|
| `prisma/schema.prisma` | Entry 模型新增 `reviewedAt` 字段 |
| `app/api/entries/[id]/route.ts` | GET 返回时新增 reviewedAt 字段 |
| `app/api/entries/[id]/review/route.ts` | **新建**，POST 标记已复习 |
| `app/api/entries/route.ts` | 新增 reviewStatus 查询参数 |
| `app/(main)/(sprout)/page.tsx` | 新增未复习筛选 toggle + 卡片状态标记 |
| `app/(main)/leaf/page.tsx` | 标签分组标题显示复习进度 |
| `app/entry/[id]/view/page.tsx` | 自动标记已复习 + 底部状态提示 |

---

## 三、F14 知识关联

### 3.1 数据模型

**新增 EntryLink 表：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `String` | 主键，cuid |
| `fromEntryId` | `String` | 源心得 ID |
| `toEntryId` | `String` | 目标心得 ID |
| `relationType` | `String` | 关系类型：`sequence`（串行）/ `hierarchy`（总分）/ `related`（关联）/ `insight`（启发） |
| `note` | `String?` | 可选备注（≤50字） |
| `source` | `String` | 来源：`manual`（手动标注）/ `ai`（AI 推荐确认） |
| `createdAt` | `DateTime` | 创建时间 |

**约束：**
- 唯一索引 `@@unique([fromEntryId, toEntryId])`，同一对心得不重复建链
- 级联删除：源心得或删除时关联自动清除
- 索引：`@@index([fromEntryId])` + `@@index([toEntryId])`

### 3.2 关系类型定义

| 类型 | 图标 | 颜色 | 语义 | 举例 |
|------|------|------|------|------|
| `sequence` | → 箭头 | 蓝色 #42A5F5 | 有先后顺序 | "先理解 A 再看 B" |
| `hierarchy` | ⑂ 分支 | 绿色 #8BC34A | 包含/从属 | "A 是 B 的子话题" |
| `related` | ↔ 双向 | 橙色 #FF8C42 | 有联系无层级 | "同一概念的不同侧面" |
| `insight` | 💡 灯泡 | 紫色 #AB47BC | 灵感联想 | "读 A 时想到了 B" |

### 3.3 API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/entries/[id]/links` | 获取某心得的所有关联（含对方心得的标题和预览） |
| POST | `/api/entries/[id]/links` | 创建关联（body: toEntryId, relationType, note?） |
| DELETE | `/api/links/[id]` | 删除一条关联 |
| GET | `/api/entries/[id]/link-suggestions` | AI 推荐关联（返回候选关联列表） |

**GET /api/entries/[id]/links 返回格式：**
```json
{
  "ok": true,
  "data": {
    "outgoing": [
      {
        "id": "link-id",
        "toEntry": { "id": "...", "title": "...", "contentPreview": "...", "tags": [...] },
        "relationType": "sequence",
        "note": "先理解这篇再看那篇"
      }
    ],
    "incoming": [
      {
        "id": "link-id",
        "fromEntry": { "id": "...", "title": "...", "contentPreview": "...", "tags": [...] },
        "relationType": "hierarchy",
        "note": null
      }
    ]
  }
}
```

### 3.4 前端交互

#### 3.4.1 心得详情页 —— 「联想」面板

**位置**：正文下方、底部操作栏上方，新增一个「关联心得」区块。

**默认状态**：显示已有关联列表，按关系类型分组：
```
── 串行 ──
→ CSS入门  "先理解HTML再看CSS"

── 总分 ──
← 前端全景  （属于前端知识体系）

── 关联 ──
↔ JavaScript基础

── 启发 ──
💡 设计模式之美
```

每条关联可点击跳转到对应心得详情页。

**添加关联**：点击「+ 联想」按钮，弹出底部面板：
1. 搜索框：输入关键词实时搜索心得（复用现有 `/api/entries?search=` 接口）
2. 搜索结果列表：显示标题 + 标签 + 时间
3. 选中一条后，出现 4 个关系类型图标按钮，点选一个
4. 可选填备注（≤50字）
5. 确认 → 创建关联

**删除关联**：长按或左滑关联条目，出现删除按钮。

#### 3.4.2 AI 推荐关联

**触发时机**：心得详情页加载时，如果当前心得还没有关联，自动调用 `/api/entries/[id]/link-suggestions`。

**AI 推荐逻辑**（后端）：
1. 查找与当前心得共享标签的其他心得（优先）
2. 取这些心得的标题 + 摘要，连同当前心得一起发给 DeepSeek
3. Prompt："以下心得了与当前心得是否存在知识关联？如有，判断关系类型（串行/总分/关联/启发）"
4. 返回候选列表，前端显示为「你可能还想到了…」建议条
5. 用户点击「+ 确认关联」→ 直接创建关联（source = 'ai'）
6. 用户点击「× 忽略」→ 不再提示该建议

**频率控制**：每次打开详情页最多推荐一次，已确认或忽略的不再重复推荐（通过 UserSetting 或内存状态控制）。

#### 3.4.3 根系页 —— 知识图谱可视化

**位置**：根系页新增一个「知识图谱」卡片入口，点击进入全屏图谱视图。

**技术方案**：使用 `reagraph` 库（WebGL 渲染，React 原生组件）。

**数据映射**：
- 每个心得 = 一个节点（显示标题前 6 字）
- 每条 EntryLink = 一条边（颜色/样式按 relationType 区分）
- 节点大小 = 该心得的关联数量（关联越多节点越大）

**交互**：
- 点击节点 → 跳转到该心得详情页
- 拖拽/缩放 → 自由浏览
- 节点高亮 → 显示关联关系类型

**安装**：`npm install reagraph`（约 200KB gzipped）

### 3.5 涉及文件

| 文件 | 变更内容 |
|------|---------|
| `prisma/schema.prisma` | 新增 EntryLink 模型 |
| `app/api/entries/[id]/links/route.ts` | **新建**，GET/POST 关联 CRUD |
| `app/api/links/[id]/route.ts` | **新建**，DELETE 删除关联 |
| `app/api/entries/[id]/link-suggestions/route.ts` | **新建**，AI 推荐关联 |
| `app/entry/[id]/view/page.tsx` | 新增「关联心得」区块 + 「联想」按钮 + 搜索弹窗 |
| `components/LinkPanel.tsx` | **新建**，关联列表 + 添加关联面板组件 |
| `components/LinkSearchModal.tsx` | **新建**，搜索心得 + 选择关系类型的弹窗组件 |
| `app/(main)/root/page.tsx` | 新增「知识图谱」入口卡片 |
| `app/(main)/root/graph/page.tsx` | **新建**，知识图谱全屏可视化页面 |
| `lib/deepseek.ts` | 新增 `suggestEntryLinks` 函数 |

---

## 四、实施阶段

| 阶段 | 内容 | 预估工作量 | 依赖 |
|------|------|-----------|------|
| **阶段 1** | 数据库迁移（Entry 加 reviewedAt + 新建 EntryLink 表） | 小 | 无 |
| **阶段 2** | F13 复习追踪：API + 萌芽页筛选 + 详情页自动标记 | 中 | 阶段 1 |
| **阶段 3** | F14 知识关联：关联 CRUD API + 详情页联想面板 + 搜索弹窗 | 中 | 阶段 1 |
| **阶段 4** | F14 AI 推荐：DeepSeek 关联建议 + 前端建议条 | 中 | 阶段 3 |
| **阶段 5** | F14 知识图谱：reagraph 集成 + 根系页图谱页面 | 中 | 阶段 3 |
| **阶段 6** | 枝叶页复习进度 + 整体联调 + 部署 | 小 | 阶段 2 + 3 |

---

## 五、约束与注意事项

1. **EntryLink 唯一性**：同一对心得（from→to）只允许一条关联，避免重复
2. **删除心得时**：EntryLink 通过级联删除自动清除，无需额外处理
3. **AI 推荐频率**：避免每次打开详情页都调 DeepSeek，建议加缓存（同一心得 24 小时内只推荐一次）
4. **reagraph 包体积**：约 200KB gzipped，仅在图谱页面懒加载（`next/dynamic`），不影响其他页面性能
5. **复习标记自动化**：进入详情页即自动标记，无需用户手动操作
6. **标签变动不影响复习状态**：reviewedAt 绑定在 Entry 上，与 Tag 无关
7. **分享页不受影响**：访客看到的分享页不显示关联和复习状态（仅所有者可见）
8. **约束文档同步**：开发完成后更新 `doc/新芽dev-framework.md`，新增 F13、F14 功能条目

---

## 六、待用户确认的决策点

| 编号 | 决策项 | 选项 |
|------|--------|------|
| D1 | 复习模式选择 | A. 已读标记（本方案） / B. 批次快照 / C. 每日推送 / D. 按标签分批 |
| D2 | 关系类型是否就这 4 种 | 串行 / 总分 / 关联 / 启发，是否需要增减？ |
| D3 | AI 推荐是否第一批就做 | 阶段 4 可以后续再做，先手动标注也行 |
| D4 | 知识图谱是否第一批就做 | 阶段 5 可以后续再做，不影响核心功能 |
| D5 | 联想按钮放在详情页哪个位置 | 正文下方（本方案） / 底部操作栏 / 顶部导航栏旁 |
