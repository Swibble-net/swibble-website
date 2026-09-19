import nodemailer from "nodemailer";
import { NextApiRequest, NextApiResponse } from "next";
import { buildSubject, buildText, parseInquiry } from "@/lib/contact/inquiry";
import {
  buildConfirmationHtml,
  buildConfirmationSubject,
  buildConfirmationText,
} from "@/lib/contact/confirmation";
import { verifyTurnstile } from "@/lib/contact/turnstile";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Types, whitelisted choices and length limits: see lib/contact/inquiry.
  const parsed = parseInquiry(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ message: parsed.error });
  }
  const { inquiry } = parsed;

  // No-op until TURNSTILE_SECRET_KEY is configured.
  if (!(await verifyTurnstile(req.body.turnstileToken))) {
    return res.status(400).json({ message: "Turnstile verification failed" });
  }

  const transporter = nodemailer.createTransport({
    host: String(process.env.SMTP_HOST),
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mail = {
    from: process.env.SMTP_USER,      // your Netcup email, e.g. contact@swibble.net
    replyTo: inquiry.email,            // visitor's email goes here
    to: process.env.SMTP_USER,
    subject: buildSubject(inquiry),    // single line, control characters removed
    text: buildText(inquiry),
  };

  try {
    await transporter.sendMail(mail);
  } catch (error) {
    console.error(error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send email";
    return res.status(400).json({ message: errorMessage });
  }

  // The former form (email, message, number) keeps its behaviour: no confirmation.
  if (inquiry.legacy) {
    return res.status(200).json({ success: true, confirmationSent: false });
  }

  // The inquiry has arrived at this point, so a failing confirmation is not an error.
  let confirmationSent = true;
  try {
    await transporter.sendMail({
      from: { name: "Swibble", address: String(process.env.SMTP_USER) },
      to: inquiry.email,
      replyTo: process.env.SMTP_USER,
      subject: buildConfirmationSubject(),
      text: buildConfirmationText(inquiry),
      html: buildConfirmationHtml(inquiry),
    });
  } catch (error) {
    console.error("[send-mail] confirmation", error);
    confirmationSent = false;
  }

  return res.status(200).json({ success: true, confirmationSent });
}
