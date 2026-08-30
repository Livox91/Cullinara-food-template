import type { Metadata } from "next";
import "./globals.css";
import { StorefrontProvider } from "@/components/customer/StorefrontProvider";

export const metadata: Metadata = {
  title: "Culinara — Good food, delivered",
  description: "Fresh favourites, family feasts, and local deals delivered to your door.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body suppressHydrationWarning><StorefrontProvider>{children}</StorefrontProvider></body>
    </html>
  );
}
