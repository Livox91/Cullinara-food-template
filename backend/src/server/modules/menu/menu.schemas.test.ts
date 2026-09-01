import { describe, expect, it } from "vitest";
import { CreateDealComboSchema } from "@/server/modules/menu/menu.schemas";

const uuid = (suffix: number) => `00000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;

describe("CreateDealComboSchema", () => {
  it("accepts a deal made from two distinct menu variants", () => {
    const result = CreateDealComboSchema.parse({
      categoryId: uuid(1),
      kind: "DEAL",
      name: "Lunch deal",
      sku: "DEAL-LUNCH",
      price: 799,
      components: [
        { variantId: uuid(2), quantity: 1 },
        { variantId: uuid(3), quantity: 2 },
      ],
    });
    expect(result.components).toHaveLength(2);
  });

  it("rejects repeated variants and bundles with fewer than two components", () => {
    const base = {
      categoryId: uuid(1),
      kind: "COMBO",
      name: "Combo",
      sku: "COMBO-1",
      price: 500,
    };
    expect(() => CreateDealComboSchema.parse({ ...base, components: [{ variantId: uuid(2), quantity: 1 }] })).toThrow();
    expect(() => CreateDealComboSchema.parse({ ...base, components: [{ variantId: uuid(2), quantity: 1 }, { variantId: uuid(2), quantity: 2 }] })).toThrow();
  });
});

describe("menu image references", () => {
  it("accepts a stable WebP object reference", () => {
    const result = CreateDealComboSchema.parse({
      categoryId: uuid(1),
      kind: "DEAL",
      name: "Referenced image deal",
      imageUrl: `/webp/businesses/${uuid(4)}/${uuid(5)}.webp`,
      sku: "DEAL-IMAGE",
      price: 799,
      components: [
        { variantId: uuid(2), quantity: 1 },
        { variantId: uuid(3), quantity: 1 },
      ],
    });
    expect(result.imageUrl).toMatch(/^\/webp\//);
  });
});
