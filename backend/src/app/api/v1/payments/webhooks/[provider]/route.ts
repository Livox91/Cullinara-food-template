import { z } from "zod";
import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { WebhookSchema } from "@/server/modules/payments/payment.schemas";
import { paymentService } from "@/server/modules/payments/payment.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ provider: string }> };
export async function POST(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) =>
    apiOk(
      await paymentService.webhook(
        z
          .string()
          .regex(/^[a-z0-9_-]+$/i)
          .parse((await c.params).provider),
        r.headers.get("x-webhook-secret"),
        WebhookSchema.parse(await readJson(r)),
      ),
      requestId,
    ),
  );
}
