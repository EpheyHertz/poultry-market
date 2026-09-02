

Fetch the complete documentation index at: https://developers.intasend.com/llms.txt. Use this file to discover all available pages before exploring further.

# Payment Collection Events

Collection event payload example

# Payment collection events

## Webhook collection events examples and definition

Payment payload will be sent to you in real-time every time when the **`state`** field changes. Please ensure you have validated the challenge earlier provided and your reference number under the **`api_ref`** field.

#### Collection payload example

```
{
  "invoice_id": "BRZKGPR",
  "state": "PROCESSING",
  "provider": "CARD-PAYMENT",
  "charges": "0.00",
  "net_amount": "10.36",
  "currency": "KES",
  "value": "10.36",
  "account": "john.doe@gmail.com",
  "api_ref": "ISL_faa26ef9-eb08-4353-b125-ec6a8f022815",
  "host": "https://sandbox.intasend.com",
  "failed_reason": null,
  "failed_code": null,
  "failed_code_link": "https://intasend.com/troubleshooting",
  "created_at": "2021-08-18T12:33:50.425886+03:00",
  "updated_at": "2021-08-18T12:33:51.304105+03:00",
  "challenge": "testnet"
}
```

State fields reference

| State      | Description                                                              |
| ---------- | ------------------------------------------------------------------------ |
| PENDING    | The transaction has just been logged. No action was taken.               |
| PROCESSING | The customer is in the process of making payment                         |
| COMPLETE   | The transaction is complete - successful.                                |
| FAILED     | The transaction has failed - Check failed\_reason field for more details |