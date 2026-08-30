import { BusinessPortalPageController } from "@/components/controllers/BusinessPortalPageController";
export default async function Page({ params }: { params: Promise<{ businessId: string; branchId: string }> }) { const { businessId, branchId } = await params; return <BusinessPortalPageController businessId={businessId} page="inventory" entityId={branchId} />; }
