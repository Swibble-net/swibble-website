import type { NextApiRequest, NextApiResponse } from "next";
import { handleOfferInquiry } from "@/lib/offers/inquiryRoute";

/** POST: the customer's choice from a web offer, sent to Swibble by mail. */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  return handleOfferInquiry(req, res, token);
}
