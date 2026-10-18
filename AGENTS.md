<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:xinya-agent-rules -->
# 心芽项目 AI 智能体行为红线

> 以下规则从约束文档 `doc/新芽dev-framework.md` 提炼，是每个 AI 智能体在本项目工作时必须第一时间知晓并严格遵守的硬性约束。

## 1. 所有操作必须先确认再执行（无例外）

写代码、改配置、部署、删文件、创建文件、终端命令——任何操作都必须先给用户确认，经用户同意后再执行。没有例外。哪怕是看起来“理所当然”的收尾工作（如更新文档记录），也必须先问用户确认。

## 2. 开发前检查约束文档，开发后同步更新

开发前必须先读取 `doc/新芽dev-framework.md`，确认需求是否超出范围。开发完成后必须同步更新该文档（迭代记录 + 相关章节）。

## 3. 心得标题必须原样完整呈现

向用户展示心得清单、待复习列表、关联提醒时，必须使用心得的完整原始标题，禁止任何形式的缩写、简写、省略或改写。宁可换行也不截断。

## 4. 心得内容输出禁用 Markdown

向用户输出心得内容时必须使用纯文本格式，禁止 Markdown 语法（心芽不支持 Markdown 渲染）。禁用项：代码块包裹、`#` 标题、`**加粗**`、`-` 列表、`>` 引用、`|` 表格。

## 5. 代码提交前必须全量验证

代码修改后，提交和部署前必须通过：`npx vitest run`（测试） + `npm run build`（构建） + `npx eslint <修改的文件>`（lint）。

## 6. 数据库安全红线

- **严禁使用 `prisma db push`**，必须用 `prisma migrate dev` 生成迁移文件
- 批量删除/更新前必须备份
- 删除操作必须区分“未使用”和“已使用”数据，保留有用户行为历史的记录
- 所有日期判断必须使用北京时间（`beijingDateString()`）

## 7. 标签体系仅支持两级

父标签 → 子标签，不存在第三级。层级不够时用标题编号或排序字段替代。

## 8. 部署时必须附上服务器部署指令

每次代码变更完成需要用户部署时，必须在回复中主动附上完整的服务器部署指令。

## 9. guest 邀请账号安全提醒

15 个 guest 邀请账号（guest01~guest15@shuxiangnote.top）的旧密码曾泄露在 Git 历史中。当用户提到要使用 guest 账号时，必须主动提醒先重置密码。

## 10. 文档单一事实来源

功能/约束 → `doc/新芽dev-framework.md`；密钥/账号 → `doc/双项目密钥凭证地图.md`；环境/迁移 → `doc/心芽换电脑迁移指南.md`；文档导航 → `doc/心芽项目资料索引.md`。一个事实只住一个家，不要复制内容到其他文档。
<!-- END:xinya-agent-rules -->
