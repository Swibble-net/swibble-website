// Lives next to the contact lib: a test file below pages/api would become a route.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import handler from "@/pages/api/send-mail";

const { sendMail } = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail }) },
}));

const call = async (body: unknown, method = "POST") => {
  const res = { statusCode: 0, body: undefined as unknown };
  const api = {
    status(code: number) {
      res.statusCode = code;
      return api;
    },
    json(payload: unknown) {
      res.body = payload;
      return api;
    },
  };
  await handler({ method, body } as NextApiRequest, api as unknown as NextApiResponse);
  return res;
};

describe("/api/send-mail", () => {
  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue({});
  });

  it("only accepts POST", async () => {
    expect((await call({}, "GET")).statusCode).toBe(405);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends a structured mail for a funnel inquiry", async () => {
    const res = await call({
      email: "max@example.com",
      name: "Max\r\nBcc: spam@evil.example",
      services: ["social-media", "design"],
      goals: ["reach", "customers"],
      budget: "unknown",
    });
    expect(res.statusCode).toBe(200);
    // Inquiry to Swibble first, then the confirmation to the visitor.
    expect(sendMail).toHaveBeenCalledTimes(2);

    const mail = sendMail.mock.calls[0][0];
    expect(mail.replyTo).toBe("max@example.com");
    expect(mail.subject).toBe(
      "Neue Anfrage: Social Media, Design – Budget Weiß ich noch nicht – Max Bcc: spam@evil.example",
    );
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.text).toContain("Ziele:      Mehr Reichweite, Mehr Kunden / Besucher");
    // Same look as the confirmation, with the inline logo.
    expect(mail.html).toContain("Neue Anfrage: Social Media, Design");
    expect(mail.html).toContain('href="mailto:max@example.com"');
    expect(mail.attachments[0].cid).toBe("swibble-logo");
  });

  it("confirms the inquiry to the visitor with an HTML mail", async () => {
    const res = await call({ email: "max@example.com", name: "Max Mustermann", services: ["design"], message: "Hallo <b>Team</b>" });
    expect(res.body).toEqual({ success: true, confirmationSent: true });

    const confirmation = sendMail.mock.calls[1][0];
    expect(confirmation.to).toBe("max@example.com");
    expect(confirmation.subject).toBe("Deine Anfrage bei Swibble ist angekommen");
    expect(confirmation.html).toContain("Danke für deine Anfrage, Max!");
    expect(confirmation.html).toContain("Hallo &lt;b&gt;Team&lt;/b&gt;");
    expect(confirmation.text).toContain("Leistungen: Design");
    expect(confirmation.attachments).toHaveLength(1);
    expect(confirmation.attachments[0].cid).toBe("swibble-logo");
  });

  it("still succeeds when only the confirmation fails", async () => {
    sendMail.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("Mailbox unavailable"));
    const res = await call({ email: "max@example.com", services: ["design"] });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, confirmationSent: false });
  });

  it("still accepts the body of the former form, without a confirmation", async () => {
    const res = await call({ email: "max@example.com", message: "Hallo!", number: "0241 123" });
    expect(res.statusCode).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      subject: "Message from max@example.com. 0241 123",
      text: "Hallo!",
    });
    expect(sendMail.mock.calls[0][0].html).toBeUndefined();
  });

  it("answers invalid bodies with 400 and sends nothing", async () => {
    for (const body of [
      {},
      { email: "max@example.com" },
      { email: "max@example.com", services: ["seo"] },
      { email: "not-an-email", services: ["design"] },
      { email: "max@example.com", services: ["design"], budget: "free" },
    ]) {
      expect((await call(body)).statusCode).toBe(400);
    }
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("reports a failing SMTP transport and sends no confirmation", async () => {
    sendMail.mockRejectedValue(new Error("SMTP down"));
    const res = await call({ email: "max@example.com", services: ["design"] });
    expect(res.statusCode).toBe(400);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});

describe("/api/send-mail with TURNSTILE_SECRET_KEY", () => {
  const BODY = { email: "max@example.com", services: ["design"] };
  const siteverify = vi.fn();

  beforeEach(() => {
    sendMail.mockReset();
    sendMail.mockResolvedValue({});
    siteverify.mockReset();
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    vi.stubGlobal("fetch", siteverify);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends mails only for a token Cloudflare accepts", async () => {
    siteverify.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    const res = await call({ ...BODY, turnstileToken: "valid-token" });
    expect(res.statusCode).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(2);

    const [url, init] = siteverify.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(String(init.body)).toBe("secret=test-secret&response=valid-token");
  });

  it("rejects missing, refused and unverifiable tokens", async () => {
    expect((await call(BODY)).statusCode).toBe(400);
    expect(siteverify).not.toHaveBeenCalled();

    siteverify.mockResolvedValue({ ok: true, json: async () => ({ success: false }) });
    expect((await call({ ...BODY, turnstileToken: "used-token" })).statusCode).toBe(400);

    siteverify.mockRejectedValue(new Error("network"));
    expect((await call({ ...BODY, turnstileToken: "any-token" })).statusCode).toBe(400);

    expect(sendMail).not.toHaveBeenCalled();
  });
});
