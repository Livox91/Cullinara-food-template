import { businessOrderCommand } from "@/server/modules/orders/order.route";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type C = { params: Promise<any> };
export async function POST(r: Request, c: C) {
  return businessOrderCommand(r, c.params, "confirm");
}
