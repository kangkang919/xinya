-- F2.14 子标签拖拽排序：Tag 表新增 sortOrder 字段
-- 0=未排序（按名称），负数=已手动排序（-1 最靠前），与 EntryTagSort 约定一致
-- 纯增量变更：只加字段带默认值，不修改/删除任何已有数据
ALTER TABLE "Tag" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
