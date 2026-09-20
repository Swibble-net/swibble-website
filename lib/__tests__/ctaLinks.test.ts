import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CtaLink from "@/components/CtaLink";
import { CTA_URL } from "@/lib/cta";

const ROOT = join(__dirname, "..", "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("CtaLink", () => {
  it("always opens the booking page in a new tab and says so to screen readers", () => {
    const html = renderToStaticMarkup(
      createElement(CtaLink, { className: "button" }, "Kostenloses Erstgespräch"),
    );
    expect(html).toContain(`href="${CTA_URL}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('class="button"');
    expect(html).toContain("Kostenloses Erstgespräch");
    expect(html).toContain("(öffnet in neuem Tab)");
  });

  it("cannot be pointed elsewhere or back into the same tab", () => {
    // Callers without type checking (or a careless cast) must not be able to override the link.
    const props = {
      href: "https://evil.example",
      target: "_self",
      rel: "opener",
    } as unknown as { className?: string };
    const html = renderToStaticMarkup(createElement(CtaLink, props, "x"));
    expect(html).toContain(`href="${CTA_URL}"`);
    expect(html).toContain('target="_blank"');
    expect(html).not.toContain("evil.example");
    expect(html).not.toContain("_self");
  });
});

describe("links to the booking page", () => {
  it("only ever go through CtaLink (so every one opens in a new tab)", () => {
    const offenders = ["components", "pages"]
      .flatMap((dir) => sourceFiles(join(ROOT, dir)))
      .filter((path) => !path.endsWith(join("components", "CtaLink.tsx")))
      .filter((path) => {
        const source = readFileSync(path, "utf8");
        return /\bCTA_URL\b/.test(source) || source.includes("meet.swibble.net");
      })
      .map((path) => relative(ROOT, path));

    expect(offenders).toEqual([]);
  });
});
