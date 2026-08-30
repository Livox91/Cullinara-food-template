CREATE TYPE "MenuItemType" AS ENUM ('STANDARD', 'DEAL', 'COMBO');

ALTER TABLE "MenuItem"
ADD COLUMN "itemType" "MenuItemType" NOT NULL DEFAULT 'STANDARD';

UPDATE "MenuItem"
SET "itemType" = 'COMBO'
WHERE "isCombo" = true;

CREATE TABLE "ComboComponent" (
    "comboItemId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ComboComponent_pkey" PRIMARY KEY ("comboItemId", "variantId")
);

CREATE INDEX "ComboComponent_variantId_idx" ON "ComboComponent"("variantId");

ALTER TABLE "ComboComponent"
ADD CONSTRAINT "ComboComponent_comboItemId_fkey"
FOREIGN KEY ("comboItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ComboComponent"
ADD CONSTRAINT "ComboComponent_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "MenuItemVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD COLUMN "componentSnapshot" JSONB;
