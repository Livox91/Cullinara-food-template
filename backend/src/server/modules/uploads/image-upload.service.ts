import "server-only";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { BusinessActor } from "@/server/auth/authorization";
import { getEnvironment } from "@/server/config/env";
import { AppError } from "@/server/http/errors";
import type { CreateImageUploadInput } from "@/server/modules/uploads/image-upload.schemas";

const PRESIGNED_URL_TTL_SECONDS = 300;
let client: S3Client | undefined;

function configuration() {
  const env = getEnvironment();
  if (!env.AWS_REGION || !env.S3_IMAGE_BUCKET || !env.S3_IMAGE_PUBLIC_BASE_URL) {
    throw new AppError(
      "IMAGE_UPLOAD_NOT_CONFIGURED",
      "Image uploads are not configured for this environment.",
      503,
    );
  }
  return {
    region: env.AWS_REGION,
    bucket: env.S3_IMAGE_BUCKET,
    publicBaseUrl: env.S3_IMAGE_PUBLIC_BASE_URL.replace(/\/$/, ""),
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  };
}

function s3Client() {
  const config = configuration();
  client ??= new S3Client({
    region: config.region,
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    forcePathStyle: config.forcePathStyle,
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  return client;
}

export const imageUploadService = {
  async createPresignedUpload(actor: BusinessActor, input: CreateImageUploadInput) {
    const config = configuration();
    const key = `webp/businesses/${actor.businessId}/${crypto.randomUUID()}.webp`;
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      ContentType: input.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });
    const uploadUrl = await getSignedUrl(s3Client(), command, {
      expiresIn: PRESIGNED_URL_TTL_SECONDS,
      signableHeaders: new Set(["content-type", "cache-control"]),
    });

    return {
      uploadUrl,
      imageRef: `/${key}`,
      key,
      expiresInSeconds: PRESIGNED_URL_TTL_SECONDS,
      requiredHeaders: {
        "content-type": input.contentType,
        "cache-control": "public, max-age=31536000, immutable",
      },
    };
  },
};
