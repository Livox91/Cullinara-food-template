import "server-only";
import { z } from "zod";

const EnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  AUTH_JWT_SECRET: z.string().min(32),
  AUTH_ISSUER: z.string().min(1).default("restaurant-backend"),
  AUTH_AUDIENCE: z.string().min(1).default("restaurant-clients"),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  PAYMENT_WEBHOOK_SECRET: z.string().min(16).optional(),
  WORKER_SECRET: z.string().min(16).optional(),
  NOTIFICATION_WEBHOOK_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().min(1).default("Culinara"),
  AWS_REGION: z.string().min(1).optional(),
  S3_IMAGE_BUCKET: z.string().min(3).optional(),
  S3_IMAGE_PUBLIC_BASE_URL: z.string().url().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

let cachedEnvironment: Environment | undefined;

export function getEnvironment(): Environment {
  if (!cachedEnvironment) {
    cachedEnvironment = EnvironmentSchema.parse(process.env);
  }

  return cachedEnvironment;
}

export function getAllowedOrigins(): ReadonlySet<string> {
  return new Set(
    getEnvironment()
      .CORS_ALLOWED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}
