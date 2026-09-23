-- 清理 F11 重构（2026-08-27）遗留：schema.prisma 已移除 searchVector，但线上列/索引从未 DROP
-- 该列已无任何读写路径（检索已改走 ILIKE 模糊匹配），删除不影响任何功能
-- 执行前已 pg_dump 备份 Entry 表（--data-only）
DROP INDEX IF EXISTS "idx_entry_search_vector";
ALTER TABLE "Entry" DROP COLUMN IF EXISTS "searchVector";
