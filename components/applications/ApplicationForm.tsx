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
} from "react";
import TurnstileWidget from "@/components/TurnstileWidget";
import SignaturePad from "@/components/applications/SignaturePad";
import { StepCard, useStepFlow } from "@/components/applications/StepFlow";
import {
  BirthDateFields,
  CheckboxField,
  HandleField,
  PhotoPicker,
  fieldErrors,
  inputClass,
  labelClass,
  optionalMark,
  usePhotos,
} from "@/components/applications/formParts";
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
  type ApplicationRole,
  type GuardianMethod,
} from "@/lib/applications/config";
import { calculateAge, parseIsoDate, todayInBerlin } from "@/lib/applications/age";
import {
  CONSENT_FILE_ACCEPT,
  ConsentFileError,
  prepareConsentFile,
  type PreparedFile,
} from "@/lib/applications/clientFile";
import { renderDeclarationDocument } from "@/lib/applications/declarationImage";
import { adoptEarlyInput } from "@/lib/applications/earlyInput";
import {
  errorsForStep,
  firstStepWithErrors,
  type StepDefinition,
} from "@/lib/applications/steps";
import { validateApplication } from "@/lib/applications/validation";
import type { ApplicationErrors } from "@/lib/applications/types";
import type { CenterOption } from "@/lib/applications/store";

interface Props {
  /** Center the visitor came from (validated server-side), if any */
  center: CenterOption | null;
  centers: CenterOption[];
  /** Roles switched on in the admin area; only these are offered */
  enabledRoles: ApplicationRole[];
  /** False when the private file storage isn't configured */
  uploadsAvailable: boolean;
  /** Called with the slug of the center the application was sent for ("" = none) */
  onSuccess: (centerSlug: string) => void;
}

type StepId =
  | "roles"
  | "person"
  | "contact"
  | "profiles"
  | "photos"
  | "more"
  | "guardian"
  | "consents";

interface Step extends StepDefinition<StepId> {
  title: string;
  hint?: string;
}

const ALL_STEPS: Record<StepId, Step> = {
  roles: {
    id: "roles",
    title: "Wofür bewirbst du dich?",
    hint: "Du kannst mehrere auswählen.",
    fields: ["roles"],
  },
  person: {
    id: "person",
    title: "Über dich",
    fields: ["firstName", "lastName", "birthDate", "postalCode", "city"],
  },
  contact: {
    id: "contact",
    title: "So erreichen wir dich",
    fields: ["phone", "email"],
  },
  profiles: {
    id: "profiles",
    title: "Deine Profile",
    hint: "Alles freiwillig – hilft uns aber zu sehen, wer du bist.",
    fields: ["tiktok", "instagram", "snapchat", "youtube"],
  },
  photos: {
    id: "photos",
    title: "Fotos von dir",
    hint: "Freiwillig – Bilder, auf denen man dich gut erkennt. Nur das Swibble-Team sieht sie.",
    fields: ["photos"],
  },
  more: {
    id: "more",
    title: "Noch was?",
    fields: ["about", "center"],
  },
  guardian: {
    id: "guardian",
    title: "Einverständnis deiner Eltern",
    hint: `Du bist unter ${ADULT_AGE} – deshalb brauchen wir das Okay einer erziehungsberechtigten Person.`,
    fields: [
      "guardianName",
      "guardianContact",
      "guardianPhone",
      "guardianEmail",
      "guardianAddress",
      "consentFile",
      "guardianConfirmed",
      "signature",
    ],
  },
  consents: {
    id: "consents",
    title: "Fast geschafft",
    fields: ["contactConsent", "mediaConsent", "privacyAck", "turnstile"],
  },
};

/** Element to focus for an error key. */
const focusIdFor = (key: string) =>
  key === "birthDate"
    ? "f-birthDay"
    : key === "guardianContact"
      ? "f-guardianPhone"
      : `f-${key}`;

const subscribeNever = () => () => {};

const ApplicationForm = ({
  center,
  centers,
  enabledRoles,
  uploadsAvailable,
  onSuccess,
}: Props) => {
  const formId = useId();
  const turnstileRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

  const offeredRoles = APPLICATION_ROLES.filter((r) =>
    enabledRoles.includes(r.id),
  );
  // A single open role needs no decision: it is ticked from the start.
  const [roles, setRoles] = useState<string[]>(
    offeredRoles.length === 1 ? [offeredRoles[0].id] : [],
  );
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

  const [file, setFile] = useState<PreparedFile | null>(null);
  const [fileBusy, setFileBusy] = useState(false);

  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  const [errors, setErrors] = useState<ApplicationErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // False in the server HTML, true once React runs in the browser. Until then
  // the buttons stay disabled so nobody can trigger a native submit.
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
          : enabledRoles.filter((id) => isChecked(`f-role-${id}`)),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

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

  const isMinor = age !== null && age >= 0 && age < ADULT_AGE;
  const uploadBlocked = isMinor && !uploadsAvailable;

  // Steps that apply right now: no role step with a single open role, no
  // photo step without storage, the parents' step only for minors.
  const steps = useMemo(
    () =>
      (Object.values(ALL_STEPS) as Step[]).filter(
        (step) =>
          (step.id !== "roles" || offeredRoles.length > 1) &&
          (step.id !== "photos" || uploadsAvailable) &&
          (step.id !== "guardian" || isMinor),
      ),
    [offeredRoles.length, uploadsAvailable, isMinor],
  );
  const flow = useStepFlow<StepId>(
    steps.map((step) => step.id),
    "applicationStep",
  );
  const step = steps[flow.index];

  /* ── helpers ──────────────────────────────────────────────────────── */

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

  const resetTurnstile = () => {
    setTurnstileToken("");
    setTurnstileKey((key) => key + 1);
  };

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

  /** All messages for the current input — same rules as the server. */
  const collectErrors = (): ApplicationErrors => {
    const result = validateApplication(payload, new Date(), enabledRoles);
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
    return found;
  };

  const firstField = (found: ApplicationErrors, stepId: StepId) => {
    const key = ALL_STEPS[stepId].fields.find((k) => found[k]);
    return key ? focusIdFor(key) : undefined;
  };

  /** Shows the messages of `found` on the first step that has one. */
  const showErrors = (found: ApplicationErrors) => {
    const target = firstStepWithErrors(steps, found) ?? flow.current;
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
    if (submitting || fileBusy || photoList.busy) return;
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
          photos: photoList.photos.map((photo) => ({ data: photo.data })),
          turnstileToken,
          website: fields.website,
        }),
      });

      if (res.ok) {
        await flow.finish();
        onSuccess(fields.center);
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
            ? "Die Datei ist zu groß. Bitte lade ein kleineres Foto oder PDF hoch."
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

  return (
    // method="post": if someone submits before hydration, the browser must not
    // fall back to a GET that would put field values into the URL.
    <form onSubmit={handleSubmit} method="post" noValidate>
      <StepCard
        stepKey={step.id}
        index={flow.index}
        total={steps.length}
        title={step.title}
        hint={step.hint}
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
          !hydrated ||
          submitting ||
          fileBusy ||
          photoList.busy ||
          (uploadBlocked && (step.id === "guardian" || flow.isLast))
        }
        footer={
          flow.isLast ? (
            <p className="text-center text-xs text-[#8a7791]">* Pflichtfeld</p>
          ) : null
        }
      >
        {step.id === "roles" && (
          <fieldset id="f-roles" tabIndex={-1} {...errorProps("roles")}>
            <legend className="sr-only">Wofür bewirbst du dich?</legend>
            <div className="flex flex-col gap-2.5">
              {offeredRoles.map((role) => (
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
              error={errorFor("birthDate")}
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

        {step.id === "profiles" && (
          <>
            {(
              [
                ["tiktok", "TikTok"],
                ["instagram", "Instagram"],
                ["snapchat", "Snapchat"],
                ["youtube", "YouTube"],
              ] as const
            ).map(([name, label]) => (
              <HandleField
                key={name}
                name={name}
                label={label}
                value={fields[name]}
                onChange={setField(name)}
                invalidProps={errorProps(name)}
                error={errorFor(name)}
              />
            ))}
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
            hint="Wir verkleinern sie automatisch."
          />
        )}

        {step.id === "more" && (
          <>
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
                aria-describedby={`${formId}-about-count ${errors.about ? `${formId}-about-error` : ""}`.trim()}
                aria-invalid={errors.about ? true : undefined}
              />
              <p id={`${formId}-about-count`} className="mt-1 text-right text-xs text-[#8a7791]">
                {fields.about.length} / {ABOUT_MAX_LENGTH} Zeichen
              </p>
              {errorFor("about")}
            </div>

            {!center && (
              <div>
                <label className={labelClass} htmlFor="f-center">
                  Für welches Center?
                  {optionalMark}
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
          </>
        )}

        {step.id === "guardian" && (
          <>
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
                        initialValue={signature}
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
          </>
        )}

        {step.id === "consents" && (
          <>
            <CheckboxField
              id="f-contactConsent"
              checked={contactConsent}
              onChange={(checked) => {
                setContactConsent(checked);
                clearError("contactConsent");
              }}
              invalidProps={errorProps("contactConsent")}
              error={errorFor("contactConsent")}
            >
              {CONTACT_CONSENT_TEXT}*
            </CheckboxField>

            <CheckboxField
              id="f-mediaConsent"
              checked={mediaConsent}
              onChange={(checked) => {
                setMediaConsent(checked);
                clearError("mediaConsent");
              }}
              invalidProps={errorProps("mediaConsent")}
              error={errorFor("mediaConsent")}
            >
              {MEDIA_CONSENT_TEXT}*
            </CheckboxField>

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
                href="/datenschutz#bewerbungen"
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

export default ApplicationForm;
