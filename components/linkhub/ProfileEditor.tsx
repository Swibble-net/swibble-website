import { useRouter } from "next/router";
import Link from "next/link";
import { FormEvent, useState } from "react";
import type { LinkhubProfile, LinkhubLink } from "@/lib/linkhub/types";

interface Props {
  profile?: LinkhubProfile;
}

const inputClass =
  "w-full rounded-lg bg-[#F6F6F6] px-3 py-2 text-sm text-[#2A3342] focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-[#2A3342]";

function newLink(): LinkhubLink {
  return {
    id: Math.random().toString(36).slice(2),
    icon: "🔗",
    label: "",
    sublabel: "",
    href: "",
    external: true,
    accent: false,
  };
}

const ProfileEditor = ({ profile }: Props) => {
  const router = useRouter();
  const isEdit = Boolean(profile);

  const [name, setName] = useState(profile?.name ?? "");
  const [slug, setSlug] = useState(profile?.slug ?? "");
  const [subtitle, setSubtitle] = useState(profile?.subtitle ?? "");
  const [links, setLinks] = useState<LinkhubLink[]>(
    profile?.links.length ? profile.links : [newLink()],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* ── link helpers ─────────────────────────────────────────────────── */

  const updateLink = (id: string, patch: Partial<LinkhubLink>) => {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  };

  const removeLink = (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const moveLink = (index: number, direction: -1 | 1) => {
    setLinks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  /* ── submit ───────────────────────────────────────────────────────── */

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name ist erforderlich.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        isEdit ? `/api/linkhub/${profile!.id}` : "/api/linkhub",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            slug: slug.trim() || undefined,
            subtitle: subtitle.trim() || undefined,
            links: links.map(({ id, ...rest }) => ({ id, ...rest })),
          }),
        },
      );

      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Speichern fehlgeschlagen.");

      router.push("/admin/linkhub");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setSaving(false);
    }
  };

  /* ── render ───────────────────────────────────────────────────────── */

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#000D36]">
          {isEdit ? "Profil bearbeiten" : "Neues Profil"}
        </h1>
        <Link
          href="/admin/linkhub"
          className="text-sm font-medium text-[#556987] hover:text-[#b718ec]"
        >
          Abbrechen
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Profile meta */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="name">
            Name*
          </label>
          <input
            id="name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="slug">
            Slug (URL-Pfad)
          </label>
          <input
            id="slug"
            className={inputClass}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="z. B. swibble → /linkhub/swibble"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="subtitle">
            Tagline (optional)
          </label>
          <input
            id="subtitle"
            className={inputClass}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Deine Digitalagentur aus Aachen"
          />
        </div>
      </div>

      {/* Links */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#000D36]">Links</h2>
          <span className="text-xs text-[#8a7791]">
            Reihenfolge mit ↑ ↓ anpassen
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {links.map((link, i) => (
            <div
              key={link.id}
              className="rounded-xl border border-[#F0E4F5] bg-white p-4"
            >
              {/* Row 1 — icon + label + reorder + delete */}
              <div className="flex items-center gap-2">
                <input
                  aria-label="Icon"
                  className="w-12 rounded-lg bg-[#F6F6F6] px-2 py-2 text-center text-sm focus:outline-none"
                  value={link.icon}
                  onChange={(e) => updateLink(link.id, { icon: e.target.value })}
                  maxLength={4}
                />
                <input
                  aria-label="Label"
                  className={`${inputClass} flex-1`}
                  placeholder="Linktext*"
                  value={link.label}
                  onChange={(e) =>
                    updateLink(link.id, { label: e.target.value })
                  }
                  required
                />
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveLink(i, -1)}
                    disabled={i === 0}
                    aria-label="Nach oben"
                    className="flex h-7 w-7 items-center justify-center rounded text-[#556987] hover:bg-[#F6F6F6] disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLink(i, 1)}
                    disabled={i === links.length - 1}
                    aria-label="Nach unten"
                    className="flex h-7 w-7 items-center justify-center rounded text-[#556987] hover:bg-[#F6F6F6] disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeLink(link.id)}
                    aria-label="Link entfernen"
                    className="flex h-7 w-7 items-center justify-center rounded text-red-400 hover:bg-red-50"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Row 2 — sublabel + href */}
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  aria-label="Sublabel"
                  className={inputClass}
                  placeholder="Kurzbeschreibung (optional)"
                  value={link.sublabel}
                  onChange={(e) =>
                    updateLink(link.id, { sublabel: e.target.value })
                  }
                />
                <input
                  aria-label="URL"
                  className={inputClass}
                  placeholder="https://…"
                  value={link.href}
                  onChange={(e) =>
                    updateLink(link.id, { href: e.target.value })
                  }
                  required
                />
              </div>

              {/* Row 3 — flags */}
              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#2A3342]">
                  <input
                    type="checkbox"
                    checked={link.accent}
                    onChange={(e) =>
                      updateLink(link.id, { accent: e.target.checked })
                    }
                    className="accent-[#b718ec]"
                  />
                  Hervorheben (lila)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-[#2A3342]">
                  <input
                    type="checkbox"
                    checked={link.external}
                    onChange={(e) =>
                      updateLink(link.id, { external: e.target.checked })
                    }
                    className="accent-[#b718ec]"
                  />
                  In neuem Tab öffnen
                </label>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setLinks((prev) => [...prev, newLink()])}
          className="mt-3 w-full rounded-xl border border-dashed border-[#d8c7e0] py-3 text-sm font-medium text-[#b718ec] transition hover:border-[#b718ec] hover:bg-[#FDF5FF]"
        >
          + Link hinzufügen
        </button>
      </div>

      {/* Save */}
      <div className="mt-8 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-[10px] bg-[#B718EC] px-6 py-3 text-sm font-medium text-[#F0FDF4] transition duration-200 hover:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Speichern…" : isEdit ? "Aktualisieren" : "Erstellen"}
        </button>
      </div>
    </form>
  );
};

export default ProfileEditor;
