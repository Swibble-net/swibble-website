// Browser-only: sends the files of a creator pool application after the form
// data was stored (POST /api/applications returned id + upload token). Every
// file is its own request, videos go in pieces; at the end the server checks
// everything and sends the mails.

export interface CreatorUploadFiles {
  release: Blob;
  /** Parents' signed document (minors) */
  consent: Blob | null;
  setcard: Blob | null;
  photos: Blob[];
  videos: Array<{ file: File; cover: Blob | null }>;
}

export class UploadFailedError extends Error {}

const PARALLEL_UPLOADS = 3;

async function send(url: string, init: RequestInit): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new UploadFailedError("Keine Verbindung. Bitte prüf dein Netz und versuch es noch einmal.");
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new UploadFailedError(
      data.message ||
        (res.status === 413 ? "Eine Datei ist zu groß." : "Der Upload hat nicht geklappt. Bitte versuch es noch einmal."),
    );
  }
}

async function put(url: string, body: Blob) {
  const init = { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body };
  // One retry: a single flaky request on mobile data shouldn't end everything.
  try {
    await send(url, init);
  } catch {
    await send(url, init);
  }
}

export async function uploadCreatorFiles(
  target: { id: string; token: string; chunkBytes: number },
  files: CreatorUploadFiles,
  onProgress: (sent: number, total: number) => void,
): Promise<void> {
  const base = `/api/applications/${encodeURIComponent(target.id)}/upload?token=${encodeURIComponent(target.token)}`;
  const tasks: Array<{ query: string; body: Blob }> = [
    { query: "kind=release", body: files.release },
    ...(files.consent ? [{ query: "kind=consent", body: files.consent }] : []),
    ...(files.setcard ? [{ query: "kind=setcard", body: files.setcard }] : []),
    ...files.photos.map((body, index) => ({ query: `kind=photo&index=${index}`, body })),
  ];
  files.videos.forEach(({ file, cover }, index) => {
    if (cover) tasks.push({ query: `kind=videoCover&index=${index}`, body: cover });
    const chunks = Math.max(1, Math.ceil(file.size / target.chunkBytes));
    for (let chunk = 0; chunk < chunks; chunk += 1) {
      tasks.push({
        query: `kind=video&index=${index}&chunk=${chunk}`,
        body: file.slice(chunk * target.chunkBytes, (chunk + 1) * target.chunkBytes),
      });
    }
  });

  const total = tasks.reduce((sum, task) => sum + task.body.size, 0);
  let sent = 0;
  onProgress(0, total);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next++];
      await put(`${base}&${task.query}`, task.body);
      sent += task.body.size;
      onProgress(sent, total);
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL_UPLOADS, tasks.length) }, worker));

  await send(`${base}&action=complete`, { method: "POST" });
}

/** Removes a half-uploaded application again (best effort). */
export async function abortCreatorUpload(target: { id: string; token: string }): Promise<void> {
  await fetch(
    `/api/applications/${encodeURIComponent(target.id)}/upload?token=${encodeURIComponent(target.token)}&action=abort`,
    { method: "POST" },
  ).catch(() => undefined);
}
