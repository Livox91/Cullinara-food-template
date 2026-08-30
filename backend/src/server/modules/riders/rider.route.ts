import { z } from "zod";
import { requireActiveUser } from "@/server/auth/authorization";
import { requirePrincipal } from "@/server/auth/principal";
export async function riderUser(r: Request) {
  const p = await requirePrincipal(r);
  await requireActiveUser(p);
  return p.userId;
}
export const assignmentId = (v: string) => z.string().uuid().parse(v);
