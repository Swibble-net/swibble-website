import Head from "next/head";
import Link from "next/link";
import type { GetServerSideProps } from "next";
import AdminNav from "@/components/admin/AdminNav";
import { isAuthenticated } from "@/lib/adminAuth";
import { roleLabel } from "@/lib/applications/config";
import { thumbUrl } from "@/lib/creators/config";
import { isCreatorStoreAvailable, listCreators } from "@/lib/creators/store";

interface CreatorSummary {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  roles: string[];
  city: string;
  cover: string;
  photos: number;
  videos: number;
}

interface Props {
  creators: CreatorSummary[];
  available: boolean;
}

const AdminCreators = ({ creators, available }: Props) => (
  <>
    <Head>
      <title>Creator – Swibble CMS</title>
      <meta name="robots" content="noindex, nofollow" />
    </Head>

    <section className="mx-auto w-full max-w-5xl">
      <AdminNav current="Creator" />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#000D36]">Swibble Creator</h1>
          <p className="mt-1 text-sm text-[#556987]">
            Neue Seiten legst du in einer Bewerbung aus dem Creator Pool an.
          </p>
        </div>
        <Link
          href="/creator"
          target="_blank"
          className="self-start rounded-[10px] border border-[#B718EC] px-4 py-2 text-sm font-medium text-[#B718EC] transition hover:bg-[#FDF5FF]"
        >
          Übersichtsseite ansehen
        </Link>
      </div>

      {!available && (
        <p className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
          Firebase-Speicher nicht konfiguriert – Creator-Seiten sind nicht verfügbar.
        </p>
      )}

      {creators.length === 0 ? (
        <p className="rounded-xl bg-[#FDF5FF] p-6 text-center text-[#556987]">
          Noch keine Creator-Seiten.{" "}
          <Link href="/admin/bewerbungen" className="text-[#b718ec] underline">
            Zu den Bewerbungen
          </Link>
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {creators.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/creator/${c.id}`}
                className="block overflow-hidden rounded-xl border border-[#F0E4F5] bg-white transition hover:border-[#b718ec]/50 hover:shadow-sm"
              >
                <div className="relative aspect-[4/5] bg-[#FDF5FF]">
                  {c.cover && (
                    // eslint-disable-next-line @next/next/no-img-element -- private media route, admin only
                    <img src={c.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                  <span
                    className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.published ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {c.published ? "Online" : "Entwurf"}
                  </span>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-[#000D36]">{c.name}</p>
                  <p className="mt-0.5 text-xs text-[#556987]">{c.roles.map(roleLabel).join(" · ")}</p>
                  <p className="mt-1 text-xs text-[#8a7791]">
                    {[c.city, `${c.photos} Fotos`, `${c.videos} Videos`].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  </>
);

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  if (!isAuthenticated(ctx.req)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }
  const creators = (await listCreators()).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    published: c.published,
    roles: c.roles,
    city: c.city,
    cover: c.photos[0] ? thumbUrl(c.id, c.photos[0].id) : "",
    photos: c.photos.length,
    videos: c.videos.length,
  }));
  return { props: { creators, available: isCreatorStoreAvailable() } };
};

export default AdminCreators;
