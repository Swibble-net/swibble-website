import nodemailer from "nodemailer";
import { EMAIL_LOGO_ATTACHMENT } from "@/lib/contact/mailLayout";
import {
  buildApplicantMail,
  buildGuardianMail,
  buildInternalMail,
  type BuiltMail,
} from "./mails";
import type { Application } from "./types";

function siteUrl(): string {
  // Preview deployments link to themselves, everything else to production.
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://www.swibble.net";
}

export interface NotificationResult {
  internal: boolean;
  applicant: boolean;
  /** null = no guardian mail due (adult, or no guardian e-mail address) */
  guardian: boolean | null;
}

/**
 * Sends the mails for a new application: internal notification (name, roles,
 * center, admin link — no contact data, no files), confirmation to the
 * applicant and, for minors with a guardian e-mail address, confirmation to
 * the guardian. The application is already stored at this point, so failures
 * are reported but never thrown.
 */
export async function sendApplicationMails(
  application: Application,
): Promise<NotificationResult> {
  const guardianMail = buildGuardianMail(application);
  const result: NotificationResult = {
    internal: false,
    applicant: false,
    guardian: guardianMail ? false : null,
  };

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return result;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  const send = async (to: string, mail: BuiltMail, replyTo?: string) => {
    try {
      await transporter.sendMail({
        from: { name: "Swibble", address: SMTP_USER },
        to,
        replyTo,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
        attachments: [EMAIL_LOGO_ATTACHMENT],
      });
      return true;
    } catch {
      // No error details in the logs: SMTP errors can echo addresses/content.
      return false;
    }
  };

  const adminUrl = `${siteUrl()}/admin/bewerbungen/${application.id}`;
  const [internal, applicant, guardian] = await Promise.all([
    send(SMTP_USER, buildInternalMail(application, adminUrl)),
    send(application.email, buildApplicantMail(application), SMTP_USER),
    guardianMail && application.guardian?.email
      ? send(application.guardian.email, guardianMail, SMTP_USER)
      : Promise.resolve(null),
  ]);

  if (!internal || !applicant || guardian === false) {
    console.error("[applications] at least one mail could not be sent");
  }
  return { internal, applicant, guardian };
}
