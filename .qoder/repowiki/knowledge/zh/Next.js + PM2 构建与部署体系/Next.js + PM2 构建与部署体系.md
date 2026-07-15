---
kind: build_system
name: Next.js + PM2 构建与部署体系
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - deploy.sh
    - ecosystem.config.js
    - next.config.ts
    - prisma/schema.prisma
---

本项目采用基于 npm scripts + Prisma CLI + PM2 的轻量级构建与部署方案，无 Docker、CI/CD 流水线或 Makefile。

构建系统核心：使用 Next.js 16.2.9 作为全栈框架，通过 next build 生成生产产物，next start 启动服务；依赖管理由 npm 负责，postinstall 钩子自动执行 prisma generate 生成数据库客户端；数据库迁移通过 prisma migrate deploy 在生产环境执行，schema 定义位于 prisma/schema.prisma。

开发脚本约定（package.json scripts）：npm run dev 本地开发模式，npm run build 生产构建，npm run start 启动生产服务器，npm run lint ESLint 代码检查，npm run db:deploy 执行数据库迁移。

生产部署流程：通过根目录 deploy.sh 一键部署，顺序为安装依赖、prisma generate、prisma migrate deploy、next build、PM2 启动；应用进程由 PM2 管理，配置文件 ecosystem.config.js 指定监听端口 3000、实例数 1、最大内存 512M；部署目标路径硬编码为 /www/wwwroot/xinya，访问地址为 http://47.100.106.213:3000。

构建配置：next.config.ts 保持默认空配置，未启用自定义输出目录、CDN 等高级选项；tsconfig.json 和 eslint.config.mjs 提供 TypeScript 与 ESLint 基础规则；样式构建链为 Tailwind CSS v4 + PostCSS（postcss.config.mjs）。

约束与注意事项：部署脚本中 pm2 以 -g 全局安装，建议改为项目内安装以保证可重现性；环境变量通过 .env.example 模板提供，但部署脚本未显式处理 .env.production 加载；当前无多阶段构建、缓存优化或增量部署策略。