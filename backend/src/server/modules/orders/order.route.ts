import { z } from "zod";
import { requireBusinessActor } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
import type { BusinessCapability } from "@/server/auth/authorization";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { OrderReasonSchema } from "@/server/modules/orders/order.schemas";
import { businessOrderService } from "@/server/modules/orders/order.service";
export const publicId = (v: string) => z.string().min(1).max(100).parse(v);
export async function orderActor(
  r: Request,
  p: { businessId: string; branchId: string },
  capability: BusinessCapability,
) {
  const principal = await requirePrincipal(r);
  const businessId = z.string().uuid().parse(p.businessId),
    branchId = z.string().uuid().parse(p.branchId);
  return {
    actor: await requireBusinessActor(principal, {
      businessId,
      branchId,
      capability,
    }),
    branchId,
  };
}
type Command =
  "confirm" | "reject" | "prepare" | "ready" | "cancel" | "completePickup";
export async function businessOrderCommand(
  r: Request,
  params: Promise<{ businessId: string; branchId: string; publicId: string }>,
  command: Command,
) {
  return apiHandler(r, async ({ requestId }) => {
    const p = await params;
    const capability: BusinessCapability =
      command === "confirm" || command === "reject"
        ? "order.confirm"
        : command === "cancel"
          ? "order.cancel"
          : "order.prepare";
    const { actor, branchId } = await orderActor(r, p, capability);
    const oid = publicId(p.publicId);
    const reason =
      command === "reject" || command === "cancel"
        ? OrderReasonSchema.parse(await readJson(r)).reason
        : undefined;
    const result =
      command === "confirm"
        ? await businessOrderService.confirm(actor, branchId, oid)
        : command === "reject"
          ? await businessOrderService.reject(actor, branchId, oid, reason!)
          : command === "prepare"
            ? await businessOrderService.prepare(actor, branchId, oid)
            : command === "ready"
              ? await businessOrderService.ready(actor, branchId, oid)
              : command === "cancel"
                ? await businessOrderService.cancel(
                    actor,
                    branchId,
                    oid,
                    reason!,
                  )
                : await businessOrderService.completePickup(
                    actor,
                    branchId,
                    oid,
                  );
    return apiOk(result, requestId);
  });
}
