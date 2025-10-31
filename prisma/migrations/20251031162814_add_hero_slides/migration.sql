-- CreateTable
CREATE TABLE "hero_slides" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "productId" TEXT,
    "buttonText" TEXT NOT NULL DEFAULT 'Shop Now',
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "bgColor" TEXT NOT NULL DEFAULT '#3B82F6',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_slides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hero_slides_position_idx" ON "hero_slides"("position");

-- CreateIndex
CREATE INDEX "hero_slides_isActive_idx" ON "hero_slides"("isActive");

-- AddForeignKey
ALTER TABLE "hero_slides" ADD CONSTRAINT "hero_slides_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
