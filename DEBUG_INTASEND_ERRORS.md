# Debugging IntaSend Error Messages

## Quick Verification Checklist

### 1. Check API Response Structure
When testing payment cancellation, verify the API response includes:

```json
{
  "success": true,
  "state": "FAILED",
  "customerMessage": "You cancelled the payment request.",
  "actionRequired": "Try again and complete the payment process.",
  "errorInfo": {
    "userMessage": "You cancelled the payment request.",
    "actionRequired": "Try again and complete the payment process.",
    "technicalMessage": "Request Cancelled by user"
  },
  "failedCode": "1032",
  "failedReason": "Request Cancelled by user."
}
```

### 2. Frontend Toast Messages
After canceling a payment, you should see:
1. **Error Toast**: "You cancelled the payment request." (red)
2. **Info Toast** (1 second later): "Try again and complete the payment process." (blue)

### 3. Payment Status Display
In the payment status section, you should see:
- **User Message** (red, bold): "You cancelled the payment request."
- **Action Guidance** (blue, small): "What to do: Try again and complete the payment process."
- **Technical Details** (gray, tiny): "Technical: Request Cancelled by user."

## Testing Different Scenarios

### Scenario 1: User Cancellation (Code 1032)
1. Initiate STK Push
2. Cancel on phone
3. Expected: "You cancelled the payment request."

### Scenario 2: Wrong PIN (Code 2001)  
1. Initiate STK Push
2. Enter wrong PIN
3. Expected: "Invalid M-Pesa PIN entered."

### Scenario 3: Insufficient Funds (Code 1)
1. Initiate STK Push with high amount
2. Complete with insufficient balance
3. Expected: "Insufficient funds in your M-Pesa account."

## Debugging Steps

### If error messages don't appear:

1. **Check Browser Console**
   ```javascript
   // Look for these logs
   console.log("Status response:", statusResponse);
   console.log("Payment summary:", paymentSummary);
   ```

2. **Verify API Response**
   ```bash
   # Test the status endpoint directly
   curl "http://localhost:3000/api/payments/intasend/status/YOUR_INVOICE_ID"
   ```

3. **Check Frontend State**
   ```javascript
   // In browser dev tools
   console.log(paymentStatus.result);
   ```

### Common Issues:

1. **Missing Error Messages**: Check if `errorInfo` exists in payment summary
2. **Toast Not Showing**: Verify toast configuration and timeout
3. **Wrong Message**: Check error code mapping in `getIntaSendErrorMessage()`
4. **Cache Issues**: Hard refresh browser (Ctrl+Shift+R)

## Expected Flow

```
IntaSend API → getPaymentSummary() → Add errorInfo → Status Route → Frontend → User Toast
     ↓              ↓                    ↓              ↓           ↓          ↓
Failed Payment → Map Error Code → Include in Response → Parse → Display Message
```

## Configuration Check

Ensure these functions are properly connected:
- ✅ `getIntaSendErrorMessage()` in `lib/intasend.ts`
- ✅ `getPaymentSummary()` includes `errorInfo`
- ✅ Status route adds `customerMessage` and `actionRequired`
- ✅ Frontend checks for enhanced error fields
- ✅ Toast messages use `customerMessage` instead of `failedReason`

## Example Working Response

```json
{
  "success": true,
  "state": "FAILED",
  "amount": 13,
  "rawAmount": 13,
  "currency": "KES",
  "phone": "254700086852",
  "invoiceId": "0LN7W84",
  "failedReason": "Request Cancelled by user.",
  "failedCode": "1032",
  "errorInfo": {
    "userMessage": "You cancelled the payment request.",
    "technicalMessage": "Request Cancelled by user",
    "actionRequired": "Try again and complete the payment process."
  },
  "customerMessage": "You cancelled the payment request.",
  "actionRequired": "Try again and complete the payment process.",
  "isSuccessful": false,
  "isComplete": true
}
```

If you see this structure but still don't get user-friendly error messages, check the frontend code paths and toast configuration.