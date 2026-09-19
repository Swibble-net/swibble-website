import nodemailer from "nodemailer";
import { NextApiRequest, NextApiResponse } from "next";
import { buildSubject, buildText, parseInquiry } from "@/lib/contact/inquiry";

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
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to send email";
    return res.status(400).json({ message: errorMessage });
  }
}
