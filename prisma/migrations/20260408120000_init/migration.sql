-- CreateTable
CREATE TABLE "MeaningTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "MeaningTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "World" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'WEB',
    "accessMode" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "creatorName" TEXT NOT NULL,
    "whyExists" TEXT NOT NULL,
    "initialQuestion" TEXT NOT NULL,
    "isUndecided" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "World_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldMeaningTag" (
    "worldId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "WorldMeaningTag_pkey" PRIMARY KEY ("worldId","tagId")
);

-- CreateTable
CREATE TABLE "Interpretation" (
    "id" TEXT NOT NULL,
    "worldId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interpretation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeaningTag_name_key" ON "MeaningTag"("name");

-- AddForeignKey
ALTER TABLE "WorldMeaningTag" ADD CONSTRAINT "WorldMeaningTag_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldMeaningTag" ADD CONSTRAINT "WorldMeaningTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "MeaningTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interpretation" ADD CONSTRAINT "Interpretation_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;
