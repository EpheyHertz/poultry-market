# Quick Start Guide - Order Management UI Testing

## 🚀 Getting Started

### Prerequisites
- Node.js and npm installed
- Database migrated with latest schema
- Development server running

### Start the Application

```powershell
cd d:\poultry\project
npm run dev
```

The application will be available at `http://localhost:3000`

---

## 👥 Test Accounts Needed

You'll need accounts for each role to test all features:

### 1. Admin Account
- **Email**: admin@poultrymarket.com (or your admin email)
- **Role**: ADMIN
- **Access**: All orders across the platform

### 2. Seller Account
- **Email**: seller@example.com (or your seller email)
- **Role**: SELLER or COMPANY
- **Access**: Orders for their products only

### 3. Customer Account
- **Email**: customer@example.com (or your customer email)
- **Role**: CUSTOMER
- **Access**: Their own orders only

---

## 🧪 Testing Checklist

### Admin Dashboard (`/admin/orders`)

#### ✅ Initial Load
- [ ] Page loads without errors
- [ ] Stats display correctly (6 cards)
- [ ] Orders list shows all platform orders
- [ ] Can see orders from different sellers

#### ✅ Filtering & Search
- [ ] Search by order ID works
- [ ] Search by customer name works
- [ ] Status filter updates list
- [ ] Payment status filter works
- [ ] Multiple filters work together

#### ✅ Tabs
- [ ] "All" tab shows all orders
- [ ] "Pending" tab shows PENDING/PAID orders
- [ ] "Processing" tab shows APPROVED/PACKED/READY orders
- [ ] "In Transit" tab shows IN_TRANSIT/DELIVERED orders
- [ ] "Completed" tab shows COMPLETED orders
- [ ] Tab counts are accurate

#### ✅ Order Details
- [ ] Click "View Details" opens modal
- [ ] Modal shows all order information
- [ ] Customer info displays correctly
- [ ] Delivery info shows (if exists)
- [ ] Payment info displays
- [ ] Order items list with images
- [ ] Order summary calculates correctly
- [ ] Modal is scrollable on small screens

#### ✅ Timeline
- [ ] "View Timeline" button works
- [ ] Timeline modal opens
- [ ] Events display in chronological order
- [ ] Event icons show correctly
- [ ] Actor names and roles display
- [ ] Timestamps are formatted properly
- [ ] Status transitions show (old → new)

#### ✅ Payment Confirmation
- [ ] "Confirm Payment" button shows for SUBMITTED/PENDING payments
- [ ] Confirmation modal opens
- [ ] Can add optional notes
- [ ] Submit confirmation works
- [ ] Success toast appears
- [ ] Order list refreshes
- [ ] Payment status updates to CONFIRMED
- [ ] Order status updates to PAID

#### ✅ Responsive Design
- [ ] Desktop view (> 1024px): 6-column stats, full layout
- [ ] Tablet view (640-1024px): 2-3 column stats, adjusted layout
- [ ] Mobile view (< 640px): 1 column stats, stacked layout
- [ ] Modals are scrollable on all screens

---

### Seller Dashboard (`/seller/orders`)

#### ✅ Initial Load
- [ ] Page loads without errors
- [ ] Stats display correctly (5 cards)
- [ ] Orders list shows only seller's product orders
- [ ] Orders from other sellers not visible

#### ✅ Stats Accuracy
- [ ] Total orders count matches
- [ ] Pending approval shows PAID+CONFIRMED orders
- [ ] In progress shows APPROVED→IN_TRANSIT orders
- [ ] Completed count correct
- [ ] Total revenue calculates correctly (only completed)

#### ✅ Tabs
- [ ] "All" shows all seller orders
- [ ] "Needs Approval" shows PAID+CONFIRMED orders
- [ ] "In Progress" shows APPROVED→IN_TRANSIT
- [ ] "Delivered" shows DELIVERED orders
- [ ] "Completed" shows COMPLETED orders

#### ✅ Order Approval
- [ ] "Approve Order" button shows for PAID+CONFIRMED orders
- [ ] Approval modal opens with confirmation checklist
- [ ] Submit approval works
- [ ] Success toast appears
- [ ] Order list refreshes
- [ ] Order status updates to APPROVED
- [ ] Customer receives notification (check email/SMS)

#### ✅ Status Updates
- [ ] "Update Status" button shows for APPROVED→IN_TRANSIT orders
- [ ] Update modal opens
- [ ] Status dropdown shows correct options:
  - APPROVED → can select PACKED
  - PACKED → can select READY_FOR_DELIVERY
  - READY_FOR_DELIVERY → can select IN_TRANSIT
  - IN_TRANSIT → can select DELIVERED
- [ ] Submit status update works
- [ ] Order status updates correctly
- [ ] Timeline logs the change
- [ ] Customer receives notification

#### ✅ Timeline & Details
- [ ] View order details works
- [ ] Customer info visible
- [ ] Timeline shows all events
- [ ] Seller can see their actions in timeline

---

### Customer Dashboard (`/customer/orders`)

#### ✅ Initial Load
- [ ] Page loads without errors
- [ ] Stats display correctly (5 cards)
- [ ] Orders list shows only customer's orders
- [ ] Other customers' orders not visible
- [ ] Seller info shows for each product

#### ✅ Stats & Tabs
- [ ] Total orders count correct
- [ ] Processing shows PENDING→READY_FOR_DELIVERY
- [ ] In Transit shows IN_TRANSIT
- [ ] Delivered shows DELIVERED
- [ ] Completed shows COMPLETED
- [ ] All tabs filter correctly

#### ✅ Order Details
- [ ] View details modal opens
- [ ] Seller information displayed for each item
- [ ] Delivery tracking info visible
- [ ] Payment status shown
- [ ] Timeline accessible

#### ✅ Timeline Tracking
- [ ] Timeline shows all order events
- [ ] Customer's actions highlighted
- [ ] Timestamps accurate
- [ ] Status transitions clear

#### ✅ Mark as Received
- [ ] Button shows for IN_TRANSIT/DELIVERED orders
- [ ] Modal opens with form
- [ ] Can add optional message
- [ ] Can upload images:
  - [ ] Click to select images works
  - [ ] Multiple images upload (test with 2-3)
  - [ ] Max 5 images enforced
  - [ ] Image previews show
  - [ ] Can remove images
- [ ] Submit without images works
- [ ] Submit with images works
- [ ] Order status updates to COMPLETED
- [ ] Delivery proof stored
- [ ] Seller receives notification

#### ✅ Product Reviews
- [ ] "Leave a Review" button shows for COMPLETED orders
- [ ] Review modal opens
- [ ] Product name displays
- [ ] Star rating works:
  - [ ] Click stars to rate
  - [ ] Hover preview works
  - [ ] Selected rating stays
- [ ] Can add optional comment
- [ ] Submit review works
- [ ] Review record created in database
- [ ] Seller receives notification
- [ ] Button hides after review submitted

---

## 🎨 Visual Testing

### Colors & Icons
- [ ] Status badges use correct colors
- [ ] Icons match status types
- [ ] Color scheme consistent across pages
- [ ] Hover effects work
- [ ] Focus states visible

### Layout & Spacing
- [ ] Cards aligned properly
- [ ] Spacing consistent
- [ ] No overlapping elements
- [ ] Images load and display correctly
- [ ] Scrollbars only where needed

### Typography
- [ ] Font sizes readable
- [ ] Hierarchy clear (headers, body, captions)
- [ ] Line heights comfortable
- [ ] Text doesn't overflow containers
- [ ] Truncation works where needed

---

## 🐛 Common Issues & Fixes

### Issue: "Failed to fetch orders"
**Fix**: Check if backend APIs are running and database is connected

### Issue: "Unauthorized" or redirected to signin
**Fix**: Ensure you're logged in with correct role for the page

### Issue: Images not uploading
**Fix**: Check if `/api/upload` endpoint exists and Cloudinary is configured

### Issue: Notifications not sent
**Fix**: Verify email/SMS service credentials in environment variables

### Issue: Timeline not loading
**Fix**: Check if `/api/orders/[id]/timeline` endpoint is working

### Issue: Stats showing 0
**Fix**: Ensure orders exist in database for that role

### Issue: Mobile view broken
**Fix**: Clear browser cache and check responsive breakpoints

---

## 📊 Sample Test Data

### Create Test Orders

To fully test the system, create orders in different states:

1. **Pending Order**: New order, payment not initiated
2. **Paid Order**: Payment confirmed, awaiting approval
3. **Approved Order**: Approved by seller, ready for packing
4. **In Transit Order**: Currently being delivered
5. **Delivered Order**: Arrived, awaiting customer confirmation
6. **Completed Order**: Customer confirmed receipt

### Sample Test Flow

```
1. Customer creates order → Status: PENDING
2. Customer pays via M-Pesa → Status: PAID, Payment: CONFIRMED
3. Seller approves order → Status: APPROVED
4. Seller marks as PACKED → Status: PACKED
5. Seller marks READY_FOR_DELIVERY → Status: READY_FOR_DELIVERY
6. Seller marks IN_TRANSIT → Status: IN_TRANSIT
7. Seller marks DELIVERED → Status: DELIVERED
8. Customer marks received → Status: COMPLETED
9. Customer leaves review → Review created
```

---

## 🔍 Browser Testing

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Mobile browsers (Chrome Mobile, Safari iOS)

### Browser DevTools Testing
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test responsive views:
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - Desktop (1920px)
4. Check console for errors
5. Monitor network requests

---

## ✅ Success Criteria

### Must Have Working:
- ✅ All pages load without errors
- ✅ Role-based access control works
- ✅ Order listing displays correctly
- ✅ Filter and search function
- ✅ All modals open and close
- ✅ Timeline displays events
- ✅ Actions (approve, update, receive, review) work
- ✅ Notifications sent
- ✅ Responsive on all screen sizes

### Nice to Have Working:
- ✅ Loading states smooth
- ✅ Empty states helpful
- ✅ Error messages clear
- ✅ Images load quickly
- ✅ Animations smooth
- ✅ Keyboard navigation works

---

## 📝 Bug Report Template

If you find issues, document them:

```markdown
### Bug: [Short description]

**Affected Page**: Admin/Seller/Customer Orders

**Steps to Reproduce**:
1. Go to [page]
2. Click [action]
3. Observe [issue]

**Expected Behavior**: 
[What should happen]

**Actual Behavior**: 
[What actually happens]

**Screenshots**: 
[Attach if applicable]

**Browser**: Chrome/Firefox/Safari
**Screen Size**: Desktop/Tablet/Mobile
**Console Errors**: 
[Copy any error messages]
```

---

## 🚀 Deployment Checklist

Before deploying to production:

### Code Quality
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] No console.log statements (except intentional)
- [ ] All imports used
- [ ] Code formatted

### Testing
- [ ] All role pages tested
- [ ] All actions tested
- [ ] Responsive design verified
- [ ] Error handling tested
- [ ] Edge cases considered

### Performance
- [ ] Images optimized
- [ ] API calls efficient
- [ ] Loading states implemented
- [ ] No unnecessary re-renders

### Documentation
- [ ] README updated
- [ ] API documentation complete
- [ ] User guide available
- [ ] Comments added where needed

---

## 📚 Additional Resources

- **Backend Documentation**: `ORDER_PAYMENT_FLOW_DOCUMENTATION.md`
- **UI Documentation**: `ORDER_MANAGEMENT_UI_DOCUMENTATION.md`
- **Flow Diagrams**: `UI_FLOW_DIAGRAM.md`
- **Summary**: `UI_UPDATE_SUMMARY.md`

---

## 💬 Need Help?

### Common Questions

**Q: How do I create test accounts?**
A: Use the signup page or create directly in database with appropriate roles

**Q: Where are the API endpoints?**
A: Check `app/api/` directory for all endpoint implementations

**Q: How do I reset a test order?**
A: Update order status directly in database or use Prisma Studio

**Q: Can I restore old pages?**
A: Yes, old pages are backed up as `page-old-backup.tsx` files

**Q: How do I modify components?**
A: Components are in `components/orders/` directory with full TypeScript types

---

## ✨ Happy Testing!

Follow this guide systematically to ensure all features work correctly. Document any issues found and verify fixes before production deployment.

**Testing Priority:**
1. **High**: Order creation, payment, approval, delivery
2. **Medium**: Timeline, notifications, filters
3. **Low**: Styling tweaks, animations

**Remember**: Test each role separately and verify that users only see data they're authorized to access.
