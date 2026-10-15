import Link from "next/link";
import { useState } from "react";
import type { GetServerSideProps } from "next";
import SEO from "@/components/SEO";
import CreatorCard from "@/components/creators/CreatorCard";
import { CREATOR_ROLES, type CreatorRole } from "@/lib/applications/config";
import { toPublicCreator } from "@/lib/creators/config";
import { getPublishedCreators } from "@/lib/creators/store";
import type { PublicCreator } from "@/lib/creators/types";

interface Props {
  creators: PublicCreator[];
}

const chipClass = (active: boolean) =>
  `min-h-10 rounded-full border px-4 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] ${
    active
      ? "border-[#B718EC] bg-[#B718EC] text-white"
      : "border-[#F0E6F4] bg-white text-[#000D36] hover:border-[#D9A5EE]"
  }`;

const CreatorOverview = ({ creators }: Props) => {
  const [role, setRole] = useState<CreatorRole | "">("");
  const visible = role ? creators.filter((c) => c.roles.includes(role)) : creators;
  // Only offer filters that have someone behind them.
  const roles = CREATOR_ROLES.filter((r) => creators.some((c) => c.roles.includes(r.id)));

  return (
    <>
      <SEO
        title="Swibble Creator – Models, Content Creator & Moderation"
        description="Models, Content Creator und Moderation für Videos, Shootings und Events – direkt über Swibble anfragen."
        canonical="/creator"
      />

      <section className="mx-auto w-full max-w-6xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#b718ec] lg:text-5xl">Swibble Creator</h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-[#556987] lg:text-lg">
            Models, Content Creator und Moderation für Videos, Shootings und Events.
          </p>
        </header>

        {roles.length > 1 && (
          <div className="mb-6 flex flex-wrap justify-center gap-2" role="group" aria-label="Nach Rolle filtern">
            <button type="button" aria-pressed={role === ""} onClick={() => setRole("")} className={chipClass(role === "")}>
              Alle
            </button>
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={role === r.id}
                onClick={() => setRole(r.id)}
                className={chipClass(role === r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {visible.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((creator) => (
              <li key={creator.id}>
                <CreatorCard creator={creator} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-[#FDF5FF] p-8 text-center text-[#556987]">
            Bald stellen wir hier unsere Creator vor.
          </p>
        )}

        <div className="mt-12 grid gap-3 sm:grid-cols-2">
          <Link
            href="/#kontakt"
            className="rounded-2xl bg-[#B718EC] px-6 py-4 text-center font-bold text-white shadow-lg shadow-purple-200 hover:bg-[#a514d6]"
          >
            Creator für ein Projekt anfragen
          </Link>
          <Link
            href="/bewerben/creator"
            className="rounded-2xl border border-[#E4D3EC] bg-white px-6 py-4 text-center font-medium text-[#000D36] hover:border-[#B718EC]"
          >
            Selbst Swibble Creator werden
          </Link>
        </div>
      </section>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async ({ res }) => {
  let creators: PublicCreator[] = [];
  try {
    creators = (await getPublishedCreators()).map(toPublicCreator);
  } catch {
    // The page still renders (empty) without the store.
  }
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=60");
  return { props: { creators } };
};

export default CreatorOverview;
