CREATE OR REPLACE FUNCTION apply_inventory_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- A negative value cannot be used as the proposed INSERT row for an upsert:
  -- PostgreSQL evaluates check constraints before resolving ON CONFLICT.
  INSERT INTO "BranchInventory"
    ("id", "branchId", "ingredientId", "quantityOnHand", "quantityReserved", "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid(), NEW."branchId", NEW."ingredientId", 0, 0, now(), now())
  ON CONFLICT ("branchId", "ingredientId") DO NOTHING;

  UPDATE "BranchInventory"
  SET
    "quantityOnHand" = "quantityOnHand" + NEW."deltaOnHand",
    "quantityReserved" = "quantityReserved" + NEW."deltaReserved",
    "updatedAt" = now()
  WHERE
    "branchId" = NEW."branchId"
    AND "ingredientId" = NEW."ingredientId"
    AND "quantityOnHand" + NEW."deltaOnHand" >= 0
    AND "quantityReserved" + NEW."deltaReserved" >= 0
    AND "quantityReserved" + NEW."deltaReserved"
        <= "quantityOnHand" + NEW."deltaOnHand"
  RETURNING "id" INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Inventory movement would create invalid/negative stock for branch %, ingredient %', NEW."branchId", NEW."ingredientId"
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
