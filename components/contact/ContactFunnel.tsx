import CtaLink from "@/components/CtaLink";
import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { MdCheck, MdCheckCircle, MdHelpOutline } from "react-icons/md";
import sendEmail from "@/lib/sendMail";
import TurnstileWidget from "@/components/TurnstileWidget";
import ChoiceChip from "@/components/contact/ChoiceChip";
import { EMAIL, MESSAGE_MAX_LENGTH } from "@/lib/cta";
import {
  BUDGETS,
  COMPANY_MAX_LENGTH,
  DONE_STEP,
  EMAIL_MAX_LENGTH,
  EMPTY_ANSWERS,
  FIRST_STEP,
  GOALS,
  LAST_INPUT_STEP,
  LOCATION_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NUMBER_MAX_LENGTH,
  SERVICES,
  STEPS,
  TIMEFRAMES,
  UNSURE,
  canProceed,
  goalsForServices,
  isValidEmail,
  labelOf,
  nextStep,
  prevStep,
  progressPercent,
  reconcileGoals,
  toggleGoal,
  toggleService,
  type FunnelAnswers,
  type Goal,
  type Service,
  type Step,
} from "@/lib/contact/funnel";
import BrushIcon from "@/public/icons/icon_brush.svg";
import MonitorIcon from "@/public/icons/icon_monitor.svg";
import MobileIcon from "@/public/icons/mobile_icon.svg";
import UserLocationIcon from "@/public/icons/user_location_icon.svg";

// Same icons and colours as the service cards in Tasks.tsx.
const SERVICE_TILES = {
  "social-media": { icon: MobileIcon, color: "#3ABD9E" },
  "live-events": { icon: UserLocationIcon, color: "#C43B7D" },
  design: { icon: BrushIcon, color: "#B718EC" },
  software: { icon: MonitorIcon, color: "#5F3BC4" },
} as const;

const CASE_STUDY = {
  href: "/blog/case-study-aquis-plaza-aachen",
  label: "Case Study: Aquis Plaza Aachen",
};

const STEP_HINTS: Partial<Record<Step, string>> = {
  1: "Bitte wähle mindestens eine Option aus.",
  2: "Bitte wähle mindestens ein Ziel aus.",
};

const INPUT_CLASS =
  "w-full bg-[#F6F6F6] h-12 rounded-lg focus:outline-none! focus-visible:ring-2 focus-visible:ring-[#B718EC] pl-2 mt-2 placeholder:font-normal placeholder:text-sm placeholder:text-[#CEC3D2]";
const PRIMARY_BUTTON_CLASS =
  "min-w-32 text-center text-sm font-medium bg-[#B718EC] text-[#F0FDF4] py-[0.781rem] px-5 rounded-[10px] hover:scale-95 transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] disabled:cursor-not-allowed disabled:opacity-50";

const ContactFunnel = () => {
  const [step, setStep] = useState<Step>(FIRST_STEP);
  const [answers, setAnswers] = useState<FunnelAnswers>(EMPTY_ANSWERS);
  const [contact, setContact] = useState({ name: "", email: "", number: "", company: "", location: "", message: "" });
  const [stepError, setStepError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitError, setSubmitError] = useState<"" | "turnstile" | "send">("");
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const stepChanged = useRef(false);

  // Move the focus to the heading of the new step (not on the first render).
  useEffect(() => {
    if (!stepChanged.current) return;
    headingRef.current?.focus();
  }, [step]);

  const goTo = (target: Step, direction: "forward" | "back") => {
    if (target === step) return;
    stepChanged.current = true;
    setStepError("");
    setStep(target);
    // Step numbers only, no personal data.
    track("contact_funnel_step", { step: target, direction });
  };

  const handleNext = () => {
    if (!canProceed(step, answers)) {
      setStepError(STEP_HINTS[step] ?? "");
      return;
    }
    goTo(nextStep(step, answers), "forward");
  };

  const handleServiceToggle = (service: Service) => {
    setStepError("");
    setAnswers((prev) => {
      const services = toggleService(prev.services, service);
      return { ...prev, services, goals: reconcileGoals(services, prev.goals) };
    });
  };

  const handleGoalToggle = (goal: Goal) => {
    setStepError("");
    setAnswers((prev) => ({ ...prev, goals: toggleGoal(prev.goals, goal) }));
  };

  // Single-select chips: a second click clears the choice again.
  const handleChoice = <K extends "budget" | "timeframe">(field: K, value: FunnelAnswers[K]) => {
    setStepError("");
    setAnswers((prev) => ({ ...prev, [field]: prev[field] === value ? "" : value }));
  };

  const resetTurnstile = () => {
    setTurnstileToken("");
    setTurnstileKey((key) => key + 1);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step !== LAST_INPUT_STEP || submitting) return;
    setSubmitError("");

    const email = contact.email.trim();
    if (!isValidEmail(email)) {
      setEmailError(email ? "Bitte gib eine gültige E-Mail-Adresse ein." : "Bitte gib deine E-Mail-Adresse ein.");
      emailRef.current?.focus();
      return;
    }
    setEmailError("");

    if (!turnstileToken) {
      setSubmitError("turnstile");
      return;
    }

    setSubmitting(true);
    try {
      const response = await sendEmail({ ...answers, ...contact, email, turnstileToken });
      setConfirmationSent(response.data.confirmationSent === true);
      track("contact_funnel_submit", {
        services: answers.services.join(","),
        goals: answers.goals.join(","),
        budget: answers.budget || "none",
        timeframe: answers.timeframe || "none",
      });
      goTo(DONE_STEP, "forward");
    } catch (error) {
      console.log(error);
      setSubmitError("send");
      resetTurnstile();
    } finally {
      setSubmitting(false);
    }
  };

  const title = STEPS.find((item) => item.step === step)?.title ?? "";
  const summary = [
    answers.services.map((service) => labelOf(SERVICES, service)).join(", "),
    answers.goals.map((goal) => labelOf(GOALS, goal)).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Anfrage in drei Schritten"
      // Paddings leave room for the 300px wide Turnstile widget from 360px viewports on.
      className="flex flex-col gap-5 w-full lg:w-5/12 lg:min-w-[23rem] lg:shrink-0 rounded-[10px] bg-white p-3 shadow-[0_25px_100px_rgba(76,64,247,0.08)] ring-1 ring-[#F6ECFA] min-[400px]:p-4 sm:p-6 xl:p-8"
    >
      {/* Progress */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-[#556987]">
          {step === DONE_STEP ? "Geschafft" : `Schritt ${step} von ${LAST_INPUT_STEP}`}
        </p>
        <div
          role="progressbar"
          aria-label="Fortschritt der Anfrage"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent(step)}
          aria-valuetext={step === DONE_STEP ? "Anfrage gesendet" : `Schritt ${step} von ${LAST_INPUT_STEP}: ${title}`}
          className="h-1.5 w-full overflow-hidden rounded-full bg-[#F3E8F9]"
        >
          <div
            className="h-full rounded-full bg-[#B718EC] transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${progressPercent(step)}%` }}
          />
        </div>
      </div>

      {/* key: restarts the enter animation on every step change */}
      <div key={step} className="flex flex-col gap-5 motion-safe:animate-step-in">
        <h3
          ref={headingRef}
          tabIndex={-1}
          className="font-bold text-xl text-[#000D36] focus:outline-none lg:text-2xl"
        >
          {title}
        </h3>

        {step === 1 && (
          <div role="group" aria-label="Leistungen, Mehrfachauswahl möglich" className="flex flex-col gap-3">
            <p className="text-sm text-[#556987]">Mehrfachauswahl möglich.</p>
            <div className="grid grid-cols-2 gap-3">
              {SERVICES.filter((service) => service.value !== UNSURE).map((service) => {
                const selected = answers.services.includes(service.value);
                const tile = SERVICE_TILES[service.value as keyof typeof SERVICE_TILES];
                return (
                  <button
                    key={service.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleServiceToggle(service.value)}
                    className={`relative flex min-h-28 flex-col items-center justify-center gap-2 rounded-[10px] border-2 px-2 py-4 text-center transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] ${
                      selected ? "border-[#B718EC] bg-[#FDF5FF]" : "border-[#F0E6F4] bg-white hover:border-[#D9A5EE]"
                    }`}
                  >
                    {selected && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#B718EC] text-white" aria-hidden>
                        <MdCheck className="h-4 w-4" />
                      </span>
                    )}
                    <Image src={tile.icon} alt="" width={32} height={32} />
                    <span className="text-sm font-semibold leading-tight hyphens-auto" lang="de" style={{ color: tile.color }}>
                      {service.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <ChoiceChip
              selected={answers.services.includes(UNSURE)}
              onToggle={() => handleServiceToggle(UNSURE)}
              className="flex items-center justify-center gap-2"
            >
              <MdHelpOutline className="h-5 w-5 text-[#B718EC]" aria-hidden />
              {labelOf(SERVICES, UNSURE)}
            </ChoiceChip>
          </div>
        )}

        {step === 2 && (
          <>
            <fieldset>
              <legend className="mb-3 text-sm font-normal text-[#556987]">Mehrfachauswahl möglich.</legend>
              <div className="flex flex-wrap gap-2">
                {goalsForServices(answers.services).map((goal) => (
                  <ChoiceChip key={goal.value} selected={answers.goals.includes(goal.value)} onToggle={() => handleGoalToggle(goal.value)}>
                    {goal.label}
                  </ChoiceChip>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-sm font-bold text-[#2A3342]">Budgetrahmen (optional)</legend>
              <div className="flex flex-wrap gap-2">
                {BUDGETS.map((budget) => (
                  <ChoiceChip key={budget.value} selected={answers.budget === budget.value} onToggle={() => handleChoice("budget", budget.value)}>
                    {budget.label}
                  </ChoiceChip>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-sm font-bold text-[#2A3342]">Gewünschter Start (optional)</legend>
              <div className="flex flex-wrap gap-2">
                {TIMEFRAMES.map((timeframe) => (
                  <ChoiceChip key={timeframe.value} selected={answers.timeframe === timeframe.value} onToggle={() => handleChoice("timeframe", timeframe.value)}>
                    {timeframe.label}
                  </ChoiceChip>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {step === 3 && (
          <>
            {summary && (
              <p className="rounded-lg bg-[#FDF5FF] px-3 py-2 text-sm text-[#556987]">
                <span className="font-medium text-[#2A3342]">Deine Auswahl:</span> {summary}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <label htmlFor="name">Name</label>
                <input className={INPUT_CLASS} id="name" name="name" type="text" autoComplete="name" maxLength={NAME_MAX_LENGTH} placeholder="Dein Name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
              </div>
              <div>
                <label htmlFor="company">Unternehmen (Optional)</label>
                <input className={INPUT_CLASS} id="company" name="company" type="text" autoComplete="organization" maxLength={COMPANY_MAX_LENGTH} placeholder="Dein Unternehmen" value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} />
              </div>
            </div>
            <div>
              <label htmlFor="email">E-Mail*</label>
              <input
                ref={emailRef}
                className={`${INPUT_CLASS} ${emailError ? "ring-2 ring-red-500" : ""}`}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={EMAIL_MAX_LENGTH}
                placeholder="Deine E-Mail Adresse"
                required
                aria-required
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? "email-error" : undefined}
                value={contact.email}
                onChange={(e) => {
                  setContact({ ...contact, email: e.target.value });
                  if (emailError) setEmailError("");
                }}
              />
              {emailError && (
                <p id="email-error" role="alert" className="mt-2 text-sm text-red-600">
                  {emailError}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <label htmlFor="number">Telefonnummer (Optional)</label>
                <input className={INPUT_CLASS} id="number" name="number" type="tel" autoComplete="tel" maxLength={NUMBER_MAX_LENGTH} placeholder="Deine Telefonnummer" value={contact.number} onChange={(e) => setContact({ ...contact, number: e.target.value })} />
              </div>
              <div>
                <label htmlFor="location">Stadt / Ort (Optional)</label>
                <input className={INPUT_CLASS} id="location" name="location" type="text" autoComplete="address-level2" maxLength={LOCATION_MAX_LENGTH} placeholder="z. B. Aachen" value={contact.location} onChange={(e) => setContact({ ...contact, location: e.target.value })} />
              </div>
            </div>
            <div>
              <label htmlFor="message">Nachricht (Optional)</label>
              <textarea className={`${INPUT_CLASS} h-24 resize-none pt-2`} id="message" name="message" maxLength={MESSAGE_MAX_LENGTH} placeholder="Gibt es noch etwas, das wir wissen sollten?" value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} />
            </div>
            <TurnstileWidget
              key={turnstileKey}
              onVerify={(token) => {
                setTurnstileToken(token);
                // The widget re-verifies after a failed send: keep that error visible.
                setSubmitError((error) => (error === "turnstile" ? "" : error));
              }}
              onExpire={() => setTurnstileToken("")}
              onError={() => setTurnstileToken("")}
            />
            {submitError === "turnstile" && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Bitte bestätige, dass du kein Roboter bist.
              </p>
            )}
            {submitError === "send" && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Das hat leider nicht geklappt. Bitte versuch es noch einmal oder schreib uns direkt an{" "}
                <a href={`mailto:${EMAIL}`} className="underline">
                  {EMAIL}
                </a>
                .
              </p>
            )}
          </>
        )}

        {step === DONE_STEP && (
          <div className="flex flex-col items-start gap-4">
            <MdCheckCircle className="h-12 w-12 text-[#B718EC]" aria-hidden />
            <p className="text-base text-[#556987]">
              Deine Anfrage ist bei uns angekommen – wir melden uns so schnell wie möglich bei dir.{confirmationSent && " Eine Bestätigung mit deinen Angaben ist unterwegs in dein Postfach."} Du möchtest nicht warten? Dann such dir direkt einen Termin für dein kostenloses Erstgespräch aus.
            </p>
            <CtaLink
              className="w-full text-center text-base font-medium bg-[#B718EC] text-[#F0FDF4] py-3 px-6 rounded-2xl hover:scale-95 transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] sm:w-fit"
            >
              Jetzt Termin buchen
            </CtaLink>
            <p className="text-sm text-[#556987]">
              Neugierig, wie wir arbeiten?{" "}
              <Link href={CASE_STUDY.href} className="font-medium text-[#B718EC] underline">
                {CASE_STUDY.label}
              </Link>
            </p>
          </div>
        )}

        {stepError && (
          <p role="alert" className="text-sm text-red-600">
            {stepError}
          </p>
        )}

        {step !== DONE_STEP && (
          <div className="flex items-center justify-between gap-3">
            {step > FIRST_STEP ? (
              <button
                type="button"
                onClick={() => goTo(prevStep(step), "back")}
                className="min-h-11 rounded-[10px] px-3 text-sm font-medium text-[#556987] hover:text-[#B718EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC]"
              >
                ← Zurück
              </button>
            ) : (
              <span />
            )}
            {step === LAST_INPUT_STEP ? (
              <button type="submit" disabled={submitting} className={PRIMARY_BUTTON_CLASS}>
                {submitting ? "Wird gesendet …" : "Anfrage senden"}
              </button>
            ) : (
              <button type="button" onClick={handleNext} className={PRIMARY_BUTTON_CLASS}>
                Weiter
              </button>
            )}
          </div>
        )}

        {step === LAST_INPUT_STEP && (
          <p className="text-xs text-[#556987]">
            Wir verwenden deine Angaben ausschließlich, um deine Anfrage zu bearbeiten. Mehr dazu in unserer{" "}
            <Link href="/datenschutz" className="underline hover:text-[#B718EC]">
              Datenschutzerklärung
            </Link>
            .
          </p>
        )}
      </div>
    </form>
  );
};

export default ContactFunnel;
