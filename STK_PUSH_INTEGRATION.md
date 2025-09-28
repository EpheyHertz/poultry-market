# Lipia STK Push Payment Integration

This document explains how to use the Lipia STK Push payment integration in the Poultry Marketplace application.

## Overview

The integration provides seamless M-Pesa payments through the Lipia API, with automatic callback handling and payment status tracking.

## Setup

### 1. Environment Variables

Add the following variables to your `.env.local` file:

```bash
# Lipia Payment Gateway
LIPIA_API_KEY=your-lipia-api-key-here
LIPIA_BASE_URL=https://lipia-api.kreativelabske.com/api/v2

# Application URL (for payment callbacks)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 2. Database Migration

The Payment model has been updated with additional fields. Run the migration:

```bash
npx prisma db push
# or
npx prisma migrate dev --name add-stk-push-fields
```

## API Endpoints

### 1. Order Payment with STK Push

**Endpoint:** `POST /api/payments`

**Request:**
```json
{
  "orderId": "order-id-here",
  "method": "MPESA",
  "phoneNumber": "0712345678",
  "stkPush": true
}
```

**Response (Success):**
```json
{
  "success": true,
  "payment": {
    "id": "payment-id",
    "status": "PENDING",
    "referenceNumber": "STK-TRANSACTION-REF"
  },
  "stkPush": {
    "initiated": true,
    "transactionReference": "64f1a2b3c4d5e6f7g8h9i0j1",
    "message": "STK push initiated successfully"
  }
}
```

### 2. Direct STK Push

**Endpoint:** `POST /api/payments/stk-push`

**Request:**
```json
{
  "phone_number": "0712345678",
  "amount": 100,
  "external_reference": "order_123",
  "description": "Payment for poultry products",
  "metadata": {
    "customer_name": "John Doe",
    "order_id": "12345"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "STK push initiated successfully",
  "data": {
    "transactionReference": "64f1a2b3c4d5e6f7g8h9i0j1",
    "responseCode": 0,
    "responseDescription": "Success. Request accepted for processing",
    "externalReference": "order_123",
    "phoneNumber": "254712345678",
    "amount": 100,
    "customerMessage": "STK push initiated successfully"
  }
}
```

### 3. Payment Status Check

**Endpoint:** `GET /api/payments/status/[orderId]`

**Response:**
```json
{
  "payment": {
    "id": "payment-id",
    "status": "COMPLETED",
    "amount": 100,
    "phoneNumber": "254712345678",
    "transactionCode": "MPZ123456",
    "callbackReceived": true
  },
  "order": {
    "id": "order-id",
    "status": "CONFIRMED",
    "total": 100
  }
}
```

### 4. Payment Retry

**Endpoint:** `POST /api/payments/status/[orderId]`

**Request:**
```json
{
  "phoneNumber": "0712345678"
}
```

## Phone Number Formats

The system accepts various Kenyan phone number formats:

✅ **Accepted formats:**
- `254712345678` (with country code)
- `+254712345678` (with + and country code)
- `0712345678` (local Safaricom format)
- `0112345678` (local Airtel format)

❌ **Not accepted:**
- `712345678` (missing leading zero or country code)
- International numbers from other countries

## Payment Flow

### Order Payment Flow

1. **Customer initiates payment:**
   - Frontend calls `POST /api/payments` with order details
   - System validates phone number and order
   - STK Push is initiated via Lipia API

2. **Customer receives STK Push:**
   - M-Pesa prompt appears on customer's phone
   - Customer enters PIN to authorize payment
   - M-Pesa processes the transaction

3. **Payment callback:**
   - Lipia sends callback to `/api/payments/callback/order/[orderId]`
   - System updates payment status in database
   - Order status is updated if payment successful

4. **Frontend polling (optional):**
   - Frontend can poll `/api/payments/status/[orderId]` to check status
   - Real-time updates can be implemented with WebSocket or SSE

## Error Handling

### Common Error Responses

**Invalid phone number:**
```json
{
  "error": "Invalid phone number format. Use formats like 0712345678, 254712345678, or +254712345678"
}
```

**Validation error:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "amount",
      "message": "Amount must be at least 1 KSH"
    }
  ]
}
```

**Lipia API error:**
```json
{
  "error": "Please check your input and try again",
  "code": "VALIDATION_ERROR",
  "field": "phone_number"
}
```

### Payment Status Codes

- `PENDING` - Payment initiated, waiting for callback
- `COMPLETED` - Payment successful
- `FAILED` - Payment failed (insufficient funds, etc.)
- `CANCELLED` - User cancelled the payment

## Frontend Integration

### React Hook Example

```typescript
import { useState } from 'react';

interface PaymentData {
  orderId: string;
  phoneNumber: string;
}

export function useSTKPush() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiatePayment = async ({ orderId, phoneNumber }: PaymentData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          method: 'MPESA',
          phoneNumber,
          stkPush: true
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (orderId: string) => {
    const response = await fetch(`/api/payments/status/${orderId}`);
    return response.json();
  };

  return {
    initiatePayment,
    checkPaymentStatus,
    loading,
    error
  };
}
```

### Payment Component Example

```typescript
import { useState } from 'react';
import { useSTKPush } from './hooks/useSTKPush';

export function PaymentForm({ orderId }: { orderId: string }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const { initiatePayment, loading, error } = useSTKPush();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await initiatePayment({ orderId, phoneNumber });
      
      // Show success message
      alert('STK Push sent to your phone. Please complete the payment.');
      
      // Optionally start polling for payment status
      pollPaymentStatus(orderId);
    } catch (error) {
      // Error is already set in the hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="phone">Phone Number:</label>
        <input
          id="phone"
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="0712345678"
          required
        />
      </div>
      
      {error && <p className="error">{error}</p>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Pay with M-Pesa'}
      </button>
    </form>
  );
}
```

## Testing

### Test Phone Numbers

Use the following test phone numbers in development:

- `254712345678` - Always successful
- `254712345679` - Always fails
- `254712345680` - User cancellation

### Local Testing

1. Start your development server
2. Use ngrok or similar tool to expose your local server
3. Update `NEXT_PUBLIC_APP_URL` to your ngrok URL
4. Test payments with small amounts (minimum 1 KSH)

## Security Considerations

1. **API Key Protection:**
   - Never expose `LIPIA_API_KEY` in frontend code
   - Store securely in environment variables
   - Use different keys for development and production

2. **Callback Validation:**
   - Callbacks are received from Lipia's servers
   - Consider implementing webhook signature validation if available

3. **Amount Validation:**
   - Always validate payment amounts on the server
   - Check that the callback amount matches the expected amount

4. **Phone Number Privacy:**
   - Store phone numbers securely
   - Consider encrypting sensitive payment data

## Production Deployment

1. **Environment Setup:**
   ```bash
   LIPIA_API_KEY=your-production-api-key
   LIPIA_BASE_URL=https://lipia-api.kreativelabske.com/api/v2
   NEXT_PUBLIC_APP_URL=https://your-production-domain.com
   ```

2. **SSL Certificate:**
   - Ensure your domain has a valid SSL certificate
   - Lipia callbacks require HTTPS endpoints

3. **Monitoring:**
   - Monitor payment success rates
   - Set up alerts for failed payments
   - Log all payment transactions for audit

## Troubleshooting

### Common Issues

1. **STK Push not received:**
   - Check phone number format
   - Ensure phone has airtime/data
   - Try with different test numbers

2. **Callback not received:**
   - Check callback URL is accessible
   - Verify SSL certificate
   - Check server logs for errors

3. **Payment stuck in PENDING:**
   - User may have cancelled
   - Network timeout occurred
   - Check Lipia dashboard for transaction status

### Debugging Tips

1. **Enable detailed logging:**
   ```typescript
   console.log('STK Push Request:', stkPushRequest);
   console.log('STK Push Response:', stkResponse);
   console.log('Payment Callback:', callbackData);
   ```

2. **Check payment status:**
   ```bash
   # Check payment in database
   npx prisma studio
   
   # Or query directly
   curl https://your-domain.com/api/payments/status/ORDER_ID
   ```

3. **Monitor network requests:**
   - Use browser dev tools to check API calls
   - Verify request/response formats
   - Check for CORS issues

## Support

For issues with the Lipia API:
- Documentation: https://lipia-api.kreativelabske.com/docs
- Support: Contact Kreative Labs KE

For integration issues:
- Check console logs for errors
- Verify environment variables
- Test with minimal example first