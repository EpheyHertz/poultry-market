# IntaSend Payment Reset Behavior

## New Smart Reset Feature

When a payment fails due to user actions (cancellation, wrong PIN, insufficient funds, etc.), the system now:

### ✅ **Automatic Actions**
1. **Stops Polling**: No more waiting when payment won't succeed
2. **Resets Invoice ID**: Clears both current and manual invoice IDs  
3. **Clears State**: Resets payment status and loading states
4. **Shows Guidance**: Tells user they can try again

### 🔄 **Reset Triggers**

**User Error Codes That Trigger Reset:**
- `1032`: User cancelled payment request
- `2001`: Invalid M-Pesa PIN entered  
- `1`: Insufficient funds in M-Pesa account
- `1001`: Invalid phone number or M-Pesa not registered
- `1019`: Transaction limit exceeded

### 🎯 **User Experience**

**Before Reset (Old Behavior):**
```
❌ "You cancelled the payment request."
⏳ (continues polling for 2.5 minutes)
🔄 (user confusion about what to do)
```

**After Reset (New Behavior):**
```
❌ "You cancelled the payment request."
ℹ️ "Try again and complete the payment process."
🔄 "Payment cleared - you can try again with a new transaction."
🆕 [Try New Payment] button appears
```

### 🛠 **Implementation Details**

**Helper Functions:**
```typescript
const isUserError = (failedCode) => {
  const userErrorCodes = ['1032', '2001', '1', '1001', '1019'];
  return failedCode && userErrorCodes.includes(failedCode);
};

const resetPaymentState = () => {
  setCurrentInvoiceId('');
  setManualInvoiceId('');
  setPaymentStatus({checking: false, error: null, result: null});
  setIsLoading({stkPush: false, paymentCheck: false});
};
```

**Reset Behavior:**
1. **STK Push Polling**: Stops immediately on user error
2. **Manual Checking**: Resets state after 2 seconds  
3. **Status Display**: Shows "Try New Payment" button
4. **Auto Clear**: Happens automatically for user errors

### 📱 **User Journey Examples**

**Scenario 1: User Cancellation**
1. User initiates STK Push → `Invoice ID: ABC123`
2. User cancels on phone → `"You cancelled the payment request."`
3. System stops polling → `"Payment cleared - you can try again"`
4. User clicks "Try New Payment" → Fresh start
5. User initiates new STK Push → `Invoice ID: XYZ789`

**Scenario 2: Wrong PIN**
1. User enters wrong PIN → `"Invalid M-Pesa PIN entered."`
2. System resets automatically → Shows action guidance
3. User can immediately try again with correct PIN

**Scenario 3: System Error (No Reset)**
1. Network timeout → Continues polling (might resolve)
2. IntaSend service error → Continues polling (temporary)
3. Only user errors trigger reset

### ⚡ **Benefits**

- **No Complexity**: Simple, automatic behavior
- **Clear Feedback**: User knows exactly what happened
- **Fresh Start**: No confusion about old invoice IDs
- **Smart Polling**: Stops when it makes sense to stop
- **Better UX**: Faster recovery from user errors

This enhancement makes the payment flow much more intuitive and prevents users from getting stuck in failed payment states.