

Fetch the complete documentation index at: https://developers.intasend.com/llms.txt. Use this file to discover all available pages before exploring further.

# Accept all payment methods

How to setup IntaSend Payment Button element to accept all payment methods.

IntaSend payment button is easy to setup. As detailed in the Payment Button introduction screen, you basically need:

* Add our IntaSend InlineJS Plugin (WebSDK Plugin) to your site
* Add a Payment Button element and specify your defaults using the data-\* attributes options provided.
* Instantiate IntaSend by setting your API Keys and listen for events e.g on success and failure.

> 📘 Data-Method attribute
>
> We use the data-method attribute to specify the payment method the user should use to make payment. The options that are available are CARD-PAYMENT, M-PESA, and BANK-PAYMENT. Note that this field is case sensitive.
>
> Leaving this attribute blank i.e not specifying it in your Payment Button element, the users will have access to all the payment methods that we provide.

Below is a full example on how to add IntaSend Payment Button to your website.

[block:embed]
{
  "html": "<iframe class=\"embedly-embed\" src=\"//cdn.embedly.com/widgets/media.html?src=https%3A%2F%2Fjsfiddle.net%2Frg5sj70q%2F1%2Fembedded%2F&display_name=jsFiddle&url=https%3A%2F%2Fjsfiddle.net%2Frg5sj70q%2F1%2F&key=7788cb384c9f4d5dbbdbeffd9fe4b92f&type=text%2Fhtml&schema=jsfiddle\" width=\"600\" height=\"400\" scrolling=\"no\" title=\"jsFiddle embed\" frameborder=\"0\" allow=\"autoplay; fullscreen; encrypted-media; picture-in-picture;\" allowfullscreen=\"true\"></iframe>",
  "url": "https://jsfiddle.net/rg5sj70q/1/",
  "title": null,
  "favicon": null,
  "provider": "http://jsfiddle.net",
  "href": "https://jsfiddle.net/rg5sj70q/1/",
  "typeOfEmbed": "default"
}
[/block]
intasend-inline.js
https://unpkg.com/intasend-inlinejs-sdk@4.0.0/build/intasend-inline.js