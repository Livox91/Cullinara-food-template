import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
export async function inventoryActor(
  r: Request,
  business: string,
  branchId?: string,
) {
  const p = await requirePrincipal(r),
    businessId = z.string().uuid().parse(business);
  return requireBusinessActor(p, {
    businessId,
    branchId,
    capability: "inventory.manage",
  });
}
export const uuid = (v: string) => z.string().uuid().parse(v);
