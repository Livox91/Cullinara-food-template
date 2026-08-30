import { z } from "zod";
import { apiHandler, apiOk } from "@/server/http/response";
import { menuService } from "@/server/modules/menu/menu.service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<{ branchId: string; itemId: string }> };
export async function GET(r: Request, c: C) {
  return apiHandler(r, async ({ requestId }) => {
    const p = await c.params;
    return apiOk(
      await menuService.publicMenu(
        z.string().uuid().parse(p.branchId),
        z.string().uuid().parse(p.itemId),
      ),
      requestId,
    );
  });
}
