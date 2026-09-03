-- CreateTable
CREATE TABLE "QuizPriority" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "until" TEXT NOT NULL DEFAULT 'all_answered',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizPriority_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizPriority_userId_active_idx" ON "QuizPriority"("userId", "active");

-- AddForeignKey
ALTER TABLE "QuizPriority" ADD CONSTRAINT "QuizPriority_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
