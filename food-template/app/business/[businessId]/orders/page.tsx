import type { Metadata } from "next";
import { BusinessOrdersController } from "@/components/controllers/BusinessOrdersController";

export const metadata: Metadata = {
  title: "Live Orders — Culinara Operations",
  description: "Monitor and manage restaurant orders across branches.",
};

export default async function BusinessOrdersPage({ params }: PageProps<"/business/[businessId]/orders">) {
  const { businessId } = await params;
  return <BusinessOrdersController businessId={businessId} />;
}
