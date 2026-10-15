import { useState } from "react";
import { CREATOR_ROLES, roleLabel, type CreatorRole } from "@/lib/applications/config";
import type { CreatorProfile } from "@/lib/creators/types";

/**
 * Services of one creator (Model, Content Creator, Moderation, Promoter:in)
 * as switches. Each click is saved right away; the last active service
 * can't be switched off.
 */
const CreatorRoleToggles = ({
  creatorId,
  roles,
  onSaved,
  onUnauthorized,
  size = "md",
}: {
  creatorId: string;
  roles: CreatorRole[];
  onSaved: (creator: CreatorProfile) => void;
  onUnauthorized: () => void;
  size?: "sm" | "md";
}) => {
  const [busy, setBusy] = useState<CreatorRole | null>(null);
  const [error, setError] = useState("");

  const toggle = async (role: CreatorRole) => {
    const next = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
    setBusy(role);
    setError("");
    try {
      const res = await fetch(`/api/admin/creators/${encodeURIComponent(creatorId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: next }),
      });
      if (res.status === 401) return onUnauthorized();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Speichern fehlgeschlagen.");
      onSaved(data.creator);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  };

  const pill = size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-sm";
  return (
    <div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Leistungen">
        {CREATOR_ROLES.map(({ id }) => {
          const active = roles.includes(id);
          const last = active && roles.length === 1;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              disabled={busy !== null || last}
              title={last ? "Mindestens eine Leistung bleibt aktiv" : undefined}
              onClick={() => toggle(id)}
              className={`rounded-full font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] disabled:cursor-not-allowed ${pill} ${
                active
                  ? "bg-[#B718EC] text-white hover:bg-[#a514d6]"
                  : "border border-[#E4D3EC] bg-white text-[#8a7791] line-through decoration-1 hover:border-[#B718EC] hover:text-[#B718EC]"
              } ${busy === id ? "opacity-60" : ""}`}
            >
              {roleLabel(id, "creator")}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default CreatorRoleToggles;
