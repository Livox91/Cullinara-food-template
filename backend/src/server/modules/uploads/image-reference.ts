import "server-only";
import { getEnvironment } from "@/server/config/env";

export function resolveImageReference(
  value: string | null | undefined,
  publicBaseUrl = getEnvironment().S3_IMAGE_PUBLIC_BASE_URL,
): string | null {
  if (!value) return null;
  if (!/^\/[a-zA-Z0-9/_-]+\.webp$/.test(value)) return value;
  if (!publicBaseUrl) return value;
  return `${publicBaseUrl.replace(/\/$/, "")}${value}`;
}
