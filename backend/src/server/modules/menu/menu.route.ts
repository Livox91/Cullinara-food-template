import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";

export async function menuActor(
  request: Request,
  businessIdValue: string,
  branchId?: string,
) {
  const principal = await requirePrincipal(request);
  const businessId = z.string().uuid().parse(businessIdValue);
  const actor = await requireBusinessActor(principal, {
    businessId,
    branchId,
    capability: "menu.manage",
  });
  return { actor, businessId };
}
export const id = (value: string) => z.string().uuid().parse(value);
