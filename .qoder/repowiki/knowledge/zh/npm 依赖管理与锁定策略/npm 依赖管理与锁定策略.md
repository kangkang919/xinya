---
kind: dependency_management
name: npm 依赖管理与锁定策略
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - package-lock.json
    - ecosystem.config.js
---

本项目采用 npm 作为包管理器，通过 package.json 声明依赖、package-lock.json 锁定版本，形成标准的单仓库依赖管理方案。

系统与方法：
- 包管理器：npm（README 与文档中同时列出 yarn/pnpm/bun 命令，但实际使用 npm install / npm run）
- 锁文件：package-lock.json（lockfileVersion: 3），提交至版本库以保障构建可重现
- 无私有 npm 仓库或 .npmrc 配置，所有依赖均从 https://registry.npmjs.org 拉取
- 无 vendor/ 目录，不 vendoring 第三方源码

关键文件：
- package.json：声明 dependencies 与 devDependencies，定义 scripts 与 postinstall 钩子
- package-lock.json：完整依赖树快照，包含每个包的 resolved URL 与 integrity hash
- ecosystem.config.js：PM2 部署脚本，配合 npm run build 完成生产构建与进程重启

架构与约定：
- 运行时依赖集中在 dependencies：Next.js 16.2.9、React 19.2.4、Prisma Client、bcryptjs、jsonwebtoken、nodemailer、lucide-react、react-hot-toast 等
- 开发依赖集中在 devDependencies：TypeScript、ESLint、Tailwind CSS v4、@types/* 类型声明、eslint-config-next 等
- 通过 postinstall: prisma generate 在安装后自动生成 Prisma 客户端，确保数据库访问代码可用
- 脚本约定：dev/build/start/lint/db:deploy 统一入口，避免直接调用 next/prisma CLI

开发者应遵循的规则：
1. 新增依赖时仅修改 package.json，不要手动编辑 package-lock.json；提交二者以保持同步
2. 区分 runtime 与 dev 依赖，仅在 dependencies 中放入运行期需要的包
3. 升级依赖时使用 npm update <pkg> 或 npm install <pkg>@latest --save，并检查 package-lock.json 变更
4. 如需切换包管理器（yarn/pnpm/bun），需同步更新 README 与 CI/部署脚本中的命令
5. 若引入私有包，需在项目根添加 .npmrc 配置 registry 与认证 token，并在 CI 环境中注入对应环境变量