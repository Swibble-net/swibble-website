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
  CountrySelect,
  HandleField,
  LanguagePicker,
  PhoneField,
  PhotoPicker,
  VideoPicker,
  fieldErrors,
  fileInputClass,
  inputClass,
  labelClass,
  optionalMark,
  usePhotos,
  useVideos,
} from "@/components/applications/formParts";
import {
  ABOUT_MAX_LENGTH,
  ADULT_AGE,
  CREATOR_GUARDIAN_CLAUSES,
  CREATOR_GUARDIAN_INTRO,
  CREATOR_PHOTO_MAX_COUNT,
  CREATOR_PHOTO_MIN_COUNT,
  CREATOR_RELEASE_ACCEPT_TEXT,
  CREATOR_RELEASE_CLAUSES,
  CREATOR_RELEASE_INTRO,
  CREATOR_ROLES,
  CREATOR_VIDEO_MAX_BYTES,
  CREATOR_VIDEO_MAX_COUNT,
  CREATOR_VIDEO_SOURCE_MAX_BYTES,
  GUARDIAN_ONLINE_ACCEPT_TEXT,
  PORTFOLIO_URL_MAX_LENGTH,
  RELEASE_FILE_MAX_BYTES,
  creatorGuardianText,
  creatorReleaseText,
  roleLabel,
  type CreatorRole,
} from "@/lib/applications/config";
import { calculateAge, parseIsoDate, todayInBerlin } from "@/lib/applications/age";
import {
  ConsentFileError,
  SETCARD_ACCEPT,
  prepareCreatorPhoto,
  prepareSetcard,
  type PreparedFile,
} from "@/lib/applications/clientFile";
import { abortCreatorUpload, uploadCreatorFiles } from "@/lib/applications/clientUpload";
import { renderSignedDocument } from "@/lib/applications/declarationImage";
import { DEFAULT_PHONE_COUNTRY, combinePhone } from "@/lib/applications/phone";
import {
  GENDERS,
  LANGUAGES_MAX,
  formatHeight,
  formatLanguages,
  formatNationalities,
  genderLabel,
  type Gender,
} from "@/lib/applications/profileFacts";
import { errorsForStep, firstStepWithErrors, type StepDefinition } from "@/lib/applications/steps";
import { validateCreatorApplication } from "@/lib/applications/validation";
import type { ApplicationErrors } from "@/lib/applications/types";

interface Props {
  onSuccess: () => void;
}

type StepId =
  | "roles"
  | "person"
  | "facts"
  | "contact"
  | "channels"
  | "photos"
  | "portfolio"
  | "release"
  | "guardian";

interface Step extends StepDefinition<StepId> {
  title: string;
  hint: string;
}

const BASE_STEPS: Step[] = [
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
    id: "facts",
    title: "Dein Steckbrief",
    hint: "Steht später auf deiner Creator-Seite – so sehen Kunden gleich, ob du zu ihrem Projekt passt.",
    fields: ["gender", "heightCm", "nationalities", "languages"],
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
    title: "Fotos & Videos",
    hint: "Direkt aus deiner Fotos-App: ein Porträt, ein Ganzkörperfoto und gern Clips, die zeigen, was du machst.",
    fields: ["photos", "videos"],
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
    fields: ["releaseAccepted", "signature", "privacyAck"],
  },
];

/** Minors only: an extra last step on which a guardian signs. */
const GUARDIAN_STEP: Step = {
  id: "guardian",
  title: "Unterschrift deiner Eltern",
  hint: `Du bist unter ${ADULT_AGE} – deshalb unterschreibt zusätzlich eine erziehungsberechtigte Person.`,
  fields: [
    "guardianName",
    "guardianContact",
    "guardianPhone",
    "guardianEmail",
    "guardianAddress",
    "guardianConfirmed",
    "guardianSignature",
  ],
};

/** Element to focus for an error key. */
const focusIdFor = (key: string) =>
  key === "birthDate"
    ? "f-birthDay"
    : key === "socials"
      ? "f-instagram"
      : key === "guardianContact"
        ? "f-guardianPhone"
        : `f-${key}`;

const subscribeNever = () => () => {};

const CreatorApplicationForm = ({ onSuccess }: Props) => {
  const formId = useId();
  const turnstileRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

  const [roles, setRoles] = useState<CreatorRole[]>([]);
  const [gender, setGender] = useState<Gender | "">("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [fields, setFields] = useState({
    firstName: "",
    lastName: "",
    birthDay: "",
    birthMonth: "",
    birthYear: "",
    postalCode: "",
    city: "",
    heightCm: "",
    nationality: "",
    nationality2: "",
    phone: "",
    email: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    snapchat: "",
    portfolioUrl: "",
    about: "",
    guardianName: "",
    guardianPhone: "",
    guardianEmail: "",
    guardianAddress: "",
    website: "", // honeypot
  });
  const [guardianPhoneCode, setGuardianPhoneCode] = useState(DEFAULT_PHONE_COUNTRY);
  const [guardianConfirmed, setGuardianConfirmed] = useState(false);
  const [guardianSignature, setGuardianSignature] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
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

  const photoList = usePhotos(
    CREATOR_PHOTO_MAX_COUNT,
    (message) =>
      message ? setErrors((prev) => ({ ...prev, photos: message })) : clearError("photos"),
    prepareCreatorPhoto,
  );
  const videoList = useVideos(
    CREATOR_VIDEO_MAX_COUNT,
    CREATOR_VIDEO_SOURCE_MAX_BYTES,
    CREATOR_VIDEO_MAX_BYTES,
    (message) =>
      message ? setErrors((prev) => ({ ...prev, videos: message })) : clearError("videos"),
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
  const isMinor = age !== null && age >= 0 && age < ADULT_AGE;

  // Minors get the parents' step at the end; the spam check sits on the last step.
  const steps = useMemo<Step[]>(() => {
    const list = isMinor ? [...BASE_STEPS, GUARDIAN_STEP] : BASE_STEPS;
    return list.map((step, index) =>
      index === list.length - 1 ? { ...step, fields: [...step.fields, "turnstile"] } : step,
    );
  }, [isMinor]);
  const flow = useStepFlow<StepId>(
    steps.map((step) => step.id),
    "creatorApplicationStep",
  );
  const step = steps[flow.index];

  const payload = {
    pool: "creator",
    roles,
    firstName: fields.firstName,
    lastName: fields.lastName,
    birthDate,
    postalCode: fields.postalCode,
    city: fields.city,
    gender,
    heightCm: fields.heightCm,
    nationalities: [fields.nationality, fields.nationality2].filter(Boolean),
    languages,
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
    guardian: isMinor
      ? {
          name: fields.guardianName,
          phone: combinePhone(guardianPhoneCode, fields.guardianPhone),
          email: fields.guardianEmail,
          address: fields.guardianAddress,
          method: "signature",
          confirmed: guardianConfirmed,
        }
      : undefined,
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

  // Digits only, so "1,72" becomes 172 (no maxLength: the comma would count).
  const setHeight = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 3);
    setFields((prev) => ({ ...prev, heightCm: value }));
    clearError("heightCm");
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
    if (isMinor && !guardianSignature) found.guardianSignature = "Bitte hier unterschreiben.";
    if (turnstileRequired && !turnstileToken) {
      found.turnstile = "Bitte warte kurz, bis die Spam-Prüfung abgeschlossen ist.";
    }
    return found;
  };

  const firstField = (found: ApplicationErrors, stepId: StepId) => {
    const keys = steps.find((s) => s.id === stepId)?.fields ?? [];
    const key = keys.find((k) => found[k]);
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
    if (submitting || photoList.busy || videoList.busy || setcardBusy) return;
    // Videos are still being compressed: the button says so and stays off.
    if (flow.isLast && videoList.compressing) return;
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
              [
                genderLabel(gender),
                formatHeight(Number(fields.heightCm)),
                `Nationalität: ${formatNationalities(payload.nationalities)}`,
                `Sprachen: ${formatLanguages(languages)}`,
              ].join(" · "),
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

      // Minors: the parents' declaration as a second signed document.
      const consent = isMinor
        ? await renderSignedDocument({
            tag: "Swibble Creator Pool · Einverständnis der Eltern",
            title: "Einverständniserklärung der Erziehungsberechtigten",
            source: "online abgegeben über www.swibble.net/bewerben/creator",
            sections: [
              {
                heading: "1. Angaben zum Kind",
                lines: [
                  `${fullName}, geboren am ${pad(fields.birthDay)}.${pad(fields.birthMonth)}.${fields.birthYear}`,
                ],
              },
              {
                heading: "2. Erziehungsberechtigte Person",
                lines: [
                  fields.guardianName.trim(),
                  [payload.guardian?.phone ?? "", fields.guardianEmail.trim()].filter(Boolean).join(" · "),
                  fields.guardianAddress.trim(),
                ].filter(Boolean),
              },
            ],
            declarationHeading: "3. Erklärung",
            declarationText: creatorGuardianText(fullName, roles),
            confirmation: GUARDIAN_ONLINE_ACCEPT_TEXT,
            signerName: fields.guardianName.trim(),
            signatureDataUrl: guardianSignature!,
            signedAt: new Date(),
            fontFamily: pageFont,
            maxBytes: RELEASE_FILE_MAX_BYTES,
          })
        : null;

      // 1) Form data: stores the application and returns an upload token.
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          files: {
            photos: photoList.photos.length,
            videos: videoList.videos.map((v) => ({ size: v.output.size, contentType: v.outputType })),
            setcard: Boolean(setcard),
          },
          turnstileToken,
          website: fields.website,
        }),
      });

      let data: {
        message?: string;
        errors?: ApplicationErrors;
        id?: string;
        token?: string;
        chunkBytes?: number;
      } = {};
      try {
        data = await res.json();
      } catch {
        // e.g. a plain-text error page from the platform
      }

      if (!res.ok || !data.id || !data.token) {
        setFormError(data.message || "Das hat leider nicht geklappt. Bitte versuch es noch einmal.");
        if (data.errors) showErrors(data.errors);
        // Turnstile tokens are single-use — get a fresh one for the next try.
        resetTurnstile();
        return;
      }

      // 2) Files, one by one; 3) the server checks them and sends the mails.
      const target = { id: data.id, token: data.token, chunkBytes: data.chunkBytes || 4 * 1024 * 1024 };
      try {
        setUploadProgress(0);
        await uploadCreatorFiles(
          target,
          {
            release: release.blob,
            consent: consent?.blob ?? null,
            setcard: setcard?.blob ?? null,
            photos: photoList.photos.map((photo) => photo.blob!),
            videos: videoList.videos.map((v) => ({ file: v.output, cover: v.cover })),
          },
          (sent, total) => setUploadProgress(total > 0 ? Math.round((sent / total) * 100) : 0),
        );
      } catch (err) {
        await abortCreatorUpload(target);
        setFormError(
          `${err instanceof Error ? err.message : "Der Upload hat nicht geklappt."} Deine Eingaben sind noch da – bitte versuch es noch einmal.`,
        );
        resetTurnstile();
        return;
      }

      await flow.finish();
      onSuccess();
    } catch {
      setFormError(
        "Keine Verbindung. Deine Eingaben sind noch da – bitte prüf dein Netz und versuch es noch einmal.",
      );
      resetTurnstile();
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
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
        total={steps.length}
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
            ? uploadProgress !== null
              ? `Wird hochgeladen … ${uploadProgress} %`
              : submitting
                ? "Wird gesendet …"
                : videoList.compressing
                  ? "Videos werden verkleinert …"
                  : "Bewerbung abschicken"
            : "Weiter"
        }
        nextDisabled={
          !hydrated ||
          submitting ||
          photoList.busy ||
          videoList.busy ||
          setcardBusy ||
          (flow.isLast && videoList.compressing)
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
              error={errorFor("birthDate")}
            />
            {isMinor && (
              <p className="-mt-2 text-sm text-[#556987]">
                Du bist unter {ADULT_AGE}? Kein Problem – am Ende unterschreibt zusätzlich
                eine erziehungsberechtigte Person.
              </p>
            )}

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

        {step.id === "facts" && (
          <>
            <fieldset id="f-gender" tabIndex={-1} className="focus:outline-none" {...errorProps("gender")}>
              <legend className={labelClass}>Geschlecht*</legend>
              <div className="grid grid-cols-3 gap-2">
                {GENDERS.map((option) => (
                  <label
                    key={option.id}
                    className="flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-[#F0E6F4] bg-white px-2 text-sm font-semibold text-[#000D36] motion-safe:transition hover:border-[#D9A5EE] has-[:checked]:border-[#B718EC] has-[:checked]:bg-[#FDF5FF] has-[:checked]:text-[#B718EC] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#B718EC]/40"
                  >
                    <input
                      type="radio"
                      name="gender"
                      className="sr-only"
                      checked={gender === option.id}
                      onChange={() => {
                        setGender(option.id);
                        clearError("gender");
                      }}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {errorFor("gender")}
            </fieldset>

            <div>
              <label className={labelClass} htmlFor="f-heightCm">
                Größe<span className="sr-only"> in Zentimetern</span>*
              </label>
              <div className="relative max-w-44">
                <input
                  id="f-heightCm"
                  className={`${inputClass} pr-12`}
                  value={fields.heightCm}
                  onChange={setHeight}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="z. B. 172"
                  required
                  {...errorProps("heightCm")}
                />
                <span
                  className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-base text-[#8a7791]"
                  aria-hidden
                >
                  cm
                </span>
              </div>
              {errorFor("heightCm")}
            </div>

            <div>
              <label className={labelClass} htmlFor="f-nationalities">
                Nationalität*
              </label>
              <CountrySelect
                id="f-nationalities"
                value={fields.nationality}
                onChange={(code) => {
                  setFields((prev) => ({
                    ...prev,
                    nationality: code,
                    nationality2: prev.nationality2 === code ? "" : prev.nationality2,
                  }));
                  clearError("nationalities");
                }}
                emptyLabel="Bitte wählen"
                invalidProps={errorProps("nationalities")}
              />
              {errorFor("nationalities")}
            </div>
            {fields.nationality && (
              <div>
                <label className={labelClass} htmlFor="f-nationality2">
                  Zweite Nationalität
                  {optionalMark}
                </label>
                <CountrySelect
                  id="f-nationality2"
                  value={fields.nationality2}
                  onChange={(code) => {
                    setFields((prev) => ({ ...prev, nationality2: code }));
                    clearError("nationalities");
                  }}
                  emptyLabel="Keine"
                  exclude={[fields.nationality]}
                />
              </div>
            )}

            <fieldset id="f-languages" tabIndex={-1} className="focus:outline-none" {...errorProps("languages")}>
              <legend className={labelClass}>Welche Sprachen sprichst du?*</legend>
              <LanguagePicker
                value={languages}
                onChange={(next) => {
                  setLanguages(next);
                  clearError("languages");
                }}
                max={LANGUAGES_MAX}
              />
              {errorFor("languages")}
            </fieldset>
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
          <>
            <div>
              <p className={labelClass}>Fotos*</p>
              <PhotoPicker
                photos={photoList.photos}
                max={CREATOR_PHOTO_MAX_COUNT}
                busy={photoList.busy}
                onAdd={photoList.add}
                onRemove={photoList.remove}
                onMove={photoList.move}
                coverFirst
                invalidProps={errorProps("photos")}
                error={errorFor("photos")}
                hint={`Mindestens ${CREATOR_PHOTO_MIN_COUNT}. Wir verkleinern sie automatisch.`}
              />
            </div>
            <div>
              <p className={labelClass}>
                Videos
                {optionalMark}
              </p>
              <VideoPicker
                videos={videoList.videos}
                max={CREATOR_VIDEO_MAX_COUNT}
                busy={videoList.busy}
                onAdd={videoList.add}
                onRemove={videoList.remove}
                invalidProps={errorProps("videos")}
                error={errorFor("videos")}
                hint="Wir verkleinern sie automatisch – du kannst schon weitermachen."
              />
            </div>
          </>
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
                placeholder="z. B. Erfahrung, bisherige Kunden, was dir Spaß macht"
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
          </>
        )}

        {step.id === "guardian" && (
          <>
            <div>
              <label className={labelClass} htmlFor="f-guardianName">
                Name der erziehungsberechtigten Person*
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
              <legend className={labelClass}>Telefonnummer oder E-Mail dieser Person*</legend>
              <div className="flex flex-col gap-2.5">
                <div>
                  <label className="sr-only" htmlFor="f-guardianPhone">
                    Telefonnummer der erziehungsberechtigten Person
                  </label>
                  <PhoneField
                    id="f-guardianPhone"
                    country={guardianPhoneCode}
                    onCountryChange={(code) => {
                      setGuardianPhoneCode(code);
                      clearError("guardianPhone", "guardianContact");
                    }}
                    value={fields.guardianPhone}
                    onChange={setField("guardianPhone", "guardianContact")}
                    autoComplete="off"
                    placeholder="Telefon"
                    invalidProps={errorProps("guardianPhone", "guardianContact")}
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
                Anschrift
                {optionalMark}
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

            <div
              className="max-h-72 overflow-y-auto rounded-xl bg-[#F9EAFF] p-4 text-[13px] leading-relaxed text-[#000D36]"
              tabIndex={0}
              role="region"
              aria-label="Text der Einverständniserklärung"
            >
              <p>
                {CREATOR_GUARDIAN_INTRO.split("{child}")
                  .join(fullName || "das Kind")
                  .replace("{roles}", releaseRoles)}
              </p>
              <ol className="mt-2 list-decimal space-y-2 pl-5">
                {CREATOR_GUARDIAN_CLAUSES.map((clause) => {
                  const [heading, ...rest] = clause.split(": ");
                  return (
                    <li key={clause}>
                      {rest.length > 0 ? (
                        <>
                          <strong>{heading}:</strong> {rest.join(": ")}
                        </>
                      ) : (
                        clause
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            <CheckboxField
              id="f-guardianConfirmed"
              checked={guardianConfirmed}
              onChange={(checked) => {
                setGuardianConfirmed(checked);
                clearError("guardianConfirmed");
              }}
              invalidProps={errorProps("guardianConfirmed")}
              error={errorFor("guardianConfirmed")}
            >
              {GUARDIAN_ONLINE_ACCEPT_TEXT}*
            </CheckboxField>

            <div>
              <p className={labelClass}>Unterschrift der erziehungsberechtigten Person*</p>
              <SignaturePad
                id="f-guardianSignature"
                initialValue={guardianSignature}
                onChange={(dataUrl) => {
                  setGuardianSignature(dataUrl);
                  clearError("guardianSignature");
                }}
                invalid={Boolean(errors.guardianSignature)}
                describedBy={
                  errors.guardianSignature ? `${formId}-guardianSignature-error` : undefined
                }
              />
              {errorFor("guardianSignature")}
            </div>
          </>
        )}

        {flow.isLast && (
          <>
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

            {uploadProgress !== null && (
              <div aria-live="polite">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F3E8F9]">
                  <div
                    className="h-full rounded-full bg-[#B718EC] transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-[#556987]">
                  Fotos und Videos werden hochgeladen – bitte die Seite offen lassen.
                </p>
              </div>
            )}
          </>
        )}
      </StepCard>
    </form>
  );
};

export default CreatorApplicationForm;
