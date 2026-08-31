import "server-only";
import { getPrisma } from "@/server/db/prisma";
import { AppError, ConflictError, NotFoundError } from "@/server/http/errors";
async function context(userId: string, publicId: string) {
  const customer = await getPrisma().customerProfile.findUnique({
    where: { userId },
  });
  if (!customer) throw new NotFoundError("Customer profile");
  const order = await getPrisma().order.findFirst({
    where: { publicId, customerId: customer.id },
    include: {
      delivery: {
        include: { assignments: { where: { status: "COMPLETED" } } },
      },
      review: true,
    },
  });
  if (!order) throw new NotFoundError("Order");
  return { customer, order };
}
const dto = (r: any) => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});
export const reviewService = {
  async publicForBranch(branchId: string, limit = 6) {
    const branch = await getPrisma().branch.findFirst({
      where: { id: branchId, isActive: true, business: { status: "ACTIVE" } },
      select: { id: true },
    });
    if (!branch) throw new NotFoundError("Branch");
    const reviews = await getPrisma().orderReview.findMany({
      where: {
        order: { branchId },
        foodRating: { not: null },
        comment: { not: null },
      },
      take: Math.min(Math.max(limit, 1), 12),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        foodRating: true,
        comment: true,
        createdAt: true,
        customer: { select: { firstName: true, lastName: true } },
      },
    });
    return reviews.map((review) => ({
      id: review.id,
      rating: review.foodRating,
      comment: review.comment,
      customerName:
        [review.customer.firstName, review.customer.lastName]
          .filter(Boolean)
          .join(" ") || "Culinara customer",
      createdAt: review.createdAt.toISOString(),
    }));
  },
  async get(userId: string, publicId: string) {
    const { order } = await context(userId, publicId);
    return order.review ? dto(order.review) : null;
  },
  async create(userId: string, publicId: string, input: any) {
    const { customer, order } = await context(userId, publicId);
    if (order.status !== "COMPLETED")
      throw new AppError(
        "ORDER_NOT_REVIEWABLE",
        "Only completed orders can be reviewed.",
        422,
      );
    if (order.review)
      throw new ConflictError(
        "REVIEW_EXISTS",
        "This order already has a review.",
      );
    const riderId = order.delivery?.assignments[0]?.riderId ?? null;
    if (input.riderRating && !riderId)
      throw new AppError(
        "RIDER_NOT_REVIEWABLE",
        "No rider fulfilled this order.",
        422,
      );
    return dto(
      await getPrisma().orderReview.create({
        data: {
          orderId: order.id,
          customerId: customer.id,
          riderId,
          foodRating: input.foodRating,
          riderRating: input.riderRating,
          comment: input.comment,
        },
      }),
    );
  },
};
