import { apiRequest } from "@/services/apiClient";

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 2000;
const WEBP_QUALITY = 0.82;

interface PresignedImageUpload {
  uploadUrl: string;
  imageRef: string;
  requiredHeaders: Record<string, string>;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This image format could not be read by your browser."));
    };
    image.src = objectUrl;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Your browser could not convert this image to WebP.")),
      "image/webp",
      WEBP_QUALITY,
    );
  });
}

export async function convertImageToWebp(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Please choose an image smaller than 15 MB.");
  }

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not process this image.");
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToWebp(canvas);
  if (blob.type !== "image/webp") {
    throw new Error("Your browser does not support WebP image conversion.");
  }
  if (blob.size > MAX_OUTPUT_BYTES) {
    throw new Error("The converted image is larger than 5 MB. Choose a smaller image.");
  }
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-");
  return new File([blob], `${baseName || "menu-image"}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

export async function uploadMenuImage(
  businessId: string,
  source: File,
): Promise<string> {
  const image = await convertImageToWebp(source);
  const presigned = await apiRequest<PresignedImageUpload>(
    `businesses/${businessId}/uploads/images/presign`,
    {
      method: "POST",
      body: JSON.stringify({
        fileName: image.name,
        contentType: image.type,
        fileSize: image.size,
      }),
    },
  );
  const response = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: presigned.requiredHeaders,
    body: image,
  });
  if (!response.ok) {
    throw new Error("The image could not be uploaded to storage. Please try again.");
  }
  return presigned.imageRef;
}

export async function imageReferenceFromForm(
  businessId: string,
  form: FormData,
  fieldName: string,
): Promise<string | undefined> {
  const selected = form.get(fieldName);
  if (!(selected instanceof File) || selected.size === 0) return undefined;
  return uploadMenuImage(businessId, selected);
}
