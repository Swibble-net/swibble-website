import Link from "next/link";
import { useState } from "react";
import type { GetServerSideProps } from "next";
import SEO from "@/components/SEO";
import CreatorCard from "@/components/creators/CreatorCard";
import InquiryForm from "@/components/creators/InquiryForm";
import ListOfCompanies from "@/components/ListOfCompanies";
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
        title="Swibble Creator – Models, Creator, Moderation & Promotion"
        description="Models, Content Creator, Moderation und Promoter:innen für Videos, Shootings und Events – direkt über Swibble anfragen."
        canonical="/creator"
      />

      <section className="mx-auto w-full max-w-6xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#b718ec] lg:text-5xl">Swibble Creator</h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-[#556987] lg:text-lg">
            Models, Content Creator, Moderation und Promotion für Videos,
            Shootings und Events.
          </p>
          <Link
            href="/bewerben/creator"
            className="group mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-gradient-to-r from-[#B718EC] to-[#7B3CF0] px-6 py-3 font-bold text-white shadow-lg shadow-purple-200 transition hover:shadow-xl hover:shadow-purple-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] motion-safe:hover:-translate-y-0.5"
          >
            <span aria-hidden>✨</span>
            Swibble Creator werden
            <span aria-hidden className="transition motion-safe:group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </header>

        <ListOfCompanies mini />

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
          <p className="text-center text-[#556987]">Bald stellen wir hier unsere Creator vor.</p>
        )}

        <section
          id="anfrage"
          className="mx-auto mt-14 max-w-3xl scroll-mt-28 rounded-3xl bg-white p-5 shadow-[0_25px_100px_rgba(76,64,247,0.08)] ring-1 ring-[#F6ECFA] sm:p-8"
        >
          <h2 className="text-xl font-bold text-[#000D36] lg:text-2xl">Creator anfragen</h2>
          <p className="mt-1 text-sm text-[#556987]">
            Sag uns kurz, wen du suchst – wir melden uns mit passenden Creatorn.
          </p>
          <div className="mt-5">
            <InquiryForm />
          </div>
        </section>
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
