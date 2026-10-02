// Linkhub profiles can be reached under <subdomain>.swibble.net. The DNS
// record and the domain in the Vercel project are set up by hand per
// subdomain; next.config.js rewrites "/" on such a host to /linkhub/<subdomain>.

export const LINKHUB_ROOT_DOMAIN = "swibble.net";

/** Hosts that belong to the site or other services and never to a profile. */
const RESERVED_SUBDOMAINS = ["www", "assets", "admin", "api", "mail", "app"];

const SUBDOMAIN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SUBDOMAIN_MAX_LENGTH = 40;

export type SubdomainResult =
  | { ok: true; subdomain: string }
  | { ok: false; message: string };

/**
 * Validates the subdomain field of the CMS. "" clears it. A pasted full host
 * ("aquisplaza.swibble.net") is reduced to its first label.
 */
export function parseSubdomain(value: unknown): SubdomainResult {
  if (value === undefined || value === null) return { ok: true, subdomain: "" };
  if (typeof value !== "string") {
    return { ok: false, message: "Ungültige Subdomain." };
  }

  let subdomain = value.trim().toLowerCase();
  const suffix = `.${LINKHUB_ROOT_DOMAIN}`;
  if (subdomain.endsWith(suffix)) subdomain = subdomain.slice(0, -suffix.length);
  if (!subdomain) return { ok: true, subdomain: "" };

  if (
    subdomain.length > SUBDOMAIN_MAX_LENGTH ||
    !SUBDOMAIN_PATTERN.test(subdomain)
  ) {
    return {
      ok: false,
      message:
        "Die Subdomain darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten.",
    };
  }
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return { ok: false, message: `„${subdomain}“ ist als Subdomain reserviert.` };
  }
  return { ok: true, subdomain };
}
