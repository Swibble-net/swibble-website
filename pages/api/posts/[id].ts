import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import {
  deletePost,
  getPostById,
  setPostPublished,
  updatePost,
} from "@/lib/blog/posts";
import type { BlogPostInput } from "@/lib/blog/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ message: "Ungültige ID." });
  }

  try {
    if (req.method === "GET") {
      const post = await getPostById(id);
      if (!post) return res.status(404).json({ message: "Nicht gefunden." });
      return res.status(200).json({ post });
    }

    if (req.method === "PUT") {
      if (!requireAdmin(req, res)) return;

      const body = req.body as Partial<BlogPostInput>;
      if (!body?.title?.trim() || !body?.contentHtml?.trim()) {
        return res
          .status(400)
          .json({ message: "Titel und Inhalt sind erforderlich." });
      }

      const post = await updatePost(id, {
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt,
        contentHtml: body.contentHtml,
        coverImage: body.coverImage ?? null,
        author: body.author?.trim() || "Swibble",
        published: body.published,
      });

      if (!post) return res.status(404).json({ message: "Nicht gefunden." });
      return res.status(200).json({ post });
    }

    if (req.method === "PATCH") {
      if (!requireAdmin(req, res)) return;

      const { published } = (req.body ?? {}) as { published?: boolean };
      if (typeof published !== "boolean") {
        return res
          .status(400)
          .json({ message: "`published` muss true oder false sein." });
      }

      const post = await setPostPublished(id, published);
      if (!post) return res.status(404).json({ message: "Nicht gefunden." });
      return res.status(200).json({ post });
    }

    if (req.method === "DELETE") {
      if (!requireAdmin(req, res)) return;

      const ok = await deletePost(id);
      if (!ok) return res.status(404).json({ message: "Nicht gefunden." });
      return res.status(200).json({ success: true });
    }

    res.setHeader("Allow", "GET, PUT, PATCH, DELETE");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error(`[/api/posts/${id}]`, error);
    const message =
      error instanceof Error ? error.message : "Interner Serverfehler";
    return res.status(500).json({ message });
  }
}
