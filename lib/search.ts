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
 * 在汉字之间、汉字与非汉字之间插入空格
 * 使 to_tsquery('simple', ...) 的分词结果与文档 tsvector 一致（逐字 token）
 * 例如："架构选型困境" → "架 构 选 型 困 境"
 *       "AI架构" → "AI 架 构"
 */
function spaceOutChinese(s: string): string {
  let r = s.replace(/([\u4e00-\u9fff])([\u4e00-\u9fff])/g, '$1 $2')
  r = r.replace(/([\u4e00-\u9fff])([^\u4e00-\u9fff\s])/g, '$1 $2')
  r = r.replace(/([^\u4e00-\u9fff\s])([\u4e00-\u9fff])/g, '$1 $2')
  return r
}

/**
 * 解析搜索关键词：按空格拆分，过滤空字符串和纯特殊字符
 * 对含中文的关键词自动在汉字间插入空格，匹配 PostgreSQL simple 逐字分词
 * 例如："UED & UI & UX" → ["UED", "UI", "UX"]
 *       "架构选型困境" → ["架", "构", "选", "型", "困", "境"]
 *       "AI架构" → ["AI", "架", "构"]
 */
export function parseKeywords(query: string): string[] {
  return query
    .split(/\s+/)
    .map(k => spaceOutChinese(k))
    .join(' ')
    .split(/\s+/)
    .filter(k => k.trim().length > 0 && /[\w\u4e00-\u9fff]/.test(k))
}

/**
 * 将关键词数组转为 PostgreSQL tsquery 格式
 * 例如：["UED", "UI", "UX"] → "'UED' & 'UI' & 'UX'"
 */
export function buildTsQuery(keywords: string[]): string {
  return keywords.map(k => `'${k.replace(/'/g, "''")}'`).join(" & ")
}
