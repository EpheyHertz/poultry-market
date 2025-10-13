# Enhanced IntaSend Error Handling Documentation

## Overview

Enhanced the IntaSend payment system to provide user-friendly error messages for various payment failure scenarios, particularly for user cancellations and wrong PIN entries.

## Key Improvements

### 1. Error Code Mapping

Added comprehensive error code mapping in `lib/intasend.ts`:

```typescript
function getIntaSendErrorMessage(failedCode: string, failedReason: string)
```

**Supported Error Codes:**
- `1032`: User cancelled payment request
- `2001`: Invalid M-Pesa PIN entered
- `1`: Insufficient funds in M-Pesa account
- `2006`: Transaction timeout
- `1001`: Invalid phone number or M-Pesa not registered
- `1019`: Transaction limit exceeded
- `1037`: Unable to process request

### 2. Enhanced Payment Summary

Updated `getPaymentSummary()` to include:
- **Rounded amounts**: 12.36 becomes 13 (using `Math.ceil()`)
- **Error information**: User-friendly error messages
- **Raw amounts**: Original amounts for reference
- **Action guidance**: What users should do next

```typescript
{
  state: 'FAILED',
  amount: 13,           // Rounded up amount
  rawAmount: 12.36,     // Original amount
  errorInfo: {
    userMessage: "You cancelled the payment request.",
    technicalMessage: "Request Cancelled by user",
    actionRequired: "Try again and complete the payment process."
  }
}
```

### 3. API Response Enhancements

#### Status Route (`/api/payments/intasend/status/[invoiceId]`)
- Includes `customerMessage`, `actionRequired`, and `technicalMessage` for failed payments
- Maintains backward compatibility with existing fields

#### Verify Route (`/api/payments/intasend/verify`)
- Enhanced error responses with specific guidance
- Different messages for different failure types:
  - Payment failed vs pending vs cancelled
  - Amount mismatches
  - Invoice reuse prevention

### 4. Frontend Integration

Updated checkout page to handle enhanced error messages:

```typescript
// Example error handling for different scenarios
if (data.details.paymentState === 'FAILED') {
  toast.error(data.customerMessage); // "You cancelled the payment request."
  setTimeout(() => {
    toast.info(data.actionRequired); // "Try again and complete the payment process."
  }, 1000);
}
```

## Error Message Examples

### User Cancelled Payment (Code 1032)
```json
{
  "success": false,
  "customerMessage": "You cancelled the payment request.",
  "actionRequired": "Try again and complete the payment process.",
  "details": {
    "paymentState": "FAILED",
    "failedCode": "1032",
    "failedReason": "Request Cancelled by user."
  }
}
```

### Wrong PIN (Code 2001)
```json
{
  "success": false,
  "customerMessage": "Invalid M-Pesa PIN entered.",
  "actionRequired": "Please try again with the correct M-Pesa PIN.",
  "details": {
    "paymentState": "FAILED",
    "failedCode": "2001",
    "failedReason": "The initiator information is invalid."
  }
}
```

### Insufficient Funds (Code 1)
```json
{
  "success": false,
  "customerMessage": "Insufficient funds in your M-Pesa account.",
  "actionRequired": "Add money to your M-Pesa account and try again.",
  "details": {
    "paymentState": "FAILED",
    "failedCode": "1",
    "failedReason": "Insufficient Balance"
  }
}
```

## Amount Rounding System

### Implementation
- **Input**: Raw amount from IntaSend (e.g., 12.36)
- **Processing**: `Math.ceil(12.36)` = 13
- **Validation**: Accepts both original and rounded amounts within tolerance
- **Display**: Shows rounded amount to users

### Benefits
- Consistent whole number amounts
- Handles IntaSend's decimal fee calculations
- Maintains backward compatibility
- Reduces user confusion with cents

## Usage Guidelines

### For Developers
1. **Error Handling**: Always check for `errorInfo` in payment summaries
2. **User Messages**: Use `customerMessage` for user-facing errors
3. **Technical Details**: Use `technicalMessage` for logging/debugging
4. **Actions**: Display `actionRequired` to guide users

### For Users
1. **Clear Feedback**: Users see exactly what went wrong
2. **Actionable Guidance**: Specific steps to resolve issues
3. **Reduced Friction**: No technical jargon or error codes
4. **Better UX**: Progressive disclosure of error details

## Testing Scenarios

### Common Test Cases
1. **Cancel Payment**: User cancels STK Push prompt
2. **Wrong PIN**: User enters incorrect M-Pesa PIN
3. **Insufficient Funds**: Account has insufficient balance
4. **Network Issues**: Timeout or connectivity problems
5. **Invalid Phone**: Non-existent or inactive M-Pesa number

### Expected Behaviors
- Each scenario shows appropriate user message
- Action guidance helps users resolve issues
- Technical details available for debugging
- Payment status properly tracked in database

## Monitoring and Analytics

### Key Metrics to Track
- **Error Distribution**: Which error codes occur most frequently
- **User Behavior**: Do users retry after specific errors?
- **Success Rates**: Improvement after enhanced messaging
- **Support Requests**: Reduction in payment-related queries

### Implementation Notes
- Error information is logged for analytics
- Failed payments update invoice status properly
- Enhanced UX reduces support burden
- Clear messaging improves conversion rates

This enhanced error handling system provides a much better user experience while maintaining robust fraud prevention and technical reliability.