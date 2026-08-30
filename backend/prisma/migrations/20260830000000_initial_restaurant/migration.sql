-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "RiderStatus" AS ENUM ('OFFLINE', 'AVAILABLE', 'BUSY', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('DELIVERY', 'PICKUP');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('SYSTEM', 'CUSTOMER', 'BUSINESS', 'RIDER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH_ON_DELIVERY', 'CARD', 'WALLET', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SEARCHING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "RiderAssignmentStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED', 'PICKED_UP', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENT');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('DISCOUNT', 'TAX', 'DELIVERY_FEE', 'SERVICE_FEE', 'ROUNDING', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryMovementReason" AS ENUM ('PURCHASE', 'ORDER_CONSUMPTION', 'ORDER_RELEASE', 'WASTE', 'MANUAL_ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiderProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "RiderStatus" NOT NULL DEFAULT 'OFFLINE',
    "vehicleType" TEXT,
    "vehiclePlate" TEXT,
    "nationalIdHash" TEXT,
    "currentLatitude" DECIMAL(9,6),
    "currentLongitude" DECIMAL(9,6),
    "lastLocationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" UUID NOT NULL,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "BusinessStatus" NOT NULL DEFAULT 'ACTIVE',
    "defaultCurrency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Karachi',
    "taxRegistrationNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMembership" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffBranchAccess" (
    "membershipId" UUID NOT NULL,
    "branchId" UUID NOT NULL,

    CONSTRAINT "StaffBranchAccess_pkey" PRIMARY KEY ("membershipId","branchId")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT,
    "postalCode" TEXT,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAcceptingOrders" BOOLEAN NOT NULL DEFAULT true,
    "minimumOrderAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deliveryRadiusKm" DECIMAL(6,2),
    "defaultPrepMinutes" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchHour" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "opensAt" TIME(0) NOT NULL,
    "closesAt" TIME(0) NOT NULL,

    CONSTRAINT "BranchHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchSpecialHour" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "opensAt" TIME(0),
    "closesAt" TIME(0),
    "note" TEXT,

    CONSTRAINT "BranchSpecialHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCombo" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemVariant" (
    "id" UUID NOT NULL,
    "menuItemId" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "prepMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuItemVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierGroup" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemModifierGroup" (
    "menuItemId" UUID NOT NULL,
    "modifierGroupId" UUID NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "minSelections" INTEGER NOT NULL DEFAULT 0,
    "maxSelections" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MenuItemModifierGroup_pkey" PRIMARY KEY ("menuItemId","modifierGroupId")
);

-- CreateTable
CREATE TABLE "ModifierOption" (
    "id" UUID NOT NULL,
    "modifierGroupId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModifierOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchMenuItemVariant" (
    "branchId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "priceOverride" DECIMAL(12,2),
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "soldOutUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchMenuItemVariant_pkey" PRIMARY KEY ("branchId","variantId")
);

-- CreateTable
CREATE TABLE "BranchModifierOption" (
    "branchId" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "priceOverride" DECIMAL(12,2),
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchModifierOption_pkey" PRIMARY KEY ("branchId","optionId")
);

-- CreateTable
CREATE TABLE "CustomerAddress" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "label" TEXT,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT,
    "postalCode" TEXT,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "deliveryNote" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "addressId" UUID,
    "fulfillmentType" "FulfillmentType" NOT NULL,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" UUID NOT NULL,
    "cartId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "specialInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItemModifier" (
    "cartItemId" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CartItemModifier_pkey" PRIMARY KEY ("cartItemId","optionId")
);

-- CreateTable
CREATE TABLE "BranchOrderCounter" (
    "branchId" UUID NOT NULL,
    "nextValue" BIGINT NOT NULL DEFAULT 1,

    CONSTRAINT "BranchOrderCounter_pkey" PRIMARY KEY ("branchId")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "publicId" TEXT NOT NULL,
    "branchId" UUID NOT NULL,
    "customerId" UUID,
    "cartId" UUID,
    "orderNumber" BIGINT,
    "fulfillmentType" "FulfillmentType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerNote" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "subtotalAmount" DECIMAL(12,2) NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deliveryFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "serviceFeeAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "roundingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grandTotalAmount" DECIMAL(12,2) NOT NULL,
    "couponCodeSnapshot" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "variantId" UUID,
    "itemNameSnapshot" TEXT NOT NULL,
    "variantNameSnapshot" TEXT NOT NULL,
    "skuSnapshot" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "baseSubtotal" DECIMAL(12,2) NOT NULL,
    "modifierSubtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "specialInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemModifier" (
    "id" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "modifierOptionId" UUID,
    "groupNameSnapshot" TEXT NOT NULL,
    "optionNameSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceDelta" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItemModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAdjustment" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "type" "AdjustmentType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "actorType" "ActorType" NOT NULL DEFAULT 'SYSTEM',
    "actorUserId" UUID,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "provider" TEXT,
    "providerPaymentId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PKR',
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "authorizedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "providerRefundId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderDelivery" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT,
    "postalCode" TEXT,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "deliveryNote" TEXT,
    "distanceKm" DECIMAL(7,2),
    "quotedEtaAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiderAssignment" (
    "id" UUID NOT NULL,
    "deliveryId" UUID NOT NULL,
    "riderId" UUID NOT NULL,
    "status" "RiderAssignmentStatus" NOT NULL DEFAULT 'OFFERED',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiderAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiderAssignmentHistory" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "fromStatus" "RiderAssignmentStatus",
    "toStatus" "RiderAssignmentStatus" NOT NULL,
    "actorType" "ActorType" NOT NULL DEFAULT 'SYSTEM',
    "actorUserId" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiderAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiderLocationPing" (
    "id" BIGSERIAL NOT NULL,
    "riderId" UUID NOT NULL,
    "deliveryId" UUID,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "accuracyM" DECIMAL(8,2),
    "headingDeg" DECIMAL(6,2),
    "speedMps" DECIMAL(8,2),
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiderLocationPing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "branchId" UUID,
    "code" TEXT NOT NULL,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DECIMAL(12,2) NOT NULL,
    "maxDiscount" DECIMAL(12,2),
    "minOrderAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalUsageLimit" INTEGER,
    "perCustomerLimit" INTEGER,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" UUID NOT NULL,
    "couponId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "customerId" UUID,
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderReview" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "riderId" UUID,
    "foodRating" INTEGER,
    "riderRating" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" UUID NOT NULL,
    "businessId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeComponent" (
    "variantId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "RecipeComponent_pkey" PRIMARY KEY ("variantId","ingredientId")
);

-- CreateTable
CREATE TABLE "BranchInventory" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "quantityOnHand" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "quantityReserved" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "reorderLevel" DECIMAL(14,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "orderId" UUID,
    "reason" "InventoryMovementReason" NOT NULL,
    "deltaOnHand" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "deltaReserved" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "scope" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" UUID NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "businessId" UUID,
    "actorUserId" UUID,
    "actorType" "ActorType" NOT NULL DEFAULT 'SYSTEM',
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_userId_key" ON "CustomerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RiderProfile_userId_key" ON "RiderProfile"("userId");

-- CreateIndex
CREATE INDEX "RiderProfile_status_idx" ON "RiderProfile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- CreateIndex
CREATE INDEX "BusinessMembership_userId_status_idx" ON "BusinessMembership"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMembership_businessId_userId_key" ON "BusinessMembership"("businessId", "userId");

-- CreateIndex
CREATE INDEX "StaffBranchAccess_branchId_idx" ON "StaffBranchAccess"("branchId");

-- CreateIndex
CREATE INDEX "Branch_businessId_isActive_idx" ON "Branch"("businessId", "isActive");

-- CreateIndex
CREATE INDEX "Branch_city_isActive_idx" ON "Branch"("city", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_businessId_code_key" ON "Branch"("businessId", "code");

-- CreateIndex
CREATE INDEX "BranchHour_branchId_dayOfWeek_idx" ON "BranchHour"("branchId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "BranchHour_branchId_dayOfWeek_opensAt_closesAt_key" ON "BranchHour"("branchId", "dayOfWeek", "opensAt", "closesAt");

-- CreateIndex
CREATE UNIQUE INDEX "BranchSpecialHour_branchId_date_key" ON "BranchSpecialHour"("branchId", "date");

-- CreateIndex
CREATE INDEX "MenuCategory_businessId_isActive_sortOrder_idx" ON "MenuCategory"("businessId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MenuCategory_businessId_slug_key" ON "MenuCategory"("businessId", "slug");

-- CreateIndex
CREATE INDEX "MenuItem_businessId_categoryId_isActive_sortOrder_idx" ON "MenuItem"("businessId", "categoryId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemVariant_sku_key" ON "MenuItemVariant"("sku");

-- CreateIndex
CREATE INDEX "MenuItemVariant_menuItemId_isActive_idx" ON "MenuItemVariant"("menuItemId", "isActive");

-- CreateIndex
CREATE INDEX "ModifierGroup_businessId_idx" ON "ModifierGroup"("businessId");

-- CreateIndex
CREATE INDEX "ModifierOption_modifierGroupId_isActive_sortOrder_idx" ON "ModifierOption"("modifierGroupId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "BranchMenuItemVariant_branchId_isAvailable_idx" ON "BranchMenuItemVariant"("branchId", "isAvailable");

-- CreateIndex
CREATE INDEX "BranchModifierOption_branchId_isAvailable_idx" ON "BranchModifierOption"("branchId", "isAvailable");

-- CreateIndex
CREATE INDEX "CustomerAddress_userId_idx" ON "CustomerAddress"("userId");

-- CreateIndex
CREATE INDEX "Cart_customerId_status_idx" ON "Cart"("customerId", "status");

-- CreateIndex
CREATE INDEX "Cart_branchId_status_idx" ON "Cart"("branchId", "status");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_publicId_key" ON "Order"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_cartId_key" ON "Order"("cartId");

-- CreateIndex
CREATE INDEX "Order_branchId_status_placedAt_idx" ON "Order"("branchId", "status", "placedAt");

-- CreateIndex
CREATE INDEX "Order_customerId_placedAt_idx" ON "Order"("customerId", "placedAt");

-- CreateIndex
CREATE INDEX "Order_paymentStatus_placedAt_idx" ON "Order"("paymentStatus", "placedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_branchId_orderNumber_key" ON "Order"("branchId", "orderNumber");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- CreateIndex
CREATE INDEX "OrderItemModifier_orderItemId_idx" ON "OrderItemModifier"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderAdjustment_orderId_type_idx" ON "OrderAdjustment"("orderId", "type");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_orderId_status_idx" ON "Payment"("orderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerPaymentId_key" ON "Payment"("provider", "providerPaymentId");

-- CreateIndex
CREATE INDEX "Refund_paymentId_status_idx" ON "Refund"("paymentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_paymentId_providerRefundId_key" ON "Refund"("paymentId", "providerRefundId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderDelivery_orderId_key" ON "OrderDelivery"("orderId");

-- CreateIndex
CREATE INDEX "OrderDelivery_status_createdAt_idx" ON "OrderDelivery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RiderAssignment_deliveryId_status_idx" ON "RiderAssignment"("deliveryId", "status");

-- CreateIndex
CREATE INDEX "RiderAssignment_riderId_status_idx" ON "RiderAssignment"("riderId", "status");

-- CreateIndex
CREATE INDEX "RiderAssignmentHistory_assignmentId_createdAt_idx" ON "RiderAssignmentHistory"("assignmentId", "createdAt");

-- CreateIndex
CREATE INDEX "RiderLocationPing_riderId_recordedAt_idx" ON "RiderLocationPing"("riderId", "recordedAt");

-- CreateIndex
CREATE INDEX "RiderLocationPing_deliveryId_recordedAt_idx" ON "RiderLocationPing"("deliveryId", "recordedAt");

-- CreateIndex
CREATE INDEX "Coupon_businessId_isActive_startsAt_endsAt_idx" ON "Coupon"("businessId", "isActive", "startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_businessId_code_key" ON "Coupon"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_redeemedAt_idx" ON "CouponRedemption"("couponId", "redeemedAt");

-- CreateIndex
CREATE INDEX "CouponRedemption_customerId_couponId_idx" ON "CouponRedemption"("customerId", "couponId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderReview_orderId_key" ON "OrderReview"("orderId");

-- CreateIndex
CREATE INDEX "OrderReview_customerId_createdAt_idx" ON "OrderReview"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderReview_riderId_createdAt_idx" ON "OrderReview"("riderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_businessId_name_key" ON "Ingredient"("businessId", "name");

-- CreateIndex
CREATE INDEX "BranchInventory_branchId_idx" ON "BranchInventory"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchInventory_branchId_ingredientId_key" ON "BranchInventory"("branchId", "ingredientId");

-- CreateIndex
CREATE INDEX "InventoryMovement_branchId_ingredientId_createdAt_idx" ON "InventoryMovement"("branchId", "ingredientId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryMovement_orderId_idx" ON "InventoryMovement"("orderId");

-- CreateIndex
CREATE INDEX "IdempotencyKey_expiresAt_idx" ON "IdempotencyKey"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_scope_key_key" ON "IdempotencyKey"("scope", "key");

-- CreateIndex
CREATE INDEX "OutboxEvent_publishedAt_availableAt_idx" ON "OutboxEvent"("publishedAt", "availableAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "AuditLog_businessId_createdAt_idx" ON "AuditLog"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderProfile" ADD CONSTRAINT "RiderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMembership" ADD CONSTRAINT "BusinessMembership_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMembership" ADD CONSTRAINT "BusinessMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffBranchAccess" ADD CONSTRAINT "StaffBranchAccess_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "BusinessMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffBranchAccess" ADD CONSTRAINT "StaffBranchAccess_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchHour" ADD CONSTRAINT "BranchHour_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchSpecialHour" ADD CONSTRAINT "BranchSpecialHour_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemVariant" ADD CONSTRAINT "MenuItemVariant_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemModifierGroup" ADD CONSTRAINT "MenuItemModifierGroup_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemModifierGroup" ADD CONSTRAINT "MenuItemModifierGroup_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchMenuItemVariant" ADD CONSTRAINT "BranchMenuItemVariant_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchMenuItemVariant" ADD CONSTRAINT "BranchMenuItemVariant_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MenuItemVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchModifierOption" ADD CONSTRAINT "BranchModifierOption_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchModifierOption" ADD CONSTRAINT "BranchModifierOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ModifierOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "CustomerAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MenuItemVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItemModifier" ADD CONSTRAINT "CartItemModifier_cartItemId_fkey" FOREIGN KEY ("cartItemId") REFERENCES "CartItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItemModifier" ADD CONSTRAINT "CartItemModifier_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ModifierOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchOrderCounter" ADD CONSTRAINT "BranchOrderCounter_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MenuItemVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemModifier" ADD CONSTRAINT "OrderItemModifier_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemModifier" ADD CONSTRAINT "OrderItemModifier_modifierOptionId_fkey" FOREIGN KEY ("modifierOptionId") REFERENCES "ModifierOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAdjustment" ADD CONSTRAINT "OrderAdjustment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDelivery" ADD CONSTRAINT "OrderDelivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderAssignment" ADD CONSTRAINT "RiderAssignment_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "OrderDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderAssignment" ADD CONSTRAINT "RiderAssignment_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "RiderProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderAssignmentHistory" ADD CONSTRAINT "RiderAssignmentHistory_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "RiderAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderLocationPing" ADD CONSTRAINT "RiderLocationPing_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "RiderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderLocationPing" ADD CONSTRAINT "RiderLocationPing_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "OrderDelivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReview" ADD CONSTRAINT "OrderReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReview" ADD CONSTRAINT "OrderReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderReview" ADD CONSTRAINT "OrderReview_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "RiderProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MenuItemVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchInventory" ADD CONSTRAINT "BranchInventory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchInventory" ADD CONSTRAINT "BranchInventory_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdempotencyKey" ADD CONSTRAINT "IdempotencyKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
