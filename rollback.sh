#!/bin/bash
echo "=============================="
echo " 心芽 - 回滚脚本"
echo "=============================="

cd /www/wwwroot/xinya

if [ ! -f .last-good-commit ]; then
  echo "❌ 未找到 .last-good-commit 文件，无法回滚"
  echo "请手动 git checkout <commit> 后重新部署"
  exit 1
fi

ROLLBACK_COMMIT=$(cat .last-good-commit)
CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "当前版本: $CURRENT_COMMIT"
echo "回滚目标: $ROLLBACK_COMMIT"

if [ "$CURRENT_COMMIT" = "$ROLLBACK_COMMIT" ]; then
  echo "⚠️ 当前已是良好版本，无需回滚"
  exit 0
fi

echo ""
echo "[1/5] 切换到历史良好版本..."
git checkout $ROLLBACK_COMMIT

echo ""
echo "[2/5] 安装依赖..."
npm install

echo ""
echo "[3/5] 生成 Prisma Client..."
npx prisma generate

echo ""
echo "[4/5] 构建项目..."
npm run build

echo ""
echo "[5/5] 重启应用（PM2 reload）..."
pm2 reload xinya

sleep 3
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
if echo "$HEALTH_CODE" | grep -q "200\|302\|301"; then
  echo "✅ 回滚成功 (HTTP $HEALTH_CODE)"
else
  echo "❌ 回滚后仍异常 (HTTP $HEALTH_CODE)，请手动检查"
fi

echo ""
echo "=============================="
echo " 回滚完成"
echo " 访问地址: http://47.100.106.213:3000"
echo "=============================="
