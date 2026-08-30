"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Menu, ShoppingBag, UserRound, Utensils, X } from "lucide-react";
import { useState } from "react";
import { useStorefront } from "@/components/customer/StorefrontProvider";

export function StorefrontShell({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  const { branch, cartCount, profile } = useStorefront();
  const pathname = usePathname(); const [open, setOpen] = useState(false);
  const links = [["Menu", "/menu"], ["Restaurants", "/restaurants"], ["My orders", "/account/orders"]];
  return <div className={`store-shell ${compact ? "store-compact" : ""}`}>
    <header className="store-header"><div className="store-container store-nav">
      <Link className="store-brand" href="/"><span><Utensils size={20}/></span>Culinara</Link>
      <button className="store-mobile-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button>
      <nav className={open ? "open" : ""}>{links.map(([label, href]) => <Link key={href} className={pathname === href ? "active" : ""} href={href}>{label}</Link>)}</nav>
      <Link className="store-location" href="/restaurants"><MapPin size={17}/><span><small>Ordering from</small><strong>{branch?.name ?? "Choose a restaurant"}</strong></span></Link>
      <div className="store-nav-actions"><Link href={profile ? "/account" : `/login?next=${encodeURIComponent(pathname)}`} aria-label="Account"><UserRound size={20}/><span>{profile?.firstName ?? "Sign in"}</span></Link><Link className="store-cart-link" href="/cart"><ShoppingBag size={20}/><span>Cart</span>{cartCount > 0 && <b>{cartCount}</b>}</Link></div>
    </div></header>
    {children}
    <footer className="store-footer"><div className="store-container"><div><Link className="store-brand" href="/"><span><Utensils size={18}/></span>Culinara</Link><p>Fresh food, clear prices, and reliable ordering from your local restaurant.</p></div><div><strong>Order</strong><Link href="/menu">Menu</Link><Link href="/restaurants">Locations</Link><Link href="/account/orders">Track an order</Link></div><div><strong>Account</strong><Link href="/account">Profile</Link><Link href="/account/addresses">Addresses</Link><Link href="/business/login">Business portal</Link></div></div><small>© 2026 Culinara. All rights reserved.</small></footer>
  </div>;
}
