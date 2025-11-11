# Order Management UI Documentation

## Overview
This document describes the comprehensive order management UI system for Poultry Market KE, including all components, pages, and features for admin, seller, customer, and company roles.

## Components

### 1. Order Status Badge (`components/orders/order-status-badge.tsx`)

**Purpose**: Consistent visual display of order and payment statuses across all interfaces.

**Components**:
- `OrderStatusBadge`: Displays order status with icon and color
- `PaymentStatusBadge`: Displays payment status with icon and color

**Order Statuses** (13 total):
- PENDING - Gray, Clock icon
- PAYMENT_PENDING - Amber, Clock icon
- PAID - Emerald, DollarSign icon
- APPROVED - Blue, CheckCircle icon
- PACKED - Purple, Package icon
- READY_FOR_DELIVERY - Indigo, PackageCheck icon
- IN_TRANSIT - Blue, Truck icon
- REACHED_COLLECTION_POINT - Cyan, MapPin icon
- READY_FOR_PICKUP - Teal, MapPin icon
- DELIVERED - Green, PackageCheck icon
- COMPLETED - Emerald, CheckCircle icon
- CANCELLED - Gray, XCircle icon
- REJECTED - Red, AlertCircle icon

**Payment Statuses** (8 total):
- UNPAID - Gray, XCircle icon
- PENDING - Amber, Clock icon
- SUBMITTED - Blue, CheckCircle icon
- CONFIRMED - Emerald, CheckCircle icon
- APPROVED - Green, CheckCircle icon
- REJECTED - Red, XCircle icon
- REFUNDED - Purple, DollarSign icon
- FAILED - Red, AlertCircle icon

**Props**:
```typescript
{
  status: string;
  size?: 'sm' | 'md' | 'lg'; // Default: 'md'
  className?: string;
}
```

**Usage**:
```tsx
<OrderStatusBadge status="IN_TRANSIT" size="lg" />
<PaymentStatusBadge status="CONFIRMED" />
```

---

### 2. Order Timeline (`components/orders/order-timeline.tsx`)

**Purpose**: Visual timeline display of order activity history with events, actors, and metadata.

**Features**:
- Vertical timeline with connecting line
- Event-specific icons (Package, DollarSign, CheckCircle, Truck, etc.)
- Role-based actor colors (SYSTEM=gray, CUSTOMER=blue, SELLER=purple, ADMIN=red)
- Status transition display (oldStatus → newStatus)
- Metadata parsing and display
- Relative timestamps (via date-fns)
- Hover effects for interactive feedback

**Event Types Supported** (14 total):
- ORDER_CREATED
- PAYMENT_SUBMITTED
- PAYMENT_CONFIRMED
- ORDER_APPROVED
- STATUS_UPDATED
- ORDER_CANCELLED
- ORDER_REJECTED
- DELIVERY_ASSIGNED
- DELIVERY_UPDATED
- ORDER_DELIVERED
- ORDER_RECEIVED
- ORDER_COMPLETED
- REVIEW_SUBMITTED
- PAYMENT_REFUNDED

**Props**:
```typescript
{
  events: Array<{
    id: string;
    action: string;
    actorRole?: string;
    actorName?: string;
    description?: string;
    metadata?: any;
    createdAt: string;
  }>;
  className?: string;
}
```

**Usage**:
```tsx
<OrderTimeline events={timelineEvents} />
```

---

### 3. Order Details Card (`components/orders/order-details-card.tsx`)

**Purpose**: Comprehensive display of order information with role-based actions.

**Sections**:
1. **Order Header**: Order ID, date, status badges, payment info
2. **Customer Info**: Name, email, phone (if showCustomer)
3. **Delivery Info**: Address, tracking ID, agent details
4. **Payment Info**: Method, amount, transaction code
5. **Order Items**: Product list with images, quantities, prices
6. **Order Summary**: Subtotal, discount, delivery fee, total
7. **Delivery Proof**: Images and messages (if available)
8. **Actions**: Role-based action buttons

**Role-Based Actions**:
- **ADMIN**: View Timeline, Confirm Payment
- **SELLER/COMPANY**: View Timeline, Approve Order, Update Status
- **CUSTOMER**: View Timeline, Mark as Received, Leave Review

**Props**:
```typescript
{
  order: any;
  showActions?: boolean; // Default: true
  onViewTimeline?: () => void;
  onApprove?: () => void;
  onUpdateStatus?: () => void;
  onMarkReceived?: () => void;
  onReview?: () => void;
  onConfirmPayment?: () => void;
  userRole?: 'ADMIN' | 'SELLER' | 'CUSTOMER' | 'COMPANY';
  className?: string;
}
```

**Usage**:
```tsx
<OrderDetailsCard
  order={selectedOrder}
  userRole="SELLER"
  onViewTimeline={handleViewTimeline}
  onApprove={handleApprove}
/>
```

---

### 4. Order Action Modals (`components/orders/order-action-modals.tsx`)

**Purpose**: Modal dialogs for all order management actions.

**Modals Included**:

#### a) ConfirmPaymentModal (Admin)
- Manually confirm payment receipt
- Optional notes field
- Creates PaymentApprovalLog entry
- Sends notifications to seller and customer

**Props**:
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  onSuccess?: () => void;
}
```

#### b) ApproveOrderModal (Seller/Company)
- Approve order after payment confirmation
- Confirms stock availability and fulfillment ability
- Updates status to APPROVED
- Sends customer notification

**Props**: Same as ConfirmPaymentModal

#### c) UpdateStatusModal (Seller/Company)
- Update order status through delivery workflow
- Dynamic status options based on current status
- Available transitions:
  - APPROVED → PACKED
  - PACKED → READY_FOR_DELIVERY
  - READY_FOR_DELIVERY → IN_TRANSIT
  - IN_TRANSIT → REACHED_COLLECTION_POINT / DELIVERED
  - REACHED_COLLECTION_POINT → READY_FOR_PICKUP
  - READY_FOR_PICKUP → DELIVERED

**Props**:
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  currentStatus: string;
  onSuccess?: () => void;
}
```

#### d) MarkReceivedModal (Customer)
- Confirm receipt of order
- Upload up to 5 delivery proof images
- Add optional message
- Marks order as COMPLETED
- Sends seller notification

**Props**: Same as ConfirmPaymentModal

#### e) ReviewModal (Customer)
- Submit product review and rating
- 5-star rating system with hover preview
- Optional comment field
- Creates Review record
- Sends seller notification

**Props**:
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  productId: string;
  productName: string;
  onSuccess?: () => void;
}
```

**Usage**:
```tsx
<ConfirmPaymentModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  orderId={order.id}
  onSuccess={handleSuccess}
/>
```

---

### 5. Order List (`components/orders/order-list.tsx`)

**Purpose**: Filterable and searchable list of orders with preview cards.

**Features**:
- Search by order ID, customer name, email
- Filter by order status
- Filter by payment status
- Order cards with:
  - Order header (ID, date, customer, status badges)
  - Total amount (prominent display)
  - Items preview (first 3 items)
  - Quick info (payment method, delivery status, tracking ID)
  - View Details button
- Empty state with helpful message
- Loading state with skeleton cards
- Responsive grid layout

**Props**:
```typescript
{
  orders: any[];
  onViewDetails: (order: any) => void;
  showCustomer?: boolean; // Default: true
  showSeller?: boolean; // Default: false
  loading?: boolean; // Default: false
  className?: string;
}
```

**Usage**:
```tsx
<OrderList
  orders={orders}
  onViewDetails={handleViewDetails}
  showCustomer={true}
  loading={loading}
/>
```

---

## Pages

### 1. Admin Orders Page (`app/admin/orders/page.tsx`)

**Purpose**: Complete order management dashboard for administrators.

**Features**:
- **Stats Dashboard** (6 metrics):
  - Total Orders
  - Pending Orders
  - Completed Orders
  - Total Revenue
  - Pending Payments
  - Confirmed Payments

- **Tabbed Order Views**:
  - All Orders
  - Pending Orders
  - Processing Orders (Approved/Packed/Ready for Delivery)
  - In Transit Orders
  - Completed Orders

- **Actions Available**:
  - View order details
  - View order timeline
  - Confirm manual payments (for SUBMITTED/PENDING payments)

**API Endpoints Used**:
- `GET /api/admin/orders` - Fetch all orders with stats
- `GET /api/orders/[id]/timeline` - Fetch order timeline
- `POST /api/admin/orders/[id]/confirm-payment` - Confirm payment

**Access Control**: Admin role only (redirects others to home)

---

### 2. Seller Orders Page (`app/seller/orders/page.tsx`)

**Purpose**: Order management dashboard for sellers (products sold by them).

**Features**:
- **Stats Dashboard** (5 metrics):
  - Total Orders
  - Pending Approval (paid, awaiting approval)
  - In Progress (approved → in transit)
  - Completed Orders
  - Total Revenue

- **Tabbed Order Views**:
  - All Orders
  - Needs Approval (PAID + CONFIRMED payment)
  - In Progress (APPROVED → IN_TRANSIT)
  - Delivered Orders
  - Completed Orders

- **Actions Available**:
  - View order details
  - View order timeline
  - Approve orders (PAID → APPROVED)
  - Update status (PACKED → READY_FOR_DELIVERY → IN_TRANSIT → DELIVERED)

**API Endpoints Used**:
- `GET /api/seller/orders` - Fetch seller's orders
- `GET /api/orders/[id]/timeline` - Fetch order timeline
- `POST /api/seller/orders/[id]/approve` - Approve order
- `PATCH /api/seller/orders/[id]/status` - Update status

**Access Control**: Seller or Company role (redirects others)

**Note**: Company role has same access as Seller for order management

---

### 3. Customer Orders Page (`app/customer/orders/page.tsx`)

**Purpose**: Order tracking and management dashboard for customers.

**Features**:
- **Stats Dashboard** (5 metrics):
  - Total Orders
  - Processing (pending → ready for delivery)
  - In Transit
  - Delivered
  - Completed

- **Tabbed Order Views**:
  - All Orders
  - Processing Orders (PENDING → READY_FOR_DELIVERY)
  - In Transit Orders
  - Delivered Orders
  - Completed Orders

- **Actions Available**:
  - View order details (shows seller info)
  - View order timeline
  - Mark as received (with proof upload)
  - Leave product reviews (for completed orders)

**API Endpoints Used**:
- `GET /api/customer/orders` - Fetch customer's orders
- `GET /api/orders/[id]/timeline` - Fetch order timeline
- `POST /api/customer/orders/[id]/receive` - Mark as received
- `POST /api/customer/orders/[id]/review` - Submit review

**Access Control**: Customer role only (redirects others)

**Special Features**:
- Shows seller information for each order item
- Can upload delivery proof images (max 5)
- Review system with star ratings

---

## Responsive Design

All components and pages implement mobile-first responsive design:

### Breakpoints:
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (sm to lg)
- **Desktop**: > 1024px (lg+)

### Responsive Patterns:

#### Stats Cards:
```
Mobile:   1 column
Tablet:   2 columns
Desktop:  3-6 columns (depending on page)
```

#### Order List:
```
Mobile:   Full width cards, stacked layout
Tablet:   2-column grid for items preview
Desktop:  3-column grid for items preview
```

#### Order Details:
```
Mobile:   Single column, stacked sections
Tablet:   2-column grid for info cards
Desktop:  3-column grid for info cards
```

#### Modals:
```
Mobile:   Full screen with scroll
Tablet:   Max width 768px, scrollable
Desktop:  Max width 1280px for details, 768px for actions
```

### Layout Classes:
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` - Standard responsive grid
- `flex-col md:flex-row` - Flex direction switching
- `gap-4 md:gap-6` - Responsive spacing
- `text-sm md:text-base` - Responsive typography
- `max-w-6xl` - Content width constraint

---

## Color Scheme

### Status Colors:
- **Success/Completed**: Emerald (green-600)
- **Warning/Pending**: Amber (amber-600)
- **Info/Processing**: Blue (blue-600)
- **Error/Rejected**: Red (red-600)
- **Neutral**: Gray (gray-600)
- **Special/Purple**: Purple (purple-600)

### Role Colors (Timeline):
- **SYSTEM**: Gray
- **CUSTOMER**: Blue
- **SELLER**: Purple
- **ADMIN**: Red
- **COMPANY**: Indigo

### UI Elements:
- Primary: Emerald (buttons, success states)
- Muted: Gray (secondary text, borders)
- Destructive: Red (errors, rejections)
- Background: White/Gray-50
- Border: Gray-200

---

## User Workflows

### Admin Workflow:
1. View all orders dashboard
2. Filter/search for specific orders
3. View order details
4. Confirm manual payments (if needed)
5. View order timeline for audit trail

### Seller Workflow:
1. View orders for their products
2. Check pending approvals
3. Approve paid orders
4. Update order status through delivery:
   - Mark as PACKED
   - Mark as READY_FOR_DELIVERY
   - Mark as IN_TRANSIT
   - Mark as DELIVERED
5. Monitor completed orders and revenue

### Customer Workflow:
1. View all their orders
2. Track order progress
3. View order timeline
4. Mark order as received when delivered
5. Upload delivery proof images
6. Submit product reviews

---

## Data Flow

### Order List Loading:
```
Page Load → Fetch User → Fetch Orders → Calculate Stats → Render UI
```

### Order Details Modal:
```
Click Order → Set Selected Order → Open Modal → Render Details
```

### Timeline Modal:
```
Click Timeline → Fetch Timeline API → Render Timeline
```

### Action Modals:
```
Click Action → Open Modal → Perform Action → Refresh Orders → Close Modal
```

### API Response Structure:
```typescript
// GET /api/admin/orders
{
  orders: Order[];
  stats: {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
    pendingPayments: number;
    confirmedPayments: number;
  };
}

// GET /api/orders/[id]/timeline
{
  timeline: OrderTimelineEvent[];
}
```

---

## Error Handling

All components implement error handling:

### API Errors:
```typescript
try {
  const response = await fetch('/api/...');
  if (!response.ok) throw new Error('...');
  // Success handling
} catch (error) {
  toast({
    title: 'Error',
    description: error.message,
    variant: 'destructive',
  });
}
```

### Loading States:
- Skeleton cards during initial load
- Loading spinners for actions
- Disabled buttons during API calls

### Empty States:
- Helpful messages when no orders found
- Filter reset suggestions
- Clear call-to-action

---

## Accessibility

- Semantic HTML elements
- ARIA labels for icons
- Keyboard navigation support
- Focus management in modals
- Color contrast ratios meet WCAG AA
- Screen reader friendly descriptions

---

## Performance Optimizations

1. **Lazy Loading**: Modals render only when open
2. **Efficient Filtering**: Client-side filtering for instant feedback
3. **Image Optimization**: Next.js Image component for delivery proofs
4. **Minimal Re-renders**: Proper state management
5. **API Caching**: Future enhancement opportunity

---

## Future Enhancements

1. **Bulk Actions**: Select multiple orders for batch processing
2. **Export**: Download orders as CSV/PDF
3. **Advanced Filters**: Date range, amount range, delivery agent
4. **Real-time Updates**: WebSocket for live status changes
5. **Order Insights**: Analytics dashboard with charts
6. **Print View**: Print-friendly order details
7. **Email Receipts**: Resend order confirmation emails
8. **Refund Processing**: Integrated refund workflow
9. **Dispute Resolution**: Built-in dispute management
10. **Multi-product Reviews**: Review all products in one order

---

## Migration Notes

Old pages backed up as:
- `app/admin/orders/page-old-backup.tsx`
- `app/seller/orders/page-old-backup.tsx`
- `app/customer/orders/page-old-backup.tsx`

Can be restored if needed:
```powershell
Move-Item -Path "app/admin/orders/page-old-backup.tsx" -Destination "app/admin/orders/page.tsx" -Force
```

---

## Testing Checklist

### Component Testing:
- [ ] All status badges render correctly
- [ ] Timeline events display properly
- [ ] Order details show all information
- [ ] Modals open and close correctly
- [ ] Image uploads work (max 5)
- [ ] Star ratings are interactive

### Page Testing:
- [ ] Admin: Can view all orders and confirm payments
- [ ] Seller: Can approve and update order status
- [ ] Customer: Can mark received and submit reviews
- [ ] Stats calculate correctly
- [ ] Tabs filter orders properly
- [ ] Search and filters work

### Responsive Testing:
- [ ] Mobile layout (< 640px)
- [ ] Tablet layout (640px - 1024px)
- [ ] Desktop layout (> 1024px)
- [ ] All modals are scrollable on small screens
- [ ] Touch interactions work on mobile

### Integration Testing:
- [ ] Timeline logs all actions
- [ ] Notifications sent on status changes
- [ ] Payment confirmation creates approval log
- [ ] Order approval updates status
- [ ] Status updates trigger customer notifications
- [ ] Mark received completes order
- [ ] Reviews create review records

---

## Support

For issues or questions:
1. Check ORDER_PAYMENT_FLOW_DOCUMENTATION.md for backend logic
2. Review component props and usage examples above
3. Check browser console for error messages
4. Verify API endpoints are responding correctly
5. Ensure user has correct role permissions
