import type { PublicCreator } from "@/lib/creators/types";

type Video = PublicCreator["videos"][number];

/**
 * Videos of a creator: own files only (web copies from the Swibble app or
 * uploads) — no third-party players, so no cookies. Nothing is downloaded
 * before a tap on play.
 */
const CreatorVideos = ({ videos }: { videos: Video[] }) => (
  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
    {videos.map((video) => (
      <li key={video.id}>
        <figure>
          <video
            src={video.videoUrl}
            poster={video.coverUrl || undefined}
            controls
            playsInline
            preload="none"
            className={`w-full rounded-xl bg-[#000D36] object-cover ${
              video.width > video.height ? "aspect-video" : "aspect-[9/16]"
            }`}
          />
          {video.title && (
            <figcaption className="mt-1.5 text-xs text-[#556987] sm:text-sm">{video.title}</figcaption>
          )}
        </figure>
      </li>
    ))}
  </ul>
);

export default CreatorVideos;
