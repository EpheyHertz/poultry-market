# Order and Payment Flow Implementation - Complete Guide

## Overview
This document describes the complete order and payment flow implementation for Poultry Market KE, including all API endpoints, database schema updates, and system logic.

## Schema Updates

### Order Model Enhancements
- **Order Statuses**: PENDING, PAID, APPROVED, IN_PROGRESS, PACKED, READY_FOR_DELIVERY, IN_TRANSIT, DELIVERED, COMPLETED, CANCELLED, REJECTED
- **Payment Statuses**: UNPAID, PENDING, SUBMITTED, CONFIRMED, FAILED, CANCELLED
- **New Fields**:
  - `deliveryProofImages`: Array of image URLs for delivery proof
  - `deliveryProofMessage`: Text message for delivery proof
  - `completedAt`: Timestamp when order was completed
  - `markedReceivedAt`: Timestamp when customer marked order as received
  - `isReviewed`: Boolean flag for review status
  - `approvedAt`, `approvedBy`: Seller approval tracking

### OrderTimeline Model (New)
Tracks all order-related events:
- `eventType`: ORDER_CREATED, PAYMENT_SUBMITTED, PAYMENT_CONFIRMED, ORDER_APPROVED, STATUS_UPDATED, etc.
- `actor`: SYSTEM, CUSTOMER, SELLER, ADMIN, DELIVERY_AGENT
- `actorId`, `actorName`: Who performed the action
- `description`: Human-readable description
- `metadata`: JSON for additional data

## API Endpoints

### 1. Order Creation
**POST /api/orders**
- Creates order with product, buyer, seller details
- Automatically creates payment record
- Supports M-Pesa STK Push and manual payments
- Validates vouchers and calculates totals server-side
- Creates timeline events for order creation and payment submission

### 2. Admin Endpoints

#### GET /api/admin/orders
- View all orders with filtering (status, payment status, search)
- Pagination support
- Statistics by order status and payment status
- Includes timeline preview (last 5 events)

#### POST /api/admin/orders/[id]/confirm-payment
- Manually confirm payment for an order
- Updates order status to PAID
- Creates payment approval log
- Sends notifications to sellers and customer
- Creates timeline event

### 3. Seller Endpoints

#### GET /api/seller/orders
- View seller's orders (only their products)
- Filter by status and payment status
- Pagination and statistics

#### POST /api/seller/orders/[id]/approve
- Approve paid order to start processing
- Updates status to APPROVED
- Creates timeline event
- Notifies customer

#### PATCH /api/seller/orders/[id]/status
- Update order progress status
- Valid statuses: IN_PROGRESS, PACKED, READY_FOR_DELIVERY, IN_TRANSIT, DELIVERED
- Sends status update notifications to customer
- Creates timeline event

### 4. Customer Endpoints

#### GET /api/customer/orders
- View customer's orders
- Filter by status
- Includes delivery tracking and timeline

#### POST /api/customer/orders/[id]/receive
- Mark order as received
- Upload delivery proof (images + text)
- Sets order status to COMPLETED
- Creates timeline events
- Notifies sellers

#### POST /api/customer/orders/[id]/review
- Submit review for order or specific product
- Rate 1-5 stars with optional comment
- Updates product rating
- Creates timeline event
- Notifies seller

### 5. Utility Endpoints

#### GET /api/orders/[id]/timeline
- Get full timeline history for an order
- Access controlled by role (admin, customer, or seller)

## Order Flow

### 1. Purchase Flow (Customer)
```
1. Customer selects products and checkout
2. POST /api/orders creates order
3. If M-Pesa STK Push:
   - Initiate STK Push
   - User enters PIN on phone
   - Callback updates payment status automatically
4. If manual payment:
   - Order created with PENDING payment status
   - Admin must confirm payment
5. Timeline event: ORDER_CREATED, PAYMENT_SUBMITTED
```

### 2. Payment Confirmation

#### Automatic (M-Pesa)
```
1. Lipia sends callback to /api/payments/callback/order/[orderId]
2. System verifies payment
3. Updates order to PAID status
4. Creates payment approval log
5. Timeline event: PAYMENT_CONFIRMED (automatic)
6. Notifies sellers and customer
```

#### Manual (Admin)
```
1. Admin reviews payment proof in dashboard
2. POST /api/admin/orders/[id]/confirm-payment
3. Order status updated to PAID
4. Timeline event: PAYMENT_CONFIRMED (manual)
5. Notifies sellers and customer
```

### 3. Order Processing (Seller)
```
1. Seller sees order in dashboard (status: PAID)
2. POST /api/seller/orders/[id]/approve
3. Order status: APPROVED
4. Timeline event: ORDER_APPROVED
5. Customer receives notification

Then seller updates progress:
6. PATCH /api/seller/orders/[id]/status
   - IN_PROGRESS: Order being prepared
   - PACKED: Order ready for delivery
   - READY_FOR_DELIVERY: Awaiting pickup
   - IN_TRANSIT: On the way
   - DELIVERED: Reached customer
7. Each update creates timeline event
8. Customer receives notification for each status change
```

### 4. Order Completion (Customer)
```
1. Customer receives order
2. POST /api/customer/orders/[id]/receive
   - Uploads proof (images + text)
   - Status: COMPLETED
3. Timeline events: ORDER_RECEIVED, ORDER_COMPLETED
4. Optionally submit review:
   POST /api/customer/orders/[id]/review
   - Rate product/order
   - Timeline event: REVIEW_SUBMITTED
```

## Role-Based Visibility

### Admin
- Sees all orders
- Can confirm payments
- Full timeline access

### Seller
- Sees only orders containing their products
- Can approve orders
- Can update order progress
- Limited timeline access (own actions)

### Customer
- Sees only their own orders
- Can mark as received
- Can submit reviews
- Full timeline access for their orders

## Timeline Events

All order activities are logged:

### Event Types
- `ORDER_CREATED`: When order is first created
- `PAYMENT_SUBMITTED`: When payment info is submitted
- `PAYMENT_CONFIRMED`: When payment is verified (auto or manual)
- `PAYMENT_FAILED`: When payment fails
- `ORDER_APPROVED`: When seller approves order
- `ORDER_REJECTED`: When seller rejects order
- `STATUS_UPDATED`: When order status changes
- `DELIVERY_ASSIGNED`: When delivery agent is assigned
- `DELIVERY_STARTED`: When delivery starts
- `DELIVERY_COMPLETED`: When delivery completes
- `ORDER_RECEIVED`: When customer marks as received
- `ORDER_COMPLETED`: When order is fully completed
- `REVIEW_SUBMITTED`: When customer submits review

### Timeline Metadata
Each event includes:
- Actor (who did it)
- Timestamp
- Description
- Additional metadata (JSON)

Example timeline entry:
```json
{
  "eventType": "PAYMENT_CONFIRMED",
  "actor": "SYSTEM",
  "actorName": "System",
  "description": "Payment automatically verified and confirmed",
  "metadata": {
    "automatic": true,
    "amount": 5000,
    "method": "M-Pesa"
  },
  "createdAt": "2025-11-11T10:30:00Z"
}
```

## Notification System

### Notification Triggers

1. **Order Created**: Notifies sellers
2. **Payment Confirmed**: Notifies sellers and customer
3. **Order Approved**: Notifies customer
4. **Status Updates**: Notifies customer on each progress update
5. **Order Received**: Notifies sellers
6. **Review Submitted**: Notifies seller

### Notification Channels
- Email
- SMS
- In-app notifications

## Error Handling

### STK Push Failures
- If STK Push service unavailable: Convert to manual payment
- If payment fails: User can retry or use manual payment
- Failed payments are logged in timeline

### Payment Verification
- Manual payments require admin confirmation
- Automatic payments verified via callback
- Invalid payments create timeline event with failure reason

### Order Validation
- Stock availability checked before order creation
- Payment amount verified server-side
- Vouchers validated and usage tracked
- Order timeline ensures audit trail

## Testing Checklist

### Order Creation
- [ ] Create order with STK Push payment
- [ ] Create order with manual payment
- [ ] Test voucher application
- [ ] Verify timeline events created

### Payment Flow
- [ ] Test automatic M-Pesa confirmation
- [ ] Test manual admin confirmation
- [ ] Verify notifications sent
- [ ] Check timeline logging

### Seller Actions
- [ ] Seller approves paid order
- [ ] Seller updates order status
- [ ] Verify customer notifications
- [ ] Check timeline events

### Customer Actions
- [ ] Mark order as received with proof
- [ ] Submit product review
- [ ] View order timeline
- [ ] Check notification delivery

### Admin Functions
- [ ] View all orders with filters
- [ ] Confirm manual payments
- [ ] View order timeline
- [ ] Access control verification

## Database Indexes

Recommended indexes for performance:
```prisma
@@index([customerId, status])
@@index([status, paymentStatus])
@@index([createdAt])
@@index([sellerId, status])
```

## Security Considerations

1. **Role-based access control**: All endpoints check user role
2. **Order ownership**: Customers can only access their orders
3. **Seller filtering**: Sellers only see orders with their products
4. **Admin privileges**: Only admins can confirm payments manually
5. **Timeline access**: Controlled based on order relationship
6. **Payment verification**: Server-side validation of all amounts
7. **Callback authentication**: Callbacks should verify source (implement if needed)

## Future Enhancements

1. **Real-time updates**: WebSocket support for live order tracking
2. **Bulk operations**: Admin bulk payment confirmation
3. **Advanced filtering**: Date ranges, amount ranges, seller filters
4. **Export functionality**: CSV/PDF export of orders
5. **Analytics dashboard**: Order statistics and trends
6. **Delivery tracking**: GPS-based real-time tracking
7. **Refund system**: Handle order cancellations and refunds
8. **Multi-seller coordination**: Better handling of orders with multiple sellers

## Support

For issues or questions:
- Check timeline events for order history
- Review notification logs
- Verify payment callback logs
- Contact system administrator
