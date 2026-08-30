import { BusinessPortalPageController } from "@/components/controllers/BusinessPortalPageController";
export default async function Page({ params }: { params: Promise<{ businessId: string; orderId: string }> }) { const { businessId, orderId } = await params; return <BusinessPortalPageController businessId={businessId} page="order-detail" entityId={orderId} />; }
