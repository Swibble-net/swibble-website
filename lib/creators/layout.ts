export type WorkItem<P, V> = { kind: "photo"; item: P } | { kind: "video"; item: V };

/**
 * Order of the creator gallery in rows of `columns`: photo, video, photo –
 * then video, photo, video – and so on. When one kind runs out, the rest of
 * the other follows in its own order.
 */
export function checkerboard<P, V>(photos: P[], videos: V[], columns = 3): WorkItem<P, V>[] {
  const result: WorkItem<P, V>[] = [];
  let p = 0;
  let v = 0;
  while (p < photos.length || v < videos.length) {
    const position = result.length;
    const row = Math.floor(position / columns);
    const wantsPhoto = (row + (position % columns)) % 2 === 0;
    if ((wantsPhoto && p < photos.length) || v >= videos.length) {
      result.push({ kind: "photo", item: photos[p++] });
    } else {
      result.push({ kind: "video", item: videos[v++] });
    }
  }
  return result;
}
