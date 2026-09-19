// Lives next to the contact lib: a test file below pages/api would become a route.
import { beforeEach, describe, expect, it, vi } from "vitest";
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
      goal: "reach",
      budget: "unknown",
    });
    expect(res.statusCode).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);

    const mail = sendMail.mock.calls[0][0];
    expect(mail.replyTo).toBe("max@example.com");
    expect(mail.subject).toBe(
      "Neue Anfrage: Social Media, Design – Budget Weiß ich noch nicht – Max Bcc: spam@evil.example",
    );
    expect(mail.subject).not.toMatch(/[\r\n]/);
    expect(mail.text).toContain("Ziel:       Mehr Reichweite");
  });

  it("still accepts the body of the former form", async () => {
    const res = await call({ email: "max@example.com", message: "Hallo!", number: "0241 123" });
    expect(res.statusCode).toBe(200);
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      subject: "Message from max@example.com. 0241 123",
      text: "Hallo!",
    });
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

  it("reports a failing SMTP transport", async () => {
    sendMail.mockRejectedValue(new Error("SMTP down"));
    const res = await call({ email: "max@example.com", services: ["design"] });
    expect(res.statusCode).toBe(400);
  });
});
