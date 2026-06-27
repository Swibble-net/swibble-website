import type { NextApiRequest, NextApiResponse } from "next";
import { isValidPassword, setSessionCookie } from "@/lib/adminAuth";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return res
      .status(500)
      .json({ message: "Admin-Login ist nicht konfiguriert (ADMIN_PASSWORD)." });
  }

  const { password } = req.body ?? {};
  if (typeof password !== "string" || !isValidPassword(password)) {
    return res.status(401).json({ message: "Falsches Passwort." });
  }

  setSessionCookie(res);
  return res.status(200).json({ success: true });
}
