import { render } from 'ejs';
import { readFile } from 'fs';
import { ServerClient } from 'postmark';
import qr from 'qr-image';
import * as pdf2base64 from 'pdf-to-base64'

const pdfToBase64: any = pdf2base64;

/**
 * This is the class that aids with all emails that are sent out by the server. Postmark's API is being utilized.
 */
export class PostmarkService {
  public client: ServerClient;

  /**
   * Constructor
   */
  constructor() {
    this.client = new ServerClient('c71edd5b-cd75-4b13-87e0-1fd6a8b49e95');
  }

  /**
   * Send the ticket receipt.
   */
  public async sendEmailReceipt(
    to: string,
    ticketCode: string,
    ticket: any,
    event: any,
    pdfURLs: any[],
    startTime: string
  ) {

    const url = `http://istkt.com/${ticket.code}`;
    let ticketList = "";

    if (event.currency && event.currency === 'INR') {
      // Use rupee
      ticket.ticketComponents.forEach((t: any) => {
        ticketList += render(
          "<tr>" +
          '<th style="width:160px !important;text-align: left"><%= name %> </th>' +
          '<th style="text-align:center !important"><%= count %></th>' +
          '<th style="text-align:right !important">&#8377;<%= price %></th>' +
          "</tr>",
          { name: t.name, count: t.count, price: (t.price / 100).toFixed(2) }
        );
      });
    } else {
      // Use dollar
      ticket.ticketComponents.forEach((t: any) => {
        ticketList += render(
          "<tr>" +
          '<th style="width:160px !important;text-align: left"><%= name %> </th>' +
          '<th style="text-align:center !important"><%= count %></th>' +
          '<th style="text-align:right !important">$<%= price %></th>' +
          "</tr>",
          { name: t.name, count: t.count, price: (t.price / 100).toFixed(2) }
        );
      });
    }

    let pdfNums = pdfURLs.length;
    let pdfContents: any[] = [];
    if (pdfNums === 0) {
      this.sendEmailWithPDF(to, ticketCode, ticket, event, startTime, url, ticketList, pdfContents);
    }
    pdfURLs.forEach((url: any) => {
      pdfToBase64.default(url).then((res: any) => {
        pdfContents.push(
          {
            encodedContent: res,
            fileName: url.split("/").pop()
          }
        );
        if (pdfContents.length === pdfNums) {
          this.sendEmailWithPDF(to, ticketCode, ticket, event, startTime, url, ticketList, pdfContents);
        }
      })
    });
  }

  /**
   * Send ticket receipt helper function. 
   */
  public async sendEmailWithPDF(
    to: string,
    ticketCode: string,
    ticket: any,
    event: any,
    dateTo: string,
    url: string,
    ticketList: string,
    pdfContents: string[]
  ) {
    const subtotal = ticket.tax === undefined || ticket.tax === null ?
      ((ticket.totalPrice - ticket.totalPlatformFees - ticket.totalProcessingFees) / 100).toFixed(2) :
      ((ticket.totalPrice - ticket.totalPlatformFees - ticket.totalProcessingFees - ticket.tax) / 100).toFixed(2)

    readFile(
      __dirname + "/templates/ticket/purchase.ejs",
      undefined,
      (err, ejsTpl) => {
        const htmlBody = render(ejsTpl.toString(), {
          eventName: event.name,
          ticketId: ticket.code,
          buyerName: ticket.buyer.fullName,
          eventAddress: event.location,
          eventTime: dateTo,
          absorb: event.fees.absorb,
          subtotalPrice: subtotal,
          tax: ticket.tax ? (ticket.tax / 100).toFixed(2) : null,
          totalPlatformFees: (ticket.totalPlatformFees / 100).toFixed(2),
          totalProcessingFees: (ticket.totalProcessingFees / 100).toFixed(2),
          totalPrice: (ticket.totalPrice / 100).toFixed(2),
          ticketList,
          currency: event.currency && event.currency === 'INR' ? 'INR' : 'USD'
        });

        let options = {
          From: "orders@isotopeticketing.com",
          To: to,
          Subject: "Your Tickets",
          HtmlBody: htmlBody,
          Attachments: [
            {
              Name: "my-qr-image",
              Content: qr.imageSync(url, { type: "png" }).toString("base64"),
              ContentType: "image/png",
              ContentID: "cid:my-qr-image@isotopeticketing.com"
            }
          ]
        };
        if (pdfContents.length > 0) {
          pdfContents.forEach((content: any, idx) => {
            options.Attachments.push({
              Name: "ticket-" + (idx + 1) + ".pdf",
              Content: content.encodedContent,
              ContentType: "application/pdf",
              ContentID: ""
            })
          });
        }
        this.client.sendEmail(options, (error) => {
        });
      }
    );
  }

  /**
   * Sends an invite to the platform.
   */
  public async sendEmailInvite(to: string, rawPassword: string) {
    readFile(
      __dirname + '/templates/account/invite.ejs',
      undefined,
      (err, ejsTpl) => {
        const htmlBody = render(ejsTpl.toString(), {
          email: to,
          password: rawPassword,
          prevUser: false,
          reset: false
        });
        const options = {
          From: 'info@isotopeticketing.com',
          To: to,
          Subject: 'You have been invited.',
          HtmlBody: htmlBody,
        };

        this.client.sendEmail(options, () => {
        });
      },
    );
  }

  /**
   * Sends a notification that the user has been added to a new event.
   */
  public async sendNewEventEmail(to: string) {
    readFile(
      __dirname + '/templates/account/invite.ejs',
      undefined,
      (err, ejsTpl) => {
        const htmlBody = render(ejsTpl.toString(), {
          email: to,
          prevUser: true,
          reset: false
        });
        const options = {
          From: 'info@isotopeticketing.com',
          To: to,
          Subject: 'You have been added to a new event!',
          HtmlBody: htmlBody,
        };

        this.client.sendEmail(options, () => {
        });
      },
    );
  }

  /**
   * Sends a link to the reset password page.
   */
  public async passwordReset(to: string, rawPassword: string) {
    readFile(
      __dirname + '/templates/account/invite.ejs',
      undefined,
      (err, ejsTpl) => {
        const htmlBody = render(ejsTpl.toString(), {
          email: to,
          password: rawPassword,
          prevUser: false,
          reset: true
        });
        const options = {
          From: 'orders@isotopeticketing.com',
          To: to,
          Subject: 'Your account password has been reset.',
          HtmlBody: htmlBody,
        };

        this.client.sendEmail(options, () => {
        });
      },
    );
  }

  /**
   * Sends an activated ticket offer.
   */
  public async emailPrivateOffer(to: string, code: string, eventId: string, eventName: string, promoterName: string) {
    readFile(
      __dirname + '/templates/offer/offer.ejs',
      undefined,
      (err, ejsTpl) => {

        const htmlBody = render(ejsTpl.toString(), {
          code,
          eventId,
          eventName,
          promoterName
        });

        const options = {
          From: 'info@isotopeticketing.com',
          To: to,
          Subject: 'You have been invited to ' + eventName + '!',
          HtmlBody: htmlBody,
        };

        this.client.sendEmail(options, () => {
        });
      },
    );
  }

  /**
   * Sends a message to the email specified.
   */
  public async emailMessage(from: string, to: string, message: string, eventName: string, type: string) {
    const options = {
      From: 'info@isotopeticketing.com',
      To: to,
      Subject: type === 'team'
        ? eventName + ' | New Message from ' + from + ' (event host) | No-reply'
        : type === 'buyers'
          ? eventName + ' | Annoucement from event host | No-reply'
          : type === 'referralLinkUsers'
            ? eventName + ' | Your Referral Link | No-reply'
            : eventName + ' | Message from event host | No-reply',
      HtmlBody: message,
    };

    this.client.sendEmail(options, () => {
    });
  }

  /**
   * Sends a link to the reset password page.
   */
  public async requestAccess(message: string) {
    const options = {
      From: 'info@isotopeticketing.com',
      To: 'isotopeticketing@gmail.com',
      Subject: 'ACCESS REQUEST',
      HtmlBody: message
    };

    this.client.sendEmail(options, () => {
    });
  }

}
