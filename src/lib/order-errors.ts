/**
 * Maps errors raised by the create_order database function ("CODE:detail")
 * to messages a customer can act on.
 */
export function describeOrderError(message: string): string {
  const [code, detail] = message.split(":");
  switch (code.trim()) {
    case "OUT_OF_STOCK":
    case "ITEM_UNAVAILABLE":
      return "Sorry, one of the items in your bag just sold out or is no longer available. Please review your bag.";
    case "COUPON_INVALID":
      return "That coupon code is not valid any more. Remove it from your bag and try again.";
    case "COUPON_EXHAUSTED":
      return "That coupon has reached its usage limit.";
    case "COUPON_ALREADY_USED":
      return "This coupon has already been used with this phone number.";
    case "COUPON_MIN_SUBTOTAL":
      return `That coupon needs a minimum order of Rs. ${Number(detail).toLocaleString("en-PK")}.`;
    case "GIFT_INVALID":
    case "GIFT_OUT_OF_STOCK":
      return "Your free gift is no longer available. Please choose another one in your bag.";
    case "INVALID_INPUT":
      return "Some of your details look incorrect. Please check the form and try again.";
    default:
      return "We could not place your order right now. Please try again, or order on WhatsApp.";
  }
}
