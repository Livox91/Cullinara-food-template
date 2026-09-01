import { describe, expect, it } from "vitest";
import {
  CreateImageUploadSchema,
  MAX_IMAGE_UPLOAD_BYTES,
} from "@/server/modules/uploads/image-upload.schemas";

describe("CreateImageUploadSchema", () => {
  it("accepts a WebP image within the upload limit", () => {
    expect(
      CreateImageUploadSchema.parse({
        fileName: "burger.webp",
        contentType: "image/webp",
        fileSize: 1024,
      }),
    ).toEqual({
      fileName: "burger.webp",
      contentType: "image/webp",
      fileSize: 1024,
    });
  });

  it("rejects non-WebP content and oversized files", () => {
    expect(() =>
      CreateImageUploadSchema.parse({
        fileName: "burger.png",
        contentType: "image/png",
        fileSize: MAX_IMAGE_UPLOAD_BYTES + 1,
      }),
    ).toThrow();
  });
});
