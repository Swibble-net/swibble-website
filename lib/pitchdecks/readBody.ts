import type { NextApiRequest } from "next";

export class BodyTooLargeError extends Error {}

/** Reads a raw request body (route with bodyParser: false) up to maxBytes. */
export async function readRawBody(req: NextApiRequest, maxBytes: number): Promise<Buffer> {
  const declared = Number(req.headers["content-length"]);
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyTooLargeError();

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) throw new BodyTooLargeError();
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}
