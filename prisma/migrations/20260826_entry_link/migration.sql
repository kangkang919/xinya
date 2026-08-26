-- CreateTable: EntryLink (心得之间的知识关联 F13)
CREATE TABLE "EntryLink" (
    "id" TEXT NOT NULL,
    "fromEntryId" TEXT NOT NULL,
    "toEntryId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EntryLink_fromEntryId_toEntryId_key" ON "EntryLink"("fromEntryId", "toEntryId");
CREATE INDEX "EntryLink_fromEntryId_idx" ON "EntryLink"("fromEntryId");
CREATE INDEX "EntryLink_toEntryId_idx" ON "EntryLink"("toEntryId");

-- AddForeignKey
ALTER TABLE "EntryLink" ADD CONSTRAINT "EntryLink_fromEntryId_fkey" FOREIGN KEY ("fromEntryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntryLink" ADD CONSTRAINT "EntryLink_toEntryId_fkey" FOREIGN KEY ("toEntryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
