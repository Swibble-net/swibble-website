import type { AnchorHTMLAttributes } from "react";
import { CTA_URL } from "@/lib/cta";

type CtaLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "target" | "rel"
>;

/**
 * The one way to link to the booking page (meet.swibble.net). It always opens in
 * a new tab, so visitors keep the website open while they pick a slot, and tells
 * screen readers so. Guarded by lib/__tests__/ctaLinks.test.ts.
 */
const CtaLink = ({ children, ...props }: CtaLinkProps) => (
  <a {...props} href={CTA_URL} target="_blank" rel="noopener noreferrer">
    {children}
    <span className="sr-only"> (öffnet in neuem Tab)</span>
  </a>
);

export default CtaLink;
