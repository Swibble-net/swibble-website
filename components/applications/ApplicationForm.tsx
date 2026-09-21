import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import TurnstileWidget from "@/components/TurnstileWidget";
import {
  ABOUT_MAX_LENGTH,
  ADULT_AGE,
  APPLICATION_ROLES,
  CONTACT_CONSENT_TEXT,
  GUARDIAN_CONFIRM_TEXT,
  GUARDIAN_DECLARATION_CLAUSES,
  GUARDIAN_DECLARATION_INTRO,
  GUARDIAN_ONLINE_ACCEPT_TEXT,
  MEDIA_CONSENT_TEXT,
  PHOTO_MAX_COUNT,
  guardianDeclarationText,
  roleLabel,
  type GuardianMethod,
} from "@/lib/applications/config";
import { calculateAge, parseIsoDate, todayInBerlin } from "@/lib/applications/age";
import {
  CONSENT_FILE_ACCEPT,
  ConsentFileError,
  PHOTO_ACCEPT,
  prepareConsentFile,
  preparePhoto,
  type PreparedFile,
} from "@/lib/applications/clientFile";
import { renderDeclarationDocument } from "@/lib/applications/declarationImage";
import SignaturePad from "@/components/applications/SignaturePad";
import { adoptEarlyInput } from "@/lib/applications/earlyInput";
import { validateApplication } from "@/lib/applications/validation";
import type { ApplicationErrors } from "@/lib/applications/types";
import type { CenterOption } from "@/lib/applications/store";

interface Props {
  /** Center the visitor came from (validated server-side), if any */
  center: CenterOption | null;
  centers: CenterOption[];
  /** False when the private file storage isn't configured */
  uploadsAvailable: boolean;
  /** Called with the slug of the center the application was sent for ("" = none) */
  onSuccess: (centerSlug: string) => void;
}

const inputClass =
  "w-full rounded-xl border border-[#E4D3EC] bg-white px-4 py-3 text-base text-[#000D36] placeholder:text-[#a99fb0] focus:border-[#B718EC] focus:outline-none focus:ring-2 focus:ring-[#B718EC]/30 aria-[invalid=true]:border-red-500";
const labelClass = "mb-1.5 block text-sm font-medium text-[#000D36]";

// Where to move focus for each error key, in visual order.
const ERROR_TARGETS: Array<[string, string]> = [
  ["roles", "f-role-video"],
  ["firstName", "f-firstName"],
  ["lastName", "f-lastName"],
  ["birthDate", "f-birthDay"],
  ["postalCode", "f-postalCode"],
  ["city", "f-city"],
  ["email", "f-email"],
  ["phone", "f-phone"],
  ["tiktok", "f-tiktok"],
  ["instagram", "f-instagram"],
  ["snapchat", "f-snapchat"],
  ["youtube", "f-youtube"],
  ["about", "f-about"],
  ["center", "f-center"],
  ["guardianName", "f-guardianName"],
  ["guardianContact", "f-guardianPhone"],
  ["guardianPhone", "f-guardianPhone"],
  ["guardianEmail", "f-guardianEmail"],
  ["guardianAddress", "f-guardianAddress"],
  ["consentFile", "f-consentFile"],
  ["guardianConfirmed", "f-guardianConfirmed"],
  ["signature", "f-signature"],
  ["photos", "f-photos"],
  ["mediaConsent", "f-mediaConsent"],
  ["contactConsent", "f-contactConsent"],
  ["privacyAck", "f-privacyAck"],
  ["turnstile", "f-turnstile"],
];

const subscribeNever = () => () => {};

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <p id={id} className="mt-1.5 text-sm text-red-600">
      {message}
    </p>
  ) : null;

const Section = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) => (
  <section className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
    <h2 className="text-lg font-bold text-[#000D36]">{title}</h2>
    {hint && <p className="mt-1 text-sm text-[#556987]">{hint}</p>}
    <div className="mt-4 flex flex-col gap-4">{children}</div>
  </section>
);

const ApplicationForm = ({
  center,
  centers,
  uploadsAvailable,
  onSuccess,
}: Props) => {
  const formId = useId();
  const turnstileRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

  const [roles, setRoles] = useState<string[]>([]);
  const [fields, setFields] = useState({
    firstName: "",
    lastName: "",
    birthDay: "",
    birthMonth: "",
    birthYear: "",
    postalCode: "",
    city: "",
    email: "",
    phone: "",
    tiktok: "",
    instagram: "",
    snapchat: "",
    youtube: "",
    about: "",
    center: center?.slug ?? "",
    guardianName: "",
    guardianPhone: "",
    guardianEmail: "",
    guardianAddress: "",
    website: "", // honeypot
  });
  const [contactConsent, setContactConsent] = useState(false);
  const [privacyAck, setPrivacyAck] = useState(false);
  const [guardianConfirmed, setGuardianConfirmed] = useState(false);
  const [mediaConsent, setMediaConsent] = useState(false);
  // Parents sign online by default; a photo of the paper form is the fallback.
  const [guardianMethod, setGuardianMethod] =
    useState<GuardianMethod>("signature");
  const [signature, setSignature] = useState<string | null>(null);
  const [photos, setPhotos] = useState<
    Array<PreparedFile & { previewUrl: string }>
  >([]);
  const [photoBusy, setPhotoBusy] = useState(false);

  const [file, setFile] = useState<PreparedFile | null>(null);
  const [fileBusy, setFileBusy] = useState(false);

  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  const [errors, setErrors] = useState<ApplicationErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // False in the server HTML, true once React runs in the browser. Until then
  // the submit button stays disabled so nobody can trigger a native submit.
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  // On slow connections people start typing (or the browser autofills) before
  // React has taken over. Adopt those values instead of showing filled fields
  // that the form state knows nothing about.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const valueOf = (id: string) =>
        (document.getElementById(id) as HTMLInputElement | null)?.value ?? "";
      const isChecked = (id: string) =>
        (document.getElementById(id) as HTMLInputElement | null)?.checked ??
        false;

      setFields((prev) => adoptEarlyInput(prev, (key) => valueOf(`f-${key}`)));
      setRoles((prev) =>
        prev.length > 0
          ? prev
          : APPLICATION_ROLES.map((r) => r.id).filter((id) =>
              isChecked(`f-role-${id}`),
            ),
      );
      if (isChecked("f-contactConsent")) setContactConsent(true);
      if (isChecked("f-privacyAck")) setPrivacyAck(true);
      if (isChecked("f-mediaConsent")) setMediaConsent(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  /* ── derived ──────────────────────────────────────────────────────── */

  const birthDate = useMemo(() => {
    const { birthDay, birthMonth, birthYear } = fields;
    if (!birthDay || !birthMonth || birthYear.length !== 4) return "";
    return `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;
  }, [fields]);

  const age = useMemo(() => {
    const parsed = parseIsoDate(birthDate);
    return parsed ? calculateAge(parsed, todayInBerlin()) : null;
  }, [birthDate]);

  const isMinor = age !== null && age >= 0 && age < ADULT_AGE;
  const uploadBlocked = isMinor && !uploadsAvailable;

  /* ── helpers ──────────────────────────────────────────────────────── */

  const clearError = useCallback((...keys: string[]) => {
    setErrors((prev) => {
      if (!keys.some((key) => key in prev)) return prev;
      const next = { ...prev };
      keys.forEach((key) => delete next[key]);
      return next;
    });
  }, []);

  const setField =
    (name: keyof typeof fields, ...alsoClear: string[]) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFields((prev) => ({ ...prev, [name]: e.target.value }));
      clearError(name, ...alsoClear);
    };

  const setDatePart =
    (name: "birthDay" | "birthMonth" | "birthYear", maxLength: number) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, "").slice(0, maxLength);
      setFields((prev) => ({ ...prev, [name]: value }));
      clearError("birthDate");
      // Jump ahead once a two-digit day/month is complete.
      if (value.length === 2 && name === "birthDay") monthRef.current?.focus();
      if (value.length === 2 && name === "birthMonth") yearRef.current?.focus();
    };

  const toggleRole = (id: string) => {
    setRoles((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
    clearError("roles");
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    clearError("consentFile");
    setFile(null);
    if (!chosen) return;

    setFileBusy(true);
    try {
      setFile(await prepareConsentFile(chosen));
    } catch (err) {
      e.target.value = "";
      setErrors((prev) => ({
        ...prev,
        consentFile:
          err instanceof ConsentFileError
            ? err.message
            : "Die Datei konnte nicht gelesen werden.",
      }));
    } finally {
      setFileBusy(false);
    }
  };

  const handlePhotos = async (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = [...(e.target.files ?? [])];
    e.target.value = "";
    clearError("photos");
    if (chosen.length === 0) return;

    const free = PHOTO_MAX_COUNT - photos.length;
    if (chosen.length > free) {
      setErrors((prev) => ({
        ...prev,
        photos: `Du kannst höchstens ${PHOTO_MAX_COUNT} Fotos hochladen.`,
      }));
    }

    setPhotoBusy(true);
    try {
      for (const file of chosen.slice(0, Math.max(0, free))) {
        const prepared = await preparePhoto(file);
        setPhotos((prev) => [...prev, prepared]);
      }
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        photos:
          err instanceof ConsentFileError
            ? err.message
            : "Das Foto konnte nicht gelesen werden.",
      }));
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    clearError("photos");
  };

  const resetTurnstile = () => {
    setTurnstileToken("");
    setTurnstileKey((key) => key + 1);
  };

  const focusFirstError = (found: ApplicationErrors) => {
    const target = ERROR_TARGETS.find(([key]) => key in found)?.[1];
    if (!target) return;
    const el = document.getElementById(target);
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    el.focus({ preventScroll: true });
  };

  /* ── submit ───────────────────────────────────────────────────────── */

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting || fileBusy || photoBusy) return;
    // Read now: the event's currentTarget is gone after the first await.
    const pageFont = getComputedStyle(e.currentTarget).fontFamily;
    setFormError("");

    const payload = {
      roles,
      firstName: fields.firstName,
      lastName: fields.lastName,
      birthDate,
      postalCode: fields.postalCode,
      city: fields.city,
      email: fields.email,
      phone: fields.phone,
      tiktok: fields.tiktok,
      instagram: fields.instagram,
      snapchat: fields.snapchat,
      youtube: fields.youtube,
      about: fields.about,
      center: fields.center,
      contactConsent,
      privacyAck,
      mediaConsent,
      guardian: isMinor
        ? {
            name: fields.guardianName,
            phone: fields.guardianPhone,
            email: fields.guardianEmail,
            address: fields.guardianAddress,
            method: guardianMethod,
            confirmed: guardianConfirmed,
          }
        : undefined,
    };

    // Same rules as the server, so messages are identical on both sides.
    const result = validateApplication(payload);
    const found: ApplicationErrors = result.ok ? {} : { ...result.errors };
    if (isMinor && !uploadBlocked) {
      if (guardianMethod === "upload" && !file) {
        found.consentFile = "Bitte lade die Einverständniserklärung hoch.";
      }
      if (guardianMethod === "signature" && !signature) {
        found.signature = "Bitte hier unterschreiben.";
      }
    }
    if (turnstileRequired && !turnstileToken) {
      found.turnstile = "Bitte warte kurz, bis die Spam-Prüfung abgeschlossen ist.";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError("Bitte prüfe die markierten Felder.");
      focusFirstError(found);
      return;
    }

    setSubmitting(true);
    try {
      // Signed online: turn declaration + signature into one document, which
      // takes the place of the uploaded paper form.
      let consentData = file?.data;
      if (isMinor && guardianMethod === "signature" && signature) {
        const pad = (n: string) => n.padStart(2, "0");
        const document = await renderDeclarationDocument({
          childName: `${fields.firstName} ${fields.lastName}`.trim(),
          birthDate: `${pad(fields.birthDay)}.${pad(fields.birthMonth)}.${fields.birthYear}`,
          guardianName: fields.guardianName.trim(),
          guardianContact: [fields.guardianPhone, fields.guardianEmail]
            .map((v) => v.trim())
            .filter(Boolean)
            .join(" · "),
          guardianAddress: fields.guardianAddress.trim(),
          declarationText: guardianDeclarationText(roles),
          signatureDataUrl: signature,
          signedAt: new Date(),
          fontFamily: pageFont,
        });
        consentData = document.data;
      }

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          consentFile: isMinor && consentData ? { data: consentData } : undefined,
          photos: photos.map((photo) => ({ data: photo.data })),
          turnstileToken,
          website: fields.website,
        }),
      });

      if (res.ok) {
        onSuccess(fields.center);
        return;
      }

      let data: { message?: string; errors?: ApplicationErrors } = {};
      try {
        data = await res.json();
      } catch {
        // e.g. a plain-text 413 from the platform
      }

      if (data.errors) {
        setErrors(data.errors);
        focusFirstError(data.errors);
      }
      setFormError(
        data.message ||
          (res.status === 413
            ? "Die Datei ist zu groß. Bitte lade ein kleineres Foto oder PDF hoch."
            : "Das hat leider nicht geklappt. Bitte versuch es noch einmal."),
      );
      // Turnstile tokens are single-use — get a fresh one for the next try.
      resetTurnstile();
    } catch {
      setFormError(
        "Keine Verbindung. Deine Eingaben sind noch da – bitte prüf dein Netz und versuch es noch einmal.",
      );
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  };

  /* ── render helpers ───────────────────────────────────────────────── */

  const errorProps = (key: string, ...more: string[]) => {
    const keys = [key, ...more].filter((k) => errors[k]);
    return {
      "aria-invalid": keys.length > 0 ? (true as const) : undefined,
      "aria-describedby":
        keys.map((k) => `${formId}-${k}-error`).join(" ") || undefined,
    };
  };

  const errorFor = (key: string) => (
    <FieldError id={`${formId}-${key}-error`} message={errors[key]} />
  );

  const handleInput = (
    name: "tiktok" | "instagram" | "snapchat" | "youtube",
    label: string,
  ) => (
    <div>
      <label className={labelClass} htmlFor={`f-${name}`}>
        {label}
        <span className="font-normal text-[#8a7791]"> (optional)</span>
      </label>
      <div className="relative">
        <span
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-[#8a7791]"
          aria-hidden
        >
          @
        </span>
        <input
          id={`f-${name}`}
          className={`${inputClass} pl-9`}
          value={fields[name]}
          onChange={setField(name)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={120}
          placeholder="deinname"
          {...errorProps(name)}
        />
      </div>
      {errorFor(name)}
    </div>
  );

  /* ── render ───────────────────────────────────────────────────────── */

  return (
    // method="post": if someone submits before hydration, the browser must not
    // fall back to a GET that would put field values into the URL.
    <form
      onSubmit={handleSubmit}
      method="post"
      noValidate
      className="flex flex-col gap-5"
    >
      {/* Roles */}
      <Section title="Wofür bewirbst du dich?" hint="Du kannst mehrere auswählen.">
        <fieldset {...errorProps("roles")}>
          <legend className="sr-only">Wofür bewirbst du dich?</legend>
          <div className="flex flex-col gap-2.5">
            {APPLICATION_ROLES.map((role) => (
              <label
                key={role.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E4D3EC] bg-white px-4 py-3.5 text-base font-medium text-[#000D36] motion-safe:transition has-[:checked]:border-[#B718EC] has-[:checked]:bg-[#F9EAFF] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#B718EC]/40"
              >
                <input
                  id={`f-role-${role.id}`}
                  type="checkbox"
                  className="h-5 w-5 accent-[#B718EC]"
                  checked={roles.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                />
                {role.label}
              </label>
            ))}
          </div>
          {errorFor("roles")}
        </fieldset>
      </Section>

      {/* Person */}
      <Section title="Über dich">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="f-firstName">
              Vorname*
            </label>
            <input
              id="f-firstName"
              className={inputClass}
              value={fields.firstName}
              onChange={setField("firstName")}
              autoComplete="given-name"
              maxLength={60}
              required
              {...errorProps("firstName")}
            />
            {errorFor("firstName")}
          </div>
          <div>
            <label className={labelClass} htmlFor="f-lastName">
              Nachname*
            </label>
            <input
              id="f-lastName"
              className={inputClass}
              value={fields.lastName}
              onChange={setField("lastName")}
              autoComplete="family-name"
              maxLength={60}
              required
              {...errorProps("lastName")}
            />
            {errorFor("lastName")}
          </div>
        </div>

        <fieldset>
          <legend className={labelClass}>Geburtsdatum*</legend>
          <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2.5">
            {(
              [
                ["birthDay", "Tag", "TT", 2, "bday-day", undefined],
                ["birthMonth", "Monat", "MM", 2, "bday-month", monthRef],
                ["birthYear", "Jahr", "JJJJ", 4, "bday-year", yearRef],
              ] as const
            ).map(([name, label, placeholder, length, autoComplete, ref]) => (
              <div key={name}>
                <label
                  className="mb-1 block text-xs text-[#556987]"
                  htmlFor={`f-${name}`}
                >
                  {label}
                </label>
                <input
                  id={`f-${name}`}
                  ref={ref}
                  className={`${inputClass} text-center`}
                  value={fields[name]}
                  onChange={setDatePart(name, length)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  maxLength={length}
                  required
                  {...errorProps("birthDate")}
                />
              </div>
            ))}
          </div>
          {errorFor("birthDate")}
        </fieldset>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2.5">
          <div>
            <label className={labelClass} htmlFor="f-postalCode">
              PLZ*
            </label>
            <input
              id="f-postalCode"
              className={inputClass}
              value={fields.postalCode}
              onChange={setField("postalCode")}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              required
              {...errorProps("postalCode")}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="f-city">
              Wohnort*
            </label>
            <input
              id="f-city"
              className={inputClass}
              value={fields.city}
              onChange={setField("city")}
              autoComplete="address-level2"
              maxLength={80}
              required
              {...errorProps("city")}
            />
          </div>
          <div className="col-span-2 -mt-2.5 empty:hidden">
            {errorFor("postalCode")}
            {errorFor("city")}
          </div>
        </div>
      </Section>

      {/* Contact */}
      <Section title="So erreichen wir dich">
        <div>
          <label className={labelClass} htmlFor="f-email">
            E-Mail*
          </label>
          <input
            id="f-email"
            type="email"
            className={inputClass}
            value={fields.email}
            onChange={setField("email")}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            maxLength={254}
            required
            {...errorProps("email")}
          />
          {errorFor("email")}
        </div>
        <div>
          <label className={labelClass} htmlFor="f-phone">
            Handynummer*
          </label>
          <input
            id="f-phone"
            type="tel"
            className={inputClass}
            value={fields.phone}
            onChange={setField("phone")}
            autoComplete="tel"
            inputMode="tel"
            maxLength={30}
            placeholder="0151 2345678"
            required
            aria-invalid={errors.phone ? true : undefined}
            aria-describedby={`${formId}-phone-hint${errors.phone ? ` ${formId}-phone-error` : ""}`}
          />
          <p id={`${formId}-phone-hint`} className="mt-1.5 text-xs text-[#8a7791]">
            Am besten eine Nummer, unter der du bei WhatsApp erreichbar bist –
            darüber melden wir uns am liebsten.
          </p>
          {errorFor("phone")}
        </div>
      </Section>

      {/* Socials */}
      <Section
        title="Deine Profile"
        hint="Alles freiwillig – hilft uns aber zu sehen, wer du bist."
      >
        {handleInput("tiktok", "TikTok")}
        {handleInput("instagram", "Instagram")}
        {handleInput("snapchat", "Snapchat")}
        {handleInput("youtube", "YouTube")}
      </Section>

      {/* Optional photos */}
      {uploadsAvailable && (
        <Section
          title="Fotos von dir"
          hint={`Freiwillig – bis zu ${PHOTO_MAX_COUNT} Bilder, auf denen man dich gut erkennt. Sie sind nur für das Swibble-Team sichtbar.`}
        >
          {photos.length > 0 && (
            <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
              {photos.map((photo, index) => (
                <li key={photo.previewUrl} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                  <img
                    src={photo.previewUrl}
                    alt={`Ausgewähltes Foto ${index + 1}`}
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    aria-label={`Foto ${index + 1} entfernen`}
                    className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#000D36] text-sm font-bold text-white shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC]"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div>
            <label className={labelClass} htmlFor="f-photos">
              Fotos auswählen
              <span className="font-normal text-[#8a7791]"> (optional)</span>
            </label>
            <input
              id="f-photos"
              type="file"
              multiple
              accept={PHOTO_ACCEPT}
              onChange={handlePhotos}
              disabled={photoBusy || photos.length >= PHOTO_MAX_COUNT}
              className="block w-full cursor-pointer rounded-xl border border-dashed border-[#d8c7e0] bg-white p-3 text-sm text-[#556987] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#B718EC] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-red-500"
              {...errorProps("photos")}
            />
            <p className="mt-1.5 text-xs text-[#8a7791]" aria-live="polite">
              {photoBusy
                ? "Fotos werden verkleinert …"
                : `${photos.length} von ${PHOTO_MAX_COUNT} Fotos ausgewählt. Wir verkleinern sie automatisch.`}
            </p>
            {errorFor("photos")}
          </div>
        </Section>
      )}

      {/* About + center */}
      <Section title="Noch was?">
        <div>
          <label className={labelClass} htmlFor="f-about">
            Erzähl uns kurz was über dich
            <span className="font-normal text-[#8a7791]"> (optional)</span>
          </label>
          <textarea
            id="f-about"
            className={`${inputClass} min-h-28 resize-y`}
            value={fields.about}
            onChange={setField("about")}
            maxLength={ABOUT_MAX_LENGTH}
            aria-describedby={`${formId}-about-count ${errors.about ? `${formId}-about-error` : ""}`.trim()}
            aria-invalid={errors.about ? true : undefined}
          />
          <p
            id={`${formId}-about-count`}
            className="mt-1 text-right text-xs text-[#8a7791]"
          >
            {fields.about.length} / {ABOUT_MAX_LENGTH} Zeichen
          </p>
          {errorFor("about")}
        </div>

        {!center && (
          <div>
            <label className={labelClass} htmlFor="f-center">
              Für welches Center?
              <span className="font-normal text-[#8a7791]"> (optional)</span>
            </label>
            <select
              id="f-center"
              className={inputClass}
              value={fields.center}
              onChange={setField("center")}
              {...errorProps("center")}
            >
              <option value="">Egal / weiß nicht</option>
              {centers.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
            {errorFor("center")}
          </div>
        )}
      </Section>

      {/* Guardian — only for minors */}
      {isMinor && (
        <Section
          title="Einverständnis deiner Eltern"
          hint={`Du bist unter ${ADULT_AGE} – deshalb brauchen wir das Okay einer erziehungsberechtigten Person. Ohne geht es leider nicht.`}
        >
          <div>
            <label className={labelClass} htmlFor="f-guardianName">
              Name deiner Mutter / deines Vaters / Erziehungsberechtigten*
            </label>
            <input
              id="f-guardianName"
              className={inputClass}
              value={fields.guardianName}
              onChange={setField("guardianName")}
              maxLength={120}
              autoComplete="off"
              required
              {...errorProps("guardianName")}
            />
            {errorFor("guardianName")}
          </div>

          <fieldset>
            <legend className={labelClass}>
              Telefonnummer oder E-Mail dieser Person*
            </legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className="sr-only" htmlFor="f-guardianPhone">
                  Telefonnummer der erziehungsberechtigten Person
                </label>
                <input
                  id="f-guardianPhone"
                  type="tel"
                  className={inputClass}
                  value={fields.guardianPhone}
                  onChange={setField("guardianPhone", "guardianContact")}
                  inputMode="tel"
                  autoComplete="off"
                  maxLength={30}
                  placeholder="Telefon"
                  {...errorProps("guardianPhone", "guardianContact")}
                />
                {errorFor("guardianPhone")}
              </div>
              <div>
                <label className="sr-only" htmlFor="f-guardianEmail">
                  E-Mail der erziehungsberechtigten Person
                </label>
                <input
                  id="f-guardianEmail"
                  type="email"
                  className={inputClass}
                  value={fields.guardianEmail}
                  onChange={setField("guardianEmail", "guardianContact")}
                  inputMode="email"
                  autoCapitalize="none"
                  autoComplete="off"
                  maxLength={254}
                  placeholder="E-Mail"
                  {...errorProps("guardianEmail", "guardianContact")}
                />
                {errorFor("guardianEmail")}
              </div>
            </div>
            {errorFor("guardianContact")}
          </fieldset>

          <div>
            <label className={labelClass} htmlFor="f-guardianAddress">
              Anschrift dieser Person
              <span className="font-normal text-[#8a7791]"> (optional)</span>
            </label>
            <input
              id="f-guardianAddress"
              className={inputClass}
              value={fields.guardianAddress}
              onChange={setField("guardianAddress")}
              maxLength={200}
              autoComplete="off"
              placeholder="Straße, Hausnummer, PLZ, Ort"
              {...errorProps("guardianAddress")}
            />
            {errorFor("guardianAddress")}
          </div>

          {uploadBlocked ? (
            <p
              role="alert"
              className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
            >
              Die Einverständniserklärung kann gerade leider nicht gespeichert
              werden, deshalb können wir deine Bewerbung im Moment nicht
              annehmen. Bitte versuch es später noch einmal oder schreib uns an{" "}
              <a href="mailto:info@swibble.net" className="underline">
                info@swibble.net
              </a>
              .
            </p>
          ) : (
            <>
              <fieldset>
                <legend className={labelClass}>
                  Wie geben deine Eltern ihr Einverständnis?*
                </legend>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {(
                    [
                      ["signature", "Jetzt online unterschreiben", "Am schnellsten: Handy kurz an Mama oder Papa geben."],
                      ["upload", "Zettel ausdrucken & Foto hochladen", "Vorlage drucken, unterschreiben lassen, abfotografieren."],
                    ] as const
                  ).map(([value, title, text]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E4D3EC] bg-white p-3.5 text-sm text-[#000D36] has-[:checked]:border-[#B718EC] has-[:checked]:bg-[#F9EAFF] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#B718EC]/40"
                    >
                      <input
                        type="radio"
                        name="guardianMethod"
                        className="mt-0.5 h-5 w-5 shrink-0 accent-[#B718EC]"
                        checked={guardianMethod === value}
                        onChange={() => {
                          setGuardianMethod(value);
                          setGuardianConfirmed(false);
                          clearError("consentFile", "signature", "guardianConfirmed");
                        }}
                      />
                      <span>
                        <span className="block font-semibold">{title}</span>
                        <span className="mt-0.5 block text-xs text-[#556987]">
                          {text}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {guardianMethod === "signature" ? (
                <>
                  <div className="rounded-xl bg-[#F9EAFF] p-4 text-sm text-[#000D36]">
                    <p className="font-semibold">
                      Ab hier bitte die erziehungsberechtigte Person:
                    </p>
                    <div
                      className="mt-2 max-h-72 overflow-y-auto rounded-lg bg-white p-3 text-[13px] leading-relaxed"
                      tabIndex={0}
                      role="region"
                      aria-label="Text der Einverständniserklärung"
                    >
                      <p>
                        {GUARDIAN_DECLARATION_INTRO.replace(
                          "{roles}",
                          roles.length > 0
                            ? roles.map(roleLabel).join(", ")
                            : "die oben gewählten Tätigkeiten",
                        )}
                      </p>
                      <ol className="mt-2 list-decimal space-y-2 pl-5">
                        {GUARDIAN_DECLARATION_CLAUSES.map((clause) => (
                          <li key={clause}>{clause}</li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div>
                    <label className="flex cursor-pointer items-start gap-3 text-sm text-[#000D36]">
                      <input
                        id="f-guardianConfirmed"
                        type="checkbox"
                        className="mt-0.5 h-5 w-5 shrink-0 accent-[#B718EC]"
                        checked={guardianConfirmed}
                        onChange={(e) => {
                          setGuardianConfirmed(e.target.checked);
                          clearError("guardianConfirmed");
                        }}
                        {...errorProps("guardianConfirmed")}
                      />
                      <span>{GUARDIAN_ONLINE_ACCEPT_TEXT}*</span>
                    </label>
                    {errorFor("guardianConfirmed")}
                  </div>

                  <div>
                    <p className={labelClass} id={`${formId}-signature-label`}>
                      Unterschrift der erziehungsberechtigten Person*
                    </p>
                    <SignaturePad
                      id="f-signature"
                      onChange={(dataUrl) => {
                        setSignature(dataUrl);
                        clearError("signature");
                      }}
                      invalid={Boolean(errors.signature)}
                      describedBy={
                        errors.signature ? `${formId}-signature-error` : undefined
                      }
                    />
                    {errorFor("signature")}
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-[#F9EAFF] p-4 text-sm text-[#000D36]">
                    <p className="font-semibold">So geht’s mit dem „Muttizettel“:</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5">
                      <li>
                        <a
                          href="/bewerben/einverstaendnis"
                          target="_blank"
                          rel="noopener"
                          className="font-medium text-[#B718EC] underline"
                        >
                          Vorlage öffnen
                        </a>{" "}
                        und ausdrucken – oder den Text einfach von Hand
                        abschreiben.
                      </li>
                      <li>Von deinen Eltern ausfüllen und unterschreiben lassen.</li>
                      <li>Foto davon machen (gut lesbar) und hier hochladen.</li>
                    </ol>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="f-consentFile">
                      Unterschriebene Einverständniserklärung*
                    </label>
                    <input
                      id="f-consentFile"
                      type="file"
                      accept={CONSENT_FILE_ACCEPT}
                      onChange={handleFile}
                      className="block w-full cursor-pointer rounded-xl border border-dashed border-[#d8c7e0] bg-white p-3 text-sm text-[#556987] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#B718EC] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] aria-[invalid=true]:border-red-500"
                      {...errorProps("consentFile")}
                    />
                    <p className="mt-1.5 text-xs text-[#8a7791]" aria-live="polite">
                      {fileBusy
                        ? "Foto wird verkleinert …"
                        : file
                          ? `✓ ${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`
                          : "PDF oder Foto (JPG, PNG, HEIC). Große Fotos verkleinern wir automatisch."}
                    </p>
                    {errorFor("consentFile")}
                  </div>

                  <div>
                    <label className="flex cursor-pointer items-start gap-3 text-sm text-[#000D36]">
                      <input
                        id="f-guardianConfirmed"
                        type="checkbox"
                        className="mt-0.5 h-5 w-5 shrink-0 accent-[#B718EC]"
                        checked={guardianConfirmed}
                        onChange={(e) => {
                          setGuardianConfirmed(e.target.checked);
                          clearError("guardianConfirmed");
                        }}
                        {...errorProps("guardianConfirmed")}
                      />
                      <span>{GUARDIAN_CONFIRM_TEXT}*</span>
                    </label>
                    {errorFor("guardianConfirmed")}
                  </div>
                </>
              )}
            </>
          )}
        </Section>
      )}

      {/* Consents */}
      <Section title="Fast geschafft">
        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-[#000D36]">
            <input
              id="f-contactConsent"
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#B718EC]"
              checked={contactConsent}
              onChange={(e) => {
                setContactConsent(e.target.checked);
                clearError("contactConsent");
              }}
              {...errorProps("contactConsent")}
            />
            <span>{CONTACT_CONSENT_TEXT}*</span>
          </label>
          {errorFor("contactConsent")}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-[#000D36]">
            <input
              id="f-mediaConsent"
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#B718EC]"
              checked={mediaConsent}
              onChange={(e) => {
                setMediaConsent(e.target.checked);
                clearError("mediaConsent");
              }}
              {...errorProps("mediaConsent")}
            />
            <span>{MEDIA_CONSENT_TEXT}*</span>
          </label>
          {errorFor("mediaConsent")}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-[#000D36]">
            <input
              id="f-privacyAck"
              type="checkbox"
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#B718EC]"
              checked={privacyAck}
              onChange={(e) => {
                setPrivacyAck(e.target.checked);
                clearError("privacyAck");
              }}
              {...errorProps("privacyAck")}
            />
            <span>
              Ich habe die{" "}
              <Link
                href="/datenschutz#bewerbungen"
                target="_blank"
                className="font-medium text-[#B718EC] underline"
              >
                Datenschutzerklärung
              </Link>{" "}
              zur Kenntnis genommen.*
            </span>
          </label>
          {errorFor("privacyAck")}
        </div>

        {/* Honeypot: hidden from people, tempting for bots */}
        <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
          <label htmlFor="f-website">Website (bitte leer lassen)</label>
          <input
            id="f-website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={fields.website}
            onChange={setField("website")}
          />
        </div>

        <div id="f-turnstile" tabIndex={-1} className="focus:outline-none">
          <TurnstileWidget
            key={turnstileKey}
            onVerify={(token) => {
              setTurnstileToken(token);
              clearError("turnstile");
            }}
            onExpire={() => setTurnstileToken("")}
            onError={() => setTurnstileToken("")}
          />
          {errorFor("turnstile")}
        </div>

        {formError && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3.5 text-sm font-medium text-red-700"
          >
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={
            !hydrated || submitting || fileBusy || photoBusy || uploadBlocked
          }
          className="w-full rounded-2xl bg-[#B718EC] px-6 py-4 text-base font-bold text-white shadow-lg shadow-purple-200 motion-safe:transition motion-safe:duration-200 motion-safe:active:scale-[0.98] hover:bg-[#a514d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Wird gesendet …" : "Bewerbung abschicken"}
        </button>
        <p className="text-center text-xs text-[#8a7791]">* Pflichtfeld</p>
      </Section>
    </form>
  );
};

export default ApplicationForm;
