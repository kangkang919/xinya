# 新电脑快速安装心芽程序 Prompt

> 新电脑安装完 Qoder 后，直接把下面这段 Prompt 复制给 Qoder，即可快速理解项目并恢复开发环境。

---

## 复制以下内容发送给 Qoder：

```
我是心芽项目的开发者，刚换了新电脑（Windows 11）。请帮我完成以下工作：

### 1. 了解项目
请先阅读以下文档，全面了解项目：
- D:\Project Qoder\xinya\doc\心芽项目资料索引.md（项目总览）
- D:\Project Qoder\xinya\doc\新芽dev-framework.md（开发范式，最高执行标准）
- D:\Project Qoder\xinya\doc\新电脑程序转移主人提醒.md（环境配置清单）

### 2. 确认环境
- Node.js 版本：需要 v20.x LTS（与服务器一致）。如未安装请提醒我安装：https://nodejs.org
- Git：确认已安装。如未安装：https://git-scm.com
- 不需要 Python、不需要本地 PostgreSQL 数据库

### 3. 初始化本地开发环境
项目代码已在 D:\Project Qoder\xinya\ 下（从 GitHub clone 的完整代码，含 .git）。请执行：
1. 在 D:\Project Qoder\xinya\ 下运行 npm install 安装依赖
2. 运行 npx prisma generate 生成 Prisma Client
3. 确认 .env 文件存在且配置正确（数据库连接指向本地或测试环境）
4. 运行 npm run dev 启动开发服务器，确认 http://localhost:3000 可访问

### 4. 确认双平台 Git 配置
项目采用 GitHub + Gitee 双平台同步：
- GitHub 仓库：https://github.com/kangkang919/xinya（远程名：origin）
- Gitee 仓库：https://gitee.com/kangkang919/xinya.git（远程名：gitee）
- 连接方式：HTTPS（账号密码）
- 请执行 git remote -v 确认两个远程仓库都已配置
- 如缺少 gitee 远程，执行：git remote add gitee https://gitee.com/kangkang919/xinya.git

### 5. 项目技术栈概要
- Next.js 16.2.9 + React 19 + TypeScript 5
- Prisma 6 + PostgreSQL 13（数据库在阿里云服务器，本地不装）
- Tailwind CSS 4
- Node.js 20.x LTS
- 部署目标：阿里云 ECS（47.100.106.213），PM2 管理
- 服务器从 Gitee 拉取代码

### 6. 工作流程
- 本地修改代码 → git push origin main（推 GitHub）→ git push gitee main（推 Gitee）
- 服务器部署：git fetch gitee && git reset --hard gitee/main && npm run build && pm2 restart xinya
- 所有文档在 doc/ 文件夹下
- 开发范式文档（新芽dev-framework.md）是最高执行标准，任何需求变更需先对照此文档

请开始执行，每一步完成后告诉我结果。
```

---

## 新电脑安装顺序

1. **安装 Node.js v20.x LTS** — https://nodejs.org（选 LTS 版本，与服务器 v20.20.2 一致）
2. **安装 Git** — https://git-scm.com
3. **安装 Qoder** — AI 编程助手
4. **克隆代码**：
   ```bash
   git clone https://github.com/kangkang919/xinya 'D:\Project Qoder\xinya'
   ```
5. **配置 Gitee 远程**：
   ```bash
   cd 'D:\Project Qoder\xinya'
   git remote add gitee https://gitee.com/kangkang919/xinya.git
   ```
6. **复制上面的 Prompt** 发送给 Qoder，它会自动完成环境初始化和项目理解

## 不需要安装的软件

- ❌ Python（项目不需要）
- ❌ PostgreSQL（数据库在服务器上，本地不装）
- ❌ VS Code（Qoder 内置编辑器可替代，如习惯用 VS Code 可自行安装）
