import Link from "next/link";
import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FormEvent,
} from "react";
import TurnstileWidget from "@/components/TurnstileWidget";
import SignaturePad from "@/components/applications/SignaturePad";
import { StepCard, useStepFlow } from "@/components/applications/StepFlow";
import {
  BirthDateFields,
  CheckboxField,
  HandleField,
  PhoneField,
  PhotoPicker,
  fieldErrors,
  fileInputClass,
  inputClass,
  labelClass,
  optionalMark,
  usePhotos,
} from "@/components/applications/formParts";
import {
  ABOUT_MAX_LENGTH,
  CREATOR_MIN_AGE,
  CREATOR_PHOTO_MIN_COUNT,
  CREATOR_RELEASE_ACCEPT_TEXT,
  CREATOR_RELEASE_CLAUSES,
  CREATOR_RELEASE_INTRO,
  CREATOR_ROLES,
  PHOTO_MAX_COUNT,
  PORTFOLIO_URL_MAX_LENGTH,
  RELEASE_FILE_MAX_BYTES,
  creatorReleaseText,
  roleLabel,
  type CreatorRole,
} from "@/lib/applications/config";
import { calculateAge, parseIsoDate, todayInBerlin } from "@/lib/applications/age";
import {
  ConsentFileError,
  SETCARD_ACCEPT,
  prepareSetcard,
  type PreparedFile,
} from "@/lib/applications/clientFile";
import { renderSignedDocument } from "@/lib/applications/declarationImage";
import { DEFAULT_PHONE_COUNTRY, combinePhone } from "@/lib/applications/phone";
import { errorsForStep, firstStepWithErrors } from "@/lib/applications/steps";
import { validateCreatorApplication } from "@/lib/applications/validation";
import type { ApplicationErrors } from "@/lib/applications/types";

interface Props {
  onSuccess: () => void;
}

const STEPS = [
  {
    id: "roles",
    title: "Was machst du?",
    hint: "Du kannst mehrere auswählen.",
    fields: ["roles"],
  },
  {
    id: "person",
    title: "Über dich",
    hint: "Damit wir wissen, wer du bist und wo du wohnst.",
    fields: ["firstName", "lastName", "birthDate", "postalCode", "city"],
  },
  {
    id: "contact",
    title: "So erreichen wir dich",
    hint: "Wir melden uns, wenn ein Auftrag zu dir passt.",
    fields: ["phone", "email"],
  },
  {
    id: "channels",
    title: "Deine Social-Media-Kanäle",
    hint: "Name oder Link zum Profil – beides klappt.",
    fields: ["instagram", "tiktok", "youtube", "snapchat", "socials"],
  },
  {
    id: "photos",
    title: "Fotos von dir",
    hint: "Direkt aus deiner Fotos-App. Am besten ein Porträt, ein Ganzkörperfoto und eins, das zeigt, was du machst – aktuell und ohne starke Filter.",
    fields: ["photos"],
  },
  {
    id: "portfolio",
    title: "Setcard & Portfolio",
    hint: "Alles freiwillig – hilft uns aber, dich Kunden vorzustellen.",
    fields: ["setcard", "portfolioUrl", "about"],
  },
  {
    id: "release",
    title: "Deine Freigabe",
    hint: "Damit wir dich unseren Kunden als Swibble Creator vorstellen und mit dir werben dürfen.",
    fields: ["releaseAccepted", "signature", "privacyAck", "turnstile"],
  },
] as const;

type StepId = (typeof STEPS)[number]["id"];
const STEP_IDS = STEPS.map((step) => step.id);

/** Element to focus for an error key. */
const focusIdFor = (key: string) =>
  key === "birthDate" ? "f-birthDay" : key === "socials" ? "f-instagram" : `f-${key}`;

const subscribeNever = () => () => {};

const CreatorApplicationForm = ({ onSuccess }: Props) => {
  const formId = useId();
  const turnstileRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const flow = useStepFlow<StepId>(STEP_IDS, "creatorApplicationStep");
  const step = STEPS[flow.index];

  const [roles, setRoles] = useState<CreatorRole[]>([]);
  const [fields, setFields] = useState({
    firstName: "",
    lastName: "",
    birthDay: "",
    birthMonth: "",
    birthYear: "",
    postalCode: "",
    city: "",
    phone: "",
    email: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    snapchat: "",
    portfolioUrl: "",
    about: "",
    website: "", // honeypot
  });
  const [setcard, setSetcard] = useState<
    (PreparedFile & { kind: "pdf" | "image"; compressed: boolean }) | null
  >(null);
  const [setcardBusy, setSetcardBusy] = useState(false);
  const [phoneCode, setPhoneCode] = useState(DEFAULT_PHONE_COUNTRY);
  const [releaseAccepted, setReleaseAccepted] = useState(false);
  const [privacyAck, setPrivacyAck] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  const [errors, setErrors] = useState<ApplicationErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const clearError = useCallback((...keys: string[]) => {
    setErrors((prev) => {
      if (!keys.some((key) => key in prev)) return prev;
      const next = { ...prev };
      keys.forEach((key) => delete next[key]);
      return next;
    });
  }, []);

  const photoList = usePhotos(PHOTO_MAX_COUNT, (message) =>
    message
      ? setErrors((prev) => ({ ...prev, photos: message }))
      : clearError("photos"),
  );

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

  const fullName = `${fields.firstName.trim()} ${fields.lastName.trim()}`.trim();

  const payload = {
    pool: "creator",
    roles,
    firstName: fields.firstName,
    lastName: fields.lastName,
    birthDate,
    postalCode: fields.postalCode,
    city: fields.city,
    email: fields.email,
    phone: combinePhone(phoneCode, fields.phone),
    instagram: fields.instagram,
    tiktok: fields.tiktok,
    youtube: fields.youtube,
    snapchat: fields.snapchat,
    portfolioUrl: fields.portfolioUrl,
    about: fields.about,
    releaseAccepted,
    privacyAck,
  };

  /* ── helpers ──────────────────────────────────────────────────────── */

  const setField =
    (name: keyof typeof fields, ...alsoClear: string[]) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFields((prev) => ({ ...prev, [name]: e.target.value }));
      clearError(name, ...alsoClear);
    };

  const setDatePart =
    (name: "birthDay" | "birthMonth" | "birthYear", maxLength: number) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, "").slice(0, maxLength);
      setFields((prev) => ({ ...prev, [name]: value }));
      clearError("birthDate");
      if (value.length === 2 && name === "birthDay") monthRef.current?.focus();
      if (value.length === 2 && name === "birthMonth") yearRef.current?.focus();
    };

  const toggleRole = (id: CreatorRole) => {
    setRoles((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
    clearError("roles", "socials");
  };

  const handleSetcard = async (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0];
    e.target.value = "";
    clearError("setcard");
    if (!chosen) return;
    setSetcardBusy(true);
    try {
      setSetcard(await prepareSetcard(chosen));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        setcard:
          err instanceof ConsentFileError
            ? err.message
            : "Die Datei konnte nicht gelesen werden.",
      }));
    } finally {
      setSetcardBusy(false);
    }
  };

  const resetTurnstile = () => {
    setTurnstileToken("");
    setTurnstileKey((key) => key + 1);
  };

  /** All messages for the current input, with the server's rules. */
  const collectErrors = (): ApplicationErrors => {
    const result = validateCreatorApplication(payload, new Date());
    const found: ApplicationErrors = result.ok ? {} : { ...result.errors };
    if (photoList.photos.length < CREATOR_PHOTO_MIN_COUNT) {
      found.photos = "Bitte lade mindestens ein Foto von dir hoch.";
    }
    if (!signature) found.signature = "Bitte hier unterschreiben.";
    if (turnstileRequired && !turnstileToken) {
      found.turnstile = "Bitte warte kurz, bis die Spam-Prüfung abgeschlossen ist.";
    }
    return found;
  };

  const firstField = (found: ApplicationErrors, stepId: StepId) => {
    const keys = STEPS.find((s) => s.id === stepId)?.fields ?? [];
    const key = keys.find((k) => found[k]);
    return key ? focusIdFor(key) : undefined;
  };

  /** Shows the messages of `found` on the first step that has one. */
  const showErrors = (found: ApplicationErrors) => {
    const target = firstStepWithErrors(STEPS, found) ?? flow.current;
    setErrors(found);
    flow.goTo(target, firstField(found, target));
  };

  const handleBack = () => {
    setFormError("");
    // The widget is unmounted with the last step; its token can't be reused.
    if (flow.isLast) setTurnstileToken("");
    flow.back();
  };

  /* ── submit ───────────────────────────────────────────────────────── */

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting || photoList.busy || setcardBusy) return;
    // Read now: the event's currentTarget is gone after the first await.
    const pageFont = getComputedStyle(e.currentTarget).fontFamily;
    setFormError("");

    const found = collectErrors();
    if (!flow.isLast) {
      const own = errorsForStep(step, found);
      if (Object.keys(own).length > 0) {
        setErrors(own);
        flow.goTo(flow.current, firstField(own, flow.current));
        return;
      }
      setErrors({});
      flow.next();
      return;
    }

    if (Object.keys(found).length > 0) {
      setFormError("Bitte prüfe die markierten Felder.");
      showErrors(found);
      return;
    }

    setSubmitting(true);
    try {
      const pad = (n: string) => n.padStart(2, "0");
      const release = await renderSignedDocument({
        tag: "Swibble Creator Pool · Freigabe",
        title: "Creator-Freigabe",
        source: "online abgegeben über www.swibble.net/bewerben/creator",
        sections: [
          {
            heading: "1. Angaben zur Person",
            lines: [
              `${fullName}, geboren am ${pad(fields.birthDay)}.${pad(fields.birthMonth)}.${fields.birthYear}`,
              `${fields.postalCode.trim()} ${fields.city.trim()}`,
              [fields.email.trim(), payload.phone].join(" · "),
            ],
          },
        ],
        declarationHeading: "2. Erklärung",
        declarationText: creatorReleaseText(fullName, roles),
        confirmation: CREATOR_RELEASE_ACCEPT_TEXT,
        signerName: fullName,
        signatureDataUrl: signature!,
        signedAt: new Date(),
        fontFamily: pageFont,
        maxBytes: RELEASE_FILE_MAX_BYTES,
      });

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          photos: photoList.photos.map((photo) => ({ data: photo.data })),
          releaseFile: { data: release.data },
          setcardFile: setcard ? { data: setcard.data } : undefined,
          turnstileToken,
          website: fields.website,
        }),
      });

      if (res.ok) {
        await flow.finish();
        onSuccess();
        return;
      }

      let data: { message?: string; errors?: ApplicationErrors } = {};
      try {
        data = await res.json();
      } catch {
        // e.g. a plain-text 413 from the platform
      }

      setFormError(
        data.message ||
          (res.status === 413
            ? "Deine Dateien sind zusammen zu groß. Bitte lass ein Foto oder die Setcard weg."
            : "Das hat leider nicht geklappt. Bitte versuch es noch einmal."),
      );
      if (data.errors) showErrors(data.errors);
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

  /* ── render ───────────────────────────────────────────────────────── */

  const { errorProps, errorFor } = fieldErrors(formId, errors);
  const releaseRoles =
    roles.length > 0
      ? roles.map((id) => roleLabel(id, "creator")).join(", ")
      : "die oben gewählten Tätigkeiten";

  return (
    // method="post": if someone submits before hydration, the browser must not
    // fall back to a GET that would put field values into the URL.
    <form onSubmit={handleSubmit} method="post" noValidate>
      <StepCard
        stepKey={step.id}
        index={flow.index}
        total={STEPS.length}
        title={step.title}
        hint={
          step.id === "channels" && roles.includes("creator")
            ? "Als Content Creator mindestens einen – Name oder Link zum Profil, beides klappt."
            : step.hint
        }
        headingRef={flow.headingRef}
        containerRef={flow.containerRef}
        error={formError}
        onBack={flow.isFirst ? undefined : handleBack}
        nextLabel={
          flow.isLast
            ? submitting
              ? "Wird gesendet …"
              : "Bewerbung abschicken"
            : "Weiter"
        }
        nextDisabled={
          !hydrated || submitting || photoList.busy || setcardBusy
        }
        footer={
          flow.isLast ? (
            <p className="text-center text-xs text-[#8a7791]">* Pflichtfeld</p>
          ) : null
        }
      >
        {step.id === "roles" && (
          <fieldset id="f-roles" tabIndex={-1} {...errorProps("roles")}>
            <legend className="sr-only">Was machst du?</legend>
            <div className="grid grid-cols-1 gap-2.5">
              {CREATOR_ROLES.map((role) => (
                <label
                  key={role.id}
                  className="flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-[#F0E6F4] bg-white px-4 py-4 text-[#000D36] motion-safe:transition hover:border-[#D9A5EE] has-[:checked]:border-[#B718EC] has-[:checked]:bg-[#FDF5FF] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#B718EC]/40"
                >
                  <span className="text-3xl" aria-hidden>
                    {role.icon}
                  </span>
                  <span className="flex-1">
                    <span className="block text-base font-semibold">{role.label}</span>
                    <span className="block text-xs text-[#556987]">{role.hint}</span>
                  </span>
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 accent-[#B718EC]"
                    checked={roles.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                </label>
              ))}
            </div>
            {errorFor("roles")}
          </fieldset>
        )}

        {step.id === "person" && (
          <>
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

            <BirthDateFields
              day={fields.birthDay}
              month={fields.birthMonth}
              year={fields.birthYear}
              onChange={setDatePart}
              monthRef={monthRef}
              yearRef={yearRef}
              invalidProps={errorProps("birthDate")}
              error={
                <>
                  {errorFor("birthDate")}
                  {errors.birthDate && age !== null && age >= 0 && age < CREATOR_MIN_AGE && (
                    <p className="mt-1.5 text-sm text-[#556987]">
                      Unter {CREATOR_MIN_AGE}? Über{" "}
                      <Link href="/bewerben" className="font-medium text-[#B718EC] underline">
                        swibble.net/bewerben
                      </Link>{" "}
                      kannst du dich mit dem Okay deiner Eltern für unsere Videos bewerben.
                    </p>
                  )}
                </>
              }
            />

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
          </>
        )}

        {step.id === "contact" && (
          <>
            <div>
              <label className={labelClass} htmlFor="f-phone">
                Handynummer*
              </label>
              <PhoneField
                id="f-phone"
                country={phoneCode}
                onCountryChange={(code) => {
                  setPhoneCode(code);
                  clearError("phone");
                }}
                value={fields.phone}
                onChange={setField("phone")}
                placeholder={phoneCode === "DE" ? "0151 2345678" : "Nummer"}
                required
                invalidProps={{
                  "aria-invalid": errors.phone ? true : undefined,
                  "aria-describedby": `${formId}-phone-hint${errors.phone ? ` ${formId}-phone-error` : ""}`,
                }}
              />
              <p id={`${formId}-phone-hint`} className="mt-1.5 text-xs text-[#8a7791]">
                Am besten eine Nummer, unter der du bei WhatsApp erreichbar bist.
              </p>
              {errorFor("phone")}
            </div>
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
          </>
        )}

        {step.id === "channels" && (
          <>
            {(
              [
                ["instagram", "Instagram"],
                ["tiktok", "TikTok"],
                ["youtube", "YouTube"],
                ["snapchat", "Snapchat"],
              ] as const
            ).map(([name, label]) => (
              <HandleField
                key={name}
                name={name}
                label={label}
                value={fields[name]}
                onChange={setField(name, "socials")}
                invalidProps={errorProps(name, ...(name === "instagram" ? ["socials"] : []))}
                error={errorFor(name)}
                optional={!roles.includes("creator")}
              />
            ))}
            {errorFor("socials")}
            {!roles.includes("creator") && (
              <p className="text-xs text-[#8a7791]">
                Kein Profil? Kein Problem – dann einfach weiter.
              </p>
            )}
          </>
        )}

        {step.id === "photos" && (
          <PhotoPicker
            photos={photoList.photos}
            max={PHOTO_MAX_COUNT}
            busy={photoList.busy}
            onAdd={photoList.add}
            onRemove={photoList.remove}
            invalidProps={errorProps("photos")}
            error={errorFor("photos")}
            hint={`Mindestens ${CREATOR_PHOTO_MIN_COUNT}, höchstens ${PHOTO_MAX_COUNT}. Wir verkleinern sie automatisch.`}
          />
        )}

        {step.id === "portfolio" && (
          <>
            <div>
              <label className={labelClass} htmlFor="f-setcard">
                Setcard oder Portfolio als PDF oder Bild
                {optionalMark}
              </label>
              {setcard ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E4D3EC] bg-white p-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate text-[#000D36]">
                      {setcard.kind === "pdf" ? "📄" : "🖼️"} {setcard.name}
                    </span>
                    <span className="block text-xs text-[#8a7791]">
                      {Math.max(1, Math.round(setcard.size / 1024))} KB
                      {setcard.compressed ? " · automatisch verkleinert" : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSetcard(null)}
                    className="shrink-0 rounded-lg px-2 py-1 font-medium text-[#B718EC] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC]"
                  >
                    Entfernen
                  </button>
                </div>
              ) : (
                <input
                  id="f-setcard"
                  type="file"
                  accept={SETCARD_ACCEPT}
                  onChange={handleSetcard}
                  disabled={setcardBusy}
                  className={`${fileInputClass} disabled:cursor-wait disabled:opacity-60`}
                  {...errorProps("setcard")}
                />
              )}
              <p className="mt-1.5 text-xs text-[#8a7791]" aria-live="polite">
                {setcardBusy
                  ? "Datei wird vorbereitet – große PDFs verkleinern wir, das kann einen Moment dauern …"
                  : "Große PDFs verkleinern wir automatisch."}
              </p>
              {errorFor("setcard")}
            </div>

            <div>
              <label className={labelClass} htmlFor="f-portfolioUrl">
                Link zu Website, Portfolio oder Setcard
                {optionalMark}
              </label>
              <input
                id="f-portfolioUrl"
                type="url"
                className={inputClass}
                value={fields.portfolioUrl}
                onChange={setField("portfolioUrl")}
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={PORTFOLIO_URL_MAX_LENGTH}
                placeholder="www.deine-seite.de"
                {...errorProps("portfolioUrl")}
              />
              {errorFor("portfolioUrl")}
            </div>

            <div>
              <label className={labelClass} htmlFor="f-about">
                Erzähl uns kurz was über dich
                {optionalMark}
              </label>
              <textarea
                id="f-about"
                className={`${inputClass} min-h-28 resize-y`}
                value={fields.about}
                onChange={setField("about")}
                maxLength={ABOUT_MAX_LENGTH}
                placeholder="z. B. Erfahrung, Sprachen, Größe, bisherige Kunden"
                aria-describedby={`${formId}-about-count ${errors.about ? `${formId}-about-error` : ""}`.trim()}
                aria-invalid={errors.about ? true : undefined}
              />
              <p id={`${formId}-about-count`} className="mt-1 text-right text-xs text-[#8a7791]">
                {fields.about.length} / {ABOUT_MAX_LENGTH} Zeichen
              </p>
              {errorFor("about")}
            </div>
          </>
        )}

        {step.id === "release" && (
          <>
            <div
              className="max-h-80 overflow-y-auto rounded-xl bg-[#F9EAFF] p-4 text-[13px] leading-relaxed text-[#000D36]"
              tabIndex={0}
              role="region"
              aria-label="Text der Creator-Freigabe"
            >
              <p>
                {CREATOR_RELEASE_INTRO.replace("{name}", fullName || "–").replace(
                  "{roles}",
                  releaseRoles,
                )}
              </p>
              <ol className="mt-2 list-decimal space-y-2 pl-5">
                {CREATOR_RELEASE_CLAUSES.map((clause) => {
                  const [heading, ...rest] = clause.split(": ");
                  return (
                    <li key={clause}>
                      <strong>{heading}:</strong> {rest.join(": ")}
                    </li>
                  );
                })}
              </ol>
            </div>

            <CheckboxField
              id="f-releaseAccepted"
              checked={releaseAccepted}
              onChange={(checked) => {
                setReleaseAccepted(checked);
                clearError("releaseAccepted");
              }}
              invalidProps={errorProps("releaseAccepted")}
              error={errorFor("releaseAccepted")}
            >
              {CREATOR_RELEASE_ACCEPT_TEXT}*
            </CheckboxField>

            <div>
              <p className={labelClass}>Deine Unterschrift*</p>
              <SignaturePad
                id="f-signature"
                initialValue={signature}
                onChange={(dataUrl) => {
                  setSignature(dataUrl);
                  clearError("signature");
                }}
                invalid={Boolean(errors.signature)}
                describedBy={errors.signature ? `${formId}-signature-error` : undefined}
              />
              {errorFor("signature")}
            </div>

            <CheckboxField
              id="f-privacyAck"
              checked={privacyAck}
              onChange={(checked) => {
                setPrivacyAck(checked);
                clearError("privacyAck");
              }}
              invalidProps={errorProps("privacyAck")}
              error={errorFor("privacyAck")}
            >
              Ich habe die{" "}
              <Link
                href="/datenschutz#creator-pool"
                target="_blank"
                className="font-medium text-[#B718EC] underline"
              >
                Datenschutzerklärung
              </Link>{" "}
              zur Kenntnis genommen.*
            </CheckboxField>

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
          </>
        )}
      </StepCard>
    </form>
  );
};

export default CreatorApplicationForm;
