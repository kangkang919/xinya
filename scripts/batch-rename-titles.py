#!/usr/bin/env python3
"""
批量修改心得标题脚本（Python版本）
通过直接读取 .env 文件并连接数据库执行批量更新
"""

import os
import re
from pathlib import Path

# 读取 .env 文件获取数据库连接信息
env_file = Path(__file__).parent.parent / ".env.production"
env_content = env_file.read_text(encoding='utf-8')

# 提取 DATABASE_URL
match = re.search(r'DATABASE_URL="([^"]+)"', env_content)
if not match:
    print("❌ 未找到 DATABASE_URL")
    exit(1)

database_url = match.group(1)

# 改名规则清单
RENAME_RULES = [
    # RAG 课程（16 条）
    ("RAG 总纲：知识全貌与核心流程", "RAG·总纲：知识全貌与核心流程"),
    ("1-1. RAG 市场定位：应用场景与ROI", "RAG·1-1 市场定位：应用场景与ROI"),
    ("1-2. RAG 概述：检索、增强、生成", "RAG·1-2 概述：检索、增强、生成"),
    ("2-1. Naive RAG：文档解析", "RAG·2-1 文档解析"),
    ("2-2. Naive RAG：文档分块", "RAG·2-2 文档分块"),
    ("2-3. Naive RAG：向量与向量检索", "RAG·2-3 向量与向量检索"),
    ("3-1. Advanced RAG：检索前优化-重写器", "RAG·3-1 重写器"),
    ("3-2. Advanced RAG：检索前优化-索引策略", "RAG·3-2 索引策略"),
    ("3-3. Advanced RAG：索引优化应用场景", "RAG·3-3 索引应用场景"),
    ("3-4. Advanced RAG：检索中与检索后优化", "RAG·3-4 检索中后优化"),
    ("4-1. RAG 评估：方法", "RAG·4-1 评估方法"),
    ("4-2. RAG 评估：类型与指标", "RAG·4-2 评估类型与指标"),
    ("4-3. RAG 评估：业务指标拓展", "RAG·4-3 业务指标拓展"),
    ("向量数据库与RAG的关系辨析", "RAG·辨析：向量数据库与RAG的关系"),
    ("专家系统到企业级 RAG 的改造", "RAG·案例：专家系统到企业级RAG改造"),
    ("父子索引为什么在C端更好用", "RAG·父子索引在C端更好用"),

    # 模型微调课程（7 条）
    ('0. 大模型和微调的本质：先理解"是什么"，再决定"做不做"', "微调·0 本质：先理解是什么再决定做不做"),
    ("1. 大模型微调 vs RAG：应用场景比较", "微调·1 微调 vs RAG 场景比较"),
    ("2. PM 在微调项目中的四步工作流：定义数据和验收标准", "微调·2 PM四步工作流"),
    ("3. 微调数据怎么准备：来源、配比和质量控制", "微调·3 数据准备"),
    ("4. 微调方法选型：全参微调与 PEFT高效微调", "微调·4 方法选型"),
    ("5. 模型评估怎么做：通用基准、领域基准与三种评估方式", "微调·5 模型评估"),
    ("6. 私有化部署工具链：从个人电脑到企业级服务", "微调·6 私有化部署"),

    # Agent 评估系列（5 条）
    ("如何做Agent评估（四步法）", "评估·总览：四步法"),
    ("0. 评估的底层逻辑与核心架构", "评估·1 底层逻辑与核心架构"),
    ("1. 评分器的选择与校准策略", "评估·2 评分器选择与校准"),
    ("2. 多场景评估与非确定性治理", "评估·3 多场景与非确定性治理"),
    ("3. PM主导的评估落地路线图", "评估·4 落地路线图"),

    # AI 产品开发课程（8 条）
    ("AI Coding的全链路地图", "AI产品开发·总览：全链路地图"),
    ("第一课：AI产品 vs 传统软件——7个根本区别", "AI产品开发·1 产品vs传统软件的7个区别"),
    ("第二课：3P门控模型——AI产品的三阶段成长路径", "AI产品开发·2 3P门控模型"),
    ("第三课：评测驱动开发 vs 功能驱动开发", "AI产品开发·3 评测驱动开发"),
    ("第四课：九层工具链全景", "AI产品开发·4 九层工具链"),
    ("附：九层工具链 vs 3P门控——什么关系？", "AI产品开发·4-附 九层工具链 vs 3P门控"),
    ("附：评测驱动开发 vs TDD——是一回事还是两回事？", "AI产品开发·3-附2 评测驱动 vs TDD"),
    ('附：跑评测（让它失败）—— 很多人初学TDD时都会有这个疑问："代码都没写，跑评测肯定全失败啊，这不是脱裤子放屁吗？"', "AI产品开发·3-附1 跑评测让它失败"),

    # Coze 课程（9 条）
    ("1-1. 工作流是什么", "Coze·1-1 工作流是什么"),
    ("1-2. Coze：智能体 → 工作流 → 插件", "Coze·1-2 智能体/工作流/插件"),
    ("1-3. Coze 的三层发布", "Coze·1-3 三层发布"),
    ("2-1. 选择器 和 意图识别 节点区别", "Coze·2-1 选择器 vs 意图识别"),
    ("2-2. Coze 循环节点", "Coze·2-2 循环节点"),
    ("3-1. Coze 自建云插件完整流程", "Coze·3-1 自建云插件"),
    ("3-2. Coze 插件稳定性分析", "Coze·3-2 插件稳定性"),
    ("4-1. 【实操】Coze 实操注意事项", "Coze·4-1 实操注意事项"),
    ("5-1. JSON 序列化与反序列化", "Coze·5-1 JSON序列化与反序列化"),

    # 其他标题小优化（3 条）
    ("附-1. 鲁棒性（Robustness）", "鲁棒性（Robustness）：输入异常仍可用"),
    ("附-2. Golden 回归基线样本", "Golden 回归基线样本（黄金样本）"),
    ("Evals", "Evals：动态评测框架"),
]

def main():
    print("=" * 50)
    print("心芽 · 批量标题修改工具")
    print("=" * 50)
    print()
    print(f"📋 共 {len(RENAME_RULES)} 条改名规则")
    print()

    # 生成 SQL 脚本
    sql_lines = []
    sql_lines.append("-- 批量修改心得标题SQL脚本")
    sql_lines.append("-- 目标用户: 1243177461@qq.com")
    sql_lines.append("")
    sql_lines.append("DO $$")
    sql_lines.append("DECLARE")
    sql_lines.append("    target_user_id TEXT;")
    sql_lines.append("BEGIN")
    sql_lines.append("    SELECT id INTO target_user_id FROM \"User\" WHERE email = '1243177461@qq.com';")
    sql_lines.append("")
    sql_lines.append("    IF target_user_id IS NULL THEN")
    sql_lines.append("        RAISE EXCEPTION '未找到用户: 1243177461@qq.com';")
    sql_lines.append("    END IF;")
    sql_lines.append("")
    sql_lines.append("    RAISE NOTICE '目标用户ID: %', target_user_id;")
    sql_lines.append("")

    for old_title, new_title in RENAME_RULES:
        # 转义单引号
        old_escaped = old_title.replace("'", "''")
        new_escaped = new_title.replace("'", "''")
        sql_lines.append(
            f'    UPDATE "Entry" SET title = \'{new_escaped}\' WHERE userId = target_user_id AND title = \'{old_escaped}\';'
        )

    sql_lines.append("")
    sql_lines.append("    RAISE NOTICE '批量更新完成！';")
    sql_lines.append("END $$;")

    # 写入 SQL 文件
    sql_file = Path(__file__).parent / "batch-rename-titles-final.sql"
    sql_file.write_text("\n".join(sql_lines), encoding='utf-8')

    print(f"✅ SQL脚本已生成: {sql_file}")
    print()
    print("📝 下一步操作:")
    print("1. SSH连接到服务器: ssh kangkang@47.100.106.213")
    print(f"2. 上传SQL脚本: scp {sql_file} kangkang@47.100.106.213:/tmp/")
    print("3. 执行SQL: psql -U xinya -d xinya_db -f /tmp/batch-rename-titles-final.sql")
    print()
    print("或者直接在服务器上运行:")
    print(f"  cat {sql_file} | ssh kangkang@47.100.106.213 'psql -U xinya -d xinya_db'")

if __name__ == "__main__":
    main()
