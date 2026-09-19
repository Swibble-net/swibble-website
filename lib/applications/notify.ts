import nodemailer from "nodemailer";
import { roleLabel } from "./config";
import type { Application } from "./types";

function siteUrl(): string {
  // Preview deployments link to themselves, everything else to production.
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://www.swibble.net";
}

/**
 * Notifies Swibble about a new application. Deliberately minimal: name, roles,
 * center and a link into the admin area — no contact data, no birth date, no
 * file. Returns false when mail isn't configured or sending failed; the
 * application itself is already stored at this point.
 */
export async function notifyNewApplication(
  application: Application,
): Promise<boolean> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return false;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });

  const name = `${application.firstName} ${application.lastName}`;
  const roles = application.roles.map(roleLabel).join(", ");
  const center = application.centerName || "kein Center angegeben";

  try {
    await transporter.sendMail({
      from: SMTP_USER,
      to: SMTP_USER,
      subject: `Neue Bewerbung: ${name} (${roles})`,
      text: [
        "Es ist eine neue Bewerbung eingegangen.",
        "",
        `Name: ${name}`,
        `Bewirbt sich als: ${roles}`,
        `Center: ${center}`,
        "",
        `Alle Angaben im Admin-Bereich: ${siteUrl()}/admin/bewerbungen/${application.id}`,
      ].join("\n"),
    });
    return true;
  } catch {
    // No error details in the logs: SMTP errors can echo message content.
    console.error("[applications] notification mail could not be sent");
    return false;
  }
}
