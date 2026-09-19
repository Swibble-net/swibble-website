import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../rateLimit";

describe("createRateLimiter", () => {
  it("blocks after the limit and recovers once the window has passed", () => {
    const limiter = createRateLimiter(3, 1000);
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("a", 100)).toBe(true);
    expect(limiter.allow("a", 200)).toBe(true);
    expect(limiter.allow("a", 300)).toBe(false);
    // Blocked attempts don't extend the window.
    expect(limiter.allow("a", 1001)).toBe(true);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter(1, 1000);
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("b", 0)).toBe(true);
    expect(limiter.allow("a", 1)).toBe(false);
  });
});
