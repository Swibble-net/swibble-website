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
}

const sendEmail = async (payload: InquiryPayload) => {
  return axios({
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
