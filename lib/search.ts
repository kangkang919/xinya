/**
 * PostgreSQL 全文搜索工具
 * 
 * 使用 PostgreSQL 内置的 tsvector/tsquery 进行全文检索，
 * 无需额外安装扩展（如 pg_jieba）。
 * 
 * 'simple' 配置：
 * - 英文：按空格/标点分词，不区分大小写
 * - 中文：逐字分词（每个汉字独立成 token）
 * 
 * 权重策略：标题匹配权重 A（最高），正文匹配权重 D（最低）
 */

/**
 * 解析搜索关键词：按空格拆分，过滤空字符串和纯特殊字符
 * 例如："UED & UI & UX" → ["UED", "UI", "UX"]
 */
export function parseKeywords(query: string): string[] {
  return query.split(/\s+/).filter(k => k.trim().length > 0 && /[\w\u4e00-\u9fff]/.test(k))
}

/**
 * 将关键词数组转为 PostgreSQL tsquery 格式
 * 例如：["UED", "UI", "UX"] → "'UED' & 'UI' & 'UX'"
 */
export function buildTsQuery(keywords: string[]): string {
  return keywords.map(k => `'${k.replace(/'/g, "''")}'`).join(" & ")
}
