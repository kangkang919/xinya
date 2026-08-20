#!/bin/bash
set -e

echo "=============================="
echo " 心芽 - 一键部署脚本"
echo "=============================="

cd /www/wwwroot/xinya

# 强制使用 .env.production 的环境变量（避免 .env 旧密码干扰）
set -a
source .env.production
set +a

# 保存当前版本 commit（用于回滚）
PREV_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "当前版本: $PREV_COMMIT"

echo ""
echo "[1/6] 安装依赖..."
npm install

echo ""
echo "[2/6] 生成 Prisma Client..."
npx prisma generate

echo ""
echo "[3/6] 执行数据库迁移..."
npx prisma migrate deploy

echo ""
echo "[4/6] 构建项目..."
npm run build

echo ""
echo "[5/6] 重启应用（PM2 零停机 reload）..."
npm install -g pm2 2>/dev/null || true
pm2 startOrReload ecosystem.config.js
pm2 save

echo ""
echo "[6/6] 健康检查..."
sleep 5
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if echo "$HEALTH_CODE" | grep -q "200\|302\|301"; then
  echo "✅ 健康检查通过 (HTTP $HEALTH_CODE)"
  echo "$PREV_COMMIT" > .last-good-commit
  echo "已保存良好版本: $PREV_COMMIT"
else
  echo "❌ 健康检查失败 (HTTP $HEALTH_CODE)，尝试回滚..."
  if [ -f .last-good-commit ]; then
    ROLLBACK_COMMIT=$(cat .last-good-commit)
    echo "回滚到版本: $ROLLBACK_COMMIT"
    git checkout $ROLLBACK_COMMIT
    npm install
    npx prisma generate
    npm run build
    pm2 reload xinya
    sleep 3
    ROLLBACK_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
    if echo "$ROLLBACK_CODE" | grep -q "200\|302\|301"; then
      echo "✅ 回滚成功 (HTTP $ROLLBACK_CODE)"
    else
      echo "❌ 回滚后仍异常 (HTTP $ROLLBACK_CODE)，请手动检查"
    fi
  else
    echo "⚠️ 无历史良好版本记录，无法自动回滚，请手动检查"
  fi
  exit 1
fi

echo ""
echo "=============================="
echo " 部署完成！"
echo " 访问地址: http://47.100.106.213:3000"
echo " 如需手动回滚: bash rollback.sh"
echo "=============================="
