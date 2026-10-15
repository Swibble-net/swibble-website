import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import {
  PHOTOS_MAX,
  PHOTO_LARGE_MAX_BYTES,
  PHOTO_THUMB_MAX_BYTES,
  VIDEOS_MAX,
  VIDEO_CHUNK_BYTES,
  VIDEO_CONTENT_TYPES,
  VIDEO_COVER_MAX_BYTES,
  VIDEO_MAX_BYTES,
  VIDEO_TITLE_MAX_LENGTH,
  isValidId,
} from "@/lib/creators/config";
import { fetchHomeVideo } from "@/lib/creators/homeVideos";
import {
  addCreatorAppVideo,
  addCreatorPhoto,
  addCreatorVideoFile,
  getCreator,
  readIncomingPhoto,
  readIncomingVideo,
  removeCreatorPhoto,
  removeIncomingPhoto,
  removeIncomingVideo,
  removeCreatorVideo,
  reorderCreatorMedia,
  setCreatorMediaHidden,
  startCreatorVideoUpload,
  updateCreatorPhotoCaption,
  updateCreatorVideoTitle,
} from "@/lib/creators/store";
import { AppVideoError, publishAppVideo } from "@/lib/videos/appVideos";

// Photos arrive base64 encoded: large (≤ 1.6 MB) + thumbnail in one request.
// Copying a home page video downloads it on the server: allow some time.
export const config = { api: { bodyParser: { sizeLimit: "4.5mb" } }, maxDuration: 60 };

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const isJpegWithin = (buffer: Buffer, maxBytes: number) =>
  buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff && buffer.length <= maxBytes;

function jpeg(value: unknown, maxBytes: number): Buffer | null {
  if (typeof value !== "string" || !BASE64.test(value)) return null;
  if (value.length > Math.ceil(maxBytes / 3) * 4 + 4) return null;
  const buffer = Buffer.from(value, "base64");
  return isJpegWithin(buffer, maxBytes) ? buffer : null;
}

function title(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/[\u0000-\u001f\u007f<>]/g, "").slice(0, VIDEO_TITLE_MAX_LENGTH)
    : "";
}

/**
 * POST {type:"photo", large, thumb} | {type:"appVideo", assetId, fileId, title}
 *      | {type:"homeVideo", videoId, title} (copy of a home page video)
 *      | {type:"importPhoto", name} | {type:"importVideo", name, title, width, height}
 *        (from the bucket's incoming/ folder)
 *      | {type:"upload", size, contentType, title, width, height}
 * PATCH {type:"order", kind, ids} | {type:"videoTitle", videoId, title}
 *       | {type:"photoCaption", photoId, caption} | {type:"visibility", kind, id, hidden}
 * DELETE ?photo=<id> | ?video=<id>
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requireAdmin(req, res)) return;
  res.setHeader("Cache-Control", "private, no-store");

  const { id } = req.query;
  if (!isValidId(id)) return res.status(400).json({ message: "Ungültige ID." });

  try {
    const profile = await getCreator(id);
    if (!profile) return res.status(404).json({ message: "Nicht gefunden." });
    const body = (req.body ?? {}) as Record<string, unknown>;

    if (req.method === "POST" && body.type === "photo") {
      if (profile.photos.length >= PHOTOS_MAX) {
        return res.status(400).json({ message: `Höchstens ${PHOTOS_MAX} Fotos pro Creator.` });
      }
      const large = jpeg(body.large, PHOTO_LARGE_MAX_BYTES);
      const thumb = jpeg(body.thumb, PHOTO_THUMB_MAX_BYTES);
      if (!large || !thumb) return res.status(400).json({ message: "Das Foto konnte nicht gelesen werden." });
      return res.status(201).json({ creator: await addCreatorPhoto(profile, large, thumb) });
    }

    if (req.method === "POST" && body.type === "importPhoto") {
      if (profile.photos.length >= PHOTOS_MAX) {
        return res.status(400).json({ message: `Höchstens ${PHOTOS_MAX} Fotos pro Creator.` });
      }
      const name = typeof body.name === "string" && /^[a-z0-9-]{1,64}$/.test(body.name) ? body.name : "";
      const files = name ? await readIncomingPhoto(name) : null;
      if (
        !files ||
        !isJpegWithin(files.large, PHOTO_LARGE_MAX_BYTES) ||
        !isJpegWithin(files.thumb, PHOTO_THUMB_MAX_BYTES)
      ) {
        return res.status(404).json({ message: "Kein passendes Foto im Upload-Ordner." });
      }
      const creator = await addCreatorPhoto(profile, files.large, files.thumb);
      await removeIncomingPhoto(name);
      return res.status(201).json({ creator });
    }

    if (req.method === "POST" && body.type === "importVideo") {
      if (profile.videos.length >= VIDEOS_MAX) {
        return res.status(400).json({ message: `Höchstens ${VIDEOS_MAX} Videos pro Creator.` });
      }
      const name = typeof body.name === "string" && /^[a-z0-9-]{1,64}$/.test(body.name) ? body.name : "";
      const files = name ? await readIncomingVideo(name) : null;
      // MP4: "ftyp" box right at the start.
      const isMp4 = (buffer: Buffer) => buffer.length > 12 && buffer.toString("latin1", 4, 8) === "ftyp";
      if (!files || !isMp4(files.video) || files.video.length > VIDEO_MAX_BYTES) {
        return res.status(404).json({ message: "Kein passendes Video im Upload-Ordner." });
      }
      const cover = files.cover && isJpegWithin(files.cover, VIDEO_COVER_MAX_BYTES) ? files.cover : null;
      const creator = await addCreatorVideoFile(profile, {
        buffer: files.video,
        contentType: "video/mp4",
        cover,
        title: title(body.title),
        width: Math.max(0, Math.round(Number(body.width) || 0)),
        height: Math.max(0, Math.round(Number(body.height) || 0)),
      });
      await removeIncomingVideo(name);
      return res.status(201).json({ creator });
    }

    if (req.method === "POST" && body.type === "appVideo") {
      if (profile.videos.length >= VIDEOS_MAX) {
        return res.status(400).json({ message: `Höchstens ${VIDEOS_MAX} Videos pro Creator.` });
      }
      if (typeof body.assetId !== "string" || typeof body.fileId !== "string") {
        return res.status(400).json({ message: "Ungültige Auswahl." });
      }
      const job = await publishAppVideo(body.assetId, body.fileId);
      // The customer from the app is a good default caption.
      const creator = await addCreatorAppVideo(profile, job, title(body.title ?? body.accountName));
      // The picker expects the added item under `video`.
      const video = creator?.videos.find((v) => v.appJobId === job.jobId) ?? null;
      return res.status(201).json({ creator, video });
    }

    if (req.method === "POST" && body.type === "homeVideo") {
      if (profile.videos.length >= VIDEOS_MAX) {
        return res.status(400).json({ message: `Höchstens ${VIDEOS_MAX} Videos pro Creator.` });
      }
      if (!isValidId(body.videoId)) return res.status(400).json({ message: "Ungültiges Video." });
      const file = await fetchHomeVideo(body.videoId);
      if (!file) return res.status(404).json({ message: "Das Video der Startseite konnte nicht übernommen werden." });
      const creator = await addCreatorVideoFile(profile, {
        ...file,
        title: title(body.title ?? file.accountName),
      });
      return res.status(201).json({ creator });
    }

    if (req.method === "POST" && body.type === "upload") {
      if (profile.videos.length >= VIDEOS_MAX) {
        return res.status(400).json({ message: `Höchstens ${VIDEOS_MAX} Videos pro Creator.` });
      }
      const size = Number(body.size);
      const contentType = String(body.contentType ?? "");
      if (!Number.isInteger(size) || size <= 0 || size > VIDEO_MAX_BYTES) {
        return res.status(400).json({
          message: `Videos dürfen höchstens ${VIDEO_MAX_BYTES / 1024 ** 2} MB groß sein. Größere Videos bitte über die Swibble-App hinzufügen.`,
        });
      }
      if (!(VIDEO_CONTENT_TYPES as readonly string[]).includes(contentType)) {
        return res.status(400).json({ message: "Bitte ein MP4-, MOV- oder WebM-Video wählen." });
      }
      const started = await startCreatorVideoUpload(profile, {
        size,
        contentType,
        title: title(body.title),
        width: Math.max(0, Math.round(Number(body.width) || 0)),
        height: Math.max(0, Math.round(Number(body.height) || 0)),
      });
      if (!started) return res.status(404).json({ message: "Nicht gefunden." });
      return res.status(201).json({ ...started, chunkBytes: VIDEO_CHUNK_BYTES });
    }

    if (req.method === "PATCH" && body.type === "order") {
      if ((body.kind !== "photos" && body.kind !== "videos") || !Array.isArray(body.ids)) {
        return res.status(400).json({ message: "Ungültige Reihenfolge." });
      }
      const ids = body.ids.filter((v): v is string => typeof v === "string");
      return res.status(200).json({ creator: await reorderCreatorMedia(profile, body.kind, ids) });
    }

    if (req.method === "PATCH" && body.type === "visibility") {
      if ((body.kind !== "photo" && body.kind !== "video") || !isValidId(body.id)) {
        return res.status(400).json({ message: "Ungültige Auswahl." });
      }
      const hidden = body.hidden === true;
      if (
        hidden &&
        body.kind === "photo" &&
        profile.published &&
        profile.photos.filter((p) => !p.hidden && p.id !== body.id).length === 0
      ) {
        return res.status(400).json({ message: "Eine veröffentlichte Seite braucht mindestens ein sichtbares Foto." });
      }
      return res
        .status(200)
        .json({ creator: await setCreatorMediaHidden(profile, body.kind, body.id, hidden) });
    }

    if (req.method === "PATCH" && body.type === "photoCaption") {
      if (!isValidId(body.photoId)) return res.status(400).json({ message: "Ungültiges Foto." });
      return res
        .status(200)
        .json({ creator: await updateCreatorPhotoCaption(profile, body.photoId, title(body.caption)) });
    }

    if (req.method === "PATCH" && body.type === "videoTitle") {
      if (!isValidId(body.videoId)) return res.status(400).json({ message: "Ungültiges Video." });
      return res
        .status(200)
        .json({ creator: await updateCreatorVideoTitle(profile, body.videoId, title(body.title)) });
    }

    if (req.method === "DELETE") {
      const { photo, video } = req.query;
      const creator = isValidId(photo)
        ? await removeCreatorPhoto(profile, photo)
        : isValidId(video)
          ? await removeCreatorVideo(profile, video)
          : null;
      if (!creator) return res.status(404).json({ message: "Nicht gefunden." });
      return res.status(200).json({ creator });
    }

    res.setHeader("Allow", "POST, PATCH, DELETE");
    return res.status(400).json({ message: "Unbekannte Aktion." });
  } catch (error) {
    console.error("[/api/admin/creators/:id/media]", error instanceof Error ? error.name : "UnknownError");
    const status = error instanceof AppVideoError ? error.status : 500;
    return res.status(status).json({
      message: error instanceof AppVideoError ? error.message : "Serverfehler.",
    });
  }
}
