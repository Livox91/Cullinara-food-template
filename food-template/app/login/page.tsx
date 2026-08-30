import { CustomerAuthForm } from "@/components/customer/CustomerAuthForm";
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) { const { next } = await searchParams; return <CustomerAuthForm mode="login" next={next}/>; }
