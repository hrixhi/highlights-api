import { hashPassword } from '@app/data/methods';
import Stripe from 'stripe';

/**
 * This is the stripe helper class that aids in transactions
 */
export class StripeService {
  private stripeProvider: Stripe;
  constructor(stripeSecretKey: string) {
    this.stripeProvider = new Stripe(stripeSecretKey);
  }

  /**
   * The create charge function responsible for all transactions
   */
  public async createCharge(
    stripeToken: string,
    eventId: string,
    totalPrice: number,
    ownerName: string,
    ownerEmail: string,
    quantity: number,
    eventName: string,
    createdBy: string,
    platformFee: number,
    stripeId: string,
    ticketCode?: string,

  ) {
    const idempotencyKey = await hashPassword(
      Math.random() + new Date().toTimeString()
    );
    try {
      const date = new Date();

      // If admin account, let the money go straight to the platform account.
      if (
        String(createdBy).trim() === String('5cda7011ac6ccd2da9493206').trim()
        || String(createdBy).trim() === String('5c93e30102081336453d0f42').trim()
        || String(createdBy).trim() === String('5cd607a2ac7a640ec20f46b6').trim()
      ) {
        // Money comes straight to admin
        return await this.stripeProvider.charges.create(
          {
            amount: totalPrice,
            currency: "usd",
            description: "(" + quantity + ") Tickets for " + eventName + " (" + ticketCode + ")",
            source: stripeToken,
            statement_descriptor: "Isotope Ticketing",
            metadata: {
              ticketCode: ticketCode ? ticketCode : "",
              eventId,
              name: ownerName,
              email: ownerEmail,
              fullUserTimeInfo: JSON.stringify(date)
            }
          },
          {
            idempotency_key: idempotencyKey
          }
        );
      } //
      else if (String(createdBy).trim() === String('5d3a0a1f7634d34b1a554849').trim()) {
        // Charge in Rupees 
        // FOR INDIA !!!
        return await this.stripeProvider.charges.create(
          {
            amount: totalPrice,
            currency: "inr",
            description: "(" + quantity + ") Tickets for " + eventName + " (" + ticketCode + ")",
            source: stripeToken,
            statement_descriptor: "Isotope Ticketing",
            metadata: {
              ticketCode: ticketCode ? ticketCode : "",
              eventId,
              name: ownerName,
              email: ownerEmail,
              fullUserTimeInfo: JSON.stringify(date)
            }
          },
          {
            idempotency_key: idempotencyKey
          }
        );
      }
      // If not, then it should be routed to the correct connect account
      else {
        // Money goes to connect account
        return await this.stripeProvider.charges.create(
          {
            amount: totalPrice,
            currency: "usd",
            description: "(" + quantity + ") Tickets for " + eventName + " (" + ticketCode + ")",
            source: stripeToken,
            statement_descriptor: "Isotope Ticketing",
            application_fee_amount: Math.round(Number(platformFee.toFixed(2))),
            metadata: {
              ticketCode: ticketCode ? ticketCode : "",
              eventId,
              name: ownerName,
              email: ownerEmail,
              fullUserTimeInfo: JSON.stringify(date)
            }
          },
          {
            stripe_account: stripeId
          }
        );
      }
    } catch (error) {
      return {
        result: false,
        idempotencyKey
      };
    }
  }
}
