-- Run AFTER the Prisma migration that creates the tables/enums.
-- Keep this SQL in the same Prisma migration directory so it is versioned with the schema.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- CHECK CONSTRAINTS ----------

ALTER TABLE "User"
  ADD CONSTRAINT "User_contact_required_chk"
  CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_lower_key"
  ON "User" (lower("email"))
  WHERE "email" IS NOT NULL;

ALTER TABLE "Branch"
  ADD CONSTRAINT "Branch_latitude_chk" CHECK ("latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "Branch_longitude_chk" CHECK ("longitude" BETWEEN -180 AND 180),
  ADD CONSTRAINT "Branch_minimum_order_chk" CHECK ("minimumOrderAmount" >= 0),
  ADD CONSTRAINT "Branch_delivery_radius_chk" CHECK ("deliveryRadiusKm" IS NULL OR "deliveryRadiusKm" > 0),
  ADD CONSTRAINT "Branch_prep_minutes_chk" CHECK ("defaultPrepMinutes" >= 0);

ALTER TABLE "BranchHour"
  ADD CONSTRAINT "BranchHour_day_chk" CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  ADD CONSTRAINT "BranchHour_time_chk" CHECK ("opensAt" <> "closesAt");

ALTER TABLE "BranchSpecialHour"
  ADD CONSTRAINT "BranchSpecialHour_shape_chk"
  CHECK (
    ("isClosed" = TRUE AND "opensAt" IS NULL AND "closesAt" IS NULL)
    OR
    ("isClosed" = FALSE AND "opensAt" IS NOT NULL AND "closesAt" IS NOT NULL AND "opensAt" <> "closesAt")
  );

ALTER TABLE "MenuItemVariant"
  ADD CONSTRAINT "MenuItemVariant_price_chk" CHECK ("basePrice" >= 0),
  ADD CONSTRAINT "MenuItemVariant_prep_chk" CHECK ("prepMinutes" IS NULL OR "prepMinutes" >= 0);

ALTER TABLE "MenuItemModifierGroup"
  ADD CONSTRAINT "MenuItemModifierGroup_selection_chk"
  CHECK ("minSelections" >= 0 AND "maxSelections" >= 1 AND "minSelections" <= "maxSelections");

ALTER TABLE "BranchMenuItemVariant"
  ADD CONSTRAINT "BranchMenuItemVariant_price_chk"
  CHECK ("priceOverride" IS NULL OR "priceOverride" >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS "MenuItemVariant_one_default_per_item"
  ON "MenuItemVariant" ("menuItemId")
  WHERE "isDefault" = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerAddress_one_default_per_user"
  ON "CustomerAddress" ("userId")
  WHERE "isDefault" = TRUE;

ALTER TABLE "CustomerAddress"
  ADD CONSTRAINT "CustomerAddress_latitude_chk" CHECK ("latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "CustomerAddress_longitude_chk" CHECK ("longitude" BETWEEN -180 AND 180);

ALTER TABLE "CartItem"
  ADD CONSTRAINT "CartItem_quantity_chk" CHECK ("quantity" > 0);

ALTER TABLE "CartItemModifier"
  ADD CONSTRAINT "CartItemModifier_quantity_chk" CHECK ("quantity" > 0);

CREATE UNIQUE INDEX IF NOT EXISTS "Cart_one_active_per_context"
  ON "Cart" ("customerId", "branchId", "fulfillmentType")
  WHERE "status" = 'ACTIVE';

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_nonnegative_amounts_chk"
  CHECK (
    "subtotalAmount" >= 0 AND
    "discountAmount" >= 0 AND
    "taxAmount" >= 0 AND
    "deliveryFeeAmount" >= 0 AND
    "serviceFeeAmount" >= 0 AND
    "grandTotalAmount" >= 0
  ),
  ADD CONSTRAINT "Order_total_math_chk"
  CHECK (
    "grandTotalAmount" =
      "subtotalAmount" - "discountAmount" + "taxAmount" +
      "deliveryFeeAmount" + "serviceFeeAmount" + "roundingAmount"
  );

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_quantity_chk" CHECK ("quantity" > 0),
  ADD CONSTRAINT "OrderItem_money_chk"
  CHECK (
    "unitPrice" >= 0 AND
    "baseSubtotal" = "unitPrice" * "quantity" AND
    "modifierSubtotal" >= 0 AND
    "discountAmount" >= 0 AND
    "taxAmount" >= 0 AND
    "totalAmount" = "baseSubtotal" + "modifierSubtotal" - "discountAmount" + "taxAmount" AND
    "totalAmount" >= 0
  );

ALTER TABLE "OrderItemModifier"
  ADD CONSTRAINT "OrderItemModifier_quantity_chk" CHECK ("quantity" > 0),
  ADD CONSTRAINT "OrderItemModifier_total_chk" CHECK ("totalPrice" = "unitPriceDelta" * "quantity");

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_amount_chk" CHECK ("amount" > 0);

ALTER TABLE "Refund"
  ADD CONSTRAINT "Refund_amount_chk" CHECK ("amount" > 0);

ALTER TABLE "OrderDelivery"
  ADD CONSTRAINT "OrderDelivery_latitude_chk" CHECK ("latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "OrderDelivery_longitude_chk" CHECK ("longitude" BETWEEN -180 AND 180),
  ADD CONSTRAINT "OrderDelivery_distance_chk" CHECK ("distanceKm" IS NULL OR "distanceKm" >= 0);

ALTER TABLE "RiderProfile"
  ADD CONSTRAINT "RiderProfile_location_chk"
  CHECK (
    ("currentLatitude" IS NULL AND "currentLongitude" IS NULL)
    OR
    ("currentLatitude" BETWEEN -90 AND 90 AND "currentLongitude" BETWEEN -180 AND 180)
  );

ALTER TABLE "RiderLocationPing"
  ADD CONSTRAINT "RiderLocationPing_latitude_chk" CHECK ("latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "RiderLocationPing_longitude_chk" CHECK ("longitude" BETWEEN -180 AND 180),
  ADD CONSTRAINT "RiderLocationPing_accuracy_chk" CHECK ("accuracyM" IS NULL OR "accuracyM" >= 0),
  ADD CONSTRAINT "RiderLocationPing_heading_chk" CHECK ("headingDeg" IS NULL OR ("headingDeg" >= 0 AND "headingDeg" < 360)),
  ADD CONSTRAINT "RiderLocationPing_speed_chk" CHECK ("speedMps" IS NULL OR "speedMps" >= 0);

ALTER TABLE "Coupon"
  ADD CONSTRAINT "Coupon_dates_chk" CHECK ("endsAt" > "startsAt"),
  ADD CONSTRAINT "Coupon_min_order_chk" CHECK ("minOrderAmount" >= 0),
  ADD CONSTRAINT "Coupon_limits_chk"
  CHECK (
    ("totalUsageLimit" IS NULL OR "totalUsageLimit" > 0) AND
    ("perCustomerLimit" IS NULL OR "perCustomerLimit" > 0)
  ),
  ADD CONSTRAINT "Coupon_discount_chk"
  CHECK (
    ("discountType" = 'PERCENT' AND "discountValue" > 0 AND "discountValue" <= 100)
    OR
    ("discountType" = 'FIXED' AND "discountValue" > 0)
  ),
  ADD CONSTRAINT "Coupon_max_discount_chk" CHECK ("maxDiscount" IS NULL OR "maxDiscount" >= 0);

ALTER TABLE "OrderReview"
  ADD CONSTRAINT "OrderReview_food_rating_chk" CHECK ("foodRating" IS NULL OR "foodRating" BETWEEN 1 AND 5),
  ADD CONSTRAINT "OrderReview_rider_rating_chk" CHECK ("riderRating" IS NULL OR "riderRating" BETWEEN 1 AND 5);

ALTER TABLE "RecipeComponent"
  ADD CONSTRAINT "RecipeComponent_quantity_chk" CHECK ("quantity" > 0);

ALTER TABLE "BranchInventory"
  ADD CONSTRAINT "BranchInventory_quantities_chk"
  CHECK (
    "quantityOnHand" >= 0 AND
    "quantityReserved" >= 0 AND
    "quantityReserved" <= "quantityOnHand" AND
    ("reorderLevel" IS NULL OR "reorderLevel" >= 0)
  );

ALTER TABLE "InventoryMovement"
  ADD CONSTRAINT "InventoryMovement_nonzero_chk"
  CHECK ("deltaOnHand" <> 0 OR "deltaReserved" <> 0);

-- ---------- CONCURRENCY / UNIQUENESS ----------

-- Only one accepted/picked-up assignment for a delivery.
CREATE UNIQUE INDEX IF NOT EXISTS "RiderAssignment_one_active_delivery"
  ON "RiderAssignment" ("deliveryId")
  WHERE "status" IN ('ACCEPTED', 'PICKED_UP');

-- A rider may have only one active delivery at a time.
CREATE UNIQUE INDEX IF NOT EXISTS "RiderAssignment_one_active_per_rider"
  ON "RiderAssignment" ("riderId")
  WHERE "status" IN ('ACCEPTED', 'PICKED_UP');

-- ---------- BRANCH ORDER NUMBER ALLOCATION ----------

CREATE OR REPLACE FUNCTION allocate_branch_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  allocated bigint;
BEGIN
  IF NEW."orderNumber" IS NULL THEN
    INSERT INTO "BranchOrderCounter" ("branchId", "nextValue")
    VALUES (NEW."branchId", 2)
    ON CONFLICT ("branchId") DO UPDATE
      SET "nextValue" = "BranchOrderCounter"."nextValue" + 1
    RETURNING "nextValue" - 1 INTO allocated;

    NEW."orderNumber" := allocated;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "Order_allocate_number_trg" ON "Order";
CREATE TRIGGER "Order_allocate_number_trg"
BEFORE INSERT ON "Order"
FOR EACH ROW
EXECUTE FUNCTION allocate_branch_order_number();

-- ---------- ORDER STATE MACHINE ----------

CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."status" IS NOT DISTINCT FROM OLD."status" THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD."status" = 'PLACED' AND NEW."status" IN ('CONFIRMED', 'CANCELLED', 'REJECTED')) OR
    (OLD."status" = 'CONFIRMED' AND NEW."status" IN ('PREPARING', 'CANCELLED')) OR
    (OLD."status" = 'PREPARING' AND NEW."status" IN ('READY', 'CANCELLED')) OR
    (OLD."status" = 'READY' AND NEW."status" IN ('OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED')) OR
    (OLD."status" = 'OUT_FOR_DELIVERY' AND NEW."status" IN ('COMPLETED', 'CANCELLED'))
  ) THEN
    RAISE EXCEPTION 'Illegal order status transition: % -> %', OLD."status", NEW."status"
      USING ERRCODE = '23514';
  END IF;

  IF NEW."status" = 'CONFIRMED' AND NEW."confirmedAt" IS NULL THEN
    NEW."confirmedAt" := now();
  ELSIF NEW."status" = 'COMPLETED' AND NEW."completedAt" IS NULL THEN
    NEW."completedAt" := now();
  ELSIF NEW."status" = 'CANCELLED' AND NEW."cancelledAt" IS NULL THEN
    NEW."cancelledAt" := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "Order_validate_status_trg" ON "Order";
CREATE TRIGGER "Order_validate_status_trg"
BEFORE UPDATE OF "status" ON "Order"
FOR EACH ROW
EXECUTE FUNCTION validate_order_status_transition();

CREATE OR REPLACE FUNCTION write_order_status_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor_type "ActorType";
  v_actor_user uuid;
BEGIN
  v_actor_type := COALESCE(NULLIF(current_setting('app.actor_type', true), ''), 'SYSTEM')::"ActorType";
  v_actor_user := NULLIF(current_setting('app.user_id', true), '')::uuid;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO "OrderStatusHistory"
      ("id", "orderId", "fromStatus", "toStatus", "actorType", "actorUserId", "createdAt")
    VALUES
      (gen_random_uuid(), NEW."id", NULL, NEW."status", v_actor_type, v_actor_user, now());
  ELSIF NEW."status" IS DISTINCT FROM OLD."status" THEN
    INSERT INTO "OrderStatusHistory"
      ("id", "orderId", "fromStatus", "toStatus", "actorType", "actorUserId", "createdAt")
    VALUES
      (gen_random_uuid(), NEW."id", OLD."status", NEW."status", v_actor_type, v_actor_user, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "Order_status_history_trg" ON "Order";
CREATE TRIGGER "Order_status_history_trg"
AFTER INSERT OR UPDATE OF "status" ON "Order"
FOR EACH ROW
EXECUTE FUNCTION write_order_status_history();

-- ---------- RIDER ASSIGNMENT STATE MACHINE ----------

CREATE OR REPLACE FUNCTION validate_rider_assignment_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."status" IS NOT DISTINCT FROM OLD."status" THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD."status" = 'OFFERED' AND NEW."status" IN ('ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED')) OR
    (OLD."status" = 'ACCEPTED' AND NEW."status" IN ('PICKED_UP', 'CANCELLED')) OR
    (OLD."status" = 'PICKED_UP' AND NEW."status" IN ('COMPLETED', 'CANCELLED'))
  ) THEN
    RAISE EXCEPTION 'Illegal rider assignment transition: % -> %', OLD."status", NEW."status"
      USING ERRCODE = '23514';
  END IF;

  IF NEW."status" = 'ACCEPTED' AND NEW."acceptedAt" IS NULL THEN
    NEW."acceptedAt" := now();
  ELSIF NEW."status" = 'PICKED_UP' AND NEW."pickedUpAt" IS NULL THEN
    NEW."pickedUpAt" := now();
  ELSIF NEW."status" = 'COMPLETED' AND NEW."completedAt" IS NULL THEN
    NEW."completedAt" := now();
  ELSIF NEW."status" = 'CANCELLED' AND NEW."cancelledAt" IS NULL THEN
    NEW."cancelledAt" := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "RiderAssignment_validate_status_trg" ON "RiderAssignment";
CREATE TRIGGER "RiderAssignment_validate_status_trg"
BEFORE UPDATE OF "status" ON "RiderAssignment"
FOR EACH ROW
EXECUTE FUNCTION validate_rider_assignment_transition();

CREATE OR REPLACE FUNCTION write_rider_assignment_history()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor_type "ActorType";
  v_actor_user uuid;
BEGIN
  v_actor_type := COALESCE(NULLIF(current_setting('app.actor_type', true), ''), 'SYSTEM')::"ActorType";
  v_actor_user := NULLIF(current_setting('app.user_id', true), '')::uuid;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO "RiderAssignmentHistory"
      ("id", "assignmentId", "fromStatus", "toStatus", "actorType", "actorUserId", "createdAt")
    VALUES
      (gen_random_uuid(), NEW."id", NULL, NEW."status", v_actor_type, v_actor_user, now());
  ELSIF NEW."status" IS DISTINCT FROM OLD."status" THEN
    INSERT INTO "RiderAssignmentHistory"
      ("id", "assignmentId", "fromStatus", "toStatus", "actorType", "actorUserId", "createdAt")
    VALUES
      (gen_random_uuid(), NEW."id", OLD."status", NEW."status", v_actor_type, v_actor_user, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "RiderAssignment_status_history_trg" ON "RiderAssignment";
CREATE TRIGGER "RiderAssignment_status_history_trg"
AFTER INSERT OR UPDATE OF "status" ON "RiderAssignment"
FOR EACH ROW
EXECUTE FUNCTION write_rider_assignment_history();

-- ---------- ORDER LINE IMMUTABILITY AFTER ACCEPTANCE ----------

CREATE OR REPLACE FUNCTION assert_order_is_editable(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_status "OrderStatus";
BEGIN
  SELECT "status" INTO v_status FROM "Order" WHERE "id" = p_order_id FOR SHARE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Order % does not exist', p_order_id USING ERRCODE = '23503';
  END IF;

  IF v_status <> 'PLACED' THEN
    RAISE EXCEPTION 'Order % is immutable in status %', p_order_id, v_status USING ERRCODE = '55000';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION guard_order_item_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM assert_order_is_editable(OLD."orderId");
    RETURN OLD;
  END IF;

  PERFORM assert_order_is_editable(NEW."orderId");
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "OrderItem_guard_mutation_trg" ON "OrderItem";
CREATE TRIGGER "OrderItem_guard_mutation_trg"
BEFORE INSERT OR UPDATE OR DELETE ON "OrderItem"
FOR EACH ROW
EXECUTE FUNCTION guard_order_item_mutation();

CREATE OR REPLACE FUNCTION guard_order_item_modifier_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id uuid;
BEGIN
  SELECT oi."orderId" INTO v_order_id
  FROM "OrderItem" oi
  WHERE oi."id" = CASE WHEN TG_OP = 'DELETE' THEN OLD."orderItemId" ELSE NEW."orderItemId" END;

  PERFORM assert_order_is_editable(v_order_id);
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "OrderItemModifier_guard_mutation_trg" ON "OrderItemModifier";
CREATE TRIGGER "OrderItemModifier_guard_mutation_trg"
BEFORE INSERT OR UPDATE OR DELETE ON "OrderItemModifier"
FOR EACH ROW
EXECUTE FUNCTION guard_order_item_modifier_mutation();

CREATE OR REPLACE FUNCTION guard_order_adjustment_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM assert_order_is_editable(OLD."orderId");
    RETURN OLD;
  END IF;

  PERFORM assert_order_is_editable(NEW."orderId");
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "OrderAdjustment_guard_mutation_trg" ON "OrderAdjustment";
CREATE TRIGGER "OrderAdjustment_guard_mutation_trg"
BEFORE INSERT OR UPDATE OR DELETE ON "OrderAdjustment"
FOR EACH ROW
EXECUTE FUNCTION guard_order_adjustment_mutation();

-- ---------- INVENTORY LEDGER -> BALANCE ----------

CREATE OR REPLACE FUNCTION apply_inventory_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO "BranchInventory"
    ("id", "branchId", "ingredientId", "quantityOnHand", "quantityReserved", "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid(), NEW."branchId", NEW."ingredientId", NEW."deltaOnHand", NEW."deltaReserved", now(), now())
  ON CONFLICT ("branchId", "ingredientId") DO UPDATE
  SET
    "quantityOnHand" = "BranchInventory"."quantityOnHand" + EXCLUDED."quantityOnHand",
    "quantityReserved" = "BranchInventory"."quantityReserved" + EXCLUDED."quantityReserved",
    "updatedAt" = now()
  WHERE
    "BranchInventory"."quantityOnHand" + EXCLUDED."quantityOnHand" >= 0
    AND "BranchInventory"."quantityReserved" + EXCLUDED."quantityReserved" >= 0
    AND "BranchInventory"."quantityReserved" + EXCLUDED."quantityReserved"
        <= "BranchInventory"."quantityOnHand" + EXCLUDED."quantityOnHand"
  RETURNING "id" INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Inventory movement would create invalid/negative stock for branch %, ingredient %', NEW."branchId", NEW."ingredientId"
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "InventoryMovement_apply_trg" ON "InventoryMovement";
CREATE TRIGGER "InventoryMovement_apply_trg"
AFTER INSERT ON "InventoryMovement"
FOR EACH ROW
EXECUTE FUNCTION apply_inventory_movement();

CREATE OR REPLACE FUNCTION reject_inventory_movement_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'InventoryMovement is append-only; create a compensating movement instead'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS "InventoryMovement_append_only_trg" ON "InventoryMovement";
CREATE TRIGGER "InventoryMovement_append_only_trg"
BEFORE UPDATE OR DELETE ON "InventoryMovement"
FOR EACH ROW
EXECUTE FUNCTION reject_inventory_movement_mutation();

-- ---------- APPEND-ONLY HISTORY / AUDIT ----------

CREATE OR REPLACE FUNCTION reject_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS "OrderStatusHistory_append_only_trg" ON "OrderStatusHistory";
CREATE TRIGGER "OrderStatusHistory_append_only_trg"
BEFORE UPDATE OR DELETE ON "OrderStatusHistory"
FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

DROP TRIGGER IF EXISTS "RiderAssignmentHistory_append_only_trg" ON "RiderAssignmentHistory";
CREATE TRIGGER "RiderAssignmentHistory_append_only_trg"
BEFORE UPDATE OR DELETE ON "RiderAssignmentHistory"
FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

DROP TRIGGER IF EXISTS "AuditLog_append_only_trg" ON "AuditLog";
CREATE TRIGGER "AuditLog_append_only_trg"
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();

-- ---------- CROSS-BUSINESS / TENANT INTEGRITY ----------

CREATE OR REPLACE FUNCTION enforce_business_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  a uuid;
  b uuid;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'StaffBranchAccess' THEN
      SELECT bm."businessId", br."businessId" INTO a, b
      FROM "BusinessMembership" bm, "Branch" br
      WHERE bm."id" = NEW."membershipId" AND br."id" = NEW."branchId";

    WHEN 'MenuItem' THEN
      SELECT NEW."businessId", mc."businessId" INTO a, b
      FROM "MenuCategory" mc WHERE mc."id" = NEW."categoryId";

    WHEN 'MenuItemModifierGroup' THEN
      SELECT mi."businessId", mg."businessId" INTO a, b
      FROM "MenuItem" mi, "ModifierGroup" mg
      WHERE mi."id" = NEW."menuItemId" AND mg."id" = NEW."modifierGroupId";

    WHEN 'BranchMenuItemVariant' THEN
      SELECT br."businessId", mi."businessId" INTO a, b
      FROM "Branch" br
      JOIN "MenuItemVariant" mv ON mv."id" = NEW."variantId"
      JOIN "MenuItem" mi ON mi."id" = mv."menuItemId"
      WHERE br."id" = NEW."branchId";

    WHEN 'BranchModifierOption' THEN
      SELECT br."businessId", mg."businessId" INTO a, b
      FROM "Branch" br
      JOIN "ModifierOption" mo ON mo."id" = NEW."optionId"
      JOIN "ModifierGroup" mg ON mg."id" = mo."modifierGroupId"
      WHERE br."id" = NEW."branchId";

    WHEN 'Coupon' THEN
      IF NEW."branchId" IS NULL THEN
        RETURN NEW;
      END IF;
      SELECT NEW."businessId", br."businessId" INTO a, b
      FROM "Branch" br WHERE br."id" = NEW."branchId";

    WHEN 'RecipeComponent' THEN
      SELECT mi."businessId", ing."businessId" INTO a, b
      FROM "MenuItemVariant" mv
      JOIN "MenuItem" mi ON mi."id" = mv."menuItemId"
      JOIN "Ingredient" ing ON ing."id" = NEW."ingredientId"
      WHERE mv."id" = NEW."variantId";

    WHEN 'BranchInventory' THEN
      SELECT br."businessId", ing."businessId" INTO a, b
      FROM "Branch" br, "Ingredient" ing
      WHERE br."id" = NEW."branchId" AND ing."id" = NEW."ingredientId";

    WHEN 'InventoryMovement' THEN
      SELECT br."businessId", ing."businessId" INTO a, b
      FROM "Branch" br, "Ingredient" ing
      WHERE br."id" = NEW."branchId" AND ing."id" = NEW."ingredientId";

    WHEN 'CartItem' THEN
      SELECT br."businessId", mi."businessId" INTO a, b
      FROM "Cart" c
      JOIN "Branch" br ON br."id" = c."branchId"
      JOIN "MenuItemVariant" mv ON mv."id" = NEW."variantId"
      JOIN "MenuItem" mi ON mi."id" = mv."menuItemId"
      WHERE c."id" = NEW."cartId";

    WHEN 'CartItemModifier' THEN
      SELECT br."businessId", mg."businessId" INTO a, b
      FROM "CartItem" ci
      JOIN "Cart" c ON c."id" = ci."cartId"
      JOIN "Branch" br ON br."id" = c."branchId"
      JOIN "ModifierOption" mo ON mo."id" = NEW."optionId"
      JOIN "ModifierGroup" mg ON mg."id" = mo."modifierGroupId"
      WHERE ci."id" = NEW."cartItemId";

    WHEN 'OrderItem' THEN
      IF NEW."variantId" IS NULL THEN
        RETURN NEW;
      END IF;
      SELECT br."businessId", mi."businessId" INTO a, b
      FROM "Order" o
      JOIN "Branch" br ON br."id" = o."branchId"
      JOIN "MenuItemVariant" mv ON mv."id" = NEW."variantId"
      JOIN "MenuItem" mi ON mi."id" = mv."menuItemId"
      WHERE o."id" = NEW."orderId";

    WHEN 'OrderItemModifier' THEN
      IF NEW."modifierOptionId" IS NULL THEN
        RETURN NEW;
      END IF;
      SELECT br."businessId", mg."businessId" INTO a, b
      FROM "OrderItem" oi
      JOIN "Order" o ON o."id" = oi."orderId"
      JOIN "Branch" br ON br."id" = o."branchId"
      JOIN "ModifierOption" mo ON mo."id" = NEW."modifierOptionId"
      JOIN "ModifierGroup" mg ON mg."id" = mo."modifierGroupId"
      WHERE oi."id" = NEW."orderItemId";

    ELSE
      RETURN NEW;
  END CASE;

  IF a IS NULL OR b IS NULL OR a <> b THEN
    RAISE EXCEPTION 'Cross-business reference rejected in %', TG_TABLE_NAME
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "StaffBranchAccess_business_scope_trg" ON "StaffBranchAccess";
CREATE TRIGGER "StaffBranchAccess_business_scope_trg" BEFORE INSERT OR UPDATE ON "StaffBranchAccess"
FOR EACH ROW EXECUTE FUNCTION enforce_business_scope();

DROP TRIGGER IF EXISTS "MenuItem_business_scope_trg" ON "MenuItem";
CREATE TRIGGER "MenuItem_business_scope_trg" BEFORE INSERT OR UPDATE ON "MenuItem"
FOR EACH ROW EXECUTE FUNCTION enforce_business_scope();

DROP TRIGGER IF EXISTS "MenuItemModifierGroup_business_scope_trg" ON "MenuItemModifierGroup";
CREATE TRIGGER "MenuItemModifierGroup_business_scope_trg" BEFORE INSERT OR UPDATE ON "MenuItemModifierGroup"
FOR EACH ROW EXECUTE FUNCTION enforce_business_scope();

DROP TRIGGER IF EXISTS "BranchMenuItemVariant_business_scope_trg" ON "BranchMenuItemVariant";
CREATE TRIGGER "BranchMenuItemVariant_business_scope_trg" BEFORE INSERT OR UPDATE ON "BranchMenuItemVariant"
FOR EACH ROW EXECUTE FUNCTION enforce_business_scope();

DROP TRIGGER IF EXISTS "BranchModifierOption_business_scope_trg" ON "BranchModifierOption";
CREATE TRIGGER "BranchModifierOption_business_scope_trg" BEFORE INSERT OR UPDATE ON "BranchModifierOption"
FOR EACH ROW EXECUTE FUNCTION enforce_business_scope();

DROP TRIGGER IF EXISTS "Coupon_business_scope_trg" ON "Coupon";
CREATE TRIGGER "Coupon_business_scope_trg" BEFORE INSERT OR UPDATE ON "Coupon"
FOR EACH ROW EXECUTE FUNCTION enforce_business_scope();

DROP TRIGGER IF EXISTS "RecipeComponent_business_scope_trg" ON "RecipeComponent";
CREATE TRIGGER "RecipeComponent_business_scope_trg" BEFORE INSERT OR UPDATE ON "RecipeComponent"
FOR EACH ROW EXECUTE FUNCTION enforce_business_scope();

DROP TRIGGER IF EXISTS "BranchInventory_business_scope_trg" ON "BranchInventory";
CREATE TRIGGER "BranchInventory_business_scope_trg" BEFORE INSERT OR UPDATE ON "BranchInventory"
FOR EACH ROW EXECUTE FUNCTION enforce_business_scope();

DROP TRIGGER IF EXISTS "InventoryMovement_business_scope_trg" ON "InventoryMovement";
CREATE TRIGGER "InventoryMovement_business_scope_trg" BEFORE INSERT OR UPDATE ON "InventoryMovement"
FOR EACH ROW EXECUTE FUNCTION enforce_business_scope();

DROP TRIGGER IF EXISTS "CartItem_business_scope_trg" ON "CartItem";
CREATE TRIGGER "CartItem_business_scope_trg" BEFORE INSERT OR UPDATE ON "CartItem"
FOR EACH ROW EXECUTE FUNCTION enforce_business_scope();

DROP TRIGGER IF EXISTS "CartItemModifier_business_scope_trg" ON "CartItemModifier";
CREATE TRIGGER "CartItemModifier_business_scope_trg" BEFORE INSERT OR UPDATE ON "CartItemModifier"
FOR EACH ROW EXECUTE FUNCTION enforce_business_scope();

DROP TRIGGER IF EXISTS "OrderItem_business_scope_trg" ON "OrderItem";
CREATE TRIGGER "OrderItem_business_scope_trg" BEFORE INSERT OR UPDATE ON "OrderItem"
FOR EACH ROW EXECUTE FUNCTION enforce_business_scope();

DROP TRIGGER IF EXISTS "OrderItemModifier_business_scope_trg" ON "OrderItemModifier";
CREATE TRIGGER "OrderItemModifier_business_scope_trg" BEFORE INSERT OR UPDATE ON "OrderItemModifier"
FOR EACH ROW EXECUTE FUNCTION enforce_business_scope();
