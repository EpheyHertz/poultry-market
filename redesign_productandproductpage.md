# Products Page Redesign — UI/UX Only

Redesign the **Products listing page only**. Do not redesign the product detail page, cart, checkout, navbar, footer, or any other page.

## Core Requirement

Improve the Products page so it looks modern, professional, polished, trustworthy, and optimized for product discovery and purchasing.

**IMPORTANT: Preserve all existing application logic and functionality.**

Before making changes, inspect the existing Products page and identify:
- Existing components
- API calls
- Product data structure
- Search logic
- Filtering logic
- Sorting logic
- Pagination/infinite scrolling
- Cart integration
- Product navigation
- Authentication dependencies
- Loading/error/empty states
- Existing theme implementation
- Existing reusable UI components

Do not recreate functionality that already exists.

---

## What You Should Change

### 1. Products Page Layout

Create a clean, professional marketplace layout with strong visual hierarchy.

The page should have:

- Clear page heading
- Short supporting description where appropriate
- Search area
- Existing filters
- Existing sorting functionality
- Product count where available
- Responsive product grid
- Clean spacing and alignment
- Professional empty/loading/error states

The page should feel like a real modern ecommerce marketplace rather than a basic grid of cards.

---

## 2. Product Cards

Redesign the existing product cards.

Each card should clearly communicate:

- Product image
- Product name
- Price
- Previous/original price if the existing data supports discounts
- Discount indicator if already supported
- Stock/availability status if already supported
- Relevant category or metadata if already available
- Primary purchase/action button
- Any existing favorite/wishlist functionality
- Any existing cart functionality

Do not invent new product data fields.

### Card UX

The card should:

- Have consistent image dimensions
- Handle missing images gracefully
- Prevent image distortion
- Have clean typography
- Have clear price hierarchy
- Have an obvious primary action
- Have subtle hover/focus states
- Be fully clickable where appropriate without breaking existing buttons
- Work correctly on touch devices
- Avoid excessive animations

Do not make cards unnecessarily large.

---

## 3. Product Images

Improve image presentation without changing how images are loaded or stored.

Use:

- Consistent aspect ratio
- Proper object-fit behavior
- Rounded corners consistent with the existing design system
- Appropriate image background/surface
- Graceful fallback for missing or failed images

Do not replace the existing image provider or image storage logic.

---

## 4. Search and Filters

Redesign the existing search/filter area visually.

Preserve the existing functionality exactly.

Make it:

- Easy to find
- Easy to use
- Responsive
- Mobile-friendly
- Visually separated from the product grid
- Clear when filters are active

If filters already exist, improve their presentation rather than creating a new filtering system.

If sorting already exists, improve its UI without changing its underlying behavior.

---

## 5. Responsive Design

The page must be designed deliberately for:

### Desktop
- Comfortable product grid
- Good maximum content width
- Balanced spacing
- Efficient use of screen width

### Tablet
- Appropriate number of columns
- Search/filter controls remain usable

### Mobile
- Compact header area
- Easy-to-use search
- Filters should not consume excessive vertical space
- Product cards should remain readable
- Purchase actions should remain accessible
- No horizontal overflow
- No tiny text or cramped controls

Test the layout mentally across approximately:

- 320px
- 375px
- 390px
- 768px
- 1024px
- 1440px+

---

# Dark Mode and Light Mode

The Products page must work properly in both existing theme modes.

Do not create a separate theme system.

Use the application's existing theme infrastructure.

Audit every element, including:

- Page background
- Product cards
- Product images/surfaces
- Text
- Muted text
- Borders
- Search input
- Filter controls
- Sort controls
- Buttons
- Badges
- Dropdowns
- Loading states
- Empty states
- Error states
- Hover states
- Focus states
- Disabled states

Avoid hard-coded colors that look correct in only one theme.

Do not introduce colors that conflict with the existing brand/design system.

The page should look intentionally designed in both modes, not like light mode with dark colors patched on.

---

# Loading State

Preserve the existing loading logic.

Improve only the presentation.

Use a polished skeleton/loading state where appropriate.

The skeleton should match the actual product-card structure so the page does not jump significantly when products load.

Do not introduce fake product data.

---

# Empty State

If no products are returned, create a professional empty state.

It should clearly communicate that there are no matching products.

If existing search/filter reset functionality exists, make the reset action prominent.

Do not invent unrelated functionality.

---

# Error State

Preserve the existing error handling.

Improve only the visual presentation.

If the application already has a retry mechanism, keep it.

Do not replace backend error handling with frontend mock behavior.

---

# Accessibility

Maintain or improve accessibility.

Ensure:

- Buttons have accessible labels
- Images have appropriate alt text
- Keyboard navigation works
- Focus states are visible
- Sufficient contrast in both themes
- Interactive elements are not too small on mobile
- Semantic HTML is used where appropriate

Do not sacrifice accessibility for visual design.

---

# Performance

Do not introduce unnecessary dependencies.

Do not significantly increase bundle size.

Preserve existing image optimization.

Avoid unnecessary client-side state or effects.

Do not duplicate API requests.

Do not change caching/data-fetching behavior unless required to fix an existing Products-page issue.

---

# Preserve Existing Logic

This is critical.

DO NOT change:

- Database schema
- Product API contracts
- Product IDs
- Product creation logic
- Product editing logic
- Product deletion logic
- Inventory calculations
- Pricing calculations
- Discount calculations
- Cart logic
- Payment logic
- Authentication
- Authorization
- Order logic
- Backend endpoints
- Product image storage
- Existing analytics/tracking
- Existing business rules

If an existing function already performs the correct action, keep using it.

The redesign should be primarily a **presentation and UX improvement**.

---

# Code Quality

Before modifying anything:

1. Inspect the existing Products page.
2. Trace its imports and dependencies.
3. Identify reusable components.
4. Identify existing theme utilities/tokens.
5. Identify existing product-card components.
6. Identify existing search/filter/sort components.
7. Understand how product actions are currently triggered.

Then implement the redesign using the existing architecture where practical.

Do not create duplicate components when an existing reusable component can be improved.

Keep the code maintainable and consistent with the project's current conventions.

---

# Important Scope Restriction

For this task, work on **ONLY the Products listing page**.

Do NOT redesign:

- Product detail page
- Cart
- Checkout
- Payment pages
- Orders
- Dashboard
- Navbar
- Footer
- Authentication pages
- Other marketplace pages

If you discover an issue in another part of the application, do not redesign it. Only make a change outside the Products page if it is absolutely required for the Products page to function correctly, and explain why.

---

# Final Verification

After implementation, verify:

- Existing products still load
- Existing API calls still work
- Search still works
- Filters still work
- Sorting still works
- Pagination/infinite scroll still works if present
- Product navigation still works
- Add-to-cart still works
- Existing actions still work
- Loading state works
- Empty state works
- Error state works
- Light mode works
- Dark mode works
- Mobile layout works
- Desktop layout works
- No horizontal overflow
- No console errors
- No broken imports
- No unnecessary dependencies
- No duplicated business logic

Finally, summarize:

1. What was redesigned
2. What existing logic was preserved
3. Any logic change that was genuinely necessary
4. Any issues discovered but intentionally left untouched because they were outside the Products-page scope

**Do not proceed to redesign the Product detail page. This task ends with the Products listing page.**