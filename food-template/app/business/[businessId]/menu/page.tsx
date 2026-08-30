import { BusinessPortalPageController } from "@/components/controllers/BusinessPortalPageController";
export default async function Page({ params }: { params: Promise<{ businessId: string }> }) { const { businessId } = await params; return <BusinessPortalPageController businessId={businessId} page="menu" />; }
