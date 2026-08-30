import { OrderPage } from "@/components/customer/OrderPage";
export default async function Page({ params }: { params: Promise<{ publicId: string }> }) { const { publicId } = await params; return <OrderPage publicId={publicId}/>; }
