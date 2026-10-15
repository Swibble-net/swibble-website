import nodemailer from "nodemailer";
import { EMAIL_LOGO_ATTACHMENT, SITE_URL } from "@/lib/contact/mailLayout";
import {
  buildInquiryConfirmation,
  buildInquiryNotification,
  type BuiltMail,
  type CreatorInquiry,
} from "./inquiry";
import type { CreatorProfile } from "./types";

export function isMailConfigured(): boolean {
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD } = process.env;
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASSWORD);
}

function siteUrl(): string {
  // Preview deployments link to themselves, everything else to production.
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return SITE_URL;
}

/**
 * Sends an inquiry to Swibble (reply-to: the sender) and a confirmation to
 * the sender. Throws when the mail to Swibble fails — then nothing arrived.
 */
export async function sendCreatorInquiry(
  inquiry: CreatorInquiry,
  creator: CreatorProfile,
): Promise<{ confirmationSent: boolean }> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  const base = siteUrl();
  const pageUrl = `${base.replace(/^https:\/\//, "")}/creator/${creator.slug}`;
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
      name: creator.name,
      pageUrl,
      adminUrl: `${base}/admin/creator/${creator.id}`,
    }),
    inquiry.email,
  );

  try {
    await send(inquiry.email, buildInquiryConfirmation(inquiry, { name: creator.name, pageUrl }), String(SMTP_USER));
    return { confirmationSent: true };
  } catch {
    // No details in the logs: SMTP errors can echo addresses.
    return { confirmationSent: false };
  }
}
