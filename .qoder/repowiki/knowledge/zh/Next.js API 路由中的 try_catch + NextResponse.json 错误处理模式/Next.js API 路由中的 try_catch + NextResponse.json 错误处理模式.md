---
kind: error_handling
name: Next.js API 路由中的 try/catch + NextResponse.json 错误处理模式
category: error_handling
scope:
    - '**'
source_files:
    - middleware.ts
    - app/api/auth/login/route.ts
    - app/api/entries/route.ts
    - lib/prisma.ts
---

本仓库未定义统一的错误类型或全局错误中间件，而是采用在每个 Route Handler 中就地使用 `try/catch` 包裹业务逻辑、通过 `NextResponse.json({ ok, error, status })` 返回结构化响应的方式处理错误。具体约定如下：

1. **请求参数校验失败**：在函数入口处直接返回 `{ ok: false, error: '中文提示' }`，HTTP 状态码为 400。
2. **鉴权失败**：调用 `getCurrentUserId()` 后若为空，返回 `{ ok: false }`，状态码 401；登录态过期或未登录的页面跳转由根级 `middleware.ts` 统一拦截并重定向到 `/login`。
3. **业务异常/未知错误**：用 `try/catch` 包裹异步操作，`catch(e)` 中 `console.error` 记录堆栈，再返回 `{ error: '通用失败提示' }`，状态码 500。
4. **前端 Promise 链式调用**：客户端侧对 `fetch` 结果先判断 `r.ok`，失败时 `throw new Error('...')` 交由上层 `.catch(e => setError(e.message))` 渲染到 UI；对于非关键副作用（如导出、统计）则使用 `.catch(() => {})` 静默吞掉错误，避免影响主流程。
5. **异步后台任务**：如条目创建后的 AI 题目预生成，采用 `preGenerateQuestions(...).catch(e => console.error(...))` 方式，不阻塞主响应且仅落盘日志。
6. **数据库层**：Prisma 实例在 `lib/prisma.ts` 中以环境变量控制日志级别，生产环境仅输出 `error`，开发环境额外输出 `query` 和 `warn`，无自定义 Prisma 错误转换。

该方案简单直接，但存在以下不足：没有统一的错误码枚举、错误对象类型或全局 `unhandledrejection` 处理器，导致不同 route 的错误字段名混用（有的带 `ok`，有的不带），前端需同时兼容两种响应结构。