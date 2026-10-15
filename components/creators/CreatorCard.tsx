import Link from "next/link";
import { roleLabel } from "@/lib/applications/config";
import type { PublicCreator } from "@/lib/creators/types";

/** Tile on /creator: cover photo, name, roles, city. */
const CreatorCard = ({ creator }: { creator: PublicCreator }) => {
  const cover = creator.photos[0];
  return (
    <Link
      href={`/creator/${creator.slug}`}
      className="group block overflow-hidden rounded-2xl bg-white shadow-[0_10px_40px_rgba(76,64,247,0.08)] ring-1 ring-[#F6ECFA] transition hover:-translate-y-0.5 hover:ring-[#b718ec]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="aspect-[4/5] overflow-hidden bg-[#FDF5FF]">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- media route of the creator page
          <img
            src={cover.thumbUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        )}
      </div>
      <div className="p-3 sm:p-4">
        <p className="font-bold text-[#000D36]">{creator.name}</p>
        <p className="mt-0.5 text-xs text-[#556987] sm:text-sm">
          {creator.roles.map(roleLabel).join(" · ")}
        </p>
        {creator.city && <p className="mt-0.5 text-xs text-[#8a7791]">{creator.city}</p>}
      </div>
    </Link>
  );
};

export default CreatorCard;
