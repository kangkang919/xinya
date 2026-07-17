# 新电脑快速安装心芽程序 Prompt

> 新电脑安装完 Qoder 后，直接把下面这段 Prompt 复制给 Qoder，即可快速理解项目并恢复开发环境。
> 最后更新：2026-07-16

---

## 复制以下内容发送给 Qoder：

```
我是心芽项目的开发者，刚换了新电脑（Windows 10）。请帮我完成以下工作：

### 1. 了解项目
请先阅读以下文档，全面了解项目：
- D:\Project Qoder\xinya\doc\心芽项目资料索引.md（项目总览，含完整目录结构和技术栈）
- D:\Project Qoder\xinya\doc\新芽dev-framework.md（开发范式，最高执行标准，必读）
- D:\Project Qoder\xinya\doc\新电脑程序转移主人提醒.md（环境配置清单和敏感信息）

### 2. 确认 Node.js 版本
重要：先确认服务器实际运行的 Node.js 版本，新电脑开发环境必须与服务器一致。
请在服务器上执行：ssh admin@47.100.106.213 然后 node -v
- 如果服务器是 v20.x → 新电脑安装 Node.js v20.x LTS
- 如果服务器是 v22.x → 新电脑安装 Node.js v22.x LTS
- 下载地址：https://nodejs.org（选对应的 LTS 版本）
- 安装后验证：node -v 和 npm -v

### 3. 确认基础软件
- [ ] Node.js（版本与服务器一致）已安装
- [ ] Git 已安装（https://git-scm.com）
- [ ] Qoder 已安装并登录原账号
- 不需要安装：Python、PostgreSQL（数据库在服务器上，本地直连）

### 4. 克隆代码并初始化
项目代码从 GitHub 克隆（注意路径含空格，必须加引号）：
```bash
git clone https://github.com/kangkang919/xinya "D:\Project Qoder\xinya"
```

进入项目目录，添加 Gitee 远程仓库：
```bash
cd "D:\Project Qoder\xinya"
git remote add gitee https://gitee.com/kangkang919/xinya.git
git remote -v
```
验证：应显示 origin（GitHub）和 gitee（Gitee）两个远程。

### 5. 配置 Git 用户信息
```bash
git config --global user.name "kangkang919"
git config --global user.email "你的邮箱"
```

### 6. 配置 GitHub PAT（Personal Access Token）
新电脑需要重新生成 PAT，步骤如下：
1. 登录 GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. 点击 "Generate new token"
3. Token name 填 "xinya-new-pc"
4. Expiration 选 "No expiration"（或 90 天）
5. Repository access → 选 "Only select repositories" → 选 kangkang919/xinya
6. Permissions → Contents → Read and write
7. 生成后**立即复制保存**，后续推送代码需要
8. 推送时 Git 会提示输入用户名和密码，用户名填 GitHub 用户名，密码填 PAT

### 7. 配置环境变量
将 .env.example 复制为 .env，填写真实值：
```bash
copy .env.example .env
```
需要填写的内容（参考 doc/.env.production.备份 或询问开发者）：
- DATABASE_URL：直连服务器数据库 "postgresql://xinya:密码@47.100.106.213:5432/xinya_db"
- JWT_SECRET：随机字符串，32 位以上
- SMTP_USER：1243177461@qq.com
- SMTP_PASS：QQ 邮箱 SMTP 授权码
- NEXT_PUBLIC_BASE_URL：http://localhost:3000（本地开发）
- DEEPSEEK_API_KEY：如使用 AI 功能

### 8. 安装依赖并启动
```bash
cd "D:\Project Qoder\xinya"
npm install
npx prisma generate
npm run dev
```
浏览器打开 http://localhost:3000，确认页面正常显示。

### 9. 项目技术栈概要
- Next.js 16.2.9 + React 19 + TypeScript 5 + Tailwind CSS 4
- Prisma 6 + PostgreSQL 13（数据库在阿里云服务器 47.100.106.213，本地直连）
- 认证：JWT (jose) + bcryptjs，Magic Link 邮件登录
- 邮件：nodemailer（QQ SMTP）
- AI：DeepSeek API（可选）
- 部署：阿里云 ECS + PM2，从 Gitee 拉取代码

### 10. 工作流程
- 本地修改 → git push origin main（推 GitHub）→ git push gitee main（推 Gitee）
- 服务器部署：git fetch gitee → git reset --hard gitee/main → rm -rf .next → npm run build → pm2 restart
- 所有文档在 doc/ 文件夹下
- 开发范式文档（新芽dev-framework.md）是最高执行标准
- 每次开发前必须读取 dev-framework 做范围核对
- 部署时必须主动提供服务器部署指令

请开始执行，每一步完成后告诉我结果。
```

---

## 新电脑安装顺序（操作者手动执行）

1. **确认服务器 Node.js 版本** — SSH 登录服务器执行 `node -v`
2. **安装 Node.js** — 下载与服务器相同版本的 LTS：https://nodejs.org
3. **安装 Git** — https://git-scm.com
4. **安装 Qoder** — AI 编程助手，登录原账号
5. **克隆代码**：
   ```bash
   git clone https://github.com/kangkang919/xinya "D:\Project Qoder\xinya"
   ```
6. **生成 GitHub PAT** — 按上述第 6 步操作，保存 PAT
7. **复制整个 doc 文件夹** — 从旧电脑拷贝 `D:\Project Qoder\xinya\doc` 到新电脑对应位置
   （包含 .env.production.备份 等敏感信息）
8. **复制上面的 Prompt** 发送给 Qoder，它会自动完成剩余配置

## 不需要安装的软件

- ❌ Python（项目不需要）
- ❌ PostgreSQL（数据库在服务器上，本地直连，不装）
- ❌ VS Code（Qoder 内置编辑器可替代，如习惯用可自行安装）

## 从旧电脑需要拷贝的内容

| 内容 | 路径 | 说明 |
|------|------|------|
| 项目文档 | `D:\Project Qoder\xinya\doc\` | 含 .env.production.备份 |
| 本地环境变量 | `D:\Project Qoder\xinya\.env` | 如有本地开发配置 |
| 整个项目文件夹 | `D:\Project Qoder\xinya\` | 或直接 git clone 后覆盖 doc |
