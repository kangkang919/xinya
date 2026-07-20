# 心芽项目换电脑迁移 Prompt（MacBook Pro M3 版）

> 使用说明：当你需要更换电脑时，把以下全部内容复制粘贴给 Qoder，Qoder 会按步骤询问你必要信息并指导你完成迁移。
> 目标设备：MacBook Pro M3（16寸，32GB内存，512G硬盘），macOS Tahoe 26.5.1
> 最后更新：2026-07-16

---

## 以下是需要发送给 Qoder 的 Prompt 内容

```
我要把心芽项目从 Windows 电脑迁移到新 MacBook Pro M3（macOS Tahoe 26.5.1），请按以下步骤引导我完成。

### 第一步：收集必要信息
请先问我以下问题，等我逐一回答后再开始执行：

1. 新 Mac 上是否已安装 Homebrew？（执行 `brew --version` 查看，如果提示 command not found 则未安装）
2. 新 Mac 上是否已安装 Node.js？如果已安装，版本号是多少？（执行 `node -v` 查看）
3. 新 Mac 上是否已安装 Git？（执行 `git --version` 查看）
4. 新 Mac 上是否已安装 Qoder？
5. 你是否还记得以下信息？
   - GitHub 账号密码或 PAT（Personal Access Token）
   - Gitee 账号密码
   - 服务器 SSH 密码（IP: 47.100.106.213，用户: admin）
   - 数据库密码（PostgreSQL，用户名: xinya）
   - QQ 邮箱 SMTP 授权码（邮箱: 1243177461@qq.com）
6. USB 移动硬盘/U 盘是否已准备好？旧电脑的项目文件夹是否已拷贝到 U 盘？
7. 你是否已生成或已有 SSH Key？（执行 `ls ~/.ssh/id_*.pub` 查看）

### 第二步：根据回答执行迁移

根据我提供的信息，按以下流程指导我操作：

#### A. 旧电脑收尾（Windows，如果还能访问）
- SSH 登录服务器确认 Node.js 版本：`ssh admin@47.100.106.213` → `node -v`
- 从服务器获取数据库密码：`cat /www/wwwroot/xinya/.env.production | grep DATABASE_URL`
- 验证 QQ 邮箱 SMTP 授权码是否有效（登录 mail.qq.com → 设置 → 账户 → POP3/SMTP）
- 如果 GitHub PAT 过期，重新生成（Settings → Developer settings → Fine-grained tokens → Generate new token → 选 kangkang919/xinya → Contents: Read and write）
- 把整个 `D:\Project Qoder\xinya\` 文件夹拷贝到 USB 移动硬盘（重点确保 doc/ 文件夹完整，含 .env.production.备份）
- 旧电脑数据保留不动作为备份，1 周后由用户自行格式化

#### B. 新 Mac 环境安装

**B1. 安装 Homebrew**（macOS 包管理器，系统不自带）
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
安装完成后执行：
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
brew --version
```

**B2. 安装 nvm（Node 版本管理器，使用国内镜像）**
```bash
export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node
curl -o- https://gitee.com/mirrors/nvm/raw/master/install.sh | bash
```
安装完成后重启终端，然后验证：
```bash
nvm --version
```

**B3. 通过 nvm 安装 Node.js**（版本与服务器一致，当前为 v20.20.2）
```bash
nvm install 20.20.2
nvm use 20.20.2
nvm alias default 20.20.2
node -v
```

**B4. 安装 Git**（通过 Homebrew）
```bash
brew install git
git --version
```

**B5. 安装 Qoder**，登录原账号

**B6. 配置 SSH Key**（免密访问 GitHub/Gitee/服务器）
```bash
# 生成 SSH Key（使用 ed25519 算法，更安全）
ssh-keygen -t ed25519 -C "你的邮箱" -f ~/.ssh/id_ed25519

# 查看公钥内容（需要添加到 GitHub/Gitee/服务器）
cat ~/.ssh/id_ed25519.pub
```
然后指导用户将公钥添加到：
1. GitHub: Settings → SSH and GPG keys → New SSH key
2. Gitee: 设置 → SSH公钥 → 添加公钥
3. 服务器: `ssh-copy-id -i ~/.ssh/id_ed25519.pub admin@47.100.106.213`

验证 SSH Key 是否生效：
```bash
ssh -T git@github.com
ssh -T git@gitee.com
ssh admin@47.100.106.213
```

#### C. 代码获取

**方案一（从 USB 拷贝，推荐）：**
- 把 USB 中的 xinya 文件夹拷贝到 Mac 目标路径（建议 `~/Projects/xinya` 或用户指定路径）
- 进入项目目录，验证 git remote：`git remote -v`
- 确认有 origin（GitHub）和 gitee（Gitee）两个远程
- 如果远程地址是 HTTPS 格式，改为 SSH 格式：
  ```bash
  git remote set-url origin git@github.com:kangkang919/xinya.git
  git remote set-url gitee git@gitee.com:kangkang919/xinya.git
  ```

**方案二（直接 clone，如果 USB 不可用）：**
```bash
git clone git@github.com:kangkang919/xinya.git ~/Projects/xinya
cd ~/Projects/xinya
git remote add gitee git@gitee.com:kangkang919/xinya.git
```

#### D. 环境配置

**D1. 配置 Git 用户信息：**
```bash
git config --global user.name "kangkang919"
git config --global user.email "你的邮箱"
```

**D2. 创建 .env 文件（从 doc/.env.production.备份 获取真实值）：**
```bash
cp .env.example .env
```
关键配置项：
- `DATABASE_URL`：通过 SSH 隧道连接服务器数据库 `"postgresql://xinya:<密码>@localhost:5432/xinya_db"`
- `JWT_SECRET`：随机字符串，32 位以上
- `SMTP_USER`：1243177461@qq.com
- `SMTP_PASS`：QQ 邮箱 SMTP 授权码
- `NEXT_PUBLIC_BASE_URL`：http://localhost:3000
- `DEEPSEEK_API_KEY`：如使用 AI 功能

**D3. SSH 隧道配置（数据库连接必需）**

由于服务器 PostgreSQL 只允许本机连接，Mac 需要通过 SSH 隧道访问数据库。

手动方式（每次开发前执行，保持终端开着）：
```bash
ssh -L 5432:localhost:5432 admin@47.100.106.213
```

自动方式（可选，使用 autossh 实现断线自动重连）：
```bash
brew install autossh
# 添加到 ~/.zshrc 或创建 launchd 服务实现开机自启
```

**D4. macOS 路径注意事项**
- macOS 路径使用 `/` 分隔符（Windows 用 `\`）
- 路径含空格时需用引号包裹：`cd "~/My Projects/xinya"`
- 用户主目录：`~` 或 `/Users/你的用户名`
- 项目建议路径：`~/Projects/xinya`

#### E. 安装依赖并验证
```bash
cd ~/Projects/xinya  # 或你的实际路径
npm install
npx prisma generate
npm run dev
```
浏览器打开 http://localhost:3000，确认页面正常显示。

**注意**：启动 dev 前必须先开启 SSH 隧道（步骤 D3），否则数据库连接会失败。

#### F. 部署操作（方案 A：手动部署）

每次代码修改后，部署流程：

1. Mac 本地提交并推送：
```bash
git add -A
git commit -m "你的提交信息"
git push origin main
git push gitee main
```

2. SSH 登录服务器执行部署：
```bash
ssh admin@47.100.106.213
cd /www/wwwroot/xinya
git fetch gitee
git reset --hard gitee/main
rm -rf .next
npm run build
pm2 delete xinya
pm2 start ecosystem.config.js
pm2 save
exit
```

3. 浏览器访问 https://shuxiangnote.top 验证

**方案 B 建议（Webhook 自动部署，待用户确认）：**
可以配置 Gitee Webhook，push 代码后自动触发服务器部署脚本，无需手动 SSH 登录。
如需采纳，请告知，我会指导配置。

### 第三步：验证清单
完成以上步骤后，请帮我逐项验证：
1. `node -v` 版本与服务器一致（v20.20.2）
2. `git remote -v` 显示 GitHub 和 Gitee 两个 SSH 远程
3. SSH Key 免密登录 GitHub/Gitee/服务器均正常
4. SSH 隧道开启后，`npm run dev` 启动成功，浏览器可访问
5. 登录功能正常（测试账号登录）
6. 数据库连接正常（能读取数据）
7. 邮件功能正常（测试 Magic Link 发送）
8. 部署流程正常（修改代码 → push → 服务器部署 → 线上验证）

### 项目关键信息速查
- GitHub: https://github.com/kangkang919/xinya（SSH: git@github.com:kangkang919/xinya.git）
- Gitee: https://gitee.com/kangkang919/xinya（SSH: git@gitee.com:kangkang919/xinya.git）
- 服务器: 47.100.106.213 (SSH 用户: admin)
- 宝塔面板: http://47.100.106.213:8888
- 域名: shuxiangnote.top
- 数据库: PostgreSQL 13, 数据库名 xinya_db, 用户名 xinya（需 SSH 隧道连接）
- 邮箱: 1243177461@qq.com (SMTP: smtp.qq.com:465 SSL)
- 技术栈: Next.js 16 + React 19 + TypeScript 5 + Tailwind CSS 4 + Prisma 6 + PostgreSQL 13
- 部署: PM2 + Gitee 拉取代码（方案 A 手动部署）
- 本地开发路径: macOS `~/Projects/xinya`（或用户指定）
- ARM 兼容性: 所有依赖均已验证兼容 Apple Silicon M3，无需 Rosetta 2
```

---

## 注意事项

1. 本 Prompt 设计为**无状态**，不包含任何"已完成"标记，每次使用时都是全新的迁移流程
2. Qoder 收到此 Prompt 后，会先询问必要信息，再逐步引导执行
3. 如果某些信息你暂时无法提供（如数据库密码），Qoder 会指导你如何从服务器获取
4. 敏感信息（密码、PAT、授权码）只在对话中临时使用，不要写入代码仓库
5. **SSH 隧道是数据库连接的前提**，每次 `npm run dev` 前必须先开启隧道终端
6. **nvm 使用国内镜像安装**，避免 GitHub 访问问题
7. **所有 git 远程已改为 SSH 格式**，配合 SSH Key 实现免密操作
