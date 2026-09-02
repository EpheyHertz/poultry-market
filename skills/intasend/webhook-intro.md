

Fetch the complete documentation index at: https://developers.intasend.com/llms.txt. Use this file to discover all available pages before exploring further.

# How to Setup Webhook

How to setup your webhook destination URL on IntaSend

## How to set up a Webhook

***Webhook events*** are basically automated messages sent from apps when something happens. They have a message or payload and are sent to a unique URL.

A mentioned in the [Introduction to Webhooks](https://developers.intasend.com/docs/webhooks) , IntaSend supports webhooks where we send collection, send money, and chargeback events whenever the object's state changes.

Webhook events can be used to validate payments transactions, log collections, and chargeback actions in real-time.

## Add your destination URL

From the IntaSend dashboard, select Webhooks and set up your endpoint URL, and provide a challenge. Use the provided challenge to validate requests from IntaSend. We store this in an encrypted manner. To ensure maximum security between IntaSend and your backend, please ensure the provided endpoint uses HTTPS  protocol.

[block:image]
{
  "images": [
    {
      "image": [
        "https://files.readme.io/a6a5aec-webhooks.png",
        "how-to-setup-intasend-webhook.png",
        1276
      ],
      "align": "center",
      "caption": "How to setup your webhook to receive automated notifications from IntaSend"
    }
  ]
}
[/block]

### Managing requests and failure

To ensure the service works well and efficiently, we recommend that the provided endpoint be up around the clock. The webhook will deactivate if IntaSend fails to send more than 20 subsequent requests to the endpoint. You can only re-activate by contacting customer support. Please ensure that your endpoint is back up and running before contacting customer support.