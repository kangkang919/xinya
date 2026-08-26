-- 添加 searchVector 列（tsvector 类型，用于 PostgreSQL 全文搜索）
ALTER TABLE "Entry" ADD COLUMN "searchVector" tsvector;

-- 创建 GIN 索引以加速全文搜索
CREATE INDEX "idx_entry_search_vector" ON "Entry" USING GIN ("searchVector");

-- 为现有条目回填 searchVector（去除 HTML 标签和常见实体）
UPDATE "Entry" SET "searchVector" = 
  setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('simple', 
    regexp_replace(
      regexp_replace(
        regexp_replace(coalesce("content", ''), '<[^>]+>', ' ', 'g'),
        '&nbsp;', ' ', 'g'),
      '&amp;', '\&', 'g')
  ), 'D');
