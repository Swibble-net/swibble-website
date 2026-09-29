// Browser-only: sends a processed deck to the admin API in request-sized pieces.

import { UPLOAD_CHUNK_BYTES } from "./config";
import type { ProcessedDeck } from "./processPdf";

const PARALLEL_UPLOADS = 3;

export class UploadError extends Error {
  constructor(message: string, readonly unauthorized = false) {
    super(message);
  }
}

async function request(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new UploadError("Keine Verbindung zum Server. Bitte versuch es noch einmal.");
  }
  if (res.status === 401) throw new UploadError("Sitzung abgelaufen.", true);
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new UploadError(typeof data.message === "string" ? data.message : "Upload fehlgeschlagen.");
  }
  return data;
}

async function put(url: string, body: Blob, contentType: string) {
  // One retry: a single flaky request shouldn't cost the whole upload.
  try {
    await request(url, { method: "PUT", headers: { "Content-Type": contentType }, body });
  } catch (error) {
    if (error instanceof UploadError && error.unauthorized) throw error;
    await request(url, { method: "PUT", headers: { "Content-Type": contentType }, body });
  }
}

async function runLimited(tasks: (() => Promise<void>)[], limit: number) {
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) await tasks[next++]();
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}

/**
 * Registers the deck, uploads slides and PDF chunks, then completes it.
 * Removes the half-finished deck again if anything fails.
 */
export async function uploadDeck(
  deck: ProcessedDeck,
  meta: { customer: string; title: string },
  onProgress: (sentBytes: number, totalBytes: number) => void,
): Promise<{ id: string; slug: string }> {
  const created = await request("/api/admin/pitchdecks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...meta,
      pages: deck.slides.map((s) => s.size),
      pdfSize: deck.pdf.size,
      originalSize: deck.originalSize,
      compressed: deck.compressed,
    }),
  });
  const id = String(created.id);
  const base = `/api/admin/pitchdecks/${encodeURIComponent(id)}`;

  const total = deck.pdf.size + deck.slides.reduce((sum, s) => sum + s.image.size, 0);
  let sent = 0;
  const track = (bytes: number) => {
    sent += bytes;
    onProgress(sent, total);
  };
  onProgress(0, total);

  try {
    const tasks = deck.slides.map((slide, index) => async () => {
      await put(`${base}/upload?kind=page&index=${index}`, slide.image, "image/jpeg");
      track(slide.image.size);
    });
    for (let index = 0; index * UPLOAD_CHUNK_BYTES < deck.pdf.size; index += 1) {
      const chunk = deck.pdf.slice(index * UPLOAD_CHUNK_BYTES, (index + 1) * UPLOAD_CHUNK_BYTES);
      tasks.push(async () => {
        await put(`${base}/upload?kind=pdf&index=${index}`, chunk, "application/octet-stream");
        track(chunk.size);
      });
    }
    await runLimited(tasks, PARALLEL_UPLOADS);

    const completed = await request(`${base}/complete`, { method: "POST" });
    return { id, slug: String(completed.slug) };
  } catch (error) {
    await fetch(base, { method: "DELETE" }).catch(() => undefined);
    throw error;
  }
}
