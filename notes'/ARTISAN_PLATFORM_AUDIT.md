# Luxury Handcrafted Commerce Audit

## Scope

This audit reviews the active workspace implementation in:

- `frontend/` for the live Next.js storefront and admin UI
- `backend/` for the Express + MongoDB API
- `microservices/` for the FastAPI future-state blueprint
- the root workspace configuration for runtime boundaries

Important runtime note:

- The active app is `frontend/`, not the duplicate root `src/` tree. Root scripts only run `frontend` and `backend`.
- The root `src/` folder is divergent duplicate code and currently acts as architecture noise.

## Executive Summary

The current product is a solid handcrafted marketplace foundation, but it is still architected like an upgraded general ecommerce store rather than a customization-first artisan commissioning platform.

What is strong already:

- modern Next.js + TypeScript + Tailwind stack
- working Express + MongoDB backend
- auth with email/password, Google sign-in, and password reset
- persistent cart, checkout, order history, and live order updates
- AI-assisted discovery primitives: homepage recommendations, semantic search, chatbot, dynamic pricing suggestions
- admin CRUD for catalog, uploads, ads, inventory visibility, and order status updates
- premium visual direction on the homepage hero
- 3D model support on product detail pages

What is missing at the business-model level:

- no true product customization engine
- no quote negotiation system
- no customer-artisan conversation workspace
- no approval and revision workflow
- no artisan profile system
- no commission-aware order stages
- no media-rich progress tracking for handmade production
- no WhatsApp deep-linking or inquiry capture despite the business need

Bottom line:

- The codebase is production-capable for classic catalog commerce.
- It is not yet production-capable for a luxury handcrafted commissioning platform.
- The fastest path is to extend the current monolith with new commission-first models, APIs, and reusable frontend modules instead of rebuilding.

## Runtime Boundaries

### Active runtime

- Root scripts delegate to `frontend/` and `backend/`.
- `frontend/` is the actual customer-facing Next app.
- `backend/` is the actual API and realtime server.

### Inactive or non-primary areas

- Root `src/` is a duplicate Next app tree and should not be treated as the source of truth.
- `microservices/` is a blueprint and scaffold, not the active runtime.

### Architecture risk

- Duplicate `src/` and `frontend/src/` trees will increase implementation mistakes, code drift, and onboarding friction.
- The future-state FastAPI microservices are useful design references, but they are not integrated into the live commerce flows.

## Folder Structure Audit

### Frontend

- Strong:
  - app-router structure is simple and understandable
  - components are reusable enough for extension
  - API access is centralized in `frontend/src/lib/api.ts`
- Weak:
  - most business pages are client-only and fetch after mount
  - there is no domain-oriented separation for commissions, inquiries, artisans, or collaboration
  - no shared data cache layer such as React Query or SWR

### Backend

- Strong:
  - routes are clearly separated by domain
  - models cover catalog, carts, orders, reviews, notifications, coupons, behavior, ads
  - realtime service is isolated
- Weak:
  - commission-specific domain models are too shallow
  - most route handlers are still monolithic and route-local
  - no dedicated service layer for custom orders, quotes, messaging, or workflow approvals

### Microservices

- Strong:
  - good blueprint for future decomposition
  - useful as architecture documentation
- Weak:
  - currently not part of the live request path
  - should not influence near-term delivery decisions unless the team is intentionally migrating

## Area-by-Area Audit

### Product Pages

Current state:

- premium hero direction exists on the homepage
- detail pages support images, reviews, related products, cart, wishlist, and optional 3D viewing
- catalog filters support category, brand, price, rating, availability

Gaps:

- product detail is still a standard buy flow
- no customization panel
- no dynamic option selection
- no engraving fields
- no material selection beyond generic category
- no upload reference image
- no quote request path from product detail
- no artisan story, workshop story, or handmade process module
- no dynamic production estimate

### Custom Order Flow

Current state:

- there is a custom-order page and backend endpoint

Gaps:

- only captures name, email, material, description, dimensions, budget
- no attachments
- no quote lifecycle
- no approval or revision lifecycle
- no admin assignment to artisan
- no customer workspace after submission

### Communication

Current state:

- notifications and order updates use Socket.IO
- AI chatbot exists

Gaps:

- no WhatsApp integration
- no live human chat
- no artisan conversation threads
- no file sharing in chat
- no inquiry inbox
- no notification preferences or message center behavior beyond listing alerts

### Orders and Tracking

Current state:

- orders are stored, payable, cancellable, and live-updated
- timeline events exist

Gaps:

- status model is generic delivery commerce
- no handcrafted production stages
- no stage assets, videos, approval states, or ETA by craft stage
- no distinction between standard order and commissioned order

### Admin

Current state:

- dashboard metrics
- product CRUD
- asset upload
- bulk import
- ads management
- order status updates
- coupon APIs exist

Gaps:

- no custom-order dashboard
- no quote management
- no artisan assignment
- no progress media uploads per commission stage
- no communication inbox
- no coupon UI despite coupon APIs
- no workflow board for commissions

### Authentication

Current state:

- email/password auth
- Google auth
- forgot/reset password
- admin flag in token payload

Gaps:

- no artisan role experience beyond dormant `isVendor`
- no profile completion for artisans
- no customer preference profile for commissioning

### Payment

Current state:

- Stripe payment intent for cards
- COD and basic UPI field

Gaps:

- UPI is UI-only and not truly processed
- quote approval deposits are missing
- milestone payments are missing
- no invoice-style quote acceptance flow

### State Management

Current state:

- local component state
- localStorage for user, guest cart, recently viewed
- event-based syncing with `storage` and custom events

Gaps:

- no normalized server-state layer
- duplicated fetch logic
- no optimistic workflow model for commission collaboration

### SEO

Current state:

- root layout metadata exists
- static build succeeds

Gaps:

- product detail pages are client-fetched, so they do not expose product-specific metadata or server-rendered content
- category and product pages are weak for search intent like custom stone name boards, bronze idols, temple art commissions
- no structured data for products, reviews, organization, or FAQ

### Accessibility

Current state:

- some semantic headings exist
- slider announces changes
- forms generally have labels

Gaps:

- autocomplete/suggestion flow is mouse-oriented
- many raw `img` tags remain instead of optimized/accessibility-friendly image patterns
- no keyboard-first messaging or workspace patterns
- admin density will be difficult for assistive technology users

### Performance

Current state:

- production build succeeds
- pages statically build where possible

Gaps:

- repeated client-only fetching across major routes
- raw `img` usage
- 3D viewer dependencies are imported into product detail client up front
- no caching strategy for catalog, home bands, notifications, or admin datasets

## Verification Results

### Build and lint

- `npm --prefix frontend run build`: passed
- `npm --prefix frontend run lint`: passed with 10 image optimization warnings
- `npm --prefix backend run test`: failed

### Backend type health

Current blocker:

- `backend/src/routes/adminRoutes.ts` fails TypeScript because `normalizeProductPayload()` returns `availability` as plain `string`, which is not compatible with the `Product` model enum typing.

Impact:

- backend is not in clean type-safe state
- production changes should fix this before adding commission workflows

## Feature Classification

### Already Implemented

| Feature | Status | Notes |
| --- | --- | --- |
| Catalog browsing | Implemented | Listing, filters, sorting, suggestions |
| Product detail | Implemented | Images, reviews, related items |
| 3D product viewing | Implemented | GLB/GLTF support exists |
| Cart | Implemented | Logged-in and guest paths |
| Checkout | Implemented | COD, card, basic UPI field |
| Orders | Implemented | Order creation, history, cancel, pay |
| Live order updates | Implemented | Socket.IO order updates |
| Notifications | Implemented | Socket-based alert feed |
| Auth | Implemented | Register, login, Google, reset |
| AI discovery | Implemented | Homepage recs, semantic search, chatbot, dynamic pricing |
| Admin catalog CRUD | Implemented | Create, edit, delete, import, upload |
| Homepage premium hero | Implemented | Strong handcrafted visual direction |

### Partially Implemented

| Feature | Status | Why Partial |
| --- | --- | --- |
| Custom orders | Partial | Form exists, lifecycle does not |
| Realtime communication | Partial | Order updates exist, artisan messaging does not |
| Premium UX | Partial | Homepage is premium, inner commerce flows are generic |
| 3D commerce | Partial | Viewer exists, no configuration/AR/story integration |
| Admin promotions | Partial | Ads work, coupons have backend APIs but no admin UI |
| Multilingual support | Partial | i18n file exists, navbar switch is placeholder only |
| WhatsApp | Partial | A checkbox mentions WhatsApp, no real integration |
| AI enhancement | Partial | AI primitives exist, some UI is mock-only |

### Missing Completely

| Feature | Status |
| --- | --- |
| Product customization engine | Missing |
| Engraving fields | Missing |
| Dynamic material/size options | Missing |
| Reference image upload on product/custom order | Missing |
| Quote request and negotiation | Missing |
| Design approval workflow | Missing |
| Revision workflow | Missing |
| Customer-artisan workspace | Missing |
| Artisan profiles and stories | Missing |
| Workshop gallery | Missing |
| Commission progress gallery | Missing |
| Artisan assignment in admin | Missing |
| Custom order board in admin | Missing |
| Handmade production stages | Missing |
| Stage notes/photos/videos/ETA | Missing |
| Deep WhatsApp links | Missing |
| Human live chat | Missing |
| Room preview / AR / AI design assistant | Missing |

### Poorly Designed

| Feature | Why |
| --- | --- |
| Product detail flow | still optimized for add-to-cart, not commissioning |
| Order tracking | generic shipping flow, not crafted production flow |
| Checkout | still assumes instant purchase instead of consultation-first work |
| Chat | chatbot is sales helper, not artisan collaboration |
| Language switch | alert placeholder instead of actual translation |
| AI Enhance button | explicit mock alert in admin |
| Push notification CTA | visual CTA without real workflow |
| Guest checkout for commissioned business | misaligned with workspace and approval needs |

### Needs UX Enhancement

| Area | Need |
| --- | --- |
| Product detail | commission-first layout, artisan trust, process storytelling |
| Custom order page | luxury brief intake instead of basic contact form |
| Admin | workflow dashboard instead of flat CRUD screen |
| Notifications | message center behavior and action links |
| Orders | craft-stage visuals and approvals |
| Cart/checkout | split standard purchase from commissioned inquiry |
| Typography | stronger brand typography beyond system defaults |

### Needs Backend Enhancement

| Area | Need |
| --- | --- |
| Custom orders | richer schema and service layer |
| Orders | handcrafted workflow stages and asset-rich events |
| Messaging | conversation, attachment, and participant models |
| Quotes | quote, revision, approval, and deposit models |
| Artisan management | artisan profiles, assignment, capacity |
| Notifications | event taxonomy for commissions |
| Media | commission attachment support and better storage strategy |

## Important Findings With File Evidence

### 1. The active app is `frontend/`, but the repo also contains a divergent root `src/` tree

- Root scripts only run the workspace packages in `frontend` and `backend`.
- This means root `src/` is not the active storefront runtime and should be consolidated or archived before major feature work.

### 2. Product detail pages are generic commerce pages, not commission-first pages

- The detail UI currently centers on rating, price, add-to-cart, wishlist, and reviews.
- There is no configuration, quote, artisan discussion, or reference upload flow.

### 3. The custom-order schema is far too shallow for your business model

- The data model only stores contact info, one material field, description, dimensions, budget, and a basic status.
- There is no quote, revision, file, stage, assignment, or conversation data.

### 4. The order lifecycle is generic shipping commerce

- The order model and tracking UI use `placed -> confirmed -> packed -> shipped -> out-for-delivery -> delivered`.
- That does not match inquiry, consultation, design approval, material selection, sculpting, finishing, and inspection.

### 5. Realtime support exists, but only for order updates and a canned support echo

- Socket rooms are implemented.
- Human artisan collaboration is not.

### 6. WhatsApp is not actually integrated

- The checkout page shows a WhatsApp updates checkbox, but there is no deep link, opt-in storage, or messaging workflow.

### 7. The admin surface is still product/order centric, not commission centric

- Admin loads dashboard, products, orders, and ads.
- It does not load or manage custom orders, quotes, artisans, or workflow stages.

### 8. Coupon support is backend-only in practice

- Coupon CRUD APIs exist in admin routes.
- The admin page does not load or manage coupons.

### 9. Some “AI features” are still placeholders

- The admin page includes an `AI Enhance` action that only fires an alert mock.

### 10. SEO is weak on the pages that matter most for long-tail handcrafted search

- Product detail routing is server-side shell plus client fetch, with no product-specific metadata generation.
- This hurts discoverability for high-intent commission queries.

## Upgrade Roadmap

### Phase 1: High Impact / Low Complexity

Goal:

- turn the catalog into an inquiry-capable storefront without breaking existing checkout

Implement:

- floating WhatsApp button
- product-aware “Talk With Artisan” CTA
- quote request CTA on product pages
- product customization brief panel
- reference image upload
- admin custom order inbox
- handcrafted workflow stage model
- customer inquiry status page

Why first:

- highest business impact
- minimal risk to working cart/order flows
- creates a clear bridge from browsing to commissioning

### Phase 2: Premium UX

Implement:

- artisan profile card component
- handmade process section on product detail
- workshop/gallery module
- luxury form treatment for custom requests
- richer storytelling blocks and process visuals
- commission-first product detail layout

### Phase 3: Realtime Collaboration

Implement:

- conversation threads
- socket events for inquiry/workspace rooms
- file sharing in workspace
- approval requests and notifications
- timeline updates with media

### Phase 4: Advanced Experience

Implement:

- AI recommendation for commissions
- room preview concepts
- visual design assistant
- AR/3D upgrade path

## File-by-File Implementation Plan

### Frontend new modules

- `frontend/src/components/WhatsAppFloatingButton.tsx`
- `frontend/src/components/TalkWithArtisanButton.tsx`
- `frontend/src/components/ProductCustomizationPanel.tsx`
- `frontend/src/components/QuoteRequestDrawer.tsx`
- `frontend/src/components/HandmadeProcessTimeline.tsx`
- `frontend/src/components/ArtisanStoryCard.tsx`
- `frontend/src/components/CommissionStageTimeline.tsx`
- `frontend/src/components/WorkspaceChatPanel.tsx`
- `frontend/src/components/WorkspaceFilesPanel.tsx`
- `frontend/src/components/WorkspaceApprovalPanel.tsx`

### Frontend route extensions

- extend `frontend/src/components/ProductDetailClient.tsx`
  - add customization panel
  - add quote CTA
  - add artisan CTA
  - add process storytelling
- extend `frontend/src/app/custom-order/page.tsx`
  - convert into a premium commission brief flow
- add `frontend/src/app/inquiries/page.tsx`
  - customer inquiry list
- add `frontend/src/app/inquiries/[id]/page.tsx`
  - customer-artisan workspace
- extend `frontend/src/app/admin/page.tsx`
  - custom order queue
  - quote actions
  - artisan assignment
  - stage updates

### Backend new models

- `backend/src/models/Quote.ts`
- `backend/src/models/CommissionMessage.ts`
- `backend/src/models/CommissionAttachment.ts`
- `backend/src/models/ArtisanProfile.ts`
- `backend/src/models/CommissionWorkspace.ts`

### Backend model upgrades

- extend `backend/src/models/CustomOrder.ts`
  - product reference
  - requested options
  - attachments
  - assigned artisan
  - quote status
  - revision count
  - approval state
  - estimated production days
- extend `backend/src/models/Order.ts`
  - order type
  - commission reference
  - rich stage events with media
  - stage ETA fields
- extend `backend/src/models/Product.ts`
  - customizable flag
  - option definitions
  - base quote guidance
  - artisan profile linkage

### Backend new routes

- `backend/src/routes/quoteRoutes.ts`
- `backend/src/routes/workspaceRoutes.ts`
- `backend/src/routes/artisanRoutes.ts`
- `backend/src/routes/mediaRoutes.ts`

### Backend route extensions

- extend `backend/src/routes/customOrderRoutes.ts`
  - file upload
  - status transitions
  - assignment
  - quote linkage
- extend `backend/src/routes/orderRoutes.ts`
  - handcrafted stage transitions
  - commission-aware reads
- extend `backend/src/routes/adminRoutes.ts`
  - custom order board
  - artisan assignment
  - quote actions

## Database Schema Upgrades

### Product

Add fields:

- `isCustomizable: boolean`
- `customizationSchema: { key, label, type, required, options, pricingMode }[]`
- `allowedMaterials: string[]`
- `allowedSizes: string[]`
- `supportsEngraving: boolean`
- `referenceImageRequired: boolean`
- `artisanProfileId`
- `commissionLeadTimeDays`

### CustomOrder

Add fields:

- `productId`
- `source: 'product' | 'standalone'`
- `brief`
- `requestedMaterials`
- `requestedSize`
- `engravingText`
- `attachments`
- `quoteId`
- `assignedArtisanId`
- `status`
- `approvalStatus`
- `revisionCount`
- `estimatedPriceMin`
- `estimatedPriceMax`
- `expectedCompletionDate`

### Quote

Fields:

- `customOrderId`
- `version`
- `lineItems`
- `subtotal`
- `depositAmount`
- `status`
- `notes`
- `customerApprovedAt`
- `expiresAt`

### CommissionWorkspace

Fields:

- `customOrderId`
- `customerId`
- `artisanId`
- `participants`
- `latestMessageAt`
- `unreadCounts`

### Order / Stage Events

Replace generic-only status dependence with stage entries:

- `code`
- `label`
- `notes`
- `photos`
- `videos`
- `estimatedCompletion`
- `approvedByCustomer`
- `visibleToCustomer`

## Realtime Communication Architecture

### Keep

- existing Socket.IO foundation
- room pattern for `user:{id}` and `order:{id}`

### Extend

- add `workspace:{id}` rooms
- add events:
  - `workspace:join`
  - `workspace:message`
  - `workspace:file`
  - `workspace:approval-requested`
  - `workspace:approval-resolved`
  - `workspace:stage-updated`

### Persistence

- sockets only for delivery
- all messages, approvals, and file metadata stored in MongoDB

### Why this scales

- easy to add notification fan-out
- keeps current monolith intact
- later maps cleanly into the microservice blueprint if needed

## Customization Engine Architecture

### Frontend

- render product-defined customization schemas
- support field types:
  - select
  - radio
  - text engraving
  - numeric size
  - file upload
  - freeform notes

### Backend

- store schema on product
- validate selections server-side
- compute either:
  - instant estimated add-on price
  - quote-required path

### Pricing modes

- `fixed`
- `multiplier`
- `quote_required`

### Business fit

- preserves catalog simplicity for standard items
- enables commission behavior only where needed

## Admin Workflow System

### Needed views

- inquiry inbox
- quote review queue
- artisan assignment board
- commission timeline editor
- approval pending queue
- stage media uploader

### Needed actions

- assign artisan
- request clarification
- send quote
- mark design approved
- update material selection
- upload progress photos/videos
- request final approval

## UX Enhancement Plan

### Homepage

- keep current luxury direction
- add stronger commission CTA band below hero
- add artisan credibility and workshop proof

### Product detail

- split into:
  - masterpiece summary
  - customization brief
  - artisan story
  - handmade process
  - quote and discussion CTAs

### Custom order

- convert from flat form to guided intake
- collect usage, style, budget, dimensions, references, material preference, deadline

### Order tracking

- replace delivery language with craft-stage narrative for commission orders

### Typography and brand

- move beyond system font defaults for premium surfaces
- define a real display type system for luxury storytelling pages

## Immediate Technical Cleanup Before Feature Work

1. Remove or archive the duplicate root `src/` tree.
2. Fix the backend TypeScript error in `adminRoutes.ts`.
3. Introduce a typed enum/shared constants package for order stages and availability.
4. Replace placeholder UX:
   - fake language switch
   - fake AI Enhance alert
   - fake push CTA
   - fake WhatsApp checkbox
5. Introduce `next/image` or an equivalent optimized media pattern on major surfaces.
6. Convert SEO-critical routes to server-fetched metadata-aware pages.

## Recommended Next Implementation Slice

If implementation starts immediately, the best first slice is:

1. custom order schema upgrade
2. product detail customization panel
3. quote request endpoint
4. file upload support for reference images
5. admin custom order inbox
6. handcrafted stage timeline for commission orders
7. real WhatsApp deep links

This sequence creates visible business value quickly while staying compatible with the existing architecture.

