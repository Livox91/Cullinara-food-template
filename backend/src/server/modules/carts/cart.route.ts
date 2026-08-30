import { requireActiveUser } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
export async function customerId(r: Request) {
  const p = await requirePrincipal(r);
  await requireActiveUser(p);
  return p.userId;
}
