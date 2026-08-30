import type { Metadata } from "next";
import { BusinessPortalPageController } from "@/components/controllers/BusinessPortalPageController";

export const metadata: Metadata = { title: "Dashboard — Culinara Operations" };

export default async function BusinessHomePage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  return <BusinessPortalPageController businessId={businessId} page="dashboard" />;
}
