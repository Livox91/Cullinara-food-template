import { resolveImageReference } from "@/server/modules/uploads/image-reference";

const decimal = (value: { toString(): string } | null | undefined) =>
  value == null ? null : value.toString();

export function mapAdminMenu(categories: any[]) {
  return categories.map((category) => ({
    ...category,
    items: category.items.map((item: any) => ({
      ...item,
      imageUrl: resolveImageReference(item.imageUrl),
      variants: item.variants.map((variant: any) => ({
        ...variant,
        basePrice: decimal(variant.basePrice),
      })),
      comboComponents: (item.comboComponents ?? []).map((component: any) => ({
        variantId: component.variantId,
        quantity: component.quantity,
        sortOrder: component.sortOrder,
        itemName: component.variant.menuItem.name,
        variantName: component.variant.name,
      })),
      modifierGroups: item.modifierGroups.map((link: any) => ({
        isRequired: link.isRequired,
        minSelections: link.minSelections,
        maxSelections: link.maxSelections,
        sortOrder: link.sortOrder,
        ...link.modifierGroup,
        options: link.modifierGroup.options.map((option: any) => ({
          ...option,
          priceDelta: decimal(option.priceDelta),
        })),
      })),
    })),
  }));
}

export function mapPublicMenu(categories: any[], now = new Date()) {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    sortOrder: category.sortOrder,
    items: category.items.filter((item: any) => !item.isCombo || (item.comboComponents?.length >= 2 && item.comboComponents.every((component: any) => {
      const override = component.variant.branchVariants?.[0];
      return component.variant.isActive && component.variant.menuItem.isActive && (!override || (override.isAvailable && (!override.soldOutUntil || override.soldOutUntil <= now)));
    }))).map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: resolveImageReference(item.imageUrl),
      isCombo: item.isCombo,
      itemType: item.itemType ?? (item.isCombo ? "COMBO" : "STANDARD"),
      comboComponents: (item.comboComponents ?? []).map((component: any) => ({
        variantId: component.variantId,
        quantity: component.quantity,
        itemName: component.variant.menuItem.name,
        variantName: component.variant.name,
      })),
      variants: item.variants
        .filter((variant: any) => {
          const override = variant.branchVariants[0];
          return (
            !override ||
            (override.isAvailable &&
              (!override.soldOutUntil || override.soldOutUntil <= now))
          );
        })
        .map((variant: any) => {
          const override = variant.branchVariants[0];
          return {
            id: variant.id,
            sku: variant.sku,
            name: variant.name,
            price: decimal(override?.priceOverride ?? variant.basePrice),
            isDefault: variant.isDefault,
            prepMinutes: variant.prepMinutes,
          };
        }),
      modifierGroups: item.modifierGroups.map((link: any) => ({
        id: link.modifierGroup.id,
        name: link.modifierGroup.name,
        isRequired: link.isRequired,
        minSelections: link.minSelections,
        maxSelections: link.maxSelections,
        options: link.modifierGroup.options
          .filter(
            (option: any) =>
              !option.branchOptions[0] || option.branchOptions[0].isAvailable,
          )
          .map((option: any) => ({
            id: option.id,
            name: option.name,
            priceDelta: decimal(
              option.branchOptions[0]?.priceOverride ?? option.priceDelta,
            ),
          })),
      })),
    })),
  }));
}
