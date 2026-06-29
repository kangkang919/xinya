#!/bin/bash
echo "=============================="
echo " 心芽 - 一键部署脚本"
echo "=============================="

cd /www/wwwroot/xinya

echo ""
echo "[1/5] 安装依赖..."
npm install

echo ""
echo "[2/5] 生成 Prisma Client..."
npx prisma generate

echo ""
echo "[3/5] 执行数据库迁移（建表）..."
npx prisma migrate deploy

echo ""
echo "[4/5] 构建项目..."
npm run build

echo ""
echo "[5/5] 启动应用（PM2）..."
npm install -g pm2
pm2 delete xinya 2>/dev/null
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo ""
echo "=============================="
echo " 部署完成！"
echo " 访问地址: http://47.100.106.213:3000"
echo "=============================="
