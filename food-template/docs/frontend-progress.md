# Frontend implementation progress

This file tracks the modular rollout of `RESTAURANT_FRONTEND_FEATURES_AND_PAGES.md`. The user request takes priority over the source document.

## Milestone 1: Business portal foundation and live orders — complete

- Added the responsive business operations shell with permission-aware navigation.
- Added business and branch context controls plus branch acceptance state.
- Added the live-orders route at `/business/[businessId]/orders`.
- Added queue summaries, status/type/search filters, order aging, payment state, responsive order views, and an order quick-view drawer.
- Added 15-second refresh behavior and explicit loading/error states.
- Kept the MVC-style data boundary: controller calls service, service fetches JSON, view receives data through props.
- Kept portal theme and layout rules outside component files.
- Did not use local storage or import JSON into a component.

## Deferred until the supporting backend endpoints exist

- Accept, reject, prepare, ready, dispatch, complete, cancel, and refund commands.
- Full order-detail item/modifier view.
- Realtime WebSocket/SSE event transport; polling currently provides the integration seam.

## Milestone 2: Complete business portal page set — complete

- Dashboard and operational attention links.
- Order detail command center and kitchen display.
- Branch list, branch detail, operating hours, branch menu, inventory, and movement history.
- Global menu, menu item editor, and modifier management.
- Coupons, payments/refund investigation, dispatch monitoring, and reviews.
- Team and access, audit history, settings, notifications, and business onboarding.
- Explicit responsive Next.js routes for every business page in the frontend specification.
- Shared management shell, navigation, UI patterns, service, typed read model, and JSON fixture.

## Milestone 3: Business backend integration — complete

- Replaced the business JSON fixtures with authenticated backend reads.
- Added secure login/logout and automatic refresh-token rotation through HTTP-only cookies.
- Connected business onboarding, branches, weekly hours, menu categories/items/variants, modifier groups/options, branch menu overrides, ingredients, inventory purchases/waste, coupons, team invitations, and business settings.
- Connected live-order reads and explicit confirm/reject/prepare/ready/cancel/complete-pickup commands.
- Connected backend-derived dashboard, kitchen, payment, delivery, review, and audit views.
- Removed the business portal and business order fixture files.

The customer storefront still uses its separate home-page fixture and remains the next implementation phase requested by the user.
