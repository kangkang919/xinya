# 豆苗（学习助手数字人）产品需求文档 — 技术实现方案

> 身份牌：🟢 活文档（用户已确认 2026-09-02，开发完成待验收）｜权威来源：需求文档 + 本会话技术方案确认｜最后核对：2026-09-02
> 前置依赖：`doc/豆苗学习助手-需求文档.md`（需求已定稿）
> 本文件设计为「开发蓝本」，开发人员应以此文档为指导进行编码

---

## 1. 架构概览

### 1.1 模块定位

豆苗是心芽的**独立功能模块**，与现有功能完全解耦：
- 独立的 Prisma 模型（`Assistant*` 前缀，区别于现有表）
- 独立的 API 路由前缀 `app/api/assistant/*`
- 独立的 lib 目录 `lib/assistant/*`
- 独立的页面路由 `app/assistant/`
- 删除时：移除上述全部文件 + 清空数据库中所有 `Assistant*` 表

### 1.2 数据流

```
用户输入文字
    │
    ▼
app/assistant/page.tsx (客户端组件)
    │  POST /api/assistant/chat
    ▼
app/api/assistant/chat/route.ts (API路由)
    │
    ├─ 1. 越界判定（关键词检查，快速拒绝省成本）
    │     └─ 越界 → 直接返回兜底话术，不调 LLM
    │
    ├─ 2. lib/assistant/retrieve.ts（三级检索）
    │     ├─ 标签匹配 → 标记【高优先级】
    │     ├─ 标题匹配 → 标记【中优先级】
    │     └─ 内容匹配 → 标记【低优先级】
    │
    ├─ 3. lib/assistant/memory.ts（记忆读取）
    │     └─ 命中相关记忆时注入
    │
    ├─ 4. lib/assistant/chat.ts（构建 Prompt + 调用 DeepSeek）
    │     ├─ 读取 AssistantProfile（人设设置）
    │     ├─ 读取近期对话历史（最近 30 轮）
    │     ├─ 组装 System Prompt（Layer 1-8）
    │     ├─ 调用 lib/deepseek.ts 模式（fetch → 30s 超时 → 重试）
    │     └─ 解析并校验回答
    │
    ├─ 5. 保存对话（AssistantMessage × 2：用户消息 + 豆苗回复）
    │
    ├─ 6. lib/assistant/usage.ts（记录消耗）
    │     └─ token/费用写入 AssistantUsage
    │
    └─ 7. 记忆写入判定（每次对话后检查，按 §7.2 选择性写入规则）
          └─ 符合条件 → 写入 AssistantMemory
```

---

## 2. 新增文件清单

### 2.1 数据模型（Prisma 迁移）

在 `prisma/schema.prisma` 末尾追加以下模型：

```prisma
// ========== 豆苗学习助手数据模型 ==========

// 豆苗配置（每用户一条）
model AssistantProfile {
  id         String   @id @default(cuid())
  userId     String   @unique
  tone       String   @default("温暖鼓励")
  teach      String   @default("启发引导")
  call       String   @default("我 / 你")
  freeDesc   String   @default("")
  wizardDone Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// 对话消息（单一持续会话）
model AssistantMessage {
  id           String   @id @default(cuid())
  userId       String
  role         String   // "user" | "assistant"
  content      String
  retrievedTag String?  // 如「标签匹配：React（3篇）」或 null（非知识类问题不展示）
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
}

// 记忆条目（喜好与薄弱点）
model AssistantMemory {
  id          String   @id @default(cuid())
  userId      String
  type        String   // "interest" | "weak"
  title       String
  description String
  source      String   // "dialogue" | "quiz" | "user_specified"
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// 消耗记录（用于成本追溯审计）
model AssistantUsage {
  id            String   @id @default(cuid())
  userId        String
  inputTokens   Int      @default(0)
  outputTokens  Int      @default(0)
  model         String   @default("deepseek-chat")
  estimatedCost Float    @default(0)  // 估算费用（元）
  questionBrief String?  // 用户问题摘要（脱敏，≤30字，仅用于概览）
  createdAt     DateTime @default(now())

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
}
```

同时需要在 `User` 模型中追加关系字段：

```prisma
model User {
  // ... 现有字段不变，追加：
  assistantProfile  AssistantProfile?
  assistantMessages AssistantMessage[]
  assistantMemories AssistantMemory[]
  assistantUsages   AssistantUsage[]
}
```

### 2.2 核心库文件

```
lib/assistant/
├── prompts.ts          # Prompt 模板（分层 System Prompt + 检索注入格式 + 输出指令）
├── retrieve.ts         # 三级检索（标签/标题/内容）
├── chat.ts             # 聊天核心（意图判定 → 检索 → 构建 → 调用 → 保存）
├── memory.ts           # 记忆读写（写入规则判断 + 查询）
└── usage.ts            # 消耗记录写入
```

### 2.3 API 路由

```
app/api/assistant/
├── chat/route.ts         # POST - 发送消息（核心接口）
├── messages/route.ts     # GET - 获取最近30轮 / DELETE - 清空对话历史
├── profile/route.ts      # GET - 获取配置 / PUT - 更新配置
├── stats/route.ts        # GET - 统计信息（心得篇数、当日是否首次登录等）
├── memories/
│   ├── route.ts          # GET - 记忆清单
│   └── [id]/route.ts     # DELETE - 删除单条记忆
└── usage/route.ts        # GET - 获取该用户近期消耗（管理用，P2）
```

### 2.4 前端页面与组件

```
app/assistant/
├── page.tsx              # 豆苗主页面，客户端组件（"use client"）
└── layout.tsx            # （可选）独立布局，使用心芽全局背景色但不带底部导航

components/assistant/     # 或者内联在 app/assistant/page.tsx 中，按需抽取
├── ChatMessage.tsx       # 消息气泡组件（豆苗/用户）
├── ChatInput.tsx         # 输入栏组件
├── WizardGuide.tsx       # 首次使用设置向导
├── MemorySheet.tsx       # 记忆清单弹层
├── SettingSheet.tsx      # 设置弹层
└── EmptyState.tsx        # 0 心得空态
```

### 2.5 修改的现有文件

| 文件 | 修改内容 |
|------|---------|
| `prisma/schema.prisma` | 追加 4 个 Assistant* 模型 + User 模型追加关系字段 |
| `lib/deepseek.ts` | 新增 `chatWithDeepSeek()` 函数（对话模式，非结构化 JSON 输出） |
| `app/(main)/layout.tsx` | 底部导航新增「豆苗」入口（若选择放入主导航；待定） |

---

## 3. 核心逻辑设计

### 3.1 lib/assistant/prompts.ts — Prompt 模板

导出以下函数/常量：

```typescript
// 构建系统级 System Prompt（Layer 1-4 固定部分 + Layer 5-6 动态注入）
export function buildSystemPrompt(profile: AssistantProfile): string

// 构造检索结果注入块（Layer 7 → 用于 chat 组合）
export function buildRetrievalBlock(
  tagResults: SearchResult[],
  titleResults: SearchResult[],
  contentResults: SearchResult[],
  totalCount: number
): string

// 构建记忆注入块（Layer 8）
export function buildMemoryBlock(memories: AssistantMemory[]): string

// 构建对话历史块（Layer 9）
export function buildHistoryBlock(messages: AssistantMessage[], maxRounds: number): string

// 宽泛提问检测
export function isBroadQuery(totalResults: number): boolean
```

**System Prompt 模板（简化结构，开发时最终定稿）：**

```
你是「豆苗」，心芽 app 中的学习心得小助手。
你只基于用户自己写下的心得来回答问题。

## 豆苗的性格（以下来自用户的设置，请严格遵守）
语气风格：{tone}
指导方式：{teach}
角色称呼：{call}
自由润色：{free_desc}

## 核心规则（必须遵守）
{output_instructions 见需求文档 §5.5.1}
```

`output_instructions` 是从需求文档 §5.5.1 和 §5.5.2 直接提取的完整指令块。

### 3.2 lib/assistant/retrieve.ts — 三级检索

```typescript
interface SearchResult {
  entryId: string
  title: string
  keyPoints: string
  tags: string[]
  recordTime: Date
  priority: 'high' | 'medium' | 'low'
  matchType: 'tag' | 'title' | 'content'
}

export async function retrieve(userId: string, question: string): Promise<{
  tagMatches: SearchResult[]     // ≤ 5
  titleMatches: SearchResult[]   // ≤ 3
  contentMatches: SearchResult[] // ≤ 5
  totalCount: number
}>
```

实现要点：
- `tagMatches`：提取 question 关键词 → 匹配 `Tag.name`（含父子标签，递归查 parentId）→ 查 `EntryTagSort` 或 `Entry.tags` 关联 → 取最新的 5 篇 `isDraft = false` 的心得
- `titleMatches`：question 关键词 → `Entry.title` ILIKE 匹配（PostgreSQL `%keyword%`）→ 取最新的 3 篇
- `contentMatches`：question 关键词 → `Entry.content` ILIKE 匹配（只查前 500 字）→ 按关键词出现频率降序，取前 5 篇
- **三条独立执行，互不干扰**
- 不做去重（同一篇心得可能同时命中标签和标题，保留两条不同优先级的记录，LLM 以高优先级为准）
- 命中总计数只是简单加和，用于触发宽泛提问逻辑

### 3.3 lib/assistant/chat.ts — 聊天核心

```typescript
export async function handleChat(userId: string, question: string): Promise<{
  reply: string
  retrievedTag: string | null
}>
```

处理流程：
1. **越界快速判定**：正则匹配敏感/无关词列表（天气/电影/笑话/股票/美食/新闻/游戏/推荐），含 → 返回兜底话术①，**不调 LLM**
2. **读取配置**：查 `AssistantProfile`，无配置 → 使用默认值（温暖鼓励/启发引导/我·你）
3. **三级检索**：调用 `retrieve()`
4. **命中判定**：totalCount === 0 → 返回兜底话术②
5. **读取记忆**：根据提问相关度，注匹配的记忆
6. **读取对话历史**：最近 30 轮（user + assistant 交替）
7. **构建 LLM 请求**：
   - messages = [system_prompt, retrieval_block, memory_block, ...history, user_question]
   - model: "deepseek-chat"
   - temperature: 0.7
   - max_tokens: 1000
8. **调用 DeepSeek**：复用现有 `fetch` + 30s 超时 + 重试 1 次模式
9. **保存对话**：user 消息 + assistant 回复写入 `AssistantMessage`
10. **记录消耗**：写入 `AssistantUsage`
11. **（异步非阻塞）记忆写入判定**

**越界判定细化方案**：
- 一级过滤（快速）：正则黑名单 `天气|电影|笑话|股票|美食|新闻|游戏|推荐|帮我写|帮我查|搜索` → 直接拒绝
- 二级过滤（兜底）：注入 System Prompt 中的边界规则，让 LLM 自己判断并返回拒绝话术（防止正则漏判）
- 注意：基本寒暄词（你好/谢谢/再见/辛苦了）走正则白名单 → 直接小白寒暄回应，不调 LLM

### 3.4 lib/assistant/memory.ts — 记忆系统

```typescript
export async function getMemories(userId: string): Promise<AssistantMemory[]>
export async function deleteMemory(memoryId: string, userId: string): Promise<void>
export async function evaluateMemoryWrite(
  userId: string,
  question: string,
  reply: string,
  retrievedResults: { tags: string[]; titles: string[] },
  quizRecords: QuizRecord[]
): Promise<void>
```

`evaluateMemoryWrite` 判断逻辑（选择性写入规则）：
1. 用户回复中明确表达偏好/困难（关键词匹配：**喜欢|感兴趣|觉得…好难|老是错|不懂**等）→ 解析主题写入
2. 同一主题在历史对话中重复出现（检查最近 20 轮历史，同一标签/标题出现 ≥ 2 次）→ 写入
3. 结合 QuizRecord：同一标签相关题目正确率 < 60% → 写入薄弱点（不重复写入已有记忆）
4. 用户明确说「记住」类指令 → 立即写入
5. 上述条件都不满足 → 不写入（不把每句话都变成记忆）

### 3.5 lib/assistant/usage.ts — 消耗记录

```typescript
export async function recordUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number,
  questionBrief: string,
  model?: string
): Promise<void>
```

费用估算：
- DeepSeek Chat 模型价格：约 ¥0.001 / 1K input tokens，¥0.002 / 1K output tokens（以实际 API 定价为准）
- `estimatedCost` = (inputTokens × inputPrice + outputTokens × outputPrice) / 1000

### 3.6 lib/deepseek.ts — 新增对话模式

```typescript
// 新增函数：对话模式（不同于现有的结构化 JSON 输出模式）
export async function chatWithDeepSeek(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<string | null>
```

复用现有 deepseek.ts 的 fetch/超时/重试模式，但：
- messages 参数为完整数组（含 system/user/assistant 角色）
- 不要求 JSON 输出，直接返回 content 文本
- token 上限：1000（可通过 options 覆盖）

---

## 4. API 接口设计

### 4.1 POST /api/assistant/chat — 发送消息

**请求体：**
```json
{
  "question": "我写过哪些关于 React 的心得？"
}
```

**响应（成功）：**
```json
{
  "ok": true,
  "data": {
    "reply": "你写过3篇关于React的……",
    "retrievedTag": "从 23 篇心得中找到 3 篇（标签匹配：React）",
    "messageId": "ckl…"
  }
}
```

**响应（越界拒绝）：**
```json
{
  "ok": true,
  "data": {
    "reply": "这个话题我还不太了解……",
    "retrievedTag": null,
    "messageId": "ckl…"
  }
}
```

**响应（错误）：**
```json
{
  "ok": false,
  "error": "服务暂时不可用，请稍后再试"
}
```

### 4.2 GET /api/assistant/messages — 获取历史

**查询参数：** `?limit=30&before={cursor}`（分页，推荐首页取 30 条，后续按需往前翻）

**响应：**
```json
{
  "ok": true,
  "data": {
    "messages": [
      { "id": "…", "role": "assistant", "content": "…", "retrievedTag": null, "createdAt": "…" },
      { "id": "…", "role": "user", "content": "…", "retrievedTag": null, "createdAt": "…" }
    ],
    "hasMore": false
  }
}
```

### 4.3 DELETE /api/assistant/messages — 清空对话历史

**响应：** `{ "ok": true }`

### 4.4 GET /api/assistant/profile — 获取配置

**响应：**
```json
{
  "ok": true,
  "data": {
    "tone": "温暖鼓励",
    "teach": "启发引导",
    "call": "我 / 你",
    "freeDesc": "",
    "wizardDone": false,
    "entryCount": 23
  }
}
```

### 4.5 PUT /api/assistant/profile — 更新配置

**请求体：**
```json
{
  "tone": "活泼俏皮",
  "teach": "苏格拉底式提问",
  "call": "我 / 你",
  "freeDesc": "你是一个温柔的女老师……",
  "wizardDone": true
}
```

**响应：** `{ "ok": true }`

### 4.6 GET /api/assistant/stats — 统计信息

**响应：**
```json
{
  "ok": true,
  "data": {
    "entryCount": 23,
    "quizRecordCount": 8,
    "isNewUser": false
  }
}
```

### 4.7 GET /api/assistant/memories — 记忆清单

**响应：**
```json
{
  "ok": true,
  "data": [
    { "id": "…", "type": "weak", "title": "CSS 布局", "description": "答题正确率约 60%…", "source": "quiz", "createdAt": "…" }
  ]
}
```

### 4.8 DELETE /api/assistant/memories/[id] — 删除单条记忆

**响应：** `{ "ok": true }`

---

## 5. 前端实现要点

### 5.1 app/assistant/page.tsx 结构

```
"use client" 组件

未完成向导(wizardDone=false)：
  → WizardGuide（3步设置，嵌入 page 内部，不走弹层）
  → 跳过/完成 → wizardDone=true → 重新加载渲染

已完成向导 + entryCount > 0：
  → 渲染完整的聊天界面（顶栏 + 消息区 + 输入区 + 侧弹层）
  → 首次进入（无历史消息）：显示豆苗打招呼消息
  → 有历史消息：加载最近 30 轮，可向上滚动加载更多

已完成向导 + entryCount === 0：
  → EmptyState（灰色头像 + 提示 + 隐藏聊天框 + 去写心得按钮）
```

### 5.2 关键交互细节

| 功能 | 实现方式 |
|------|---------|
| 发送消息 | `fetch POST /api/assistant/chat` → 等待回复 → 追加到消息列表 |
| 输入时禁用按钮 | 发消息时输入框 disabled + 发送按钮旋转加载，防止重复提交 |
| 历史翻看 | 初始加载最近 30 条；滚动到顶部触发加载更早的消息（cursor 分页）|
| 清空历史 | DELETE 请求后清除本地消息列表，刷新为豆苗新打招呼 |
| 记忆清单弹层 | Modal 内嵌列表，每条有删除按钮；删除后即时更新本地状态 |
| 设置弹层 | 维度单选 + 自由描述 textarea + 保存按钮；保存后 profile 更新 |
| 0 心得空态 | 进页面时通过 GET /api/assistant/stats 的 entryCount 判断 |
| 响应式 | 页面 max-w-[760px] mx-auto，手机端全宽 + 内边距 |

### 5.3 导航入口

豆苗的入口位置需要用户确认（§13 待确认清单第 8 项）：
- **选项 A**：添加到底部导航栏（新增第 5 个 tab「豆苗」，图标为豆苗叶子 SVG）
- **选项 B**：放在「根系」侧边栏或某个页面内的入口按钮

**开发时先以选项 A 实现**（便于用户验收时切换），底部导航新增：

```jsx
{/* 豆苗 */}
<button
  className="flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all"
  style={{ color: isActive('/assistant') ? activeColor : inactiveColor }}
  onClick={() => router.push('/assistant')}
>
  <svg>…</svg>  {/* 豆苗叶子图标 */}
  <span className="text-[10px] font-medium">豆苗</span>
</button>
```

### 5.4 头像处理

- 头像图片 `doumiao-avatar.png` 存放路径：`public/assistant/doumiao-avatar.png`（开发时从 doc/ 复制到 public/）
- 在页面中尺寸：
  - 消息区豆苗头像：34×34（圆形，CSS `object-fit: cover; object-position: center 22%`）
  - 向导页大图：84×84
  - 0 心得空态大图：120×120 + 灰度滤镜

---

## 6. 涉及现有文件的修改

### 6.1 prisma/schema.prisma

- 追加 4 个模型（见 §2.1 完整代码）
- 修改 User 模型追加 4 个关系字段

### 6.2 lib/deepseek.ts

新增 `chatWithDeepSeek(messages, options?)` 函数（对话模式）：
- 输入：完整的 message 数组
- 输出：回答文本或 null
- 复用现有 30s 超时 + 1 次重试 + 错误日志模式

### 6.3 app/(main)/layout.tsx

底部导航新增「豆苗」tab（移至 §5.3 的选项 B 由用户确认后实施）

---

## 7. 部署与迁移

### 7.1 数据迁移

```bash
npx prisma migrate dev --name add_assistant_models
```

此操作会：
- 创建 `AssistantProfile`、`AssistantMessage`、`AssistantMemory`、`AssistantUsage` 四张表
- 自动在 `User` 表建立外键关系

### 7.2 静态资源

将 `doc/doumiao-avatar.png` 复制到 `public/assistant/doumiao-avatar.png`

```bash
cp doc/doumiao-avatar.png public/assistant/doumiao-avatar.png
```

### 7.3 环境变量

无新增环境变量（复用现有 `DEEPSEEK_API_KEY`）

---

## 8. 删除方案

### 8.1 代码删除

移除以下文件/目录：
```
lib/assistant/           → 整个目录
app/api/assistant/       → 整个目录
app/assistant/           → 整个目录
components/assistant/    → 整个目录
public/assistant/        → 整个目录
```

还原现有文件中的修改：
- `prisma/schema.prisma`：移除 Assistant* 模型 + User 模型中的关系字段
- `lib/deepseek.ts`：移除 `chatWithDeepSeek` 函数
- `app/(main)/layout.tsx`：移除底部导航「豆苗」按钮

### 8.2 数据清理

```bash
# Prisma migrate 回滚（移除四张表）
# 或手动 DROP TABLE
DROP TABLE IF EXISTS "AssistantUsage" CASCADE;
DROP TABLE IF EXISTS "AssistantMemory" CASCADE;
DROP TABLE IF EXISTS "AssistantMessage" CASCADE;
DROP TABLE IF EXISTS "AssistantProfile" CASCADE;
```

### 8.3 静态资源

删除 `public/assistant/` 目录

---

## 9. 开发顺序建议（按依赖关系）

| 步骤 | 内容 | 估算 |
|------|------|------|
| 1 | Prisma 模型定义 + `prisma migrate` | 0.5h |
| 2 | `lib/deepseek.ts` 追加 `chatWithDeepSeek` | 0.5h |
| 3 | `lib/assistant/prompts.ts`（Prompt 模板） | 1h |
| 4 | `lib/assistant/retrieve.ts`（三级检索） | 2h |
| 5 | `lib/assistant/chat.ts`（聊天核心 + 越界判定） | 2h |
| 6 | `lib/assistant/memory.ts`（记忆系统） | 1.5h |
| 7 | `lib/assistant/usage.ts`（消耗记录） | 0.5h |
| 8 | `app/api/assistant/*`（全套 API 路由） | 2h |
| 9 | `app/assistant/page.tsx` + 组件（前端页面） | 4h |
| 10 | 底部导航入口 + 细节打磨 + 空态 | 1h |
| 11 | 本地验证（各边界测试） | 2h |
| | **合计** | **~17h（约 3 个完整工作日）** |

---

## 10. 验收要点（技术级）

- [ ] `prisma migrate` 成功执行，四张新表创建完毕
- [ ] POST /api/assistant/chat：正常问答返回豆苗回复
- [ ] POST /api/assistant/chat：越界问题返回兜底话术，不调用 LLM
- [ ] POST /api/assistant/chat：检索结果为 0 时返回检索无果兜底
- [ ] 三级检索各自独立：标签命中只走标签，标题命中走标题
- [ ] 三级检索总计 > 10 条时触发宽泛提问处理
- [ ] 记忆系统选择性写入：符合条件才写入，不每条对话都写
- [ ] 记忆可见可删：GET/DELETE 正常
- [ ] 对话历史保留最近 30 轮，多设备同步
- [ ] 0 心得空态正确显示（隐藏聊天框，灰头像，去写心得按钮）
- [ ] 向导设置（3 步 + 跳过）→ 配置写入 AssistantProfile
- [ ] 设置修改后对新对话生效，历史对话不变
- [ ] 删除豆苗全功能：代码移除 + 数据清理后，心芽其他功能不受影响
- [ ] 响应式布局：手机/桌面无压盖/截断（规定见需求文档 §9.4）
- [ ] 每次调用均有 AssistantUsage 记录