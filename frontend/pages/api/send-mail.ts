import nodemailer from "nodemailer";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const message = {
    from: `${req.body.email}`,
    to: process.env.SMTP_USER,
    subject: `Message from ${req.body.email}. ${req.body.number}`,
    text: req.body.message,
  };

  const transporter = nodemailer.createTransport({
    host: String(process.env.SMTP_HOST),
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  if (req.method === "POST") {
    if (!req.body.email || !req.body.message) {
      return res.status(400).json({ message: "Bad request!" });
    }
    try {
      await transporter.sendMail(message);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.log(error);
      res.status(400).json({ message: error.message });
    }
  }

  // await new Promise((resolve, reject) => {
  //   transporter.sendMail(message, (err, info) => {
  //     if (err) {
  //       console.error(err);
  //       reject(err);
  //       res.status(400).json({ message: err.message });
  //     } else {
  //       res.status(200).json({ message: "Success!" });
  //       console.log(info);
  //       resolve(info);
  //     }
  //   });
  // });
  return res.status(400).json({ message: "Bad request!" });
}
