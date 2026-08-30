import { BusinessPortalPageController } from "@/components/controllers/BusinessPortalPageController";
export default async function Page({ params }: { params: Promise<{ businessId: string; itemId: string }> }) { const { businessId, itemId } = await params; return <BusinessPortalPageController businessId={businessId} page="menu-item" entityId={itemId} />; }
