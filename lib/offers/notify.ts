import { EMAIL_LOGO_ATTACHMENT } from "@/lib/contact/mailLayout";
import type { BuiltMail, CreatorInquiry } from "@/lib/creators/inquiry";
import { mailTransport, siteUrl } from "@/lib/creators/notify";
import { offerHeadline, offerPath } from "./config";
import { buildOfferConfirmation, buildOfferNotification } from "./mail";
import type { CreatorOffer } from "./types";

/** A picked creator: full name for Swibble, first name for the customer. */
export interface PickedCreator {
  name: string;
  shownName: string;
  price: string;
}

/**
 * Sends a choice from a web offer to Swibble (reply-to: the customer) and a
 * confirmation to the customer. Throws when the mail to Swibble fails.
 */
export async function sendOfferInquiry(
  inquiry: CreatorInquiry,
  offer: CreatorOffer,
  picked: PickedCreator[],
): Promise<{ confirmationSent: boolean }> {
  const { transporter, SMTP_USER } = mailTransport();
  const base = siteUrl();
  const send = (to: string, mail: BuiltMail, replyTo: string) =>
    transporter.sendMail({
      from: { name: "Swibble", address: String(SMTP_USER) },
      to,
      replyTo,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments: [EMAIL_LOGO_ATTACHMENT],
    });

  await send(
    String(SMTP_USER),
    buildOfferNotification(inquiry, {
      customer: offer.customer,
      headline: offerHeadline(offer),
      chosen: picked.map(({ name, price }) => ({ name, price })),
      adminUrl: `${base}/admin/angebote/${offer.id}`,
    }),
    inquiry.email,
  );

  try {
    await send(
      inquiry.email,
      buildOfferConfirmation(inquiry, {
        chosen: picked.map(({ shownName, price }) => ({ name: shownName, price })),
        offerUrl: `${base}${offerPath(offer.token)}`,
      }),
      String(SMTP_USER),
    );
    return { confirmationSent: true };
  } catch {
    // No details in the logs: SMTP errors can echo addresses.
    return { confirmationSent: false };
  }
}
