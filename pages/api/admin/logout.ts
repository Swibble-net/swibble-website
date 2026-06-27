import type { NextApiRequest, NextApiResponse } from "next";
import { clearSessionCookie } from "@/lib/adminAuth";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  clearSessionCookie(res);
  return res.status(200).json({ success: true });
}
