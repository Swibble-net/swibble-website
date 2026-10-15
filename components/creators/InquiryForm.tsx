import Link from "next/link";
import { useId, useState, useSyncExternalStore, type FormEvent } from "react";
import TurnstileWidget from "@/components/TurnstileWidget";
import { fieldErrors, inputClass, labelClass, optionalMark } from "@/components/applications/formParts";
import { INQUIRY_MESSAGE_MAX_LENGTH, validateCreatorInquiry } from "@/lib/creators/inquiry";

const subscribeNever = () => () => {};

/** Booking inquiry for one creator; goes to Swibble by mail. */
const InquiryForm = ({ slug, creatorName }: { slug: string; creatorName: string }) => {
  const formId = useId();
  const turnstileRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const [fields, setFields] = useState({
    company: "",
    name: "",
    email: "",
    phone: "",
    message: "",
    website: "", // honeypot
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);

  const set = (key: keyof typeof fields) => (e: { target: { value: string } }) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    setFormError("");

    const result = validateCreatorInquiry(fields);
    const found: Record<string, string> = result.ok ? {} : { ...result.errors };
    if (turnstileRequired && !turnstileToken) {
      found.turnstile = "Bitte warte kurz, bis die Spam-Prüfung abgeschlossen ist.";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const first = ["company", "name", "email", "phone", "message", "turnstile"].find((k) => found[k]);
      document.getElementById(`i-${first}`)?.focus();
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/creators/${encodeURIComponent(slug)}/inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, turnstileToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSent(true);
        return;
      }
      if (data.errors) setErrors(data.errors);
      setFormError(data.message || "Das hat leider nicht geklappt. Bitte versuch es noch einmal.");
      setTurnstileToken("");
      setTurnstileKey((k) => k + 1);
    } catch {
      setFormError("Keine Verbindung. Bitte prüf dein Netz und versuch es noch einmal.");
      setTurnstileToken("");
      setTurnstileKey((k) => k + 1);
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl bg-[#FDF5FF] p-6 text-center" aria-live="polite">
        <p className="text-4xl" aria-hidden>
          🎉
        </p>
        <p className="mt-2 text-lg font-bold text-[#000D36]">Danke, deine Anfrage ist da!</p>
        <p className="mt-1 text-sm text-[#556987]">Wir melden uns schnellstmöglich bei dir.</p>
      </div>
    );
  }

  const { errorProps, errorFor } = fieldErrors(formId, errors);
  const field = (
    key: "company" | "name" | "email" | "phone",
    label: string,
    props: Record<string, string> = {},
    optional = false,
  ) => (
    <div>
      <label className={labelClass} htmlFor={`i-${key}`}>
        {label}
        {optional ? optionalMark : "*"}
      </label>
      <input
        id={`i-${key}`}
        className={inputClass}
        value={fields[key]}
        onChange={set(key)}
        maxLength={key === "email" ? 254 : 100}
        {...props}
        {...errorProps(key)}
      />
      {errorFor(key)}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} method="post" noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field("company", "Unternehmen", { autoComplete: "organization" })}
        {field("name", "Dein Name", { autoComplete: "name" })}
        {field("email", "E-Mail", { type: "email", autoComplete: "email", inputMode: "email" })}
        {field("phone", "Telefon", { type: "tel", autoComplete: "tel", inputMode: "tel" }, true)}
      </div>
      <div>
        <label className={labelClass} htmlFor="i-message">
          Worum geht es?*
        </label>
        <textarea
          id="i-message"
          className={`${inputClass} min-h-28 resize-y`}
          value={fields.message}
          onChange={set("message")}
          maxLength={INQUIRY_MESSAGE_MAX_LENGTH}
          placeholder={`Projekt, Zeitraum, Ort – z. B. Shooting mit ${creatorName} im Mai in Köln`}
          {...errorProps("message")}
        />
        {errorFor("message")}
      </div>

      {/* Honeypot: hidden from people, tempting for bots */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label htmlFor="i-website">Website (bitte leer lassen)</label>
        <input id="i-website" tabIndex={-1} autoComplete="off" value={fields.website} onChange={set("website")} />
      </div>

      <div id="i-turnstile" tabIndex={-1} className="focus:outline-none">
        <TurnstileWidget
          key={turnstileKey}
          onVerify={(token) => {
            setTurnstileToken(token);
            setErrors(({ turnstile: _drop, ...rest }) => rest);
          }}
          onExpire={() => setTurnstileToken("")}
          onError={() => setTurnstileToken("")}
        />
        {errorFor("turnstile")}
      </div>

      {formError && (
        <p role="alert" className="rounded-xl bg-red-50 p-3.5 text-sm font-medium text-red-700">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={!hydrated || sending}
        className="min-h-12 rounded-2xl bg-[#B718EC] px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-purple-200 hover:bg-[#a514d6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {sending ? "Wird gesendet …" : "Anfrage senden"}
      </button>
      <p className="text-xs text-[#8a7791]">
        Wir nutzen deine Angaben nur für diese Anfrage.{" "}
        <Link href="/datenschutz" className="underline">
          Datenschutz
        </Link>
      </p>
    </form>
  );
};

export default InquiryForm;
