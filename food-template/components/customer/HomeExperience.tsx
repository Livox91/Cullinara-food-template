"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Heart, MapPin, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StorefrontShell } from "@/components/customer/StorefrontShell";
import { useStorefront } from "@/components/customer/StorefrontProvider";
import { money } from "@/lib/money";
import type { MenuItem, PublicMenu } from "@/models/storefront";
import { publicApiRequest } from "@/services/apiClient";

type HomeItem = MenuItem & { categoryName: string };

export function HomeExperience() {
  const { branch, loading: branchLoading } = useStorefront();
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!branch) return;
    let active = true;
    publicApiRequest<PublicMenu>(`branches/${branch.id}/menu`).then((value) => { if (active) setMenu(value); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [branch]);
  const items = useMemo<HomeItem[]>(() => menu?.categories.flatMap((category) => category.items.map((item) => ({ ...item, categoryName: category.name }))) ?? [], [menu]);
  const hero = items.find((item) => item.imageUrl?.startsWith("https://images.unsplash.com")) ?? items.find((item) => item.imageUrl) ?? items[0];
  const bestSellers = items.slice(0, 3); const topDeals = items.slice(1, 4); const featured = items.slice(3, 5).length ? items.slice(3, 5) : items.slice(0, 2);
  return <StorefrontShell><main className="classic-home">
    <section className="classic-hero" style={hero?.imageUrl ? { backgroundImage: `url("${hero.imageUrl}")` } : undefined}><div className="classic-hero-shade"/><div className="store-container classic-hero-copy"><span>FRESH FROM YOUR NEAREST RESTAURANT</span><h1>Satisfy your cravings,<br/>one bite at a time.</h1><p>{branch ? `Ordering from ${branch.name}, ${branch.city}. Freshly prepared in about ${branch.defaultPrepMinutes} minutes.` : "Finding the closest restaurant for you…"}</p><div><Link className="classic-primary" href="/menu">Order now</Link><Link className="classic-secondary" href="/menu">View menu</Link></div></div><div className="classic-dots"><i/><i/><i/></div></section>
    <section className="closest-strip"><div className="store-container"><MapPin/><div><small>YOUR DEFAULT RESTAURANT</small><strong>{branchLoading ? "Finding the closest branch…" : branch ? `${branch.name} · ${branch.city}` : "No branch available"}</strong></div><span><Clock3/> {branch ? `${branch.defaultPrepMinutes} min preparation` : "—"}</span><Link href="/restaurants">Change <ArrowRight/></Link></div></section>
    <div className="store-container classic-content">
      <HomeSection title="Best sellers" loading={loading}>{bestSellers.map((item) => <ProductCard item={item} key={item.id}/>)}</HomeSection>
      <HomeSection title="Top deals" loading={loading} kind="deals">{topDeals.map((item) => <DealCard item={item} key={item.id}/>)}</HomeSection>
      <section className="classic-section"><header><h2>Featured deals</h2><Link href="/menu">View all <ArrowRight/></Link></header>{loading ? <HomeLoading/> : featured.length ? <div className="classic-featured-grid">{featured.map((item, index) => <FeaturedCard item={item} large={index === 0} key={item.id}/>)}</div> : <HomeEmpty/>}</section>
    </div>
  </main></StorefrontShell>;
}

function HomeSection({ title, loading, kind, children }: { title: string; loading: boolean; kind?: "deals"; children: React.ReactNode }) { const empty = Array.isArray(children) && children.length === 0; return <section className="classic-section"><header><h2>{title}</h2><Link href="/menu">View all <ArrowRight/></Link></header>{loading ? <HomeLoading/> : empty ? <HomeEmpty/> : <div className={kind === "deals" ? "classic-deal-grid" : "classic-product-grid"}>{children}</div>}</section>; }
function ProductCard({ item }: { item: HomeItem }) { return <article className="classic-product-card"><Link className="classic-card-image" href="/menu" style={item.imageUrl ? { backgroundImage: `url("${item.imageUrl}")` } : undefined}><span>{money(item.variants[0]?.price)}</span></Link><div className="classic-product-body"><div className="classic-product-copy"><small>{item.categoryName}</small><h3>{item.name}</h3><p>{item.description || "Prepared fresh when you order."}</p></div><Link className="classic-product-action" href="/menu" aria-label={`View ${item.name}`}>View item <Plus/></Link></div></article>; }
function DealCard({ item }: { item: HomeItem }) { return <Link className="classic-deal-card" href="/menu" style={item.imageUrl ? { backgroundImage: `url("${item.imageUrl}")` } : undefined}><span className="classic-heart"><Heart/></span><div><small>{item.categoryName}</small><h3>{item.name}</h3><p>From {money(item.variants[0]?.price)}</p></div></Link>; }
function FeaturedCard({ item, large }: { item: HomeItem; large: boolean }) { return <Link className={`classic-featured-card ${large ? "large" : ""}`} href="/menu" style={item.imageUrl ? { backgroundImage: `url("${item.imageUrl}")` } : undefined}><div><span>{large ? "POPULAR" : "FRESH"}</span><h3>{item.name}</h3><p>{item.description || `Fresh from ${item.categoryName}.`}</p></div><strong>{money(item.variants[0]?.price)}</strong><i><ShoppingBag/></i></Link>; }
function HomeLoading() { return <div className="store-loading"><span/><p>Loading the live menu…</p></div>; }
function HomeEmpty() { return <div className="store-empty"><ShoppingBag/><h3>The menu is being prepared</h3><p>Add published menu items in the business portal.</p></div>; }
