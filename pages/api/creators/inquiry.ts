import type { NextApiRequest, NextApiResponse } from "next";
import { handleCreatorInquiry } from "@/lib/creators/inquiryRoute";

/** POST: general creator request from /creator (no specific person). */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return handleCreatorInquiry(req, res, null);
}
