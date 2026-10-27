import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";
import { handleCreatorInquiry } from "../inquiryRoute";
import { toCreator } from "../store";
import type { CreatorProfile } from "../types";

const { getCreatorBySlug, sendCreatorInquiry, isAuthenticated } = vi.hoisted(() => ({
  getCreatorBySlug: vi.fn(),
  sendCreatorInquiry: vi.fn(),
  isAuthenticated: vi.fn(),
}));
vi.mock("../store", async (original) => ({ ...(await original<object>()), getCreatorBySlug }));
vi.mock("../notify", () => ({ isMailConfigured: () => true, sendCreatorInquiry }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstileToken: async () => true }));
vi.mock("@/lib/adminAuth", () => ({ isAuthenticated }));

const TOKEN = "Ab3_-Ab3_-Ab3_-Ab3_-Ab3_";
const inquiry = {
  company: "Muster GmbH",
  name: "Max Muster",
  email: "max@example.com",
  phone: "0151 1111111",
  message: "Shooting im Mai in Köln.",
};

let ip = 0;
const call = async (creator: CreatorProfile, body: Record<string, unknown>) => {
  getCreatorBySlug.mockResolvedValue(creator);
  const res = { statusCode: 0 };
  const api = {
    status(code: number) {
      res.statusCode = code;
      return api;
    },
    json: () => api,
    setHeader: () => api,
  };
  // A new address per call: the rate limit allows 5 per address.
  const req = { method: "POST", body, headers: {}, socket: { remoteAddress: `10.0.0.${++ip}` } };
  await handleCreatorInquiry(req as unknown as NextApiRequest, api as unknown as NextApiResponse, creator.slug);
  return res.statusCode;
};

describe("creator inquiries", () => {
  const draft = toCreator("cr1", { slug: "vanessa-x", published: false, previewToken: TOKEN, name: "Vanessa" });

  beforeEach(() => {
    sendCreatorInquiry.mockReset();
    sendCreatorInquiry.mockResolvedValue({ confirmationSent: true });
    isAuthenticated.mockReturnValue(false);
  });

  it("reach published creators", async () => {
    expect(await call({ ...draft, published: true, previewToken: "" }, inquiry)).toBe(200);
    expect(sendCreatorInquiry).toHaveBeenCalledTimes(1);
  });

  it("reach a draft through its preview link", async () => {
    expect(await call(draft, { ...inquiry, previewToken: TOKEN })).toBe(200);
    expect(sendCreatorInquiry).toHaveBeenCalledTimes(1);
  });

  it("don't reach a draft without the right link", async () => {
    expect(await call(draft, inquiry)).toBe(404);
    expect(await call(draft, { ...inquiry, previewToken: "Xb3_-Ab3_-Ab3_-Ab3_-Ab3_" })).toBe(404);
    expect(await call({ ...draft, previewToken: "" }, { ...inquiry, previewToken: TOKEN })).toBe(404);
    expect(sendCreatorInquiry).not.toHaveBeenCalled();
  });

  it("reach a draft when the admin tries it", async () => {
    isAuthenticated.mockReturnValue(true);
    expect(await call(draft, inquiry)).toBe(200);
  });
});
