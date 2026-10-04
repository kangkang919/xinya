-- 批量修改心得标题SQL脚本
-- 目标用户: 1243177461@qq.com
-- 执行方式: psql -f scripts/batch-rename-titles.sql

-- 先查看目标用户的ID
DO $$
DECLARE
    target_user_id TEXT;
BEGIN
    SELECT id INTO target_user_id FROM "User" WHERE email = '1243177461@qq.com';
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION '未找到用户: 1243177461@qq.com';
    END IF;
    
    RAISE NOTICE '目标用户ID: %', target_user_id;
    
    -- RAG 课程（16 条）
    UPDATE "Entry" SET title = 'RAG·总纲：知识全貌与核心流程' WHERE userId = target_user_id AND title = 'RAG 总纲：知识全貌与核心流程';
    UPDATE "Entry" SET title = 'RAG·1-1 市场定位：应用场景与ROI' WHERE userId = target_user_id AND title = '1-1. RAG 市场定位：应用场景与ROI';
    UPDATE "Entry" SET title = 'RAG·1-2 概述：检索、增强、生成' WHERE userId = target_user_id AND title = '1-2. RAG 概述：检索、增强、生成';
    UPDATE "Entry" SET title = 'RAG·2-1 文档解析' WHERE userId = target_user_id AND title = '2-1. Naive RAG：文档解析';
    UPDATE "Entry" SET title = 'RAG·2-2 文档分块' WHERE userId = target_user_id AND title = '2-2. Naive RAG：文档分块';
    UPDATE "Entry" SET title = 'RAG·2-3 向量与向量检索' WHERE userId = target_user_id AND title = '2-3. Naive RAG：向量与向量检索';
    UPDATE "Entry" SET title = 'RAG·3-1 重写器' WHERE userId = target_user_id AND title = '3-1. Advanced RAG：检索前优化-重写器';
    UPDATE "Entry" SET title = 'RAG·3-2 索引策略' WHERE userId = target_user_id AND title = '3-2. Advanced RAG：检索前优化-索引策略';
    UPDATE "Entry" SET title = 'RAG·3-3 索引应用场景' WHERE userId = target_user_id AND title = '3-3. Advanced RAG：索引优化应用场景';
    UPDATE "Entry" SET title = 'RAG·3-4 检索中后优化' WHERE userId = target_user_id AND title = '3-4. Advanced RAG：检索中与检索后优化';
    UPDATE "Entry" SET title = 'RAG·4-1 评估方法' WHERE userId = target_user_id AND title = '4-1. RAG 评估：方法';
    UPDATE "Entry" SET title = 'RAG·4-2 评估类型与指标' WHERE userId = target_user_id AND title = '4-2. RAG 评估：类型与指标';
    UPDATE "Entry" SET title = 'RAG·4-3 业务指标拓展' WHERE userId = target_user_id AND title = '4-3. RAG 评估：业务指标拓展';
    UPDATE "Entry" SET title = 'RAG·辨析：向量数据库与RAG的关系' WHERE userId = target_user_id AND title = '向量数据库与RAG的关系辨析';
    UPDATE "Entry" SET title = 'RAG·案例：专家系统到企业级RAG改造' WHERE userId = target_user_id AND title = '专家系统到企业级 RAG 的改造';
    UPDATE "Entry" SET title = 'RAG·父子索引在C端更好用' WHERE userId = target_user_id AND title = '父子索引为什么在C端更好用';
    
    -- 模型微调课程（7 条）
    UPDATE "Entry" SET title = '微调·0 本质：先理解是什么再决定做不做' WHERE userId = target_user_id AND title = '0. 大模型和微调的本质：先理解"是什么"，再决定"做不做"';
    UPDATE "Entry" SET title = '微调·1 微调 vs RAG 场景比较' WHERE userId = target_user_id AND title = '1. 大模型微调 vs RAG：应用场景比较';
    UPDATE "Entry" SET title = '微调·2 PM四步工作流' WHERE userId = target_user_id AND title = '2. PM 在微调项目中的四步工作流：定义数据和验收标准';
    UPDATE "Entry" SET title = '微调·3 数据准备' WHERE userId = target_user_id AND title = '3. 微调数据怎么准备：来源、配比和质量控制';
    UPDATE "Entry" SET title = '微调·4 方法选型' WHERE userId = target_user_id AND title = '4. 微调方法选型：全参微调与 PEFT高效微调';
    UPDATE "Entry" SET title = '微调·5 模型评估' WHERE userId = target_user_id AND title = '5. 模型评估怎么做：通用基准、领域基准与三种评估方式';
    UPDATE "Entry" SET title = '微调·6 私有化部署' WHERE userId = target_user_id AND title = '6. 私有化部署工具链：从个人电脑到企业级服务';
    
    -- Agent 评估系列（5 条）
    UPDATE "Entry" SET title = '评估·总览：四步法' WHERE userId = target_user_id AND title = '如何做Agent评估（四步法）';
    UPDATE "Entry" SET title = '评估·1 底层逻辑与核心架构' WHERE userId = target_user_id AND title = '0. 评估的底层逻辑与核心架构';
    UPDATE "Entry" SET title = '评估·2 评分器选择与校准' WHERE userId = target_user_id AND title = '1. 评分器的选择与校准策略';
    UPDATE "Entry" SET title = '评估·3 多场景与非确定性治理' WHERE userId = target_user_id AND title = '2. 多场景评估与非确定性治理';
    UPDATE "Entry" SET title = '评估·4 落地路线图' WHERE userId = target_user_id AND title = '3. PM主导的评估落地路线图';
    
    -- AI 产品开发课程（8 条）
    UPDATE "Entry" SET title = 'AI产品开发·总览：全链路地图' WHERE userId = target_user_id AND title = 'AI Coding的全链路地图';
    UPDATE "Entry" SET title = 'AI产品开发·1 产品vs传统软件的7个区别' WHERE userId = target_user_id AND title = '第一课：AI产品 vs 传统软件——7个根本区别';
    UPDATE "Entry" SET title = 'AI产品开发·2 3P门控模型' WHERE userId = target_user_id AND title = '第二课：3P门控模型——AI产品的三阶段成长路径';
    UPDATE "Entry" SET title = 'AI产品开发·3 评测驱动开发' WHERE userId = target_user_id AND title = '第三课：评测驱动开发 vs 功能驱动开发';
    UPDATE "Entry" SET title = 'AI产品开发·4 九层工具链' WHERE userId = target_user_id AND title = '第四课：九层工具链全景';
    UPDATE "Entry" SET title = 'AI产品开发·4-附 九层工具链 vs 3P门控' WHERE userId = target_user_id AND title = '附：九层工具链 vs 3P门控——什么关系？';
    UPDATE "Entry" SET title = 'AI产品开发·3-附2 评测驱动 vs TDD' WHERE userId = target_user_id AND title = '附：评测驱动开发 vs TDD——是一回事还是两回事？';
    UPDATE "Entry" SET title = 'AI产品开发·3-附1 跑评测让它失败' WHERE userId = target_user_id AND title = '附：跑评测（让它失败）—— 很多人初学TDD时都会有这个疑问："代码都没写，跑评测肯定全失败啊，这不是脱裤子放屁吗？"';
    
    -- Coze 课程（9 条）
    UPDATE "Entry" SET title = 'Coze·1-1 工作流是什么' WHERE userId = target_user_id AND title = '1-1. 工作流是什么';
    UPDATE "Entry" SET title = 'Coze·1-2 智能体/工作流/插件' WHERE userId = target_user_id AND title = '1-2. Coze：智能体 → 工作流 → 插件';
    UPDATE "Entry" SET title = 'Coze·1-3 三层发布' WHERE userId = target_user_id AND title = '1-3. Coze 的三层发布';
    UPDATE "Entry" SET title = 'Coze·2-1 选择器 vs 意图识别' WHERE userId = target_user_id AND title = '2-1. 选择器 和 意图识别 节点区别';
    UPDATE "Entry" SET title = 'Coze·2-2 循环节点' WHERE userId = target_user_id AND title = '2-2. Coze 循环节点';
    UPDATE "Entry" SET title = 'Coze·3-1 自建云插件' WHERE userId = target_user_id AND title = '3-1. Coze 自建云插件完整流程';
    UPDATE "Entry" SET title = 'Coze·3-2 插件稳定性' WHERE userId = target_user_id AND title = '3-2. Coze 插件稳定性分析';
    UPDATE "Entry" SET title = 'Coze·4-1 实操注意事项' WHERE userId = target_user_id AND title = '4-1. 【实操】Coze 实操注意事项';
    UPDATE "Entry" SET title = 'Coze·5-1 JSON序列化与反序列化' WHERE userId = target_user_id AND title = '5-1. JSON 序列化与反序列化';
    
    -- 其他标题小优化（3 条）
    UPDATE "Entry" SET title = '鲁棒性（Robustness）：输入异常仍可用' WHERE userId = target_user_id AND title = '附-1. 鲁棒性（Robustness）';
    UPDATE "Entry" SET title = 'Golden 回归基线样本（黄金样本）' WHERE userId = target_user_id AND title = '附-2. Golden 回归基线样本';
    UPDATE "Entry" SET title = 'Evals：动态评测框架' WHERE userId = target_user_id AND title = 'Evals';
    
    RAISE NOTICE '批量更新完成！';
END $$;
