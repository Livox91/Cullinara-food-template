"use client";

import Link from "next/link";
import { ArrowRight, Clock3, MapPin, Plus, ShoppingBag, Star } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StorefrontShell } from "@/components/customer/StorefrontShell";
import { useStorefront } from "@/components/customer/StorefrontProvider";
import { money } from "@/lib/money";
import type { MenuItem, PublicMenu, PublicReview } from "@/models/storefront";
import { publicApiRequest } from "@/services/apiClient";

type HomeItem = MenuItem & { categoryName: string };

export function HomeExperience() {
  const { branch, loading: branchLoading } = useStorefront();
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branch) return;
    let active = true;
    Promise.all([
      publicApiRequest<PublicMenu>(`branches/${branch.id}/menu`),
      publicApiRequest<PublicReview[]>(`branches/${branch.id}/reviews?limit=6`).catch(() => []),
    ]).then(([nextMenu, nextReviews]) => {
      if (active) { setMenu(nextMenu); setReviews(nextReviews); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [branch]);

  const items = useMemo<HomeItem[]>(() => menu?.categories.flatMap((category) => category.items.map((item) => ({ ...item, categoryName: category.name }))) ?? [], [menu]);
  const hero = items.find((item) => item.imageUrl?.startsWith("https://images.unsplash.com")) ?? items.find((item) => item.imageUrl) ?? items[0];
  const bundles = items.filter((item) => item.itemType === "DEAL" || item.itemType === "COMBO");
  const categorySections = (menu?.categories ?? []).map((category) => ({
    ...category,
    items: category.items.filter((item) => item.itemType === "STANDARD").map((item) => ({ ...item, categoryName: category.name })),
  })).filter((category) => category.items.length > 0);

  return <StorefrontShell><main className="classic-home">
    <section className="classic-hero" style={hero?.imageUrl ? { backgroundImage: `url("${hero.imageUrl}")` } : undefined}><div className="classic-hero-shade"/><div className="store-container classic-hero-copy"><span>FRESH FROM YOUR NEAREST RESTAURANT</span><h1>Satisfy your cravings,<br/>one bite at a time.</h1><p>{branch ? `Ordering from ${branch.name}, ${branch.city}. Freshly prepared in about ${branch.defaultPrepMinutes} minutes.` : "Finding the closest restaurant for you…"}</p><div><Link className="classic-primary" href="/menu">Order now</Link><Link className="classic-secondary" href="/menu">View menu</Link></div></div><div className="classic-dots"><i/><i/><i/></div></section>
    <section className="closest-strip"><div className="store-container"><MapPin/><div><small>YOUR DEFAULT RESTAURANT</small><strong>{branchLoading ? "Finding the closest branch…" : branch ? `${branch.name} · ${branch.city}` : "No branch available"}</strong></div><span><Clock3/> {branch ? `${branch.defaultPrepMinutes} min preparation` : "—"}</span><Link href="/restaurants">Change <ArrowRight/></Link></div></section>
    <div className="store-container classic-content">
      {!loading && bundles.length > 0 && <HomeSection title="Combos and Deals" kind="deals">{bundles.map((item) => <DealCard item={item} key={item.id}/>)}</HomeSection>}
      {loading ? <HomeLoading/> : categorySections.length ? categorySections.map((category) => <HomeSection title={category.name} key={category.id}>{category.items.map((item) => <ProductCard item={item} key={item.id}/>)}</HomeSection>) : <HomeEmpty/>}
      <ReviewsSection reviews={reviews}/>
    </div>
  </main></StorefrontShell>;
}

function HomeSection({ title, kind, children }: { title: string; kind?: "deals"; children: React.ReactNode }) { return <section className="classic-section"><header><h2>{title}</h2><Link href="/menu">View all <ArrowRight/></Link></header><div className={kind === "deals" ? "classic-deal-grid" : "classic-product-grid"}>{children}</div></section>; }
function ReviewsSection({ reviews }: { reviews: PublicReview[] }) { return <section className="classic-section home-reviews"><header><div><small>WHAT OUR CUSTOMERS SAY</small><h2>Customer Reviews</h2></div></header>{reviews.length ? <div className="home-review-grid">{reviews.map((review) => <article key={review.id}><div className="home-review-stars" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star key={index} fill={index < review.rating ? "currentColor" : "none"}/>)}</div><p>“{review.comment}”</p><footer><span>{review.customerName.slice(0, 1).toUpperCase()}</span><div><strong>{review.customerName}</strong><small>{new Date(review.createdAt).toLocaleDateString("en-PK", { month: "short", year: "numeric" })}</small></div></footer></article>)}</div> : <div className="home-review-empty"><Star/><div><h3>No reviews yet</h3><p>Completed customer reviews for this branch will appear here.</p></div></div>}</section>; }
function ProductCard({ item }: { item: HomeItem }) { return <article className="classic-product-card"><Link className="classic-card-image" href="/menu" style={item.imageUrl ? { backgroundImage: `url("${item.imageUrl}")` } : undefined}><span>{money(item.variants[0]?.price)}</span></Link><div className="classic-product-body"><div className="classic-product-copy"><small>{item.categoryName}</small><h3>{item.name}</h3><p>{item.description || "Prepared fresh when you order."}</p></div><Link className="classic-product-action" href="/menu" aria-label={`View ${item.name}`}>View item <Plus/></Link></div></article>; }
function DealCard({ item }: { item: HomeItem }) { return <Link className="classic-deal-card" href="/menu" style={item.imageUrl ? { backgroundImage: `url("${item.imageUrl}")` } : undefined}><span className="bundle-home-badge">{item.itemType}</span><div><small>{item.categoryName}</small><h3>{item.name}</h3><p>From {money(item.variants[0]?.price)}</p></div></Link>; }
function HomeLoading() { return <div className="store-loading"><span/><p>Loading the live menu…</p></div>; }
function HomeEmpty() { return <div className="store-empty"><ShoppingBag/><h3>The menu is being prepared</h3><p>Add published menu items in the business portal.</p></div>; }
