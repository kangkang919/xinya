#!/bin/bash

# 通过API批量修改心得标题脚本
# 使用方式: bash scripts/batch-rename-via-api.sh

BASE_URL="http://localhost:3000"
COOKIE_FILE="/tmp/xinya-cookie.txt"

echo "=========================================="
echo "心芽 · 批量标题修改工具（API方式）"
echo "=========================================="
echo ""

# 第一步：登录获取cookie
echo "📝 步骤1: 请登录心芽系统..."
echo "请在浏览器中访问 http://localhost:3000/login"
echo "登录后，从浏览器的开发者工具中复制 Cookie 值"
echo ""
echo "或者，你可以手动编辑文件: $COOKIE_FILE"
echo "将 Cookie 值粘贴到该文件中（只需 token 部分）"
echo ""
read -p "按回车键继续（确保已登录并准备好Cookie）..."

# 检查是否有cookie文件
if [ ! -f "$COOKIE_FILE" ]; then
    echo "❌ 未找到Cookie文件: $COOKIE_FILE"
    echo "请先登录并将Cookie保存到该文件"
    exit 1
fi

COOKIE=$(cat "$COOKIE_FILE")
if [ -z "$COOKIE" ]; then
    echo "❌ Cookie文件为空"
    exit 1
fi

echo "✅ Cookie已加载"
echo ""

# 第二步：获取所有心得
echo "📋 步骤2: 获取所有心得列表..."
RESPONSE=$(curl -s "$BASE_URL/api/export" -H "Cookie: $COOKIE")

# 检查是否成功
OK=$(echo "$RESPONSE" | grep -o '"ok":true' || echo "")
if [ -z "$OK" ]; then
    echo "❌ 获取心得失败，请检查Cookie是否有效"
    echo "响应: $RESPONSE"
    exit 1
fi

echo "✅ 成功获取心得列表"
echo ""

# 第三步：显示改名规则
echo "📝 步骤3: 准备执行以下改名规则（共48条）"
echo ""
echo "RAG课程: 16条"
echo "模型微调: 7条"
echo "Agent评估: 5条"
echo "AI产品开发: 8条"
echo "Coze课程: 9条"
echo "其他优化: 3条"
echo ""

read -p "确认执行批量修改？(y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "❌ 已取消操作"
    exit 0
fi

echo ""
echo "🚀 开始执行批量修改..."
echo ""

# 定义改名规则数组（旧标题|新标题）
declare -a RENAME_RULES=(
    "RAG 总纲：知识全貌与核心流程|RAG·总纲：知识全貌与核心流程"
    "1-1. RAG 市场定位：应用场景与ROI|RAG·1-1 市场定位：应用场景与ROI"
    "1-2. RAG 概述：检索、增强、生成|RAG·1-2 概述：检索、增强、生成"
    "2-1. Naive RAG：文档解析|RAG·2-1 文档解析"
    "2-2. Naive RAG：文档分块|RAG·2-2 文档分块"
    "2-3. Naive RAG：向量与向量检索|RAG·2-3 向量与向量检索"
    "3-1. Advanced RAG：检索前优化-重写器|RAG·3-1 重写器"
    "3-2. Advanced RAG：检索前优化-索引策略|RAG·3-2 索引策略"
    "3-3. Advanced RAG：索引优化应用场景|RAG·3-3 索引应用场景"
    "3-4. Advanced RAG：检索中与检索后优化|RAG·3-4 检索中后优化"
    "4-1. RAG 评估：方法|RAG·4-1 评估方法"
    "4-2. RAG 评估：类型与指标|RAG·4-2 评估类型与指标"
    "4-3. RAG 评估：业务指标拓展|RAG·4-3 业务指标拓展"
    "向量数据库与RAG的关系辨析|RAG·辨析：向量数据库与RAG的关系"
    "专家系统到企业级 RAG 的改造|RAG·案例：专家系统到企业级RAG改造"
    "父子索引为什么在C端更好用|RAG·父子索引在C端更好用"
    "0. 大模型和微调的本质：先理解\"是什么\"，再决定\"做不做\"|微调·0 本质：先理解是什么再决定做不做"
    "1. 大模型微调 vs RAG：应用场景比较|微调·1 微调 vs RAG 场景比较"
    "2. PM 在微调项目中的四步工作流：定义数据和验收标准|微调·2 PM四步工作流"
    "3. 微调数据怎么准备：来源、配比和质量控制|微调·3 数据准备"
    "4. 微调方法选型：全参微调与 PEFT高效微调|微调·4 方法选型"
    "5. 模型评估怎么做：通用基准、领域基准与三种评估方式|微调·5 模型评估"
    "6. 私有化部署工具链：从个人电脑到企业级服务|微调·6 私有化部署"
    "如何做Agent评估（四步法）|评估·总览：四步法"
    "0. 评估的底层逻辑与核心架构|评估·1 底层逻辑与核心架构"
    "1. 评分器的选择与校准策略|评估·2 评分器选择与校准"
    "2. 多场景评估与非确定性治理|评估·3 多场景与非确定性治理"
    "3. PM主导的评估落地路线图|评估·4 落地路线图"
    "AI Coding的全链路地图|AI产品开发·总览：全链路地图"
    "第一课：AI产品 vs 传统软件——7个根本区别|AI产品开发·1 产品vs传统软件的7个区别"
    "第二课：3P门控模型——AI产品的三阶段成长路径|AI产品开发·2 3P门控模型"
    "第三课：评测驱动开发 vs 功能驱动开发|AI产品开发·3 评测驱动开发"
    "第四课：九层工具链全景|AI产品开发·4 九层工具链"
    "附：九层工具链 vs 3P门控——什么关系？|AI产品开发·4-附 九层工具链 vs 3P门控"
    "附：评测驱动开发 vs TDD——是一回事还是两回事？|AI产品开发·3-附2 评测驱动 vs TDD"
    '附：跑评测（让它失败）—— 很多人初学TDD时都会有这个疑问："代码都没写，跑评测肯定全失败啊，这不是脱裤子放屁吗？"|AI产品开发·3-附1 跑评测让它失败'
    "1-1. 工作流是什么|Coze·1-1 工作流是什么"
    "1-2. Coze：智能体 → 工作流 → 插件|Coze·1-2 智能体/工作流/插件"
    "1-3. Coze 的三层发布|Coze·1-3 三层发布"
    "2-1. 选择器 和 意图识别 节点区别|Coze·2-1 选择器 vs 意图识别"
    "2-2. Coze 循环节点|Coze·2-2 循环节点"
    "3-1. Coze 自建云插件完整流程|Coze·3-1 自建云插件"
    "3-2. Coze 插件稳定性分析|Coze·3-2 插件稳定性"
    "4-1. 【实操】Coze 实操注意事项|Coze·4-1 实操注意事项"
    "5-1. JSON 序列化与反序列化|Coze·5-1 JSON序列化与反序列化"
    "附-1. 鲁棒性（Robustness）|鲁棒性（Robustness）：输入异常仍可用"
    "附-2. Golden 回归基线样本|Golden 回归基线样本（黄金样本）"
    "Evals|Evals：动态评测框架"
)

SUCCESS_COUNT=0
NOT_FOUND_COUNT=0
ERROR_COUNT=0

# 遍历每个改名规则
for RULE in "${RENAME_RULES[@]}"; do
    OLD_TITLE="${RULE%%|*}"
    NEW_TITLE="${RULE##*|}"

    # 从导出结果中查找匹配的心得ID
    ENTRY_ID=$(echo "$RESPONSE" | grep -o "\"id\":\"[^\"]*\",\"title\":\"$(echo "$OLD_TITLE" | sed 's/[.[\*^$()+?{|]/\\&/g')\"" | head -1 | cut -d'"' -f4)

    if [ -z "$ENTRY_ID" ]; then
        NOT_FOUND_COUNT=$((NOT_FOUND_COUNT + 1))
        echo "⚠️  未找到: \"$OLD_TITLE\""
        continue
    fi

    # 调用PUT API更新标题
    UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/api/entries/$ENTRY_ID" \
        -H "Content-Type: application/json" \
        -H "Cookie: $COOKIE" \
        -d "{\"title\":\"$NEW_TITLE\"}")

    UPDATE_OK=$(echo "$UPDATE_RESPONSE" | grep -o '"ok":true' || echo "")

    if [ -n "$UPDATE_OK" ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo "✅ 已修改: \"$OLD_TITLE\" → \"$NEW_TITLE\""
    else
        ERROR_COUNT=$((ERROR_COUNT + 1))
        echo "❌ 修改失败: \"$OLD_TITLE\""
        echo "   响应: $UPDATE_RESPONSE"
    fi

    # 避免API限流，每条间隔100ms
    sleep 0.1
done

echo ""
echo "=========================================="
echo "📊 执行完成！"
echo "=========================================="
echo "✅ 成功: $SUCCESS_COUNT"
echo "⚠️  未找到: $NOT_FOUND_COUNT"
echo "❌ 错误: $ERROR_COUNT"
echo ""
echo "提示: 可以刷新浏览器查看修改结果"
