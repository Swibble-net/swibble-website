import { useRouter } from "next/router";
import Link from "next/link";
import { FormEvent, useState } from "react";
import type { BlogPost } from "@/lib/blog/types";

interface Props {
  /** Existing post when editing; omit for a new post. */
  post?: BlogPost;
}

const inputClass =
  "w-full rounded-lg bg-[#F6F6F6] px-3 py-2 text-sm text-[#2A3342] focus:outline-none";
const labelClass = "mb-1 block text-sm font-medium text-[#2A3342]";

const PostEditor = ({ post }: Props) => {
  const router = useRouter();
  const isEdit = Boolean(post);

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [author, setAuthor] = useState(post?.author ?? "Swibble");
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [contentHtml, setContentHtml] = useState(post?.contentHtml ?? "");
  const [published, setPublished] = useState(post?.published ?? false);
  const [showPreview, setShowPreview] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!title.trim() || !contentHtml.trim()) {
      setError("Titel und Inhalt sind erforderlich.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        isEdit ? `/api/posts/${post!.id}` : "/api/posts",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            slug: slug.trim() || undefined,
            author,
            coverImage: coverImage.trim() || null,
            excerpt: excerpt.trim() || undefined,
            contentHtml,
            published,
          }),
        },
      );

      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Speichern fehlgeschlagen.");
      }

      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#000D36]">
          {isEdit ? "Beitrag bearbeiten" : "Neuer Beitrag"}
        </h1>
        <Link
          href="/admin"
          className="text-sm font-medium text-[#556987] hover:text-[#b718ec]"
        >
          Abbrechen
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mb-6 flex items-center justify-between rounded-xl border border-[#F0E4F5] bg-[#FDF5FF] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-[#2A3342]">
            {published ? "Sichtbar für Besucher" : "Entwurf (versteckt)"}
          </p>
          <p className="text-xs text-[#8a7791]">
            {published
              ? "Dieser Beitrag ist im Blog öffentlich sichtbar."
              : "Nur du siehst diesen Beitrag, bis du ihn veröffentlichst."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={published}
          aria-label="Sichtbarkeit umschalten"
          onClick={() => setPublished((v) => !v)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
            published ? "bg-[#B718EC]" : "bg-[#d8c7e0]"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
              published ? "translate-x-0" : "-translate-x-5"
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="title">
            Titel*
          </label>
          <input
            id="title"
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="slug">
            Slug (optional – wird sonst automatisch erzeugt)
          </label>
          <input
            id="slug"
            className={inputClass}
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="mein-beitrag"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="author">
            Autor
          </label>
          <input
            id="author"
            className={inputClass}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="cover">
            Titelbild-URL (optional)
          </label>
          <input
            id="cover"
            className={inputClass}
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://…"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className={labelClass} htmlFor="excerpt">
          Kurzbeschreibung (optional – wird sonst aus dem Inhalt erzeugt)
        </label>
        <textarea
          id="excerpt"
          className={`${inputClass} h-20 resize-none`}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between">
          <label className={labelClass} htmlFor="content">
            Inhalt (HTML)*
          </label>
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="text-xs font-medium text-[#b718ec] hover:underline"
          >
            {showPreview ? "Vorschau ausblenden" : "Vorschau anzeigen"}
          </button>
        </div>
        <div
          className={`grid gap-4 ${showPreview ? "lg:grid-cols-2" : "grid-cols-1"}`}
        >
          <textarea
            id="content"
            className={`${inputClass} h-[28rem] font-mono leading-relaxed`}
            value={contentHtml}
            onChange={(e) => setContentHtml(e.target.value)}
            placeholder="<h2>Überschrift</h2>\n<p>Dein Text …</p>"
            required
            spellCheck={false}
          />
          {showPreview && (
            <div className="h-[28rem] overflow-y-auto rounded-lg border border-[#F0E4F5] bg-white p-4">
              <div
                className="blog-content"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-[10px] bg-[#B718EC] px-6 py-3 text-sm font-medium text-[#F0FDF4] transition duration-200 hover:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Speichern…"
            : published
              ? isEdit
                ? "Aktualisieren"
                : "Veröffentlichen"
              : "Als Entwurf speichern"}
        </button>
      </div>
    </form>
  );
};

export default PostEditor;
