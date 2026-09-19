import axios from "axios";
import type { Budget, Goal, Service, Timeframe } from "@/lib/contact/funnel";

// Body of /api/send-mail, validated server-side in lib/contact/inquiry.
export interface InquiryPayload {
  email: string;
  number: string;
  message: string;
  name: string;
  company: string;
  services: Service[];
  goal: Goal | "";
  budget: Budget | "";
  timeframe: Timeframe | "";
  /** Checked server-side once TURNSTILE_SECRET_KEY is configured. */
  turnstileToken: string;
}

export interface SendMailResponse {
  success: boolean;
  /** False when the inquiry arrived but the confirmation mail could not be sent. */
  confirmationSent?: boolean;
}

const sendEmail = async (payload: InquiryPayload) => {
  return axios<SendMailResponse>({
    method: "post",
    url: "/api/send-mail",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
    },
    data: payload,
  });
};

export default sendEmail;
