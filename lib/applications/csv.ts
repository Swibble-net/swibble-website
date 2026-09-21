import { roleLabel, statusLabel } from "./config";
import type { Application } from "./types";

/** Escapes one CSV cell; neutralises spreadsheet formulas (=, +, -, @). */
export function csvCell(value: string | number | boolean): string {
  let cell = String(value);
  if (/^[=+\-@\t\r]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replace(/"/g, '""')}"`;
}

const COLUMNS: Array<[string, (a: Application) => string | number | boolean]> = [
  ["Eingegangen", (a) => new Date(a.createdAt).toISOString()],
  ["Status", (a) => statusLabel(a.status)],
  ["Center", (a) => a.centerName || a.center],
  ["Rollen", (a) => a.roles.map(roleLabel).join(", ")],
  ["Vorname", (a) => a.firstName],
  ["Nachname", (a) => a.lastName],
  ["Geburtsdatum", (a) => a.birthDate],
  ["Minderjährig (bei Bewerbung)", (a) => (a.isMinor ? "ja" : "nein")],
  ["PLZ", (a) => a.postalCode],
  ["Ort", (a) => a.city],
  ["E-Mail", (a) => a.email],
  ["Handy", (a) => a.phone],
  ["TikTok", (a) => a.socials.tiktok],
  ["Instagram", (a) => a.socials.instagram],
  ["Snapchat", (a) => a.socials.snapchat],
  ["YouTube", (a) => a.socials.youtube],
  ["Über mich", (a) => a.about],
  ["Erziehungsberechtigte:r", (a) => a.guardian?.name ?? ""],
  ["Eltern Telefon", (a) => a.guardian?.phone ?? ""],
  ["Eltern E-Mail", (a) => a.guardian?.email ?? ""],
  ["Eltern Anschrift", (a) => a.guardian?.address ?? ""],
  [
    "Einverständnis Eltern",
    (a) =>
      !a.guardian ? "" : a.guardian.method === "signature" ? "online unterschrieben" : "Foto/PDF",
  ],
  ["Muttizettel vorhanden", (a) => (a.consentFile ? "ja" : "nein")],
  ["Fotos", (a) => a.photos.length],
  ["Einwilligung Veröffentlichung", (a) => (a.consent.mediaText ? "ja" : "nein")],
  ["Einwilligung erteilt am", (a) => new Date(a.consent.givenAt).toISOString()],
  ["Interne Notiz", (a) => a.note],
];

/** Semicolon-separated with BOM so Excel (German locale) opens it correctly. */
export function applicationsToCsv(applications: Application[]): string {
  const rows = [
    COLUMNS.map(([header]) => csvCell(header)).join(";"),
    ...applications.map((a) =>
      COLUMNS.map(([, read]) => csvCell(read(a))).join(";"),
    ),
  ];
  return `﻿${rows.join("\r\n")}\r\n`;
}
