---
kind: logging_system
name: 基于 console.log 与数据库日志的轻量级记录方案
category: logging_system
scope:
    - '**'
source_files:
    - lib/review-scheduler.ts
    - app/api/entries/route.ts
    - app/api/review/backfill/route.ts
    - app/api/review/today/route.ts
---

本仓库未引入任何第三方日志框架（如 pino、winston、bunyan、morgan 等），也未在 package.json 中声明相关依赖。整体采用“两层混合”的轻量记录方式：

1. **运行时标准输出**：所有 API Route 和 lib 模块统一使用 Node.js 原生 `console.log` / `console.error`，并通过 `[模块名]` 前缀区分来源（例如 `[Login]`、`[Backfill]`、`[Scheduler]`）。错误路径一律走 `console.error`，正常流程用 `console.log`，无自定义 log level 管理。
2. **结构化业务日志持久化**：针对复习调度链路，在 `lib/review-scheduler.ts` 中提供 `logReviewCall(userId, entryId, step, success, questionCount, errorMsg?)` 函数，将调用结果写入 Prisma 表 `reviewCallLog`，并自动清理保留最近 30 条，避免无限增长。

**关键文件**
- `lib/review-scheduler.ts` — 唯一封装的业务日志写入逻辑（`logReviewCall`）
- `app/api/entries/route.ts`、`app/api/review/backfill/route.ts`、`app/api/review/today/route.ts` — 调用方，通过 import 复用该函数
- 各 `app/api/**/*.ts` — 散落分布的 `console.log` / `console.error` 调用点

**架构约定**
- 通用调试信息 → `console.log` + `[Tag]` 前缀
- 异常堆栈 → `console.error` + `[Tag]` 前缀
- 需要可查询、可审计的业务事件 → 调用 `logReviewCall` 落库
- 无全局 logger 初始化、无中间件拦截、无日志分级开关；PM2 仅负责进程守护，未配置独立日志收集器。

**开发者应遵循的规则**
- 新增 API 分支时，沿用 `[模块名]` 前缀风格打印 `console.log/error`。
- 涉及 AI 生成、外部调用成功/失败等需留存审计的事件，优先复用 `logReviewCall` 而非自行写 Prisma。
- 不要直接操作 `reviewCallLog` 表，统一通过 `lib/review-scheduler.ts` 暴露的函数访问，以保证 30 条上限清理策略一致生效。