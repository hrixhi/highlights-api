/**
 * used for generation of ticket code
 */
export const generateTicketCode = () => {
  let code = "";
  // Pool of Chars and Numbers used for code generation
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVXYZ0123456789";
  for (let i = 0; i < 5; i += 1) {
    code += charset[Math.floor(Math.random() * charset.length)];
  }
  return code;
};

/**
 * Used for validation of ticket code
 *
 * @param code Ticket code
 */
export const validateTicketCode = (code: string) => {
  if (code.length !== 5) {
    return false;
  }
  const pattern = new RegExp("/^([a-zA-Z0-9]){5}$/");
  return pattern.test(code);
};
/**
 *
 *
 * @param subTotalPrice totalOrderPrice + platformFees
 */


/**
 * Used to count subTotal price with platform fees but without stripe fees
 * Also includes TAX
 *
 * @param ticketItems Ticekt Items in order
 */
export const countSubTotalPrice = (
  ticketItems: any,
  platformFees: IPlatformFees
) => {
  let subTotalPrice = 0;
  ticketItems.forEach((item: any) => {

    let ticketFee = platformFees.perTicket;
    if (item.fee !== undefined) {
      ticketFee = item.fee;
    }
    if (item.count <= 0) {
      throw new Error("Minus or Zero value of count is not allowed");
    }
    if (item.price < 0) {
      throw new Error("Minus value of price is not allowed");
    }
    if (item.price !== 0) {
      let taxPercentage = platformFees.taxPercentage ? platformFees.taxPercentage : 0
      subTotalPrice += item.count * (item.price * (1 + (platformFees.perOrder + taxPercentage) / 100) + ticketFee); //In percentage
    }

  });
  return subTotalPrice;
};

/**
 *  Used to count ticket price without any fees
 *
 * @param ticketItems Ticekt Items in order
 */
export const countTotalTicketsPrice = (ticketItems: any) => {
  // console.log(ticketItems);
  let subTotalPrice = 0;
  ticketItems.forEach((item: any) => {
    subTotalPrice += item.count * item.price;
  });
  return subTotalPrice;
};

// As it is... Should we be counting tax on this? No no..
export const countPlatformFee = (
  ticketItems: any,
  platformFees: IPlatformFees
) => {
  let platformFee = 0;
  ticketItems.forEach((item: any) => {
    let ticketFee = platformFees.perTicket;
    if (item.price !== 0) {
      platformFee += item.count * (item.price * platformFees.perOrder / 100 + ticketFee); //In percentage
    }
  });
  return platformFee;
};

/**
 * Used to count Total end price of order
 *
 * @param ticketItems Ticekt Items in order
 */
export const countTotalPrice = (
  ticketItems: any,
  platformFees: IPlatformFees
): number => {

  let totalPrice = 0;
  const ticketPriceWithPlatformFees = countSubTotalPrice(
    ticketItems,
    platformFees
  );
  totalPrice = ticketPriceWithPlatformFees + 30;
  totalPrice /= (1 - 0.029);
  totalPrice = parseInt(totalPrice.toFixed(0), 0);
  return totalPrice;
};

export const countStripeFee = (
  totalPrice: number
): number => {
  let stripeFee = totalPrice * 0.029 + 30;
  return parseInt(stripeFee.toFixed(0), 0)
};

export const canBuy = (
  qtyToBuy: number,
  ticketItemId: string,
  eventId: string
) => { };

interface IPlatformFees {
  absorb: boolean;
  perTicket: number;
  perOrder: number;
  taxPercentage: number;
}
