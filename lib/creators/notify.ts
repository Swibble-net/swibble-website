import nodemailer from "nodemailer";
import { EMAIL_LOGO_ATTACHMENT, SITE_URL } from "@/lib/contact/mailLayout";
import {
  GENERAL_INQUIRY_NAME,
  buildInquiryConfirmation,
  buildInquiryNotification,
  type BuiltMail,
  type CreatorInquiry,
} from "./inquiry";
import { publicName } from "./config";
import type { CreatorProfile } from "./types";

export function isMailConfigured(): boolean {
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD } = process.env;
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASSWORD);
}

export function siteUrl(): string {
  // Preview deployments link to themselves, everything else to production.
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return SITE_URL;
}

/** SMTP connection and sender address (form@swibble.net). */
export function mailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  return { transporter, SMTP_USER };
}

/**
 * Sends an inquiry to Swibble (reply-to: the sender) and a confirmation to
 * the sender — for one creator, or general (creator null, from /creator).
 * Throws when the mail to Swibble fails — then nothing arrived.
 */
export async function sendCreatorInquiry(
  inquiry: CreatorInquiry,
  creator: CreatorProfile | null,
): Promise<{ confirmationSent: boolean }> {
  const { transporter, SMTP_USER } = mailTransport();

  const base = siteUrl();
  const pageUrl = `${base.replace(/^https:\/\//, "")}/creator${creator ? `/${creator.slug}` : ""}`;
  // Swibble gets the full name, the sender only what the page shows.
  const name = creator?.name ?? GENERAL_INQUIRY_NAME;
  const shownName = creator ? publicName(creator.name) : GENERAL_INQUIRY_NAME;
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
    buildInquiryNotification(inquiry, {
      name,
      // Drafts are reached through their preview link.
      pageUrl: creator && !creator.published ? `${pageUrl} (Vorschau, noch nicht veröffentlicht)` : pageUrl,
      adminUrl: `${base}/admin/creator${creator ? `/${creator.id}` : ""}`,
    }),
    inquiry.email,
  );

  try {
    await send(
      inquiry.email,
      buildInquiryConfirmation(inquiry, { name: shownName, pageUrl }),
      String(SMTP_USER),
    );
    return { confirmationSent: true };
  } catch {
    // No details in the logs: SMTP errors can echo addresses.
    return { confirmationSent: false };
  }
}
