import {
  useState,
  type ChangeEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ConsentFileError,
  PHOTO_ACCEPT,
  preparePhoto,
  type PreparedFile,
} from "@/lib/applications/clientFile";
import { inspectVideo, videoType } from "@/lib/applications/clientVideo";
import {
  PHONE_COUNTRIES,
  PINNED_PHONE_COUNTRIES,
  flagEmoji,
  phoneCountry,
} from "@/lib/applications/phone";
import type { ApplicationErrors } from "@/lib/applications/types";

// Building blocks shared by the application forms (/bewerben and
// /bewerben/creator), so both look and behave the same.

export const inputClass =
  "w-full rounded-xl border border-[#E4D3EC] bg-white px-4 py-3 text-base text-[#000D36] placeholder:text-[#a99fb0] focus:border-[#B718EC] focus:outline-none focus:ring-2 focus:ring-[#B718EC]/30 aria-[invalid=true]:border-red-500";
export const labelClass = "mb-1.5 block text-sm font-medium text-[#000D36]";
export const optionalMark = (
  <span className="font-normal text-[#8a7791]"> (optional)</span>
);
export const fileInputClass =
  "block w-full cursor-pointer rounded-xl border border-dashed border-[#d8c7e0] bg-white p-3 text-sm text-[#556987] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#B718EC] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] aria-[invalid=true]:border-red-500";

export type PhotoItem = PreparedFile & { previewUrl: string };

/**
 * Selected photos, shrunk in the browser one by one. `onError` receives a
 * user-facing message (or "" to clear the previous one).
 */
export function usePhotos(
  max: number,
  onError: (message: string) => void,
  prepare: (file: File) => Promise<PhotoItem> = preparePhoto,
) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [busy, setBusy] = useState(false);

  const add = async (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = [...(e.target.files ?? [])];
    e.target.value = "";
    onError("");
    if (chosen.length === 0) return;

    const free = max - photos.length;
    if (chosen.length > free) {
      onError(`Du kannst höchstens ${max} Fotos hochladen.`);
    }

    setBusy(true);
    try {
      for (const file of chosen.slice(0, Math.max(0, free))) {
        const prepared = await prepare(file);
        setPhotos((prev) => [...prev, prepared]);
      }
    } catch (err) {
      onError(
        err instanceof ConsentFileError
          ? err.message
          : "Das Foto konnte nicht gelesen werden.",
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    onError("");
  };

  return { photos, busy, add, remove };
}

/**
 * aria-invalid / aria-describedby and the message element for field errors,
 * bound to one form instance.
 */
export function fieldErrors(formId: string, errors: ApplicationErrors) {
  const errorProps = (key: string, ...more: string[]) => {
    const keys = [key, ...more].filter((k) => errors[k]);
    return {
      "aria-invalid": keys.length > 0 ? (true as const) : undefined,
      "aria-describedby":
        keys.map((k) => `${formId}-${k}-error`).join(" ") || undefined,
    };
  };
  const errorFor = (key: string) =>
    errors[key] ? (
      <p id={`${formId}-${key}-error`} className="mt-1.5 text-sm text-red-600">
        {errors[key]}
      </p>
    ) : null;
  return { errorProps, errorFor };
}

type ErrorProps = ReturnType<ReturnType<typeof fieldErrors>["errorProps"]>;

/** Checkbox with a (long) label text, e.g. a consent. */
export function CheckboxField({
  id,
  checked,
  onChange,
  invalidProps,
  error,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  invalidProps: ErrorProps;
  error: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-[#000D36]">
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#B718EC]"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          {...invalidProps}
        />
        <span>{children}</span>
      </label>
      {error}
    </div>
  );
}

/** Social handle with a fixed "@" in front; pasted profile links work too. */
export function HandleField({
  name,
  label,
  value,
  onChange,
  invalidProps,
  error,
  optional = true,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  invalidProps: ErrorProps;
  error: ReactNode;
  optional?: boolean;
}) {
  return (
    <div>
      <label className={labelClass} htmlFor={`f-${name}`}>
        {label}
        {optional && optionalMark}
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
          value={value}
          onChange={onChange}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={120}
          placeholder="deinname"
          {...invalidProps}
        />
      </div>
      {error}
    </div>
  );
}

/**
 * Phone number with a country code picker on the left (flag + code; the
 * native list opens the phone's own picker). The number field holds what
 * was typed; combine both with combinePhone() before validating.
 */
export function PhoneField({
  id,
  country,
  onCountryChange,
  value,
  onChange,
  placeholder,
  invalidProps,
  required,
  autoComplete = "tel",
}: {
  id: string;
  autoComplete?: string;
  country: string;
  onCountryChange: (code: string) => void;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  invalidProps: { "aria-invalid"?: true; "aria-describedby"?: string };
  required?: boolean;
}) {
  const selected = phoneCountry(country);
  return (
    <div className="flex gap-2">
      <div className="relative shrink-0 rounded-xl border border-[#E4D3EC] bg-white has-[:focus-visible]:border-[#B718EC] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#B718EC]/30">
        <span
          className="pointer-events-none flex h-full items-center gap-1.5 px-3 text-base text-[#000D36]"
          aria-hidden
        >
          <span className="text-xl leading-none">{flagEmoji(selected.code)}</span>
          <span>+{selected.dial}</span>
          <span className="text-xs text-[#8a7791]">▾</span>
        </span>
        <select
          id={`${id}-country`}
          aria-label="Ländervorwahl"
          value={selected.code}
          onChange={(e) => onCountryChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {PINNED_PHONE_COUNTRIES.map((code) => {
            const c = phoneCountry(code);
            return (
              <option key={`pinned-${code}`} value={code}>
                {flagEmoji(code)} {c.name} (+{c.dial})
              </option>
            );
          })}
          <option disabled value="">
            ──────────
          </option>
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {flagEmoji(c.code)} {c.name} (+{c.dial})
            </option>
          ))}
        </select>
      </div>
      <input
        id={id}
        type="tel"
        className={`${inputClass} min-w-0 flex-1`}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        inputMode="tel"
        maxLength={30}
        placeholder={placeholder}
        required={required}
        {...invalidProps}
      />
    </div>
  );
}

/** Birth date as three numeric fields (TT / MM / JJJJ). */
export function BirthDateFields({
  day,
  month,
  year,
  onChange,
  monthRef,
  yearRef,
  invalidProps,
  error,
}: {
  day: string;
  month: string;
  year: string;
  onChange: (
    name: "birthDay" | "birthMonth" | "birthYear",
    maxLength: number,
  ) => (e: ChangeEvent<HTMLInputElement>) => void;
  monthRef: RefObject<HTMLInputElement | null>;
  yearRef: RefObject<HTMLInputElement | null>;
  invalidProps: ErrorProps;
  error: ReactNode;
}) {
  const values = { birthDay: day, birthMonth: month, birthYear: year };
  return (
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
            <label className="mb-1 block text-xs text-[#556987]" htmlFor={`f-${name}`}>
              {label}
            </label>
            <input
              id={`f-${name}`}
              ref={ref}
              className={`${inputClass} text-center`}
              value={values[name]}
              onChange={onChange(name, length)}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete={autoComplete}
              placeholder={placeholder}
              maxLength={length}
              required
              {...invalidProps}
            />
          </div>
        ))}
      </div>
      {error}
    </fieldset>
  );
}

/**
 * Photo selection from the phone's photo library (or camera / files): a
 * grid of previews plus an "add" tile. The parent converts and stores the
 * files.
 */
export function PhotoPicker({
  photos,
  max,
  busy,
  onAdd,
  onRemove,
  invalidProps,
  error,
  hint,
}: {
  photos: PhotoItem[];
  max: number;
  busy: boolean;
  onAdd: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  invalidProps: ErrorProps;
  error: ReactNode;
  hint?: ReactNode;
}) {
  const full = photos.length >= max;
  const empty = photos.length === 0;
  return (
    <div>
      <ul className={empty ? "grid grid-cols-1" : "grid grid-cols-3 gap-2.5"}>
        {photos.map((photo, index) => (
          <li key={photo.previewUrl} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img
              src={photo.previewUrl}
              alt={`Ausgewähltes Foto ${index + 1}`}
              className="aspect-[3/4] w-full rounded-xl object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Foto ${index + 1} entfernen`}
              className="absolute -right-1.5 -top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#000D36] text-base font-bold text-white shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC]"
            >
              ×
            </button>
          </li>
        ))}
        {!full && (
          <li>
            <label
              className={`flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed bg-white p-2 text-center text-[#B718EC] motion-safe:transition hover:bg-[#FDF5FF] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#B718EC]/40 ${
                empty ? "min-h-40 py-8" : "aspect-[3/4]"
              } ${
                invalidProps["aria-invalid"] ? "border-red-400" : "border-[#d8c7e0]"
              } ${busy ? "cursor-wait opacity-60" : ""}`}
            >
              <span className={empty ? "text-4xl leading-none" : "text-3xl leading-none"} aria-hidden>
                {busy ? "⏳" : empty ? "📷" : "+"}
              </span>
              <span className={empty ? "text-base font-semibold" : "text-xs font-semibold"}>
                {busy ? "Wird verkleinert …" : empty ? "Fotos auswählen" : "Weitere Fotos"}
              </span>
              {empty && !busy && (
                <span className="text-xs text-[#8a7791]">
                  aus deiner Fotos-App, der Kamera oder deinen Dateien
                </span>
              )}
              <input
                id="f-photos"
                type="file"
                multiple
                accept={PHOTO_ACCEPT}
                onChange={onAdd}
                disabled={busy}
                className="sr-only"
                {...invalidProps}
              />
            </label>
          </li>
        )}
      </ul>
      <p className="mt-2 text-xs text-[#8a7791]" aria-live="polite">
        {busy
          ? "Fotos werden verkleinert …"
          : `${photos.length} von ${max} Fotos ausgewählt.`}{" "}
        {hint}
      </p>
      {error}
    </div>
  );
}

export interface VideoItem {
  file: File;
  contentType: string;
  /** Object URL of the cover frame ("" when the browser can't read the video) */
  previewUrl: string;
  cover: Blob | null;
}

/** Selected videos: format and size checked, a cover frame taken right away. */
export function useVideos(max: number, maxBytes: number, onError: (message: string) => void) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [busy, setBusy] = useState(false);

  const add = async (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = [...(e.target.files ?? [])];
    e.target.value = "";
    onError("");
    if (chosen.length === 0) return;
    const free = max - videos.length;
    const problems: string[] = [];
    if (chosen.length > free) problems.push(`Du kannst höchstens ${max} Videos hochladen.`);

    setBusy(true);
    try {
      for (const file of chosen.slice(0, Math.max(0, free))) {
        const contentType = videoType(file);
        if (!contentType) {
          problems.push(`${file.name}: Bitte ein MP4-, MOV- oder WebM-Video wählen.`);
          continue;
        }
        if (file.size > maxBytes) {
          problems.push(
            `${file.name} ist größer als ${Math.round(maxBytes / 1024 ** 2)} MB – bitte kürzen oder kleiner exportieren.`,
          );
          continue;
        }
        const { cover } = await inspectVideo(file);
        setVideos((prev) => [
          ...prev,
          { file, contentType, cover, previewUrl: cover ? URL.createObjectURL(cover) : "" },
        ]);
      }
    } finally {
      setBusy(false);
      if (problems.length > 0) onError(problems.join(" "));
    }
  };

  const remove = (index: number) => {
    setVideos((prev) => {
      if (prev[index].previewUrl) URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
    onError("");
  };

  return { videos, busy, add, remove };
}

const formatMb = (bytes: number) =>
  `${(bytes / 1024 ** 2).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;

/** Optional videos (from the photo library): covers, size, remove, add. */
export function VideoPicker({
  videos,
  max,
  busy,
  onAdd,
  onRemove,
  invalidProps,
  error,
  hint,
}: {
  videos: VideoItem[];
  max: number;
  busy: boolean;
  onAdd: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
  invalidProps: ErrorProps;
  error: ReactNode;
  hint?: ReactNode;
}) {
  const full = videos.length >= max;
  return (
    <div>
      <ul className="grid grid-cols-3 gap-2.5">
        {videos.map((video, index) => (
          <li key={`${video.file.name}-${index}`} className="relative">
            <div className="flex aspect-[9/16] w-full items-center justify-center overflow-hidden rounded-xl bg-[#000D36] text-3xl">
              {video.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                <img src={video.previewUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span aria-hidden>🎬</span>
              )}
            </div>
            <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-[#000D36]">
              {formatMb(video.file.size)}
            </span>
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Video ${index + 1} entfernen`}
              className="absolute -right-1.5 -top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#000D36] text-base font-bold text-white shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC]"
            >
              ×
            </button>
          </li>
        ))}
        {!full && (
          <li className={videos.length === 0 ? "col-span-3" : undefined}>
            <label
              className={`flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed bg-white p-2 text-center text-[#B718EC] motion-safe:transition hover:bg-[#FDF5FF] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#B718EC]/40 ${
                videos.length === 0 ? "py-5" : "aspect-[9/16]"
              } ${invalidProps["aria-invalid"] ? "border-red-400" : "border-[#d8c7e0]"} ${
                busy ? "cursor-wait opacity-60" : ""
              }`}
            >
              <span className="text-2xl leading-none" aria-hidden>
                {busy ? "⏳" : videos.length === 0 ? "🎬" : "+"}
              </span>
              <span className="text-sm font-semibold">
                {busy ? "Wird geprüft …" : videos.length === 0 ? "Videos auswählen" : "Weitere"}
              </span>
              <input
                id="f-videos"
                type="file"
                multiple
                accept="video/*,.mov,.mp4,.m4v,.webm"
                onChange={onAdd}
                disabled={busy}
                className="sr-only"
                {...invalidProps}
              />
            </label>
          </li>
        )}
      </ul>
      <p className="mt-2 text-xs text-[#8a7791]" aria-live="polite">
        {videos.length} von {max} Videos. {hint}
      </p>
      {error}
    </div>
  );
}
