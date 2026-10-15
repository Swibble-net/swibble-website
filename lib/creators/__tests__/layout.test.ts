import { describe, expect, it } from "vitest";
import { checkerboard } from "../layout";

const kinds = (photos: number, videos: number) =>
  checkerboard(
    Array.from({ length: photos }, (_, i) => `p${i}`),
    Array.from({ length: videos }, (_, i) => `v${i}`),
  )
    .map((entry) => entry.item)
    .join(" ");

describe("checkerboard", () => {
  it("alternates photo, video, photo / video, photo, video", () => {
    expect(kinds(3, 3)).toBe("p0 v0 p1 v1 p2 v2");
    expect(kinds(5, 4)).toBe("p0 v0 p1 v1 p2 v2 p3 v3 p4");
  });

  it("continues with the rest when one kind runs out", () => {
    expect(kinds(2, 5)).toBe("p0 v0 p1 v1 v2 v3 v4");
    expect(kinds(4, 1)).toBe("p0 v0 p1 p2 p3");
    expect(kinds(0, 2)).toBe("v0 v1");
  });
});
