import type { Budget, Goal, Service, Timeframe } from "@/lib/contact/funnel";

// Body of /api/send-mail, validated server-side in lib/contact/inquiry.
export interface InquiryPayload {
  email: string;
  number: string;
  message: string;
  name: string;
  company: string;
  location: string;
  services: Service[];
  goals: Goal[];
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

// Plain fetch instead of axios: this runs in the browser, and axios alone added
// ~14 KB of JavaScript to every page load for this one request.
const sendEmail = async (payload: InquiryPayload): Promise<SendMailResponse> => {
  const response = await fetch("/api/send-mail", {
    method: "POST",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`send-mail failed with status ${response.status}`);
  }
  return response.json();
};

export default sendEmail;
