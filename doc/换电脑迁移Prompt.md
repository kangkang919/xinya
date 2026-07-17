# 心芽项目换电脑迁移 Prompt

> 使用说明：当你需要更换电脑时，把以下全部内容复制粘贴给 Qoder，Qoder 会按步骤询问你必要信息并指导你完成迁移。
> 最后更新：2026-07-16

---

## 以下是需要发送给 Qoder 的 Prompt 内容

```
我要把心芽项目迁移到新电脑，请按以下步骤引导我完成。

### 第一步：收集必要信息
请先问我以下问题，等我逐一回答后再开始执行：

1. 新电脑是什么操作系统？（Windows / macOS）
2. 新电脑上是否已安装 Node.js？如果已安装，版本号是多少？（执行 `node -v` 查看）
3. 新电脑上是否已安装 Git？（执行 `git --version` 查看）
4. 新电脑上是否已安装 Qoder？
5. 你是否还记得以下信息？
   - GitHub 账号密码或 PAT（Personal Access Token）
   - Gitee 账号密码
   - 服务器 SSH 密码（IP: 47.100.106.213，用户: admin）
   - 数据库密码（PostgreSQL，用户名: xinya）
   - QQ 邮箱 SMTP 授权码（邮箱: 1243177461@qq.com）
6. 新电脑上 D 盘（或你希望存放项目的盘）是否已存在？你希望项目放在什么路径？
7. 你是否已从旧电脑拷贝了整个项目文件夹？还是打算直接 git clone？

### 第二步：根据回答执行迁移

根据我提供的信息，按以下流程指导我操作：

#### A. 旧电脑收尾（如果还能访问旧电脑）
- SSH 登录服务器确认 Node.js 版本：`ssh admin@47.100.106.213` → `node -v`
- 从服务器获取数据库密码：`cat /www/wwwroot/xinya/.env.production | grep DATABASE_URL`
- 验证 QQ 邮箱 SMTP 授权码是否有效（登录 mail.qq.com → 设置 → 账户 → POP3/SMTP）
- 如果 GitHub PAT 过期，重新生成（Settings → Developer settings → Fine-grained tokens → Generate new token → 选 kangkang919/xinya → Contents: Read and write）
- 把整个项目文件夹拷贝到新电脑（重点确保 doc/ 文件夹完整，含 .env.production.备份）

#### B. 新电脑环境安装
- 安装 Node.js（版本与服务器一致，当前为 v20.20.2）
  - Windows: https://nodejs.org 下载 LTS 安装包
  - macOS: https://nodejs.org 下载 pkg 安装包，或 `brew install node@20`
- 安装 Git
  - Windows: https://git-scm.com
  - macOS: `brew install git` 或安装 Xcode Command Line Tools
- 安装 Qoder，登录原账号

#### C. 代码获取
方案一（从旧电脑拷贝）：
- 把整个文件夹拷贝到新电脑目标路径
- 进入项目目录，验证 git remote：`git remote -v`
- 确认有 origin（GitHub）和 gitee（Gitee）两个远程

方案二（直接 clone）：
```bash
git clone https://github.com/kangkang919/xinya "<目标路径>/xinya"
cd "<目标路径>/xinya"
git remote add gitee https://gitee.com/kangkang919/xinya.git
```

#### D. 环境配置
1. 配置 Git 用户信息：
```bash
git config --global user.name "kangkang919"
git config --global user.email "你的邮箱"
```

2. 创建 .env 文件（从 doc/.env.production.备份 获取真实值）：
```bash
cp .env.example .env
```
关键配置项：
- `DATABASE_URL`：直连服务器 `"postgresql://xinya:<密码>@47.100.106.213:5432/xinya_db"`
- `JWT_SECRET`：随机字符串，32 位以上
- `SMTP_USER`：1243177461@qq.com
- `SMTP_PASS`：QQ 邮箱 SMTP 授权码
- `NEXT_PUBLIC_BASE_URL`：http://localhost:3000
- `DEEPSEEK_API_KEY`：如使用 AI 功能

3. macOS 注意：路径中的空格处理与 Windows 不同，macOS 终端天然支持空格路径

#### E. 安装依赖并验证
```bash
npm install
npx prisma generate
npm run dev
```
浏览器打开 http://localhost:3000，确认页面正常显示。

#### F. 服务器 Git 配置（如果需要在服务器上推送代码）
```bash
cd /www/wwwroot/xinya
git remote set-url origin https://<GitHub用户名>:<PAT>@github.com/kangkang919/xinya.git
```

### 第三步：验证清单
完成以上步骤后，请帮我逐项验证：
1. `node -v` 版本与服务器一致
2. `git remote -v` 显示 GitHub 和 Gitee 两个远程
3. `npm run dev` 启动成功，浏览器可访问
4. 登录功能正常（测试账号登录）
5. 数据库连接正常（能读取数据）
6. 邮件功能正常（测试 Magic Link 发送）

### 项目关键信息速查
- GitHub: https://github.com/kangkang919/xinya
- Gitee: https://gitee.com/kangkang919/xinya
- 服务器: 47.100.106.213 (SSH 用户: admin)
- 宝塔面板: http://47.100.106.213:8888
- 域名: shuxiangnote.top
- 数据库: PostgreSQL 13, 数据库名 xinya_db, 用户名 xinya
- 邮箱: 1243177461@qq.com (SMTP: smtp.qq.com:465 SSL)
- 技术栈: Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4 + Prisma 6 + PostgreSQL 13
- 部署: PM2 + Gitee 拉取代码
- 本地开发路径约定: Windows `D:\Project Qoder\xinya` / macOS `~/Projects/xinya`（或用户指定）
```

---

## 注意事项

1. 本 Prompt 设计为**无状态**，不包含任何"已完成"标记，每次使用时都是全新的迁移流程
2. Qoder 收到此 Prompt 后，会先询问必要信息，再逐步引导执行
3. 如果某些信息你暂时无法提供（如数据库密码），Qoder 会指导你如何从服务器获取
4. macOS 和 Windows 的差异已在步骤中标注，Qoder 会根据你的操作系统给出对应指令
5. 敏感信息（密码、PAT、授权码）只在对话中临时使用，不要写入代码仓库
