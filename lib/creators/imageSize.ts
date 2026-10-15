/**
 * Width and height of a JPEG or PNG from its header, without decoding the
 * image. null for anything else or a truncated file.
 */
export function imageSize(buffer: Buffer): { width: number; height: number } | null {
  // PNG: signature, then the IHDR chunk with width/height as big-endian ints.
  if (buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504e47 && buffer.toString("ascii", 12, 16) === "IHDR") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  // JPEG: walk the segments up to a start-of-frame marker.
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    // Padding bytes between segments.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    const isFrame =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}
