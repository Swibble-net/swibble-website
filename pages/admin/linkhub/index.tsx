import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import type { GetServerSideProps } from "next";
import { isAuthenticated } from "@/lib/adminAuth";
import { getAllProfiles } from "@/lib/linkhub/profiles";
import { isFirebaseConfigured } from "@/lib/firebaseAdmin";
import type { LinkhubProfile } from "@/lib/linkhub/types";

interface Props {
  profiles: LinkhubProfile[];
  configured: boolean;
}

const AdminLinkhub = ({ profiles, configured }: Props) => {
  const router = useRouter();
  const [items, setItems] = useState(profiles);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Profil „${name}" wirklich löschen?`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/linkhub/${id}`, { method: "DELETE" });
      if (res.status === 401) { router.push("/admin/login"); return; }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Löschen fehlgeschlagen.");
      }
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Head>
        <title>Linkhub verwalten – Swibble CMS</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <section className="mx-auto w-full max-w-4xl">
        {/* Section nav */}
        <div className="mb-6 flex gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-[#F0E4F5] px-3 py-1.5 text-sm font-medium text-[#556987] transition hover:border-[#b718ec] hover:text-[#b718ec]"
          >
            Blog
          </Link>
          <span className="rounded-lg bg-[#B718EC] px-3 py-1.5 text-sm font-medium text-white">
            Linkhub
          </span>
          <Link
            href="/admin/videos"
            className="rounded-lg border border-[#F0E4F5] px-3 py-1.5 text-sm font-medium text-[#556987] transition hover:border-[#b718ec] hover:text-[#b718ec]"
          >
            Videos
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-[#000D36]">
            Linkhub verwalten
          </h1>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <Link
              href="/admin/linkhub/new"
              className="rounded-[10px] bg-[#B718EC] px-4 py-2 text-sm font-medium text-[#F0FDF4] transition duration-200 hover:scale-95"
            >
              + Neues Profil
            </Link>
          </div>
        </div>

        {!configured && (
          <p className="mb-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
            Firebase ist noch nicht konfiguriert. Lege die{" "}
            <code className="mx-1">FIREBASE_*</code> Variablen in{" "}
            <code>.env.local</code> an.
          </p>
        )}

        {items.length === 0 ? (
          <p className="rounded-xl bg-[#FDF5FF] p-6 text-center text-[#556987]">
            Noch keine Profile. Erstelle dein erstes Linkhub-Profil.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((profile) => (
              <div
                key={profile.id}
                className="rounded-xl border border-[#F0E4F5] bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#000D36]">
                      {profile.name}
                    </p>
                    <p className="text-xs text-[#8a7791]">
                      /linkhub/
                      <span className="font-medium text-[#b718ec]">
                        {profile.slug}
                      </span>
                      {" · "}
                      {profile.links.length} Link
                      {profile.links.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <a
                      href={`/linkhub/${profile.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#556987] hover:text-[#b718ec]"
                    >
                      Ansehen
                    </a>
                    <Link
                      href={`/admin/linkhub/edit/${profile.id}`}
                      className="text-[#b718ec] hover:underline"
                    >
                      Bearbeiten
                    </Link>
                    <button
                      onClick={() => handleDelete(profile.id, profile.name)}
                      disabled={busyId === profile.id}
                      className="text-red-500 hover:underline disabled:opacity-50"
                    >
                      {busyId === profile.id ? "…" : "Löschen"}
                    </button>
                  </div>
                </div>

                {/* Link preview pills */}
                {profile.links.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.links.map((l) => (
                      <span
                        key={l.id}
                        className="inline-flex items-center gap-1 rounded-full bg-[#FDF5FF] px-2 py-0.5 text-xs text-[#556987]"
                      >
                        {l.icon} {l.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  if (!isAuthenticated(ctx.req)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }
  const configured = isFirebaseConfigured();
  const profiles = configured ? await getAllProfiles() : [];
  return { props: { profiles, configured } };
};

export default AdminLinkhub;
