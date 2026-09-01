import { readJson } from "@/server/http/request";
import { apiHandler, apiOk } from "@/server/http/response";
import { menuActor } from "@/server/modules/menu/menu.route";
import { CreateImageUploadSchema } from "@/server/modules/uploads/image-upload.schemas";
import { imageUploadService } from "@/server/modules/uploads/image-upload.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ businessId: string }> };

export async function POST(request: Request, context: Context) {
  return apiHandler(request, async ({ requestId }) => {
    const { actor } = await menuActor(
      request,
      (await context.params).businessId,
    );
    const input = CreateImageUploadSchema.parse(await readJson(request));
    return apiOk(
      await imageUploadService.createPresignedUpload(actor, input),
      requestId,
      { status: 201 },
    );
  });
}
