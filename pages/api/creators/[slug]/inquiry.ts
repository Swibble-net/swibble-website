import type { NextApiRequest, NextApiResponse } from "next";
import { handleCreatorInquiry } from "@/lib/creators/inquiryRoute";

/** POST: booking inquiry for one published creator. */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = typeof req.query.slug === "string" ? req.query.slug : "";
  return handleCreatorInquiry(req, res, slug);
}
