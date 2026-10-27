import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { handleOfferInquiry } from "../inquiryRoute";
import { toOffer } from "../store";

const { getOfferByToken, addOfferRequest, getCreator, sendOfferInquiry, isAuthenticated } = vi.hoisted(() => ({
  getOfferByToken: vi.fn(),
  addOfferRequest: vi.fn(),
  getCreator: vi.fn(),
  sendOfferInquiry: vi.fn(),
  isAuthenticated: vi.fn(),
}));
vi.mock("../store", async (original) => ({ ...(await original<object>()), getOfferByToken, addOfferRequest }));
vi.mock("../notify", () => ({ sendOfferInquiry }));
vi.mock("@/lib/creators/store", () => ({ getCreator }));
vi.mock("@/lib/creators/notify", () => ({ isMailConfigured: () => true }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstileToken: async () => true }));
vi.mock("@/lib/adminAuth", () => ({ isAuthenticated }));

const TOKEN = "Ab3_-Ab3_-Ab3_-Ab3_-Ab3_";
const contact = { company: "Muster GmbH", name: "Max Muster", email: "max@example.com", phone: "" };
const offer = toOffer("o1", {
  token: TOKEN,
  customer: "Aquis Plaza",
  active: true,
  items: [
    { creatorId: "cr1", price: "450 €", note: "" },
    { creatorId: "cr2", price: "", note: "" },
  ],
});

let ip = 0;
const call = async (body: Record<string, unknown>) => {
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
    setHeader: () => api,
  };
  // A new address per call: the rate limit allows 5 per address.
  const req = { method: "POST", body, headers: {}, socket: { remoteAddress: `10.1.0.${++ip}` } };
  await handleOfferInquiry(req as unknown as NextApiRequest, api as unknown as NextApiResponse, TOKEN);
  return res;
};

describe("offer inquiries", () => {
  beforeEach(() => {
    getOfferByToken.mockResolvedValue(offer);
    addOfferRequest.mockReset();
    addOfferRequest.mockResolvedValue(undefined);
    sendOfferInquiry.mockReset();
    sendOfferInquiry.mockResolvedValue({ confirmationSent: true });
    getCreator.mockImplementation(async (id: string) => ({ id, name: id === "cr1" ? "Vanessa Lander" : "Karina Test" }));
    isAuthenticated.mockReturnValue(false);
  });

  it("send the picked creators with prices, without a message too", async () => {
    const res = await call({ ...contact, message: "", creatorIds: ["cr2", "cr1"] });
    expect(res.statusCode).toBe(200);
    expect(sendOfferInquiry).toHaveBeenCalledTimes(1);
    expect(sendOfferInquiry.mock.calls[0][2]).toEqual([
      { name: "Vanessa Lander", shownName: "Vanessa", price: "450 €" },
      { name: "Karina Test", shownName: "Karina", price: "" },
    ]);
    expect(addOfferRequest).toHaveBeenCalledWith("o1", ["cr1", "cr2"]);
  });

  it("need at least one creator from the offer", async () => {
    expect((await call({ ...contact, creatorIds: [] })).statusCode).toBe(400);
    expect((await call({ ...contact, creatorIds: ["cr9"] })).statusCode).toBe(400);
    expect(sendOfferInquiry).not.toHaveBeenCalled();
  });

  it("don't reach a switched-off or unknown offer", async () => {
    getOfferByToken.mockResolvedValue({ ...offer, active: false });
    expect((await call({ ...contact, creatorIds: ["cr1"] })).statusCode).toBe(404);
    getOfferByToken.mockResolvedValue(null);
    expect((await call({ ...contact, creatorIds: ["cr1"] })).statusCode).toBe(404);
    expect(sendOfferInquiry).not.toHaveBeenCalled();
  });

  it("still answer when noting the choice fails", async () => {
    addOfferRequest.mockRejectedValue(new Error("db down"));
    expect((await call({ ...contact, creatorIds: ["cr1"] })).statusCode).toBe(200);
  });
});
