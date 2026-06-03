import nodemailer from "nodemailer";
import { NextApiRequest, NextApiResponse } from "next";

// Setting an async function to send a message via nodemailer
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // setting a body of message
  const message = {
    from: `${req.body.email}`,
    to: process.env.SMTP_USER,
    subject: `Message from ${req.body.email}. ${req.body.number}`,
    text: req.body.message,
  };

  // setting a properties for nodemailer
  const transporter = nodemailer.createTransport({
    host: String(process.env.SMTP_HOST),
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Condition to check content of message

  if (req.method === "POST") {
    if (!req.body.email || !req.body.message) {
      return res.status(400).json({ message: "Bad request!" });
    }
    // defining an async function to send a message
    try {
      await transporter.sendMail(message);
      return res.status(200).json({ success: true });
      //gandling an error
    } catch (error) {
      console.log(error);
      const message =
        error instanceof Error ? error.message : "Failed to send email";
      res.status(400).json({ message });
    }
  }
  // Returning a http status
  return res.status(400).json({ message: "Bad request!" });
}
