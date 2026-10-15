import Link from "next/link";
import type { GetServerSideProps } from "next";
import type { IconType } from "react-icons";
import {
  IoArrowForward,
  IoDocumentTextOutline,
  IoLogoInstagram,
  IoLogoSnapchat,
  IoLogoTiktok,
  IoLogoYoutube,
} from "react-icons/io5";
import SEO from "@/components/SEO";
import CreatorVideos from "@/components/creators/CreatorVideos";
import InquiryForm from "@/components/creators/InquiryForm";
import PhotoGallery from "@/components/creators/PhotoGallery";
import { isAuthenticated } from "@/lib/adminAuth";
import { roleLabel } from "@/lib/applications/config";
import { SOCIAL_PLATFORMS, profileUrl, type SocialPlatform } from "@/lib/applications/handles";
import { toPublicCreator } from "@/lib/creators/config";
import { getCreatorBySlug } from "@/lib/creators/store";
import type { PublicCreator } from "@/lib/creators/types";

interface Props {
  creator: PublicCreator;
  /** Unpublished page, shown to the signed-in admin only */
  preview: boolean;
}

const SITE_URL = "https://www.swibble.net";

const SOCIAL_ICONS: Record<SocialPlatform, IconType> = {
  instagram: IoLogoInstagram,
  tiktok: IoLogoTiktok,
  youtube: IoLogoYoutube,
  snapchat: IoLogoSnapchat,
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-12">
    <h2 className="mb-4 text-xl font-bold text-[#000D36] lg:text-2xl">{title}</h2>
    {children}
  </section>
);

const CreatorPage = ({ creator, preview }: Props) => {
  const cover = creator.photos[0];
  const roles = creator.roles.map(roleLabel).join(" · ");
  const socials = (["instagram", "tiktok", "youtube", "snapchat"] as const).filter(
    (platform) => creator.socials[platform],
  );

  return (
    <>
      <SEO
        title={`${creator.name} – Swibble Creator`}
        description={`${roles}${creator.city ? ` aus ${creator.city}` : ""}. Jetzt über Swibble anfragen.`}
        canonical={`/creator/${creator.slug}`}
        ogImage={cover ? `${SITE_URL}${cover.url}` : undefined}
        noIndex={preview}
      />

      <article className="mx-auto w-full max-w-5xl">
        {preview && (
          <p className="mb-4 rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-800">
            Vorschau – diese Seite ist noch nicht veröffentlicht.
          </p>
        )}

        <Link href="/creator" className="text-sm font-medium text-[#556987] hover:text-[#b718ec]">
          ← Alle Creator
        </Link>

        <header className="mt-4 grid items-center gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
          <div className="overflow-hidden rounded-3xl bg-[#FDF5FF] shadow-[0_25px_100px_rgba(76,64,247,0.12)]">
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element -- media route of the creator page
              <img src={cover.url} alt={creator.name} className="aspect-[4/5] w-full object-cover" />
            )}
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-[#B718EC]">Swibble Creator</p>
            <h1 className="mt-1 text-4xl font-bold text-[#000D36] lg:text-5xl">{creator.name}</h1>
            <p className="mt-2 text-base text-[#556987] lg:text-lg">
              {roles}
              {creator.city && ` · ${creator.city}`}
            </p>
            {creator.tagline && <p className="mt-3 text-base text-[#2A3342]">{creator.tagline}</p>}

            {socials.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {socials.map((platform) => {
                  const Icon = SOCIAL_ICONS[platform];
                  return (
                    <li key={platform}>
                      <a
                        href={profileUrl(platform, creator.socials[platform])}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-10 items-center gap-1.5 rounded-full border border-[#F0E6F4] bg-white px-3.5 text-sm text-[#000D36] hover:border-[#B718EC] hover:text-[#B718EC]"
                      >
                        <Icon aria-hidden className="text-lg" />
                        <span className="sr-only">{SOCIAL_PLATFORMS[platform].label}: </span>@
                        {creator.socials[platform]}
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#anfrage"
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-[#B718EC] px-6 font-bold text-white shadow-lg shadow-purple-200 hover:bg-[#a514d6]"
              >
                {creator.name.split(" ")[0]} anfragen <IoArrowForward aria-hidden />
              </a>
              {creator.portfolioUrl && (
                <a
                  href={creator.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex min-h-12 items-center rounded-2xl border border-[#E4D3EC] bg-white px-5 font-medium text-[#000D36] hover:border-[#B718EC]"
                >
                  Portfolio ↗
                </a>
              )}
              {creator.setcardUrl && (
                <a
                  href={creator.setcardUrl}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl border border-[#E4D3EC] bg-white px-5 font-medium text-[#000D36] hover:border-[#B718EC]"
                >
                  <IoDocumentTextOutline aria-hidden /> Setcard
                </a>
              )}
            </div>
          </div>
        </header>

        {creator.videos.length > 0 && (
          <Section title="Videos">
            <CreatorVideos videos={creator.videos} />
          </Section>
        )}

        {creator.photos.length > 1 && (
          <Section title="Fotos">
            <PhotoGallery photos={creator.photos.slice(1)} name={creator.name} />
          </Section>
        )}

        {creator.references.length > 0 && (
          <Section title="Referenzen">
            <ul className="flex flex-wrap gap-2">
              {creator.references.map((ref) => {
                const label = (
                  <>
                    <span className="font-semibold">{ref.name}</span>
                    {ref.detail && <span className="text-[#556987]"> · {ref.detail}</span>}
                  </>
                );
                return (
                  <li key={ref.id}>
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="block rounded-xl border border-[#F0E6F4] bg-white px-4 py-2.5 text-sm text-[#000D36] hover:border-[#B718EC]"
                      >
                        {label} ↗
                      </a>
                    ) : (
                      <span className="block rounded-xl border border-[#F0E6F4] bg-white px-4 py-2.5 text-sm text-[#000D36]">
                        {label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <section
          id="anfrage"
          className="mt-14 scroll-mt-28 rounded-3xl bg-white p-5 shadow-[0_25px_100px_rgba(76,64,247,0.08)] ring-1 ring-[#F6ECFA] sm:p-8"
        >
          <h2 className="text-xl font-bold text-[#000D36] lg:text-2xl">
            {creator.name.split(" ")[0]} für dein Projekt anfragen
          </h2>
          <div className="mt-5">
            <InquiryForm slug={creator.slug} creatorName={creator.name.split(" ")[0]} />
          </div>
        </section>
      </article>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async ({ params, req, res }) => {
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const profile = await getCreatorBySlug(slug).catch(() => null);
  const admin = profile && !profile.published ? isAuthenticated(req) : false;
  if (!profile || (!profile.published && !admin)) return { notFound: true };

  res.setHeader(
    "Cache-Control",
    profile.published ? "public, s-maxage=60, stale-while-revalidate=60" : "private, no-store",
  );
  return { props: { creator: toPublicCreator(profile), preview: !profile.published } };
};

export default CreatorPage;
