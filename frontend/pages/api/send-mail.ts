import nodemailer from "nodemailer";
import { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
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

  // verify connection configuration
  transporter.verify(function (error, success) {
    if (error) {
      console.log(error);
    } else {
      console.log("Server is ready to take our messages");
    }
  });

  // send mail
  transporter.sendMail(message, (err, info) => {
    if (err) {
      console.error(err);
    } else {
      console.log(info);
    }
  });

  res.status(200);
}
